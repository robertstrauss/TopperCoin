#include <fstream>
#include <sstream>
#include <vector>
// #include <emscripten.h>
using namespace std;

// function for splitting string on delimiter
// EMSCRIPTEN_KEEPALIVE


vector<string> split(const string& s, char delimiter)
{
   vector<string> tokens;
   string token;
   istringstream tokenStream(s);
   while (getline(tokenStream, token, delimiter))
   {
      tokens.push_back(token);
   }
   return tokens;
}

double yeet(int a, int b) {
  return a+b;
}

// calculate the balance of an adress summing over the blockchain
// EMSCRIPTEN_KEEPALIVE


double calcBalance(string address, vector<string> blockchain) {
  double balance = 0.0;
  for (int i = 0; i < blockchain.size(); i+=1){ // loop over blocks
    if (blockchain[i].find(address) != string::npos){ // check if this address is even in this block
      vector<string> transactions = split(split(blockchain[i],';')[1],','); // vector of the transactions in the block
      for (int j = 0; j < transactions.size(); j+=1){ // loop over transactions
        vector<string> transaction = split(split(transactions[j],'|')[0],'>'); // split off signature, then split to vector of address, amount, address
        if (transaction[0] == address) { // if the relevant address is the sender
          balance -= ::atof(transaction[1].c_str()); // subtract amount from balance
        } else if (transaction[2] == address) { // if relevant address is the recipient
          balance += ::atof(transaction[1].c_str()); // add amount to balance
        }
      }
    }
  }
  return balance;
}


//
// int main() {
//   return 0;
// }
