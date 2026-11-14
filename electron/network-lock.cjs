// Main-process network APIs are disabled as well as Chromium requests. There is
// no updater, telemetry, HTTP server or network dependency in the desktop game.
function install(electronNet) {
  const deny=()=>{throw new Error('External networking is disabled in Genshin Wish Offline')};
  const http=require('node:http'),https=require('node:https');
  http.request=http.get=https.request=https.get=deny;
  const sockets=require('node:net');
  sockets.connect=sockets.createConnection=deny;
  sockets.Socket.prototype.connect=deny;
  require('node:tls').connect=deny;
  require('node:dgram').createSocket=deny;
  const dns=require('node:dns');
  for(const name of ['lookup','resolve','resolve4','resolve6','reverse']) {dns[name]=deny;if(dns.promises[name])dns.promises[name]=async()=>deny()}
  globalThis.fetch=async()=>deny();
  const fetch=electronNet.fetch.bind(electronNet);
  electronNet.fetch=(url,options)=>{
    if(!String(url).startsWith('file:')) return Promise.reject(new Error('External networking is disabled'));
    return fetch(url,options);
  };
  electronNet.request=deny;
}
module.exports={install};
