import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const MARKET_DIR = path.join(DATA_DIR, 'markets');

const MARKET_META = {
  us: {
    code:'US', name:'United States', slug:'united-states', currency:'USD',
    source:'Federal Reserve H.15 via FRED graph CSV',
    sourceUrl:'https://fred.stlouisfed.org/',
    frequency:'daily',
    tenors:['1M','3M','6M','1Y','2Y','3Y','5Y','7Y','10Y','20Y','30Y']
  },
  de: {
    code:'DE', name:'Germany', slug:'germany', currency:'EUR',
    source:'Deutsche Bundesbank SDMX Web Service',
    sourceUrl:'https://api.statistiken.bundesbank.de/',
    frequency:'daily',
    tenors:['6M','1Y','2Y','3Y','5Y','7Y','10Y','15Y','20Y','30Y']
  },
  ea: {
    code:'EA', name:'Euro Area', slug:'euro-area', currency:'EUR',
    source:'ECB Data Portal — all-rated euro government par yield curve',
    sourceUrl:'https://data.ecb.europa.eu/data/datasets/YC',
    frequency:'daily',
    tenors:['1Y','2Y','3Y','5Y','7Y','10Y','15Y','20Y','30Y']
  },
  jp: {
    code:'JP', name:'Japan', slug:'japan', currency:'JPY',
    source:'Ministry of Finance Japan — constant-maturity JGB rates',
    sourceUrl:'https://www.mof.go.jp/english/policy/jgbs/reference/interest_rate/',
    frequency:'daily',
    tenors:['1Y','2Y','3Y','5Y','7Y','10Y','15Y','20Y','30Y','40Y']
  },
  uk: {
    code:'UK', name:'United Kingdom', slug:'united-kingdom', currency:'GBP',
    source:'Bank of England — nominal gilt par yields',
    sourceUrl:'https://www.bankofengland.co.uk/statistics/yield-curves',
    frequency:'daily',
    tenors:['5Y','10Y','20Y']
  },
  ca: {
    code:'CA', name:'Canada', slug:'canada', currency:'CAD',
    source:'Bank of Canada Valet API — benchmark Government of Canada yields',
    sourceUrl:'https://www.bankofcanada.ca/valet/docs/',
    frequency:'daily',
    tenors:['2Y','3Y','5Y','7Y','10Y','LONG']
  },
  au: {
    code:'AU', name:'Australia', slug:'australia', currency:'AUD',
    source:'Reserve Bank of Australia — Capital Market Yields F2',
    sourceUrl:'https://www.rba.gov.au/statistics/tables/',
    frequency:'daily/weekly publication',
    tenors:['2Y','3Y','5Y','10Y']
  }
};

const START = {
  us:'1990-01-01',
  de:'1997-01-01',
  ea:'2004-09-06',
  uk:'1998-01-01',
  ca:'1990-01-01',
  au:'2013-05-20'
};

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

