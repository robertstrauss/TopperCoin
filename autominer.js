// call compiled cpp function to mine block (wasm)
async function mineBlock(blockstring) {
  return Module.ccal('mineBlock', 'string', ['string'], [blockstring]);
}

// determine the block that is farthest in the blockchain
async function getLongestBlock() {
  let blockstring = '';
  let endblockos = blockchaindb.transaction(['endblocks'], 'readonly').objectStore('endblocks' );
  let longestblock= {};
  endblockos.openCursor().onsuccess = function(e) {
    // iterate through enblocks to find "longest" - one with most behind it
    let cursor = e.target.result;
    if (cursor) {
      let block = cursor.value;
      if (block.length > longestblock.length)
        longestblock = block;
      cursor.continue();
    }
    else { // done going through endblocks
      return longestblock;
    }
  }
}

let longestblock = await getLongestBlock(); // find the farthest block in the chain
let blockstring = longestblock.hash+';miningbonus>1>'+thisNode.address; // start with previous block (longestblock) hash

// go ahead and start mining
mineBlock(blockstring).then(minedblock => socket.emit('block', minedblock)); // mine and emit block when done (async)

socket.on('transaction', async function(transactionstring){ // sender>amount>recipient|signature
  const split = transactionstring.split('|'); // transaction, signature
  const transaction = split[0].split('>'); // sender, amount, recipient
  const sender = transaction[0], amount = transaction[1];
  const hashHex = await hashHex(split[0]);
  const hashDec = bigInt(['0x', hashHex].join(''));
  // two long asynchronous processes: start both with promises before awaiting
  const pubkeyprom = getPubKey(sender);
  const balprom = calcBalance(sender);
  const pubkey = await pubkeyprom;
  const bal = await balprom;
  if (RSA.decrypt(split[0], RSA.e, pubkey) === hashDec
      && bal >= transaction[1]) { // check signature and balance
    // valid transaction
    blockstring += ','+transactionstring; // add transaction
    mineBlock(blockstring).then(minedblock => socket.emit('block', minedblock)); // mine and emit block when done (async)
  }
});
