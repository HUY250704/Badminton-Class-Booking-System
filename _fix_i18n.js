const { execSync } = require("child_process");
const fs = require("fs");

// Get raw binary from git show
const raw = execSync("git show HEAD:frontend/src/utils/i18n.js", { encoding: "buffer" });

// The file is double-encoded: UTF-8 bytes misinterpreted as Latin-1 then re-encoded as UTF-8
// To fix: decode to string, then for each char, if its code < 256, that"s the original byte
const str = raw.toString("utf8");
const bytes = [];
for (let i = 0; i < str.length; i++) {
  const c = str.charCodeAt(i);
  if (c <= 0xFF) {
    bytes.push(c);
  }
}
const fixed = Buffer.from(bytes).toString("utf8");
fs.writeFileSync("frontend/src/utils/i18n.js", fixed, "utf8");

console.log(fixed.split("\n").slice(5, 8).join("\n"));