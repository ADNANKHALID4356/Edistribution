const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, 'node_modules');
const bad = [];

function walk(dir, depth) {
  if (depth > 5) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.name === 'package.json' && ent.isFile()) {
      try {
        const json = JSON.parse(fs.readFileSync(full, 'utf8'));
        const v = json.version;
        if (!v || !/^\d/.test(String(v))) bad.push(`${full} :: ${JSON.stringify(v)}`);
      } catch (e) {
        bad.push(`${full} :: PARSE ${e.message}`);
      }
    } else if (ent.isDirectory() && ent.name !== '.bin' && !ent.name.startsWith('.')) {
      if (ent.name === 'node_modules' || depth === 0) walk(full, depth + 1);
      else if (!['test', 'tests', 'docs', 'examples'].includes(ent.name)) walk(full, depth + 1);
    }
  }
}

walk(root, 0);
console.log(bad.slice(0, 50).join('\n') || 'No bad versions found');
console.log('Total:', bad.length);
