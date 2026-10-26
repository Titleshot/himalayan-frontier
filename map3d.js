/* Himalayan Frontier – scroll-driven 3D route explorer on real elevation data and Sentinel-2 imagery. */
import * as THREE from 'three';

const S = window.HF;
const $ = s => document.querySelector(s);
const stage=$('#stage'), canvas=$('#map3d'), labelsEl=$('#labels'), loadingEl=$('#loading'), track=$('#exTrack'), sticky=$('#exSticky'), sprog=$('#sprog');
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)), lerp=(a,b,t)=>a+(b-a)*t;
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const fmt=n=>Math.round(n).toLocaleString('en-US');
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const narrow=()=>innerWidth<980;
const EX=1.25;

let renderer;
try{ renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'}); }
catch(e){ document.documentElement.classList.add('no-gl'); loadingEl.hidden=true; }

if(renderer){
renderer.setPixelRatio(S.LITE?1:Math.min(devicePixelRatio,narrow()?1.5:2));
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(45,1,0.05,900);
const sun=new THREE.Vector3(0.46,0.56,0.69).normalize();   // late-morning sun from the south-east, close to the satellite pass
const floatLinear=renderer.extensions.has('OES_texture_float_linear');
const SHADOW_STEPS=narrow()?12:18;

const GL=`
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
vec3 skyC(vec3 d,vec3 s){float h=clamp(d.y,0.,1.);vec3 c=mix(vec3(.46,.52,.60),vec3(.10,.20,.38),pow(h,.5));float g=max(dot(normalize(d),s),0.);return c+vec3(1.,.86,.66)*(pow(g,48.)*.9+pow(g,6.)*.12);}
`;
// sky dome with a soft sun glow
scene.add(new THREE.Mesh(new THREE.SphereGeometry(600,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{uSun:{value:sun}},
  vertexShader:`varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position.z=gl_Position.w;}`,
  fragmentShader:GL+`uniform vec3 uSun;varying vec3 vD;void main(){gl_FragColor=vec4(pow(aces(skyC(normalize(vD),uSun)*1.05),vec3(1./2.2)),1.);}`})));

const terrainMat=new THREE.ShaderMaterial({
  uniforms:{uTex:{value:null},uNrm:{value:null},uDem:{value:null},uK:{value:new THREE.Vector2(1,1)},uSun:{value:sun},uFog:{value:.0065}},
  vertexShader:`varying vec2 vUv;varying vec3 vP;varying vec3 vN;void main(){vUv=uv;vP=position;vN=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:GL+`uniform sampler2D uTex;uniform sampler2D uNrm;uniform sampler2D uDem;uniform vec2 uK;uniform vec3 uSun;uniform float uFog;varying vec2 vUv;varying vec3 vP;varying vec3 vN;
  float H(vec2 xz){return texture2D(uDem,xz/uK+.5).r*${(EX/1000).toFixed(5)};}
  void main(){
    vec3 nm=texture2D(uNrm,vUv).xyz*2.-1.;
    vec3 n=normalize(mix(normalize(vN),normalize(nm),.75));
    vec3 alb=pow(texture2D(uTex,vUv).rgb,vec3(2.2));
    // soft cast shadows: march the height field toward the sun
    float sh=1.,t=.05;vec3 p=vP+vec3(0.,.012,0.);
    for(int i=0;i<${SHADOW_STEPS};i++){vec3 q=p+uSun*t;vec2 u=q.xz/uK+.5;if(u.x<0.||u.x>1.||u.y<0.||u.y>1.)break;float d=q.y-H(q.xz);sh=min(sh,10.*d/t);if(sh<0.)break;t*=${narrow()?'1.45':'1.32'};}
    sh=clamp(sh,0.,1.);sh=sh*sh*(3.-2.*sh);
    float dif=max(dot(n,uSun),0.)*sh;
    float sky=.5+.5*n.y;
    // the satellite photo already carries the real light, so relight it gently and keep its colours honest
    vec3 col=alb*(vec3(1.,.97,.93)*mix(.58,1.12,dif)+vec3(.10,.13,.18)*(1.-dif)*.6)*(.92+.08*sky);
    col=mix(vec3(dot(col,vec3(.299,.587,.114))),col,.86);
    // aerial perspective: blue haze that thickens with distance and toward the valley floors
    vec3 V=vP-cameraPosition;float d=length(V);
    float f=1.-exp(-d*uFog*(1.25-clamp(vP.y/9.,0.,1.)*.6));
    vec3 hz=skyC(normalize(vec3(V.x,max(V.y,0.)*.25+.04,V.z)),uSun)*.78;
    col=mix(col,hz,clamp(f,0.,.92));
    gl_FragColor=vec4(pow(aces(col*1.2),vec3(1./2.2)),1.);
  }`});

/* ------------ region loading ------------ */
const regions={},R_hd={},MS=narrow()?'-m':''; // phones get lighter terrain files
const wantHD=n=>{if(narrow()||S.LITE||!R_hd[n])return;const f=R_hd[n];R_hd[n]=null;setTimeout(f,1500);};
const texLoader=new THREE.TextureLoader();
const loadTex=url=>new Promise((res,rej)=>texLoader.load(url,res,undefined,rej));
async function loadRegion(name){
  if(regions[name]) return regions[name];
  const [j,blob,tex,nrm]=await Promise.all([
    fetch(`assets/geo/${name}.json`).then(r=>r.json()),
    fetch(`assets/geo/${name}-dem${MS}.png`).then(r=>r.blob()),
    loadTex(`assets/geo/${name}-tex${MS}.jpg`),loadTex(`assets/geo/${name}-nrm${MS}.jpg`)
  ]);
  const bmp=await createImageBitmap(blob,{colorSpaceConversion:'none',premultiplyAlpha:'none'});
  const cv=document.createElement('canvas');cv.width=bmp.width;cv.height=bmp.height;
  const cx=cv.getContext('2d',{willReadFrequently:true});cx.drawImage(bmp,0,0);
  const px=cx.getImageData(0,0,bmp.width,bmp.height).data;const W=bmp.width,H=bmp.height;
  const dem=new Float32Array(W*H);for(let i=0;i<dem.length;i++)dem[i]=px[i*4]*256+px[i*4+1];
  const an=renderer.capabilities.getMaxAnisotropy();
  for(const t of [tex,nrm]){t.anisotropy=an;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;}
  const demTex=new THREE.DataTexture(dem,W,H,THREE.RedFormat,THREE.FloatType);
  demTex.minFilter=demTex.magFilter=floatLinear?THREE.LinearFilter:THREE.NearestFilter;demTex.needsUpdate=true;
  const R={name,j,dem,W,H,KX:j.KX,KZ:j.KZ,tex,nrm,demTex};
  R.h=(x,z)=>{const fx=clamp((x/R.KX+.5)*(W-1),0,W-1.001),fz=clamp((z/R.KZ+.5)*(H-1),0,H-1.001);const x0=fx|0,z0=fz|0,a=fx-x0,b=fz-z0,i=z0*W+x0;
    return dem[i]*(1-a)*(1-b)+dem[i+1]*a*(1-b)+dem[i+W]*(1-a)*b+dem[i+W+1]*a*b;};
  R.y=(x,z)=>R.h(x,z)/1000*EX;
  const step=1, sx=Math.floor((W-1)/step), sz=Math.floor((H-1)/step);
  const g=new THREE.PlaneGeometry(R.KX,R.KZ,sx,sz);g.rotateX(-Math.PI/2);
  const pos=g.attributes.position;
  for(let k=0;k<pos.count;k++)pos.setY(k,R.y(pos.getX(k),pos.getZ(k)));
  g.computeVertexNormals();
  R.mesh=new THREE.Mesh(g,terrainMat);
  // sharper imagery on large screens, swapped in once it arrives
  R_hd[name]=()=>loadTex(`assets/geo/${name}-tex-hd.jpg`).then(hd=>{hd.anisotropy=an;hd.minFilter=THREE.LinearMipmapLinearFilter;R.tex=hd;if(cur===R)terrainMat.uniforms.uTex.value=hd;}).catch(()=>{});
  regions[name]=R;return R;
}

/* ------------ trek objects ------------ */
let R=null, cur=null, TK=null; const group=new THREE.Group(); scene.add(group);
const routeMat=new THREE.MeshBasicMaterial({color:0xffb26b,depthWrite:true,polygonOffset:true,polygonOffsetFactor:-4});
const edgeMat=new THREE.MeshBasicMaterial({color:0x0b0f12,transparent:true,opacity:.5,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
const ghostMat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.45,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4});
const gc=document.createElement('canvas');gc.width=gc.height=128;{const x=gc.getContext('2d');const gr=x.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.16,'rgba(255,190,130,1)');gr.addColorStop(.42,'rgba(234,140,70,.35)');gr.addColorStop(1,'rgba(234,140,70,0)');x.fillStyle=gr;x.fillRect(0,0,128,128);}
const head=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(gc),depthTest:false,transparent:true}));head.renderOrder=10;scene.add(head);
// overnight-stop markers: small glowing posts
const postGeo=new THREE.CylinderGeometry(.012,.012,1,6);postGeo.translate(0,.5,0);
const postMat=new THREE.MeshBasicMaterial({color:0xffd2a8,transparent:true,opacity:.85});

function buildTrek(trekId){
  group.clear();
  const t=S.data.treks.find(x=>x.id===trekId); const rt=R.j.treks[trekId];
  group.add(R.mesh);
  const pts=rt.path.map(p=>new THREE.Vector3(p[0],Math.max(p[2],R.h(p[0],p[1]))/1000*EX+.03,p[1]));
  const curve=new THREE.CatmullRomCurve3(pts,false,'centripetal',.2);
  const rad=Math.max(.03,R.KX/1100), segs=pts.length*2;
  const tube=new THREE.TubeGeometry(curve,segs,rad,6,false);
  group.add(new THREE.Mesh(new THREE.TubeGeometry(curve,segs,rad*1.9,6,false),edgeMat));
  group.add(new THREE.Mesh(tube,ghostMat));
  const bright=new THREE.Mesh(tube.clone(),routeMat);bright.geometry.setDrawRange(0,0);group.add(bright);
  // posts at overnight stops
  const seen=new Set();
  t.itin.forEach(d=>d.via.forEach(n=>{const w=R.j.wps[n];if(!w||seen.has(n))return;seen.add(n);const m=new THREE.Mesh(postGeo,postMat);m.position.set(w[0],R.y(w[0],w[1]),w[1]);m.scale.y=.32;group.add(m);}));
  TK={t,rt,pts,curve,bright,segs,cum:rt.cum,km:rt.cum[rt.cum.length-1]};
  const a=pts[0],b=pts[Math.floor(pts.length*.55)];TK.heading=Math.atan2(-(b.x-a.x),-(b.z-a.z));
  const bb=new THREE.Box3().setFromPoints(pts);TK.center=bb.getCenter(new THREE.Vector3());TK.size=bb.getSize(new THREE.Vector3());
  // days that move on the map get a share of the scroll
  TK.mapDays=[];t.itin.forEach((d,i)=>{if(d.via.length)TK.mapDays.push(i);});
  buildLabels();drawProfile();layoutTrack();
}

/* ------------ labels ------------ */
let labels=[];
function mkLabel(cls,html,v,prio,extra={}){const d=document.createElement('div');d.className='lbl '+cls;d.innerHTML=html;labelsEl.appendChild(d);const L={el:d,v,prio,w:0,h:0,...extra};labels.push(L);return L;}
function buildLabels(){
  labelsEl.innerHTML='';labels=[];
  const t=TK.t, wps=R.j.wps;
  const seen=new Set();let si=0;
  t.itin.forEach(d=>d.via.forEach(n=>{if(seen.has(n)||!wps[n])return;seen.add(n);const w=wps[n];
    mkLabel('stop',`${n}<small>${fmt(w[2])} m</small>`,new THREE.Vector3(w[0],R.y(w[0],w[1])+.36,w[1]),300,{name:n,si:si++});}));
  R.j.peaks.forEach(p=>mkLabel('peak',`${p[0]}<small>${fmt(p[3])} m</small>`,new THREE.Vector3(p[1],p[4]/1000*EX+.06,p[2]),200+p[3]/100,{peak:true}));
  R.j.rivers.forEach(r=>mkLabel('river',r[0],new THREE.Vector3(r[1],R.y(r[1],r[2])+.03,r[2]),120));
  requestAnimationFrame(()=>labels.forEach(L=>{L.w=L.el.offsetWidth;L.h=L.el.offsetHeight;}));
}
const pv=new THREE.Vector3(), tmp=new THREE.Vector3();
function occluded(p){const c=camera.position;for(let k=1;k<16;k++){const t=k/16;tmp.lerpVectors(c,p,t);if(R.y(tmp.x,tmp.z)>tmp.y+.015)return true;}return false;}
let blockers=[];
function measureBlockers(){
  const sr=stage.getBoundingClientRect();
  blockers=['#exNow','.profile','.ctrl.tr','.ctrl.br','#hint','#attr'].map(s=>document.querySelector(s)).filter(e=>e&&e.offsetParent).map(e=>{const r=e.getBoundingClientRect();return [r.left-sr.left-4,r.top-sr.top-4,r.right-sr.left+4,r.bottom-sr.top+4];});
}
let frameN=0;
function updateLabels(curName){
  const w=stage.clientWidth,h=stage.clientHeight,placed=[...blockers];
  const order=labels.map(L=>[L.name===curName?1000:L.prio,L]).sort((a,b)=>b[0]-a[0]);
  const occ=frameN%3===0;
  // keep the map readable: only a handful of names at a time, fewer on phones, and only nearby stops while walking
  const nar=narrow(),fol=!!curName,curL=labels.find(L=>L.name===curName),ci=curL?curL.si:-1;
  const cap={stop:nar?(fol?2:3):(fol?4:5),peak:nar?1:2,river:nar||fol?0:1},cnt={stop:0,peak:0,river:0};
  for(const [p,L] of order){
    pv.copy(L.v).project(camera);
    let ok=pv.z<1&&pv.x>-1&&pv.x<1&&pv.y>-1&&pv.y<1;
    const kind=L.peak?'peak':L.si!=null?'stop':'river';
    if(ok&&L.name!==curName){if(cnt[kind]>=cap[kind])ok=false;else if(fol&&kind==='stop'&&ci>=0&&(L.si<ci-1||L.si>ci+(nar?1:2)))ok=false;}
    const x=(pv.x*.5+.5)*w,y=(-pv.y*.5+.5)*h;
    if(ok&&L.peak&&camera.position.distanceTo(L.v)>TK.size.length()*2.2)ok=false;
    if(ok&&occ){const o=occluded(L.v);L.occN=o===L.occ?0:(L.occN||0)+1;if(L.occ===undefined||L.occN>=2){L.occ=o;L.occN=0;}}
    if(ok&&L.occ&&L.name!==curName)ok=false;
    let rx=x-L.w/2, ry=y-L.h-(L.peak?4:8);
    if(L.el.classList.contains('river'))ry=y-L.h/2;
    const rect=[rx,ry,rx+L.w,ry+L.h];
    if(ok&&(rect[0]<4||rect[2]>w-4||rect[1]<4||rect[3]>h-4))ok=false;
    if(ok)for(const q of placed){if(rect[0]<q[2]+3&&rect[2]>q[0]-3&&rect[1]<q[3]+2&&rect[3]>q[1]-2){ok=(L.name===curName);break;}}
    if(ok&&L.name!==curName)cnt[kind]++;
    if(ok){placed.push(rect);L.el.style.transform=`translate(${rx.toFixed(1)}px,${ry.toFixed(1)}px)`;}
    L.el.classList.toggle('on',ok);
    L.el.classList.toggle('cur',L.name===curName);
  }
}

/* ------------ profile ------------ */
const prof=$('#prof');let profDot=null,profFill=null;
function drawProfile(){
  const P=TK.rt.path,cum=TK.cum,km=TK.km;let lo=1e9,hi=0;P.forEach(p=>{lo=Math.min(lo,p[2]);hi=Math.max(hi,p[2]);});
  lo=Math.floor((lo-100)/1000)*1000;hi=Math.ceil((hi+100)/1000)*1000;
  const X=d=>d/km*1000,Y=e=>4+(1-(e-lo)/(hi-lo))*62;TK.X=X;
  let d='';P.forEach((p,i)=>d+=(i?'L':'M')+X(cum[i]).toFixed(1)+' '+Y(p[2]).toFixed(1));
  let ticks='';const used=new Set();
  TK.rt.dayIdx.forEach((ix,i)=>{if(used.has(ix))return;used.add(ix);const xx=X(cum[ix]);ticks+=`<line x1="${xx}" x2="${xx}" y1="${Y(P[ix][2])}" y2="68" stroke="rgba(241,244,243,.22)" vector-effect="non-scaling-stroke"/><text x="${xx}" y="79" text-anchor="middle">${i+1}</text>`;});
  let grid='';for(let a=lo;a<=hi;a+=1000)grid+=`<text x="2" y="${Y(a)-2}">${fmt(a)}</text>`;
  prof.innerHTML=`<defs><clipPath id="pclip"><rect id="pclipr" x="0" y="0" width="0" height="80"/></clipPath><linearGradient id="pgf" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#eaa66c" stop-opacity=".45"/><stop offset="1" stop-color="#eaa66c" stop-opacity="0"/></linearGradient></defs>
  ${grid}${ticks}<path d="${d}" fill="none" stroke="rgba(241,244,243,.4)" stroke-width="1.2" vector-effect="non-scaling-stroke"/>
  <g clip-path="url(#pclip)"><path d="${d}L1000 68L0 68Z" fill="url(#pgf)"/><path d="${d}" fill="none" stroke="#eaa66c" stroke-width="2" vector-effect="non-scaling-stroke"/></g>
  <line id="pdot" x1="0" x2="0" y1="0" y2="68" stroke="#f1f4f3" stroke-width="1.5" vector-effect="non-scaling-stroke"/>`;
  profDot=$('#pdot');profFill=$('#pclipr');
}

/* ------------ scroll track: the page scroll walks the route ------------ */
let introPx=0, dayPx=0;
const navh=()=>parseInt(getComputedStyle(document.documentElement).getPropertyValue('--navh'))||72;
/* The walk is opt-in. By default the section is an ordinary block: Play, the day list and the
   arrows move a virtual position (vpx). "Scroll mode" stretches the section so that page
   scrolling walks the route; it switches itself off once the reader scrolls past or away. */
let walk=false, vpx=0, vTarget=0, near=false;
const exSec=document.getElementById('explore'), hintEl=document.getElementById('hint'), cta=document.getElementById('exCta'), bWalk=document.getElementById('bWalk');
function layoutTrack(){
  if(!TK)return;
  const vh=innerHeight;
  introPx=vh*.3; dayPx=vh*(narrow()?.34:.4);
  track.style.height=walk?(sticky.offsetHeight+trackLen()+vh*.1)+'px':'';
}
function scrolled(){return navh()-track.getBoundingClientRect().top;}
function trackLen(){return introPx+TK.mapDays.length*dayPx;}
function trackTop(){return track.getBoundingClientRect().top+scrollY-navh();}
function curPx(){return walk?clamp(scrolled(),0,trackLen()):vpx;}
/* scroll px → {s: km along route, k: map-day slot, w: overview→follow blend} */
function routeAt(px){
  if(px<introPx)return {s:0,k:-1,w:sstep(introPx*.35,introPx,px)};
  const k=Math.min(TK.mapDays.length-1,Math.floor((px-introPx)/dayPx)), f=clamp((px-introPx-k*dayPx)/dayPx,0,1);
  const di=TK.mapDays[k], prev=k>0?TK.mapDays[k-1]:-1;
  const sA=prev<0?0:TK.cum[TK.rt.dayIdx[prev]], sB=TK.cum[TK.rt.dayIdx[di]];
  return {s:lerp(sA,sB,ease(clamp(f/.72,0,1))),k,w:1};
}
function dayPos(i){
  if(!TK)return 0;
  let k=TK.mapDays.findIndex(d=>d>=i);
  if(k<0)k=TK.mapDays.length-1;
  if(TK.mapDays[k]!==i&&!TK.t.itin[i].via.length){ // off-map day: rest at the previous stop
    k=TK.mapDays.filter(d=>d<i).length-1;if(k<0)return 2;
  }
  return introPx+k*dayPx+dayPx*.8;
}
function scrollForDay(i){return trackTop()+dayPos(i);}
function inView(){const r=stage.getBoundingClientRect();return r.top>-r.height*.25&&r.bottom<innerHeight+r.height*.25;}
function bringIntoView(){if(!inView())S.scrollToEl(exSec.querySelector('.ex-track'));}
function setWalk(on){
  if(on===walk||!TK)return;
  const html=document.documentElement;html.style.overflowAnchor='none';
  if(on){
    const from=vpx;walk=true;exSec.classList.add('walking');layoutTrack();if(R)wantHD(R.name);
    scrollToPx(trackTop()+Math.max(2,from),true);
  }else{
    const r=track.getBoundingClientRect(),sh=sticky.offsetHeight,before=track.offsetHeight;
    vpx=vTarget=clamp(scrolled(),0,trackLen());
    walk=false;exSec.classList.remove('walking');layoutTrack();
    const diff=before-track.offsetHeight;
    if(r.top<navh()&&r.bottom>navh()+sh)scrollTo({top:trackTop(),behavior:'instant'});      // map was pinned: keep it where it is
    else if(r.bottom<=navh()+sh)scrollTo({top:scrollY-diff,behavior:'instant'});              // already past it: keep the page still
  }
  updUI();
  requestAnimationFrame(()=>requestAnimationFrame(()=>{html.style.overflowAnchor='';}));
}
function updUI(){
  hintEl.textContent=walk?'Scroll to walk · drag to look around':'Choose a trek to start · drag to look around';
}
updUI();
function scrollToPx(y,smooth){scrollTo({top:Math.max(0,y),behavior:smooth&&!reduce?'smooth':'instant'});}
/* glide: a timed page scroll, so the map visibly walks from one stop to the next */
let gliding=0;
function glide(y,ms){
  y=Math.max(0,y);const y0=scrollY,d=y-y0;if(Math.abs(d)<2)return;
  if(reduce){scrollTo({top:y,behavior:'instant'});return;}
  const id=++gliding,dur=ms||clamp(Math.abs(d)/dayPx*1500,500,2600),t0=performance.now();
  const f=now=>{if(id!==gliding)return;const t=Math.min(1,(now-t0)/dur),e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;scrollTo({top:y0+d*e,behavior:'instant'});if(t<1)requestAnimationFrame(f);else gliding=0;};
  requestAnimationFrame(f);
}
const stopGlide=()=>{if(gliding)gliding=0;};
['wheel','touchstart','keydown','pointerdown'].forEach(ev=>addEventListener(ev,stopGlide,{passive:true}));
function dayStops(){return TK.mapDays.map((d,k)=>introPx+k*dayPx+dayPx*.8);}
/* the walk switches itself off once the reader scrolls well past it, or back above it, so the page stays short for everyone else */
let leaveT=0;
function checkLeave(){if(!walk||playing||gliding)return;clearTimeout(leaveT);leaveT=setTimeout(()=>{if(!walk||playing||gliding||!TK)return;const r=track.getBoundingClientRect();if(r.top>innerHeight*1.1||scrolled()>trackLen()+innerHeight*.9)setWalk(false);},350);}
addEventListener('scroll',checkLeave,{passive:true});
function nextStop(){if(!TK)return;const px=scrolled();const t=dayStops().find(s=>s>px+8);if(t!=null)glide(trackTop()+t);else S.scrollToEl(document.getElementById('trip'));}

/* ------------ camera rig ------------ */
const cam={target:new THREE.Vector3(),az:0,pol:.9,rad:8};
const user={az:0,pol:0,zoom:1};
let headS=0, curName='', curDay=0, smoothHeading=0, blendW=0;
function idxAtS(s){const c=TK.cum;let lo=0,hi=c.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(c[m]<s)lo=m;else hi=m;}return lo;}
function posAtS(s,out){const c=TK.cum,i=idxAtS(s),j=Math.min(i+1,c.length-1),t=c[j]>c[i]?(s-c[i])/(c[j]-c[i]):0;return out.lerpVectors(TK.pts[i],TK.pts[j],t);}
function headingAtS(s){const a=posAtS(Math.max(0,s-1.4),new THREE.Vector3()),b=posAtS(Math.min(TK.km,s+1.4),new THREE.Vector3());if(a.distanceTo(b)<.05)return null;return Math.atan2(-(b.x-a.x),-(b.z-a.z));}
function angLerp(a,b,t){let d=((b-a+Math.PI*3)%(Math.PI*2))-Math.PI;return a+d*t;}
const wOver={target:new THREE.Vector3(),az:0,pol:0,rad:0}, wFol={target:new THREE.Vector3(),az:0,pol:0,rad:0}, want={target:new THREE.Vector3(),az:0,pol:0,rad:0};
const hp=new THREE.Vector3();
function computeWant(now){
  wOver.target.copy(TK.center);wOver.target.y=TK.center.y*.6;
  const ext=Math.max(TK.size.x,TK.size.z*(camera.aspect<1?1.4:1));
  wOver.rad=ext*(camera.aspect<1?1.5:1.0)+4; wOver.pol=.62; wOver.az=angLerp(0,TK.heading,.35)+Math.sin(now/9000)*.06;
  posAtS(headS,hp);
  wFol.target.copy(hp);
  const hd=headingAtS(headS);if(hd!==null)smoothHeading=angLerp(smoothHeading,hd,.035);
  wFol.az=angLerp(TK.heading,smoothHeading,.5)+Math.sin(headS*.09)*.25;
  wFol.pol=narrow()?1.0:1.07; wFol.rad=narrow()?8.5:6.6;
  const w=blendW;
  want.target.lerpVectors(wOver.target,wFol.target,w);
  want.az=angLerp(wOver.az,wFol.az,w)+user.az;
  want.pol=clamp(lerp(wOver.pol,wFol.pol,w)+user.pol,.12,1.36);
  want.rad=lerp(wOver.rad,wFol.rad,w)*user.zoom;
}
function applyCamera(dt,snap){
  const k=snap?1:1-Math.exp(-dt*3.4);
  cam.target.lerp(want.target,k);cam.az=angLerp(cam.az,want.az,k);cam.pol=lerp(cam.pol,want.pol,k);cam.rad=lerp(cam.rad,want.rad,k);
  const sp=Math.sin(cam.pol);
  camera.position.set(cam.target.x+Math.sin(cam.az)*sp*cam.rad,cam.target.y+Math.cos(cam.pol)*cam.rad,cam.target.z+Math.cos(cam.az)*sp*cam.rad);
  const g=R.y(camera.position.x,camera.position.z)+.35;if(camera.position.y<g)camera.position.y=g;
  camera.lookAt(cam.target);
}

/* ------------ play = gentle auto-scroll ------------ */
let playing=false;
const bPlay=$('#bPlay');
function setPlay(on){playing=on;bPlay.classList.toggle('on',on);bPlay.querySelector('span').textContent=on?'Pause':'Play';
  bPlay.querySelector('svg').innerHTML=on?'<path d="M4 2.5h3v11H4zM9 2.5h3v11H9z"/>':'<path d="M4 2.5v11l9-5.5z"/>';}
let playY=0;
function startPlay(){
  if(!TK)return;
  user.az=0;user.pol=0;user.zoom=1;
  if(walk){
    const px=scrolled();
    if(px<0||px>=trackLen()-2)scrollToPx(trackTop()+introPx*.98,false);
    playY=scrollY;
  }else if(vpx>=trackLen()-2)vpx=vTarget=0;
  setPlay(true);
}
bPlay.addEventListener('click',()=>{if(playing)setPlay(false);else if(!walk)doScroll({mode:'play',day:0});else startPlay();});
$('#ctaPlay').addEventListener('click',()=>{if(TK)doScroll({mode:'play',day:0});});
S.startWalk=(play)=>{if(TK)doScroll({mode:play?'play':'start',day:0});};
$('#ctaWalk').addEventListener('click',()=>{setPlay(false);S.scrollToEl(document.getElementById('trip'));});
bWalk.addEventListener('click',()=>{setPlay(false);S.scrollToEl(document.getElementById('trip'));});
// in scroll mode the reader's own scrolling takes over from Play
['wheel','touchstart','keydown'].forEach(ev=>addEventListener(ev,e=>{if(playing&&walk&&!(ev==='keydown'&&e.target===bPlay))setPlay(false);},{passive:true}));
$('#bOver').addEventListener('click',()=>{setPlay(false);user.az=0;user.pol=0;user.zoom=1;if(walk)scrollToPx(trackTop()+2,true);else vTarget=0;});
document.querySelector('.ex-skip').addEventListener('click',()=>{setPlay(false);});
document.getElementById('exNextDay').addEventListener('click',()=>{setPlay(false);nextStop();});
$('#bReset').addEventListener('click',()=>{user.az=0;user.pol=0;user.zoom=1;});
$('#bIn').addEventListener('click',()=>{user.zoom=clamp(user.zoom/1.35,.25,3);});
$('#bOut').addEventListener('click',()=>{user.zoom=clamp(user.zoom*1.35,.25,3);});

/* ------------ pointer: drag to look around, pinch / ctrl+wheel to zoom ------------ */
const ptrs=new Map();let pinch0=0,zoom0=1;
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')return;canvas.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});});
canvas.addEventListener('pointermove',e=>{const p=ptrs.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
  user.az-=dx*.006;user.pol=clamp(user.pol-dy*.004,-.75,.5);if(Math.abs(dx)+Math.abs(dy)>3)setPlay(false);});
const up=e=>{ptrs.delete(e.pointerId);};
canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
canvas.addEventListener('wheel',e=>{if(!(e.ctrlKey||e.metaKey))return;e.preventDefault();user.zoom=clamp(user.zoom*Math.exp(e.deltaY*.004),.25,3);},{passive:false});
// touch: horizontal swipe turns the view, vertical swipe scrolls the page (and so walks the route), two fingers zoom
let tStart=null;
canvas.style.touchAction='pan-y';
canvas.addEventListener('touchstart',e=>{if(e.touches.length===1)tStart={x:e.touches[0].clientX,y:e.touches[0].clientY,az:user.az,lock:null};else if(e.touches.length===2){const [a,b]=e.touches;pinch0=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);zoom0=user.zoom;tStart=null;}},{passive:true});
canvas.addEventListener('touchmove',e=>{
  if(e.touches.length===2&&pinch0){const [a,b]=e.touches;user.zoom=clamp(zoom0*pinch0/Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),.25,3);if(e.cancelable)e.preventDefault();return;}
  if(!tStart)return;const dx=e.touches[0].clientX-tStart.x,dy=e.touches[0].clientY-tStart.y;
  if(!tStart.lock&&Math.abs(dx)+Math.abs(dy)>8)tStart.lock=Math.abs(dx)>Math.abs(dy)?'x':'y';
  if(tStart.lock==='x'){user.az=tStart.az-dx*.008;if(e.cancelable)e.preventDefault();}
},{passive:false});
canvas.addEventListener('touchend',()=>{pinch0=0;});

/* ------------ trek / day events ------------ */
let loadToken=0, pendingScroll=null;
async function showTrek(id){
  const t=S.data.treks.find(x=>x.id===id);if(!t)return;
  const tok=++loadToken;
  if(!regions[t.region])loadingEl.hidden=false;
  let reg;try{reg=await loadRegion(t.region);}catch(e){console.error(e);loadingEl.textContent='Terrain could not load. Refresh to try again.';return;}
  if(tok!==loadToken)return;
  R=reg;cur=reg;
  terrainMat.uniforms.uTex.value=R.tex;terrainMat.uniforms.uNrm.value=R.nrm;terrainMat.uniforms.uDem.value=R.demTex;terrainMat.uniforms.uK.value.set(R.KX,R.KZ);
  loadingEl.hidden=true;setPlay(false);
  user.az=0;user.pol=0;user.zoom=1;
  buildTrek(id);smoothHeading=TK.heading;if(walk)wantHD(R.name);
  document.getElementById('ctaK').textContent=`${t.days} days · up to ${Math.round(t.max).toLocaleString('en-US')} m · ${t.area||''}`.replace(/ · $/,'');
  if(!walk)vpx=vTarget=0;layoutTrack();
  const r=routeAt(curPx());headS=r.s;blendW=r.w;
  computeWant(performance.now());applyCamera(0,true);measureBlockers();
  if(pendingScroll!==null){const d=pendingScroll;pendingScroll=null;doScroll(d);}
}
/* modes: 'start' → show the trek's overview, 'day' → go to that day, 'play' → start walking it */
function doScroll(d){
  if(!walk&&d.mode!=='tab'){
    vpx=vTarget=0;
    if(d.mode==='day'){vpx=vTarget=dayPos(d.day);}
    setWalk(true);
    if(d.mode==='play')setTimeout(startPlay,reduce?0:700);
    return;
  }
  if(walk){
    if(d.mode==='day'){const y=scrollForDay(d.day),far=Math.abs(y-scrollY)>dayPx*4;far?scrollToPx(y,true):glide(y);}
    else if(d.mode==='tab'){const px=scrolled();if(px>-innerHeight*.4&&px<trackLen()+innerHeight*.2)scrollToPx(trackTop()+2,true);} // only rewind if the reader is in the walk
    else{scrollToPx(trackTop()+2,true);if(d.mode==='play')startPlay();}
    return;
  }
  setPlay(false);
  if(d.mode==='day')vTarget=dayPos(d.day);
  else vTarget=0;
  if(d.mode!=='tab')bringIntoView();
  if(d.mode==='play'){vpx=vTarget=0;startPlay();}
}
document.addEventListener('hf:select',e=>{
  const {trek,day,changed,scroll}=e.detail;if(!S.data)return;
  const req=scroll?{mode:scroll,day}:(changed?{mode:'tab',day:0}:null);
  if(!TK&&!near&&(!req||req.mode==='tab'))return; // not loaded yet: the observer loads S.trek when the reader gets close
  if(changed||!TK||TK.t.id!==trek){pendingScroll=req;if(req&&req.mode!=='tab'&&!walk)bringIntoView();showTrek(trek);}
  else if(req)doScroll(req);
});
/* the terrain is several megabytes: fetch it only when the reader gets near the explorer */
new IntersectionObserver((es,o)=>{if(es.some(e=>e.isIntersecting)){near=true;o.disconnect();if(S.data&&!TK)showTrek(S.trek);}},{rootMargin:narrow()?'400px 0px':'900px 0px'}).observe(exSec);
document.addEventListener('hf:data',()=>{if(!TK&&near)showTrek(S.trek);});
if(S.data&&!TK&&near)showTrek(S.trek);

/* ------------ loop ------------ */
function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w<h?56:45;camera.updateProjectionMatrix();measureBlockers();layoutTrack();}
new ResizeObserver(resize).observe(stage);resize();
addEventListener('resize',()=>layoutTrack());
let visible=false,last=performance.now(),reportedDay=-1,ctaOn=null,idleN=0,lastHS=-1;const lastCP=new THREE.Vector3(1e9,0,0),lastCQ=new THREE.Quaternion();
new IntersectionObserver(es=>es.forEach(e=>{visible=e.isIntersecting;if(visible){last=performance.now();requestAnimationFrame(loop);}else{if(playing)setPlay(false);checkLeave();}}),{threshold:[0]}).observe(stage);
function loop(now){
  if(!visible)return;requestAnimationFrame(loop);
  const dt=Math.min(.05,(now-last)/1000);last=now;frameN++;
  if(!R||!TK)return;
  // auto-scroll when playing: about 3.4 s per day of walking
  if(playing&&walk){playY+=dayPx/2.6*dt;scrollTo({top:playY,behavior:'instant'});if(scrolled()>=trackLen()-2)setPlay(false);}
  else if(playing){vpx=Math.min(trackLen(),vpx+dayPx/2.6*dt);vTarget=vpx;if(vpx>=trackLen()-.5)setPlay(false);}
  else if(!walk&&vpx!==vTarget){const d=vTarget-vpx,st=Math.max(dayPx*2.2,Math.abs(d)*2.4)*dt;vpx=Math.abs(d)<=st?vTarget:vpx+Math.sign(d)*st;}
  const px=curPx();
  const showCta=!playing&&(walk?px<introPx*.5:(vpx<introPx*.5&&vTarget<introPx*.5));
  if(showCta!==ctaOn){ctaOn=showCta;cta.classList.toggle('on',showCta);exSec.classList.toggle('overview',showCta);}
  const r=routeAt(px);
  const k=1-Math.exp(-dt*(reduce?30:5.5));
  headS=lerp(headS,r.s,k);if(Math.abs(headS-r.s)<.002)headS=r.s;
  blendW=lerp(blendW,r.w,k);
  sprog.style.width=(px/trackLen()*100).toFixed(2)+'%';
  // which day are we on?
  let day=0;
  if(r.k>=0){day=TK.mapDays[r.k];const f=(px-introPx-r.k*dayPx)/dayPx;if(f<.12&&r.k>0)day=TK.mapDays[r.k-1];}
  if(day!==reportedDay){reportedDay=day;curDay=day;curName=TK.t.itin[day].focus;document.dispatchEvent(new CustomEvent('hf:reached',{detail:{trek:TK.t.id,day}}));}
  computeWant(now);applyCamera(dt,false);
  const ix=idxAtS(headS);const segIdx=Math.floor(ix/(TK.pts.length-1)*TK.segs);
  TK.bright.geometry.setDrawRange(0,headS<.01?0:segIdx*36);
  posAtS(headS,hp);head.position.copy(hp);head.position.y+=.03;
  const sc=camera.position.distanceTo(hp)*.035;head.scale.set(sc,sc,sc);head.visible=headS>.01||blendW>.5;
  if(profDot){const x=TK.X(headS);profDot.setAttribute('x1',x);profDot.setAttribute('x2',x);profFill.setAttribute('width',x);}
  const moved=camera.position.distanceToSquared(lastCP)>1e-7||Math.abs(camera.quaternion.dot(lastCQ))<1-1e-9||headS!==lastHS;
  if(!moved&&!playing&&(idleN++%12))return;
  lastCP.copy(camera.position);lastCQ.copy(camera.quaternion);lastHS=headS;
  updateLabels(blendW>.5?curName:'');
  renderer.render(scene,camera);
}
}
