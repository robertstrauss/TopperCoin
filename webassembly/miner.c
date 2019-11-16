#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <stdint.h>
#include <stdbool.h>
#include "sha-2/sha-256.c"

int ipow(int base, int exp)
{
    int result = 1;
    for (;;)
    {
        if (exp & 1)
            result *= base;
        exp >>= 1;
        if (!exp)
            break;
        base *= base;
    }

    return result;
}

char* mineBlock(const char* block, const unsigned int bdifficulty){
  /*
   bdifficulty = number of zeros needed in front for binary
   ddifficulty = half number of zeros needed in front for hex
   rdiff = for bdifficulties not a multiple of 8: how low the number ddifficulty+1 into the array has to be
          basically a remainder for when bdifficulty is not a int number of bytes
  */
  const unsigned int ddifficulty = bdifficulty/8;
  const unsigned int rdiff = ipow(2, (8 - (bdifficulty%8)));
  strcat(block, ";"); // put semicolon at end of block
  unsigned int nproofofwork = 0; // start proof of work at zero
  char proofofwork[32]; // hex string of proof of work
  uint8_t hash[32]; // hash of mined block
  bool going = 1;
  unsigned int i; //reserve mem once (?idk c)
  unsigned int zcount; // define out here to reserve memory once, not many times (?)
  char minedblock[strlen(block)+strlen(proofofwork)]; // in arguments
  while (going) {
    sprintf(proofofwork, "%x", nproofofwork); // convert proof of work to hex string
    strcpy(minedblock, block); // copy the unmined block into the minedblock
    strcat(minedblock, proofofwork); // add proof of work to end of mined block
    calc_sha_256(hash, minedblock, strlen(minedblock)); // hash to unit8 array of decimal numbers
    // count zeros up to difficulty in hash
    zcount = 0;
    for (i = 0; i < ddifficulty; i++) {
      if (hash[i] == 0) zcount++;
      else break;
    }
    // if the number of zeros matches ddifficulty and the next digit matches the remainder
    if (zcount >= ddifficulty && hash[ddifficulty] < rdiff) going = 0; // stop loop, it is found
    nproofofwork += 1; // increment numeric proof of work
  }
  return proofofwork;
}
