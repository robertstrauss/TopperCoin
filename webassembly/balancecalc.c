#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>

// char** str_split(char* a_str, const char a_delim)
// {
//   char** result    = 0;
//   size_t count     = 0;
//   char* tmp        = a_str;
//   char* last_comma = 0;
//   char delim[2];
//   delim[0] = a_delim;
//   delim[1] = 0;
//
//   /* Count how many elements will be extracted. */
//   while (*tmp)
//   {
//     if (a_delim == *tmp)
//     {
//       count++;
//       last_comma = tmp;
//     }
//     tmp++;
//   }
//
//   /* Add space for trailing token. */
//   count += last_comma < (a_str + strlen(a_str) - 1);
//
//   /* Add space for terminating null string so caller
//      knows where the list of returned strings ends. */
//   count++;
//
//   result = malloc(sizeof(char*) * count);
//
//   if (result)
//   {
//     size_t idx  = 0;
//     char* token = strtok(a_str, delim);
//
//     while (token)
//     {
//       assert(idx < count);
//       *(result + idx++) = strdup(token);
//       token = strtok(0, delim);
//     }
//     assert(idx == count - 1);
//     *(result + idx) = 0;
//   }
//
//   return result;
// }

// calculate the balance of an adress summing over the blockchain
// double calcBalance(char* address, char** blockchain)
// {
//   double balance = 0.0;
//   for (int i = 0; i < sizeof(blockchain); i+=1){ // loop over blocks
//     if (strstr(blockchain[i], address) != NULL){ // check if this address is even in this block
//       char** transactions = str_split(str_split(blockchain[i],';')[1],','); // vector of the transactions in the block
//       for (int j = 0; j < sizeof(transactions); j+=1){ // loop over transactions
//         char** transaction = str_split(str_split(transactions[j],'|')[0],'>'); // split off signature, then split to vector of address, amount, address
//         if (transaction[0] == address) { // if the relevant address is the sender
//           balance -= atof(transaction[1]); // subtract amount from balance
//         } else if (transaction[2] == address) { // if relevant address is the recipient
//           balance += atof(transaction[1]); // add amount to balance
//         }
//       }
//     }
//   }
//   return balance;
// }










// calculate the balance of an adress summing over the blockchain
double calcBalance(char* address, char** blockchain)
{
  double balance = 0.0;
  for (int i = 0; i < sizeof(blockchain); i+=1){ // loop over blocks
    if (strstr(blockchain[i], address) != NULL){ // check if this address is even in this block

      strtok(blockchain[i], ';')
      char *transactions = strtok(NULL, ';');

      char *transaction = strtok(transactions, ',');

      while (transaction != NULL) { // loop over transactions

        if (transaction[0] == address) { // if the relevant address is the sender
          balance -= atof(transaction[1]); // subtract amount from balance
        } else if (transaction[2] == address) { // if relevant address is the recipient
          balance += atof(transaction[1]); // add amount to balance
        }
        transaction = strtok(NULL, ';');
      }



    }
  }
  return balance;
}












int main() {
  // char months[] = "JAN,FEB,MAR,APR,MAY,JUN,JUL,AUG,SEP,OCT,NOV,DEC";
  // char** tokens;
  //
  // printf("months=[%s]\n\n", months);
  //
  // tokens = str_split(months, ',');
  //
  // if (tokens)
  // {
  //   int i;
  //   for (i = 0; *(tokens + i); i++)
  //   {
  //     printf("month=[%s]\n", *(tokens + i));
  //     free(*(tokens + i));
  //   }
  //   printf("\n");
  //   free(tokens);
  // }

  return 0;
}