async function fetchText(url, { attempts=3, headers={} } = {}) {
  let last;
  for (let i=0;i<attempts;i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch(url, {
        headers: {
          'user-agent':'BondStats-Global-Yield-Curve-Database/1.0',
          'accept':'text/csv,text/plain,application/json;q=0.9,*/*;q=0.5',
          ...headers
        },
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      clearTimeout(timer);
      last = e;
      await sleep(900 * (i+1));
    }
  }
  throw last;
}

async function fetchJson(url) {
  const text = await fetchText(url, {headers:{accept:'application/json'}});
  return JSON.parse(text);
}

function splitCsvLine(line, delimiter=',') {
  const out=[]; let cur=''; let quoted=false;
  for (let i=0;i<line.length;i++) {
    const ch=line[i];
    if (ch === '"') {
      if (quoted && line[i+1] === '"') { cur += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === delimiter && !quoted) {
      out.push(cur); cur='';
    } else cur += ch;
  }
  out.push(cur);
  return out.map(x => x.trim());
}

function detectDelimiter(line) {
  const commas=(line.match(/,/g)||[]).length;
  const semis=(line.match(/;/g)||[]).length;
  const tabs=(line.match(/\t/g)||[]).length;
  if (tabs > commas && tabs > semis) return '\t';
  return semis > commas ? ';' : ',';
}

function parseCsv(text, delimiter=null) {
  const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(l => l.trim() !== '');
  if (!lines.length) return [];
  const d=delimiter || detectDelimiter(lines.slice(0,5).sort((a,b)=>b.length-a.length)[0]);
  return lines.map(line => splitCsvLine(line,d));
}

function parseNumber(v) {
  if (v == null) return null;
  const s=String(v).trim().replace(/\s/g,'').replace('%','').replace(',', '.');
  if (!s || s === '-' || s === '.' || /^n\/?a$/i.test(s)) return null;
  const n=Number(s);
  return Number.isFinite(n) ? n : null;
}

function normalizeDate(raw) {
  if (!raw) return null;
  let s=String(raw).trim().replace(/"/g,'');
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(s)) {
    const [y,m,d]=s.split('/').map(Number);
    return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }
  if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(s)) {
    const [d,m,y]=s.split('.').map(Number);
    return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }
  const t=Date.parse(s);
  if (Number.isFinite(t)) return new Date(t).toISOString().slice(0,10);
  return null;
}

function mergeTenorSeries(seriesByTenor) {
  const byDate=new Map();
  for (const [tenor, rows] of Object.entries(seriesByTenor)) {
    for (const row of rows) {
      if (!row.date || row.value == null) continue;
      if (!byDate.has(row.date)) byDate.set(row.date,{date:row.date,curve:{}});
      byDate.get(row.date).curve[tenor]=Math.round(row.value*1000000)/1000000;
    }
  }
  return [...byDate.values()]
    .filter(r => Object.keys(r.curve).length >= 2)
    .sort((a,b)=>a.date.localeCompare(b.date));
}

function finalize(id, history) {
  const meta=MARKET_META[id];
  if (!history.length) throw new Error(`${id}: no observations`);
  return {
    version:1,
    id, ...meta,
    status:'live',
    generatedAt:new Date().toISOString(),
    latestDate:history[history.length-1].date,
    observations:history.length,
    history
  };
}

async function readPrevious(id) {
  try { return JSON.parse(await fs.readFile(path.join(MARKET_DIR,`${id}.json`),'utf8')); }
  catch { return null; }
}

/* ---------- US: Federal Reserve H.15 / FRED graph CSV ---------- */
async function buildUS() {
  const map={
    '1M':'DGS1MO','3M':'DGS3MO','6M':'DGS6MO','1Y':'DGS1','2Y':'DGS2','3Y':'DGS3',
    '5Y':'DGS5','7Y':'DGS7','10Y':'DGS10','20Y':'DGS20','30Y':'DGS30'
  };
  const out={};
  for (const [tenor,id] of Object.entries(map)) {
    const url=`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}&cosd=${START.us}`;
    const rows=parseCsv(await fetchText(url));
    const header=rows[0].map(x=>x.toLowerCase());
    const di=header.findIndex(x=>x.includes('date'));
    const vi=header.findIndex((x,i)=>i!==di && (x.toUpperCase()===id || x.includes(id.toLowerCase())));
    out[tenor]=rows.slice(1).map(r=>({date:normalizeDate(r[di]),value:parseNumber(r[vi])})).filter(r=>r.date&&r.value!=null);
  }
  return finalize('us',mergeTenorSeries(out));
}

/* ---------- Germany: Bundesbank daily Svensson curve ---------- */
async function buildGermany() {
  const codes={
    '6M':'R005X','1Y':'R01XX','2Y':'R02XX','3Y':'R03XX','5Y':'R05XX',
    '7Y':'R07XX','10Y':'R10XX','15Y':'R15XX','20Y':'R20XX','30Y':'R30XX'
  };
  const out={};
  for (const [tenor,rt] of Object.entries(codes)) {
    const key=`D.I.ZST.ZI.EUR.S1311.B.A604.${rt}.R.A.A._Z._Z.A`;
    const url=`https://api.statistiken.bundesbank.de/rest/data/BBSIS/${key}?format=bbk_csv&startPeriod=${START.de}`;
    const rows=parseCsv(await fetchText(url));
    const parsed=[];
    for (const r of rows) {
      let date=null, value=null;
      for (let i=0;i<r.length;i++) {
        const d=normalizeDate(r[i]);
        if (d) { date=d; 
          for (let j=i+1;j<r.length;j++) {
            const n=parseNumber(r[j]);
            if (n!=null) { value=n; break; }
          }
          break;
        }
      }
      if (date && value!=null) parsed.push({date,value});
    }
    out[tenor]=parsed;
  }
  return finalize('de',mergeTenorSeries(out));
}

/* ---------- Euro Area: ECB par yield curve, all ratings ---------- */
async function buildEuroArea() {
  const tenors=['1Y','2Y','3Y','5Y','7Y','10Y','15Y','20Y','30Y'];
  const out={};
  for (const tenor of tenors) {
    const key=`B.U2.EUR.4F.G_N_C.SV_C_YM.PY_${tenor}`;
    const url=`https://data-api.ecb.europa.eu/service/data/YC/${key}?format=csvdata&startPeriod=${START.ea}`;
    const rows=parseCsv(await fetchText(url));
    const header=rows[0].map(x=>x.toUpperCase());
    const di=header.indexOf('TIME_PERIOD');
    const vi=header.indexOf('OBS_VALUE');
    if (di<0 || vi<0) throw new Error(`ECB ${tenor}: expected CSV columns missing`);
    out[tenor]=rows.slice(1)
      .map(r=>({date:normalizeDate(r[di]),value:parseNumber(r[vi])}))
      .filter(r=>r.date&&r.value!=null);
  }
  return finalize('ea',mergeTenorSeries(out));
}

/* ---------- Japan: Ministry of Finance constant-maturity JGB CSV ---------- */
async function buildJapan() {
  const urls=[
    'https://www.mof.go.jp/english/policy/jgbs/reference/interest_rate/historical/jgbcme_all.csv',
    'https://www.mof.go.jp/english/policy/jgbs/reference/interest_rate/jgbcme.csv'
  ];
  const byDate=new Map();
  for (const url of urls) {
    const rows=parseCsv(await fetchText(url));
    const hi=rows.findIndex(r=>r.some(c=>String(c).trim()==='Date') && r.some(c=>/10Y/i.test(String(c))));
    if (hi<0) throw new Error('Japan MOF: header not found');
    const header=rows[hi].map(x=>String(x).trim());
    const dateIndex=header.findIndex(x=>x==='Date');
    for (const r of rows.slice(hi+1)) {
      const date=normalizeDate(r[dateIndex]);
      if (!date) continue;
      const curve={};
      for (let i=0;i<header.length;i++) {
        if (!/^\d+Y$/.test(header[i])) continue;
        const v=parseNumber(r[i]);
        if (v!=null) curve[header[i]]=v;
      }
      if (Object.keys(curve).length>=2) byDate.set(date,{date,curve});
    }
  }
  const history=[...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date))
    .map(r=>({date:r.date,curve:Object.fromEntries(MARKET_META.jp.tenors.filter(t=>r.curve[t]!=null).map(t=>[t,r.curve[t]]))}))
    .filter(r=>Object.keys(r.curve).length>=2);
  return finalize('jp',history);
}

