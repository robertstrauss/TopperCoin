// call compiled cpp function to mine block (wasm)
async function mineBlock(blockstring) {
  let minedBlock = await Module.ccal('mineBlock', 'string', ['string'], [blockstring]);
  return minedBlock;
}

async function mineNewBlock(){
  let longestblock = await getLongestBlock(); // find the farthest block in the chain
  let blockstring = longestblock.hash+';miningbonus>1>'+thisNode.address; // start with previous block (longestblock) hash

  socket.emit('request', 'unminedtransactions');

  let miner = mineBlock(blockstring);
  miner.then(function(minedblock){
    socket.emit('block', minedblock);
    return; // end newblock function
  })

  socket.on('transaction', async function(transactionstring){ // sender>amount>recipient|signature
    const split = transactionstring.split('|'); // transaction, signature
    const transaction = split[0].split('>'); // sender, amount, recipient
    const sender = transaction[0], amount = transaction[1];
    const hashHex = await hashHex(split[0]);
    const hashDec = bigInt(BigInt(['0x', hashHex].join('')));
    // two long asynchronous processes: start both with promises before awaiting
    const pubkeyprom = getPubKey(sender);
    calcBalance(sender, async function(bal){
      const pubkey = await pubkeyprom;
      if (RSA.decrypt(split[0], RSA.e, pubkey) === hashDec
          && bal >= transaction[1]) { // check signature and balance
        // valid transaction
        blockstring += ','+transactionstring; // add transaction
        mineBlock(blockstring).then(minedblock => socket.emit('block', minedblock)); // mine and emit block when done (async)
      }
    });
  });
}

let miner = mineNewBlock();

socket.on('block', function(){
  miner = null; // stop miner
  setTimeout(function(){miner = mineNewBlock();}, 1); // restart miner after 1 millisecond
});
