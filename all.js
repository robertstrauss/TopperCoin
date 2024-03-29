// socket to communicate with server
const socket = io();

// for getting cookies
function getCookie(name)
{
  var re = new RegExp(name + "=([^;]+)");
  var value = re.exec(document.cookie);
  return (value != null) ? unescape(value[1]) : null;
}

// object containing info specific to the client's node, stored in cookies
const thisNode = {
                   address : ((getCookie('address'))),
                   privkey : ((getCookie('privkey'))),
                   pubkey  : ((getCookie('pubkey' )))
                 }

try {
document.getElementById('address').innerHTML = thisNode.address || "Not Logged In";
} catch (TypeError) {
  
}

// how many zeros (hex) block hash must start with
const difficulty = 4;

// the furthest number of blocks back a fork can be started
const maxbackfork = 20;




function openMiner() {
  // confirm to continue if not logged in
  if (!(thisNode.address || confirm('You are not logged in, so you will not recieve TPC for mining. Continue?'))) return;
  thisNode.miner = window.open('/miner.html', '', 'width=1,height=1');
}




// initial set up of using the blockchain
let blockchaindb; // global used for accessing blockchain
let request = indexedDB.open('blockchain');
request.onupgradeneeded = function(e) { // called if the user doesn't have a blockchain database yet
  console.log('initializing blockchain database');
  blockchaindb = request.result; // global way of accessing blockchain

  // create objectstore for the full blockchain
  let bcObjectStore = blockchaindb.createObjectStore('blockchain', { keyPath: 'hash' });
  bcObjectStore.createIndex('prevhash',    'prevhash',    { unique: false });
  bcObjectStore.createIndex('transactions','transactions',{ unique: false });
  bcObjectStore.createIndex('proofofwork', 'proofofwork', { unique: false });
  bcObjectStore.createIndex('length',      'length',      { unique: false });

  console.log('created blockchain object store');

  // object store for just the most recent blocks
  let ebObjectStore = blockchaindb.createObjectStore('endblocks', { keyPath: 'hash' });
  ebObjectStore.createIndex('prevhash',    'prevhash',    { unique: false });
  ebObjectStore.createIndex('transactions','transactions',{ unique: false });
  ebObjectStore.createIndex('proofofwork', 'proofofwork', { unique: false });
  ebObjectStore.createIndex('length',      'length',      { unique: false });

  console.log('created endblocks object store');

  // genesis block
  const genesis = {hash: '92998c4a48538b8f1c5f0b17ef883dad7f786129ae6f61408e6c9bbd52059796', prevhash: 'genesis',
                     transactions:'>999999999>strobert,>999999>Toaster,>999999>alestone,>999999>DDrew',
                     proofofwork: 'genesis', length: 1};
  bcObjectStore.add(genesis);
  ebObjectStore.add(genesis);
  console.log('database initialization complete');
  /**
   * blockchain will be synced
   * when onsuccess is called after this
   */
}
request.onsuccess = function() {
  blockchaindb = request.result; // set the global variable for accessing blockchain

  // open the database to request from the end
  let trans = blockchaindb.transaction(['endblocks'], 'readonly');
  endblockos = trans.objectStore('endblocks');

  // request the blockchain since each of local endblocks
  endblockos.openCursor().onsuccess = function(event){
    cursor = event.target.result;
    if (cursor) {
      // length of local blockchain: event.target.result
      // send a request for the blocks after what we have
      console.log('requesting blockchain since', cursor.value.hash);
      socket.emit('request', {type:'blockchain', content:`${cursor.value.hash}`});
      cursor.continue();
    }
  };
  trans.oncomplete = (() => previewBlockchain());
}

