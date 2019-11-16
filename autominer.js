
// call compiled cpp function to mine block (wasm)
async function mineBlock(blockstring, dfc, callback) { // difficulty in zeros in binary
  let minedBlock = Module.ccall('mineBlock', 'string', ['string', 'int'], [blockstring, dfc]);
  // callback(minedBlock);
  return minedBlock;
}
// // javascript miner
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
  con.log('starting new block from ', lastblock);
  let blockstring = lastblock.hash+';>1>'+(thisNode.pubkey||'')+'|,'; // start with previous block (lastblock) hash
  blockstring +=    transactions.join(','); // dump recorded transactions into block delimited by commas

  thisNode.miner.postMessage([blockstring, difficulty]); // send data for mining
  thisNode.miner.addEventListener('message', e => socket.emit('block', blockstring+';'+e.data)); // emit block when done
}

function startMining() {
  // confirm if not logged in
  if (!(thisNode.pubkey || confirm('You are not logged in, so you will not recieve TPC for mining. Continue?'))) return;


  thisNode.miner = new Worker('minerthread.js'); // open thread
  setTimeout(()=>getLongestBlock(fromBlock), 1000); // start mining from longest block after 1000s to get Module ready

  // change the mining button
  let minebtn = document.getElementById('miningstatus');
  minebtn.innerHTML = '⚒ <span>Mining!</span>';
  minebtn.classList.add('rainbowtxt');
  minebtn.onclick = stopMining;
}

function stopMining() {
  // document.body.removeChild(thisNode.mineframe); // remove miner from document
  // thisNode.minewin.close();
  thisNode.miner.terminate();
  thisNode.miner = null;
  // change the mining button
  let minebtn = document.getElementById('miningstatus');
  minebtn.innerHTML = '⚒ <span>Not mining</span>';
  minebtn.classList.remove('rainbowtxt');
  minebtn.onclick = startMining;
}
