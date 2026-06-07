// Jest auto-mock for expo-crypto (its native module isn't available under Jest,
// and it ships untranspiled ESM that Jest's transformIgnorePatterns excludes).
// Provides a working getRandomBytes so ulid() / the todo store are testable.
module.exports = {
  getRandomBytes: (byteCount) => {
    const bytes = new Uint8Array(byteCount);
    for (let i = 0; i < byteCount; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    return bytes;
  },
};
