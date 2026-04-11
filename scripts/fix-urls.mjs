import * as fs from 'fs';

const filePath = 'src/scraper/plan-scraper.ts';
let code = fs.readFileSync(filePath, 'utf8');

// Update all URLs to standard format
code = code.replace(/url: '(https:\/\/eshop\.bh\.zain\.com\/product\/)plans_[^/]+\/plans\?([^']+)'/g, "url: '$1plans?$2'");

fs.writeFileSync(filePath, code);
console.log('URLs updated!');
