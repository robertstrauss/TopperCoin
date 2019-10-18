var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var path = require('path');
var fs = require('fs');

var stream = fs.createWriteStream("unminedtransactions", {flags:'a'});

__dirname = path.resolve(path.dirname('')); // root directory

app.use(express.static(__dirname + '/')); // use root so other files can be used

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html'); // serve index.html
});

io.on('connection', function(socket){
  console.log('a user connected');
  socket.on('transaction', function(transactionstring){
    io.emit('transaction', transactionstring);
    stream.write(transactionstring + '\n');
  });
  socket.on('minedblock', function(minedblockstring){

  });
});

http.listen(8002, function(){
  console.log('listening on *:8002');
});
