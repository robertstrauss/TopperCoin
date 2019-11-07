
// call compiled cpp function to mine block (wasm)
async function mineBlock(blockstring, dfc, callback) { // difficulty in zeros in binary
  let minedBlock = Module.ccall('mineBlock', 'string', ['string', 'int'], [blockstring, dfc]);
  // callback(minedBlock);
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

  // setTimeout(()=>{ // 1 second wait for transactions
    // let miner = mineBlock(blockstring, difficulty*4)// *4 global hex difficulty to bin diff.
    thisNode.miner.postMessage({blockstring: blockstring, dfc: difficulty*4}); // send data for mining
    // miner.then(async function(minedblock){ // when mining is finished
    thisNode.miner.addEventListener('message', async (e)=>{ // miner thread responds with result (minedblock)
    // setTimeout(()=>{mineBlock(blockstring, difficulty*4, async (minedblock)=>{
    console.log('thread mined block', e.data);
      let minedblock = e.data;
      // add it to personal blockchain
      let mbsplit = minedblock.split(';');
      let mbhash = await hashHex(minedblock, 'SHA-256');
      let mb = {hash: mbhash, prevhash: mbsplit[0], transactions: mbsplit[1], proofofwork: mbsplit[2], length: lastblock.length+1};
      // let trans = blockchaindb.transaction(['blockchain', 'endblocks'], 'readwrite');
      // let blockchainos = trans.objectStore('blockchain');
      // let endblockos = trans.objectStore('endblocks');
      // blockchainos.add(mb); // add to blockchain
      // try {
      //   endblockos.delete(lastblock.hash); // make this the endpoint
      // } catch (DataError) {
      //   console.warn('first block, no previous hash');
      // }
      // endblockos.add(mb);
      // try {
      //   trans.commit(); // end transaction
      // } catch (TypeError) {
      //   console.warn('transaction committed before expected.');
      // }
      // start on next block
      fromBlock(mb);
      // send block to others
      socket.emit('block', minedblock);
      return; // end newblock function
    });//}, 1);
  // });
}

function startMining() {
  // confirm if not logged in
  if (!(thisNode.address || confirm('You are not logged in, so you will not recieve TPC for mining. Continue?'))) return;


  try{document.body.removeChild(thisNode.mineframe); // remove if already there
  } catch (TypeError) {console.log('miner not already started.')}

  // thisNode.mineframe = document.createElement('iframe');
  // thisNode.mineframe.src = '/miner.html';
  // document.body.appendChild(thisNode.mineframe); // put miner in document
  // try{thisNode.minewin.close()} catch (TypeError) {}
  // thisNode.minewin = window.open('miner.html')
  // getLongestBlock(fromBlock);
  thisNode.miner = new Worker('minerthread.js'); // open thread
  // thisNode.miner.postMessage(JSON.stringify(Module)); // send over the Module
  setTimeout(()=>getLongestBlock(fromBlock), 1000); // start mining from longest block
  // start off longest block once thread is ready
  // thisNode.miner.addEventListener('message', (e)=>{console.log(e);if(e.data === 'ready') getLongestBlock(fromBlock)});

  // change the mining button
  let minebtn = document.getElementById('miningstatus');
  minebtn.innerHTML = '⚒ <span>Mining!</span>';
  minebtn.style.color = 'hsl(var(--rainbow))';
  minebtn.onclick = stopMining;

  // getLongestBlock(fromBlock); // start miner from longest block
}

function stopMining() {
  // document.body.removeChild(thisNode.mineframe); // remove miner from document
  // thisNode.minewin.close();
  thisNode.miner.terminate();
  // change the mining button
  let minebtn = document.getElementById('miningstatus');
  minebtn.innerHTML = '⚒ <span>Not mining</span>';
  minebtn.style.color = 'hsl(var(--text-clr))';
  minebtn.onclick = startMining;
}
