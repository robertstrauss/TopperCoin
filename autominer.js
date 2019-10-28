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

async function mineNewBlock(){
  async function fromLongestBlock(longestblock) {
    let blockstring = longestblock.hash+';miningbonus>1>'+thisNode.address; // start with previous block (longestblock) hash

    socket.emit('request', 'unminedtransactions');

    let miner = mineBlock(blockstring, difficulty);
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
          miner = mineBlock(blockstring, difficulty) // restart miner
        }
      });
    });
  }
  getLongestBlock(fromLongestBlock); // get the longest block and start miner from it
}

let miner = null;
// let miner = mineNewBlock();

socket.on('block', function(){
  if (miner != null) {
    miner = null; // stop miner
    setTimeout(function(){miner = mineNewBlock();}, 1); // restart miner after 1 millisecond
  }
});
