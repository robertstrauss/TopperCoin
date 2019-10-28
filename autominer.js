/*
// call compiled cpp function to mine block (wasm)
async function mineBlock(blockstring) {
  let minedBlock = Module.ccall('mineBlock', 'string', ['string', 'int'], [blockstring, difficulty]);
  return minedBlock;
}*/
async function mineBlock(block, dfc) {
  let proofofwork = 0;
  let minedblock;
  do {
    proofofwork += 1;
    minedblock = block + ";" + proofofwork.toString();
  } while (!sha256(minedblock).startsWith(new Array(dfc + 1).join( "0" )));
  return minedblock;
}


async function fromBlock(lastblock) {
  console.log('starting new block from ', lastblock);
  let blockstring = lastblock.hash+';miningbonus>1>'+thisNode.address; // start with previous block (lastblock) hash

  socket.emit('request', 'unminedtransactions');

  thisNode.miner = mineBlock(blockstring, difficulty);
  thisNode.miner.then(async function(minedblock){ // when mining is finished
    // add it to personal blockchain
    let mbsplit = minedblock.split(';');
    let mbhash = await hashHex(minedblock, 'SHA-256');
    let mb = {hash: mbhash, prevhash: mbsplit[0], transactions: mbsplit[1], proofofwork: mbsplit[2], length: lastblock.length+1};
    let trans = blockchaindb.transaction(['blockchain', 'endblocks'], 'readwrite');
    let blockchainos = trans.objectStore('blockchain');
    let endblockos = trans.objectStore('endblocks');
    blockchainos.add(mb); // add to blockchain
    endblockos.delete(lastblock.hash); // make this the endpoint
    endblockos.add(mb);
    // start on next block
    fromBlock(mb);
    // send block to others
    socket.emit('block', minedblock);
    return; // end newblock function
  })

  socket.on('transaction', async function(transactionstring){ // sender>amount>recipient|signature
    const split = transactionstring.split('|'); // transaction, signature
    const transaction = split[0].split('>'); // sender, amount, recipient
    const sender = transaction[0], amount = transaction[1];
    const hashHex = await hashHex(split[0], 'SHA-256');
    const hashDec = bigInt(BigInt(['0x', hashHex].join('')));
    // two long asynchronous processes: start both with promises before awaiting
    const pubkeyprom = getPubKey(sender);
    calcBalance(sender, async function(bal){
      const pubkey = await pubkeyprom;
      if (RSA.decrypt(split[0], RSA.e, pubkey) === hashDec
          && bal >= transaction[1]) { // check signature and balance
        // valid transaction
        blockstring += ','+transactionstring; // add transaction
        thisNode.miner = mineBlock(blockstring, difficulty) // restart miner
      }
    });
  });
}

function startMining() {
  if (!(thisNode.address || confirm('You are not logged in, so you will not recieve TPC for mining. Continue?'))) return;

  // let miningwindow = window.open('miner.html', '', 'width=324,height=200')

  document.getElementById('miningstatus').innerHTML = 'Mining!';

  getLongestBlock(fromBlock); // start miner from longest block
}

// let thisNode.miner = mineNewBlock();

// socket.on('block', function(){
//   if (thisNode.miner != null) { // currently mining
//     thisNode.miner = null; // stop miner (? setting promise to null stops async function ?)
//     setTimeout(function(){getLongestBlock(fromBlock)}, 1000); // get the longest block and start thisNode.miner from it}, 1); // restart thisNode.miner after 1 millisecond
//   }
// });