/* ---------- UK: Bank of England CSV ---------- */
async function buildUK() {
  const codes={'5Y':'IUDSNPY','10Y':'IUDMNPY','20Y':'IUDLNPY'};
  const url='https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp?csv.x=yes&Datefrom=01/Jan/1998&Dateto=now&SeriesCodes=IUDSNPY,IUDMNPY,IUDLNPY&CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N';
  const rows=parseCsv(await fetchText(url));
  const header=rows[0].map(x=>String(x).trim().toUpperCase());
  const dateIndex=header.findIndex(x=>x.includes('DATE'));
  const out={};
  for (const [tenor,code] of Object.entries(codes)) {
    const ci=header.findIndex(x=>x===code);
    if (ci<0) throw new Error(`BoE ${code}: column missing`);
    out[tenor]=rows.slice(1).map(r=>({date:normalizeDate(r[dateIndex]),value:parseNumber(r[ci])})).filter(r=>r.date&&r.value!=null);
  }
  return finalize('uk',mergeTenorSeries(out));
}

/* ---------- Canada: Bank of Canada Valet API ---------- */
async function buildCanada() {
  const codes={'2Y':'V39051','3Y':'V39052','5Y':'V39053','7Y':'V39054','10Y':'V39055','LONG':'V39056'};
  const out={};
  for (const [tenor,code] of Object.entries(codes)) {
    const url=`https://www.bankofcanada.ca/valet/observations/${code}/json?start_date=${START.ca}`;
    const j=await fetchJson(url);
    out[tenor]=(j.observations||[]).map(o=>({
      date:normalizeDate(o.d),
      value:parseNumber(o?.[code]?.v)
    })).filter(r=>r.date&&r.value!=null);
  }
  return finalize('ca',mergeTenorSeries(out));
}

