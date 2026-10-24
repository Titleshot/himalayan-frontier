/* Himalayan Frontier – page content and UI state. Works without WebGL; the 3D views listen to events fired here. */
(function(){
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const fmt=n=>Math.round(n).toLocaleString('en-US');
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine=matchMedia('(hover:hover) and (pointer:fine)').matches;
const ARROW='<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 8h12M9 3l5 5-5 5" stroke="currentColor" stroke-width="1.6"/></svg>';
const FAQ=[
 ['Do I need a guide?','Yes. Since April 2023 Nepal requires foreign trekkers in national parks and conservation areas to walk with a licensed guide. Every trip here includes one.'],
 ['How fit do I need to be?','If you can walk five to seven hours on hills for several days in a row, you can do Langtang or Poon Hill. Everest, Gokyo, Annapurna Circuit and Manaslu need steady cardio training for two to three months beforehand. Tell us your highest altitude so far and we will suggest a route.'],
 ['What about altitude sickness?','Our itineraries gain height slowly and include fixed rest days. Guides check oxygen saturation twice a day above 3,500 m. If symptoms get worse, the treatment is to go down, and the guide makes that call.'],
 ['Do I need travel insurance?','Yes. Your policy must cover trekking to the trip’s highest point and helicopter evacuation. We ask for the policy number before departure.'],
 ['What happens if the Lukla flight is delayed?','Lukla flights depend on weather. Keep at least one spare day before your international flight home. If the delay runs long, a shared helicopter is usually possible at extra cost.'],
 ['Where do we sleep and what do we eat?','In family-run teahouses with twin rooms and mostly shared bathrooms. Breakfast, lunch and dinner on the trek are included, usually dal bhat, noodles, potatoes, eggs and soups. Remote treks such as Upper Dolpo and Kanchenjunga use camping in places.'],
 ['Which permits do I need?','It depends on the region; see Permits & fees above. We arrange all of them; you send passport copies and photos.'],
 ['Can you run a private trip?','Yes. Any trip here can run privately on your dates, with a different pace, extra rest days or upgraded lodges.'],
 ['Is there an age limit?','No fixed limit. We have guided teenagers with their parents and trekkers in their seventies. What matters is health, fitness and choosing the right route.'],
 ['How much should I tip?','Tipping is customary at the end of a trek. As a guide, many trekkers give around 10% of the trip cost, shared between guide and porters. Your trek leader will explain at the briefing.']
];
const TYPES=[['all','All trips','#c7d0d0'],['trek','Treks','#eaa66c'],['peak','Peak climbing','#8fc6d6'],['expedition','Expeditions','#e86a5a'],['tour','Tours & day trips','#b9c98a'],['abroad','Bhutan & Tibet','#c9a8e0']];
const TCOL=Object.fromEntries(TYPES.map(t=>[t[0],t[2]]));const TNAME=Object.fromEntries(TYPES.map(t=>[t[0],t[1]]));
const FEAT2CAT={ebc:'te-ebc-14',gokyo:'te-gokyo-ri-15',annapurna:'ta-annapurna-circuit-12',langtang:'tl-kyanjin-10',manaslu:'tm-circuit-18'};
function grade4(g){g=(g||'').toLowerCase();if(/very|extreme|technical/.test(g))return'Very challenging';if(/challeng|remote/.test(g))return'Challenging';if(/moderate|active/.test(g))return'Moderate';return'Easy';}

const S={data:null,cat:[],trek:'ebc',day:0};
window.HF=S;
S.TCOL=TCOL;S.TNAME=TNAME;S.grade4=grade4;
function treks(){return S.data?S.data.treks:[]}
function T(){return treks().find(t=>t.id===S.trek)}
S.tripById=id=>S.cat.find(c=>c.id===id);

/* ---------- 3D tilt (cards) ---------- */
function tilt(el,max=6){
  if(!fine||reduce)return;
  el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();const x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
    el.style.transform=`perspective(900px) rotateX(${((.5-y)*max).toFixed(2)}deg) rotateY(${((x-.5)*max).toFixed(2)}deg) translateZ(0)`;
    el.style.setProperty('--gx',(x*100)+'%');el.style.setProperty('--gy',(y*100)+'%');});
  el.addEventListener('pointerleave',()=>{el.style.transform='';});
}
S.tilt=tilt;

