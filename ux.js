/* Himalayan Frontier – everyday conveniences: saved trips, shareable trip links, lite mode,
   a first-visit hint and full screen for the 3D map. */
(function(){
'use strict';
const S=window.HF||{};
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=n=>Math.round(n).toLocaleString('en-US');
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine=matchMedia('(hover:hover) and (pointer:fine)').matches;
const store={get(k,d){try{const v=localStorage.getItem(k);return v===null?d:JSON.parse(v);}catch(e){return d;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}};
const whenCat=cb=>{if(S.cat&&S.cat.length)cb();else document.addEventListener('hf:data',()=>setTimeout(cb,0),{once:true});};

/* ---------- toast ---------- */
let tT=0;
function toast(msg){const t=$('#toast');if(!t)return;const host=document.querySelector('dialog[open]')||document.body;if(t.parentNode!==host)host.appendChild(t);t.textContent=msg;t.classList.add('on');clearTimeout(tT);tT=setTimeout(()=>t.classList.remove('on'),2600);}
S.toast=toast;

/* ---------- saved trips (kept in this browser) ---------- */
let saved=store.get('hf-saved',[]);if(!Array.isArray(saved))saved=[];
S.isSaved=id=>saved.includes(id);
function paintSaved(){
  $$('[data-save]').forEach(el=>el.setAttribute('aria-pressed',saved.includes(el.dataset.save)));
  const n=saved.length,c=$('#mCount');if(c){c.hidden=!n;c.textContent=n;}
  const box=$('#mSaved');if(!box)return;box.hidden=!n;
  const L=saved.map(id=>S.tripById&&S.tripById(id)).filter(Boolean);
  $('#mSavedList').innerHTML=L.map(t=>`<div class="msi"><button type="button" class="mso" data-id="${t.id}"><img src="${esc(t.img)}" alt="" loading="lazy"><span><b>${esc(t.name)}</b><small>${esc(t.dur)} · from US$${fmt(t.price)}</small></span></button><button type="button" class="msx" data-rm="${t.id}" aria-label="Remove ${esc(t.name)}">×</button></div>`).join('');
}
S.toggleSave=id=>{const i=saved.indexOf(id);if(i>=0)saved.splice(i,1);else saved.push(id);store.set('hf-saved',saved);paintSaved();
  const t=S.tripById&&S.tripById(id);toast(i>=0?'Removed from your saved trips':`Saved${t?': '+t.name:''}. Find it in the menu.`);};
whenCat(paintSaved);
document.addEventListener('click',e=>{
  const o=e.target.closest('#mSavedList .mso');if(o){$('#menuBtn').click();setTimeout(()=>S.openTrip(o.dataset.id),250);return;}
  const r=e.target.closest('#mSavedList [data-rm]');if(r){S.toggleSave(r.dataset.rm);}
});
const enq=$('#mSavedEnq');
if(enq)enq.addEventListener('click',()=>{
  const L=saved.map(id=>S.tripById(id)).filter(Boolean);if(!L.length)return;
  const f=$('#planForm');f.trek.value=L[0].id;f.msg.value=`I am comparing these trips: ${L.map(t=>t.name).join('; ')}. Which would suit me best?`;
  $('#menuBtn').click();setTimeout(()=>{S.scrollToEl($('#plan'));},250);
});

/* ---------- shareable trip links: #trip=<id> opens that trip; Back closes it ---------- */
const dlg=$('#dlg');let fromPop=false;
function tripFromHash(){const m=location.hash.match(/^#trip=([\w-]+)/);return m?m[1]:null;}
whenCat(()=>{const id=tripFromHash();if(id&&S.tripById(id))setTimeout(()=>S.openTrip(id),400);});
addEventListener('popstate',()=>{S._tripPushed=false;const id=tripFromHash();
  if(id&&S.tripById&&S.tripById(id)){if(!dlg.open)S.openTrip(id);}
  else if(dlg.open){fromPop=true;dlg.close();fromPop=false;}});
dlg.addEventListener('close',()=>{if(fromPop)return;if(S._tripPushed){S._tripPushed=false;try{history.back();}catch(e){}}else if(tripFromHash()){try{history.replaceState(null,'',location.pathname+location.search);}catch(e){}}});
S.shareTrip=async(t,btn)=>{
  const url=location.href.split('#')[0]+'#trip='+t.id,data={title:`${t.name} · Himalayan Frontier`,text:`${t.name}: ${t.dur}, from US$${fmt(t.price)}`,url};
  try{if(navigator.share&&!fine){await navigator.share(data);return;}}catch(e){if(e&&e.name==='AbortError')return;}
  try{await navigator.clipboard.writeText(url);toast('Link copied. Anyone who opens it lands on this trip.');}
  catch(e){prompt('Copy this link',url);}
};

/* ---------- lite mode ---------- */
const lt=$('#liteTgl');
if(lt){lt.checked=!!S.LITE;lt.addEventListener('change',()=>{store.set('hf-lite',lt.checked?1:0);try{localStorage.setItem('hf-lite',lt.checked?'1':'0');}catch(e){}toast(lt.checked?'Lite mode on. Reloading…':'Lite mode off. Reloading…');setTimeout(()=>location.reload(),700);});}
// suggest lite mode once on very slow connections
const cn=navigator.connection;
if(cn&&/(^|-)2g$/.test(cn.effectiveType||'')&&!S.LITE&&!sessionStorage.getItem('hf-lite-tip')){try{sessionStorage.setItem('hf-lite-tip','1');}catch(e){}setTimeout(()=>toast('Slow connection? Turn on Lite mode in the menu.'),4000);}

/* ---------- 3D map: full screen and a first-visit gesture hint ---------- */
const ns=$('#nstage'),fs=$('#nFull');
if(ns&&fs){
  const can=ns.requestFullscreen||ns.webkitRequestFullscreen;
  if(!can)fs.hidden=true;
  else fs.addEventListener('click',()=>{const cur=document.fullscreenElement||document.webkitFullscreenElement;
    if(cur)(document.exitFullscreen||document.webkitExitFullscreen).call(document);else can.call(ns);});
  document.addEventListener('fullscreenchange',()=>{fs.classList.toggle('on',document.fullscreenElement===ns);fs.setAttribute('aria-label',document.fullscreenElement===ns?'Exit full screen':'Full screen map');});
}
function coach(stage,text,key){
  if(!stage||reduce)return;try{if(sessionStorage.getItem(key))return;}catch(e){}
  const c=document.createElement('div');c.className='coach';c.setAttribute('aria-hidden','true');
  c.innerHTML=`<span class="hand"><svg viewBox="0 0 24 24" fill="none"><path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10m0 0V4.5a1.5 1.5 0 0 1 3 0V10m0-3.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L3.6 14a1.5 1.5 0 0 1 2.5-1.7L9 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span>${text}</span>`;
  stage.appendChild(c);
  let shown=false,gone=false;
  const hide=()=>{if(gone)return;gone=true;c.classList.remove('on');try{sessionStorage.setItem(key,'1');}catch(e){}setTimeout(()=>c.remove(),500);};
  ['pointerdown','wheel','touchstart'].forEach(ev=>stage.addEventListener(ev,hide,{passive:true,once:true}));
  new IntersectionObserver((es,o)=>es.forEach(e=>{if(e.isIntersecting&&e.intersectionRatio>.5&&!shown){shown=true;setTimeout(()=>{if(!gone)c.classList.add('on');},900);setTimeout(hide,7500);o.disconnect();}}),{threshold:[.5]}).observe(stage);
}
coach(ns,fine?'Drag to turn the map · click a pin to trace its route':'Drag to turn the map · tap a pin to trace its route','hf-coach-nepal');
})();
