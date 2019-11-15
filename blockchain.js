// socket to communicate with server
const socket = io();

// for getting cookies
function getCookie(name) {
  let re = new RegExp(name + "=([^;]+)");
  let value = re.exec(document.cookie);
  return (value != null) ? unescape(value[1]) : null;
}

// object containing info specific to the client's node, stored in cookies
const thisNode = {
                   pubkey  : ((getCookie('pubkey'))),
                   privkey : ((getCookie('privkey'))),
                   name    : ((getCookie('name'   )))
                 };

// how many zeros (bin) block hash must start with
const difficulty = 8; // time ~= 2^difficulty

// initial set up of using the blockchain
let blockchaindb; // global used for accessing blockchain
let request = indexedDB.open('blockchain3');
request.onupgradeneeded = function(e) { // called if the user doesn't have a blockchain database yet
  con.log('initializing blockchain database');
  blockchaindb = request.result; // global way of accessing blockchain

  // create objectstore for the full blockchain
  let bcObjectStore = blockchaindb.createObjectStore('blockchain', { keyPath: 'hash' });
  bcObjectStore.createIndex('prevhash',    'prevhash',    { unique: false });
  bcObjectStore.createIndex('transactions','transactions',{ unique: false });
  bcObjectStore.createIndex('proofofwork', 'proofofwork', { unique: false });
  bcObjectStore.createIndex('length',      'length',      { unique: false });

  con.log('created blockchain object store');

  // object store for just the most recent blocks
  let ebObjectStore = blockchaindb.createObjectStore('endblocks', { keyPath: 'hash' });
  ebObjectStore.createIndex('prevhash',    'prevhash',    { unique: false });
  ebObjectStore.createIndex('transactions','transactions',{ unique: false });
  ebObjectStore.createIndex('proofofwork', 'proofofwork', { unique: false });
  ebObjectStore.createIndex('length',      'length',      { unique: false });

  con.log('created endblocks object store');

  // genesis block
  const genesis = {hash: '6fdbb03bb088842ae686afefbe42eb4394d4374d5641d164e62ba22ae369cf26',
                     prevhash: 'genesis', transactions:'>999999999>11001666236737003471863781910704567116068419957597583941839782326558264484999739371681108528684580876407741425804606311794382574832099003290677645902524504542809704507732379121112859411382290288546627771471401350311007839746272894141706841943317302894861593923182245917367911293853069802985807722607401716264230589409586942854651761065403183850480637814329688850499812945013737407353402424189496813931892715089162144387062537145943965377831040752871925007816297760653496620084702709212234424916926301099420702183856942585137076501003584947736344810789854675049699806884822962332811732839895574891447744884403003129583',
                     proofofwork: 'genesis', length: 1};
  bcObjectStore.add(genesis);
  ebObjectStore.add(genesis);
  con.log('database initialization complete');
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
      con.log('requesting blockchain since', cursor.value.hash);
      socket.emit('request', {type:'blockchain', content:`${cursor.value.hash}`});
      cursor.continue();
    }
  };
}



function resync () {
  // open the database to request from the end
  let trans = blockchaindb.transaction(['endblocks'], 'readonly');
  endblockos = trans.objectStore('endblocks');

  // request the blockchain since each of local endblocks
  endblockos.openCursor().onsuccess = function(event){
    cursor = event.target.result;
    if (cursor) {
      // length of local blockchain: event.target.result
      // send a request for the blocks after what we have
      con.log('requesting blockchain since', cursor.value.hash);
      socket.emit('request', {type:'blockchain', content:`${cursor.value.hash}`});
      cursor.continue();
    }
  };
}



// reply with blockchain when requested
socket.on('blockchainrequest', function(req){
  con.log('blockchain request', req);
  starthash = req.content;
  blockchainos = blockchaindb.transaction(['blockchain'], 'readonly').objectStore('blockchain');
  prevhash = blockchainos.index('prevhash');
  prevhash.get(starthash).onsuccess = function respp(e) {
    let block = e.target.result;
    if (block) {
      con.log('responding with block', block);
      socket.emit('response', {to: req.respondto, type: 'block', content: block.prevhash+';'+block.transactions+';'+block.proofofwork});
      prevhash.get(block.hash).onsuccess = respp; // do next block(s)
    }
  };
});



const transactions = [];
// TODO append to unmined list and give on transaction request, remove on block
socket.on('transaction', async function(transactionstring){
  con.log('recieved transaction', transactionstring);
  isValidTransaction(transactionstring).then(function(){
      con.log('added transaction to mine')
      transactions.push(transactionstring);
  }, function(){
    con.log('recieved invalid transaction');
  });
});