/* ---------- featured treks ---------- */
function renderCards(){
  const g=$('#trekGrid');g.innerHTML='';
  treks().forEach((t,i)=>{
    const b=document.createElement('button');b.className='tcard tilt reveal';b.type='button';b.dataset.id=t.id;b.dataset.vid=`assets/vc/${t.vid}.mp4`;
    b.innerHTML=`<span class="glare"></span><div class="tmedia"><img src="assets/img/${t.vid}.jpg" alt="" loading="lazy">${i===0?'<span class="tbadge">Most booked</span>':''}<span class="t3d">3D</span></div>
    <div class="tbody"><h3>${esc(t.name)}</h3><div class="area">${esc(t.area)}</div>
    <div class="tmeta"><span><b>${t.days}</b> days</span><span>Max <b>${fmt(t.max)} m</b></span><span>${esc(t.grade)}</span></div>
    <div class="tfoot"><span class="tprice">From<b>US$${fmt(t.price)}</b></span><span class="tgo">Walk it in 3D ${ARROW}</span></div></div>`;
    b.addEventListener('click',()=>{select(t.id,0,{scroll:'start'});});
    g.appendChild(b);tilt(b,5);
  });
  hoverVideos($$('.tcard'));observeReveal($$('#trekGrid .reveal'));
}
function renderTabs(){
  const tb=$('#tabs');tb.innerHTML='';
  treks().forEach(t=>{const b=document.createElement('button');b.className='tab';b.role='tab';b.id='tab-'+t.id;b.textContent=t.name;b.setAttribute('aria-selected',t.id===S.trek);b.addEventListener('click',()=>select(t.id,0));tb.appendChild(b);});
  tb.addEventListener('keydown',e=>{if(!/Arrow(Left|Right)/.test(e.key))return;const ids=treks().map(t=>t.id);let i=ids.indexOf(S.trek)+(e.key==='ArrowRight'?1:-1);i=(i+ids.length)%ids.length;select(ids[i],0);$('#tab-'+ids[i]).focus();});
}
function renderExplorer(){
  const t=T();if(!t)return;
  $$('.tab').forEach(b=>b.setAttribute('aria-selected',b.id==='tab-'+t.id));
  const ct=$('#ctaTreks');if(ct){ct.innerHTML='<span>Or walk</span>'+treks().filter(x=>x.id!==t.id).map(x=>`<button type="button" class="chip" data-id="${x.id}">${esc(x.name)}</button>`).join('');ct.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>select(b.dataset.id,0)));}
  $('#exName').textContent=t.name;$('#exArea').textContent=t.area;
  $('#exFacts').innerHTML=`<div><b>${t.days}</b><span>Days</span></div><div><b>${fmt(t.max)}</b><span>Max m</span></div><div><b>$${fmt(t.price)}</b><span>From</span></div>`;
  const ol=$('#days');ol.innerHTML='';const sel=$('#mDay');sel.innerHTML='';
  t.itin.forEach((d,i)=>{
    const li=document.createElement('li');const b=document.createElement('button');b.className='day'+(d.via.length?'':' off');b.type='button';
    b.innerHTML=`<span class="dn">Day ${String(i+1).padStart(2,'0')}</span><span class="dt">${esc(d.t)}${d.via.length?'':'<small>Off the map</small>'}</span><span class="da">${fmt(d.alt)} m</span>`;
    b.addEventListener('click',()=>select(t.id,i,{scroll:'day'}));li.appendChild(b);ol.appendChild(li);
    sel.add(new Option(`Day ${i+1} · ${d.t} · ${fmt(d.alt)} m`,i));
  });
  markDay();
}
function markDay(){
  const t=T();if(!t)return;const d=t.itin[S.day];
  $$('#days .day').forEach((b,i)=>{b.setAttribute('aria-current',i===S.day);if(i===S.day){const ol=$('#days'),r=b.getBoundingClientRect(),o=ol.getBoundingClientRect();if(o.height&&(r.top<o.top||r.bottom>o.bottom))ol.scrollTop+=r.top-o.top-o.height/3;}});
  $('#mDay').value=S.day;
  $('#nowDay').textContent=`Day ${S.day+1} of ${t.days}`;$('#nowAlt').textContent=`${fmt(d.alt)} m`;
  $('#nowTitle').textContent=d.t;$('#nowText').textContent=d.x;
}
function renderTrip(){
  const t=T();if(!t)return;
  $('#sum').innerHTML=`<div class="price">From<b>US$${fmt(t.price)}</b>per person, sharing a twin room</div>
  <dl class="facts"><dt>Trip code</dt><dd>${esc(t.code)}</dd><dt>Duration</dt><dd>${t.days} days</dd><dt>Highest point</dt><dd>${fmt(t.max)} m / ${fmt(t.max*3.28084)} ft</dd><dt>Grade</dt><dd>${esc(t.grade)}</dd><dt>Best season</dt><dd>${esc(t.season)}</dd><dt>Start / end</dt><dd>${esc(t.start)}</dd><dt>Style</dt><dd>${esc(t.style)}</dd></dl>
  <a class="btn btn-glow" href="#plan" data-plan="${t.id}">Ask about dates</a>
  <h4>Permits we arrange</h4><ul>${t.permits.map(p=>`<li>${esc(p)}</li>`).join('')}</ul>`;
  $('#sum [data-plan]').addEventListener('click',()=>{const c=FEAT2CAT[t.id];if(c)$('#fTrek').value=c;});
  const mx=Math.max(...t.itin.map(d=>d.alt));
  $('#tripMain').innerHTML=`<h3>${esc(t.name)}</h3><p class="lead">${esc(t.lede)}</p>
  <ul class="hl">${t.highlights.map(h=>`<li>${esc(h)}</li>`).join('')}</ul>
  <div class="prof2"><div class="cap"><span>Altitude by day</span><span>Highest: ${fmt(mx)} m</span></div><svg id="prof2" viewBox="0 0 1000 170" preserveAspectRatio="none" aria-label="Altitude for each day of the ${esc(t.name)} trek"></svg></div>
  <ol class="itin">${t.itin.map((d,i)=>`<li><div class="n">Day ${String(i+1).padStart(2,'0')}</div><div><h4>${esc(d.t)}</h4><p>${esc(d.x)}</p>${d.via.length?`<button class="see" type="button" data-day="${i}">See on the 3D map <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 14V2M3 7l5-5 5 5" stroke="currentColor" stroke-width="1.8"/></svg></button>`:''}</div><div class="meta"><b>${fmt(d.alt)} m</b>${d.hrs?esc(d.hrs):''}</div></li>`).join('')}</ol>
  <div class="inc"><div class="yes"><h4>Included</h4><ul>${S.data.included.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><div class="no"><h4>Not included</h4><ul>${S.data.excluded.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div></div>`;
  $$('#tripMain .see').forEach(b=>b.addEventListener('click',()=>select(t.id,+b.dataset.day,{scroll:'day'})));
  drawDayProfile(t);
}
function drawDayProfile(t){
  const svg=$('#prof2');if(!svg)return;const n=t.itin.length,W=1000,H=170,top=14,bot=24;
  const lo=Math.floor((Math.min(...t.itin.map(d=>d.alt))-200)/1000)*1000, hi=Math.ceil((t.max+200)/1000)*1000;
  const X=i=>20+i*(W-40)/(n-1),Y=a=>top+(1-(a-lo)/(hi-lo))*(H-top-bot);
  let grid='';for(let a=lo;a<=hi;a+=1000)grid+=`<line x1="0" x2="${W}" y1="${Y(a)}" y2="${Y(a)}" stroke="#26313a" vector-effect="non-scaling-stroke"/><text x="${W}" y="${Y(a)-4}" text-anchor="end">${fmt(a)} m</text>`;
  const pts=t.itin.map((d,i)=>[X(i),Y(d.alt)]);
  const line=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join('');
  svg.innerHTML=`<defs><linearGradient id="pg2" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#eaa66c" stop-opacity=".35"/><stop offset="1" stop-color="#eaa66c" stop-opacity="0"/></linearGradient></defs>${grid}
  <path d="${line}L${X(n-1)} ${H-bot}L${X(0)} ${H-bot}Z" fill="url(#pg2)"/><path d="${line}" fill="none" stroke="#eaa66c" stroke-width="2" vector-effect="non-scaling-stroke"/>
  ${pts.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="${t.itin[i].alt===t.max?'#f1f4f3':'#eaa66c'}" vector-effect="non-scaling-stroke"/>${(n<=14||i%2===0)?`<text x="${p[0]}" y="${H-6}" text-anchor="middle">${i+1}</text>`:''}`).join('')}`;
}
/* opts.scroll: 'start' → scroll to the beginning of the 3D walk, 'day' → scroll to that day's position */
function select(id,day,opts={}){
  const changed=id!==S.trek;S.trek=id;S.day=day||0;
  if(changed){renderExplorer();renderTrip();}else markDay();
  document.dispatchEvent(new CustomEvent('hf:select',{detail:{trek:id,day:S.day,changed,scroll:opts.scroll||null}}));
}
S.select=select;
document.addEventListener('hf:reached',e=>{if(e.detail.trek===S.trek&&e.detail.day!==S.day){S.day=e.detail.day;markDay();}});

function scrollToEl(el,off=0){const y=el.getBoundingClientRect().top+scrollY-parseInt(getComputedStyle(document.documentElement).getPropertyValue('--navh'))+1+off;scrollTo({top:y,behavior:reduce?'auto':'smooth'});}
S.scrollToEl=scrollToEl;
/* ---------- cinematic clips ----------
   Cards with a clip play it while they are on screen: the few nearest the middle of the
   viewport play, the rest keep their photo. Hovering always plays. Nothing autoplays with
   reduced motion or Data Saver turned on. */
const saveData=!!(navigator.connection&&navigator.connection.saveData);
const LITE=(()=>{try{return localStorage.getItem('hf-lite')==='1'}catch(e){return false}})();
const AUTO=!reduce&&!saveData&&!LITE;
S.LITE=LITE;if(LITE)document.documentElement.classList.add('lite');
const small=()=>innerWidth<700;
S.AUTO=AUTO;
const VM=(()=>{
  const all=new Set(),vis=new Set();let hov=null,t=0;
  const io='IntersectionObserver' in window?new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting&&e.intersectionRatio>=.5)vis.add(e.target);else vis.delete(e.target);});sched();},{threshold:[0,.5,.9]}):null;
  function sched(){if(!t)t=setTimeout(()=>{t=0;apply();},140);}
  function vid(c){if(c._v)return c._v;const m=c.querySelector('.tmedia');if(!m)return null;
    const v=document.createElement('video');v.muted=true;v.loop=true;v.playsInline=true;v.setAttribute('playsinline','');v.preload='none';v.setAttribute('aria-hidden','true');v.src=c.dataset.vid;
    v.addEventListener('playing',()=>c.classList.add('playing'),{once:true});m.appendChild(v);return c._v=v;}
  function apply(){
    const cy=innerHeight/2,dist=c=>{const r=c.getBoundingClientRect();return Math.abs(r.top+r.height/2-cy);};
    const on=AUTO?[...vis].filter(c=>c.isConnected).sort((a,b)=>dist(a)-dist(b)).slice(0,small()?2:6):[];
    if(hov&&!on.includes(hov))on.push(hov);
    const W=new Set(on);
    for(const c of all){
      if(!c.isConnected){all.delete(c);vis.delete(c);if(io)io.unobserve(c);continue;}
      if(W.has(c)){const v=vid(c);if(v&&v.paused)v.play().catch(()=>{});}
      else if(c._v&&!c._v.paused)c._v.pause();
    }
  }
  addEventListener('scroll',()=>{if(vis.size)sched();},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)all.forEach(c=>c._v&&c._v.pause());else sched();});
  return {add(cards){cards.forEach(c=>{if(!c.dataset.vid||all.has(c))return;all.add(c);if(io)io.observe(c);
    if(fine){c.addEventListener('mouseenter',()=>{hov=c;apply();});c.addEventListener('mouseleave',()=>{if(hov===c)hov=null;sched();});}
    c.addEventListener('focus',()=>{hov=c;apply();});c.addEventListener('blur',()=>{if(hov===c)hov=null;sched();});});}};
})();
function hoverVideos(cards){VM.add(cards);}
S.VM=VM;

/* ---------- catalogue ---------- */
const F={type:'all',region:'',dur:'',grade:'',sort:'pop',shown:12};
function filtered(){
  let L=S.cat.filter(c=>(F.type==='all'||c.type===F.type)&&(!F.region||c.region===F.region)&&(!F.grade||grade4(c.grade)===F.grade));
  if(F.dur){const [a,b]=F.dur.split('-').map(Number);L=L.filter(c=>c.days>=a-.01&&c.days<=b+.99);}
  const ord={trek:0,peak:1,expedition:2,tour:3,abroad:4};
  if(F.sort==='price')L.sort((a,b)=>a.price-b.price);
  else if(F.sort==='days')L.sort((a,b)=>a.days-b.days);
  else if(F.sort==='alt')L.sort((a,b)=>b.alt-a.alt);
  else L.sort((a,b)=>(b.feat?1:0)-(a.feat?1:0)||ord[a.type]-ord[b.type]);
  return L;
}
function cardHTML(c){
  return `<span class="glare"></span><div class="tmedia"><img src="${esc(c.img)}" alt="" loading="lazy" decoding="async"><span class="ctype"><i style="background:${TCOL[c.type]}"></i>${esc(TNAME[c.type]==='Tours & day trips'?'Tour':TNAME[c.type].replace(/s$/,'').replace('Bhutan & Tibet','Abroad'))}</span>${c.feat?'<span class="c3d" data-walk="'+c.feat+'" title="Walk this trek day by day in 3D">3D WALK ▸</span>':S.routeIds&&S.routeIds.has(c.id)?'<span class="c3d alt" data-fly="'+c.id+'" title="Fly this route on the 3D map">3D ROUTE ▸</span>':''}<span class="csave" data-save="${c.id}" role="button" aria-label="Save ${esc(c.name)}" aria-pressed="${S.isSaved&&S.isSaved(c.id)?'true':'false'}"><svg viewBox="0 0 16 16"><path d="M8 14s-5.5-3.3-5.5-7.2A3 3 0 0 1 8 4.6a3 3 0 0 1 5.5 2.2C13.5 10.7 8 14 8 14Z"/></svg></span>${c.vc?'<span class="cfilm" aria-hidden="true"><svg viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5v11l9-5.5z"/></svg>Film</span>':''}</div>
  <div class="tbody"><div class="area">${esc(c.region)}</div><h3>${esc(c.name)}</h3>
  <div class="tmeta"><span><b>${esc(c.dur)}</b></span>${c.alt?`<span>Max <b>${fmt(c.alt)} m</b></span>`:''}<span>${esc(grade4(c.grade))}</span></div>
  <div class="tfoot"><span class="tprice">From<b>US$${fmt(c.price)}</b></span><span class="tgo">Details ${ARROW}</span></div></div>`;
}
function renderCatalog(){
  const L=filtered(),g=$('#cgrid');
  $('#fcount').textContent=`${L.length} trip${L.length===1?'':'s'}`;
  g.innerHTML=L.length?'':'<div class="empty">No trips match those filters. Try a different region or length.</div>';
  L.slice(0,F.shown).forEach(c=>{const b=document.createElement('button');b.type='button';b.className='ccard tilt';if(c.vc)b.dataset.vid=c.vc;b.innerHTML=cardHTML(c);b.addEventListener('click',e=>{const f=e.target.closest('[data-fly]'),wk=e.target.closest('[data-walk]'),sv=e.target.closest('[data-save]');if(sv){S.toggleSave&&S.toggleSave(c.id);return;}if(f){flyRoute(c.id);return;}if(wk){select(wk.dataset.walk,0,{scroll:'start'});return;}openTrip(c.id);});g.appendChild(b);tilt(b,5);});
  VM.add($$('#cgrid .ccard'));
  $('#cmore').parentElement.hidden=L.length<=F.shown;
}
function renderFilters(){
  const ft=$('#ftype');
  ft.innerHTML=TYPES.map(([k,n,c])=>`<button class="chip" type="button" data-k="${k}" aria-pressed="${k===F.type}">${k==='all'?'':`<i style="background:${c}"></i>`}${n}</button>`).join('');
  ft.addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;F.type=b.dataset.k;F.shown=12;$$('#ftype .chip').forEach(x=>x.setAttribute('aria-pressed',x===b));renderCatalog();});
  const regs=[...new Set(S.cat.map(c=>c.region))].sort();const fr=$('#fRegion');regs.forEach(r=>fr.add(new Option(r,r)));
  fr.addEventListener('change',e=>{F.region=e.target.value;F.shown=12;renderCatalog();});
  $('#fDur').addEventListener('change',e=>{F.dur=e.target.value;F.shown=12;renderCatalog();});
  $('#fGrade').addEventListener('change',e=>{F.grade=e.target.value;F.shown=12;renderCatalog();});
  $('#fSort').addEventListener('change',e=>{F.sort=e.target.value;renderCatalog();});
  $('#cmore').addEventListener('click',()=>{F.shown+=12;renderCatalog();});
}
S.filterType=k=>{F.type=k;F.shown=12;$$('#ftype .chip').forEach(x=>x.setAttribute('aria-pressed',x.dataset.k===k));renderCatalog();};

/* ---------- trip dialog ---------- */
const dlg=$('#dlg');
function openTrip(id){
  const c=S.tripById(id);if(!c)return;
  const facts=c.facts.filter(f=>f[0]!=='Trip Code').map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
  const film=c.vh?`${c.vh}-m.mp4`:'',fpost=c.vh?`assets/vp/${c.vh.split('/').pop()}.webp`:'';
  const gal=(c.gal&&c.gal.length?c.gal:[c.img]);
  const hasRt=!!((S.routeIds&&S.routeIds.has(c.id))||(S.hasRoute&&S.hasRoute(c.id)));
  const galHTML=(film||gal.length>1||hasRt)?`<div class="dgal" role="group" aria-label="Film, photos and 3D route">${hasRt?`<button type="button" class="g3d" data-route3d aria-label="Fly this route in 3D"><svg viewBox="0 0 60 40" fill="none" aria-hidden="true"><path d="M0 34 L14 18 L22 26 L34 8 L48 22 L60 14" stroke="#4a5964" stroke-width="1.4"/><path d="M6 32 C14 30 16 22 24 22 S34 12 40 14 S50 20 56 12" stroke="#eaa66c" stroke-width="2.2" stroke-linecap="round"/><circle cx="56" cy="12" r="2.6" fill="#f1f4f3"/></svg><i>3D route</i></button>`:''}${film?`<button type="button" data-film aria-label="Play the film"${AUTO?' aria-pressed="true"':''}><img src="${esc(fpost)}" alt="" loading="lazy"><i><svg viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5v11l9-5.5z"/></svg>Film</i></button>`:''}${gal.map((g,i)=>`<button type="button" data-g="${esc(g)}" aria-label="Show photo ${i+1}"${!(film&&AUTO)&&i===0?' aria-pressed="true"':''}><img src="${esc(g)}" alt="" loading="lazy"></button>`).join('')}</div>`:'';
  $('#dlgBody').innerHTML=`<div class="dlg-hero">${film?`<video class="dv${AUTO?' on':''}" muted loop playsinline preload="${AUTO?'auto':'none'}" poster="${esc(fpost)}" src="${esc(film)}" aria-hidden="true"></video>`:''}<img src="${esc(c.img)}" alt=""${film&&AUTO?' style="opacity:0"':''}><div class="dlg-title"><div class="eyebrow" style="margin-bottom:8px">${esc(c.badge||TNAME[c.type])}</div><h2 id="dlgTitle">${esc(c.name)}</h2></div><button class="dlg-x" type="button" aria-label="Close">×</button></div>
  <div class="dlg-body"><div>
    <p class="lead" style="max-width:none">${esc(c.lede)}</p>
    ${galHTML}
    ${c.hl&&c.hl.length?`<div class="dsec">Highlights</div><ul class="dhl">${c.hl.map(h=>`<li><b>${esc(h[0])}</b><span>${esc(h[1])}</span></li>`).join('')}</ul>`:''}
    ${c.itin&&c.itin.length?`<div class="dsec">Itinerary</div><ol class="ditin">${c.itin.map(d=>`<li><div class="n">${esc(d[0])}</div><div><b>${esc(d[1])}</b><p>${esc(d[2])}</p></div></li>`).join('')}</ol>`:''}
    <div class="inc" style="margin-top:8px">${c.inc&&c.inc.length?`<div class="yes"><h4>Included</h4><ul>${c.inc.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:''}${c.exc&&c.exc.length?`<div class="no"><h4>Not included</h4><ul>${c.exc.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:''}</div>
  </div><aside class="dlg-side">
    <div class="dlg-price"><small>From, per person</small><b>US$${fmt(c.price)}</b><small>${esc(c.dur)}${c.alt?` · max ${fmt(c.alt)} m`:''}</small>
      <a class="btn btn-glow" href="#plan" data-enq>Enquire about dates</a>
      <div class="dacts"><button type="button" class="btn btn-line" data-dsave aria-pressed="${S.isSaved&&S.isSaved(c.id)?'true':'false'}"><svg viewBox="0 0 16 16"><path d="M8 14s-5.5-3.3-5.5-7.2A3 3 0 0 1 8 4.6a3 3 0 0 1 5.5 2.2C13.5 10.7 8 14 8 14Z"/></svg><span>${S.isSaved&&S.isSaved(c.id)?'Saved':'Save'}</span></button><button type="button" class="btn btn-line" data-share><svg viewBox="0 0 16 16" fill="none"><path d="M8 10V2M4.5 5.5 8 2l3.5 3.5M3 9v5h10V9" stroke="currentColor" stroke-width="1.5"/></svg><span>Share</span></button></div>
      ${c.feat?`<button class="btn btn-line" type="button" data-fly style="width:100%;margin-top:8px">Walk it day by day in 3D</button>`:''}
      ${hasRt?`<button class="btn btn-line" type="button" data-map style="width:100%;margin-top:8px">Fly this route in 3D</button>`:''}</div>
    <dl class="facts" style="margin:0;padding:16px 18px;background:var(--slate);border:1px solid var(--ridge);border-radius:4px">${facts}<dt>Grade</dt><dd>${esc(grade4(c.grade))}</dd><dt>Region</dt><dd>${esc(c.region)}</dd></dl>
  </aside></div>`;
  $('#dlgBody .dlg-x').addEventListener('click',()=>dlg.close());
  const dv=$('#dlgBody .dv');
  $$('#dlgBody .dgal button:not([data-route3d])').forEach(b=>b.addEventListener('click',()=>{const im=$('#dlgBody .dlg-hero img');
    if(b.hasAttribute('data-film')){if(dv){dv.classList.add('on');dv.play().catch(()=>{});im.style.opacity=0;}}
    else{if(dv){dv.classList.remove('on');dv.pause();}im.style.opacity=0;setTimeout(()=>{im.onload=()=>im.style.opacity=1;im.src=b.dataset.g;if(im.complete)im.style.opacity=1;},180);}
    $$('#dlgBody .dgal button:not([data-route3d])').forEach(x=>x.setAttribute('aria-pressed',x===b));}));
  if(dv&&AUTO)dv.play().catch(()=>{});
  $('#dlgBody [data-enq]').addEventListener('click',()=>{$('#fTrek').value=c.id;dlg.close();});
  const mp=$('#dlgBody [data-map]');if(mp)mp.addEventListener('click',()=>flyRoute(c.id));
  const r3=$('#dlgBody [data-route3d]');if(r3)r3.addEventListener('click',e=>{e.stopImmediatePropagation();flyRoute(c.id);},true);
  const fly=$('#dlgBody [data-fly]');if(fly)fly.addEventListener('click',()=>{dlg.close();select(c.feat,0,{scroll:'play'});});
  $('#dlgBody').scrollTop=0;
  const ds=$('#dlgBody [data-dsave]');ds.addEventListener('click',()=>{S.toggleSave&&S.toggleSave(c.id);const on=S.isSaved(c.id);ds.setAttribute('aria-pressed',on);ds.querySelector('span').textContent=on?'Saved':'Save';});
  $('#dlgBody [data-share]').addEventListener('click',e=>S.shareTrip&&S.shareTrip(c,e.currentTarget));
  if(location.hash!=='#trip='+c.id){try{history.pushState({trip:c.id},'','#trip='+c.id);S._tripPushed=true;}catch(e){}}
  if(dlg.showModal)dlg.showModal();else dlg.setAttribute('open','');
}
S.openTrip=openTrip;
/* close the dialog, bring the Nepal map into view and fly along the trip's route */
function flyRoute(id){if(dlg.open)dlg.close();scrollToEl($('#nstage'),-20);setTimeout(()=>{if(!(S.showRoute&&S.showRoute(id,true)))S.pendingRoute=id;},reduce?0:450);}
S.flyRoute=flyRoute;
dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close();});
dlg.addEventListener('close',()=>{$$('#dlgBody video').forEach(v=>v.pause());});

/* ---------- departures (sample) ---------- */
function renderDepartures(){
  const tabs=$('#depTabs');let cur=treks()[0].id;
  tabs.innerHTML=treks().map(t=>`<button class="chip" role="tab" type="button" data-id="${t.id}" aria-pressed="${t.id===cur}">${esc(t.name)}</button>`).join('');
  const months=[2,3,4,9,10];// Mar Apr May Oct Nov (0-based)
  const draw=()=>{const t=treks().find(x=>x.id===cur);const out=[];const now=new Date();let d=new Date(now.getFullYear(),now.getMonth(),now.getDate()+21);
    let k=0;while(out.length<8&&k<800){k++;d=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1);if(!months.includes(d.getMonth()))continue;if(d.getDay()!==6)continue;if(out.length&&(d-out[out.length-1])/864e5<13)continue;out.push(new Date(d));}
    const st=['Guaranteed','Open','4 seats left','Open','Guaranteed','Open','Open','Open'];
    const f=x=>x.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
    $('#depBody').innerHTML=out.map((s,i)=>{const e=new Date(s);e.setDate(e.getDate()+t.days-1);return `<tr><td>${f(s)}</td><td>${f(e)}</td><td>US$${fmt(t.price)}</td><td><span class="st">${st[i]}</span></td><td><button type="button" data-d="${s.toISOString()}">Hold a place</button></td></tr>`;}).join('');
    $$('#depBody button').forEach(b=>b.addEventListener('click',()=>{const c=FEAT2CAT[cur];if(c)$('#fTrek').value=c;const dd=new Date(b.dataset.d);const m=dd.toLocaleDateString('en-GB',{month:'long',year:'numeric'});const fm=$('#fMonth');const o=[...fm.options].find(o=>o.text===m);if(o)fm.value=o.value;$('#fMsg').value=`I’d like to join the group departure on ${f(dd)}.`;scrollToEl($('#plan'));}));
  };
  tabs.addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;cur=b.dataset.id;$$('#depTabs .chip').forEach(x=>x.setAttribute('aria-pressed',x===b));draw();});
  draw();
}

/* ---------- planning hub ---------- */
const PACK={'Clothing':['Base layers, top and bottom','Fleece or light insulated jacket','Down jacket (rent in Kathmandu)','Waterproof shell jacket and trousers','Trekking trousers ×2','Warm hat, sun hat, buff','Liner and insulated gloves'],
 'Feet':['Broken-in waterproof boots','Camp shoes or sandals','Trekking socks ×4','Gaiters for snow (high passes)'],
 'Sleeping & bags':['Sleeping bag rated to −10 °C (rent in Kathmandu)','Daypack 25–35 L with rain cover','Duffel (we provide one)','Dry bags for clothes'],
 'Health':['Personal first-aid and blister kit','Prescribed altitude medication','Water bottles 2 × 1 L or bladder','Purification tablets or filter','Sunscreen SPF 50 and lip balm'],
 'Gear':['Trekking poles','Headtorch and spare batteries','Category 3–4 sunglasses','Power bank','Quick-dry towel'],
 'Documents':['Passport, 6 months valid','Two passport photos for permits','Insurance policy and 24h number','Cash in Nepali rupees for the trail']};
function renderHub(){
  $$('#hubTabs .htab').forEach(b=>b.addEventListener('click',()=>{$$('#hubTabs .htab').forEach(x=>{x.setAttribute('aria-selected',x===b);$('#'+x.getAttribute('aria-controls')).hidden=x!==b;});}));
  $('#hubTabs').addEventListener('keydown',e=>{if(!/Arrow(Left|Right)/.test(e.key))return;const L=$$('#hubTabs .htab');let i=L.findIndex(x=>x.getAttribute('aria-selected')==='true')+(e.key==='ArrowRight'?1:-1);i=(i+L.length)%L.length;L[i].click();L[i].focus();});
  let saved={};try{saved=JSON.parse(localStorage.getItem('hf-pack')||'{}');}catch(e){}
  const p=$('#pack');let n=0;
  p.innerHTML=Object.entries(PACK).map(([g,items])=>`<fieldset><legend>${esc(g)}</legend>${items.map(it=>{const id='pk'+(n++);return `<label><input type="checkbox" data-k="${esc(it)}"${saved[it]?' checked':''}><span>${esc(it)}</span></label>`;}).join('')}</fieldset>`).join('');
  const upd=()=>{const all=$$('#pack input'),on=all.filter(x=>x.checked);$('#packN').textContent=`${on.length} of ${all.length} packed`;$('#packM').style.width=(on.length/all.length*100)+'%';
    const o={};on.forEach(x=>o[x.dataset.k]=1);try{localStorage.setItem('hf-pack',JSON.stringify(o));}catch(e){}};
  p.addEventListener('change',upd);$('#packReset').addEventListener('click',()=>{$$('#pack input').forEach(x=>x.checked=false);upd();});upd();
}

/* ---------- motion: reveal, hero parallax, depth ---------- */
let rio=null;
function observeReveal(els){
  if(reduce||!('IntersectionObserver' in window)){els.forEach(e=>e.classList.add('in'));return;}
  if(!rio)rio=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');rio.unobserve(e.target);}}),{rootMargin:'0px 0px -8% 0px'});
  els.forEach((e,i)=>{e.style.transitionDelay=(i%4)*60+'ms';rio.observe(e);});
}
function motion(){
  observeReveal($$('.reveal'));
  if(reduce)return;
  const hero=$('#hero'),media=$('#heroMedia'),copy=$('#heroCopy'),facts=$('.hero-facts'),cue=$('.scroll-cue'),depth=$$('.depth');
  let mx=0,my=0,tx=0,ty=0;
  if(fine)hero.addEventListener('pointermove',e=>{mx=e.clientX/innerWidth-.5;my=e.clientY/innerHeight-.5;});
  const frame=()=>{
    tx+=(mx-tx)*.06;ty+=(my-ty)*.06;
    const h=hero.offsetHeight,y=Math.min(scrollY,h);const k=y/h;
    if(scrollY<h+50){
      media.style.transform=`translate3d(${(-tx*18).toFixed(1)}px,${(y*.35-ty*12).toFixed(1)}px,0) scale(${(1.06+k*.12).toFixed(3)})`;
      copy.style.transform=`translate3d(${(tx*10).toFixed(1)}px,${(-y*.18+ty*6).toFixed(1)}px,0)`;copy.style.opacity=(1-k*1.3).toFixed(3);facts.style.opacity=(1-k*1.6).toFixed(3);cue.style.opacity=(1-k*4).toFixed(3);
    }
    for(const el of depth){const r=el.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)continue;const c=(r.top+r.height/2-innerHeight/2)/innerHeight;const d=+el.dataset.depth||.08;
      if(el.tagName==='IMG')el.style.transform=`translate3d(0,${(c*d*-260).toFixed(1)}px,0) scale(1.15)`;
      else el.style.transform=`perspective(1200px) rotateX(${(c*d*40).toFixed(2)}deg) translate3d(0,${(c*d*-120).toFixed(1)}px,0)`;}
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/* background clips: load when near the screen, play only while visible */
let lio=null;
function lazyClips(vs){
  if(!lio)lio=new IntersectionObserver(es=>es.forEach(e=>{const v=e.target;
    if(e.isIntersecting){if(!v.getAttribute('src')){v.src=(small()&&v.dataset.m)||v.dataset.src;}if(AUTO)v.play().then(()=>{v.style.opacity=1;}).catch(()=>{});}
    else if(!v.paused)v.pause();}),{rootMargin:'120px'});
  vs.forEach(v=>{v.style.opacity=0;v.style.transition='opacity .8s';lio.observe(v);});
}
/* hero: a slow reel of the films, cross-fading every few seconds */
function heroReel(){
  const v0=$('#heroVid'),media=$('#heroMedia');if(!AUTO||!v0)return;
  const L=['hero-bg','exp-lhotse','heli-abc','tibet-everest-north','exp-ama-dablam','ktm-everest-flight','te-gokyo-ri-15'];
  const src=n=>`assets/vh/${n}${small()?'-m':''}.mp4`;
  v0.classList.add('reel','on');
  const mk=()=>{const v=document.createElement('video');v.muted=true;v.loop=true;v.playsInline=true;v.setAttribute('playsinline','');v.preload='auto';v.className='reel';v.setAttribute('aria-hidden','true');media.appendChild(v);return v;};
  let cur=v0,nxt=mk(),i=0;
  setTimeout(()=>{nxt.src=src(L[1]);},2500);
  const vis=()=>!document.hidden&&scrollY<innerHeight*1.1;
  addEventListener('scroll',()=>{if(vis()){if(cur.paused)cur.play().catch(()=>{});}else if(!cur.paused)cur.pause();},{passive:true});
  setInterval(()=>{
    if(!vis()||nxt.readyState<2)return;
    i=(i+1)%L.length;
    nxt.currentTime=0;nxt.play().then(()=>{nxt.classList.add('on');cur.classList.remove('on');const old=cur;cur=nxt;nxt=old;
      setTimeout(()=>{old.pause();old.src=src(L[(i+1)%L.length]);old.load();},1600);}).catch(()=>{});
  },7000);
}
/* expeditions: a sideways row of every climb that has a film */
const EXP=['exp-everest','exp-ama-dablam','exp-lhotse','exp-manaslu','exp-pumori','pc-island-peak','pc-mera-peak','exp-lobuche-east','exp-baruntse','exp-himlung','exp-dhaulagiri','exp-everest-lhotse','pc-yala-peak','pc-chulu-west','exp-saribung','exp-gyachung-kang'];
function renderExp(){
  const row=$('#expRow');if(!row)return;
  row.innerHTML=EXP.map(id=>S.tripById(id)).filter(Boolean).map(c=>`<button class="ecard tilt" type="button" data-trip="${c.id}"${c.vc?` data-vid="${esc(c.vc)}"`:''}><span class="glare"></span><div class="tmedia"><img src="${esc(c.img)}" alt="" loading="lazy" decoding="async"><span class="ctype"><i style="background:${TCOL[c.type]}"></i>${c.type==='peak'?'Peak climb':'Expedition'}</span></div><div class="tbody"><h3>${esc(c.name.replace(/^Mt\. /,'').replace(/ (Expedition|Climb)$/,''))}</h3><div class="tmeta">${c.alt?`<span><b>${fmt(c.alt)} m</b></span>`:''}<span>${esc(c.dur)}</span><span>${esc(grade4(c.grade))}</span></div></div></button>`).join('');
  $$('#expRow .ecard').forEach(c=>{tilt(c,5);c.addEventListener('click',()=>openTrip(c.dataset.trip));});
  VM.add($$('#expRow .ecard'));
  const step=d=>row.scrollBy({left:d*row.clientWidth*.8,behavior:reduce?'auto':'smooth'});
  $('#expPrev').addEventListener('click',()=>step(-1));$('#expNext').addEventListener('click',()=>step(1));
  const upd=()=>{$('#expPrev').disabled=row.scrollLeft<8;$('#expNext').disabled=row.scrollLeft>row.scrollWidth-row.clientWidth-8;};
  row.addEventListener('scroll',upd,{passive:true});upd();
}
/* more ways in: helicopters, flights, adventure sports, Bhutan and Tibet */
const MORE=[['heli-everest','Helicopter'],['bhutan-classic','Bhutan'],['adv-paragliding-pokhara','Adventure'],['tibet-ebc','Tibet'],['heli-abc','Helicopter'],['adv-trishuli-rafting','Adventure'],['ktm-everest-flight','Mountain flight'],['adv-bungee-bhote-koshi','Adventure']];
function renderMore(){
  const g=$('#moreGrid');if(!g)return;
  g.innerHTML=MORE.map(([id,k])=>{const c=S.tripById(id);if(!c||!c.vh)return'';const b=c.vh.split('/').pop();
    return `<button class="vtile" type="button" data-trip="${c.id}" data-vid="${esc(c.vh)}-m.mp4"><div class="tmedia"><img src="assets/vp/${b}.webp" alt="" loading="lazy" decoding="async"></div><div class="vt"><span class="k">${esc(k)}</span><h3>${esc(c.name)}</h3><span class="m">${esc(c.dur.replace(/\s*\(.*\)/,''))} · from US$${fmt(c.price)}</span></div></button>`;}).join('');
  $$('#moreGrid .vtile').forEach(c=>c.addEventListener('click',()=>openTrip(c.dataset.trip)));
  VM.add($$('#moreGrid .vtile'));
}

/* ---------- static bits ---------- */
function renderStatic(){
  const r=[1,1,2,3,3,0,0,0,1,3,3,2],mo=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  $('#cal').innerHTML=r.map((v,i)=>`<div class="m"><div class="bar b${v}"></div><span>${mo[i]}</span></div>`).join('');
  $('#faq').innerHTML='<h3 class="h2" style="font-size:clamp(28px,3vw,40px);margin:0 0 12px">Questions people ask</h3>'+FAQ.map(([q,a],i)=>`<details${i===0?' open':''}><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('');
  const fM=$('#fMonth');const months=['January','February','March','April','May','June','July','August','September','October','November','December'];const now=new Date();
  for(let k=1;k<=18;k++){const d=new Date(now.getFullYear(),now.getMonth()+k,1);fM.add(new Option(months[d.getMonth()]+' '+d.getFullYear()));}
  const ix=[...fM.options].findIndex(o=>/^(October|April|March|November)/.test(o.text));if(ix>=0)fM.selectedIndex=ix;
  const nav=$('#nav');const f=()=>nav.classList.toggle('solid',scrollY>40);addEventListener('scroll',f,{passive:true});f();
  $('#planForm').addEventListener('submit',e=>{e.preventDefault();const f=e.target,s=$('#sent');const name=f.name.value.trim(),email=f.email.value.trim();
    if(!name||!/^\S+@\S+\.\S+$/.test(email)){s.hidden=false;s.innerHTML='Add your name and a valid email address so a trek leader can reply.';(name?f.email:f.name).focus();return;}
    const tk=f.trek.options[f.trek.selectedIndex].text.split(' · ')[0];
    s.hidden=false;s.innerHTML=`Thanks, ${esc(name)}. Your request for <b>${esc(tk)}</b> in ${esc(f.month.value)} for ${esc(f.group.value)} is ready to send.<small>This preview doesn’t send messages yet. Connect the form to your inbox when the site goes live.</small>`;});
  $('#mPrev').addEventListener('click',()=>{if(S.day>0)select(S.trek,S.day-1,{scroll:'day'});});
  $('#mNext').addEventListener('click',()=>{const t=T();if(t&&S.day<t.itin.length-1)select(S.trek,S.day+1,{scroll:'day'});});
  $('#mDay').addEventListener('change',e=>select(S.trek,+e.target.value,{scroll:'day'}));
  lazyClips($$('video[data-lazy]'));
  renderHub();motion();heroReel();
}