// reply with blockchain when requested
socket.on('blockchainrequest', function(starthash){
  console.log('blockchain request', starthash);
  blockchainos = blockchaindb.transaction(['blockchain'], 'readonly').objectStore('blockchain');
  prevhash = blockchainos.index('prevhash');
  console.log('index', prevhash);
  prevhash.openCursor(starthash).onsuccess = function(e) {
    console.log('e', e);
    let cursor = e.target.result;
    if (cursor) {
      console.log('block', cursor.value)
      socket.emit('block', cursor.value);
      cursor.continue(e.target.result.value.hash);
    }
  }
});

socket.on('transaction', function(transactionstring){
  console.log(transactionstring);
});

let wait;
let blockqueue = [];
// when a block is recieved
socket.on('block', function(blockstring){
  console.log('recieved block', blockstring);
  /*
  blocks may be sent in very rapid series, it is possible slight deviation
  in computation times may disorder the blocks, which would be rejected
  because of the nature of their organization. To avoid this, recieved blocks
  are added to a queue before calculation time, so the order is preserved.
  */
  clearTimeout(wait); // interrupt timer
  blockqueue.push(blockstring); // add the block to the queue
  wait = setTimeout(processblockqueue, 200); // wait 200 milliseconds then process queue, unless interrupted by another block coming in
});

/**
 * go through list blockqueue[] and add valid blocks to blockchain
 */
async function processblockqueue() {
  blockstring = blockqueue[0];
  blockqueue.splice(0, 1); // remove single (1) index zero (0)
  console.log('processing blockqueue');
  if (!blockstring) return; // blockqueue is empty

  // processnextblock()

  // for (let i = 0; i < blockqueue.length; i++) {
  //   blockstring = blockqueue[i];
    let split = blockstring.split(';');
    const hash = await hashHex(blockstring, 'SHA-256'); // take sha256 hash of entire block
    let newblock = {hash: hash, prevhash: split[0], transactions: split[1], proofofwork: split[2]};


      if (!newblock.hash.startsWith(Array(difficulty+1).join('0'))) {// check if hash of block starts with zeros according to difficulty
        console.log('invalid block (doesn\'t match difficulty)', blockstring);
        processblockqueue();
        return false;
      }

      // get the blockchain and endblocks ready to read from and write to
      let transaction = blockchaindb.transaction(['blockchain', 'endblocks'], 'readwrite');
      let blockchainos = transaction.objectStore('blockchain'); // full blockchain
      let endblockos = transaction.objectStore('endblocks') // the most recent blocks

      /*
      ###################################################
      ## the blockchain is self-organizing because     ##
      ## each block has the hash of the previous block.##
      ## we only need to determine if a block should   ##
      ## be added, not where to put it.                ##
      ###################################################
      */

      // check if the new block connects to any previous block recent enough to allow forks
      let cursorreq = endblockos.openCursor();
      cursorreq.onsuccess = function(e){

      let cursor = e.target.result;
      if (cursor) {
        let endblock = cursor.value;
        // check if the new block extends an endblock directly
        if (newblock.prevhash === endblock.hash) {
          newblock.length = endblock.length+1; // one farther in the blockchain
          console.log('accepting block ', newblock);
          endblockos.delete(endblock.hash); // end block is no longer end block
          endblockos.add(newblock); // new block is
          blockchainos.add(newblock); // add new block to blockchain
          try {transaction.commit();}
          catch (TypeError) {console.warn('commited before expected');}
          processblockqueue(); // recurse
          return true; // exit cursor
        }
        // check if the new block extends any block within the last <maxbackfork> blocks, starting a new fork.
        for (let backcount=0, lastblock=endblock; backcount < maxbackfork; backcount++) {
          blockchainos.get(lastblock.prevhash).onsuccess = function(e) {
            if (newblock.prevhash === lastblock.hash) {
              newblock.length = lastblock.length+1;
              console.log('accepting block ', newblock);
              endblocks.add(newblock);
              blockchainos.add(newblock); // add new block to blockchain
              processblockqueue();
              return true; // exit cursor
            }
            lastblock = e.target.result.value;
          };
        }
        cursor.continue();
      }
    };
    cursorreq.oncomplete = processblockqueue;
    previewBlockchain(); // display blockchain
}

