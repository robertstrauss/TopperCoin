importScripts('wasmminer.js');
onmessage = (e)=>{
  console.log('mining', e.data);
  let minedBlock = Module.ccall('mineBlock', 'string', ['string', 'int'], [e.data.blockstring, e.data.dfc]);
  postMessage(minedBlock);
};