renderStatic();
fetch('assets/geo/routes.json').then(r=>r.json()).then(r=>{S.routeIds=new Set(Object.keys(r));if(S.cat.length)renderCatalog();}).catch(()=>{});
Promise.all([fetch('assets/geo/treks.json').then(r=>r.json()),fetch('assets/catalog.json').then(r=>r.json())]).then(([d,cat])=>{
  S.data=d;S.cat=cat;
  const fT=$('#fTrek');const groups={};
  cat.forEach(c=>{const g=TNAME[c.type];(groups[g]=groups[g]||[]).push(c);});
  Object.entries(groups).forEach(([g,L])=>{const og=document.createElement('optgroup');og.label=g;L.forEach(c=>og.appendChild(new Option(`${c.name} · ${c.dur}`,c.id)));fT.appendChild(og);});
  fT.add(new Option('Not sure yet','unsure'));fT.value=FEAT2CAT.ebc;
  renderCards();renderTabs();renderExplorer();renderTrip();renderFilters();renderCatalog();renderDepartures();renderExp();renderMore();
  document.dispatchEvent(new CustomEvent('hf:data',{detail:d}));
  document.dispatchEvent(new CustomEvent('hf:select',{detail:{trek:S.trek,day:0,changed:true,scroll:null}}));
}).catch(err=>{console.error(err);$('#trekGrid').innerHTML='<p class="lead">Trip details could not be loaded. Refresh the page to try again.</p>';});
})();