function previewBlockchain() {
  let transaction = blockchaindb.transaction(['blockchain', 'endblocks'], 'readonly');
  let blockchainos = transaction.objectStore('blockchain');
  let endblockos   = transaction.objectStore('endblocks' );



  // fill the blockchain preview div
  blockchainpreviewdiv = document.getElementById('blockchainpreview');
  blockchainpreviewdiv.innerHTML = '';
  let curreq = endblockos.openCursor()
  curreq.onsuccess = function(e) { // once for each fork (from the endpoints)
    let cursor = e.target.result;
    if (cursor) {
      let block = cursor.value;
      let count = 0;
      blockchainos.get(block.hash).onsuccess = function prevFrom(ev) {
        if (count > 32) return; // don't display more than 32 back
        count++;
        let block = ev.target.result;
        if (!block) return;
        let blockdiv = document.createElement('a'); // create an element for this block
        blockdiv.className = 'block'; // of class block
        blockdiv.href = '/blockchain/'+block.hash; // that links to a page on the block

        // create individual divs for the previous hash, transactions, and proofofwork of the block
        ['prevhash', 'transactions', 'proofofwork'].forEach(function(key){
          let element = document.createElement('div');
          element.className = key;
          element.innerHTML = block[key];
          blockdiv.appendChild(element);
        });

        blockchainpreviewdiv.appendChild(blockdiv); // add created html block to the document before others
        blockchainos.get(block.prevhash).onsuccess = prevFrom; // preview from previous block
      }; // preview starting from last block
      cursor.continue();
    }
  };
}



async function maketransaction() {
  const amount = document.getElementById('amount').value;
  const recipient = document.getElementById('recipient').value;
  const recipPKprom = getPubKey(recipient); // start before waiting on others
  calcBalance(thisNode.address, async function(bal){
    const recipPK = await recipPKprom; // only now wait
    if (!amount || !recipient) { // left a field empty
      alert('Fill out all fields.');
      return false;
    }
    if (!thisNode.address) { // not logged in
      alert('You are not logged in.');
      return false;
    }
    if (bal < amount) { // not enough balance
      alert('You do not have enough money to send that much.');
      return false;
    }
    // if (!recipPK) {
    // recipient not in network
    if (!(recipPK || confirm(`${recipient} is not registered on the network yet. Continue?`))) return false;
    // }
    if(!confirm(`Send ${amount} TPC to ${recipient}?`)) return false; // stop unless they confirm affirmatively
    broadcasttransaction(amount, recipient);
    alert('Sent. Watch the blockchain for your transaction.');
  });
}

// determine the block that is farthest in the blockchain
async function getLongestBlock(callback) {
  let blockstring = '';
  let endblockos  = blockchaindb.transaction(['endblocks'], 'readonly').objectStore('endblocks');
  let longestblock= {length:0};
  endblockos.openCursor().onsuccess = function(e) {
    // iterate through enblocks to find "longest" - one with most behind it
    console.log(e.target);
    let cursor = e.target.result;
    if (cursor) {
      let block = cursor.value;
      if (block.length > longestblock.length) longestblock = block;
      cursor.continue();
    }
    else { // done going through endblocks
      callback(longestblock);
    }
  }
}

