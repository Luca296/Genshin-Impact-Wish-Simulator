const {_electron}=require('playwright');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'outputs/desktop-1.3.0');fs.mkdirSync(out,{recursive:true});
const report={steps:[],errors:[],external:[],failed:[]};let app,page;
const save=()=>fs.writeFileSync(path.join(out,'reveal-test-results.json'),JSON.stringify(report,null,2));
async function step(name,fn){console.log('START',name);try{const detail=await fn();report.steps.push({name,passed:true,detail});console.log('PASS',name)}catch(e){report.steps.push({name,passed:false,error:String(e)});throw e}finally{save()}}
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const chars=JSON.parse(fs.readFileSync(path.join(root,'project/src/lib/data/characters.json'))).data;
const dir=path.join(root,'project/src/lib/data/banners/events');const cases={cryo:{patch:'7.1',phase:2,index:0,name:'skirk'}};
for(const file of fs.readdirSync(dir).sort().reverse())for(const d of JSON.parse(fs.readFileSync(path.join(dir,file))).data)d.banners.events.featured.forEach((f,index)=>{const char=chars.find(c=>c.name===f.character);if(char?.rarity===5&&!cases[char.vision])cases[char.vision]={patch:file.slice(0,-5),phase:d.phase,index,name:char.name}});
const result=()=>page.locator('.wish-result');
async function seed(c=cases.cryo,{autoskip=false,rarity=5}={}){
 const value={settings:{data:{config:{version:`${c.patch}-${c.phase}`,storageVersion:'7.1',idbVer:4,locale:'en-US',muted:false,autoskip,multipull:10},balance:{primogem:8000,intertwined:1000,acquaint:1000,starglitter:0,stardust:0},probabilityRates:{'character-event':{baseRate5:rarity===5?100:0,baseRate4:rarity===4?100:0,winRate:100},'weapon-event':{baseRate5:100,winRate:100}},guaranteedStatus:{'character-event-5star':true}}},banners:[],histories:[]};
 await page.evaluate(v=>window.offlineGame.restoreBackup(JSON.stringify(v)),value);await page.reload();await page.locator('.modal .pop-footer button').last().click();await page.locator('#header .button.character-event').nth(c.index).click();
}
async function wish({multi=false,skipMeteor=false,fullMeteor=false}={}){
 await page.locator(multi?'.ten.wish-button':'.single.wish-button').click();
 if(await page.locator('.meteor-wrapper.show').isVisible()){
  if(skipMeteor){await page.locator('.meteor-wrapper.show').click();await page.locator('.meteor-wrapper.show .skip').click()}
  else if(!fullMeteor){await page.waitForFunction(()=>{const v=document.querySelector('.meteor-wrapper.show video');return v&&Number.isFinite(v.duration)&&v.duration>0});await page.locator('.meteor-wrapper.show video').evaluate(v=>{v.currentTime=Math.max(0,v.duration-.08)})}
 }
 await result().waitFor({state:'visible'});
}
const phase=p=>page.waitForFunction(p=>document.querySelector('.wish-result')?.dataset.revealPhase===p,p);
async function capture(name){await page.screenshot({path:path.join(out,name+'.png'),timeout:10000})}
(async()=>{try{
 const profile=path.join(out,'test-profiles','reveal-'+Date.now());report.profile=profile;
 app=await _electron.launch({executablePath:path.join(out,'win-unpacked/Genshin Wish Offline.exe'),args:['--profile='+profile],cwd:out,env,timeout:90000,recordVideo:{dir:path.join(out,'video'),size:{width:1280,height:800}}});
 page=await app.firstWindow();page.setDefaultTimeout(20000);page.on('pageerror',e=>report.errors.push(String(e)));page.on('request',r=>{if(/^https?:/.test(r.url()))report.external.push(r.url())});page.on('requestfailed',r=>report.failed.push({url:r.url(),error:r.failure()?.errorText}));
 await page.locator('.modal .pop-footer button').last().click({timeout:60000});
 await step('Skirk: gold silhouette, colored Cryo, full-screen wash, full artwork',async()=>{
  await seed();await wish({fullMeteor:true});await phase('silhouette');
  assert.equal(await page.locator('.splash-art').count(),0);assert.equal(await page.locator('.wish-result .info').count(),0);assert.equal(await page.locator('.wish-result .share').count(),0);
  await page.waitForTimeout(250);await capture('01-black-cryo');
  await phase('color');assert.equal(await page.locator('.splash-art').count(),0);await capture('02-colored-cryo');
  await phase('wash');await capture('03-cryo-wash');
  await phase('revealed');await page.waitForTimeout(700);await capture('04-skirk-revealed');
  assert.ok((await page.locator('.wish-result .info').innerText()).includes('Skirk'));assert.equal(await page.locator('.splash-art.elemental').count(),1);assert.equal(await page.locator('.splash-art.anim').count(),0);
  assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.isCurrentlyAudible()),true);
  return {element:'cryo',artVisible:true,name:'Skirk',audible:true};
 });
 for(const [vision,c] of Object.entries(cases))if(vision!=='cryo')await step(`${vision}: actual guaranteed character and correct element`,async()=>{await seed(c);await wish();await phase('silhouette');assert.equal(await page.locator('.emblem .black svg').count(),1);assert.equal(await page.locator('.splash-art').count(),0);await phase('revealed');await page.waitForTimeout(650);assert.equal(await page.locator('.splash-art.elemental').count(),1);await capture('element-'+vision);return c});
 await step('single mouse/keyboard fast-forward reveals same character',async()=>{await seed();await wish();await phase('silhouette');await page.keyboard.press('Enter');await phase('revealed');assert.equal(await result().getAttribute('data-result-index'),'0');await page.keyboard.press('Escape');await result().waitFor({state:'hidden'});await page.waitForTimeout(3600);assert.equal(await result().count(),0)});
 await step('two consecutive five-stars reset the emblem and cancel stale timers',async()=>{await seed();await wish({multi:true});await phase('silhouette');await page.locator('.touch-box').click();await phase('revealed');assert.equal(await result().getAttribute('data-result-index'),'0');await page.locator('.touch-box').click();await phase('silhouette');assert.equal(await result().getAttribute('data-result-index'),'1');await page.waitForTimeout(400);assert.equal(await result().getAttribute('data-reveal-phase'),'silhouette');await phase('revealed');await page.locator('.wish-result button.skip').click();await page.waitForTimeout(3800);assert.equal(await page.locator('.element-reveal').count(),0);assert.equal(await page.locator('.wish-result .result-list').count()>0||await page.locator('.wish-result button.close').isVisible(),true);const snapshot=await page.evaluate(async()=>JSON.parse(await window.offlineGame.snapshot()));assert.equal(snapshot.histories.length,10);return {histories:10}});
 await step('skip during suspense goes straight to ten-pull summary',async()=>{await seed();await wish({multi:true});await phase('silhouette');await page.locator('.wish-result button.skip').click();await page.waitForTimeout(3700);assert.equal(await page.locator('.element-reveal').count(),0);assert.equal(await result().getAttribute('data-reveal-phase'),'standard')});
 await step('skipping meteor and auto-skip both bypass the new intro',async()=>{await seed();await wish({skipMeteor:true});await phase('revealed');await seed(cases.cryo,{autoskip:true});await wish();await phase('revealed');assert.equal(await page.locator('.meteor-wrapper.show').count(),0)});
 await step('reduced-motion preference bypasses the long intro',async()=>{await page.emulateMedia({reducedMotion:'reduce'});await seed();await wish();await phase('revealed');await page.emulateMedia({reducedMotion:'no-preference'})});
 await step('four-star characters and five-star weapons retain original reveal',async()=>{await seed(cases.cryo,{rarity:4});await wish();assert.equal(await result().getAttribute('data-reveal-phase'),'standard');assert.equal(await page.locator('.element-reveal').count(),0);await seed();await page.locator('#header .button.weapon-event').click();await wish();assert.equal(await result().getAttribute('data-reveal-phase'),'standard');assert.equal(await page.locator('.element-reveal').count(),0)});
 await step('no missing local assets, external requests or uncaught errors',async()=>{assert.deepEqual(report.errors,[]);assert.deepEqual(report.external,[]);assert.deepEqual(report.failed.filter(r=>!(r.url.includes('/videos/')&&r.error==='net::ERR_ABORTED')),[])});
}finally{if(page){await capture('last-state').catch(()=>{});report.finalBody=await page.locator('body').innerText().catch(()=>'<closed>')}save();if(app)await app.close().catch(()=>{})}})().catch(e=>{console.error(e);process.exitCode=1});
