// socket to communicate with server
let socket = io();

// object containing info specific to the client's node
const thisNode = {};
// get user info from cookies. if this is null ???
thisNode.address = RegExp('address=([^;]+)').exec(document.cookie);
thisNode.privkey = RegExp('privkey=([^;]+)').exec(document.cookie);
thisNode.pubkey = RegExp('pubkey=([^;]+)').exec(document.cookie);

const difficulty = 4; // how many zeros (hex) block hash must start with

const maxbackfork = 20; // the furthest number of blocks back a fork can be started








// initial set up of using the blockchain
let blockchaindb; // global used for accessing blockchain
let request = indexedDB.open('blockchain');
request.onupgradeneeded = function(e) { // called if the user doesn't have a blockchain database yet
  console.log('initializing blockchain database');
  blockchaindb = request.result; // global way of accessing blockchain

  // create objectstore for the full blockchain
  let bcObjectStore = blockchaindb.createObjectStore('blockchain', { keyPath: 'hash' });
  bcObjectStore.createIndex('prevhash',    'prevhash',    { unique: true  });
  bcObjectStore.createIndex('transactions','transactions',{ unique: false });
  bcObjectStore.createIndex('proofofwork', 'proofofwork', { unique: false });

  console.log('created blockchain object store');

  // object store for just the most recent blocks
  let ebObjectStore = blockchaindb.createObjectStore('endblocks', { keyPath: 'hash' });
  ebObjectStore.createIndex('prevhash',    'prevhash',    { unique: true  });
  ebObjectStore.createIndex('transactions','transactions',{ unique: false });
  ebObjectStore.createIndex('proofofwork', 'proofofwork', { unique: false });

  console.log('created endblocks object store');

  // genesis block
  bcObjectStore.add({hash: '0000684b7c4cc4bd581d92f7be29d4830d3bd66e320f885900cc7f537e1408cc',
                     prevhash: '', transactions:'strobertisawesome>100>strobert', proofofwork: '44124'});
  ebObjectStore.add({hash: '0000684b7c4cc4bd581d92f7be29d4830d3bd66e320f885900cc7f537e1408cc',
                     prevhash: '', transactions:'strobertisawesome>100>strobert', proofofwork: '44124'});
  console.log('database initialization complete');
  /**
   * blockchain will be synced
   * when onsuccess is called after this
   */
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








// when a transaction is recieved
socket.on('transaction', function(transactionstring){
  // TODO verify transaction, mine it. (optional: if mining)
  console.log('received transaction: ', transactionstring);
});

// when a block is recieved
socket.on('block', function(blockstring){
  let split = blockstring.split(';');
  let newblock = {hash: SHA256(blockstring), prevhash: split[0], transactions: split[1], proofofwork: split[2]};
  console.log('received block: ', newblock);

  if (!newblock.hash.startsWith(Array(difficulty+1).join('0'))) // check if hash of block starts with zeros according to difficulty
    return; // if not, reject

  console.log('Block matches difficulty');

  // get the blockchain and endblocks ready to read from and write to
  let transaction = blockchaindb.transaction(['blockchain', 'endblocks'], 'readwrite');
  let blockchainos = transaction.objectStore('blockchain'); // full blockchain
  let endblockos = transaction.objectStore('endblocks') // the most recent blocks
  console.log('created transacion');
  /*
  ###################################################
  ## the blockchain is self-organizing because     ##
  ## each block has the hash of the previous block.##
  ## we only need to determine if a block should   ##
  ## be added, not where to put it.                ##
  ###################################################
  */

  // check if the new block connects to any previous block recent enough to allow forks
  endblockos.openCursor().onsuccess = function(e){
    let endblock = e.target.result.value;
    // check if the new block extends an endblock
    if (newblock.prevhash === endblock.hash) {
      console.log('accepting block ', newblock);
      endblocks.delete(endblock); // end block is no longer end block
      endplocks.add(newblock); // new block is
      blockchainos.add(newblock); // add new block to blockchain
      return true; // exit loop
    }
    // check if the new block extends any block within the last <maxbackfork> blocks, starting a new fork.
    for (let backcount=0, lastblock=endblock; backcount < maxbackfork; backcount++) {
      blockchainos.get(lastblock.prevhash).onsuccess = function(e) {
        lastblock = e.target.result.value;
        if (newblock.prevhash === lastblock.hash) {
          console.log('accepting block ', newblock);
          endblocks.add(newblock);
          blockchainos.add(newblock); // add new block to blockchain
          return true; // exit loop
        }
      };
    }
  };

});




// preview blockchain after 100ms to give async functions time to fill it
setTimeout(previewBlockchain, 100);










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
  // cryptico doesn't work with signing, that's why the other packalet cursorrequest = ge is implemented too
  // let signature = cryptico.decrypt(transactionstring, thisNode.privkey); // encrypting with private key is signing
  console.log(signature);
  socket.emit('transaction', transactionstring + '|' + signature);
}







function previewBlockchain() {
  let transaction  = blockchaindb.transaction(['blockchain', 'endblocks'], 'readonly');
  let blockchainos =  transaction.objectStore('blockchain');
  let endblockos   =  transaction.objectStore('endblocks' );

  // fill the blockchain preview div
  blockchainpreviewdiv = document.getElementById('blockchainpreview');

  endblockos.openCursor().onsuccess = function(e) { // once for each fork
    let cursor = e.target.result;
    if (cursor) {
      let endblock = cursor.value;
      console.log(endblock);
      for (let i = 0, block=endblock; i < maxbackfork; i++) { // only display as many back as can be forked
        blockchainos.get(block.prevhash).onsuccess = function(e) {
          let blockdiv = document.createElement('a'); // create an element for this block
          blockdiv.className = 'block'; // of class block
          blockdiv.href = '/blockchain/'+block.index; // that links to a page on the block

          // create individual divs for the previous hash, transactions, and proofofwork of the block
          ['prevhash', 'transactions', 'proofofwork'].forEach(function(key){
            let element = document.createElement('div');
            element.className = key;
            element.innerHTML = block[key];
            blockdiv.appendChild(element);
          });

          blockchainpreviewdiv.appendChild(blockdiv); // add created html block to the document

          block = e.target.result.value;
        }
      }
      cursor.continue();
    }
  };
}






function register() {
  // verify password
  let password1 = document.getElementById('registerpassword1').value;
  let password2 = document.getElementById('registerpassword2').value;
  if (password1 != password2) {
    console.log('passwords do not match');
    return false;
  }

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
  console.log('attempting to log in')

  // get values from form
  let address = document.getElementById('loginaddress').value;
  let password = document.getElementById('loginpassword').value;

  // generate RSA key from password
  let RSAKey = cryptico.generateRSAKey(password, 1024);
  let publicKeyString = cryptico.publicKeyString(RSAKey);

  // check password
  if (getPubKey(address) != publicKeyString) {
    alert('invalid login');
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
