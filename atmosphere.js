/* Himalayan Frontier – atmosphere: falling snow in the hero, an altitude gauge that climbs as you scroll,
   and an optional soundscape (wind and a singing bowl) made live in the browser, no audio files. */
(function(){
'use strict';
const S=window.HF||{};
const $=s=>document.querySelector(s);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine=matchMedia('(hover:hover) and (pointer:fine)').matches;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const LITE=!!S.LITE;

/* ---------- 1. snow in the hero, pushed aside by the cursor ---------- */
function snow(){
  const hero=$('#hero');if(!hero||reduce||LITE)return;
  const cv=document.createElement('canvas');cv.className='snow';cv.setAttribute('aria-hidden','true');hero.appendChild(cv);
  const ctx=cv.getContext('2d');let W=0,H=0,d=1,P=[],vis=true,mx=-999,my=-999,last=performance.now();
  const N=()=>innerWidth<700?55:130;
  function resize(){d=Math.min(devicePixelRatio||1,2);W=hero.clientWidth;H=hero.clientHeight;cv.width=W*d;cv.height=H*d;cv.style.width=W+'px';cv.style.height=H+'px';ctx.setTransform(d,0,0,d,0,0);
    while(P.length<N())P.push(flake(true));P.length=N();}
  function flake(any){const z=Math.random();return {x:Math.random()*W,y:any?Math.random()*H:-10,z,r:.6+z*2.2,vy:12+z*38,vx:0,ph:Math.random()*6.28,a:.25+z*.55};}
  hero.addEventListener('pointermove',e=>{const r=hero.getBoundingClientRect();mx=e.clientX-r.left;my=e.clientY-r.top;});
  hero.addEventListener('pointerleave',()=>{mx=my=-999;});
  function frame(now){
    if(!vis)return;requestAnimationFrame(frame);
    const dt=Math.min(.05,(now-last)/1000);last=now;const wind=Math.sin(now/5200)*14+8;
    ctx.clearRect(0,0,W,H);
    for(const p of P){
      p.ph+=dt*(.6+p.z);p.vx+=(wind*(.4+p.z)-p.vx)*dt*.8;
      const dx=p.x-mx,dy=p.y-my,dd=dx*dx+dy*dy;if(dd<12000){const f=(1-dd/12000)*260*dt;p.x+=dx/Math.sqrt(dd+1)*f;p.y+=dy/Math.sqrt(dd+1)*f*.4;}
      p.x+=(p.vx+Math.sin(p.ph)*6*p.z)*dt;p.y+=p.vy*dt;
      if(p.y>H+10||p.x<-20||p.x>W+20)Object.assign(p,flake(false),{x:Math.random()*W});
      ctx.globalAlpha=p.a;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,6.283);ctx.fill();
    }
    ctx.globalAlpha=1;
  }
  new ResizeObserver(resize).observe(hero);resize();
  new IntersectionObserver(es=>es.forEach(e=>{vis=e.isIntersecting;if(vis){last=performance.now();requestAnimationFrame(frame);}})).observe(hero);
}

/* ---------- 2. altitude gauge: reading the page is a climb from Kathmandu to the summit ---------- */
const ALT=[[0,'Kathmandu',1400],[.1,'Lukla',2860],[.2,'Namche Bazaar',3440],[.3,'Tengboche',3867],[.42,'Dingboche',4410],[.54,'Lobuche',4940],[.64,'Gorak Shep',5164],[.72,'Everest Base Camp',5364],[.82,'Camp 2',6400],[.91,'South Col',7906],[1,'Everest summit',8849]];
function gauge(){
  const g=document.createElement('div');g.className='alt';g.setAttribute('aria-hidden','true');
  g.innerHTML=`<div class="alt-rail"><i class="alt-fill"></i><i class="alt-dot"></i></div><div class="alt-read"><b id="altM">1,400 m</b><span id="altP">Kathmandu</span></div>`;
  document.body.appendChild(g);
  const fill=g.querySelector('.alt-fill'),dot=g.querySelector('.alt-dot'),m=g.querySelector('#altM'),pl=g.querySelector('#altP');
  let raf=0,lastName='';
  const upd=()=>{raf=0;const max=document.documentElement.scrollHeight-innerHeight;const p=clamp(scrollY/Math.max(1,max),0,1);
    let i=0;while(i<ALT.length-2&&p>ALT[i+1][0])i++;const a=ALT[i],b=ALT[i+1],f=clamp((p-a[0])/(b[0]-a[0]),0,1);
    const alt=Math.round((a[2]+(b[2]-a[2])*f)/10)*10;const name=f>.5?b[1]:a[1];
    fill.style.transform=`scaleY(${p.toFixed(4)})`;dot.style.top=(p*100).toFixed(2)+'%';g.style.setProperty('--ay',(p*100).toFixed(2)+'%');
    m.textContent=alt.toLocaleString('en-US')+' m';if(name!==lastName){lastName=name;pl.textContent=name;}
    g.classList.toggle('on',scrollY>innerHeight*.6);};
  let rt=0;
  addEventListener('scroll',()=>{if(!raf)raf=requestAnimationFrame(upd);g.classList.add('reading');clearTimeout(rt);rt=setTimeout(()=>g.classList.remove('reading'),1300);},{passive:true});addEventListener('resize',upd);upd();
}

/* ---------- 3. soundscape, made live in the browser (no audio files) ----------
   Himalayan wind; a Tibetan singing bowl now and then; tingsha cymbals; the low drone of a monastery
   dungchen in the distance; and a bamboo flute (bansuri) improvising slow phrases in raga Bhupali
   (Sa Re Ga Pa Dha), all through one shared mountain-hall reverb. */
function sound(){
  const btn=$('#sndBtn'),tgl=$('#sndTgl');if(!btn&&!tgl)return;
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC){if(btn)btn.hidden=true;if(tgl)tgl.closest('label').hidden=true;return;}
  let ac=null,master=null,dry=null,wet=null,on=false,timers=[];
  const rnd=(a,b)=>a+Math.random()*(b-a);
  function impulse(sec,decay){const n=ac.sampleRate*sec,b=ac.createBuffer(2,n,ac.sampleRate);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,decay);}return b;}
  function build(){
    ac=new AC();master=ac.createGain();master.gain.value=0;
    const comp=ac.createDynamicsCompressor();comp.threshold.value=-18;comp.ratio.value=3;master.connect(comp);comp.connect(ac.destination);
    dry=ac.createGain();dry.gain.value=.8;dry.connect(master);
    const rev=ac.createConvolver();rev.buffer=impulse(4.5,2.6);wet=ac.createGain();wet.gain.value=.55;wet.connect(rev);rev.connect(master);
    // wind: brown noise through two wandering band-passes
    const len=ac.sampleRate*6,buf=ac.createBuffer(1,len,ac.sampleRate),ch=buf.getChannelData(0);let br=0;
    for(let i=0;i<len;i++){br=(br+.02*(Math.random()*2-1))/1.02;ch[i]=br*3.2;}
    [[340,.8,.09],[820,1.3,.035]].forEach(([f,q,g])=>{
      const src=ac.createBufferSource();src.buffer=buf;src.loop=true;src.playbackRate.value=rnd(.9,1.1);
      const bp=ac.createBiquadFilter();bp.type='bandpass';bp.frequency.value=f;bp.Q.value=q;const gn=ac.createGain();gn.gain.value=g;
      const l1=ac.createOscillator(),g1=ac.createGain();l1.frequency.value=rnd(.03,.07);g1.gain.value=f*.45;l1.connect(g1);g1.connect(bp.frequency);
      const l2=ac.createOscillator(),g2=ac.createGain();l2.frequency.value=rnd(.05,.11);g2.gain.value=g*.75;l2.connect(g2);g2.connect(gn.gain);
      src.connect(bp);bp.connect(gn);gn.connect(dry);gn.connect(wet);src.start();l1.start();l2.start();
    });
  }
  const out=(node,w=.5)=>{node.connect(dry);const s=ac.createGain();s.gain.value=w;node.connect(s);s.connect(wet);};
  // singing bowl: inharmonic partials that beat slowly and ring for a long time
  function bowl(t){const f=rnd(170,215);t=t||ac.currentTime+.05;
    [[1,.13,14],[2.71,.06,9],[5.16,.03,6],[8.6,.012,4]].forEach(([k,g,d])=>{[0,1.2].forEach(det=>{const o=ac.createOscillator(),gn=ac.createGain();o.frequency.value=f*k+det;
      gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(g/2,t+.015);gn.gain.exponentialRampToValueAtTime(.0003,t+d);o.connect(gn);out(gn,.6);o.start(t);o.stop(t+d+.1);});});}
  // tingsha: two small cymbals struck together, bright and slightly detuned
  function tingsha(t){t=t||ac.currentTime+.05;
    [[2637,.05],[2671,.05],[6950,.012],[7020,.01]].forEach(([f,g])=>{const o=ac.createOscillator(),gn=ac.createGain();o.frequency.value=f;gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(g,t+.004);gn.gain.exponentialRampToValueAtTime(.0002,t+5);o.connect(gn);out(gn,.7);o.start(t);o.stop(t+5.1);});}
  // dungchen: a long monastery horn far down the valley – low, buzzy, swelling and fading
  function dungchen(t){t=t||ac.currentTime+.1;const f=rnd(55,62),dur=rnd(6,8);
    const o=ac.createOscillator();o.type='sawtooth';o.frequency.value=f;const o2=ac.createOscillator();o2.type='sawtooth';o2.frequency.value=f*1.004;
    const lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.setValueAtTime(180,t);lp.frequency.linearRampToValueAtTime(420,t+dur*.5);lp.frequency.linearRampToValueAtTime(200,t+dur);lp.Q.value=4;
    const gn=ac.createGain();gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.05,t+dur*.35);gn.gain.linearRampToValueAtTime(.045,t+dur*.75);gn.gain.linearRampToValueAtTime(0,t+dur);
    o.connect(lp);o2.connect(lp);lp.connect(gn);out(gn,.9);o.start(t);o2.start(t);o.stop(t+dur+.1);o2.stop(t+dur+.1);}
  // bansuri: breathy bamboo flute, slow phrases in raga Bhupali on D (D E F# A B), with meend (glides) and vibrato
  const SA=293.66,BHUP=[0,2,4,7,9];
  function note(deg){const oct=Math.floor(deg/5),st=BHUP[((deg%5)+5)%5]+12*oct;return SA*Math.pow(2,st/12);}
  function phrase(t){
    t=t||ac.currentTime+.1;const o=ac.createOscillator();o.type='sine';const o2=ac.createOscillator();o2.type='triangle';
    const vib=ac.createOscillator(),vg=ac.createGain();vib.frequency.value=5.2;vg.gain.value=0;vib.connect(vg);vg.connect(o.frequency);vg.connect(o2.frequency);
    const h=ac.createGain();h.gain.value=.18;o2.connect(h);
    const gn=ac.createGain();gn.gain.value=0;o.connect(gn);h.connect(gn);
    // breath: filtered noise riding along with the tone
    const nb=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
    const ns=ac.createBufferSource();ns.buffer=nb;ns.loop=true;const nf=ac.createBiquadFilter();nf.type='bandpass';nf.Q.value=2.5;const ngn=ac.createGain();ngn.gain.value=0;ns.connect(nf);nf.connect(ngn);
    const lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2600;gn.connect(lp);ngn.connect(lp);out(lp,.75);
    // a short random walk on the scale that settles back on Sa or Pa
    let deg=[0,2,3,5][Math.floor(Math.random()*4)],tt=t;const n=Math.floor(rnd(4,8));
    o.frequency.setValueAtTime(note(deg),tt);o2.frequency.setValueAtTime(note(deg),tt);nf.frequency.setValueAtTime(note(deg)*2,tt);
    gn.gain.setValueAtTime(0,tt);gn.gain.linearRampToValueAtTime(.075,tt+.35);ngn.gain.setValueAtTime(0,tt);ngn.gain.linearRampToValueAtTime(.012,tt+.25);
    for(let i=0;i<n;i++){
      const len=i===n-1?rnd(2.6,3.6):rnd(.55,1.6);
      vg.gain.setValueAtTime(0,tt+.15);vg.gain.linearRampToValueAtTime(len>1.2?note(deg)*.012:note(deg)*.005,tt+Math.min(len,1.2));
      tt+=len;if(i===n-1)break;
      deg+=[-2,-1,-1,1,1,2][Math.floor(Math.random()*6)];deg=Math.max(-2,Math.min(7,deg));
      if(i===n-2)deg=Math.random()<.6?0:3;           // resolve towards Sa or Pa
      const f=note(deg),glide=Math.random()<.35?.22:.05;  // meend now and then
      o.frequency.setTargetAtTime(f,tt-glide,glide/3);o2.frequency.setTargetAtTime(f,tt-glide,glide/3);nf.frequency.setTargetAtTime(f*2,tt-glide,glide/3);
      gn.gain.setTargetAtTime(.06,tt-.05,.03);gn.gain.setTargetAtTime(.075,tt+.05,.08);
    }
    gn.gain.setTargetAtTime(0,tt-.9,.35);ngn.gain.setTargetAtTime(0,tt-.9,.3);
    [o,o2,vib,ns].forEach(x=>{x.start(t);x.stop(tt+1.5);});
    return tt-t;
  }
  function every(fn,min,max){const loop=()=>{timers.push(setTimeout(()=>{if(on&&!document.hidden)fn();loop();},rnd(min,max)*1000));};loop();}
  function setOn(v){
    on=v;if(btn){btn.setAttribute('aria-pressed',v);btn.querySelector('span').textContent=v?'Sound on':'Sound off';}if(tgl)tgl.checked=v;
    try{localStorage.setItem('hf-sound',v?'1':'0');}catch(e){}
    if(v){if(!ac)build();ac.resume();master.gain.cancelScheduledValues(ac.currentTime);master.gain.setTargetAtTime(1.6,ac.currentTime,1.2);
      const t=ac.currentTime;bowl(t+.6);phrase(t+4);
      timers.forEach(clearTimeout);timers=[];every(bowl,22,40);every(phrase,14,26);every(tingsha,45,80);every(dungchen,55,95);}
    else if(ac){master.gain.cancelScheduledValues(ac.currentTime);master.gain.setTargetAtTime(0,ac.currentTime,.3);timers.forEach(clearTimeout);timers=[];}
  }
  if(btn)btn.addEventListener('click',()=>setOn(!on));
  if(tgl)tgl.addEventListener('change',()=>setOn(tgl.checked));
  document.addEventListener('visibilitychange',()=>{if(!ac)return;if(document.hidden)ac.suspend();else if(on)ac.resume();});
  // a soft rush of air and a cymbal for big transitions (the region portal)
  S.whoosh=()=>{if(!on||!ac)return;const t=ac.currentTime,len=ac.sampleRate*1.6,buf=ac.createBuffer(1,len,ac.sampleRate),ch=buf.getChannelData(0);for(let i=0;i<len;i++)ch[i]=Math.random()*2-1;
    const src=ac.createBufferSource();src.buffer=buf;const bp=ac.createBiquadFilter();bp.type='bandpass';bp.Q.value=1.2;bp.frequency.setValueAtTime(300,t);bp.frequency.exponentialRampToValueAtTime(2400,t+.9);bp.frequency.exponentialRampToValueAtTime(500,t+1.5);
    const g=ac.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.2,t+.6);g.gain.exponentialRampToValueAtTime(.001,t+1.55);src.connect(bp);bp.connect(g);out(g,.6);src.start(t);src.stop(t+1.6);tingsha(t+1.1);};
  // browsers allow sound only after a tap or click: if it was on last time, start on the first interaction
  let pref='0';try{pref=localStorage.getItem('hf-sound')||'0';}catch(e){}
  if(pref==='1'){if(btn)btn.classList.add('hint');const go=e=>{if(e&&e.target&&e.target.closest&&(e.target.closest('#sndBtn')||e.target.closest('#sndTgl')))return;removeEventListener('pointerdown',go,true);removeEventListener('keydown',go,true);if(!on)setOn(true);if(btn)btn.classList.remove('hint');};addEventListener('pointerdown',go,true);addEventListener('keydown',go,true);}
}

/* ---------- 4. Kathmandu clock and whether the office is open now ---------- */
function clock(){
  const els=[...document.querySelectorAll('[data-ktm]')];if(!els.length)return;
  const fmtT=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kathmandu',hour:'2-digit',minute:'2-digit',hour12:false});
  const fmtD=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kathmandu',weekday:'short'});
  const tick=()=>{const d=new Date(),t=fmtT.format(d),wd=fmtD.format(d),[h,m]=t.split(':').map(Number),mins=h*60+m;
    const open=wd!=='Sat'&&mins>=540&&mins<1080;
    els.forEach(el=>{el.querySelector('.ktm-t').textContent=`${wd} ${t}`;const s=el.querySelector('.ktm-s');s.textContent=open?'Office open now':'Office closed: we reply next working day';s.className='ktm-s '+(open?'open':'shut');});};
  tick();setInterval(tick,30000);
}

snow();gauge();sound();clock();
})();
