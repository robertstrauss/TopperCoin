// socket to communicate with server
let socket = io();

// object containing info specific to the client's node
const thisNode = {};
// get user info from cookies. if this is null ???
thisNode.address = RegExp('address=([^;]+)').exec(document.cookie);
thisNode.privkey = RegExp('privkey=([^;]+)').exec(document.cookie);
thisNode.pubkey = RegExp('pubkey=([^;]+)').exec(document.cookie);

const difficulty = 4; // how many zeros (hex) block hash must start with


// initial set up of using the blockchain
let blockchaindb; // global used for accessing blockchain
let request = indexedDB.open('blockchain');
request.onupgradeneeded = function(e) { // called if the user doesn't have a blockchain database yet
  console.log('initializing blockchain database');
  blockchaindb = request.result; // global way of accessing blockchain

  // create a 'objectstore' in the database - where all the data actually is
  let objectStore = db.createObjectStore('blockchain', { keyPath: 'index' });
  objectStore.createIndex('index', 'index', { unique: true });
  objectStore.createIndex('previoushash', 'previoushash', { unique: true });
  objectStore.createIndex('transactions', 'transactions', { unique: false });
  objectStore.createIndex('proofofwork', 'proofofwork', { unique: false });

  console.log('created object store');
  console.log('database initialization complete');
  // blockchain objectstore should be empty
  // right now, but it will be filled
  // when onsuccess is called after this
}
request.onsuccess = function() {
  blockchaindb = request.result; // set the global variable for accessing blockchain

  // open the database for writing
  blockchainobjectstore = blockchaindb.transaction(['blockchain'], 'readwrite').objectStore('blockchain');

  // request the count (length) of the blockchain,
  // when it is returned send a request for the rest
  blockchainobjectstore.count().onsuccess = function(event){
    // length of local blockchain: event.target.result
    // send a request for the blocks after what we have
    console.log('requesting blockchain');
    socket.emit('request', `blockchainsince${event.target.result}`);
  };
}


socket.on('transaction', function(transactionstring){
  // TODO verify transaction, mine it (optional), add it to local blockchain
  console.log('received transaction: ', transactionstring);
});
socket.on('block', function(blockstring){
  console.log('received block: ', blockstring);

  if (!SHA256(blockstring).startsWith(Array(difficulty+1).join('0'))) // check if hash of block starts with zeros according to difficulty
    return false; // if not, reject

  console.log('Block matches difficulty');

  let prevhash = blockstring.split(';')[0]; // the head of the block linking it to the last block
  // go through the last 10 blocks to check if it appends to any of them
  let blockchainos = blockchaindb.transaction(['blockchain'], 'readonly').objectStore('blockchain');
  blockchainos.openCursor('index', 'prev').onsuccess = function(event) { // iterate backwards by index
    let cursor = event.target.result;
    if (cursor.value < 10) { // if within the last 10 blocks
      if(SHA256(blockchainos.get(cursor.value)) === prevhash){ // if the block says it comes after this one
        console.log('block can be inserted at index: ' + (parseInt(cursor.value)+1)); // save the index of the block it comes after
        return; // exit
      }
      else cursor.continue(); // otherwise continue search
    }
  }

});











// FUNCTIONS



function maketransaction() {

}



function getPubKey(address) { // get the public key of an address in the blockchain
  // syncblockchain();
  // make regexp for finding publickey
  let re = new RegExp(address+'>0>mypublickeyis([a-zA-Z0-9]+)');
  // request the blockchain for reading
  blockchainos = blockchaindb.transaction(['blockchain'], 'readonly').objectStore('blockchain');
  blockchainos.openCursor().onsuccess = function(e) { // iterate through blockchain to find publickey announcement
    let cursor = e.target.result; // cursor holds current block
    if (cursor) { // if still in the blockchain
      if ((pk = re.exec(cursor.value.transactions)) != null) { // check for regexp match, and return it if so
        return pk;
      }
      // advance to next block
      cursor.continue();
    }
  }
}

function broadcasttransaction(amount, recipient) {
  let transactionstring = `${thisNode.address}>${amount}>${recipient}`;
  let sign = new JSEncrypt();
  sign.setPrivateKey(thisNode.privkey);
  let signature = sign.sign(transactionstring);
  // cryptico doesn't work with signing, that's why the other package is implemented too
  // let signature = cryptico.decrypt(transactionstring, thisNode.privkey); // encrypting with private key is signing
  console.log(signature);
  socket.emit('transaction', transactionstring + '|' + signature);
}







function previewBlockChain(blockchainobjectstore) {
  console.log('previewing blockchain');
  // fill the blockchain preview div
  blockchainpreviewdiv = document.getElementById('blockchainpreview');

  blockchainobjectstore.openCursor().onsuccess = function(e) {
    let cursor = e.target.result;
    if(cursor) {
      console.log('indexdbcursor: ' + cursor.value);

      let block = cursor.value.block.split(';');

      let blockdiv = document.createElement('a'); // create an element for this block
      blockdiv.className = 'block'; // of class block
      blockdiv.href = '/blockchain/'+i; // that links to a page on the block
      // create individual divs for the previous hash, transactions, and proofofwork of the block
      ['prevhash', 'transactions', 'proofofwork'].forEach(function(thing, i){
        let element = document.createElement('div');
        element.className = thing;
        element.innerHTML = block[i];
        blockdiv.appendChild(element);
      })
      blockchainpreviewdiv.appendChild(blockdiv); // add created html block to the document

      cursor.continue();
    } else {
      console.log('all blocks displayed');
    }
  }
}






function register() {
  event.preventDefault();
  // verify password
  let password1 = document.getElementById('registerpassword1').value;
  let password2 = document.getElementById('registerpassword2').value;
  if (password1 != password2) {
    console.log('passwords do not match');
    return false;
  }

  // sync blockchain
  syncblockchain();

  // verify entered address
  let address = document.getElementById('registeraddress').value;
  console.log(address);
  if (getPubKey(address) != null) {
    console.log('That username is not available');
    return false;
  }

  let RSAKey = cryptico.generateRSAKey(password1, 1024);
  let publicKeyString = cryptico.publicKeyString(RSAKey);

  // save info
  thisNode.address = address;
  document.cookie = 'address='+thisNode.address;
  thisNode.privkey = RSAKey;
  document.cookie = 'privkey='+thisNode.privkey;
  thisNode.pubkey = publicKeyString;
  document.cookie = 'pubkey='+thisNode.pubkey;

  // announce in blockchain
  broadcasttransaction(0, 'mypublickeyis'+thisNode.pubkey);
  return false;
}








function login() {
  // sync blockchain
  console.log('The blockchain will be synced to verify your username. This might take a few minutes.');
  syncblockchain();

  // get values from form
  let address = document.getElementById('loginaddress').value;
  let password = document.getElementById('loginpassword').value;

  // generate RSA key from password
  let RSAKey = cryptico.generateRSAKey(password1, 1024);
  let publicKeyString = cryptico.publicKeyString(RSAKey);

  // check password
  if (getPubKey(address) != publicKeyString) {
    console.log('invalid login');
    return false;
  }

  // save info
  thisNode.address = address;
  document.cookie = 'address='+thisNode.address;
  thisNode.privkey = RSAKey;
  document.cookie = 'privkey='+thisNode.privkey;
  thisNode.pubkey = publicKeyString;
  document.cookie = 'pubkey='+thisNode.pubkey;
}
