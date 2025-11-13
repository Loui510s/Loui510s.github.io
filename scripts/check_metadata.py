#!/usr/bin/env python3
import re, os
root = os.path.dirname(os.path.dirname(__file__))
html_files = [f for f in os.listdir(root) if f.endswith('.html')]
fields = ['dateTaken','camera','lens','species','speciesInfo','description']
report_lines = []
suggest_lines = []
for fn in html_files:
    path = os.path.join(root, fn)
    txt = open(path, 'r', encoding='utf8').read()
    m = re.search(r"window\.GALLERY\s*=\s*(\[[\s\S]*?\]);", txt)
    if not m:
        continue
    arr = m.group(1)
    # find simple object literals { ... }
    objs = re.findall(r"\{[\s\S]*?\}", arr)
    for i, obj in enumerate(objs):
        missing = [f for f in fields if re.search(r"\b"+re.escape(f)+r"\b\s*:\s*", obj) is None]
        if missing:
            src_m = re.search(r"src\s*:\s*['\"]([^'\"]+)['\"]", obj)
            src = src_m.group(1) if src_m else '<no-src>'
            report_lines.append(f"{fn} [{i}] {src} - missing: {', '.join(missing)}")
            # build suggestion snippet
            stub_parts = [f"  // Suggested metadata for {src}"]
            stub_parts.append("  {")
            stub_parts.append(f"    // src: '{src}',")
            for f in missing:
                # Use an explicit empty double-quoted string for camera to match placeholders
                if f == 'camera':
                    stub_parts.append(f'    {f}: "",')
                else:
                    stub_parts.append(f"    {f}: '',")
            stub_parts.append("  },")
            suggest_lines.append('\n'.join(stub_parts))
# write outputs
out = '\n'.join(report_lines)
if not out:
    out = 'No missing metadata detected (no suggestions generated).'
print(out)
with open(os.path.join(root, 'scripts', 'suggested_metadata_patch.txt'), 'w', encoding='utf8') as fh:
    if report_lines:
        fh.write('Suggested metadata stubs for missing fields:\n\n')
        fh.write('\n\n'.join(suggest_lines))
    else:
        fh.write('No missing metadata detected.')
print('\nWrote suggestions to scripts/suggested_metadata_patch.txt')
