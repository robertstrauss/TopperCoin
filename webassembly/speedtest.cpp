#include <fstream>
#include <iostream>
#include <sstream>
#include <iomanip>
#include "picosha2.h"
using namespace std;

int main() {
  for (int i = 0; i < 10; i+=1){
    for (int j = 0; j < 100000; j+=1){
      picosha2::hash256_hex_string(to_string(j*i+i));
    }
    cout << i << "+1 hundreds of thousands of hashes" << endl;
  }
  cout << "done!" << endl;
  return 0;
}
