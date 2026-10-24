/* Himalayan Frontier – company details from site-config.js: footer, contact buttons, legal pages and search-engine data. */
(function(){
'use strict';
const C=window.HF_CONFIG||{},S=window.HF||{};
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const slot=t=>C.demo?`<span class="slot">${esc(t)}</span>`:'';
const ICON={
  phone:'<svg viewBox="0 0 16 16" fill="none"><path d="M3 2h3l1.5 3.5L6 7a8 8 0 0 0 3 3l1.5-1.5L14 10v3a1 1 0 0 1-1 1A11 11 0 0 1 2 3a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.3"/></svg>',
  mail:'<svg viewBox="0 0 16 16" fill="none"><rect x="1.5" y="3" width="13" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M2 4l6 5 6-5" stroke="currentColor" stroke-width="1.3"/></svg>',
  wa:'<svg viewBox="0 0 16 16" fill="none"><path d="M8 1.5a6.5 6.5 0 0 0-5.6 9.8L1.5 14.5l3.3-.9A6.5 6.5 0 1 0 8 1.5Z" stroke="currentColor" stroke-width="1.3"/></svg>',
  pin:'<svg viewBox="0 0 16 16" fill="none"><path d="M8 15s5-4.6 5-8.5A5 5 0 0 0 3 6.5C3 10.4 8 15 8 15Z" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="6.5" r="1.8" stroke="currentColor" stroke-width="1.3"/></svg>'
};

/* simple text fields */
$$('[data-cfg]').forEach(el=>{const v=C[el.dataset.cfg];if(v)el.textContent=(el.dataset.pre||'')+v;else if(el.dataset.cfg==='legalName'||el.dataset.cfg==='founded')el.innerHTML=slot(el.dataset.cfg==='founded'?'Add the year you started (site-config.js)':'Add your registered company name');});
$('#fYear').textContent=new Date().getFullYear();

/* contact */
const wa=(C.whatsapp||'').replace(/\D/g,'');
$('#fContact').innerHTML=[
  C.phone?`<li>${ICON.phone}<a href="tel:${esc(C.phone.replace(/[^\d+]/g,''))}">${esc(C.phone)}</a></li>`:`<li>${ICON.phone}${slot('Add your phone number')}</li>`,
  wa?`<li>${ICON.wa}<a href="https://wa.me/${wa}" target="_blank" rel="noopener">WhatsApp +${wa}</a></li>`:`<li>${ICON.wa}${slot('Add your WhatsApp number')}</li>`,
  C.email?`<li>${ICON.mail}<a href="mailto:${esc(C.email)}">${esc(C.email)}</a></li>`:`<li>${ICON.mail}${slot('Add your email address')}</li>`,
  `<li>${ICON.pin}<span>${esc(C.address||'')}</span></li>`
].join('');
if(wa){const b=$('#waBtn');b.href=`https://wa.me/${wa}?text=${encodeURIComponent('Namaste, I would like to ask about a trek.')}`;b.hidden=false;}

/* licences and memberships */
$('#fLic').innerHTML=(C.licences||[]).map(l=>`<li><small>${esc(l.label)}</small>${l.value?`<b>${esc(l.value)}</b>`:slot('Add number')}</li>`).join('')||slot('Add your licence numbers');

/* social */
const SN={facebook:'Facebook',instagram:'Instagram',youtube:'YouTube',tiktok:'TikTok',tripadvisor:'Tripadvisor',google:'Google reviews'};
const soc=Object.entries(C.social||{}).filter(([k,v])=>v);
$('#fSocial').innerHTML=soc.length?soc.map(([k,v])=>`<a href="${esc(v)}" target="_blank" rel="noopener">${SN[k]||k}</a>`).join(''):slot('Add your social and review links');

/* legal pages: plain-language templates built from the booking terms on the page */
const co=C.legalName||C.company||'the company';
const note=C.demo?'<p class="lnote">Template text. Have it checked against your own terms and Nepal law before the site goes live.</p>':'';
const contactLine=[C.email&&`email <a href="mailto:${esc(C.email)}">${esc(C.email)}</a>`,C.phone&&`phone ${esc(C.phone)}`].filter(Boolean).join(' or ')||'the enquiry form on this page';
const LEGAL={
 terms:{t:'Booking terms',h:`${note}
  <h3>Who you book with</h3><p>Trips on this site are run by ${esc(co)}, ${esc(C.address||'Kathmandu, Nepal')}${(C.licences||[]).filter(l=>l.value).map(l=>`, ${esc(l.label)} ${esc(l.value)}`).join('')}.</p>
  <h3>Prices</h3><p>Prices are per person in US dollars and are fixed once we confirm your plan in writing. What each price includes and excludes is listed on the trip. Permit, visa and royalty fees are set by the government and can change; if they change before you travel we pass on the difference.</p>
  <h3>Deposit and balance</h3><p>A 30% deposit confirms your place and lets us buy permits and flights. Expeditions and peak climbs need a larger deposit because permits are paid early. The balance is due 45 days before departure, by bank transfer, card or PayPal.</p>
  <h3>Insurance</h3><p>Travel insurance that covers trekking to the trip’s highest point and helicopter evacuation is a condition of booking. We ask for the policy number before departure.</p>
  <h3>Changes on the trail</h3><p>Weather, flights, trail conditions and your health can change the plan. Your guide may shorten a day, add a rest day or turn the group around when it is safer. Extra costs caused by events outside our control, such as flight delays or an evacuation, are paid by the traveller or their insurer.</p>
  <h3>Your part</h3><p>Tell us honestly about your fitness and health, follow your guide’s instructions on altitude and safety, and respect local customs and the permit rules of each area.</p>`},
 cancel:{t:'Cancellation policy',h:`${note}
  <h3>If you cancel</h3><table class="ltable"><tr><th>When you cancel</th><th>What we keep</th></tr><tr><td>More than 60 days before departure</td><td>The deposit. Everything else is refunded minus bank charges.</td></tr><tr><td>45–60 days before departure</td><td>50% of the total trip cost.</td></tr><tr><td>Less than 45 days before departure</td><td>100% of the total trip cost.</td></tr></table>
  <p>Tell us in writing, by ${contactLine}. Approved refunds go back to your original payment method within 14–21 business days.</p>
  <h3>Changing dates</h3><p>Ask as early as you can. If we can move you to another date without losing permit or flight costs, we will.</p>
  <h3>If we cancel</h3><p>If we have to cancel a departure before it starts, you choose between another date or a full refund of what you paid us.</p>`},
 privacy:{t:'Privacy policy',h:`${note}
  <h3>What we collect</h3><p>When you send an enquiry we receive your name, email address, the trip and dates you are interested in, and anything you write in the message. When you book we also need passport details and photos for permits, and your insurance details.</p>
  <h3>How we use it</h3><p>Only to reply to you, plan and run your trip, and arrange permits, flights and accommodation. We share passport and trip details with government permit offices, airlines and lodges only as far as your trip needs.</p>
  <h3>What we do not do</h3><p>We do not sell your details or add you to a mailing list without asking. This site stores your packing-list ticks only in your own browser.</p>
  <h3>How long we keep it</h3><p>Enquiries are deleted after two years if you do not travel with us. Booking records are kept as long as Nepal’s tax and tourism rules require.</p>
  <h3>Your choices</h3><p>Ask us at any time to see, correct or delete your details, by ${contactLine}.</p>`}
};
const dlg=$('#legalDlg');
$$('[data-legal]').forEach(b=>b.addEventListener('click',()=>{const L=LEGAL[b.dataset.legal];$('#legalBody').innerHTML=`<h2 id="legalTitle">${L.t}</h2>${L.h}`;dlg.querySelector('.legal-in').scrollTop=0;dlg.showModal?dlg.showModal():dlg.setAttribute('open','');}));
dlg.addEventListener('click',e=>{if(e.target===dlg||e.target.closest('[data-close]'))dlg.close();});

/* search-engine data: the company and its trips (schema.org) */
function jsonld(){
  const org={'@context':'https://schema.org','@type':'TravelAgency',name:C.company,address:{'@type':'PostalAddress',streetAddress:'Thamel',addressLocality:'Kathmandu',addressCountry:'NP'},openingHours:'Su-Fr 09:00-18:00',image:'assets/img/hero-bg.jpg'};
  if(C.siteUrl)org.url=C.siteUrl;if(C.phone)org.telephone=C.phone;if(C.email)org.email=C.email;if(C.founded)org.foundingDate=C.founded;
  const same=Object.values(C.social||{}).filter(Boolean);if(same.length)org.sameAs=same;
  const add=o=>{const s=document.createElement('script');s.type='application/ld+json';s.textContent=JSON.stringify(o);document.head.appendChild(s);};
  add(org);
  const go=()=>{if(!S.cat||!S.cat.length)return;add({'@context':'https://schema.org','@type':'ItemList',name:'Treks, peak climbs, expeditions and tours',itemListElement:S.cat.map((c,i)=>({'@type':'ListItem',position:i+1,item:{'@type':'TouristTrip',name:c.name,description:c.lede,touristType:c.type,offers:{'@type':'Offer',price:c.price,priceCurrency:'USD'},provider:{'@type':'TravelAgency',name:C.company}}}))});};
  if(S.cat&&S.cat.length)go();else document.addEventListener('hf:data',()=>setTimeout(go,0),{once:true});
}
jsonld();
})();
