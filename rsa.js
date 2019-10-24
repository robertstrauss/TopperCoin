'use strict';

/**
 * RSA hash function reference implementation.
 * Uses BigInteger.js https://github.com/peterolson/BigInteger.js
 * Code originally based on https://github.com/kubrickology/Bitcoin-explained/blob/master/RSA.js
 */
const RSA = {};

/**
 * Generates a 1024-bit RSA public/private key pair
 * based on https://en.wikipedia.org/wiki/RSA_(cryptosystem)#Code
 *
 * @param   {seed} string, seed to random number; gives reproducability
 * @returns {array} Result of RSA generation (object with three bigInt members: n, e, d)
 */
RSA.generate = async function(seed) { // uses RNG functions from cryptorng.js
  let seed2 = await hashHex(seed, 'SHA-1'); // multiple seeded primes are needed, only one seed.
  // set up variables for key generation
  const e = bigInt(65537);  // use fixed public exponent
  let p;
  let q;
  let lambda;

  // generate p and q such that λ(n) = lcm(p − 1, q − 1) is coprime with e and |p-q| >= 2^(keysize/2 - 100)
  do {
    p = await seededBigRandomPrime(seed);
    q = await seededBigRandomPrime(seed2);
    lambda = p.minus(1).times(q.minus(1)); //bigInt.lcm(p.minus(1), q.minus(1)); only ned product not lcm because p&q are prime
  } while (bigInt.gcd(e, lambda).notEquals(1) || p.minus(q).abs().shiftRight(
      1024 / 2 - 100).isZero());

  return {
    n: p.multiply(q),  // public key (part I)
    e: e,  // public key (part II)
    d: e.modInv(lambda),  // private key d = e^(-1) mod λ(n)
  };
};

/**
 * Encrypt
 *
 * @param   {m} int / bigInt: the 'message' to be encoded
 * @param   {n} int / bigInt: n value returned from RSA.generate() aka public key (part I)
 * @param   {e} int / bigInt: e value returned from RSA.generate() aka public key (part II)
 * @returns {bigInt} encrypted message
 */
RSA.encrypt = function(m, n, e) {
  return bigInt(m).modPow(e, n);
};

/**
 * Decrypt
 *
 * @param   {c} int / bigInt: the 'message' to be decoded (encoded with RSA.encrypt())
 * @param   {d} int / bigInt: d value returned from RSA.generate() aka private key
 * @param   {n} int / bigInt: n value returned from RSA.generate() aka public key (part I)
 * @returns {bigInt} decrypted message
 */
RSA.decrypt = function(c, d, n) {
  return bigInt(c).modPow(d, n);
};
