// socket to communicate with server
const socket = io();

// for getting cookies
// function getCookie(name) {
//   let re = new RegExp(name + "=([^;]+)");
//   let value = re.exec(document.cookie);
//   return (value != null) ? unescape(value[1]) : null;
// }

// object containing info specific to the client's node, stored in cookies
const thisNode  = JSON.parse(localStorage.getItem('nodeinfo') ) || {};
const endblocks = JSON.parse(localStorage.getItem('endblocks')) || {};
// {
//                    pubkey  : localStorage.getItem('pubkey')  || null,
//                    privkey : localStorage.getItem('privkey') || null,
//                    name    : localStorage.getItem('name'   ) || null
//                  };

// how many zeros (bin) block hash must start with
const difficulty = 20; // time ~= 2^difficulty

// initial set up of using the blockchain
let blockchaindb; // global used for accessing blockchain
let request = indexedDB.open('blockchaind20p');
request.onupgradeneeded = function(e) { // called if the user doesn't have a blockchain database yet
  con.log('initializing blockchain database');
  blockchaindb = request.result;

  // create objectstore for the full blockchain
  let bcObjectStore = blockchaindb.createObjectStore('blockchain', { keyPath: 'hash' });
  bcObjectStore.createIndex('prevhash',    'prevhash',    { unique: false });
  bcObjectStore.createIndex('transactions','transactions',{ unique: false });
  bcObjectStore.createIndex('proofofwork', 'proofofwork', { unique: false });
  bcObjectStore.createIndex('length',      'length',      { unique: false });

  con.log('created blockchain object store');

  // genesis block
  const genesis = {hash: 'genesis',
                     prevhash: '', transactions:'>999999999>11001666236737003471863781910704567116068419957597583941839782326558264484999739371681108528684580876407741425804606311794382574832099003290677645902524504542809704507732379121112859411382290288546627771471401350311007839746272894141706841943317302894861593923182245917367911293853069802985807722607401716264230589409586942854651761065403183850480637814329688850499812945013737407353402424189496813931892715089162144387062537145943965377831040752871925007816297760653496620084702709212234424916926301099420702183856942585137076501003584947736344810789854675049699806884822962332811732839895574891447744884403003129583|',
                     proofofwork: '', length: 1};
  bcObjectStore.add(genesis);
  endblocks[genesis.hash] = genesis;
  // delete endblocks[genesis.hash].hash; // redundant property
  localStorage.setItem('endblocks', JSON.stringify(endblocks));
  con.log('database initialization complete');
  /**
   * blockchain will be synced
   * when onsuccess is called after this
   */
}
request.onsuccess = ()=>{
  blockchaindb = request.result;
  resync();
}


function resync () {
  function reqsince(b) {
    if (!b) return; // avoid infinite recursion loop
    // send out request for given block b
    con.log('requesting blockchain since', b.hash);
    socket.emit('request', {type:'sync', content: b.hash});

    // response with status
    socket.on('syncresp', (resp)=>{
      // success
      if (resp === 'success') return socket.off('syncresp'); // kill listener
      // otherwise
      // open blockchain
      const blockchainos = blockchaindb.transaction(['blockchain'], 'readonly').objectStore('blockchain');
      // get the previous block, then request since that.
      blockchainos.get(b.prevhash).onsuccess = e=>reqsince(e.target.result);
    });
  }

  // request the blockchain since each of local endblocks
  // for (let [hash,block] of Object.entries(endblocks))
  reqsince(getLongestBlock());
}