let wait;
const blockqueue = [];
// when a block is recieved
socket.on('block', function(blockstring){
  con.log('recieved block', blockstring);
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
  con.log('processing blockqueue');
  blockstring = blockqueue[0];
  blockqueue.splice(0, 1); // remove single (1) index zero (0)
  if (!blockstring) return; // blockqueue is empty


  // check if block matches difficulty
  const hash = await hashHex(blockstring, 'SHA-256'); // take bin sha256 hash of entire block
  const bhash = await hashBin(blockstring, 'SHA-256');
  let split = blockstring.split(';');
  let newblock = {hash: hash, prevhash: split[0], transactions: split[1], proofofwork: split[2]};

  if (!bhash.startsWith(Array(difficulty+1).join('0'))) {// check if hash of block starts with zeros according to difficulty
    con.log('invalid block (doesn\'t match difficulty)', blockstring);
    return processblockqueue();
  }
  con.log('block matches difficulty');

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

  // get the block this new block extends from
  const findparentblock = blockchainos.get(newblock.prevhash);
  findparentblock.onsuccess = e => {
    const parentblock = e.target.result;
    con.log('parentblock', parentblock);
    if (parentblock === null) return;

    // verify each transaction
    const transs = newblock.transactions.split(',');
    if (transs[0].startsWith('>1>')) transs.splice(0,1); // allow miningbonus of one as first transaction
    async function verifynexttrans(t) {
      if (t >= transs.length) return;
      isValidTransaction(transs[t]).then(() => {
        // gone through all, all are valid
        if (t === transs.length-1) {
          // remove pending transactions
          transs.forEach((trans) => {
            // remove transaction if in local list
            if ((ti = transactions.indexOf(trans)) != -1) transactions.splice(ti);
          });

          // add new block to local blockchain
          newblock.length = parentblock.length+1;
          con.log('accepting block', newblock);
          try {
            endblockos.delete(parentblock.hash);
          } catch (e) {
            con.log(e);
            con.log('fork started');
          }
          endblockos.add(newblock);
          blockchainos.add(newblock);

          // restart miner if mining
          if (thisNode.miner != null) {
            thisNode.miner.terminate(); // stop mining
            thisNode.miner = new Worker('minerthread.js'); // open thread
            setTimeout(()=>fromBlock(newblock), 1000); // start mining from longest block after 1000s to get Module ready
          }

          return;
        }
        return verifynexttrans(t+1);
      }, () => {
        con.warn('recieved invalid block (contains invalid transactions)', newblock);
      });
    }
    verifynexttrans(0);
  }
  findparentblock.oncomplete = () => processblockqueue(); // recurse
}



// validate transactions
async function isValidTransaction(transactionstring) {
  return new Promise(async function (valid, invalid) {
    if (transactionstring === '' || transactionstring === null) return valid();
    const split = transactionstring.split('|'); // transaction, signature
    const transaction = split[0].split('>'); // sender, amount, recipient
    const senderpk = transaction[0], amount = transaction[1];
    const hashhHex = await hashHex(split[0], 'SHA-256');
    const hashDec = bigInt(BigInt(['0x', hashhHex].join('')));
    // long asynchronous processes
    calcBalance(senderpk, function(bal){
      const pubkey = bigInt(BigInt(senderpk));
      let sign = RSA.decrypt(bigInt(BigInt(split[1])), RSA.e, pubkey);
      let isvalid = (sign.equals(hashDec) && bal >= transaction[1]); // return the validity
      if (isvalid) return valid();
      else return invalid();
    });
  });
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

/** calculate balance of address */
async function calcBalance(pubkey, callback) {
  let bal = 0;
  // request the blockchain for reading
  blockchainos = blockchaindb.transaction(['blockchain'], 'readonly').objectStore('blockchain');
  let curreq = blockchainos.openCursor();
  curreq.onsuccess = function(e) { // iterate through blockchain to find publickey announcement
    let cursor = e.target.result; // cursor holds current block
    if (cursor) { // if still in the blockchain
      if (cursor.value.transactions.indexOf(pubkey) >= 0) { // check for regexp match, and return it if so
        let transactions = cursor.value.transactions.split(',');
        for (let t = 0; t < transactions.length; t++) {
          let transaction = transactions[t].split('>');
          if (transaction[0] === pubkey) bal-=parseFloat(transaction[1]);
          if (transaction[2] === pubkey) bal+=parseFloat(transaction[1]);
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
  let transactionstring = `${thisNode.pubkey}>${amount}>${recipient}`;
  let hashh = await hashHex(transactionstring, 'SHA-256');
  let hashd = bigInt(BigInt(['0x', hashh].join('')));
  con.log('dechash', hashd);
  let signature = RSA.encrypt(hashd, thisNode.pubkey, thisNode.privkey).toString(); // sign by encrypting with priv key
  con.log('signature', signature);
  con.log('once.emit');
  socket.emit('transaction', transactionstring + '|' + signature);
}


function strToBigInt(somestr){
  let encoded = new TextEncoder().encode(somestr);
  let numtxt = '';
  encoded.forEach((n) => numtxt+=n.toString().padStart(3, "0"));
  return bigInt(BigInt(numtxt));
}
