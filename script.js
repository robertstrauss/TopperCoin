
var socket = io();

class Node {};

const thisNode = new Node();

thisNode.blockchain;
thisNode.address = RegExp('address=([^;]+)').exec(document.cookie);
thisNode.privkey = RegExp('privkey=([^;]+)').exec(document.cookie);
thisNode.pubkey = RegExp('pubkey=([^;]+)').exec(document.cookie);






function syncblockchain() {
  if (!indexedDB) {
    alert('an error occurred.');
    console.error('ERROR: This browser doesn\'t support IndexedDB');
    return 1;
  }

  var request = indexedDB.open('blockchain');

  // sync blockchain if it doesn't exist
  request.onupgradeneeded = function(event) {
    var db = event.target.result;

    // Create an objectStore, use prevhash as keypath because it is unique and identifies block
    var objectStore = db.createObjectStore("blockchain", { keyPath: "previoushash" });

    // Create an index to search blocks by transactinos. might not be unique
    objectStore.createIndex("transactions", "transactions", { unique: false });

    // Create an index to search blocks by POW. might not be unique
    objectStore.createIndex("proofofwork", "proofofwork", { unique: false });
  };
  request.onerror = function(event) {
    alert('an error occurred');
    console.error('IndexedDB error', request.error);
    return 1;
  };
  request.onsuccess = function(event) {
    let db = event.target.result;
    let blockchain = db.transaction(['blockchain'], 'readwrite').objectStore('blockchain');
    let request = blockchain.count();
    request.onsuccess = function() {
      console.log('length: '+request.result);
      fetch('/blockchain.txt')
        .then(resp => console.log(resp.text()));//.split('\n').forEach(block => blockchain.put(block, block.split(';')[0])));
    }
  }

  return 0;
}







function getPubKey(address) { // get the public key of an address in the blockchain
  // syncblockchain();
  return RegExp(address+'>0>mypublickeyis([a-zA-Z0-9]+)').exec(thisNode.blockchain);
}



function broadcasttransaction(amount, recipient) {
  let transactionstring = `${thisNode.address}>${amount}>${recipient}`;
  var sign = new JSEncrypt();
  sign.setPrivateKey(thisNode.privkey);
  var signature = sign.sign(transactionstring);
  // cryptico doesn't work with signing, that's why the other package is implemented too
  // let signature = cryptico.decrypt(transactionstring, thisNode.privkey); // encrypting with private key is signing
  console.log(signature);
  socket.emit('transaction', transactionstring + '|' + signature);
}














function register() {
  event.preventDefault();
  // verify password
  let password1 = document.getElementById('registerpassword1').value;
  let password2 = document.getElementById('registerpassword2').value;
  if (password1 != password2) {
    alert('passwords do not match');
    return false;
  }

  // sync blockchain
  syncblockchain();

  // verify entered address
  let address = document.getElementById('registeraddress').value;
  console.log(address);
  if (getPubKey(address) != null) {
    alert('That username is not available');
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
  alert('The blockchain will be synced to verify your username. This might take a few minutes.');
  syncblockchain();

  // get values from form
  let address = document.getElementById('loginaddress').value;
  let password = document.getElementById('loginpassword').value;

  // generate RSA key from password
  let RSAKey = cryptico.generateRSAKey(password1, 1024);
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








socket.on('transaction', function(transactionstring){
  // TODO verify transaction
  console.log('received transaction:', transactionstring);
});