// reply with blockchain when requested
socket.on('syncreq', function(req){
  con.log('blockchain sync request since', req);
  starthash = req.content;
  const blockchainos = blockchaindb.transaction(['blockchain'], 'readonly').objectStore('blockchain');
  prevhash = blockchainos.index('prevhash');
  prevhash.get(starthash).onsuccess = function reresp(e){
    const block = e.target.result;
    if (block) {
      socket.emit('response', {to: req.respondto, type: 'syncresp', content: 'success'});
      con.log('responding with block', block);
      socket.emit('response', {to: req.respondto, type: 'block', content: block.prevhash+';'+block.transactions+';'+block.proofofwork});
      // cursor.continue(block.hash); // do next block(s)
      // have to re open, closed automatically
      // const blockchainos = blockchaindb.transaction(['blockchain'], 'readonly').objectStore('blockchain');
      blockchainos.index('prevhash').get(block.hash).onsuccess = reresp;
    } else {
      socket.emit('response', {to: req.respondto, type: 'syncresp', content: 'notfound'});
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
  const split = blockstring.split(';');
  const newblock = {hash: hash, prevhash: split[0], transactions: split[1], proofofwork: split[2]};

  if (!bhash.startsWith(Array(difficulty+1).join('0'))) {// check if hash of block starts with zeros according to difficulty
    con.log('invalid block (doesn\'t match difficulty)', blockstring);
    return processblockqueue();
  }
  con.log('block matches difficulty');

  // open transaction on blockchain
  const transaction = blockchaindb.transaction(['blockchain'], 'readonly');
  const blockchainos = transaction.objectStore('blockchain'); // full blockchain

  transaction.oncomplete = ()=>processblockqueue();

  /*
  ###################################################
  ## the blockchain is self-organizing because     ##
  ## each block has the hash of the previous block.##
  ## we only need to determine if a block should   ##
  ## be added, not where to put it.                ##
  ###################################################
  */

  // check if we already have the block
  const notalready = blockchainos.get(newblock.hash);
  // get the block this new block extends from
  const findparentblock = blockchainos.get(newblock.prevhash);

  notalready.onsuccess = e=>{
    if (e.target.result) {// already have the block
      con.log('already have block');
      findparentblock.onsuccess = null;
    }
  }

  findparentblock.onsuccess = e => {
    const parentblock = e.target.result
    if (!parentblock) return;

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

          if (endblocks[parentblock.hash])
            delete endblocks[parentblock.hash];
          else
            con.log('fork started');


          blockchaindb.transaction(['blockchain'], 'readwrite').objectStore('blockchain').add(newblock);

          endblocks[newblock.hash] = newblock;
          // delete endblocks[newblock.hash].hash;
          localStorage.setItem('endblocks', JSON.stringify(endblocks));

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
    const senderpk = transaction[0], amount = parseFloat(transaction[1]);
    if (isNaN(amount) || amount < 0) return invalid();
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
function getLongestBlock(callback) {
  let longestblock = {length:0};
  for (let [hash,block] of Object.entries(endblocks)) {
    if (block.length > longestblock.length) longestblock = block;
  }
  return longestblock;
}

/** calculate balance of address */
async function calcBalance(pubkey, callback) {
  let bal = 0;
  // request the blockchain for reading
  blockchainos = blockchaindb.transaction(['blockchain'], 'readonly').objectStore('blockchain');
  let req = blockchainos.get(getLongestBlock().hash); // calculate on the longest fork
  req.onsuccess = function recalc (e) { // iterate through blockchain to find publickey announcement
    const block = e.target.result; // cursor holds current block
    if (block) { // if in the blockchain
      if (block.transactions.indexOf(pubkey) >= 0) { // check for regexp match, and return it if so
        let transactions = block.transactions.split(',');
        for (let t = 0; t < transactions.length; t++) {
          let transaction = transactions[t].split('|')[0].split('>');
          if (transaction[0] === pubkey) bal-=parseFloat(transaction[1]);
          if (transaction[2] === pubkey) bal+=parseFloat(transaction[1]);
        }
      }
      // next block back
      blockchainos.get(block.prevhash).onsuccess = recalc;
    } else {
      callback(bal)
    }
  }
}

async function broadcasttransaction(amount, recipient) {
  let transactionstring = `${thisNode.pubkey}>${amount}>${recipient}`;
  let hashh = await hashHex(transactionstring, 'SHA-256');
  let hashd = bigInt(BigInt(['0x', hashh].join('')));
  let signature = RSA.encrypt(hashd, thisNode.pubkey, thisNode.privkey).toString(); // sign by encrypting with priv key
  socket.emit('transaction', transactionstring + '|' + signature);
  con.log('emit transaction', transactionstring + '|' + signature);
}


function strToBigInt(somestr){
  let encoded = new TextEncoder().encode(somestr);
  let numtxt = '';
  encoded.forEach((n) => numtxt+=n.toString().padStart(3, "0"));
  return bigInt(BigInt(numtxt));
}
