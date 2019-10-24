socket.on('transaction', function(blockstring){
  const minedBlock = Module.ccal('mineblock', 'string', ['string'], [blockstring]);
  socket.emit('block', minedBlock);
});
