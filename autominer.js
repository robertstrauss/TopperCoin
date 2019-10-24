async function mineBlock(blockstring) {
  return Module.ccal('mineBlock', 'string', ['string'], [blockstring]);
}

let blockstring = '';
let transaction = blockchaindb.transaction(['blockchain', 'endblocks'], 'readonly');
let blockchainos= transaction.objectStore('blockchain');
let endblockos  = transaction.objectStore('endblocks' );

// determine the block that is farthest in the blockchain
async function getLongestBlock() {
  let longestblock = {};
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

let longestblock = await getLongestBlock();
let block = longestblock.hash+';'; // start with previous block (longestblock) hash

socket.on('transaction', async function(transactionstring){ // sender>amount>recipient|signature
  const split = transactionstring.split('|'); // transaction, signature
  const transaction = split[0].split('>'); // sender, amount, recipient
  const sender = transaction[0], amount = transaction[1];
  const hashHex = await hashHex(split[0]);
  const hashDec = bigInt(['0x', hashHex].join(''));
  // two long asynchronous processes
  const pubkeyprom = getPubKey(sender);
  const balprom = calcBalance(sender);
  const pubkey = await pubkeyprom;
  const bal = await balprom;
  if (RSA.decrypt(split[0], RSA.e, pubkey) === hashDec
      && bal >= transaction[1]) {
    blockstring.push(transactionstring);
  }
});
