// Production-build lab profile. Never submits forms or writes application data.
import { chromium } from 'playwright-core';
import { createServerClient } from '@supabase/ssr';
import { mkdirSync, writeFileSync } from 'node:fs';

const base = process.env.PERF_URL || 'http://localhost:3000';
const label = process.argv[2] || 'baseline';
const output = `../active/performance/${label}`;
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
let authCookies = [];
if (process.env.STAFF_TEST_BOARD_EMAIL && process.env.STAFF_TEST_BOARD_PASSWORD) {
  const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { getAll: () => [], setAll: values => { authCookies = values.map(({name, value}) => ({name, value, url: base, sameSite: 'Lax'})); } },
  });
  const { error } = await client.auth.signInWithPassword({email: process.env.STAFF_TEST_BOARD_EMAIL, password: process.env.STAFF_TEST_BOARD_PASSWORD});
  console.log('Test board authentication:', error ? 'unavailable' : 'available');
  if (error) authCookies = [];
}
const discover = await browser.newPage();
await discover.goto(base + '/evenimente', {waitUntil:'networkidle'});
const eventPath = await discover.locator('a[href]').evaluateAll(links => links.map(a => a.getAttribute('href')).find(h => h.startsWith('/evenimente/') || /^\/[a-z0-9-]+$/.test(h) && !['/','/evenimente','/despre','/proiecte','/echipa','/sponsori','/district','/contact','/conta','/devino-membru','/rezerva','/termeni','/confidentialitate'].includes(h)));
await discover.close();
const routes = process.env.PERF_ROUTES?.split(',') || ['/', '/despre', '/evenimente', eventPath || '/echoes-unplugged', '/rezerva', '/conta/login', '/board', '/board/evenimente'];
const results = [];
try {
 for (const mobile of [false, true]) {
  for (const route of routes) {
   const context = await browser.newContext({ viewport: mobile ? {width:390,height:844} : {width:1440,height:900}, isMobile:mobile, hasTouch:mobile });
   if (route.startsWith('/board') && authCookies.length) await context.addCookies(authCookies);
   const page = await context.newPage();
   const cdp = await context.newCDPSession(page);
   await cdp.send('Network.enable');
   if (mobile) {
    await cdp.send('Emulation.setCPUThrottlingRate', {rate:4});
    await cdp.send('Network.emulateNetworkConditions', {offline:false, latency:150, downloadThroughput:200000, uploadThroughput:93750});
   }
   await page.addInitScript(() => {
    window.__perf = {lcp:0, cls:0, interactions:[]};
    let sessionStart=0, sessionLast=0, sessionValue=0;
    new PerformanceObserver(list => {for (const e of list.getEntries()) {window.__perf.lcp=e.startTime;window.__perf.lcpElement=e.element?.tagName+':'+e.element?.className;}}).observe({type:'largest-contentful-paint',buffered:true});
    new PerformanceObserver(list => {for (const e of list.getEntries()) if(!e.hadRecentInput){if(e.startTime-sessionLast>1000 || e.startTime-sessionStart>5000){sessionStart=e.startTime;sessionValue=0;}sessionLast=e.startTime;sessionValue+=e.value;window.__perf.cls=Math.max(window.__perf.cls,sessionValue);}}).observe({type:'layout-shift',buffered:true});
    new PerformanceObserver(list => {for(const e of list.getEntries()) if(e.interactionId) window.__perf.interactions.push(e.duration);}).observe({type:'event',durationThreshold:16,buffered:true});
   });
   const assets=[]; const errors=[];
   page.on('pageerror', e=>errors.push(e.message));
   page.on('requestfinished', async req=>{try {const size=await req.sizes();assets.push({path:new URL(req.url()).pathname,type:req.resourceType(),bytes:size.responseBodySize});}catch{}});
   const response = await page.goto(base+route,{waitUntil:'networkidle',timeout:90000});
   await page.waitForTimeout(1000); // Fixed observation window, identical before/after.
   const metrics=await page.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0];return {...window.__perf,ttfb:n.responseStart-n.startTime,fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,overflow:document.documentElement.scrollWidth>innerWidth+1};});
   const record={mode:mobile?'mobile-4x-1.6Mbps-150ms':'desktop',route,landed:new URL(page.url()).pathname,status:response.status(),...metrics,js:assets.filter(a=>a.type==='script'||/\.m?js$/.test(a.path)).reduce((n,a)=>n+a.bytes,0),requests:assets.length,largest:assets.sort((a,b)=>b.bytes-a.bytes).slice(0,8),errors};
   await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-${route.replaceAll('/','_')||'home'}.png`});
   // Warm a real visible likely-next Link using hover, then measure trusted click.
   const next=page.locator('a[href]').filter({visible:true});
   const hrefs=await next.evaluateAll(ls=>ls.map(a=>a.getAttribute('href')));
   const target=hrefs.find(h=>h.startsWith('/board/evenimente/') && !h.endsWith('/arhiva')) || hrefs.find(h=>h.startsWith('/evenimente/')) || hrefs.find(h=>h==='/evenimente' && route!=='/evenimente') || hrefs.find(h=>h==='/despre' && route!=='/despre');
   if(target){
    const link=page.locator(`a[href="${target}"]`).filter({visible:true}).first();
    await link.hover(); await page.waitForTimeout(1500);
    await page.evaluate(()=>{window.__navStart=0;document.addEventListener('click',()=>{window.__navStart=performance.now();},{once:true,capture:true});});
    const start=Date.now(); await link.click();
    await page.waitForURL(u=>u.pathname===target.split('?')[0],{timeout:30000});
    record.warmNavigation={target,urlCommitMs:await page.evaluate(()=>window.__navStart?performance.now()-window.__navStart:null),wallMs:Date.now()-start};
    await page.waitForTimeout(500);
    record.interactionLatencyLabMs=await page.evaluate(()=>Math.max(0,...window.__perf.interactions));
   }
   results.push(record);console.log(JSON.stringify({mode:record.mode,route,landed:record.landed,ttfb:Math.round(record.ttfb),fcp:record.fcp,lcp:Math.round(record.lcp),cls:record.cls,js:record.js,nav:record.warmNavigation}));
   writeFileSync(`${output}/results.json`,JSON.stringify({label,base,eventPath,authenticated:authCookies.length>0,results},null,2));
   await context.close();
  }
 }
} finally { await browser.close(); }
