import { generateKeyPairSync } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";

// Generates an RSA key pair for signing OTA manifests. The private key stays on
// the server; the certificate/public key is embedded in the mobile build so the
// app can verify manifests. Run once: `bun run codesign:generate`.
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

mkdirSync("keys", { recursive: true });
writeFileSync("keys/private-key.pem", privateKey);
writeFileSync("keys/public-key.pem", publicKey);
console.log("Wrote keys/private-key.pem and keys/public-key.pem");
