/* Himalayan Frontier – cinematic set pieces.
   Preloader, scroll marquee, region portal, photo sphere, film reel, statement reveal and the trip-desk assistant.
   Every piece runs only while it is on screen and steps back for reduced motion and Data Saver. */
(function(){
'use strict';
const S=window.HF||{};
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine=matchMedia('(hover:hover) and (pointer:fine)').matches;
const saveData=!!(navigator.connection&&navigator.connection.saveData);
const AUTO=!reduce&&!saveData&&!(window.HF&&window.HF.LITE);
const small=()=>innerWidth<700;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=n=>Math.round(n).toLocaleString('en-US');
const easeIO=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
function tween(fn,ms){return new Promise(res=>{if(reduce){fn(1);res();return;}const t0=performance.now();const f=now=>{const t=Math.min(1,(now-t0)/ms);fn(easeIO(t));if(t<1)requestAnimationFrame(f);else res();};requestAnimationFrame(f);});}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function whenCat(cb){if(S.cat&&S.cat.length)cb();else document.addEventListener('hf:data',()=>setTimeout(cb,0),{once:true});}
function onView(el,cb,margin='0px'){if(!('IntersectionObserver' in window)){cb(true);return;}new IntersectionObserver(es=>es.forEach(e=>cb(e.isIntersecting)),{rootMargin:margin}).observe(el);}
function retrigger(el,cls){el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);}

/* ---------- custom cursor over the interactive set pieces ---------- */
const cur=document.createElement('div');cur.className='hcur';cur.setAttribute('aria-hidden','true');cur.innerHTML='<i class="o"></i><i class="d"></i><span></span>';
document.body.appendChild(cur);
let cX=0,cY=0,oX=0,oY=0,cOn=false,cRun=false;
function cLoop(){oX+=(cX-oX)*.2;oY+=(cY-oY)*.2;cur.style.setProperty('--x',cX+'px');cur.style.setProperty('--y',cY+'px');cur.style.setProperty('--ox',oX+'px');cur.style.setProperty('--oy',oY+'px');
  if(cOn||Math.abs(cX-oX)>.5)requestAnimationFrame(cLoop);else cRun=false;}
function cursorFor(el,label){
  if(!fine)return;el.classList.add('hascur');
  el.addEventListener('pointerenter',e=>{cX=oX=e.clientX;cY=oY=e.clientY;cOn=true;cur.querySelector('span').textContent=label;cur.classList.add('on');if(!cRun){cRun=true;requestAnimationFrame(cLoop);}});
  el.addEventListener('pointermove',e=>{cX=e.clientX;cY=e.clientY;if(!cOn){cX=oX=e.clientX;cY=oY=e.clientY;cOn=true;cur.querySelector('span').textContent=label;cur.classList.add('on');if(!cRun){cRun=true;requestAnimationFrame(cLoop);}}});
  el.addEventListener('pointerleave',()=>{cOn=false;cur.classList.remove('on');});
}
// scrolling moves the page under a still mouse: hide the cursor until the mouse moves again
addEventListener('scroll',()=>{if(cOn){cOn=false;cur.classList.remove('on');}},{passive:true});
const cursorDown=on=>cur.classList.toggle('down',on);

/* ---------- 1. preloader: count to 100, then the logo flies to the nav ---------- */
function preloader(){
  const pre=$('#pre');if(!pre)return;
  try{sessionStorage.setItem('hf-pre','1');}catch(e){}
  const n=$('#preN'),hv=$('#heroVid'),t0=performance.now();const P={video:0,fonts:0,data:0};
  if(!hv||hv.readyState>=3)P.video=1;else{hv.addEventListener('canplay',()=>P.video=1,{once:true});hv.addEventListener('error',()=>P.video=1,{once:true});}
  (document.fonts?document.fonts.ready:Promise.resolve()).then(()=>P.fonts=1);
  whenCat(()=>P.data=1);
  let shown=0,done=false;
  const tick=now=>{const el=now-t0;let target=(Math.min(1,el/1300)*.4+P.video*.3+P.fonts*.1+P.data*.2)*100;if(el>4200)target=100;
    shown=Math.min(target,shown+(target-shown)*.14+.35);n.textContent=Math.round(shown);
    if(shown>=99.6&&!done){done=true;finish();return;}requestAnimationFrame(tick);};
  requestAnimationFrame(tick);
  function finish(){
    n.textContent='100';pre.classList.add('leaving');
    const logo=$('.pre-logo',pre),dst=$('#nav .brand svg');
    if(logo&&dst){const a=logo.getBoundingClientRect(),b=dst.getBoundingClientRect();logo.style.transform=`translate(${(b.left-a.left).toFixed(1)}px,${(b.top-a.top).toFixed(1)}px) scale(${(b.width/a.width).toFixed(3)})`;}
    setTimeout(()=>{document.documentElement.classList.remove('pre-on');pre.classList.add('gone');},1150);
    setTimeout(()=>pre.remove(),1700);
  }
}

/* ---------- 2. two rows of trip photos that slide with the scroll ---------- */
const MARQ=['te-ebc-14','ta-abc-14','tm-circuit-18','exp-ama-dablam','bhutan-classic','te-gokyo-ri-15','heli-mustang','ta-upper-mustang-19','pc-island-peak','tl-gosainkunda-16','tibet-kailash',
  'ta-annapurna-circuit-12','to-upper-dolpo-jomsom-27','exp-manaslu','tk-kbc-26','pkr-sarangkot','tl-kyanjin-10','heli-everest','safari-chitwan-3n4d','tm-tsum-valley-16','te-three-passes-21','ktm-bhaktapur'];
function marquee(){
  const sec=$('#marq');if(!sec)return;
  const rows=$$('.mrow',sec);
  whenCat(()=>{
    const L=MARQ.map(id=>S.tripById(id)).filter(Boolean),half=Math.ceil(L.length/2);
    [L.slice(0,half),L.slice(half)].forEach((set,r)=>{
      const tile=c=>`<button type="button" class="mtile" data-trip="${c.id}"><img src="${esc(c.img)}" alt="" loading="lazy" decoding="async"><span>${esc(c.name)}</span></button>`;
      rows[r].innerHTML=[0,1,2].map(()=>set.map(tile).join('')).join('');
      // copies after the first are decoration for the loop: keep them out of the tab order
      [...rows[r].children].forEach((b,i)=>{if(i>=set.length){b.tabIndex=-1;b.setAttribute('aria-hidden','true');}});
    });
    // rows follow the page scroll, and can also be dragged or swiped sideways (with a little momentum)
    const drag=[0,0],vel=[0,0];let dr=null,moved=false,mom=0;
    const wrap=(x,set)=>-set-(((-x)%set)+set)%set;
    let on=false,raf=0;
    const upd=()=>{raf=0;const r=sec.getBoundingClientRect();const off=(innerHeight-r.top)*.6;const set=rows[0].scrollWidth/3,set2=rows[1].scrollWidth/3;
      rows[0].style.transform=`translate3d(${wrap(-set+off+drag[0],set).toFixed(1)}px,0,0)`;
      rows[1].style.transform=`translate3d(${wrap(-off-set2*.15+drag[1],set2).toFixed(1)}px,0,0)`;};
    const coast=()=>{mom=0;let any=false;for(let i=0;i<2;i++){if(Math.abs(vel[i])>.2){drag[i]+=vel[i];vel[i]*=.94;any=true;}else vel[i]=0;}upd();if(any)mom=requestAnimationFrame(coast);};
    rows.forEach((row,i)=>{
      row.addEventListener('pointerdown',e=>{if(e.button>0)return;cancelAnimationFrame(mom);vel[i]=0;dr={i,id:e.pointerId,x:e.clientX,y:e.clientY,lx:e.clientX,touch:e.pointerType==='touch',lock:null,cap:false};moved=false;});
      row.addEventListener('pointermove',e=>{if(!dr||dr.id!==e.pointerId)return;const dx=e.clientX-dr.x,dy=e.clientY-dr.y;
        if(!dr.lock&&Math.hypot(dx,dy)>(dr.touch?6:3)){dr.lock=Math.abs(dx)>Math.abs(dy)*1.1?'x':'y';if(dr.lock==='y'){dr=null;return;}try{row.setPointerCapture(e.pointerId);dr.cap=true;}catch(_){}row.classList.add('dragging');}
        if(dr.lock!=='x')return;moved=true;const d=e.clientX-dr.lx;dr.lx=e.clientX;drag[i]+=d;vel[i]=d;if(!raf)raf=requestAnimationFrame(upd);});
      const end=e=>{if(!dr||dr.id!==e.pointerId)return;row.classList.remove('dragging');dr=null;if(moved&&!reduce)mom=requestAnimationFrame(coast);};
      row.addEventListener('pointerup',end);row.addEventListener('pointercancel',end);
      row.addEventListener('dragstart',e=>e.preventDefault());
      // trackpad two-finger swipe (and shift + wheel) slides the row too
      row.addEventListener('wheel',e=>{const dx=e.shiftKey&&!e.deltaX?e.deltaY:e.deltaX;if(Math.abs(dx)<=Math.abs(e.deltaY)&&!e.shiftKey)return;e.preventDefault();cancelAnimationFrame(mom);drag[i]-=dx;vel[i]=-dx*.35;if(!raf)raf=requestAnimationFrame(upd);clearTimeout(row._wt);row._wt=setTimeout(()=>{if(!reduce)mom=requestAnimationFrame(coast);},60);},{passive:false});
    });
    sec.addEventListener('click',e=>{if(moved){e.preventDefault();e.stopPropagation();moved=false;return;}const b=e.target.closest('.mtile');if(b)S.openTrip(b.dataset.trip);},true);
    onView(sec,v=>{on=v;if(v)upd();},'200px');
    addEventListener('scroll',()=>{if(on&&!raf&&!reduce)raf=requestAnimationFrame(upd);},{passive:true});
    addEventListener('resize',upd);upd();
  });
}

/* ---------- 3. statement that lights up letter by letter as it scrolls through ---------- */
function charReveal(el){
  if(!el||reduce)return;
  el.setAttribute('aria-label',el.textContent.replace(/\s+/g,' ').trim());
  const chars=[];
  const walk=node=>{[...node.childNodes].forEach(ch=>{
    if(ch.nodeType===3){const frag=document.createDocumentFragment();ch.textContent.split(/(\s+)/).forEach(w=>{if(!w)return;if(/^\s+$/.test(w)){frag.appendChild(document.createTextNode(w));return;}
        const ws=document.createElement('span');ws.className='cw';ws.setAttribute('aria-hidden','true');[...w].forEach(c=>{const s=document.createElement('span');s.className='cc';s.textContent=c;ws.appendChild(s);chars.push(s);});frag.appendChild(ws);});
      ch.replaceWith(frag);}
    else if(ch.nodeType===1)walk(ch);});};
  walk(el);el.classList.add('chars');
  let on=false,raf=0,last=-1;
  const upd=()=>{raf=0;const r=el.getBoundingClientRect(),vh=innerHeight;const p=clamp((vh*.82-r.top)/(r.height+vh*.5),0,1);if(Math.abs(p-last)<.002)return;last=p;
    const N=chars.length,f=p*(N+8);chars.forEach((s,i)=>{s.style.opacity=(.16+.84*clamp((f-i)/8,0,1)).toFixed(3);});};
  onView(el,v=>{on=v;if(v)upd();},'100px');
  addEventListener('scroll',()=>{if(on&&!raf)raf=requestAnimationFrame(upd);},{passive:true});
}

/* ---------- 4. region portal: step through a tilting window into the next valley ---------- */
const REG=[
 {k:'Khumbu',area:'Everest region · Nepal',cat:'Everest',film:'te-ebc-14',facts:[['Highest on foot','Kala Patthar, 5,545 m'],['Permits','Sagarmatha National Park and Khumbu Pasang Lhamu Rural Municipality'],['Best season','Mar–May · Oct–Nov']]},
 {k:'Annapurna',area:'Annapurna region · Nepal',cat:'Annapurna',film:'heli-abc',facts:[['Highest on foot','Thorong La, 5,416 m'],['Permits','Annapurna Conservation Area Permit (ACAP) and TIMS card'],['Best season','Mar–May · Oct–Nov']]},
 {k:'Manaslu',area:'Gorkha district · Nepal',cat:'Manaslu',film:'tm-circuit-18',facts:[['Highest on foot','Larkya La, 5,160 m'],['Permits','Restricted Area Permit (minimum two trekkers), MCAP and ACAP'],['Best season','Mar–May · Oct–Nov']]},
 {k:'Langtang',area:'North of Kathmandu · Nepal',cat:'Langtang',film:'tl-kyanjin-10',facts:[['Highest on foot','4,984 m'],['Permits','Langtang National Park entry permit and TIMS card'],['Best season','Mar–May · Oct–Nov']]},
 {k:'Tibet',area:'Everest north side · Tibet',cat:'Tibet',film:'tibet-everest-north',facts:[['Highest point','Everest Base Camp (north), 5,200 m'],['Permits','Tibet Travel Permit, arranged with the tour'],['Best season','Apr–May · Sep–Oct']]},
 {k:'Bhutan',area:'Paro valley · Bhutan',cat:'Bhutan',film:'bhutan-tigers-nest',facts:[['Highest point','Tiger’s Nest, 3,120 m'],['Entry','Via Paro International Airport'],['Best season','Mar–May · Sep–Nov']]},
];
function portal(){
  const sec=$('#regions');if(!sec)return;
  const bg=$('.rp-bg video',sec),pv=$('#rpVid'),cv=$('#rpCanvas'),ctx=cv.getContext('2d'),btn=$('#rpPortal');
  const film=r=>`assets/vh/${r.film}${innerWidth<420?'-m':''}.mp4`,poster=r=>`assets/vp/${r.film}.webp`;
  const pimg=new Image();
  let cur=0,busy=false,visible=false,rotX=0,rotY=0,tX=0,tY=0,exp=0,mask=1,last=performance.now(),loaded=false;
  const nextOf=i=>(i+1)%REG.length;
  let nextIdx=1;
  function counts(){REG.forEach(r=>{r.n=S.cat?S.cat.filter(c=>c.region===r.cat).length:0;});}
  function render(first){
    const r=REG[cur],nx=REG[nextIdx];
    sec.dataset.region=r.k;
    $('#rpArea').textContent=r.area;$('#rpTitle').textContent=r.k;
    $('#rpFacts').innerHTML=r.facts.map(f=>`<div class="fact"><dt>${esc(f[0])}</dt><dd>${esc(f[1])}</dd></div>`).join('')+`<div class="fact"><dt>Trips here</dt><dd>${r.n||'–'}</dd></div>`;
    $('#rpCta').textContent=`See ${r.n||''} trip${r.n===1?'':'s'} in ${r.k}`.replace('  ',' ');
    $('#rpNum').textContent=`${String(nextIdx+1).padStart(2,'0')} / ${String(REG.length).padStart(2,'0')}`;$('#rpNext').textContent=nx.k;btn.setAttribute('aria-label',`Travel to ${nx.k}`);
    $('#rpList').innerHTML=REG.map((x,i)=>`<li><button type="button" data-i="${i}"${i===cur?' aria-current="true"':''}>${esc(x.k)}</button></li>`).join('');
    if(!first)retrigger($('#rpList'),'switching');
    fitTitle();
    pimg.src=poster(nx);
  }
  function fitTitle(){const t=$('#rpTitle');t.style.fontSize='';const avail=innerWidth<=760?t.parentElement.clientWidth-4:sec.clientWidth*.56;const w=t.scrollWidth;if(w>avail){const fs=parseFloat(getComputedStyle(t).fontSize);t.style.fontSize=(fs*avail/w).toFixed(1)+'px';}}
  addEventListener('resize',()=>fitTitle());if(document.fonts)document.fonts.ready.then(()=>fitTitle());
  function setPortal(i){nextIdx=i;const nx=REG[i];pv.poster=poster(nx);pv.src=film(nx);pv.load();if(AUTO&&visible)pv.play().catch(()=>{});}
  // canvas: a rounded window drawn in fake perspective; the film behind it stays locked to the section
  function resize(){const d=Math.min(devicePixelRatio||1,2),w=sec.clientWidth,h=sec.clientHeight;cv.width=w*d;cv.height=h*d;cv.style.width=w+'px';cv.style.height=h+'px';ctx.setTransform(d,0,0,d,0,0);}
  function rrPoints(w,h,r){r=Math.min(r,w/2,h/2);const P=[];const C=[[w/2-r,-h/2+r,-Math.PI/2,0],[w/2-r,h/2-r,0,Math.PI/2],[-w/2+r,h/2-r,Math.PI/2,Math.PI],[-w/2+r,-h/2+r,Math.PI,Math.PI*1.5]];
    C.forEach(([cx,cy,a0,a1])=>{for(let k=0;k<=10;k++){const a=a0+(a1-a0)*k/10;P.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r]);}});return P;}
  function drawCover(m,W,H,X=0,Y=0){const mw=m.videoWidth||m.naturalWidth,mh=m.videoHeight||m.naturalHeight;if(!mw||!mh)return false;const s=Math.max(W/mw,H/mh),w=mw*s,h=mh*s;ctx.drawImage(m,X+(W-w)/2,Y+(H-h)/2,w,h);return true;}
  function frame(now){
    if(!visible)return;requestAnimationFrame(frame);
    const dt=Math.min(40,now-last);last=now;
    rotX+=(tX-rotX)*Math.min(1,dt*.009);rotY+=(tY-rotY)*Math.min(1,dt*.009);
    const W=sec.clientWidth,H=sec.clientHeight;ctx.clearRect(0,0,W,H);
    const sr=sec.getBoundingClientRect(),br=btn.getBoundingClientRect();
    const bx=br.left-sr.left+br.width/2,by=br.top-sr.top+br.height/2,e=exp;
    const cx=bx+(W/2-bx)*e,cy=by+(H/2-by)*e,sc=e?1:mask;
    const w=(br.width+(W-br.width)*e)*sc,h=(br.height+(H-br.height)*e)*sc;
    if(w<2||h<2)return;
    const rad=(small()?70:90)*(1-e)*sc,ax=rotX*(1-e)*Math.PI/180,ay=rotY*(1-e)*Math.PI/180;
    const path=new Path2D();
    rrPoints(w,h,rad).forEach(([x,y],i)=>{const xx=x*Math.cos(ay),yy=y*Math.cos(ax),z=x*Math.sin(ay)-y*Math.sin(ax),p=850/(850+z);const X=cx+xx*p,Y=cy+yy*p;i?path.lineTo(X,Y):path.moveTo(X,Y);});
    path.closePath();
    if(e<1){ctx.save();ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=40;ctx.shadowOffsetY=18;ctx.fillStyle='#05080a';ctx.fill(path);ctx.restore();}
    ctx.save();ctx.clip(path);ctx.fillStyle='#05080a';ctx.fillRect(0,0,W,H);
    const stacked=true; // fit the film to the window (it grows with it as the window opens)
    const bw=stacked?w*1.12:W,bh=stacked?h*1.12:H,bx0=stacked?cx-bw/2-rotY*2:0,by0=stacked?cy-bh/2+rotX*2:0;
    if(!(pv.readyState>=2&&drawCover(pv,bw,bh,bx0,by0)))drawCover(pimg,bw,bh,bx0,by0);
    if(e>0){const g=ctx.createLinearGradient(0,H*.5,0,H);g.addColorStop(0,'rgba(5,8,10,0)');g.addColorStop(1,`rgba(5,8,10,${.85*e})`);ctx.fillStyle=g;ctx.fillRect(0,H*.5,W,H*.5);}
    ctx.restore();
    if(e<1){ctx.lineWidth=1.5;ctx.strokeStyle=`rgba(241,244,243,${(.6*(1-e)).toFixed(2)})`;ctx.stroke(path);}
  }
  async function travel(to){
    if(busy)return;if(to===undefined)to=nextIdx;if(to===cur)return;
    busy=true;tX=tY=0;
    if(to!==nextIdx){setPortal(to);await Promise.race([new Promise(r=>pv.addEventListener('loadeddata',r,{once:true})),wait(1500)]);}
    sec.classList.add('travelling');if(S.whoosh)S.whoosh();
    if(AUTO)pv.play().catch(()=>{});
    await tween(v=>exp=v,1100);
    // the window now fills the section: swap the background underneath it
    cur=to;bg.poster=poster(REG[cur]);bg.src=film(REG[cur]);
    try{bg.currentTime=pv.currentTime||0;}catch(e){}
    if(AUTO)await Promise.race([bg.play().catch(()=>{}),wait(900)]);
    await Promise.race([new Promise(r=>{if(bg.readyState>=2)r();else bg.addEventListener('loadeddata',r,{once:true});}),wait(1200)]);
    nextIdx=nextOf(cur);render(false);
    exp=0;mask=0;sec.classList.remove('travelling');
    setPortal(nextIdx);
    retrigger(sec,'revealing');
    await tween(v=>mask=v,1000);
    busy=false;
  }
  btn.addEventListener('click',()=>travel());
  $('#rpList').addEventListener('click',e=>{const b=e.target.closest('button');if(b)travel(+b.dataset.i);});
  $('#rpCta').addEventListener('click',e=>{e.preventDefault();const r=REG[cur];S.filterType('all');const f=$('#fRegion');if(f){f.value=r.cat;f.dispatchEvent(new Event('change'));}S.scrollToEl($('#trips'));});
  if(fine)sec.addEventListener('pointermove',e=>{if(busy)return;const r=sec.getBoundingClientRect();tY=((e.clientX-r.left)/r.width-.5)*16;tX=((e.clientY-r.top)/r.height-.5)*-14;});
  sec.addEventListener('pointerleave',()=>{tX=tY=0;});
  cursorFor(btn,'Enter');
  new ResizeObserver(resize).observe(sec);resize();
  onView(sec,v=>{visible=v;
    if(v){if(!loaded){loaded=true;bg.poster=poster(REG[0]);bg.src=film(REG[0]);setPortal(1);}
      if(AUTO){bg.play().catch(()=>{});pv.play().catch(()=>{});}last=performance.now();requestAnimationFrame(frame);}
    else{bg.pause();pv.pause();}},'150px');
  whenCat(()=>{counts();render(true);});
  render(true);retrigger(sec,'revealing');
}

