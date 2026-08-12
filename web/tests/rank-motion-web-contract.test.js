"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative));
const text = (relative) => read(relative).toString("utf8");

const tiers = [
  ["bronze", "v6"],
  ["silver", "v6"],
  ["gold", "v6"],
  ["platinum", "v7"],
  ["emerald", "v6"],
  ["diamond", "v6"],
  ["master", "v6"],
  ["grandmaster", "v6"],
  ["challenger", "v12"],
];

const registry = text("public/js/rank-motion-tiers.js");
const player = text("public/js/matths-rank-motion.js");
const integration = text("public/js/matths-rank-up-integration.js");
const placement = text("public/css/rank-motion.css");
const dialog = text("views/partials/rank-motion-dialog.ejs");
const head = text("views/partials/rank-motion-head.ejs");

for (const [slug, version] of tiers) {
  assert.match(
    registry,
    new RegExp(`\\["${slug}",\\s*"${slug.toUpperCase()}",[^\\n]+"${version}"\\]`),
    `${slug} must remain in the authoritative web registry`,
  );

  const videoPath = `public/media/rank-motion/${slug}-rank-up.${version}.mp4`;
  const posterPath = `public/media/rank-motion/${slug}-rank-up.${version}-poster.webp`;
  const video = read(videoPath);
  const poster = read(posterPath);

  assert.ok(video.length > 1_000_000, `${videoPath} is unexpectedly small`);
  assert.equal(video.subarray(4, 8).toString("ascii"), "ftyp", `${videoPath} is not MP4`);
  assert.ok(poster.length > 32_000, `${posterPath} is unexpectedly small`);
  assert.equal(poster.subarray(0, 4).toString("ascii"), "RIFF", `${posterPath} is not RIFF WebP`);
  assert.equal(poster.subarray(8, 12).toString("ascii"), "WEBP", `${posterPath} is not WebP`);
}

assert.match(player, /object-fit:\s*contain/, "foreground video must never crop a tier crest");
assert.match(player, /:host\(\[mode="viewport"\]\) \.shell[\s\S]*100dvh/);
assert.match(player, /:host\(\[mode="fill"\]\)[\s\S]*min-block-size:\s*0/);
assert.match(player, /:host\(\[mode="modal"\]\)[\s\S]*90dvh/);
assert.match(player, /prefers-reduced-motion:\s*reduce/);
assert.match(player, /this\._motionPreference\.matches/);
assert.match(player, /playsinline/);
assert.match(player, /rankmotionerror/);
assert.match(player, /customElements\.define\("matths-rank-motion"/);

assert.match(placement, /env\(safe-area-inset-top\)/);
assert.match(placement, /env\(safe-area-inset-bottom\)/);
assert.match(placement, /@media \(orientation:\s*landscape\)/);
assert.match(dialog, /data-rank-motion-dialog/);
assert.match(dialog, /data-rank-motion-close/);
assert.match(dialog, /preload="none"/);
assert.match(head, /matths-rank-motion\.js/);
assert.match(head, /matths-rank-up-integration\.js/);
assert.match(integration, /prefers-reduced-motion:\s*reduce/);
assert.match(integration, /missing-or-invalid-presentation-id/);
assert.match(integration, /already-presented-in-session/);

console.log("Rank motion web contract passed (9 tiers, responsive player, reduced motion, media integrity)");
