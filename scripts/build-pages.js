const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
const siteFiles = ['index.html', 'styles.css', 'script.js', 'auth.js'];

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

for (const file of siteFiles) {
  fs.copyFileSync(path.join(root, file), path.join(output, file));
}
fs.cpSync(path.join(root, 'assets'), path.join(output, 'assets'), { recursive: true });

const indexPath = path.join(output, 'index.html');
const index = fs.readFileSync(indexPath, 'utf8');
const pagesIndex = index.replace(
  '<body data-view="loading">',
  '<body data-view="loading" data-static-demo="true">'
);
if (pagesIndex === index) {
  throw new Error('Could not enable static demo mode in the Pages build.');
}
fs.writeFileSync(indexPath, pagesIndex);
fs.writeFileSync(path.join(output, '.nojekyll'), '');
