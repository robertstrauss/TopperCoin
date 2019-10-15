var re = new RegExp("tpcaddress=([^;]+)");
var myaddress = re.exec(document.cookie);



function maketransaction() {
  var sendername = document.getElementByName('sendername');
}


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
