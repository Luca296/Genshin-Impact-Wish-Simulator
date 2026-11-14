const {app,BrowserWindow,protocol,session,net,ipcMain,dialog,Menu}=require('electron');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const backups=require('./backups.cjs');
require('./network-lock.cjs').install(net);
const profileArg=process.argv.find(a=>a.startsWith('--profile='));
if(profileArg) app.setPath('userData',path.resolve(profileArg.slice(10)));
else app.setPath('userData',path.join(app.getPath('appData'),'GenshinWishOffline'));
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('disable-domain-reliability');
app.commandLine.appendSwitch('disable-sync');
// Wish movies are game animations, not a system media player. Leave hardware
// transport buttons available to the user's music/video applications.
app.commandLine.appendSwitch('disable-features','HardwareMediaKeyHandling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('no-proxy-server');
app.commandLine.appendSwitch('host-resolver-rules','MAP * ~NOTFOUND');
protocol.registerSchemesAsPrivileged([{scheme:'wish',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true,corsEnabled:true}}]);
let win,ready=false,closing=false;
const backupDir=()=>path.join(app.getPath('userData'),'backups');
const log=(kind,value)=>{fs.mkdirSync(app.getPath('userData'),{recursive:true});fs.appendFileSync(path.join(app.getPath('userData'),'diagnostics.jsonl'),JSON.stringify({time:new Date().toISOString(),kind,value})+'\n')};
app.whenReady().then(async()=>{
  await session.defaultSession.setProxy({mode:'fixed_servers',proxyRules:'http=127.0.0.1:9;https=127.0.0.1:9',proxyBypassRules:'<-loopback>'});
  session.defaultSession.webRequest.onBeforeRequest((details,callback)=>{
    const allowed=/^(wish:\/\/game\/|blob:wish:\/\/game\/|data:|file:)/.test(details.url);
    if(!allowed) log('blocked-external-request',details.url);
    callback({cancel:!allowed});
  });
  session.defaultSession.setPermissionRequestHandler((_wc,_permission,cb)=>cb(false));
  const root=path.resolve(__dirname,'../build');
  protocol.handle('wish',async request=>{
    try {
      const url=new URL(request.url);
      if(url.hostname!=='game') return new Response('Forbidden',{status:403});
      const relative=decodeURIComponent(url.pathname).replace(/^\/+/, '');
      let file=path.resolve(root,relative || 'index.html');
      if(file!==root && !file.startsWith(root+path.sep)) return new Response('Forbidden',{status:403});
      if(!fs.existsSync(file)) {log('missing-local-file',url.pathname);return new Response('Not found',{status:404})}
      const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.mp4':'video/mp4','.webm':'video/webm','.ogg':'audio/ogg','.mp3':'audio/mpeg'};
      const content=fs.readFileSync(file);
      const headers=new Headers({'Content-Type':mime[path.extname(file)]||'application/octet-stream','Accept-Ranges':'bytes'});
      headers.set('Content-Security-Policy',"default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' data: blob:; img-src 'self' data: blob:; media-src 'self' data: blob:; font-src 'self' data:; frame-src 'none'; object-src 'none'; base-uri 'self'");
      const range=request.headers.get('Range');
      if(range){
        const match=/^bytes=(\d*)-(\d*)$/.exec(range);
        if(!match)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${content.length}`}});
        const start=match[1]?Number(match[1]):Math.max(0,content.length-Number(match[2]));
        const end=match[1]&&match[2]?Math.min(Number(match[2]),content.length-1):content.length-1;
        if(start>end||start>=content.length)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${content.length}`}});
        headers.set('Content-Range',`bytes ${start}-${end}/${content.length}`);headers.set('Content-Length',String(end-start+1));
        return new Response(content.subarray(start,end+1),{status:206,headers});
      }
      headers.set('Content-Length',String(content.length));
      return new Response(content,{headers});
    } catch(error){log('protocol-error',String(error));return new Response('Local resource error',{status:500})}
  });
  ipcMain.handle('backup:save',(_e,text)=>backups.save(backupDir(),text));
  ipcMain.handle('backup:list',()=>backups.list(backupDir()));
  ipcMain.handle('backup:read',(_e,name)=>{
    if(!backups.list(backupDir()).includes(name)) throw Error('Unknown backup');
    const text=fs.readFileSync(path.join(backupDir(),name),'utf8');backups.validate(text);return text;
  });
  ipcMain.handle('backup:export',async(_e,text)=>{
    backups.validate(text);
    const {filePath,canceled}=await dialog.showSaveDialog(win,{defaultPath:`WishSimulator-Backup-${new Date().toISOString().slice(0,10)}.json`,filters:[{name:'Simulator backup',extensions:['json','bin']}]});
    if(canceled)return false;backups.writeAtomic(filePath,text);return true;
  });
  ipcMain.handle('backup:import',async()=>{
    const {filePaths,canceled}=await dialog.showOpenDialog(win,{properties:['openFile'],filters:[{name:'Simulator backup',extensions:['json','bin','txt']}]});
    if(canceled)return null;const text=fs.readFileSync(filePaths[0],'utf8');backups.validate(text);return text;
  });
  win=new BrowserWindow({width:1440,height:900,minWidth:1000,minHeight:650,title:'Genshin Wish Offline',backgroundColor:'#ffffff',webPreferences:{backgroundThrottling:false,preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,autoplayPolicy:'no-user-gesture-required'}});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('before-input-event',(event,input)=>{
    if (/^Media(PlayPause|Play|Pause|Stop|NextTrack|PreviousTrack)$/.test(input.key)) event.preventDefault();
  });
  win.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith('wish://game/'))event.preventDefault()});
  win.webContents.on('console-message',(_event,level,message)=>{if(level>=2)log('console',message)});
  win.webContents.on('render-process-gone',(_e,d)=>log('renderer-gone',d));
  ipcMain.on('desktop:ready',()=>{ready=true});
  const command=c=>{if(ready)win.webContents.send('desktop:command',c)};
  Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'Game',submenu:[{label:'Export backup…',click:()=>command('export')},{label:'Import backup…',click:()=>command('import')},{label:'Restore automatic backup…',click:()=>command('restore')},{label:'Open save folder',click:()=>require('electron').shell.openPath(app.getPath('userData'))},{type:'separator'},{role:'quit'}]},{label:'View',submenu:[{role:'togglefullscreen'},{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'}]},{label:'Help',submenu:[{label:'Credits and licenses',click:()=>dialog.showMessageBox(win,{title:'Credits',message:'Genshin Wish Offline',detail:fs.readFileSync(path.join(__dirname,'../THIRD-PARTY-NOTICES.md'),'utf8')})}]}]));
  win.on('close',event=>{
    if(!ready||closing)return;
    event.preventDefault();closing=true;
    win.webContents.executeJavaScript('window.offlineGame.flush()').catch(e=>log('close-backup-error',String(e))).finally(async()=>{await session.defaultSession.flushStorageData();win.destroy();app.quit()});
  });
  await win.loadURL('wish://game/');
});
app.on('window-all-closed',()=>app.quit());
