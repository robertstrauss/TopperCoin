importScripts('wasmminer.js');
onmessage = (e)=>{
  console.log('mining', e.data);
  const minedBlock = Module.ccall('mineBlock', 'string', ['string', 'int'], e.data);
  console.log('mined block with POW', minedBlock);
  postMessage(minedBlock);
};
