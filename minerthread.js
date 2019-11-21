// importScripts('wasmminer.js');
importScripts('cryptorng.js'); // for hashing
onmessage = async (e)=>{
  // const minedBlock = Module.ccall('mineBlock', 'string', ['string', 'int'], e.data);
  start = new Array(e.data[1]+1).join('0');
  let proofofwork = 0;
  let minedBlock, hash;
  do {
    proofofwork += 1;
    minedBlock = e.data[0] + ';' + proofofwork.toString(16);
    hash = await hashBin(minedBlock, 'SHA-256');
  } while (!hash.startsWith(start));

  postMessage(minedBlock);
};
