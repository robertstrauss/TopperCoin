var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var path = require('path');
var fs = require('fs');

var tstream = fs.createWriteStream("unminedtransactions", {flags:'a'});
var bstream = fs.createWriteStream('blockchain', {flags:'a'});

__dirname = path.resolve(path.dirname('')); // root directory

app.use(express.static(__dirname + '/')); // use root so other files can be used

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html'); // serve index.html
});

io.on('connection', function(socket){
  console.log('node connected');
  socket.on('transaction', function(transactionstring){
    /* first need to verify transaction */
    io.emit('transaction', transactionstring); // forward message to other nodes
    /*
    tstream.write(transactionstring + '\n');
    */
  });
  socket.on('block', function(blockstring){
    /* first should verify block */
    io.emit('block', blockstring); // forward message to other nodes
    /*
    bstream.write(blockstring + '\n');
    */
  });
  socket.on('request', function(requeststring){
    console.log('received request '+requeststring);
    if (requeststring == 'unminedtransactions') {
      // respond with unmined transactions
    }
    if (requeststring.startsWith('blockchainsince')) {
      //   b  l  o  c  k  c  h  a  i  n  s  i  n  c  e  X  X  X
      //   0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15<---- where to start with .substr()
      var startindex = parseInt(requeststring.substr(15)); // 15 = charachters in 'blockchainsinceXXX' to XXX
      // respond to single node with blocks since startindex (inclusive)
    }
  });
});

http.listen(8000, function(){
  console.log('listening on *:8000');
});
