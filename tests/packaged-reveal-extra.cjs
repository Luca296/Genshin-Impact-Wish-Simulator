const {_electron}=require('playwright');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{const root=path.resolve(__dirname,'../..'),out=path.join(root,'outputs/desktop-1.3.0'),env={...process.env};delete env.ELECTRON_RUN_AS_NODE;const report={steps:[],errors:[]};let app,page;
async function step(name,fn){try{await fn();report.steps.push({name,passed:true});console.log('PASS',name)}catch(e){report.steps.push({name,passed:false,error:String(e)});throw e}finally{fs.writeFileSync(path.join(out,'reveal-extra-results.json'),JSON.stringify(report,null,2))}}
try{
 app=await _electron.launch({executablePath:path.join(out,'win-unpacked/Genshin Wish Offline.exe'),args:['--profile='+path.join(out,'test-profiles','extra-'+Date.now())],cwd:out,env,timeout:90000});page=await app.firstWindow();page.setDefaultTimeout(20000);page.on('pageerror',e=>report.errors.push(String(e)));await page.locator('.modal .pop-footer button').last().click({timeout:60000});
 const backup=JSON.parse(fs.readFileSync(path.join(out,'ui-exported-backup.json'),'utf8'));const banner=backup.banners[0];banner.vision='electro';backup.settings.data.config={...backup.settings.data.config,version:`Custom-${banner.itemID}`,autoskip:false,muted:true};backup.settings.data.probabilityRates={'character-event':{baseRate5:100,winRate:100}};backup.settings.data.balance.intertwined=1000;
 await step('custom five-star uses its chosen element and embedded artwork at 1024×720',async()=>{
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(1024,720));
  await page.evaluate(v=>window.offlineGame.restoreBackup(JSON.stringify(v)),backup);await page.reload();await page.locator('.modal .pop-footer button').last().click();await page.locator('.single.wish-button').click();
  await page.waitForFunction(()=>Number.isFinite(document.querySelector('.meteor-wrapper.show video')?.duration));await page.locator('.meteor-wrapper.show video').evaluate(v=>v.currentTime=v.duration-.08);
  await page.waitForFunction(()=>document.querySelector('.wish-result')?.dataset.revealPhase==='silhouette');
  const box=await page.locator('.emblem').boundingBox(),size=page.viewportSize()||await page.evaluate(()=>({width:innerWidth,height:innerHeight}));assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=size.width&&box.y+box.height<=size.height);assert.equal(await page.locator('.emblem svg').count(),2);
  await page.screenshot({path:path.join(out,'custom-electro-small.png'),timeout:10000});
  await page.waitForFunction(()=>document.querySelector('.wish-result')?.dataset.revealPhase==='revealed');await page.waitForTimeout(700);assert.ok((await page.locator('.wish-result .info').innerText()).includes(banner.character));assert.ok((await page.locator('.splash-art img').getAttribute('src')).startsWith('data:image/'));await page.screenshot({path:path.join(out,'custom-electro-result-small.png'),timeout:10000});
 });
 await step('muted elemental reveal produces no game audio',async()=>{assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.isCurrentlyAudible()),false)});
 await step('no uncaught errors during custom reveal',async()=>assert.deepEqual(report.errors,[]));
}finally{if(app)await app.close().catch(()=>{})}})().catch(e=>{console.error(e);process.exitCode=1});
