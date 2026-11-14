const {_electron}=require('playwright');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{
  const output=path.resolve(__dirname,'../../outputs/desktop-1.3.0');const profile=path.join(output,'test-profiles','fresh-'+Date.now());
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const app=await _electron.launch({executablePath:path.join(output,'win-unpacked','Genshin Wish Offline.exe'),args:['--profile='+profile],cwd:output,env,timeout:60000});
  const page=await app.firstWindow();let errors=[],failed=[],external=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('requestfailed',r=>failed.push({url:r.url(),failure:r.failure()}));
  page.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url())});
  await page.waitForTimeout(7000);
  console.log('PROFILE',profile);console.log('TITLE',await page.title());console.log('BODY',await page.locator('body').innerText());
  fs.writeFileSync(path.join(output,'smoke-initial.json'),JSON.stringify({profile,errors,failed,external,body:await page.locator('body').innerText()},null,2));
  try {await page.screenshot({path:path.join(output,'first-launch.png'),timeout:10000})}catch(e){console.log('SCREENSHOT',String(e))}
  // Leave this isolated test instance running for native interface inspection.
  fs.writeFileSync(path.join(output,'test-pid.txt'),String(app.process().pid));
  process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
