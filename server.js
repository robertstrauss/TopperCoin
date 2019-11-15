var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var path = require('path');
var fs = require('fs');




const nodes = []; // array of all connected nodes

__dirname = path.resolve(path.dirname('')); // root directory

app.use(express.static(__dirname + '/')); // use root so other files can be used

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html'); // serve index.html
});

io.on('connection', function(socket){
  if (nodes.indexOf(socket.id) === -1) // if it isn't already
    nodes.push(socket.id); // add node to list
  console.log('node connected', socket.id);
  socket.on('disconnect', function(){
    console.log('node disconneted', socket.id);
    var index = nodes.indexOf(socket.id); // get index of node, check if exists
    if (index != -1) nodes.splice(index, 1); // remove this node on leave
  });
  socket.on('olleh', function(){
    io.emit('olleh', socket.id);
  });
  socket.on('hello', function(data){
    if(data.to === null) io.emit('hello', data);
    else io.to(data.to).emit('hello', data);
  });
  socket.on('transaction', function(transactionstring){
    io.emit('transaction', transactionstring); // forward message to all nodes
  });
  socket.on('block', function(blockstring){
    io.emit('block', blockstring); // forward message to all nodes
  });
  socket.on('request', function(req){
    // forward request to three random nodes. give my id to respond to
    io.to(nodes[Math.round(Math.random()*nodes.length)]).emit(req.type+'request', {content:req.content, respondto:socket.id});
    io.to(nodes[Math.round(Math.random()*nodes.length)]).emit(req.type+'request', {content:req.content, respondto:socket.id});
    io.to(nodes[Math.round(Math.random()*nodes.length)]).emit(req.type+'request', {content:req.content, respondto:socket.id});
  });
  socket.on('response', function(resp){
    io.to(resp.to).emit(resp.type, resp.content); // forward to just requester
  });
});

http.listen(8000, function(){
  console.log('listening on *:8000');
});
