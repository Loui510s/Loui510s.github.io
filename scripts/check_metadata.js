#!/usr/bin/env node
// Simple scanner that finds window.GALLERY blocks in HTML files and reports missing metadata fields
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const files = fs.readdirSync(root).filter(f => f.endsWith('.html'));
const fields = ['dateTaken','camera','lens','species','speciesInfo','description'];

function extractGallery(content) {
  const m = content.match(/window\.GALLERY\s*=\s*(\[[\s\S]*?\]);/);
  if (!m) return null;
  try {
    // Evaluate safely in a new context
    // Replace window.GALLERY = with var __G = ...; then eval
    const js = '(__G = ' + m[1] + ');';
    const vm = require('vm');
    const ctx = { __G: null };
    vm.createContext(ctx);
    vm.runInContext(js, ctx);
    return ctx.__G;
  } catch (e) {
    return null;
  }
}

let any = false;
files.forEach(file => {
  const p = path.join(root, file);
  const txt = fs.readFileSync(p, 'utf8');
  const gallery = extractGallery(txt);
  if (!gallery) return;
  console.log('\n' + file + ':');
  gallery.forEach((item, i) => {
    const missing = fields.filter(f => !item || !(f in item) || item[f] === '' );
    if (missing.length) {
      any = true;
      console.log(`  [${i}] ${item && item.src ? item.src : '<no-src>'} - missing: ${missing.join(', ')}`);
    }
  });
});
if (!any) console.log('\nAll gallery items found with at least one metadata field present (no obvious gaps detected).');