async function getPubKey(address) { // get the public key of an address in the blockchain
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

/** calculate my balance and put it into DOM */
async function getMyBalance() {
  document.getElementById('tpcbalance').innerHTML = 'Calculating...';
  calcBalance(thisNode.address, function(bal){
    // console.log(bal, !bal);
    if (bal == null) {
      alert('you are not logged in');
      document.getElementById('tpcbalance').innerHTML = '0';
      return false;
    }
    document.getElementById('tpcbalance').innerHTML = bal;
  });
}

/** calculate balance of address */
async function calcBalance(address, callback) {
  let bal = 0;
  // request the blockchain for reading
  blockchainos = blockchaindb.transaction(['blockchain'], 'readonly').objectStore('blockchain');
  let curreq = blockchainos.openCursor();
  curreq.onsuccess = function(e) { // iterate through blockchain to find publickey announcement
    let cursor = e.target.result; // cursor holds current block
    if (cursor) { // if still in the blockchain
      if (cursor.value.transactions.indexOf(address) >= 0) { // check for regexp match, and return it if so
        let transactions = cursor.value.transactions.split(',');
        for (let t = 0; t < transactions.length; t++) {
          let transaction = transactions[t].split('>');
          if (transaction[0] === address) bal-=parseFloat(transaction[1]);
          if (transaction[2] === address) bal+=parseFloat(transaction[1]);
        }
      }
      // advance to next block
      cursor.continue();
    } else { // finished iterating through blockchain
      callback(bal);
    }
  }
}

async function broadcasttransaction(amount, recipient) {
  let transactionstring = `${thisNode.address}>${amount}>${recipient}`;
  let hash = await hashHex(transactionstring, 'SHA-256');
  hash = bigInt(BigInt(['0x', hash].join('')));
  let signature = RSA.encrypt(hash, thisNode.pubkey, thisNode.privkey).toString(); // sign by encrypting with priv key
  socket.emit('transaction', transactionstring + '|' + signature);
}












async function register() {
  setTimeout(function(){alert('Registering... This may take a minute.');}, 1); // asynchronous alert

  // verify password
  let password1 = document.getElementById('registerpassword1').value;
  let password2 = document.getElementById('registerpassword2').value;
  if (password1 != password2) {
    alert('passwords do not match');
    return false;
  }

  // verify entered address
  let address = document.getElementById('registeraddress').value;
  let pubkey = await getPubKey(address);
  if (pubkey != null) {
    console.log('That username is not available');
    return false;
  }

  let keys = await RSA.generate(password1); // start generation of RSA keypair seeded from password1 (1024 bit, secure, real)
  // let RSAKey = cryptico.generateRSAKey(password1, 1024);
  // let publicKeyString = cryptico.publicKeyString(RSAKey);

  // save info
  thisNode.address = address;
  document.cookie = 'address='+thisNode.address.toString();
  thisNode.privkey = bigInt((keys.d)); // keep secret!
  document.cookie = 'privkey='+thisNode.privkey.toString();
  thisNode.pubkey = bigInt((keys.n)); // fixed public exponenet of 65537 (see rsa.js), only need n
  document.cookie = 'pubkey='+thisNode.pubkey.toString();

  // announce in blockchain
  // invoke tostring rather than built in to stop from converting to "infinity"
  broadcasttransaction(0, 'mypublickeyis'+thisNode.pubkey.toString());
  setTimeout(function(){alert('registered successfully!');}, 1); // async alert
  document.getElementById('login').style.display = 'none'; // hide registration modal
  return false;
}








async function login() {
  alert('attempting to log in')

  // get values from form
  let address = document.getElementById('loginaddress').value;
  let password = document.getElementById('loginpassword').value;

  // generate RSA key from password
  let keys = RSA.generate(password); // generate rsa keypair seeded by password, check keypair
  // let RSAKey = cryptico.generateRSAKey(password, 1024);
  // let publicKeyString = cryptico.publicKeyString(RSAKey);

  // check password
  let pubkey = await getPubKey(address);
  if (pubkey != keys.n) { // if announced in blockchain previously with different cred
    alert('invalid login');
    return false;
  }

  // save info
  thisNode.address = address;
  document.cookie = 'address='+thisNode.address;
  thisNode.privkey = keys.d; // secret!
  document.cookie = 'privkey='+thisNode.privkey;
  thisNode.pubkey = keys.n; // fixed public exp. see rsa.js
  document.cookie = 'pubkey='+thisNode.pubkey;
}
