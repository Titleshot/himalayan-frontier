/* Himalayan Frontier – every trip on a 3D map of Nepal. Scroll tilts the camera from map view to a low, oblique view. */
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';

const S=window.HF;
const $=s=>document.querySelector(s);
const stage=$('#nstage'),canvas=$('#nepal3d'),pinsEl=$('#pins'),tip=$('#ntip'),loading=$('#nloading');
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),lerp=(a,b,t)=>a+(b-a)*t;
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const fmt=n=>Math.round(n).toLocaleString('en-US');
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const narrow=()=>innerWidth<980;
const SC=.1;          // world units = 10 km
const EX=1.7;         // vertical exaggeration: enough to read the Himalaya at country scale without spiky, cartoon peaks

let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}catch(e){loading.textContent='3D needs WebGL. Browse the trips below.';}
if(renderer){
renderer.setPixelRatio(S.LITE?1:Math.min(devicePixelRatio,narrow()?1.5:2));
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(40,1,.1,2000);
const sun=new THREE.Vector3(.5,.55,.67).normalize();
const floatLinear=renderer.extensions.has('OES_texture_float_linear');
const GL=`vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
vec3 skyC(vec3 d){float h=clamp(d.y,0.,1.);return mix(vec3(.13,.16,.20),vec3(.04,.07,.11),pow(h,.45));}`;
scene.add(new THREE.Mesh(new THREE.SphereGeometry(1500,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,
  vertexShader:`varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position.z=gl_Position.w;}`,
  fragmentShader:GL+`varying vec3 vD;void main(){gl_FragColor=vec4(pow(aces(skyC(normalize(vD))),vec3(1./2.2)),1.);}`})));

