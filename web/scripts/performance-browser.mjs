import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';

const base = process.env.PERF_URL || 'http://localhost:3000';
const output = '../active/performance/verification';
mkdirSync(output, {recursive:true});
const browser = await chromium.launch({channel:'msedge',headless:true});
const results=[];
try {
 for(const mobile of [true,false]) {
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/evenimente',{waitUntil:'networkidle'});
  await page.locator('#event-filter-controls').scrollIntoViewIfNeeded();
  let requests=0;
  const track=request=>{const url=new URL(request.url());if(url.pathname==='/evenimente' && url.searchParams.has('_rsc')) requests++;};
  page.on('request',track);
  const category=page.getByRole('combobox').first();
  const value=await category.locator('option').nth(1).getAttribute('value');
  await category.selectOption(value);
  await page.waitForURL(u=>u.searchParams.get('category')===value);
  const search=page.locator('input[type="search"]');
  await search.fill('unlikely-performance-match');
  await page.waitForURL(u=>u.searchParams.get('q')==='unlikely-performance-match');
  await page.getByRole('button',{name:'Resetează',exact:true}).click();
  await page.waitForURL(u=>u.search==='');
  assert.equal(requests,0,'Local filters must not fetch a new server page');
  page.off('request',track);
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await category.inputValue(),'all');
  assert.equal(await search.inputValue(),'');
  await page.evaluate(()=>{window.__navIdentity=document.querySelector('.hnav');window.__documentIdentity=crypto.randomUUID();});
  const identity=await page.evaluate(()=>window.__documentIdentity);
  const card=page.locator('a[href^="/evenimente/"]').filter({visible:true}).first();
  await card.click();
  await page.waitForURL(u=>u.pathname.startsWith('/evenimente/'));
  await page.locator('h1').first().waitFor();
  assert.equal(await page.evaluate(()=>window.__documentIdentity),identity,'Internal card navigation must preserve document');
  assert(await page.evaluate(()=>window.__navIdentity===document.querySelector('.hnav')),'Navigation DOM must persist');
  await page.goBack({waitUntil:'domcontentloaded'});
  await page.waitForURL(u=>u.pathname==='/evenimente');
  assert(await page.evaluate(()=>window.__navIdentity===document.querySelector('.hnav')));
  await page.goto(base+'/golden-hour-2026',{waitUntil:'networkidle'});
  const map=page.locator('iframe[title^="Hartă"]');
  assert.equal(await map.getAttribute('src'),null,'Map should not compete with first screen');
  await map.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('iframe[title^="Hartă"]')?.getAttribute('src'));
  await page.goto(base+'/golden-hour-2026/checkout',{waitUntil:'networkidle'});
  assert.equal(await page.locator('form').count(),0,'Ended event must not permit reservation');
  for(const path of ['/board','/board/evenimente/new','/admin','/scanner']) {
   await page.goto(base+path,{waitUntil:'domcontentloaded'});
   assert(['/login','/conta/login','/conta'].includes(new URL(page.url()).pathname),'Guest must remain denied');
  }
  assert.deepEqual(errors,[]);
  results.push({viewport:mobile?'390':'1440',filters:'no RSC requests',persistentNavigation:true,backNavigation:true,map:'deferred then loaded',endedReservation:'blocked',guestAccess:'denied',errors});
  await context.close();
 }
 writeFileSync(output+'/checks.json',JSON.stringify(results,null,2));
 console.log(JSON.stringify(results,null,2));
} finally {await browser.close();}
