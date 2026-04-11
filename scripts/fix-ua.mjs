import * as fs from 'fs';

let content = fs.readFileSync('src/scraper/plan-scraper.ts', 'utf8');

// Add user agent
content = content.replace(
  /'--disable-gpu',/g, 
  "'--disable-gpu',\n      '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',"
);

fs.writeFileSync('src/scraper/plan-scraper.ts', content);
console.log("Added User-Agent to plan-scraper.ts");
