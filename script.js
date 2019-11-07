


document.getElementById('address').innerHTML = thisNode.address || "Not Logged In";



function openMiner() {
  // confirm to continue if not logged in
  if (!(thisNode.address || confirm('You are not logged in, so you will not recieve TPC for mining. Continue?'))) return;
  thisNode.miner = window.open('/miner.html', '', 'width=1,height=1');
}

setInterval(previewBlockchain, 3000);

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
    // if(!confirm(`Send ${amount} TPC to ${recipient}?`)) return false; // stop unless they confirm affirmatively
    broadcasttransaction(amount, recipient);
    amount.value = ''; // clear fields
    recipient.value = '';
  });
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
