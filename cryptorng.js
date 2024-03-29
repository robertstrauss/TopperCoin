/**
 * Generates a string that is the digest of a message in hexadecimal from a given algorithim
 * inspired by https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
 *
 */

async function hashUint8(message, algorithim) {
  const msgUint8 = new TextEncoder().encode(message);                            // encode as (utf-8) Uint8Array
  const hashBuffer = await crypto.subtle.digest(algorithim, msgUint8);           // hash the message
  return Array.from(new Uint8Array(hashBuffer));                      // convert buffer to byte array
}
async function hashHex(message, algorithim) {
  const hashArray = await hashUint8(message, algorithim);
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');  // convert bytes to hex string
  return hashHex;
}
async function hashBin(message, algorithim) {
  const hashArray = await hashUint8(message, algorithim);
  const hashHex = hashArray.map(b => b.toString(2).padStart(8, '0')).join('');  // convert bytes to hex string
  return hashHex;
}

// /**
//  * generates a 1024-bit (crypto-secure) random bigint from a seed
//  * @param   {seed} string seed
//  * @returns {bigDec} BigInt 1024 bit integer, using BigInt web API
//  */
// async function seededBigIntRandom1024(seed) {
//   // use multiple algo's for more security: if one is ever broken, it remains secure
//   // total number of bits (256+512+256) sums to 1024: append them and convert, also just more entropy
//   const hash1 = await hashHex(seed,  'SHA-256');
//   const hash2 = await hashHex(hash1, 'SHA-512');
//   const hash3 = await hashHex(hash2, 'Sha-256');
//   const bigHex = ['0x', hash1, hash2, hash3].join('');
//   const bigDec = BigInt(bigHex); // using BigInt web API
//   return bigDec;
// }

/**
 * Generates a random 1024-bit prime from seed
 *
 * @param   {seed} string, seed of random number
 * @returns {bigInt} a random generated prime
 */
async function seededBigRandomPrime(seed) {
  // return new Promise(async (resolve, reject) => {
    let hash1, hash2, bigDec;
    md = forge.sha512.create();
    md.update(seed);
    hash2 = md.digest().toHex();
    // hash2 = await hashHex(seed, 'SHA-512');
    // const min = bigInt(6074001000).shiftLeft(bits - 33);  // min ≈ √2 × 2^(bits - 1)
    // const max = bigInt.one.shiftLeft(bits).minus(1);  // max = 2^(bits) - 1
    for (;;) {
      hash1 = hash2;
      md = forge.sha512.create();
      md.update(hash1);
      hash2 = md.digest().toHex();
      // hash2 = await hashHex(hash1, 'SHA-512');
      bigDec = bigInt(BigInt('0x'+hash1+hash2)); // using BigInt web API, and bigInteger.js
      if (bigDec.isProbablePrime(256)) {
        // resolve(bigDec);
        // break;
        return bigDec;
      }
    }
  // });
}
