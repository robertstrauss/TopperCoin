console.log("start");
for (var i = 0; i < 10; i++){
  for (var j = 0; j < 100000; j++){
    sha256(j*i+i);
  }
  console.log(i+"+1 hundreds of thousands of hashes");
}
console.log("done!");
