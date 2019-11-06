var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var path = require('path');
var fs = require('fs');

const nodes = []; // array of all connected nodes
// var tstream = fs.createWriteStream('unminedtransactions.txt', {flags:'a'});
// var bstream = fs.createWriteStream('blockchain.txt', {flags:'a'});

__dirname = path.resolve(path.dirname('')); // root directory

app.use(express.static(__dirname + '/')); // use root so other files can be used

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html'); // serve index.html
});

io.on('connection', function(socket){
  if (nodes.indexOf(socket.id) === -1) // if it isn't already
    nodes.push(socket.id); // add node to list
  console.log('node connected', socket.id);
  socket.on('disconnect', function(){
    console.log('node disconneted', socket.id);
    var index = nodes.indexOf(socket.id); // get index of node, check if exists
    if (index != -1) nodes.splice(index, 1); // remove this node on leave
  });
  socket.on('transaction', function(transactionstring){
    /* first should verify transaction */
    io.emit('transaction', transactionstring); // forward message to all nodes

    // tstream.write(transactionstring + '\n');

  });
  socket.on('block', function(blockstring){
    /* first should verify block */
    io.emit('block', blockstring); // forward message to all nodes

    // bstream.write(blockstring + '\n');

  });
  socket.on('request', function(req){
    // forward request to three random nodes. give my id to respond to
    io.to(nodes[Math.round(Math.random()*nodes.length)]).emit(req.type+'request', {content:req.content, respondto:socket.id});
    io.to(nodes[Math.round(Math.random()*nodes.length)]).emit(req.type+'request', {content:req.content, respondto:socket.id});
    io.to(nodes[Math.round(Math.random()*nodes.length)]).emit(req.type+'request', {content:req.content, respondto:socket.id});
  });
  socket.on('response', function(resp){
    io.to(resp.to).emit(resp.type, resp.content); // forward to just requester
  });
  // socket.on('blockchainrequest', function(requeststring){
  //   io.emit('blockchainrequest', requeststring);
  //   console.log('received request '+requeststring);
  //   if (requeststring == 'unminedtransactions') {
  //     //respond with unmined transactions
  //   }
  //   if (requeststring.startsWith('blockchainsince')) {
  //       b  l  o  c  k  c  h  a  i  n  s  i  n  c  e  X  X  X
  //       0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15<---- where to start with .substr()
  //     var startindex = parseInt(requeststring.substr(15)); // 15 = charachters in 'blockchainsinceXXX' to XXX
  //
  //     fs.readFile('blockchain.txt', function(err, buf){
  //       console.log('blockchaintxt buf:'+buf);
  //       buf.toString().split('\n').slice(startindex).forEach(function(block){ // split file contents into single blocks and iterate over blocks
  //         socket.emit('block', block); // socket.emit rather than io.emit => respond to sender with block
  //         console.log('emitted block: '+block);
  //       });
  //     });
  //     //respond to single node with blocks since startindex (inclusive)
  //   }
  // });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
