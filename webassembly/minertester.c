#include "miner.c"

int main() {
  char minedblock[37];
  mineBlock(minedblock, "yeet", 2);
  printf(minedblock);
  return 0;
}
