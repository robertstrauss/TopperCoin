/**
 * Generates a string that is the digest of a message in hexadecimal from a given algorithim
 * https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
 *
 * @param   {message} string, message to take digest of
 * @returns {hashHex} string of hexadecimal digest
 */
async function hashHex(message, algorithim) {
  const msgUint8 = new TextEncoder().encode(message);                            // encode as (utf-8) Uint8Array
  const hashBuffer = await crypto.subtle.digest(algorithim, msgUint8);           // hash the message
  const hashArray = Array.from(new Uint8Array(hashBuffer));                      // convert buffer to byte array
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');  // convert bytes to hex string
  return hashHex;
}

function syncHashHex(message, algorithim) {
  hashHex(message, algorithim).then(hh => return hh);
}

/**
 * generates a 1024-bit (crypto-secure) random bigint from a seed
 * @param   {seed} string seed
 * @returns {bigDec} bigInt 1024 bit integer, using bigInteger.js, not BigInt web API
 */
async function seededBigIntRandom1024(seed) {
  // use multiple algo's for more security: if one is ever broken, it remains secure
  // total number of bits (256+512+256) sums to 1024: append them and convert, also just more entropy
  const hash1 = await hashHex(seed,  'SHA-256');
  const hash2 = await hashHex(hash1, 'SHA-512');
  const hash3 = await hashHex(hash2, 'Sha-256');
  const bigHex = ['0x', hash1, hash2, hash3].join('');
  const bigDec = bigInt(bigHex); // using bigInteger.js, NOT BigInt web API
  return bigDec;
}

/**
 * Generates a random 1024-bit prime from seed
 *
 * @param   {seed} string, seed of random number
 * @returns {bigInt} a random generated prime
 */
async function seededBigRandomPrime(seed) {
  let input = seed; // input to RNG
  // const min = bigInt(6074001000).shiftLeft(bits - 33);  // min ≈ √2 × 2^(bits - 1)
  // const max = bigInt.one.shiftLeft(bits).minus(1);  // max = 2^(bits) - 1
  for (;;) {
    input = await seededBigIntRandom1024(input);
    if (input.isProbablePrime(256)) {
      return input;
    }
  }
}
