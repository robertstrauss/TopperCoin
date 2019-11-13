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
                 };

// how many zeros (bin) block hash must start with
const difficulty = 22; // time ~= 2^difficulty
// the furthest number of blocks back a fork can be started
const maxbackfork = 20;




// initial set up of using the blockchain
let blockchaindb; // global used for accessing blockchain
let request = indexedDB.open('blockchain3');
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
  const genesis = {hash: '5410d1f90c3e3e4d251d782fff69250cb1cb63c136e42dac916691816873316f',
                     prevhash: 'genesis', transactions:'>999999999>strobert',
                     proofofwork: 'genesis', length: 1};
  bcObjectStore.add(genesis);
  ebObjectStore.add(genesis);
  console.log('database initialization complete');
  /**
   * blockchain will be synced
   * when onsuccess is called after this
   */
}
request.onsuccess = ()=>{
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
      socket.emit('topeers', {type:'sincereq', content:cursor.value.hash});
      cursor.continue();
    }
  };
  // trans.oncomplete = (() => previewBlockchain());
}

// reply with blockchain when requested
socket.on('sincereq', function(req){
  // request of the blockchain since a point
  let starthash = req.content, sender = req.from;
  blockchainos = blockchaindb.transaction(['blockchain'], 'readonly').objectStore('blockchain');
  prevhash = blockchainos.index('prevhash');
  function getsendnext(hash) {
    // get the block(?s) after hash
    prevhash.get(hash).onsuccess = (e) => {
      // send them back
      socket.emit('message', {to: sender, type: 'block', content: e.target.result});
      getsendnext(e.target.result);
    };
  }
  getsendnext(starthash);
});



const transactions = [];
// TODO append to unmined list and give on transaction request, remove on block
socket.on('transaction', async function(transactionstring){
  console.log('recieved transaction', transactionstring);
  isValidTransaction(transactionstring).then(function(){
      console.log('added transaction to mine')
      transactions.push(transactionstring);
  }, function(){
    console.log('recieved invalid transaction');
  });
});

let wait;
const blockqueue = [];
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
  wait = setTimeout(processblockqueue, 50); // wait 50 milliseconds then process queue, unless interrupted by another block coming in
});

/**
 * go through list blockqueue[] and add valid blocks to blockchain
 */
async function processblockqueue() {
  // new Promise(async (resolve, reject) => {
    blockstring = blockqueue[0];
    blockqueue.splice(0, 1); // remove single (1) index zero (0)
    console.log('processing blockqueue');
    if (!blockstring) return; // blockqueue is empty

    const hash = await hashHex(blockstring, 'SHA-256'); // take bin sha256 hash of entire block
    const bhash = await hashBin(blockstring, 'SHA-256');
    let split = blockstring.split(';');
    let newblock = {hash: hash, prevhash: split[0], transactions: split[1], proofofwork: split[2]};


    if (!bhash.startsWith(Array(difficulty+1).join('0'))) {// check if hash of block starts with zeros according to difficulty
      console.log('invalid block (doesn\'t match difficulty)', blockstring);
      return processblockqueue();
    }

    let valid = true;
    (async function validateNext(t) {
      let trans = newblock.transactions[t];
      isValidTransaction(trans).then(()=>{
        validateNext(t+1);
      }, () => valid=false);
    })(0);
    if (!valid) {return processblockqueue();} // abort here, this block is invalid

    // get the blockchain and endblocks ready to read from and write to
    const transaction = blockchaindb.transaction(['blockchain', 'endblocks'], 'readwrite');
    const blockchainos = transaction.objectStore('blockchain'); // full blockchain
    const endblockos = transaction.objectStore('endblocks') // the most recent blocks

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
    cursorreq.onsuccess = (e) => {

      let cursor = e.target.result;
      if (cursor) {
        let endblock = cursor.value;
        // check if the new block extends an endblock directly
        if (newblock.prevhash === endblock.hash) {
          newblock.length = endblock.length+1; // one farther in the blockchain
          // console.log('accepting block ', newblock);
          endblockos.delete(endblock.hash); // end block is no longer end block
          // endblockos.add(newblock); // new block is
        }
        // check if the new block extends any block within the last <maxbackfork> blocks, starting a new fork.
        for (let backcount=0, lastblock=endblock; backcount < maxbackfork; backcount++) {
          blockchainos.get(lastblock.prevhash).onsuccess = (e) => {
            if (newblock.prevhash === lastblock.hash) {
              newblock.length = lastblock.length+1;
              console.log('accepting block ', newblock);
              endblockos.add(newblock);
              blockchainos.add(newblock); // add new block to blockchain
              // blockchainos.getAll().onsuccess = e => console.log(e.target.result);
              transaction.commit();
              cursor = null; // stop cursor

              for (let t = 0; t < newblock.transactions.length; t++){
                let trans = newblock.transactions.split(',')[t];
                // remove this transaction from list of unmined transactions
                console.log('transaction in block', trans);
                console.log('transactions waiting', transactions);
                let i = transactions.indexOf(trans);
                console.log('index', i);
                if (i != -1) transactions.splice(i, 1);
              }

              if (thisNode.miner != null) {
                thisNode.miner.terminate(); // stop mining
                thisNode.miner = new Worker('minerthread.js'); // open thread
                setTimeout(()=>fromBlock(newblock), 1000); // start mining from longest block after 1000s to get Module ready
              }
              // blockchainos.count().onsuccess = console.log;
              // let bblockchainos = blockchaindb.transaction(['blockchain'], 'readonly').objectStore('blockchain');
              // bblockchainos.getAll().onsuccess = console.log;
            }
            try{
              lastblock = e.target.result.value;
            } catch (TypeError) {console.warn('no previous block'); return;}
          };
        }
        cursor.continue();
      }
    };

    cursorreq.oncomplete = processblockqueue; //recurse
}



