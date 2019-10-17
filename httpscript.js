// if (!indexedDB) {
//   console.error('ERROR: This browser doesn\'t support IndexedDB');
// }
//
// var request = indexedDB.open('toppercoin-db');
//
// // initialize objectstore for blockchain if it doesn't exist
// request.onupgradeneeded = function(event) {
//   var db = event.target.result;
//
//   // Create an objectStore, use prevhash as keypath because it is unique and identifies block
//   var objectStore = db.createObjectStore("blockchain", { keyPath: "previoushash" });
//
//   // Create an index to search blocks by transactinos. might not be unique
//   objectStore.createIndex("transactions", "transactions", { unique: false });
//
//   // Create an index to search blocks by POW. might not be unique
//   objectStore.createIndex("proofofwork", "proofofwork", { unique: false });
//
//   // Use transaction oncomplete to make sure the objectStore creation is
//   // finished before adding data into it.
//   // objectStore.transaction.oncomplete = function(event) {
//   //   // Store values in the newly created objectStore.
//   //   var blockchainObjectStore = db.transaction("blockchain", "readwrite").objectStore("blockchain");
//   //   blockchainData.forEach(function(block) {
//   //     blockchainObjectStore.add(block);
//   //   });
//   // };
// };
// request.onerror = function(event) {
//   console.error('IndexedDB error', request.error);
// };
// var db;
// request.onsuccess = function(event) {
//   db = event.target.result;
// }
//
//
//
// function syncBlockchain() {
//   var transaction = db.transaction(["blockchain"], "readwrite");

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


    // Use transaction oncomplete to make sure the objectStore creation is
    // finished before adding data into it.
    /*
    objectStore.transaction.oncomplete = function(event) {
      // get request for the data
      let blockchain;
      var req = new XMLHttpRequest();
      req.onreadystatechange = function() {
        console.log(req.readyState, req.status);
        if (req.readyState == 4 && req.status == 200)
          blockchain = req.responseText.split('\n');
      }
      req.open('GET', '/blockchain.txt', true); // true for asynchronous
      req.send(null);
      // add blocks to objectstore
      var blockchainObjectStore = db.transaction("blockchain", "readwrite").objectStore("blockchain");
      blockchain.forEach(function(block) {
        blockchainObjectStore.add(block);
      });
    };*/
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
      fetch('/getblockchainsinceindex.py?i='+request.result)
        .then(resp => resp.text().split('\n').forEach(block => blockchain.add(block)));
    }
  }



  // let block;
  // while (block = getrequest(index); index++) {
  //   // block = block.split(';');
  //   // block = {'previoushash':block[0],
  //   //          'transactions':block[1],
  //   //          'proofofwork':block[2]};
  //   blockchain.add(block);
  // }

  return 0;
}

function getPubKey(address) { // get the public key of an address in the blockchain
  syncblockchain();
  return RegExp(address+'>0>mypublickeyis([a-zA-Z0-9]+)').exec(thisNode.blockchain);
}

function broadcasttransaction(amount, recipient) {
  let transactionstring = `${thisNode.address}>${amount}>${recipient}`;
  let signature = cryptico.encrypt(transactionstring, thisNode.privkey, thisNode.privkey); // encrypting with private key is signing
  try {
    // fetch('/transaction.py?transaction=' + transactionstring + '|' + signature);
  } catch (error) {
    console.log('ERROR', error);
  }
  // var req = new XMLHttpRequest();
  // req.onreadystatechange = function() {
  //   if (req.readyState == 4 && req.status == 200)
  //     return 0; // no errors
  // }
  // req.open('POST', '/transaction.py', true); // true for asynchronous
  // let transactionstring = `${thisNode.address}>${amount}>${recipient}`;
  // let signature = cryptico.encrypt(transactionstring, thisNode.privkey, thisNode.privkey); // encrypting with private key is signing
  // req.send(transactionstring+ '|' + signature);
}

function register() {
  // verify password
  let password1 = document.getElementById('registerpassword1').value;
  let password2 = document.getElementById('registerpassword2').value;
  if (password1 != password2) {
    alert('passwords do not match');
    return false;
  }

  // sync blockchain
  alert('The blockchain will be synced to verify your username. This might take a few minutes.');
  syncblockchain();

  // verify entered address
  let address = document.getElementById('registeraddress').value;
  if (getPubKey(address) != null) {
    alert('That username is not available');
    return false;
  }

  // generate RSA key from password
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

// if (myaddress == null || myprivkey == null || mymodulus == null) {
//
// }

// function update() {
//
// }




/**
var blockchain;

var req = new XMLHttpRequest();
req.onreadystatechange = function() {
  if (req.readyState == 4 && req.status == 200)
    blockchain = req.responseText.split('\n');
}
req.open('GET', '/blockchain.txt', true); // true for asynchronous
req.send(null);

var re = new RegExp('tpcaddress=([^;]+)');
var myaddress = re.exec(document.cookie);

// function getPubKeyAndMod(address)
//   var pubkey, pubmod;
//   var re = new RegExp(addr'>0>pubkey:([a-f,0-9])pubmod:([a-f,0-9])');
//   blockchain.forEach(function(block, i){
//     pubkey, pubmod = re.exec(block);
//     if (pubkey != null && pubmod != null) break;
//   });
//   return pubkey, pubmod;
// }

// function login() {
//   let addr = document.getElementById('loginaddress').value;
//   let privkey = document.getElementById('privatekeytext').value;
//   if (addr == null || privkey == null) {
//     return false;
//   }
//   var pubkey, pubmod = getPubKeyAndMod(addr);
//   if (pubkey == null || pubmod == null) {
//     alert('that address has not been registered in the network.');
//   }
//   else if (RSAdecrypt(RSAencrypt('testmessage', pubkey, mubmod), privkey, pubmod) == 'testmessage'){
//     document.cookie = 'tpcaddress='+addr;
//     document.cookie = 'privkey='+privkey;
//     document.cookie = 'pubmod='+pubmod;
//     alert('success!');
//     window.location.reload();
//   } else {
//     alert('invalid login.');
//   }
//   return false;
// }

// function maketransaction() {

// }


function calcBalance(address) {
  var balance = 0.0;
  blockchain.forEach(function(block, i) {
    if (block.includes(address)){
      transactions = block.split(';')[1].split(',');
      transactions.forEach(function(t, j) {
        transaction = t.split('|')[0].split('>');
        if (transaction[0] == address) {
          balance -= parseFloat(transaction[1]);
        }
        if (transaction[2] == address) {
          balance += parseFloat(transaction[1]);
        }
      });
    }
  });
  return balance;
}



function previewBlockChain() {
  // fill the blockchain preview div
  blockchainpreviewdiv = document.getElementById('blockchainpreview');

  blockchain.forEach(function(b, i){ // for every block
    block = b.split(';'); // split into previous block hash, transactions, and proofofwork
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
  });
}

function main() {
  previewBlockChain(); // show blockchain in html

  if (myaddress != null) document.getElementById('address').innerHTML = myaddress;

  // calculate balance

}

window.onload = main;
**/
