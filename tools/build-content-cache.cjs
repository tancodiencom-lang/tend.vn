// Regenerate the offline snapshot after editing the project Markdown files.
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('../assets/js-yaml.min.js');
const root = path.resolve(__dirname, '..');
const sources = JSON.parse(fs.readFileSync(path.join(root, 'data/image-sources.json'), 'utf8'));
const projects = {};
for (const item of sources.projects) {
  const text = fs.readFileSync(path.join(root, item.source), 'utf8').replace(/^\uFEFF/, '');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error('Missing frontmatter: ' + item.source);
  projects[item.key] = { ...yaml.load(match[1], { schema: yaml.JSON_SCHEMA }), body: text.slice(match[0].length).trim() };
}
fs.writeFileSync(path.join(root, 'assets/content-cache.js'),
  '/* Offline snapshot; regenerate with node tools/build-content-cache.cjs */\nwindow.tenDContent = ' +
  JSON.stringify({ sources, projects }, null, 2).replace(/</g, '\\u003c') + ';\n');
console.log('Updated offline content for ' + Object.keys(projects).length + ' projects.');
