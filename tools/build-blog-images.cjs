// Synchronize article images from Markdown into the static/offline website.
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('../assets/js-yaml.min.js');
const root = path.resolve(__dirname, '..');
const sources = JSON.parse(fs.readFileSync(path.join(root, 'data/image-sources.json'), 'utf8')).blogs;
const htmlPath = path.join(root, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');
const escape = value => String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const plain = text => text.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();

function dimensions(image) {
  if (/^https:\/\//.test(image)) return { width: 1600, height: 900 };
  const relative = image.replace(/^\//, '');
  const file = path.resolve(root, relative);
  if (!file.startsWith(path.join(root, 'images') + path.sep)) throw new Error('Invalid image path: ' + image);
  const buffer = fs.readFileSync(file);
  if (buffer.readUInt32BE(0) === 0x89504e47) return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  if (buffer.readUInt16BE(0) !== 0xffd8) throw new Error('Unsupported photo: ' + image);
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset++] !== 0xff) continue;
    const marker = buffer[offset++];
    if (marker === 0xff || marker === 0x00) continue;
    const size = buffer.readUInt16BE(offset);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { height: buffer.readUInt16BE(offset + 3), width: buffer.readUInt16BE(offset + 5) };
    }
    if (size < 2) break;
    offset += size;
  }
  throw new Error('Could not read photo dimensions: ' + image);
}

let count = 0;
for (const source of sources) {
  const markdown = fs.readFileSync(path.join(root, source.source), 'utf8');
  const frontmatter = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter) throw new Error('Missing frontmatter: ' + source.source);
  const data = yaml.load(frontmatter[1], { schema: yaml.JSON_SCHEMA });
  if (!Array.isArray(data.illustrations)) continue;
  const start = html.indexOf('<div id="article-' + source.id + '" class="article-page">');
  if (start < 0) throw new Error('Missing article: ' + source.id);
  const next = html.indexOf('<div id="article-', start + 10);
  const end = next < 0 ? html.indexOf('</div><!-- end page-blog -->', start) : next;
  if (end < 0) throw new Error('Missing blog wrapper');
  let block = html.slice(start, end);
  block = block.replace(/<!-- blog-illustration:start -->[\s\S]*?<!-- blog-illustration:end -->/g, '');
  block = block.replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/g, figure => /data-blog-inline=|data-blog-illustration=/.test(figure) ? '' : figure);
  data.illustrations.forEach((item, index) => {
    const image = String(item.image).replace(/^\//, '');
    const size = dimensions(item.image);
    const key = item.key || 'image-' + (index + 1);
    const figure = '<!-- blog-illustration:start -->\n' +
      '<figure class="article-photo blog-illustration" data-after-heading="' + escape(item.after_heading) + '">' +
      '<img src="' + escape(image) + '" alt="' + escape(item.alt || item.caption) + '" width="' + size.width + '" height="' + size.height +
      '" loading="lazy" decoding="async" data-blog-illustration="' + escape(source.id + ':' + key) + '"' +
      (index === 0 ? ' data-blog-inline="' + escape(source.id) + '"' : '') + '>' +
      '<figcaption>' + escape(item.caption || item.alt) + '</figcaption></figure>\n<!-- blog-illustration:end -->';
    let inserted = false;
    block = block.replace(/<h([23])\b[^>]*>([\s\S]*?)<\/h\1>/g, (heading, level, text) => {
      if (!inserted && plain(text) === item.after_heading) { inserted = true; return heading + figure; }
      return heading;
    });
    if (!inserted) throw new Error('Missing heading in ' + source.id + ': ' + item.after_heading);
    count++;
  });
  html = html.slice(0, start) + block + html.slice(end);
  if (data.thumbnail) {
    const size = dimensions(data.thumbnail);
    const coverPattern = new RegExp('<img\\b[^>]*data-blog-cover="' + source.id + '"[^>]*>', 'g');
    html = html.replace(coverPattern, tag => {
      tag = tag.replace(/\s(?:src|width|height)="[^"]*"/g, '');
      return tag.replace('<img', '<img src="' + escape(data.thumbnail.replace(/^\//, '')) + '" width="' + size.width + '" height="' + size.height + '"');
    });
  }
}
fs.writeFileSync(htmlPath, html);
console.log('Synchronized ' + count + ' inline illustrations across ' + sources.length + ' blog articles.');