/* ---------- 5. photo sphere: the archive on a globe, title held in the middle ---------- */
const SPH=['te-ebc-14','ta-abc-14','exp-ama-dablam','tm-tsum-valley-16','bhutan-essential','te-gokyo-ri-15','heli-mustang','ta-upper-mustang-19','pc-mera-peak','tl-kyanjin-10','tibet-namtso','to-lower-dolpo-14','exp-manaslu',
  'pilg-lumbini','tk-kbc-26','ktm-patan','ta-poonhill-8','exp-everest','safari-chitwan-2n3d','tl-gosainkunda-16','jeep-rara-lake','te-three-passes-21','pc-tent-peak','tibet-kailash','heli-langtang','pkr-peace-pagoda','exp-pumori','ta-mardi-himal-11'];
function sphere(){
  const sec=$('#archive');if(!sec)return;
  const stage=$('#sphStage'),world=$('#sphWorld'),orb=$('#sphOrb'),head=$('#sphH');
  let cards=[],R=300,persp=1150,visible=false,running=false;
  let spin=0,tilt=-6,dragX=0,dragY=0,vX=0,vY=0,camZ=0,idle=0;
  const pl=32;
  whenCat(()=>{
    const seen=new Set(),L=SPH.map(id=>S.tripById(id)).filter(Boolean).concat(S.cat).filter(c=>c&&c.img&&!seen.has(c.img)&&seen.add(c.img)).slice(0,innerWidth<=640?34:42),N=L.length,GA=Math.PI*(3-Math.sqrt(5));
    orb.innerHTML=L.map((c,i)=>`<button type="button" class="sc" data-trip="${c.id}" aria-label="${esc(c.name)}"><figure><img src="${esc(c.img)}" alt="" loading="lazy" decoding="async"><figcaption>${esc(c.name)}</figcaption></figure></button>`).join('');
    cards=$$('.sc',orb).map((el,i)=>{const y=1-(i/(N-1))*2,rad=Math.sqrt(Math.max(0,1-y*y)),th=i*GA,x=Math.cos(th)*rad,z=Math.sin(th)*rad;
      return {el,x,y,z,lat:Math.asin(y)*180/Math.PI,lon:Math.atan2(x,z)*180/Math.PI,o:-1,d:-1};});
    layout();
  });
  function layout(){
    const W=stage.clientWidth,H=stage.clientHeight,w=innerWidth;
    const hr=w<=380?.36:w<=640?.37:.45,wr=w<=380?.38:w<=640?.39:.5,fl=w<=380?104:w<=640?118:150;
    R=Math.max(fl,Math.min(440,H*hr,W*wr));const cw=Math.round(Math.max(58,R*(w<=380?.34:w<=640?.36:.38)));
    persp=w<=380?620:w<=640?760:w<=900?920:1150;stage.style.perspective=persp+'px';
    sec.style.setProperty('--cw',cw+'px');
    cards.forEach(c=>{c.el.style.transform=`translate3d(${(c.x*R).toFixed(1)}px,${(-c.y*R).toFixed(1)}px,${(c.z*R).toFixed(1)}px) rotateY(${c.lon.toFixed(2)}deg) rotateX(${c.lat.toFixed(2)}deg)`;});
  }
  let lw=0,lh=0;addEventListener('resize',()=>{if(Math.abs(innerWidth-lw)<20&&Math.abs(innerHeight-lh)<20)return;lw=innerWidth;lh=innerHeight;layout();});lw=innerWidth;lh=innerHeight;
  // drag to turn
  let drag=null;
  stage.addEventListener('pointerdown',e=>{if(e.button>0)return;const card=e.target.closest('.sc');drag={id:e.pointerId,x:e.clientX,y:e.clientY,lx:e.clientX,ly:e.clientY,card,touch:e.pointerType==='touch',cap:false,moved:0,lock:null,t:performance.now()};
    if(!drag.touch){stage.setPointerCapture(e.pointerId);drag.cap=true;}cursorDown(true);});
  stage.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.lx,dy=e.clientY-drag.ly;drag.moved=Math.max(drag.moved,Math.hypot(e.clientX-drag.x,e.clientY-drag.y));
    if(drag.touch&&!drag.lock&&drag.moved>10){const ax=Math.abs(e.clientX-drag.x),ay=Math.abs(e.clientY-drag.y);if(ay>ax*1.15){drag=null;return;}drag.lock='x';try{stage.setPointerCapture(e.pointerId);}catch(_){}}
    if(drag.touch&&!drag.lock)return;
    dragX+=dx*.13;dragY=clamp(dragY-dy*.13,-pl-tilt,pl-tilt);vX=dx*.13;vY=-dy*.13;drag.lx=e.clientX;drag.ly=e.clientY;idle=0;});
  const end=e=>{if(!drag||e.pointerId!==drag.id)return;const slop=drag.touch?14:6;if(drag.moved<slop&&drag.card)S.openTrip(drag.card.dataset.trip);if(performance.now()-drag.t>120&&drag.moved<3){vX=vY=0;}drag=null;cursorDown(false);};
  stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',e=>{drag=null;cursorDown(false);});
  stage.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const c=e.target.closest('.sc');if(c){e.preventDefault();S.openTrip(c.dataset.trip);}}});
  cursorFor(stage,'Drag');
  const M=new DOMMatrix();
  function loop(){
    if(!visible){running=false;return;}requestAnimationFrame(loop);
    if(!drag){dragX+=vX;dragY=clamp(dragY+vY,-pl-tilt,pl-tilt);vX*=.94;vY*=.94;if(Math.abs(vX)<.002)vX=0;if(Math.abs(vY)<.002)vY=0;
      idle++;if(AUTO&&idle>90)spin+=.05*Math.min(1,(idle-90)/120);}
    const r=sec.getBoundingClientRect(),vh=innerHeight;const p=clamp(1-Math.abs((r.top+r.height/2)-vh/2)/(vh*.9),0,1);
    camZ+=(p*Math.min(64,R*.12)-camZ)*.075;
    const sx=tilt+dragY,sy=spin+dragX;
    world.style.transform=`translateZ(${camZ.toFixed(1)}px) rotateY(${sy.toFixed(2)}deg) rotateX(${sx.toFixed(2)}deg)`;
    const hz=R*1.06,mag=persp/Math.max(60,persp-hz-camZ);
    head.style.transform=`rotateX(${(-sx).toFixed(2)}deg) rotateY(${(-sy).toFixed(2)}deg) translateZ(${hz.toFixed(1)}px) scale(${(1/mag).toFixed(3)})`;
    const m=M.rotate(0,sy,0).rotate(sx,0,0),near=persp*.66;
    for(const c of cards){const q=m.transformPoint({x:c.x,y:-c.y,z:c.z});const zf=q.z;
      const base=.14+.86*Math.pow((zf+1)/2,.85),dim=+(1-base).toFixed(2);
      let fade=1;const az=zf*R+camZ;if(az>near)fade=Math.max(0,1-(az-near)/190);fade=+fade.toFixed(2);
      if(dim!==c.d){c.d=dim;c.el.style.setProperty('--d',dim);}
      if(fade!==c.o){c.o=fade;c.el.style.opacity=fade;}
      c.el.tabIndex=zf>.15?0:-1;}
  }
  onView(sec,v=>{visible=v;if(v&&!running){running=true;requestAnimationFrame(loop);}},'100px');
}

