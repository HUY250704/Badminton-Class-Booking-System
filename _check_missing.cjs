const fs = require("fs");
const t = fs.readFileSync("frontend/src/utils/i18n.js", "utf8");
const keys = ["heroBadge","searchCoachLocation","classDateFilter","allClasses","pastClasses","upcomingClasses","tbd","updating","page","pagination","previousPage","nextPage"];

// Find VI section
const viStart = t.indexOf("vi: {");
const enStart = t.indexOf("en: {");
const viBlock = t.substring(viStart, enStart);
const enBlock = t.substring(enStart);

keys.forEach(k => {
  const vi = viBlock.includes(k + ":");
  const en = enBlock.includes(k + ":");
  console.log(k + ": VI=" + vi + " EN=" + en);
});
