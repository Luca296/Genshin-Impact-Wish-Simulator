const {_electron}=require('playwright');const fs=require('node:fs');const path=require('node:path');const {spawn}=require('node:child_process');const assert=require('node:assert/strict');
(async()=>{
 const out=path.resolve(__dirname,'../../outputs/desktop-1.3.0'),env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const app=await _electron.launch({executablePath:path.join(out,'win-unpacked','Genshin Wish Offline.exe'),args:['--profile='+path.join(out,'test-profiles','audio-'+Date.now())],cwd:out,env,timeout:90000});
 try{
  const page=await app.firstWindow();page.setDefaultTimeout(20000);await page.locator('.modal .pop-footer button').last().click({timeout:60000});await page.locator('#header .button.character-event').first().click();
  const ready=path.join(out,'audio-ready.txt');if(fs.existsSync(ready))fs.unlinkSync(ready);
  const capture=spawn('python',['-u',path.join(__dirname,'capture-loopback.py')],{windowsHide:true});let captureOutput='';capture.stdout.on('data',b=>captureOutput+=b);capture.stderr.on('data',b=>captureOutput+=b);const completed=new Promise(resolve=>capture.on('exit',code=>resolve(code)));
  for(let i=0;i<100&&!fs.existsSync(ready);i++)await page.waitForTimeout(100);assert.ok(fs.existsSync(ready),'Loopback capture ready');
  await page.locator('.single.wish-button').click();await page.waitForFunction(()=>document.querySelector('.meteor-wrapper.show video')?.currentTime>.3);
  const media=await page.locator('.meteor-wrapper.show video').evaluate(v=>({time:v.currentTime,muted:v.muted,volume:v.volume,src:v.currentSrc,decodedFrames:v.getVideoPlaybackQuality().totalVideoFrames}));
  let audible=false;for(let i=0;i<30&&!audible;i++){audible=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.isCurrentlyAudible());if(!audible)await page.waitForTimeout(100)}
  assert.equal(media.muted,false);assert.ok(audible,'Electron reports real audio output from game webContents');
  await page.screenshot({path:path.join(out,'packaged-wish-animation.png'),timeout:10000});
  const code=await completed;assert.equal(code,0,captureOutput);const measured=JSON.parse(fs.readFileSync(path.join(out,'audio-capture.json'),'utf8'));assert.ok(measured.rms>0.0001);
  const result={passed:true,media,audible,loopback:measured,note:'System loopback can include other applications. Electron independently reported this game as audible during the animation.'};fs.writeFileSync(path.join(out,'audio-test-results.json'),JSON.stringify(result,null,2));console.log(result);
 }finally{await app.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
