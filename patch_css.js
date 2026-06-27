const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');

if (!css.includes('--glass-button')) {
  css = css.replace('--surface-glass: rgba(255, 255, 255, 0.85);', '--surface-glass: rgba(255, 255, 255, 0.7);\n  --glass-button: rgba(0, 0, 0, 0.05);\n  --glass-border: rgba(0, 0, 0, 0.05);');
  css = css.replace('--surface-glass: rgba(37, 37, 50, 0.85);', '--surface-glass: rgba(37, 37, 50, 0.7);\n  --glass-button: rgba(255, 255, 255, 0.12);\n  --glass-border: rgba(255, 255, 255, 0.08);');
  fs.writeFileSync('src/index.css', css);
  console.log("CSS patched with glass button variables.");
} else {
  console.log("Already patched.");
}
