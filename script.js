
function main() {
  previewBlockchain();
  getMyBalance();
  document.getElementById('address').innerHTML = thisNode.name || thisNode.pubkey || "Not Logged In";
  setInterval(previewBlockchain, 3000); // update preview every 3s
  setInterval(resync, 30000); // resync every 30s
}



function previewBlockchain() {
  let transaction  = blockchaindb.transaction(['blockchain', 'endblocks'], 'readonly');
  let blockchainos =  transaction.objectStore('blockchain');
  let endblockos   =  transaction.objectStore('endblocks' );



  // fill the blockchain preview div
  blockchainpreviewdiv = document.createElement('div');//document.getElementById('blockchainpreview');
  let curreq = endblockos.openCursor();
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

        let blockdiv = document.createElement('div'); // create an element for this block
        blockdiv.className = 'blockcontent'; // of class block
        blockdiv.href = '/blockchain/'+block.hash; // that links to a page on the block

        // create individual divs for the previous hash, transactions, and proofofwork of the block
        ['prevhash', 'transactions', 'proofofwork'].forEach(function(key){
          let element = document.createElement('div');
          element.className = key;
          element.innerHTML = block[key].replace(/,/g, '<br>');
          blockdiv.appendChild(element);
        });

        // try to get already existing div for length
        let lengthdiv = document.getElementById(`length${block.length}`) || document.createElement('div');
        lengthdiv.className = 'block';
        lengthdiv.appendChild(blockdiv);
        let ldiv = document.createElement('span'); ldiv.innerHTML = block.length;
        lengthdiv.appendChild(ldiv);
        blockchainpreviewdiv.appendChild(lengthdiv); // add created html block to the preview
        blockchainos.get(block.prevhash).onsuccess = prevFrom; // do all previous blocks
      }; // preview starting from last block
      cursor.continue();
    }
  };
  transaction.oncomplete = () => {
    document.getElementById('blockchainpreview').innerHTML = blockchainpreviewdiv.innerHTML;
  };
}



async function maketransaction() {
  const amount = document.getElementById('amount').value;
  const recip = document.getElementById('recipient').value;
  if (!amount || !recipient) // left a field empty
    return alert('Fill out all fields.');
  if (!thisNode.pubkey) // not logged in
    return alert('You are not logged in.');
  calcBalance(thisNode.pubkey, function(bal){

    if (bal < amount) // not enough balance
      return alert('You do not have enough money to send that much.');

    // all good, send it
    broadcasttransaction(amount, recip);

    // clear fields
    amount.value = '';
    recipient.value = '';
  });
}

/** calculate my balance and put it into DOM */
async function getMyBalance() {
  document.getElementById('tpcbalance').innerHTML = 'Calculating...';
  calcBalance(thisNode.pubkey, function(bal){
    // console.log(bal, !bal);
    if (bal == null) {
      alert('you are not logged in');
      document.getElementById('tpcbalance').innerHTML = '0';
      return false;
    }
    document.getElementById('tpcbalance').innerHTML = bal;
  });
}



async function register() {
  alert('Registering... This may take a minute.');

  const loginkey = document.getElementById('registerloginkey').value;
  if (loginkey.length < 16)
    return alert('A login key should be at absolute minimum 16 charachters long.\
                  This is the only thing between a hacker and all your money!');

  const name = document.getElementById('registername').value;



  let keys = await RSA.generate(loginkey); // generate RSA keypair from loginkey

  // save info
  thisNode.name = name;
  document.cookie = 'name='+thisNode.name.toString();
  thisNode.privkey = bigInt((keys.d)); // keep secret!
  document.cookie = 'privkey='+thisNode.privkey.toString();
  thisNode.pubkey = bigInt((keys.n)); // fixed public exponent e of 65537 (rsa.js)
  document.cookie = 'pubkey='+thisNode.pubkey.toString();

  // TODO tell user to save privkey/pubkey or loginkey ###############################################

  window.location.reload();
}


async function login() {
  alert('Logging in... This may take a minute.'); // asynchronous alert

  // verify password
  let loginkey = document.getElementById('loginkey').value;


  let keys = await RSA.generate(loginkey); // start generation of RSA keypair seeded from password1 (1024 bit, secure, real)

  thisNode.privkey = bigInt((keys.d)); // keep secret!
  document.cookie = 'privkey='+thisNode.privkey.toString();
  thisNode.pubkey = bigInt((keys.n)); // fixed public exponenet of 65537 (see rsa.js), only need n
  document.cookie = 'pubkey='+thisNode.pubkey.toString();

  window.location.reload();
}
