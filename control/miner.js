const difficulty = 5;

function mineBlock(block) {
  let signature = 0;
  let signedblock = block + "<br>--------<br>" + signature.toString();
  while (!sha256(signedblock).startsWith(new Array(difficulty + 1).join( "0" ))){
    signature += 1;
    signedblock = block + "<br>--------<br>" + signature.toString();
  }
  return signedblock;
}

thing = prompt("enter val: ");
out = mineBlock(thing);
document.body.innerHTML += "<br>mined block:<br>"+out+"<br>hash of signed block: " + sha256(out) + "<br>";
