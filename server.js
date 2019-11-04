var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var path = require('path');
var fs = require('fs');

var tstream = fs.createWriteStream('unminedtransactions.txt', {flags:'a'});
var bstream = fs.createWriteStream('blockchain.txt', {flags:'a'});

__dirname = path.resolve(path.dirname('')); // root directory

app.use(express.static(__dirname + '/')); // use root so other files can be used

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html'); // serve index.html
});

io.on('connection', function(socket){
  console.log('node connected');
  socket.on('transaction', function(transactionstring){
    /* first need to verify transaction */
    io.emit('transaction', transactionstring); // forward message to all nodes

    tstream.write(transactionstring + '\n');

  });
  socket.on('block', function(blockstring){
    /* first should verify block */
    io.emit('block', blockstring); // forward message to all nodes

    bstream.write(blockstring + '\n');

  });
  socket.on('request', function(requeststring){
    console.log('received request '+requeststring);
    if (requeststring == 'unminedtransactions') {
      // respond with unmined transactions
    }
    if (requeststring.startsWith('blockchainsince')) {
      //   b  l  o  c  k  c  h  a  i  n  s  i  n  c  e  X  X  X
      //   0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15<---- where to start with .substr()
      var startindex = parseInt(requeststring.substr(15)); // 15 = charachters in 'blockchainsinceXXX' to XXX
      fs.readFile('blockchain.txt', function(err, buf){
        console.log('blockchaintxt buf:'+buf);
        buf.toString().split('\n').slice(startindex).forEach(function(block){ // split file contents into single blocks and iterate over blocks
          socket.emit('block', block); // socket.emit rather than io.emit => respond to sender with block
          console.log('emitted block: '+block);
        });
      })
      // respond to single node with blocks since startindex (inclusive)
    }
  });
});

http.listen(8000, function(){
  console.log('listening on *:8000');
});





function isvalidblock(blockstring) {
  let split = blockstring.split(';');
  const hash = await hashHex(blockstring, 'SHA-256'); // take sha256 hash of entire block
  let newblock = {hash: hash, prevhash: split[0], transactions: split[1], proofofwork: split[2]};


  if (!newblock.hash.startsWith(Array(difficulty+1).join('0'))) {// check if hash of block starts with zeros according to difficulty
    console.log('invalid block (doesn\'t match difficulty)', blockstring);
    processblockqueue();
    return false;
  }

  // get the blockchain and endblocks ready to read from and write to
  let transaction = blockchaindb.transaction(['blockchain', 'endblocks'], 'readwrite');
  let blockchainos = transaction.objectStore('blockchain'); // full blockchain
  let endblockos = transaction.objectStore('endblocks') // the most recent blocks

  /*
  ###################################################
  ## the blockchain is self-organizing because     ##
  ## each block has the hash of the previous block.##
  ## we only need to determine if a block should   ##
  ## be added, not where to put it.                ##
  ###################################################
  */

  // check if the new block connects to any previous block recent enough to allow forks
  let cursorreq = endblockos.openCursor();
  cursorreq.onsuccess = function(e){

    let cursor = e.target.result;
    if (cursor) {
      let endblock = cursor.value;
      // check if the new block extends an endblock directly
      if (newblock.prevhash === endblock.hash) {
        newblock.length = endblock.length+1; // one farther in the blockchain
        console.log('accepting block ', newblock);
        endblockos.delete(endblock.hash); // end block is no longer end block
        endblockos.add(newblock); // new block is
        blockchainos.add(newblock); // add new block to blockchain
        try {transaction.commit();}
        catch (TypeError) {console.warn('commited before expected');}
        processblockqueue();
        return true; // exit cursor
      }
      // check if the new block extends any block within the last <maxbackfork> blocks, starting a new fork.
      for (let backcount=0, lastblock=endblock; backcount < maxbackfork; backcount++) {
        blockchainos.get(lastblock.prevhash).onsuccess = function(e) {
          if (newblock.prevhash === lastblock.hash) {
            newblock.length = lastblock.length+1;
            console.log('accepting block ', newblock);
            endblocks.add(newblock);
            blockchainos.add(newblock); // add new block to blockchain
            processblockqueue();
            return true; // exit cursor
          }
          lastblock = e.target.result.value;
        };
      }
      cursor.continue();
    }
  };
  cursorreq.oncomplete = processblockqueue;
}