/* ---------- 6. film reel: ten clips on the inside of a cylinder, drifting and draggable ---------- */
const REEL=[['te-ebc-14','Everest Base Camp'],['te-gokyo-ri-15','Gokyo Lakes'],['ta-annapurna-circuit-12','Annapurna Circuit'],['tl-kyanjin-10','Langtang Valley'],['tm-circuit-18','Manaslu Circuit'],
  ['exp-ama-dablam','Ama Dablam'],['pc-island-peak','Island Peak'],['heli-everest','Everest by helicopter'],['tibet-ebc','Tibet north face'],['bhutan-classic','Tiger’s Nest, Bhutan']];
function reel(){
  const band=$('#reelBand');if(!band)return;
  const cv=$('#reelCanvas'),ctx=cv.getContext('2d'),vid=$('#reelVid'),poster=new Image();poster.src='assets/vr/reel.webp';
  let W=0,H=0,u=1,mob=false,visible=false,off=0,vel=0,last=performance.now(),drag=null,paths=[],srcSet=false;
  const PITCH=196,LOOP=PITCH*REEL.length;
  function resize(){W=band.clientWidth;mob=W<=820;u=W/(mob?640:1440);H=Math.round(440*u);band.style.height=H+'px';const d=Math.min(devicePixelRatio||1,mob?1.5:2);cv.width=W*d;cv.height=H*d;cv.style.width=W+'px';cv.style.height=H+'px';ctx.setTransform(d,0,0,d,0,0);}
  const C=()=>(mob?320:720);           // frame centre in units
  function quad(x){ // geometry for a card centred at unpushed offset t
    const cx=C(),half=mob?318:706;
    const d=Math.min(1.25,Math.abs(x-cx)/half),w=170+48*d*d,xl=x-w/2,xr=x+w/2;
    const he=xe=>280+92*Math.pow(Math.min(1.35,Math.abs(xe-cx)/half),2.6);
    const yc=220-12*d*d;return {xl,xr,hl:he(xl),hr:he(xr),yc,d};
  }
  function rounded(p,r){const P=new Path2D();const n=p.length;const mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];const s=mid(p[n-1],p[0]);P.moveTo(s[0],s[1]);for(let i=0;i<n;i++){const a=p[i],b=p[(i+1)%n];P.arcTo(a[0],a[1],b[0],b[1],r);}P.closePath();return P;}
  // the film is copied into a buffer only when a fresh frame is ready, so a stalled or looping video never flashes blank
  const buf=document.createElement('canvas'),bx=buf.getContext('2d');let bufOk=false,lastVT=-1,skip=0;
  function grab(){if(vid.readyState<2||vid.seeking||!vid.videoWidth)return;if(vid.currentTime===lastVT&&bufOk)return;lastVT=vid.currentTime;
    if(buf.width!==vid.videoWidth){buf.width=vid.videoWidth;buf.height=vid.videoHeight;}bx.drawImage(vid,0,0);bufOk=true;}
  function frame(now){
    if(!visible)return;requestAnimationFrame(frame);
    if(mob&&(skip=(skip+1)%2))return; // phones: 30 fps is plenty for a slow drift
    const dt=Math.min(.05,(now-last)/1000);last=now;
    if(!drag){off+=vel*dt;vel*=Math.pow(.05,dt);if(Math.abs(vel)<1)vel=0;if(AUTO)off+=50*dt;}
    ctx.clearRect(0,0,W,H);paths=[];
    grab();const media=bufOk?buf:(poster.complete&&poster.naturalWidth?poster:null);
    const mw=media?(media.width||media.naturalWidth):0,mh=media?(media.height||media.naturalHeight):0;
    const order=REEL.map((r,i)=>{let t=((i*PITCH-off)%LOOP+LOOP)%LOOP;if(t>=LOOP/2)t-=LOOP;return {i,t};}).sort((a,b)=>Math.abs(b.t)-Math.abs(a.t));
    const half=mob?318:706;
    for(const {i,t} of order){
      const x=C()+t*(1+.083*Math.pow(t/half,2));const g=quad(x);
      if(g.xr*u<-20||g.xl*u>W+20)continue;
      const pts=[[g.xl,g.yc-g.hl/2],[g.xr,g.yc-g.hr/2],[g.xr,g.yc+g.hr/2],[g.xl,g.yc+g.hl/2]].map(p=>[p[0]*u,p[1]*u]);
      const P=rounded(pts,15*u);paths.push({P,i});
      ctx.save();ctx.clip(P);
      const top=Math.min(pts[0][1],pts[1][1]),bot=Math.max(pts[2][1],pts[3][1]),bw=pts[1][0]-pts[0][0],bh=bot-top;
      ctx.fillStyle='#131a20';ctx.fillRect(pts[0][0],top,bw,bh);
      if(media){const tw=mw/5,th=mh/2;let sx=(i%5)*tw,sy=Math.floor(i/5)*th,sw=tw,sh=th;
        if(bw/bh>tw/th){sh=tw*bh/bw;sy+=(th-sh)/2;}else{sw=th*bw/bh;sx+=(tw-sw)/2;}
        ctx.drawImage(media,sx,sy,sw,sh,pts[0][0],top,bw,bh);}
      const gr=ctx.createLinearGradient(0,bot-bh*.45,0,bot);gr.addColorStop(0,'rgba(8,11,14,0)');gr.addColorStop(1,'rgba(8,11,14,.78)');ctx.fillStyle=gr;ctx.fillRect(pts[0][0],bot-bh*.45,bw,bh*.45);
      // play disc and title
      const pr=13*u*(mob?1.25:1),px=pts[0][0]+14*u+pr,py=pts[3][1]-14*u-pr;
      ctx.fillStyle='rgba(241,244,243,.22)';ctx.beginPath();ctx.arc(px,py,pr,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#f1f4f3';ctx.beginPath();ctx.moveTo(px-pr*.3,py-pr*.42);ctx.lineTo(px+pr*.48,py);ctx.lineTo(px-pr*.3,py+pr*.42);ctx.closePath();ctx.fill();
      const fs=Math.max(11,Math.round(14*u*(mob?1.3:1)));ctx.font=`500 ${fs}px "Hanken Grotesk",system-ui,sans-serif`;ctx.textBaseline='bottom';
      const label=REEL[i][1];let tx=px+pr+8*u,maxw=pts[1][0]-tx-10*u;
      if(maxw>40){ctx.fillStyle='#f1f4f3';let s=label;while(ctx.measureText(s).width>maxw&&s.length>4)s=s.slice(0,-2);if(s!==label)s=s.trim()+'…';ctx.fillText(s,tx,py+fs*.55);}
      ctx.restore();
    }
  }
  function hit(e){const r=cv.getBoundingClientRect(),d=cv.width/W,x=(e.clientX-r.left)*d,y=(e.clientY-r.top)*d;for(let k=paths.length-1;k>=0;k--){if(ctx.isPointInPath(paths[k].P,x,y))return paths[k].i;}return -1;}
  cv.addEventListener('pointerdown',e=>{drag={id:e.pointerId,x:e.clientX,y:e.clientY,lx:e.clientX,t:performance.now(),moved:0,touch:e.pointerType==='touch',lock:null,v:0};if(!drag.touch)cv.setPointerCapture(e.pointerId);vel=0;cursorDown(true);});
  cv.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;drag.moved=Math.max(drag.moved,Math.hypot(e.clientX-drag.x,e.clientY-drag.y));
    if(drag.touch&&!drag.lock&&drag.moved>10){if(Math.abs(e.clientY-drag.y)>Math.abs(e.clientX-drag.x)*1.15){drag=null;cursorDown(false);return;}drag.lock='x';try{cv.setPointerCapture(e.pointerId);}catch(_){}}
    if(drag.touch&&!drag.lock)return;
    const now=performance.now(),dx=(e.clientX-drag.lx)/u;off-=dx;drag.v=-dx/Math.max(.008,(now-drag.t)/1000);drag.t=now;drag.lx=e.clientX;});
  const up=e=>{if(!drag||e.pointerId!==drag.id)return;if(drag.moved<(drag.touch?14:6)){const i=hit(e);if(i>=0)S.openTrip(REEL[i][0]);}else vel=clamp(drag.v,-3000,3000);drag=null;cursorDown(false);};
  cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',()=>{drag=null;cursorDown(false);});
  cv.style.touchAction='pan-y';
  // keyboard and screen readers get a plain list of the same films
  $('#reelList').innerHTML=REEL.map(([id,n])=>`<li><button type="button" data-trip="${id}">${esc(n)}</button></li>`).join('');
  $('#reelList').addEventListener('click',e=>{const b=e.target.closest('button');if(b)S.openTrip(b.dataset.trip);});
  cursorFor(cv,'Drag');
  new ResizeObserver(resize).observe(band);resize();
  onView(band,v=>{visible=v;
    if(v){if(!srcSet&&AUTO){srcSet=true;vid.src=small()?'assets/vr/reel-m.mp4':'assets/vr/reel.mp4';}if(AUTO)vid.play().catch(()=>{});last=performance.now();requestAnimationFrame(frame);}
    else vid.pause();},'150px');
}

