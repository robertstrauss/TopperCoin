var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var path = require('path');
var fs = require('fs');


const targetcs = 5; // the goal for number of connections per node
let nextid = 0; // id assigning algo
const web = {}; // graph of network/web of nodes
const nodeids = {}; // ids of each node

__dirname = path.resolve(path.dirname('')); // root directory

app.use(express.static(__dirname + '/')); // use root so other files can be used

app.get('/', function (req, res){
  res.sendFile(__dirname + '/index.html'); // serve index.html
});

io.on('connection', function (socket){
  // if (nodes.indexOf(socket.id) === -1) {// if it isn't already in list
  // nodes.push(socket.id); // add node to list

  console.log('node connected', socket.id);
  let myid = nextid++;
  nodeids[socket.id] = myid;
  // weave node into network
  var [lowestItems] = Object.values(web).sort(([ ,v1], [ ,v2]) => v1 - v2); // sort into list by lowest values
  lowestItems = lowestItems || [];
  for (let i = 0; i < targetcs; i++) ( web[lowestItems[i]] || [] ).push(myid); // connect this node to the nodes with the fewest connections
  web[myid] = lowestItems.slice(0, targetcs+1); // entry for this node's peers

  socket.on('disconnect', function(){
    // TODO let peers know i'm disconnecting so they don't get islanded
    console.log('node disconneted', socket.id);
    let myid = nodeids[socket.id];
    web[myid].forEach(nid => web[nid].splice(web[nid].indexOf(myid))); // remove self from peers' peers
    delete web[myid]; // remove self's peers
    delete nodeids[socket.id]; // remove id
    // var index = nodes.indexOf(socket.id); // get index of node, check if exists
    // if (index != -1) nodes.splice(index, 1); // remove this node on leave
  });


  socket.on('toall', message => io.emit(message.type, message.content)); // just  forward all blocks
  // socket.on('transaction', io.emit); // forward all transactions
  socket.on('message', function (message) { // message to specific set of nodes
    io.to(message.to).emit(message.type, {from:socket.id, content:message.content}); // send message to each in list of recipients
  });
  socket.on('topeers', function (message) {
    let msg = {from:socket.id, content: message.content};
    web[nodeids[socket.id]].forEach(peerid => io.to(nodeids[peerid]).emit(message.type, msg)); // send msg to each of my peers
  });
});

http.listen(8000, function(){
  console.log('listening on *:8000');
});
