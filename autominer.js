
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
  let blockstring = lastblock.hash+';miningbonus>1>'+thisNode.address+','; // start with previous block (lastblock) hash
  blockstring +=    transactions.join(','); // dump recorded transactions into block delimited by commas
  console.log('mining', blockstring);
  // socket.emit('transactionrequest');

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