const holes=[new THREE.Vector4(),new THREE.Vector4(),new THREE.Vector4(),new THREE.Vector4()];
const BAND=.35;   // world units (3.5 km) where a high-detail patch fades into the country map
function terrainMaterial(patch){
  return new THREE.ShaderMaterial({transparent:!!patch,
  uniforms:{uTex:{value:null},uNrm:{value:null},uDem:{value:null},uK:{value:new THREE.Vector2()},uSun:{value:sun},
    uHoles:{value:holes},uHoleN:{value:0},uPDem:{value:null},uRect:{value:new THREE.Vector4()}},
  vertexShader:`varying vec2 vUv;varying vec3 vP;varying vec3 vN;void main(){vUv=uv;vP=position;vN=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:GL+`uniform sampler2D uTex,uNrm,uDem,uPDem;uniform vec2 uK;uniform vec3 uSun;uniform vec4 uHoles[4];uniform int uHoleN;uniform vec4 uRect;
  varying vec2 vUv;varying vec3 vP;varying vec3 vN;
  float H(vec2 xz){
    ${patch?`if(xz.x>uRect.x&&xz.x<uRect.z&&xz.y>uRect.y&&xz.y<uRect.w){vec2 u=(xz-uRect.xy)/(uRect.zw-uRect.xy);return texture2D(uPDem,u).r*${(EX*SC/1000).toFixed(6)};}`:''}
    return texture2D(uDem,xz/uK+.5).r*${(EX*SC/1000).toFixed(6)};}
  void main(){
    float alpha=1.;
    ${patch?`vec2 e2=min(vP.xz-uRect.xy,uRect.zw-vP.xz);alpha=smoothstep(0.,${'BAND'.replace('BAND',String(.35))},min(e2.x,e2.y));if(alpha<.01)discard;`:
    `for(int i=0;i<4;i++){if(i>=uHoleN)break;vec4 r=uHoles[i];if(vP.x>r.x+${(.35).toFixed(2)}&&vP.x<r.z-${(.35).toFixed(2)}&&vP.z>r.y+${(.35).toFixed(2)}&&vP.z<r.w-${(.35).toFixed(2)})discard;}`}
    vec3 n=normalize(mix(normalize(vN),normalize(texture2D(uNrm,vUv).xyz*2.-1.),${patch?'.45':'.55'}));
    vec3 alb=pow(texture2D(uTex,vUv).rgb,vec3(2.2));
    float sh=1.,t=${patch?'.04':'.15'};vec3 p=vP+vec3(0.,${patch?'.006':'.02'},0.);
    for(int i=0;i<${narrow()?14:22};i++){vec3 q=p+uSun*t;vec2 u=q.xz/uK+.5;if(u.x<0.||u.x>1.||u.y<0.||u.y>1.)break;float d=q.y-H(q.xz);sh=min(sh,5.*d/t);if(sh<0.)break;t*=1.3;}
    sh=clamp(sh,0.,1.);
    sh=mix(.35,1.,sh);
    float dif=max(dot(n,uSun),0.);
    // satellite photo already carries real light and shade, so relight it gently
    float L=mix(.62,1.18,dif*sh);
    vec3 col=alb*L*vec3(1.,.97,.93)+alb*vec3(.10,.13,.18)*(1.-sh);
    // aerial perspective: blue-grey haze that thickens with distance, like looking across real ranges
    vec3 V=vP-cameraPosition;float d=length(V);
    // haze builds up along low, grazing sight-lines (looking across ranges), not when looking straight down
    float graze=1.-clamp(-V.y/max(d,1e-3),0.,1.);graze*=graze;
    float f=(1.-exp(-d*.012))*graze;
    vec3 haze=vec3(.30,.37,.46);
    col=mix(col,haze*.8,clamp(f,0.,.55));
    col=mix(vec3(dot(col,vec3(.299,.587,.114))),col,.92);
    gl_FragColor=vec4(pow(aces(col*1.15),vec3(1./2.2)),alpha);
  }`});
}
const mat=terrainMaterial(false);

let M=null,ROUTES={};
const loader=new THREE.TextureLoader();
const tex=u=>new Promise((res,rej)=>loader.load(u,res,undefined,rej));
async function load(){
  const [j,blob,t,n,rts]=await Promise.all([fetch('assets/geo/nepal.json').then(r=>r.json()),fetch('assets/geo/nepal-dem-m.png').then(r=>r.blob()),tex('assets/geo/nepal-tex-m.jpg'),tex(`assets/geo/nepal-nrm${narrow()?'-m':''}.jpg`),fetch('assets/geo/routes.json').then(r=>r.json()).catch(()=>({}))]);
  ROUTES=rts;
  const bmp=await createImageBitmap(blob,{colorSpaceConversion:'none',premultiplyAlpha:'none'});
  const cv=document.createElement('canvas');cv.width=bmp.width;cv.height=bmp.height;const cx=cv.getContext('2d',{willReadFrequently:true});cx.drawImage(bmp,0,0);
  const px=cx.getImageData(0,0,bmp.width,bmp.height).data,W=bmp.width,H=bmp.height,dem=new Float32Array(W*H);
  for(let i=0;i<dem.length;i++)dem[i]=px[i*4]*256+px[i*4+1];
  const KX=j.KX*SC,KZ=j.KZ*SC,b=j.bounds;
  const an=renderer.capabilities.getMaxAnisotropy();[t,n].forEach(x=>{x.anisotropy=an;x.minFilter=THREE.LinearMipmapLinearFilter;});
  const dt=new THREE.DataTexture(dem,W,H,THREE.RedFormat,THREE.FloatType);dt.minFilter=dt.magFilter=floatLinear?THREE.LinearFilter:THREE.NearestFilter;dt.needsUpdate=true;
  M={W,H,dem,KX,KZ,b};
  M.h=(x,z)=>{const fx=clamp((x/KX+.5)*(W-1),0,W-1.001),fz=clamp((z/KZ+.5)*(H-1),0,H-1.001),x0=fx|0,z0=fz|0,a=fx-x0,c=fz-z0,i=z0*W+x0;return (dem[i]*(1-a)*(1-c)+dem[i+1]*a*(1-c)+dem[i+W]*(1-a)*c+dem[i+W+1]*a*c)/1000*EX*SC;};
  M.xz=(lat,lon)=>[((lon-b.lonW)/(b.lonE-b.lonW)-.5)*KX,((b.latN-lat)/(b.latN-b.latS)-.5)*KZ];
  const step=narrow()?(W-1)/511:1,g=new THREE.PlaneGeometry(KX,KZ,Math.floor((W-1)/step),Math.floor((H-1)/step));g.rotateX(-Math.PI/2);
  const pos=g.attributes.position;for(let k=0;k<pos.count;k++)pos.setY(k,M.h(pos.getX(k),pos.getZ(k)));g.computeVertexNormals();
  // height of the rendered (decimated) surface, so lines sit on what you see instead of sinking into it
  const gx=Math.floor((W-1)/step),gz=Math.floor((H-1)/step);
  M.hs=(x,z)=>{const fx=clamp((x/KX+.5)*gx,0,gx-1e-3),fz=clamp((z/KZ+.5)*gz,0,gz-1e-3),i=fx|0,j=fz|0,a=fx-i,c=fz-j;
    const X=k=>(k/gx-.5)*KX,Z=k=>(k/gz-.5)*KZ;
    return M.h(X(i),Z(j))*(1-a)*(1-c)+M.h(X(i+1),Z(j))*a*(1-c)+M.h(X(i),Z(j+1))*(1-a)*c+M.h(X(i+1),Z(j+1))*a*c;};
  mat.uniforms.uTex.value=t;mat.uniforms.uNrm.value=n;mat.uniforms.uDem.value=dt;mat.uniforms.uK.value.set(KX,KZ);
  scene.add(new THREE.Mesh(g,mat));
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000),new THREE.MeshBasicMaterial({color:0x0c1115}));ground.rotation.x=-Math.PI/2;ground.position.y=-.02;scene.add(ground);
  if(!narrow())tex('assets/geo/nepal-tex.jpg').then(hd=>{hd.anisotropy=an;hd.minFilter=THREE.LinearMipmapLinearFilter;mat.uniforms.uTex.value=hd;}).catch(()=>{});
  loading.hidden=true;
}

/* ---------- high-detail patches: real 30 m terrain and 10 m imagery for the featured regions ---------- */
const PATCHES=['khumbu','annapurna','manaslu','langtang'];let patchesStarted=false;
async function loadPatch(name,slot){
  const [j,blob,t,n]=await Promise.all([fetch(`assets/geo/${name}.json`).then(r=>r.json()),fetch(`assets/geo/${name}-dem-m.png`).then(r=>r.blob()),
    tex(`assets/geo/${name}-tex.jpg`),tex(`assets/geo/${name}-nrm-m.jpg`)]);
  const bmp=await createImageBitmap(blob,{colorSpaceConversion:'none',premultiplyAlpha:'none'});
  const cv=document.createElement('canvas');cv.width=bmp.width;cv.height=bmp.height;const cx=cv.getContext('2d',{willReadFrequently:true});cx.drawImage(bmp,0,0);
  const px=cx.getImageData(0,0,bmp.width,bmp.height).data,W=bmp.width,H=bmp.height,dem=new Float32Array(W*H);
  for(let i=0;i<dem.length;i++)dem[i]=px[i*4]*256+px[i*4+1];
  const b=j.bounds,[x0,z0]=M.xz(b.latN,b.lonW),[x1,z1]=M.xz(b.latS,b.lonE);
  const step=(W-1)/340,gw=Math.floor((W-1)/step),gh=Math.floor((H-1)/step);
  const g=new THREE.PlaneGeometry(x1-x0,z1-z0,gw,gh);g.rotateX(-Math.PI/2);g.translate((x0+x1)/2,0,(z0+z1)/2);
  const pos=g.attributes.position;
  for(let k=0;k<pos.count;k++){const u=(pos.getX(k)-x0)/(x1-x0),v=(pos.getZ(k)-z0)/(z1-z0);const fx=Math.min(W-1,Math.max(0,Math.round(u*(W-1)))),fz=Math.min(H-1,Math.max(0,Math.round(v*(H-1))));pos.setY(k,dem[fz*W+fx]/1000*EX*SC+.004);}
  g.computeVertexNormals();
  const an=renderer.capabilities.getMaxAnisotropy();[t,n].forEach(x=>{x.anisotropy=an;x.minFilter=THREE.LinearMipmapLinearFilter;});
  const dt=new THREE.DataTexture(dem,W,H,THREE.RedFormat,THREE.FloatType);dt.minFilter=dt.magFilter=floatLinear?THREE.LinearFilter:THREE.NearestFilter;dt.needsUpdate=true;
  const pm=terrainMaterial(true);
  pm.uniforms.uTex.value=t;pm.uniforms.uNrm.value=n;pm.uniforms.uDem.value=mat.uniforms.uDem.value;pm.uniforms.uK.value.copy(mat.uniforms.uK.value);
  pm.uniforms.uPDem.value=dt;pm.uniforms.uRect.value.set(x0,z0,x1,z1);
  const mesh=new THREE.Mesh(g,pm);mesh.renderOrder=1;scene.add(mesh);
  holes[slot].set(x0,z0,x1,z1);mat.uniforms.uHoleN.value=Math.max(mat.uniforms.uHoleN.value,slot+1);
}
function startPatches(){
  if(narrow()||S.LITE)return; // phones: the overview is enough, and the detail tiles are ~12 MB
  if(patchesStarted||!M)return;patchesStarted=true;
  // load one after another so the first view stays smooth
  (async()=>{for(let i=0;i<PATCHES.length;i++){try{await loadPatch(PATCHES[i],i);}catch(e){console.warn('patch',PATCHES[i],e);holes[i].set(0,0,0,0);}}})();
}

/* ---------- pins ---------- */
const TYPES=[['trek','Treks'],['peak','Peak climbing'],['expedition','Expeditions'],['tour','Tours & day trips']];
const on=new Set(TYPES.map(t=>t[0]));
let clusters=[];
const REG=[['Everest',27.93,86.83],['Annapurna',28.62,83.92],['Manaslu',28.6,84.62],['Langtang',28.22,85.55],['Mustang',29.1,83.95],['Dolpo',29.18,82.95],['Kanchenjunga',27.72,87.95],['Rara',29.5,82.1],['Chitwan',27.5,84.35]];
const CITY=[['Kathmandu',27.717,85.324],['Pokhara',28.209,83.985],['Lukla',27.687,86.731],['Lumbini',27.484,83.276]];
let rl=[];
function buildPins(){
  const groups=new Map();
  S.cat.filter(c=>c.lat!=null&&c.type!=='abroad').forEach(c=>{const gs=.04;const k=(Math.round(c.lat/gs))+':'+(Math.round(c.lon/gs));if(!groups.has(k))groups.set(k,[]);groups.get(k).push(c);});
  const prio={expedition:3,peak:2,trek:1,tour:0};
  pinsEl.innerHTML='';clusters=[];
  for(const L of groups.values()){
    L.sort((a,b)=>(b.feat?1:0)-(a.feat?1:0)||prio[b.type]-prio[a.type]);
    const lat=L.reduce((s,c)=>s+c.lat,0)/L.length,lon=L.reduce((s,c)=>s+c.lon,0)/L.length;
    const [x,z]=M.xz(lat,lon);const v=new THREE.Vector3(x,M.h(x,z)+.08,z);
    const el=document.createElement('button');el.type='button';el.className='pin t-'+L[0].type+(L.some(c=>c.feat)?' feat':'');
    el.setAttribute('aria-label',L.map(c=>c.name).join(', '));
    if(L.length>1)el.dataset.n=L.length;
    pinsEl.appendChild(el);
    const C={L,v,el,types:new Set(L.map(c=>c.type))};clusters.push(C);
    el.addEventListener('mouseenter',()=>{clearTimeout(hideT);clearTimeout(hoverT);hovC=C;if(pinned||tipC===C)return;hoverT=setTimeout(()=>{if(hovC===C&&!pinned)showTip(C);},tipC?240:90);});
    el.addEventListener('mouseleave',()=>{clearTimeout(hoverT);if(hovC===C)hovC=null;if(!pinned)hideSoon();});
    el.addEventListener('click',e=>{e.stopPropagation();pinned=C;pinnedRoute=true;showTip(C);});
  }
  rl=[...REG.filter(r=>!narrow()||!['Rara','Chitwan'].includes(r[0])).map(r=>['',...r]),...CITY.filter(c=>!narrow()||c[0]==='Kathmandu'||c[0]==='Pokhara').map(c=>['city',...c])].map(([cls,n,lat,lon])=>{const [x,z]=M.xz(lat,lon);const d=document.createElement('div');d.className='rlbl '+cls;d.textContent=n;pinsEl.appendChild(d);return {el:d,v:new THREE.Vector3(x,M.h(x,z)+(cls?.05:.9),z)};});
  applyFilter();
}
function applyFilter(){regroupNow=true;clusters.forEach(C=>{C.vis=[...C.types].some(t=>on.has(t));C.el.classList.toggle('off',!C.vis);});if(pinned&&!pinned.vis)closeTip();if(active&&!on.has((S.tripById(active.id)||{}).type))clearRoute();if(netLines.length)applyNet();}
// chips + legend
const COL={trek:'#eaa66c',peak:'#8fc6d6',expedition:'#e86a5a',tour:'#b9c98a'};
function buildChips(){
  const cnt=t=>S.cat.filter(c=>c.type===t&&c.lat!=null).length;
  $('#nchips').innerHTML=TYPES.map(([k,n])=>`<button class="chip" type="button" data-k="${k}" aria-pressed="true"><i style="background:${COL[k]}"></i>${n} <span style="color:var(--mist)">${cnt(k)}</span></button>`).join('');
  $('#nchips').addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;const k=b.dataset.k;
    if(on.size===TYPES.length){on.clear();on.add(k);}else if(on.has(k)&&on.size===1){TYPES.forEach(t=>on.add(t[0]));}else if(on.has(k))on.delete(k);else on.add(k);
    document.querySelectorAll('#nchips .chip').forEach(c=>c.setAttribute('aria-pressed',on.has(c.dataset.k)));applyFilter();});
  $('#nlegend').innerHTML=`<span><i style="background:${COL.trek};box-shadow:0 0 0 3px rgba(234,166,108,.35)"></i>Glowing pins fly in 3D</span><span>Numbers: trips that start there</span><span><i style="background:none;border:1px dashed #fff"></i>Dashed: helicopter flights</span>`;
}
// tooltip
let pinned=null,hideT=0,tipC=null,pinnedRoute=false,hoverT=0,hovC=null,driftT=0,driftLast=0;
function showTip(C){
  clearTimeout(hideT);tipC=C;
  const L=C.GL||C.L;
  const c0=L[0];
  const cv=S.AUTO?L.slice(0,3).find(c=>c.vc):null;
  const acts=c=>`<div class="a"><button class="btn btn-glow" type="button" data-open="${c.id}">Details</button>${ROUTES[c.id]?`<button class="btn btn-line" type="button" data-along="${c.id}">Fly along</button>`:''}${c.feat?`<button class="btn btn-line" type="button" data-fly="${c.feat}">Walk it in 3D</button>`:''}</div>`;
  const rest=L.slice(1,4);
  tip.innerHTML=`<div class="tv"><img src="${esc((cv||c0).th||(cv||c0).img)}" alt="">${cv?`<video src="${esc(cv.vc)}" muted loop playsinline autoplay aria-hidden="true"></video>`:''}</div><div class="b"><div class="ti">
    <div class="m" style="font:500 11px var(--mono);letter-spacing:.08em;text-transform:uppercase;color:${COL[c0.type]}">${esc(S.TNAME[c0.type])} · ${esc(c0.region)}</div>
    <h4>${esc(c0.name)}</h4><div class="m"><span>${esc(c0.dur)}</span>${c0.alt?`<span>${fmt(c0.alt)} m</span>`:''}<span>From US$${fmt(c0.price)}</span></div>${acts(c0)}</div>
    ${rest.length?`<div class="tmore"><small>Also from here</small>${rest.map(c=>`<button type="button" class="trow" data-open="${c.id}"${ROUTES[c.id]?` data-hover="${c.id}"`:''}><i style="background:${COL[c.type]}"></i><span>${esc(c.name)}</span><em>${esc(c.dur)}</em></button>`).join('')}</div>`:''}
    ${L.length>4?`<button class="btn btn-line" type="button" data-more style="width:100%">See all ${L.length} trips here</button>`:''}</div>`;
  const tvv=tip.querySelector('.tv video');if(tvv)tvv.addEventListener('playing',()=>{tvv.style.opacity=1;});
  tip.hidden=false;placeTip();
  const first=L.find(c=>ROUTES[c.id]);if(first)showRoute(first.id,!!pinned);
  tip.querySelectorAll('[data-hover]').forEach(el=>{const id=el.dataset.hover;el.addEventListener('mouseenter',()=>showRoute(id,!!pinned));el.addEventListener('focusin',()=>showRoute(id,!!pinned));});
  tip.querySelectorAll('[data-route]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();showRoute(b.dataset.route,true);}));
  tip.querySelectorAll('[data-along]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();closeTip();S.flyAlong(b.dataset.along);}));
  tip.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>{S.openTrip(b.dataset.open);}));
  tip.querySelectorAll('[data-fly]').forEach(b=>b.addEventListener('click',()=>{closeTip();S.select(b.dataset.fly,0,{scroll:'play'});}));
  const more=tip.querySelector('[data-more]');if(more)more.addEventListener('click',()=>{closeTip();S.filterType('all');const r=document.getElementById('fRegion');r.value=c0.region;r.dispatchEvent(new Event('change'));S.scrollToEl(document.getElementById('trips'));});
}
function placeTip(){
  if(!tipC||tip.hidden)return;
  const w=stage.clientWidth,h=stage.clientHeight,tw=tip.offsetWidth,th=tip.offsetHeight;
  if(w<700){tip.classList.add('sheet');tip.style.transform='';return;}tip.classList.remove('sheet');
  const sx=tipC.sx,sy=tipC.sy;
  let x=sx+16,y=sy-th/2;
  if(x+tw>w-12)x=sx-16-tw;
  if(x<12)x=12;
  y=clamp(y,58,h-th-12);
  tip.style.transform=`translate(${x.toFixed(0)}px,${y.toFixed(0)}px)`;
}
function hideSoon(){clearTimeout(hideT);hideT=setTimeout(()=>{if(!pinned){closeTip();if(!pinnedRoute)clearRoute();}},400);}
function closeTip(){pinned=null;tipC=null;tip.hidden=true;tip.querySelectorAll('video').forEach(v=>v.pause());}
tip.addEventListener('mouseenter',()=>clearTimeout(hideT));
tip.addEventListener('mouseleave',()=>{if(!pinned)hideSoon();});
stage.addEventListener('click',e=>{if(!tip.contains(e.target)&&!e.target.closest('.pin')&&!e.target.closest('.chip')&&!e.target.closest('.nback')){if(ptr.moved)return;closeTip();clearRoute();}});
addEventListener('keydown',e=>{if(e.key==='Escape'){closeTip();clearRoute();}});


/* ---------- routes: faint network of every trip, one highlighted route with a travelling light ---------- */
const RCOL={trek:0xeaa66c,peak:0x8fc6d6,expedition:0xe86a5a,tour:0xb9c98a};
const net=new THREE.Group();scene.add(net);
const hiGroup=new THREE.Group();scene.add(hiGroup);
const gcv=document.createElement('canvas');gcv.width=gcv.height=64;{const x=gcv.getContext('2d');const g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.2,'rgba(255,200,150,1)');g.addColorStop(.5,'rgba(234,140,70,.35)');g.addColorStop(1,'rgba(234,140,70,0)');x.fillStyle=g;x.fillRect(0,0,64,64);}
const spark=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(gcv),depthTest:false,transparent:true}));spark.renderOrder=20;spark.visible=false;scene.add(spark);
function segPts(seg){
  const P=seg.p.map(([lon,lat])=>{const [x,z]=M.xz(lat,lon);return new THREE.Vector3(x,0,z);});
  if(seg.m!=='f'){
    // densify so the line follows the surface between points
    const out=[];for(let i=0;i<P.length-1;i++){const a=P[i],b=P[i+1],n=Math.max(1,Math.ceil(a.distanceTo(b)/.06));for(let k=0;k<n;k++){const v=new THREE.Vector3().lerpVectors(a,b,k/n);out.push(v);}}
    out.push(P[P.length-1]);out.forEach(v=>v.y=Math.max(M.hs(v.x,v.z),M.h(v.x,v.z))+.05);return out;}
  const out=[];
  for(let i=0;i<P.length-1;i++){const a=P[i],b=P[i+1],L=a.distanceTo(b),arc=Math.min(2.2,.25+L*.12);
    for(let k=0;k<=24;k++){if(i>0&&k===0)continue;const t=k/24;const v=new THREE.Vector3().lerpVectors(a,b,t);v.y=lerp(M.h(a.x,a.z),M.h(b.x,b.z),t)+.2+Math.sin(Math.PI*t)*arc;out.push(v);}}
  return out;
}
let netLines=[];const lineMats=[];
function fatLine(pts,color,width,opacity,dashed){
  const g=new LineGeometry();const arr=[];pts.forEach(p=>arr.push(p.x,p.y,p.z));g.setPositions(arr);
  const m=new LineMaterial({color,linewidth:width,transparent:true,opacity,depthWrite:false,dashed:!!dashed,dashSize:.3,gapSize:.22});
  m.resolution.set(stage.clientWidth,stage.clientHeight);lineMats.push(m);
  const l=new Line2(g,m);if(dashed)l.computeLineDistances();return l;
}
function buildNet(){
  net.clear();netLines=[];
  for(const [id,segs] of Object.entries(ROUTES)){
    const c=S.tripById(id);if(!c)continue;
    for(const seg of segs){
      const pts=segPts(seg);if(pts.length<2)continue;
      const ln=fatLine(pts,seg.m==='f'?0xffffff:(RCOL[c.type]||0xffffff),seg.m==='f'?1.2:1.8,seg.m==='f'?.45:.7,seg.m==='f');ln.renderOrder=2;ln.userData.base=ln.material.opacity;net.add(ln);netLines.push({ln,type:c.type,id});
    }
  }
  applyNet();
}
function markPins(){const on2=!!(active&&active.fly);pinsEl.classList.toggle('dim',on2);clusters.forEach(C=>C.el.classList.toggle('act',on2&&(C.GL||C.L).some(c=>c.id===active.id)));}
function applyNet(){markPins();netLines.forEach(o=>{o.ln.visible=on.has(o.type);o.ln.material.opacity=active?(o.id===active.id?0:o.ln.userData.base*.3):o.ln.userData.base;});}
let active=null;           // {id, curves, total, t0, center, rad}
const focus={w:0,cx:0,cz:0,rad:40};let flyer=null,dbgFocus=false,snapNext=false;
function flyAlong(){if(!active)return;flyer={t0:performance.now(),dur:clamp(active.total*900,9000,26000)};}
S.flyAlong=id=>{if(id&&(!active||active.id!==id))showRoute(id,true);pinnedRoute=true;flyAlong();};
function showRoute(id,fly){
  if(active&&active.id===id){if(fly&&!active.fly){active.fly=true;applyNet();}return;}
  hiGroup.clear();spark.visible=false;active=null;
  const segs=ROUTES[id];const c=S.tripById(id);
  if(!segs||!c){applyNet();return;}
  const col=new THREE.Color(RCOL[c.type]||0xffffff);
  const bb=new THREE.Box3();const curves=[];let total=0;
  for(const seg of segs){
    const pts=segPts(seg);if(pts.length<2)continue;pts.forEach(p=>bb.expandByPoint(p));
    const curve=new THREE.CatmullRomCurve3(pts,false,'centripetal',.3);
    const cc=seg.m==='f'?0xffffff:(seg.m==='d'?0x9fd3ff:col.getHex());
    const glow=fatLine(pts,0x05080a,8,.55,false),core=fatLine(pts,cc,3.6,1,seg.m==='f');
    const xr=fatLine(pts,cc,2,.35,false);xr.material.depthTest=false;
    glow.renderOrder=4;core.renderOrder=5;xr.renderOrder=6;
    const cnt=pts.length-1;[glow,core,xr].forEach(l=>l.geometry.instanceCount=0);
    hiGroup.add(glow,core,xr);const len=curve.getLength();curves.push({curve,lines:[glow,core,xr],cnt,len,start:total});total+=len;
  }
  if(!curves.length){applyNet();return;}
  const ctr=bb.getCenter(new THREE.Vector3()),sz=bb.getSize(new THREE.Vector3());
  active={id,curves,total,fly:!!fly,t0:performance.now(),dur:clamp(total*140,1600,5200)};
  focus.cx=ctr.x;focus.cz=ctr.z;focus.rad=clamp(Math.max(sz.x,sz.z*(camera.aspect<1?1.6:1))*1.6+12,20,75);
  applyNet();
}
function clearRoute(){pinnedRoute=false;active=null;flyer=null;hiGroup.clear();spark.visible=false;applyNet();}
function animRoute(now,dt){
  focus.w=lerp(focus.w,(active&&active.fly)||dbgFocus?1:0,1-Math.exp(-dt*2.6));
  if(!active)return;
  const k=clamp((now-active.t0)/active.dur,0,1),e=1-Math.pow(1-k,3),d=e*active.total;
  for(const c of active.curves){const f=clamp((d-c.start)/c.len,0,1);const n=Math.round(f*c.cnt);c.lines.forEach(l=>l.geometry.instanceCount=n);}
  // light loops along the drawn route
  const loopT=((now-active.t0)/Math.max(2600,active.total*260))%1;
  const dd=(k<1?e:loopT)*active.total;const c=active.curves.find(c=>dd<=c.start+c.len)||active.curves[active.curves.length-1];
  spark.position.copy(c.curve.getPointAt(clamp((dd-c.start)/c.len,0,1)));spark.position.y+=.05;
  const sc=camera.position.distanceTo(spark.position)*.045;spark.scale.set(sc,sc,sc);spark.visible=true;
}
S.showRoute=(id,along)=>{if(!M||!ROUTES[id])return false;closeTip();pinnedRoute=true;showRoute(id,true);if(along)setTimeout(flyAlong,1400);return true;};
S.hasRoute=id=>!!ROUTES[id];
S._cam=(x,z,rad,pol,az)=>{flyer=null;dbgFocus=true;snapNext=true;focus.cx=x;focus.cz=z-1.5;focus.rad=rad;focus.w=1;user.az=az||0;};
S._xz=(a,b)=>M.xz(a,b);
S._n=()=>({net:net.children.length,netVis:net.children.filter(c=>c.visible).length,hi:hiGroup.children.length,active:active&&{id:active.id,total:active.total,n:active.curves.map(c=>c.cnt+'/'+c.core.geometry.drawRange.count)},fw:focus.w,cam:camera.position.toArray().map(v=>+v.toFixed(1)),sample:net.children[0]&&net.children[0].geometry.attributes.position.count});

/* ---------- camera: scroll sets the tilt, drag turns ---------- */
const user={az:0};let azV=0;
const ptr={id:null,x:0};
canvas.addEventListener('pointerdown',e=>{ptr.moved=false;ptr.id=e.pointerId;ptr.x=e.clientX;ptr.y=e.clientY;ptr.lock=null;});
canvas.addEventListener('pointermove',e=>{if(ptr.id!==e.pointerId)return;if(e.pointerType==='mouse'&&!(e.buttons&1)){ptr.id=null;return;}const dx=e.clientX-ptr.x,dy=e.clientY-ptr.y;
  if(!ptr.lock&&Math.abs(dx)+Math.abs(dy)>6){ptr.lock=Math.abs(dx)>Math.abs(dy)*1.2?'x':'y';if(ptr.lock==='x')canvas.setPointerCapture(e.pointerId);}
  if(ptr.lock)ptr.moved=true;if(ptr.lock==='x'){flyer=null;user.az-=dx*.005;azV=-dx*.005;ptr.x=e.clientX;}});
const upP=e=>{if(ptr.id===e.pointerId)ptr.id=null;};
addEventListener('pointerup',upP);addEventListener('pointercancel',upP);

const cam={az:0,pol:.2,rad:60,tx:0,tz:0,ty:0};
/* establishing shot: the first time the map comes into view the camera drops in from high above, turning as it descends */
let introT=0,introSnap=false;
function want(now){
  const w=want0(now);if(reduce||S.LITE||flyer)return w;
  const r=stage.getBoundingClientRect();
  if(!introT){if(r.top<innerHeight*.7&&r.bottom>innerHeight*.25){introT=now;introSnap=true;}else return w;}
  const t=Math.min(1,(now-introT)/3800);if(t>=1)return w;
  const e=1-Math.pow(1-t,3),q=1-e;
  w.rad*=1+q*2.6;w.az+=q*1.5;w.pol=lerp(.02,w.pol,e);
  return w;
}
function drift(now){const d=driftLast?now-driftLast:0;driftLast=now;if(!tipC&&!hovC&&ptr.id===null)driftT+=Math.min(d,100);return driftT;}
function want0(now){
  const r=stage.getBoundingClientRect(),vh=innerHeight;
  // 0 when the map's top enters the screen, 1 when its bottom leaves
  const p=clamp((vh-r.top)/(vh+r.height),0,1);
  const k=sstep(.08,.62,p);
  const asp=camera.aspect;
  const fw=focus.w;
  if(flyer&&active){
    const t=clamp((now-flyer.t0)/flyer.dur,0,1),d=t*active.total;
    const c=active.curves.find(c=>d<=c.start+c.len)||active.curves[active.curves.length-1];
    const u=clamp((d-c.start)/c.len,0,1),p=c.curve.getPointAt(u),q=c.curve.getPointAt(Math.min(1,u+.04));
    const hd=Math.atan2(-(q.x-p.x),-(q.z-p.z));flyer.hd=flyer.hd===undefined?hd:flyer.hd+(((hd-flyer.hd+Math.PI*3)%(Math.PI*2))-Math.PI)*.03;
    if(t>=1)flyer=null;
    return {pol:.98,rad:asp<1?16:12,az:flyer?flyer.hd+user.az:cam.az,tx:p.x,tz:p.z,ty:p.y};
  }
  return {
    pol:lerp(lerp(.1,.9,k),Math.max(.62,lerp(.1,.9,k)),fw),
    rad:lerp(lerp(asp<1?118:80,asp<1?74:58,k),focus.rad,fw),
    az:lerp(-.12,-.3,k)+user.az+(reduce?0:Math.sin(drift(now)/14000)*.04),
    tx:lerp(lerp(0,asp<1?2:1,k),focus.cx,fw), tz:lerp(lerp(0,-3.5,k),focus.cz+(asp<1?2:1.5),fw)
  };
  return {
    pol:lerp(.1,.9,k),
    rad:lerp(asp<1?150:80,asp<1?96:58,k),
    az:lerp(-.12,-.3,k)+user.az+(reduce?0:Math.sin(now/14000)*.04),
    tx:lerp(0,asp<1?2:1,k), tz:lerp(0,-3.5,k)
  };
}
function apply(w,dt,snap){
  const a=snap?1:1-Math.exp(-dt*4);
  cam.pol=lerp(cam.pol,w.pol,a);cam.rad=lerp(cam.rad,w.rad,a);cam.az=lerp(cam.az,w.az,a);cam.tx=lerp(cam.tx,w.tx,a);cam.tz=lerp(cam.tz,w.tz,a);cam.ty=lerp(cam.ty||0,w.ty||0,a);
  const sp=Math.sin(cam.pol);
  camera.position.set(cam.tx+Math.sin(cam.az)*sp*cam.rad,cam.ty+Math.cos(cam.pol)*cam.rad,cam.tz+Math.cos(cam.az)*sp*cam.rad);
  const gy=M.hs(camera.position.x,camera.position.z)+.6;if(camera.position.y<gy)camera.position.y=gy;
  camera.lookAt(cam.tx,cam.ty,cam.tz);
}

/* ---------- loop ---------- */
const pv=new THREE.Vector3();
/* pins that land within a finger's width of each other on screen merge into one pin with a count, so nothing overlaps */
let pf=0,regroupNow=true;const prio2={expedition:3,peak:2,trek:1,tour:0};
function regroup(order){
  const R2=(narrow()?26:20)**2,lead=[];
  const rank=[...order].sort((a,b)=>(b.L.some(c=>c.feat)?1:0)-(a.L.some(c=>c.feat)?1:0)||b.L.length-a.L.length);
  for(const C of rank){C.lead=null;C.grp=[C];const Ld=lead.find(Q=>(Q.sx-C.sx)**2+(Q.sy-C.sy)**2<R2);if(Ld){C.lead=Ld;Ld.grp.push(C);}else lead.push(C);}
  for(const C of order){
    if(C.lead){C.el.style.pointerEvents='none';continue;}C.el.style.pointerEvents='';
    const GL=C.grp.flatMap(Q=>Q.L).filter(c=>on.has(c.type)||C.grp.length===1).sort((a,b)=>(b.feat?1:0)-(a.feat?1:0)||prio2[b.type]-prio2[a.type]);
    C.GL=GL.length?GL:C.L;
    if(C.GL.length>1)C.el.dataset.n=C.GL.length;else delete C.el.dataset.n;
    C.el.className='pin t-'+C.GL[0].type+(C.GL.some(c=>c.feat)?' feat':'')+(C.el.classList.contains('act')?' act':'');
    C.el.setAttribute('aria-label',C.GL.map(c=>c.name).join(', '));
  }
}
function project(){
  const w=stage.clientWidth,h=stage.clientHeight;
  const order=clusters.filter(C=>C.vis).map(C=>{pv.copy(C.v).project(camera);C.sx=(pv.x*.5+.5)*w;C.sy=(-pv.y*.5+.5)*h;C.z=pv.z;return C;}).sort((a,b)=>b.z-a.z);
  if((++pf%8===0||regroupNow)&&!hovC&&!tipC){regroupNow=false;regroup(order);}
  order.forEach((C,i)=>{const ok=!C.lead&&C.z<1&&C.sx>-20&&C.sx<w+20&&C.sy>-20&&C.sy<h+20;C.el.style.transform=`translate(${C.sx.toFixed(1)}px,${C.sy.toFixed(1)}px)`;C.el.style.zIndex=(C===tipC||C===hovC)?999:i+1;C.el.style.visibility=ok?'':'hidden';});
  for(const L of rl){pv.copy(L.v).project(camera);const ok=pv.z<1;L.el.style.visibility=ok?'':'hidden';L.el.style.left=((pv.x*.5+.5)*w).toFixed(1)+'px';L.el.style.top=((-pv.y*.5+.5)*h).toFixed(1)+'px';}
  placeTip();
}
function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w<h?52:38;camera.updateProjectionMatrix();lineMats.forEach(m=>m.resolution.set(w,h));}
new ResizeObserver(resize).observe(stage);resize();
let visible=false,last=performance.now(),started=false,idleN=0;const lastCP=new THREE.Vector3(1e9,0,0),lastCQ=new THREE.Quaternion();
function start(){
  if(started)return;started=true;
  load().then(()=>{const go=()=>{buildPins();buildChips();buildNet();['pointerdown','pointerenter','wheel'].forEach(ev=>stage.addEventListener(ev,startPatches,{once:true,passive:true}));setTimeout(startPatches,6000);if(S.pendingRoute){const id=S.pendingRoute;S.pendingRoute=null;S.showRoute(id,true);}};if(S.cat&&S.cat.length)go();else document.addEventListener('hf:data',go,{once:true});apply(want(performance.now()),0,true);}).catch(e=>{console.error(e);loading.textContent='The map could not load. Refresh to try again.';});
}
new IntersectionObserver(es=>es.forEach(e=>{visible=e.isIntersecting;if(visible){start();last=performance.now();requestAnimationFrame(loop);}}),{rootMargin:'300px 0px'}).observe(stage);
function loop(now){
  if(!visible)return;requestAnimationFrame(loop);
  const dt=Math.min(.05,(now-last)/1000);last=now;
  if(!M)return;
  if(ptr.id===null&&Math.abs(azV)>1e-4){user.az+=azV;azV*=.92;}
  animRoute(now,dt);
  if(snapNext){focus.w=1;}
  apply(want(now),dt,snapNext||introSnap);snapNext=false;introSnap=false;
  // when the camera is still and no route is animating, skip most frames: same picture, far less work for the GPU
  const moved=camera.position.distanceToSquared(lastCP)>1e-6||Math.abs(camera.quaternion.dot(lastCQ))<1-1e-9;
  if(!moved&&!active&&(idleN++%12))return;
  lastCP.copy(camera.position);lastCQ.copy(camera.quaternion);
  renderer.render(scene,camera);
  if(clusters.length)project();
}
}
