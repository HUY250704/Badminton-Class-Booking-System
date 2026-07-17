const fs = require("fs");

let t = fs.readFileSync("frontend/src/utils/i18n.js", "utf8");
const lines = t.split("\n");

// Find positions in VI and EN sections
const viStart = lines.findIndex(l => l.includes("vi:"));
const enStart = lines.findIndex(l => l.includes("en:"));

// Keys to add in VI (insert near start of vi section, after recentlyInserted)
const viKeys = [
  "    classDateFilter: 'Bộ lọc ngày',",
  "    allClasses: 'Tất cả',",
  "    pastClasses: 'Đã qua',",
  "    page: 'Trang',",
  "    pagination: 'Phân trang',",
  "    previousPage: 'Trang trước',",
  "    nextPage: 'Trang sau',",
];

// Find a good insertion point near similar keys (after upcomingClasses)
let viInsertAfter = -1;
for (let i = viStart; i < enStart; i++) {
  if (lines[i].includes("upcomingClasses:")) { viInsertAfter = i + 1; break; }
}
if (viInsertAfter > 0) {
  lines.splice(viInsertAfter, 0, ...viKeys);
  console.log("Inserted", viKeys.length, "VI keys after line", viInsertAfter+1);
}

// Keys to add in EN
const enKeys = [
  "    classDateFilter: 'Class date filter',",
  "    allClasses: 'All classes',",
  "    pastClasses: 'Past classes',",
  "    page: 'Page',",
  "    pagination: 'Pagination',",
  "    previousPage: 'Previous page',",
  "    nextPage: 'Next page',",
];

// Find upcomingClasses in EN section
let enInsertAfter = -1;
for (let i = enStart; i < lines.length; i++) {
  if (lines[i].includes("upcomingClasses:")) { enInsertAfter = i + 1; break; }
}
if (enInsertAfter > 0) {
  lines.splice(enInsertAfter, 0, ...enKeys);
  console.log("Inserted", enKeys.length, "EN keys after line", enInsertAfter+1);
}

fs.writeFileSync("frontend/src/utils/i18n.js", lines.join("\n"), "utf8");

// Verify
const out = fs.readFileSync("frontend/src/utils/i18n.js", "utf8");
const keys = ["classDateFilter","allClasses","pastClasses","page","pagination","previousPage","nextPage"];
const viIdx = out.indexOf("vi:");
const enIdx = out.indexOf("en:");
keys.forEach(k => {
  const vi = out.substring(viIdx, enIdx).includes(k + ":");
  const en = out.substring(enIdx).includes(k + ":");
  console.log(k + ": VI=" + vi + " EN=" + en);
});
