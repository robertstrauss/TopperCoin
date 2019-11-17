const names = JSON.parse(localStorage.getItem('names')) || {};

// introduce self
socket.emit('hello', {name: thisNode.name, pubkey: thisNode.pubkey})
socket.emit('olleh'); // greet other nodes

// intervals
setInterval(previewBlockchain, 5000); // update preview every 5s
setInterval(resync, 30000); // resync every 30s


// things that need async event to finish or for body load (0.5s delay after body onload)
function main() {
  previewBlockchain();
  getMyBalance();
  searchnames();

  // html display
  document.getElementById('displayname').value       = thisNode.name || '';
  document.getElementById('publickeydiv').innerHTML  = thisNode.pubkey || '';
  document.getElementById('privatekeydiv').innerHTML = thisNode.privkey || '';
  document.getElementById('loginkeydiv').innerHTML   = thisNode.loginkey || '';
  document.getElementById('address').innerHTML       = thisNode.name || thisNode.pubkey || 'Not Logged In';
  thisNode.pubkey && (document.getElementById('addresstab').onclick = ()=>{document.getElementById('wallet').style.display = 'inline-block'});
}

// listeners for communicating names
socket.on('hello', function(data){
  names[data.pubkey] = data.name;
  localStorage.setItem('names', JSON.stringify(names));
});
socket.on('olleh', function(respondto){
  thisNode.pubkey && socket.emit('hello', {to:respondto, pubkey: thisNode.pubkey, name: thisNode.name});
});


function searchnames() {
  // const namequery = document.getElementById('namequery').value;
  const searchresults = document.getElementById('names');
  searchresults.innerHTML = '';
  for (var pk in names) {
    if (Object.prototype.hasOwnProperty.call(names, pk)) {
      // if(localStorage[pk].includes(namequery) || pk.includes(namequery))
        searchresults.innerHTML += `<option value="${pk}">${names[pk]}</option>`;
    }
  }
}

function previewBlockchain() {
  const transaction = blockchaindb.transaction(['blockchain'], 'readonly');
  const blockchainos = transaction.objectStore('blockchain');

  const preview = document.createElement('div');

  // fill the blockchain preview div
  for (let [hash, block] of Object.entries(endblocks)){
    let count = 0;
    blockchainos.get(hash).onsuccess = function reprev(e) {
      const bblock = e.target.result;
      if (!bblock || count++ > 16) return;
        // let bblock = cursor.value;
        const div = document.createElement('div');
        div.innerHTML += `<div class="blockcontent">${bblock.hash}<div class="transactions">
                          ${bblock.transactions.replace(/([^>]*)>([^>]+)>([^|]*)\|[^,]*,?/g,
                                (whole, s,a,r)=>(names[s]||s)+" gave "+a+" TPC to "+(names[r]||r)+"<br>")}
                          </div></div>`;
        // if ((lengthdiv = document.getElementById(`length${bblock.length}`)) != null) {
        //   lengthdiv.innerHTML += div.innerHTML;
        // } else {
        div.id = `length${bblock.length}`;
        div.className = 'lengthdiv';
        preview.appendChild(div);
        // }
        // const transaction = blockchaindb.transaction(['blockchain'], 'readonly');
        // const blockchainos = transaction.objectStore('blockchain');
        // cursor.continue(bblock.prevhash);
        blockchainos.get(bblock.prevhash).onsuccess = reprev;
    }
  }
  transaction.oncomplete = () => {
    document.getElementById('blockchainpreview').innerHTML = preview.innerHTML;
  };
}



async function maketransaction() {
  const amount = document.getElementById('amount').value;
  const recip  = document.getElementById('recipient').value;
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
    document.getElementById('amount').value = '';
    document.getElementById('recipient').value = '';
  });
}

/** calculate my balance and put it into DOM */
async function getMyBalance() {
  document.getElementById('tpcbalance').innerHTML = 'Calculating...';
  calcBalance(thisNode.pubkey, function(bal){
    // con.log(bal, !bal);
    if (bal == null) {
      alert('you are not logged in');
      document.getElementById('tpcbalance').innerHTML = '0';
      return false;
    }
    document.getElementById('tpcbalance').innerHTML = bal;
  });
}



async function register() {
  const loginkey = document.getElementById('registerloginkey').value;
  if (loginkey.length < 20)
    return alert('A login key should be at absolute minimum 20 charachters long. '
                  +'This is the only thing between a hacker and all your money!');

  const name = document.getElementById('registername').value;

  alert('Registering... This may take a minute.');
  let keys = await RSA.generate(loginkey); // generate RSA keypair from loginkey

  // save info
  thisNode.name    = name;
  thisNode.privkey = bigInt((keys.d)); // keep secret!
  thisNode.pubkey  = bigInt((keys.n)); // fixed public exponent e of 65537 (rsa.js)
  thisNode.loginkey= loginkey;
  localStorage.setItem('nodeinfo', JSON.stringify(thisNode));

  // alert(`Make sure to save this key.\n--------\n${loginkey}\n--------\nIt\'s the only way to access your money!`);

  window.location.reload();
}


async function login() {
  alert('Logging in... This may take a minute.'); // asynchronous alert

  // verify password
  let loginkey = document.getElementById('loginkey').value;


  let keys = await RSA.generate(loginkey); // start generation of RSA keypair seeded from password1 (1024 bit, secure, real)

  thisNode.privkey = bigInt((keys.d)); // keep secret!
  thisNode.pubkey  = bigInt((keys.n)); // fixed public exponenet of 65537 (see rsa.js), only need n
  thisNode.loginkey= loginkey;
  localStorage.setItem('nodeinfo', JSON.stringify(thisNode));

  window.location.reload();
}
