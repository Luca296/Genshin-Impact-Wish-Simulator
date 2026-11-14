const {_electron}=require('playwright');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');const {spawn}=require('node:child_process');
const output=path.resolve(__dirname,'../../outputs/desktop-1.3.0');const results={steps:[],errors:[],external:[]};let app,page;
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;const profile=path.join(output,'test-profiles','custom-'+Date.now());results.profile=profile;
const save=()=>fs.writeFileSync(path.join(output,'custom-test-results.json'),JSON.stringify(results,null,2));
async function step(name,fn){console.log('START',name);try{const detail=await fn();results.steps.push({name,passed:true,detail});console.log('PASS',name)}catch(e){results.steps.push({name,passed:false,error:String(e)});throw e}finally{save()}}
async function launch(){app=await _electron.launch({executablePath:path.join(output,'win-unpacked','Genshin Wish Offline.exe'),args:['--profile='+profile],cwd:output,env,timeout:90000});page=await app.firstWindow();page.setDefaultTimeout(20000);page.on('pageerror',e=>results.errors.push(String(e)));page.on('request',r=>{if(/^https?:/.test(r.url()))results.external.push(r.url())});await page.locator('.modal .pop-footer button').last().click({timeout:60000})}
const snap=()=>page.evaluate(async()=>JSON.parse(await window.offlineGame.snapshot()));
async function settings(){await page.getByTitle('Setting',{exact:true}).click()}
(async()=>{try{
 await launch();
 await step('Skirk 7.1 banner visual and local font rendering',async()=>{await page.locator('#header .button.character-event').first().click();await page.waitForTimeout(1500);await page.screenshot({path:path.join(output,'packaged-skirk-7.1.png'),timeout:10000});return page.evaluate(()=>({font:getComputedStyle(document.querySelector('main')).fontFamily,fonts:[...document.fonts].map(f=>({family:f.family,status:f.status}))}))});
 await step('create local custom banner using original editor',async()=>{
  await settings();await page.locator('.sidebar button').filter({hasText:'Custom Banner'}).click();
  if(await page.locator('.disclaimer button').isVisible())await page.locator('.disclaimer button').click();
  await page.locator('.item.blank button.add').click();await page.locator('#cardEditor').waitFor();
  await page.locator('#uploadFile').setInputFiles(path.resolve(__dirname,'../src/images/characters/splash-art/5star/skirk.webp'));
  await page.locator('#cardEditor .main-art .setpos').click();
  await page.locator('#cardEditor button.detail').click();
  await page.locator('#bannerName').fill('Offline Skirk Test');await page.locator('#charName').fill('Offline Skirk');await page.locator('#charTitle').fill('Local test banner');
  for(const name of ['Diona','Candace','Mika']){await page.locator('.rateup-item.blank .add').first().click();await page.locator('.picker button.item').filter({hasText:name}).click()}
  await page.locator('button').filter({hasText:'Generate Image'}).click();
  await page.locator('img[alt="Preview Banner"]').waitFor();
  await page.locator('.vision-picker .header .close').click();
  await page.locator('button').filter({hasText:'Finish and Wish'}).click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('WishSimulator.App')).data.config.version.startsWith('Custom-'));
  const value=await snap();const custom=value.banners[0];assert.equal(custom.bannerName,'Offline Skirk Test');assert.equal(custom.rateup.length,3);assert.ok(custom.images.artURL.startsWith('data:image/'));assert.ok(custom.images.thumbnail.startsWith('data:image/'));
  await page.screenshot({path:path.join(output,'packaged-custom-banner.png'),timeout:10000});return {name:custom.bannerName,artBytes:custom.images.artURL.length,thumbnailBytes:custom.images.thumbnail.length};
 });
 await step('custom banner can make a real wish',async()=>{const before=await snap();await page.locator('.single.wish-button').click();await page.locator('.meteor-wrapper.show').click();await page.locator('.meteor-wrapper.show .skip').click();await page.locator('.wish-result button.close').click();await page.locator('.wish-result').waitFor({state:'hidden'});if(await page.locator('.milestone').isVisible()){await page.keyboard.press('Space');await page.locator('.milestone').waitFor({state:'hidden'})}assert.equal((await snap()).histories.length,before.histories.length+1)});
 await step('change a real setting and persist custom artwork across restart',async()=>{
  await settings();await page.locator('.sidebar button').filter({hasText:'Options'}).click();
  await page.locator('input[type="number"]').first().fill('7');await page.locator('input[type="number"]').first().press('Tab');
  await page.keyboard.press('Escape');const before=await snap();await app.close();await launch();const after=await snap();assert.deepEqual(after,before);assert.equal(after.settings.data.config.multipull,7);assert.equal(after.banners[0].bannerName,'Offline Skirk Test');return {config:after.settings.data.config,customBanners:after.banners.length};
 });
 await step('backup export and import through real UI and native IPC',async()=>{
  const file=path.join(output,'ui-exported-backup.json');
  await app.evaluate(({dialog},file)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:file});dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]})},file);
  await settings();await page.locator('.sidebar button').filter({hasText:'Backup'}).click();
  await page.locator('button').filter({hasText:'Export backup'}).click();await page.getByRole('status').filter({hasText:'Backup exported.'}).waitFor();
  assert.ok(fs.existsSync(file));const expected=JSON.parse(fs.readFileSync(file,'utf8'));
  await page.locator('button').filter({hasText:'Back up now'}).click();
  page.once('dialog',d=>d.accept());await page.locator('button').filter({hasText:'Import backup'}).click();
  await page.waitForTimeout(1500);await page.locator('.modal .pop-footer button').last().click();assert.deepEqual(await snap(),expected);
  return {file,customBanners:expected.banners.length,histories:expected.histories.length};
 });
 await step('custom-banner operations issue no external requests or uncaught errors',async()=>{assert.deepEqual(results.errors,[]);assert.deepEqual(results.external,[])});
}finally{if(page){results.finalBody=await page.locator('body').innerText().catch(()=>'<closed>');await page.screenshot({path:path.join(output,'custom-last-state.png'),timeout:5000}).catch(()=>{})}save();if(app)await app.close().catch(()=>{})}})().catch(e=>{console.error(e);process.exitCode=1});