/* ---------- 7. trip desk: typed greeting, quick starts that fill the form, and a film you scrub with the mouse ---------- */
function desk(){
  const box=$('#deskType');if(!box)return;
  const text=box.dataset.text;let started=false;
  const run=()=>{if(started)return;started=true;if(reduce){box.textContent=text;box.classList.add('done');return;}
    let i=0;const t=setInterval(()=>{i++;box.textContent=text.slice(0,i);if(i>=text.length){clearInterval(t);box.classList.add('done');}},34);};
  onView(box,v=>{if(v)setTimeout(run,500);});
  setTimeout(()=>$('#deskPills').classList.add('in'),reduce?0:400);
  const f=$('#planForm');
  const month=re=>{const o=[...$('#fMonth').options].find(o=>re.test(o.text));if(o)$('#fMonth').value=o.value;};
  const Q={
    ebc:()=>{f.trek.value='te-ebc-14';month(/^(October|November)/);f.fit.selectedIndex=1;f.msg.value='Everest Base Camp this autumn.';},
    first:()=>{f.trek.value='unsure';f.fit.selectedIndex=0;f.msg.value='This would be my first trek and I have under 10 days. What would you suggest?';},
    peak:()=>{f.trek.value='pc-island-peak';f.fit.selectedIndex=2;f.msg.value='I would like to climb my first 6,000 m peak.';},
    heli:()=>{f.trek.value='heli-everest';f.msg.value='Only a few days free. Is a helicopter day to Everest possible?';},
    abroad:()=>{f.trek.value='bhutan-classic';f.msg.value='Interested in Bhutan or Tibet as well as Nepal.';},
    private:()=>{f.msg.value='A private trip on my own dates, please.';}
  };
  $('#deskPills').addEventListener('click',e=>{const b=e.target.closest('[data-q]');if(!b)return;Q[b.dataset.q]();
    $$('#deskPills [data-q]').forEach(x=>x.setAttribute('aria-pressed',x===b));f.classList.remove('flash');void f.offsetWidth;f.classList.add('flash');f.name.focus({preventScroll:true});});
  // background film: scrub with the mouse on desktop, a quiet loop elsewhere
  const v=$('#planFilm');if(!v)return;
  if(fine&&AUTO){
    let prevX=null,target=0,seeking=false,inView=false;onView($('#plan'),x=>{if(x&&!v.getAttribute('src')){v.preload='auto';v.src=v.dataset.scrub;}},'700px');
    v.addEventListener('loadeddata',()=>{v.style.opacity=1;},{once:true});
    const seek=()=>{if(!v.duration)return;if(Math.abs(v.currentTime-target)<.02){seeking=false;return;}seeking=true;v.currentTime=target;};
    v.addEventListener('seeked',()=>{seeking=false;if(Math.abs(v.currentTime-target)>.03)seek();});
    onView($('#plan'),x=>inView=x);
    addEventListener('mousemove',e=>{if(!inView||!v.duration){prevX=e.clientX;return;}if(prevX===null){prevX=e.clientX;return;}const d=e.clientX-prevX;prevX=e.clientX;
      target=clamp(target+d/innerWidth*.8*v.duration,0,v.duration-.05);if(!seeking)seek();},{passive:true});
  }else if(AUTO){
    v.loop=true;onView(v,x=>{if(x){if(!v.getAttribute('src'))v.src=small()?v.dataset.m:v.dataset.src;v.play().then(()=>v.style.opacity=1).catch(()=>{});}else v.pause();},'120px');
  }
}

