"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const identityFiles = Object.freeze([
  "views/index.ejs",
  "public/images/brand/matths-logo.svg",
  "public/css/matths-brand-tokens.css",
  "routes/api-routes.js",
  "package-lock.json",
]);

function calculateReleaseFingerprint(base = root) {
  const hash = crypto.createHash("sha256");
  for (const relative of identityFiles) {
    const filename = path.join(base, relative);
    hash.update(`${relative}\0`, "utf8");
    hash.update(fs.readFileSync(filename));
    hash.update("\0", "utf8");
  }
  return hash.digest("hex");
}

const releaseFingerprint = calculateReleaseFingerprint();

module.exports = {
  calculateReleaseFingerprint,
  identityFiles,
  releaseFingerprint,
};
