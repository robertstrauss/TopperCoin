
// call compiled cpp function to mine block (wasm)
async function mineBlock(blockstring, dfc) { // difficulty in zeros in binary
  let minedBlock = Module.ccall('mineBlock', 'string', ['string', 'int'], [blockstring, dfc]);
  return minedBlock;
}
// async function mineBlock(block, dfc) {
//   let proofofwork = 0;
//   let minedblock;
//   do {
//     proofofwork += 1;
//     minedblock = block + ";" + proofofwork.toString();
//   } while (!sha256(minedblock).startsWith(new Array(dfc + 1).join( "0" )));
//   return minedblock;
// }







async function fromBlock(lastblock) {
  console.log('starting new block from ', lastblock);
  let blockstring = lastblock.hash+';miningbonus>1>'+thisNode.address; // start with previous block (lastblock) hash

  socket.emit('transactionrequest');

  setTimeout(function(){ // 1 second wait for transactions
    thisNode.miner = mineBlock(blockstring, difficulty*4)// *4 global hex difficulty to bin diff.
    thisNode.miner.then(async function(minedblock){ // when mining is finished
      // add it to personal blockchain
      let mbsplit = minedblock.split(';');
      let mbhash = await hashHex(minedblock, 'SHA-256');
      let mb = {hash: mbhash, prevhash: mbsplit[0], transactions: mbsplit[1], proofofwork: mbsplit[2], length: lastblock.length+1};
      let trans = blockchaindb.transaction(['blockchain', 'endblocks'], 'readwrite');
      let blockchainos = trans.objectStore('blockchain');
      let endblockos = trans.objectStore('endblocks');
      blockchainos.add(mb); // add to blockchain
      try {
        endblockos.delete(lastblock.hash); // make this the endpoint
      } catch (DataError) {
        console.warn('first block, no previous hash');
      }
      endblockos.add(mb);
      try {
        trans.commit(); // end transaction
      } catch (TypeError) {
        console.warn('transaction committed before expected.');
      }
      // start on next block
      fromBlock(mb);
      // send block to others
      socket.emit('block', minedblock);
      return; // end newblock function
    });
  }, 1000);

  // add to block on transaction (verify first);
  socket.on('transaction', async function(transactionstring){ // sender>amount>recipient|signature
    console.log('recieved transaction', transactionstring);
    const split = transactionstring.split('|'); // transaction, signature
    const transaction = split[0].split('>'); // sender, amount, recipient
    const sender = transaction[0], amount = transaction[1];
    const hashhHex = await hashHex(split[0], 'SHA-256');
    const hashDec = bigInt(BigInt(['0x', hashhHex].join('')));
    // two long asynchronous processes: start both with promises before awaiting
    const pubkeyprom = getPubKey(sender);
    console.log(sender);
    calcBalance(sender, async function(bal){
      let pubkeystr = await pubkeyprom;
      if (!pubkeystr) { // user not yet registered
          pubkeystr = transaction[2].substring(13); // 13 = length of 'mypublickeyis'
          console.log('pk', pubkeystr);
      }
      const pubkey = bigInt(BigInt(pubkeystr));
      // const msg = strToBigInt(split[0]);
      let sign = RSA.decrypt(bigInt(BigInt(split[1])), RSA.e, pubkey);
      console.log('sign', sign);
      console.log('hashDec', hashDec);
      console.log(sign, hashDec, sign.equals(hashDec), sign.value=== hashDec.value, sign.value==hashDec.value);
      if (sign.equals(hashDec)){
        console.log('yes');
        console.log(bal, transaction[1])
        if (bal >= transaction[1]) { // check signature and balance
          // valid transaction
          blockstring += ','+transactionstring; // add transaction
          thisNode.miner = mineBlock(blockstring, difficulty*4) // restart miner (*4 bin to hex diff)
        }
      }
    });
  });
}

function startMining() {
  // confirm if not logged in
  if (!(thisNode.address || confirm('You are not logged in, so you will not recieve TPC for mining. Continue?'))) return;


  try{document.body.removeChild(thisNode.mineframe); // remove if already there
  } catch (TypeError) {console.log('miner not already started.')}

  // thisNode.mineframe = document.createElement('iframe');
  // thisNode.mineframe.src = '/miner.html';
  // document.body.appendChild(thisNode.mineframe); // put miner in document
  try{thisNode.minewin.close()} catch (TypeError) {}
  thisNode.minewin = window.open('miner.html', '', 'width=324,height=200')

  // change the mining button
  let minebtn = document.getElementById('miningstatus');
  minebtn.innerHTML = '⚒ <span>Mining!</span>';
  minebtn.style.color = 'hsl(var(--rainbow))';
  minebtn.onclick = stopMining;

  // getLongestBlock(fromBlock); // start miner from longest block
}

function stopMining() {
  // document.body.removeChild(thisNode.mineframe); // remove miner from document
  thisNode.minewin.close();

  // change the mining button
  let minebtn = document.getElementById('miningstatus');
  minebtn.innerHTML = '⚒ <span>Not mining</span>';
  minebtn.style.color = 'hsl(var(--text-clr))';
  minebtn.onclick = startMining;
}
