#include <fstream>
#include <iostream>
#include <sstream>
#include <iomanip>
#include "picosha2.h"
using namespace std;

int difficulty = 4;

// EMSCRIPTEN_KEEPALIVE
string tostr(long n, int length){
  stringstream ss;
  ss << std::setw(length) << std::setfill('0') << n;
  return ss.str();
}


// EMSCRIPTEN_KEEPALIVE
string mineBlock(string unsignedblock){
  unsignedblock = unsignedblock + ";";
  long signature = 0;
  string signedblock = unsignedblock+to_string(signature);
  while (picosha2::hash256_hex_string(signedblock).substr(0, difficulty) != string(difficulty, '0')){
    signature += 1;
    signedblock = unsignedblock+to_string(signature);
  }
  return signedblock;
}

int main() {
  string thing;
  cout << "Input thing to mine: ";
  cin >> thing;
  string out = mineBlock(thing);
  cout << "Mined block:" << endl << out << endl;
  cout << "Hash of mined block:" << picosha2::hash256_hex_string(out) << endl;
  return 0;
}
