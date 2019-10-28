#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <stdint.h>
#include "sha-2/sha-256.c"

char* mineBlock(char* minedblock, char* block, unsigned int difficulty){
  // make a string of difficulty amount of zeroes
  char *zerostr = malloc(difficulty + 1);
  memset(zerostr, 'a', difficulty);
  zerostr[difficulty] = 0;
  strcat(block, ";"); // put semicolon at end of block
  unsigned int nproofofwork = 0; // start proof of work at zero
  char proofofwork[32]; // hex string of proof of work
  char hash[32]; // hash of mined block
  // char minedblock[strlen(block)+strlen(proofofwork)]; // in arguments
  do {
    nproofofwork += 1; // increment numeric proof of work
    sprintf(proofofwork, "%x", nproofofwork); // convert proof of work to hex string
    strcpy(minedblock, block); // copy the unmined block into the minedblock
    strcat(minedblock, proofofwork); // add proof of work to end of mined block
    calc_sha_256(hash, minedblock, strlen(minedblock));
  } while (strncmp(hash, zerostr, strlen(zerostr) == 0));
  return minedblock;
}