// validate transactions
async function isValidTransaction(transactionstring) {
  let isvalid = false;
  let prom = new Promise(async function (valid, invalid) {

    const split = transactionstring.split('|'); // transaction, signature
    const transaction = split[0].split('>'); // sender, amount, recipient
    const sender = transaction[0], amount = transaction[1];
    const hashhHex = await hashHex(split[0], 'SHA-256');
    const hashDec = bigInt(BigInt(['0x', hashhHex].join('')));
    // two long asynchronous processes: start both with promises before awaiting
    getPubKey(sender, (pubkeystr)=>{
      calcBalance(sender, async function(bal){
        if (!pubkeystr) { // user not yet registered
          try{
            pubkeystr = transaction[2].substring(13); // 13 = length of 'mypublickeyis'
          } catch (TypeError) {
            return invalid();
          }
        }
        const pubkey = bigInt(BigInt(pubkeystr));
        let sign = RSA.decrypt(bigInt(BigInt(split[1])), RSA.e, pubkey);
        let isvalid = (sign.equals(hashDec) && bal >= transaction[1]); // return the validity
        if (isvalid) return valid();
        else return invalid();
      });
    });
  });
  return prom;
}








// determine the block that is farthest in the blockchain
async function getLongestBlock(callback) {
  let blockstring = '';
  let endblockos  = blockchaindb.transaction(['endblocks'], 'readonly').objectStore('endblocks');
  let longestblock= {length:0};
  endblockos.openCursor().onsuccess = function(e) {
    // iterate through enblocks to find "longest" - one with most behind it
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

async function getPubKey(address, callback) { // get the public key of an address in the blockchain
  // make regexp for finding publickey
  let re = new RegExp(address+'>0>mypublickeyis([a-zA-Z0-9]+)');
  // request the blockchain for reading
  const trans = blockchaindb.transaction(['blockchain'], 'readonly');
  const blockchainos = trans.objectStore('blockchain');
  let pubkey = null;
  blockchainos.openCursor().onsuccess = function(e) { // iterate through blockchain to find publickey announcement
    let cursor = e.target.result; // cursor holds current block
    if (cursor) { // if still in the blockchain
      if ((pk = re.exec(cursor.value.transactions)) != null) { // check for regexp match, and return it if so
        pubkey = pk[1]
        return; // stop
      }
      // advance to next block
      cursor.continue();
    }
  }
  trans.oncomplete = ()=>callback(pubkey);
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
  let hashh = await hashHex(transactionstring, 'SHA-256');
  let hashd = bigInt(BigInt(['0x', hashh].join('')));
  console.log('dechash', hashd);
  let signature = RSA.encrypt(hashd, thisNode.pubkey, thisNode.privkey).toString(); // sign by encrypting with priv key
  console.log('signature', signature);
  console.log('once.emit');
  socket.emit('transaction', transactionstring + '|' + signature);
}


function strToBigInt(somestr){
  let encoded = new TextEncoder().encode(somestr);
  let numtxt = '';
  encoded.forEach((n) => numtxt+=n.toString().padStart(3, "0"));
  return bigInt(BigInt(numtxt));
}
