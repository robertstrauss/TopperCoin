var blockchain;

var req = new XMLHttpRequest();
req.onreadystatechange = function() {
  if (req.readyState == 4 && req.status == 200)
    blockchain = req.responseText.split('\n');
}
req.open('GET', '/TopperCoin/blockchain.txt', true); // true for asynchronous 
req.send(null);

var re = new RegExp('tpcaddress=([^;]+)');
var myaddress = re.exec(document.cookie);

// function getPubKeyAndMod(address) {
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
