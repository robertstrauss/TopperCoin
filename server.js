var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var path = require('path');
var fs = require('fs');




const nodes = []; // array of all connected nodes

__dirname = path.resolve(path.dirname('')); // root directory

app.use(express.static(__dirname + '/')); // use root so other files can be used

app.get('/', function (req, res){
  res.sendFile(__dirname + '/index.html'); // serve index.html
});

io.on('connection', function (socket){
  if (nodes.indexOf(socket.id) === -1) // if it isn't already
    nodes.push(socket.id); // add node to list
  console.log('node connected', socket.id);
  socket.on('disconnect', function(){
    console.log('node disconneted', socket.id);
    var index = nodes.indexOf(socket.id); // get index of node, check if exists
    if (index != -1) nodes.splice(index, 1); // remove this node on leave
  });
  socket.on('block', io.emit); // just forward all blocks
  socket.on('transaction', io.emit); //forward all transactions
  socket.on('message', function (message) { // message to specific set of nodes
    var newmessage = message;
    delete newmessage.to;
    newmessage.from = socket.id;
    message.to.forEach(toid => io.to(toid).emit(newmessage));
  });
});

http.listen(8000, function(){
  console.log('listening on *:8000');
});