/* ---------- 8. site menu: every section grouped, plus a quick trip search ---------- */
function menu(){
  const btn=$('#menuBtn'),m=$('#menu');if(!btn||!m)return;
  let lastFocus=null;
  const open=on=>{if(on===!m.hidden)return;
    if(on){lastFocus=document.activeElement;m.hidden=false;requestAnimationFrame(()=>m.classList.add('open'));document.documentElement.classList.add('menu-open');btn.setAttribute('aria-expanded','true');btn.querySelector('.ml').textContent='Close';setTimeout(()=>{if(fine)$('#mSearch').focus();},150);}
    else{m.classList.remove('open');document.documentElement.classList.remove('menu-open');btn.setAttribute('aria-expanded','false');btn.querySelector('.ml').textContent='Menu';setTimeout(()=>{m.hidden=true;},reduce?0:350);if(lastFocus)lastFocus.focus({preventScroll:true});}};
  btn.addEventListener('click',()=>open(m.hidden));
  addEventListener('keydown',e=>{if(e.key==='Escape'&&!m.hidden)open(false);});
  m.addEventListener('click',e=>{
    const a=e.target.closest('a');if(!a)return;e.preventDefault();open(false);
    const go=()=>{
      if(a.dataset.type){S.filterType(a.dataset.type);S.scrollToEl($('#trips'));return;}
      if(a.dataset.tab){const t=document.getElementById(a.dataset.tab);if(t)t.click();S.scrollToEl($('#hub'));return;}
      const el=$(a.getAttribute('href'));if(el)S.scrollToEl(el);};
    setTimeout(go,reduce?0:200);});
  // quick search over the catalogue
  const q=$('#mSearch'),out=$('#mResults');
  q.addEventListener('input',()=>{const v=q.value.trim().toLowerCase();if(!v||!S.cat){out.innerHTML='';return;}
    const L=S.cat.filter(c=>(c.name+' '+c.region+' '+c.type).toLowerCase().includes(v)).slice(0,6);
    out.innerHTML=L.length?L.map(c=>`<button type="button" data-id="${c.id}"><img src="${esc(c.img)}" alt="" loading="lazy"><span><b>${esc(c.name)}</b><small>${esc(c.region)} · ${esc(c.dur)} · from US$${fmt(c.price)}</small></span></button>`).join(''):'<p>No trips match. Try a region such as Everest, Annapurna or Mustang.</p>';});
  out.addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(!b)return;open(false);setTimeout(()=>S.openTrip(b.dataset.id),reduce?0:250);});
  // back to top
  const tt=$('#toTop');let shown=false;
  // hidden while a 3D view fills the bottom of the screen, so it never sits on the map controls
  const busy=['#nstage','#exSticky','#regions','#archive','#films'].map(q=>document.querySelector(q)).filter(Boolean);
  addEventListener('scroll',()=>{const y=innerHeight-30;const over=busy.some(el=>{const r=el.getBoundingClientRect();return r.top<y&&r.bottom>y;});
    const on=scrollY>innerHeight*2&&!over;if(on!==shown){shown=on;tt.classList.toggle('on',on);}},{passive:true});
  tt.addEventListener('click',()=>scrollTo({top:0,behavior:reduce?'auto':'smooth'}));
}

menu();preloader();marquee();charReveal($('#guide .statement'));portal();sphere();reel();desk();
})();
