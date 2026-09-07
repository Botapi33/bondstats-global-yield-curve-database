import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(__dirname,'..');
const catalog=JSON.parse(await fs.readFile(path.join(ROOT,'data/catalog.json'),'utf8'));

const output={
  generatedAt:new Date().toISOString(),
  hub:{
    path:'/markets/global-yield-curve-database/',
    title:'Global Yield Curve Database',
    description:'Explore current and historical government yield curves across major sovereign bond markets.'
  },
  markets:[]
};

for (const market of catalog.markets) {
  const file=path.join(ROOT,'data/markets',`${market.id}.json`);
  let data;
  try { data=JSON.parse(await fs.readFile(file,'utf8')); } catch { continue; }
  if (!data.history?.length) continue;

  const years=[...new Set(data.history.map(r=>r.date.slice(0,4)))].sort().reverse();
  output.markets.push({
    id:market.id,
    name:market.name,
    slug:market.slug,
    latestDate:data.latestDate,
    observationCount:data.history.length,
    countryPage:`/markets/yield-curves/${market.slug}/`,
    historyPage:`/markets/yield-curves/${market.slug}/history/`,
    years:years.map(year=>({
      year,
      path:`/markets/yield-curves/${market.slug}/${year}/`,
      observationCount:data.history.filter(r=>r.date.startsWith(year)).length
    }))
  });
}

await fs.writeFile(path.join(ROOT,'data/seo-manifest.json'),JSON.stringify(output,null,2)+'\n');
console.log(`SEO manifest: ${output.markets.length} markets`);
