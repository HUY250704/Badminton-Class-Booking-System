const fs = require("fs");
const t = fs.readFileSync("frontend/src/utils/i18n.js", "utf8");
const lines = t.split("\n");
const viStart = lines.findIndex(l => l.includes("vi:"));
const enStart = lines.findIndex(l => l.includes("en:"));

console.log("viStart:", viStart, "enStart:", enStart);

// Check if upcomingClasses exists in VI section
for (let i = viStart; i < Math.min(viStart + 80, enStart); i++) {
  if (lines[i].includes("upcoming")) console.log("VI L" + (i+1) + ":", lines[i]);
}

// Check near EN section
for (let i = enStart; i < Math.min(enStart + 30, lines.length); i++) {
  if (lines[i].includes("upcoming")) console.log("EN L" + (i+1) + ":", lines[i]);
}
