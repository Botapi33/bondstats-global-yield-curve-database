(() => {
  const CATALOG_URL='./data/catalog.json';
  let catalog=null, market=null, activeIndex=0, compareIndex=null, playing=false, timer=null;

  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function tenorYears(t){
    if(t==='LONG') return 30;
    const m=String(t).match(/^([\d.]+)(M|Y)$/);
    if(!m) return null;
    return m[2]==='M' ? Number(m[1])/12 : Number(m[1]);
  }

  function curvePoints(row){
    return Object.entries(row?.curve||{})
      .map(([tenor,value])=>({tenor,years:tenorYears(tenor),value:Number(value)}))
      .filter(p=>p.years!=null && Number.isFinite(p.value))
      .sort((a,b)=>a.years-b.years);
  }

  function nearestTenor(curve, target){
    const pts=curvePoints({curve});
    if(!pts.length) return null;
    return pts.reduce((best,p)=>Math.abs(p.years-target)<Math.abs(best.years-target)?p:best).value;
  }

  function bp(x){ return x==null || !Number.isFinite(x) ? '—' : `${x>=0?'+':''}${Math.round(x*100)} bp`; }

  function classify(curve){
    const y2=nearestTenor(curve,2), y10=nearestTenor(curve,10), y30=nearestTenor(curve,30);
    if(y2==null || y10==null) return {label:'Unclassified',note:'Insufficient tenors'};
    const s=y10-y2;
    if(s < -0.25) return {label:'Inverted',note:'Long yields sit materially below the front end'};
    if(s < 0.15) return {label:'Flat',note:'The front and long end are compressed'};
    if(s > 1.25) return {label:'Steep',note:'Long yields stand well above the front end'};
    if(y30!=null && y30-y10 > .35) return {label:'Long-end steep',note:'Term premium rises into the long end'};
    return {label:'Normal',note:'An upward-sloping sovereign curve'};
  }

  function resizeCanvas(){
    const canvas=$('curveCanvas');
    const rect=canvas.getBoundingClientRect();
    const dpr=window.devicePixelRatio||1;
    canvas.width=Math.max(1,Math.floor(rect.width*dpr));
    canvas.height=Math.max(1,Math.floor(rect.height*dpr));
    draw();
  }

  function draw(){
    if(!market?.history?.length) return;
    const canvas=$('curveCanvas'), rect=canvas.getBoundingClientRect(), dpr=window.devicePixelRatio||1;
    const ctx=canvas.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const w=rect.width,h=rect.height;
    ctx.clearRect(0,0,w,h);

    const active=market.history[activeIndex];
    const p1=curvePoints(active);
    const p2=compareIndex==null?[]:curvePoints(market.history[compareIndex]);
    const all=[...p1,...p2];
    if(all.length<2) return;

    const minX=Math.min(...all.map(p=>p.years)), maxX=Math.max(...all.map(p=>p.years));
    let minY=Math.min(...all.map(p=>p.value)), maxY=Math.max(...all.map(p=>p.value));
    const padY=Math.max(.35,(maxY-minY)*.18);
    minY-=padY; maxY+=padY;
    const px=x=>36+(x-minX)/(maxX-minX)*(w-60);
    const py=y=>24+(maxY-y)/(maxY-minY)*(h-56);

    // Y labels
    ctx.font='8px ui-monospace, monospace';
    ctx.fillStyle='#4d574f';
    ctx.textAlign='left';
    for(let i=0;i<5;i++){
      const val=minY+(maxY-minY)*i/4;
      const yy=py(val);
      ctx.fillText(val.toFixed(2),4,yy+3);
    }

    function path(points, ghost=false){
      if(points.length<2) return;
      ctx.beginPath();
      points.forEach((p,i)=>i?ctx.lineTo(px(p.years),py(p.value)):ctx.moveTo(px(p.years),py(p.value)));
      ctx.strokeStyle=ghost?'#647068':'#ddd9ce';
      ctx.lineWidth=ghost?1:1.7;
      ctx.setLineDash(ghost?[6,6]:[]);
      ctx.stroke();
      ctx.setLineDash([]);
      if(!ghost){
        for(const p of points){
          ctx.beginPath(); ctx.arc(px(p.years),py(p.value),3.2,0,Math.PI*2);
          ctx.fillStyle='#6dd79a'; ctx.fill();
        }
      }
    }
    path(p2,true); path(p1,false);

    // maturity labels
    ctx.fillStyle='#505951';ctx.font='8px ui-monospace, monospace';ctx.textAlign='center';
    p1.forEach(p=>ctx.fillText(p.tenor,px(p.years),h-8));
  }

  function renderCurveTable(){
    const row=market.history[activeIndex];
    const cmp=compareIndex==null?null:market.history[compareIndex];
    $('curveTable').innerHTML=market.tenors.map(t=>{
      const v=row.curve?.[t];
      const gv=cmp?.curve?.[t];
      return `<div class="tenor-cell"><span>${esc(t)}</span><strong>${v==null?'—':Number(v).toFixed(3)}%</strong><em>${gv==null?'':`ghost ${Number(gv).toFixed(3)}%`}</em></div>`;
    }).join('');
  }

  function renderStats(){
    const row=market.history[activeIndex], curve=row.curve||{};
    const y2=nearestTenor(curve,2), y5=nearestTenor(curve,5), y10=nearestTenor(curve,10), y30=nearestTenor(curve,30);
    const pts=curvePoints(row);
    const shape=classify(curve);
    $('shape').textContent=shape.label;
    $('shapeNote').textContent=shape.note;
    $('s2s10').textContent=(y2!=null&&y10!=null)?bp(y10-y2):'—';
    $('s5s30').textContent=(y5!=null&&y30!=null)?bp(y30-y5):'—';
    $('shortEnd').textContent=pts.length?`${pts[0].value.toFixed(2)}%`:'—';
    $('longEnd').textContent=pts.length?`${pts[pts.length-1].value.toFixed(2)}%`:'—';
  }

  function renderDate(){
    const row=market.history[activeIndex];
    $('activeDate').textContent=row.date;
    $('periodLabel').textContent=`${market.name} · ${row.date}`;
    $('dateSlider').value=activeIndex;
    renderCurveTable();
    renderStats();
    draw();
  }

  function populateCompare(){
    const sel=$('compareSelect');
    const options=[['','No comparison']];
    const targets=[
      ['1 month ago',21],['3 months ago',63],['1 year ago',252],['3 years ago',756],['5 years ago',1260]
    ];
    for(const [label,offset] of targets){
      const idx=Math.max(0,market.history.length-1-offset);
      if(idx < market.history.length-1) options.push([String(idx),`${label} · ${market.history[idx].date}`]);
    }
    sel.innerHTML=options.map(([v,l])=>`<option value="${v}">${esc(l)}</option>`).join('');
    compareIndex=null;
    $('ghostLabel').textContent='comparison off';
  }

  async function loadMarket(id){
    stopPlay();
    $('marketRail').querySelectorAll('.market-btn').forEach(b=>b.classList.toggle('active',b.dataset.id===id));
    const res=await fetch(`./data/markets/${id}.json?v=${Date.now()}`,{cache:'no-store'});
    if(!res.ok) throw new Error(`market ${id}: HTTP ${res.status}`);
    market=await res.json();
    $('marketName').textContent=market.name;
    $('frequency').textContent=market.frequency;
    $('sourceName').textContent=market.source;
    $('sourceLink').href=market.sourceUrl;
    $('obsCount').textContent=`${(market.history||[]).length.toLocaleString('en-GB')} curves`;
    $('coverage').textContent=market.history?.length?`${market.history[0].date} → ${market.latestDate}`:'No archive loaded';
    $('dateSlider').max=Math.max(0,(market.history?.length||1)-1);
    activeIndex=Math.max(0,(market.history?.length||1)-1);
    $('firstDate').textContent=market.history?.[0]?.date||'—';
    $('lastDate').textContent=market.latestDate||'—';
    populateCompare();
    renderDate();
    requestAnimationFrame(resizeCanvas);
    reportHeight();
  }

  function renderRail(){
    $('marketRail').innerHTML=catalog.markets.map(m=>
      `<button class="market-btn" data-id="${esc(m.id)}" title="${esc(m.name)}">${esc(m.code)}<small>${m.status==='live'?'LIVE':String(m.status||'').toUpperCase()}</small></button>`
    ).join('');
    $('marketRail').querySelectorAll('.market-btn').forEach(btn=>btn.addEventListener('click',()=>loadMarket(btn.dataset.id)));
  }

  function step(delta){
    if(!market?.history?.length) return;
    activeIndex=Math.max(0,Math.min(market.history.length-1,activeIndex+delta));
    renderDate();
  }

  function stopPlay(){
    playing=false;
    $('playBtn').textContent='PLAY';
    if(timer){clearInterval(timer);timer=null;}
  }

  function togglePlay(){
    if(playing){stopPlay();return;}
    playing=true;$('playBtn').textContent='PAUSE';
    timer=setInterval(()=>{
      if(activeIndex>=market.history.length-1) activeIndex=0; else activeIndex++;
      renderDate();
    },180);
  }

  function reportHeight(){
    if(window.parent===window)return;
    const height=Math.max(document.documentElement.scrollHeight,document.body?.scrollHeight||0);
    window.parent.postMessage({type:'bondstats-yield-curve-database-height',height},'*');
  }

  async function init(){
    const res=await fetch(`${CATALOG_URL}?v=${Date.now()}`,{cache:'no-store'});
    if(!res.ok)throw new Error(`catalog HTTP ${res.status}`);
    catalog=await res.json();
    $('dbState').textContent=`${catalog.status} · ${catalog.marketCount} markets`;
    $('generatedAt').textContent=catalog.generatedAt?`refreshed ${new Date(catalog.generatedAt).toLocaleString('en-GB')}`:'awaiting first refresh';
    renderRail();
    const first=catalog.markets.find(m=>m.observations>0)?.id || catalog.markets[0]?.id;
    if(first) await loadMarket(first);
  }

  $('dateSlider').addEventListener('input',e=>{activeIndex=Number(e.target.value);renderDate();});
  $('prevBtn').addEventListener('click',()=>step(-1));
  $('nextBtn').addEventListener('click',()=>step(1));
  $('playBtn').addEventListener('click',togglePlay);
  $('compareSelect').addEventListener('change',e=>{
    compareIndex=e.target.value===''?null:Number(e.target.value);
    $('ghostLabel').textContent=compareIndex==null?'comparison off':market.history[compareIndex].date;
    renderCurveTable();draw();
  });
  $('clearCompare').addEventListener('click',()=>{
    compareIndex=null;$('compareSelect').value='';$('ghostLabel').textContent='comparison off';renderCurveTable();draw();
  });
  window.addEventListener('resize',resizeCanvas);
  window.addEventListener('load',reportHeight);
  if('ResizeObserver' in window)new ResizeObserver(reportHeight).observe(document.documentElement);

  init().catch(err=>{
    console.error(err);
    $('dbState').textContent='database unavailable';
  });
})();
