import { getFinding, readFindings, setFinding } from "./lib/findings.js";

const [command, key, ...rest] = process.argv.slice(2);

function usage(): never {
  console.error("Usage: npm run finding -- set <key> <value> | get <key> | list");
  process.exit(1);
}

switch (command) {
  case "set": {
    const value = rest.join(" ");
    if (!key || !value) usage();
    setFinding(key, value);
    console.log(`${key} = ${value}`);
    break;
  }
  case "get": {
    if (!key) usage();
    const finding = getFinding(key);
    if (!finding) {
      console.error(`${key} is not set`);
      process.exit(1);
    }
    console.log(finding.value);
    break;
  }
  case "list": {
    const entries = Object.entries(readFindings());
    if (!entries.length) console.log("(no findings yet)");
    for (const [k, f] of entries) console.log(`${k} = ${f.value}  (${f.at})`);
    break;
  }
  default:
    usage();
}
