let socket = io();

const thisNode = {};

thisNode.blockchain;
thisNode.address = RegExp('address=([^;]+)').exec(document.cookie);
thisNode.privkey = RegExp('privkey=([^;]+)').exec(document.cookie);
thisNode.pubkey = RegExp('pubkey=([^;]+)').exec(document.cookie);

syncBlockchain();
useBlockchain(previewBlockChain);

function useBlockchain(func, access='readonly') {
  let blockchainrequest = indexedDB.open('blockchain');
  // db doesn't exist yet
  blockchainrequest.onupgradeneeded = function() {
    alert('syncing blockchain');
    let db = event.target.result;
    // Create an objectStore
    let objectStore = db.createObjectStore('blockchain', { keyPath: 'previoushash' });
    objectStore.createIndex('previoushash', 'previoushash', { unique: true });
    objectStore.createIndex('transactions', 'transactions', { unique: false });
    objectStore.createIndex('proofofwork', 'proofofwork', { unique: false });
    // fetch('/blockchain.txt')
    //   .then(resp => console.log(resp.text()));
  }
  blockchainrequest.onsuccess = function(event) {
    alert('success opening blockchian indexeddb');
    let blockchainobjectstore = event.target.result
                  .transaction(['blockchain'], access)
                  .objectStore('blockchain');
    func(blockchainobjectstore);
  }
}


function syncBlockchain() {
  let blockchaintext;
  fetch('/blockchain.txt').then(function(blockchainfile){
    blockchainfile.text().then(function(bctext){
      useBlockchain(function(blockchainobjectstore) {
        alert('transaction with objectstore');
        alert(bctext);
        bctext.split('\n').forEach(function(block, i){
          alert(i+': '+block);
          try{
          blockchainobjectstore.put(block, block.split(';')[0]);
          } catch(error) {
            alert('error:'+error);
          }
        });
      }, 'readwrite');
    });
  });
  alert('synced blockchain');
}


function getPubKey(address) { // get the public key of an address in the blockchain
  // syncblockchain();
  return RegExp(address+'>0>mypublickeyis([a-zA-Z0-9]+)').exec(thisNode.blockchain);
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
  alert('previewing blockchain');
  // fill the blockchain preview div
  blockchainpreviewdiv = document.getElementById('blockchainpreview');

  blockchainobjectstore.openCursor().onsuccess = function(e) {
    let cursor = e.target.result;
    if(cursor) {
      alert('indexdbcursor: ' + cursor.value);

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
      alert('all blocks displayed');
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








socket.on('transaction', function(transactionstring){
  // TODO verify transaction
  console.log('received transaction:', transactionstring);
});