/* ---------- Australia: RBA F2 ---------- */
async function buildAustralia() {
  const url='https://www.rba.gov.au/statistics/tables/csv/f2-data.csv';
  const rows=parseCsv(await fetchText(url));
  const seriesIds={
    '2Y':'FCMYGBAG2D','3Y':'FCMYGBAG3D','5Y':'FCMYGBAG5D','10Y':'FCMYGBAG10D'
  };
  let marker=-1;
  let indexes={};

  for (let i=0;i<Math.min(rows.length,40);i++) {
    const row=rows[i].map(x=>String(x).trim());
    const found={};
    for (const [tenor,id] of Object.entries(seriesIds)) {
      const idx=row.findIndex(x=>x===id);
      if (idx>=0) found[tenor]=idx;
    }
    if (Object.keys(found).length>=3) { marker=i; indexes=found; break; }
  }

  if (marker<0) {
    // Fallback for title rows if RBA changes where it exposes series IDs.
    for (let i=0;i<Math.min(rows.length,40);i++) {
      const row=rows[i].map(x=>String(x).toLowerCase());
      const patterns={
        '2Y':'australian government 2 year bond',
        '3Y':'australian government 3 year bond',
        '5Y':'australian government 5 year bond',
        '10Y':'australian government 10 year bond'
      };
      const found={};
      for (const [tenor,label] of Object.entries(patterns)) {
        const idx=row.findIndex(x=>x.includes(label));
        if (idx>=0) found[tenor]=idx;
      }
      if (Object.keys(found).length>=3) { marker=i; indexes=found; break; }
    }
  }

  if (marker<0) throw new Error('RBA F2: series row not found');

  const history=[];
  for (const r of rows.slice(marker+1)) {
    const date=normalizeDate(r[0]);
    if (!date || date<START.au) continue;
    const curve={};
    for (const [tenor,idx] of Object.entries(indexes)) {
      const v=parseNumber(r[idx]);
      if (v!=null) curve[tenor]=v;
    }
    if (Object.keys(curve).length>=2) history.push({date,curve});
  }
  history.sort((a,b)=>a.date.localeCompare(b.date));
  return finalize('au',history);
}

const builders={us:buildUS,de:buildGermany,ea:buildEuroArea,jp:buildJapan,uk:buildUK,ca:buildCanada,au:buildAustralia};

async function main() {
  await fs.mkdir(MARKET_DIR,{recursive:true});
  const catalog={
    version:1,
    status:'live',
    generatedAt:new Date().toISOString(),
    marketCount:Object.keys(builders).length,
    markets:[]
  };

  let liveCount=0;
  for (const id of Object.keys(builders)) {
    const meta=MARKET_META[id];
    try {
      console.log(`Updating ${id}…`);
      const output=await builders[id]();
      await fs.writeFile(path.join(MARKET_DIR,`${id}.json`),JSON.stringify(output,null,2)+'\n');
      catalog.markets.push({
        id,code:meta.code,name:meta.name,slug:meta.slug,currency:meta.currency,
        source:meta.source,sourceUrl:meta.sourceUrl,frequency:meta.frequency,tenors:meta.tenors,
        status:'live',latestDate:output.latestDate,observations:output.observations
      });
      liveCount++;
    } catch (error) {
      console.error(`${id} failed:`,error.message);
      const previous=await readPrevious(id);
      if (previous?.history?.length) {
        previous.status='stale';
        previous.refreshAttemptAt=new Date().toISOString();
        previous.lastError=String(error.message||error);
        await fs.writeFile(path.join(MARKET_DIR,`${id}.json`),JSON.stringify(previous,null,2)+'\n');
        catalog.markets.push({
          id,code:meta.code,name:meta.name,slug:meta.slug,currency:meta.currency,
          source:meta.source,sourceUrl:meta.sourceUrl,frequency:meta.frequency,tenors:meta.tenors,
          status:'stale',latestDate:previous.latestDate,observations:previous.history.length,
          lastError:String(error.message||error)
        });
      } else {
        catalog.markets.push({
          id,code:meta.code,name:meta.name,slug:meta.slug,currency:meta.currency,
          source:meta.source,sourceUrl:meta.sourceUrl,frequency:meta.frequency,tenors:meta.tenors,
          status:'error',latestDate:null,observations:0,lastError:String(error.message||error)
        });
      }
    }
  }

  catalog.status = liveCount === Object.keys(builders).length ? 'live'
    : liveCount >= 4 ? 'partial'
    : liveCount > 0 ? 'degraded'
    : 'error';

  await fs.writeFile(path.join(DATA_DIR,'catalog.json'),JSON.stringify(catalog,null,2)+'\n');

  if (liveCount === 0) throw new Error('No market source updated successfully.');
  console.log(`Done. ${liveCount}/${Object.keys(builders).length} markets live.`);
}

main().catch(err=>{
  console.error(err);
  process.exit(1);
});
