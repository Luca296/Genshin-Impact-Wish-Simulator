const {test}=require('node:test');const assert=require('node:assert/strict');const path=require('node:path');const fs=require('node:fs');
require('fake-indexeddb/auto');
global.document=new EventTarget();global.localStorage=new class{data=new Map();getItem(k){return this.data.get(k)??null}setItem(k,v){this.data.set(k,String(v))}removeItem(k){this.data.delete(k)}clear(){this.data.clear()}}();
let game;
test('real game rules, deterministic pity and guarantees',async t=>{
  const output=await require('esbuild').build({entryPoints:['tests/game-entry.js'],bundle:true,platform:'node',format:'cjs',write:false,plugins:[{name:'test-json-loader',setup(build){build.onLoad({filter:/[\\/]Wish\.js$/},args=>{const dir=path.resolve('src/lib/data/banners/events');const banners=Object.fromEntries(fs.readdirSync(dir).map(f=>[path.basename(f,'.json'),JSON.parse(fs.readFileSync(path.join(dir,f)))]));const text=fs.readFileSync(args.path,'utf8').replace('import(`../../data/banners/events/${version}.json`)','Promise.resolve(__banners[version])');return {contents:'const __banners='+JSON.stringify(banners)+';'+text,resolveDir:path.dirname(args.path),loader:'js'};});}}],alias:{$lib:path.resolve('src/lib'),'$app/environment':path.resolve('tests/environment.js')},logLevel:'silent'});
  fs.writeFileSync('tests/game-bundle.cjs',output.outputFiles[0].text);game=require('./game-bundle.cjs');
  const {rates,Wish,roll,localPity,guaranteedStatus,storageLocal,HistoryManager}=game;
  await t.test('character soft pity starts at 74 and hard pity is 90',()=>{assert.equal(rates({currentPity:73}),.6);assert.ok(rates({currentPity:74})>.6);assert.equal(rates({currentPity:90}),100)});
  await t.test('weapon hard pity is 80',()=>assert.equal(rates({currentPity:80,maxPity:80,baseRate:.7,rateIncreasedAt:63}),100));
  const random=Math.random;Math.random=()=>.999999;
  try{
    await t.test('90th character roll overrides simultaneous four-star pity',async()=>{localStorage.clear();await Wish.init('7.1',2);localPity.set('pity5-character-event',89);localPity.set('pity4-character-event',9);const r=await roll('character-event',Wish,0);assert.equal(r.rarity,5);assert.equal(r.pity,90);assert.equal(localPity.get('pity5-character-event'),0);assert.equal(localPity.get('pity4-character-event'),10);assert.equal((await roll('character-event',Wish,0)).rarity,4)});
    await t.test('lost five-star is followed by guaranteed featured Skirk',async()=>{localStorage.clear();await Wish.init('7.1',2);guaranteedStatus.set('character-event-5star',true);localPity.set('pity5-character-event',89);const r=await roll('character-event',Wish,0);assert.equal(r.name,'skirk');assert.equal(r.status,'guaranteed');assert.equal(guaranteedStatus.get('character-event-5star'),false)});
    await t.test('weapon reaches five stars on 80th roll',async()=>{localStorage.clear();await Wish.init('7.1',2);localPity.set('pity5-weapon-event',79);assert.equal((await roll('weapon-event',Wish,0)).rarity,5)});
    await t.test('pity and guarantee persist across banner versions',async()=>{localStorage.clear();localPity.set('pity5-character-event',42);guaranteedStatus.set('character-event-5star',true);await Wish.init('1.0',1);await Wish.init('7.1',2);assert.equal(localPity.get('pity5-character-event'),42);assert.equal(guaranteedStatus.get('character-event-5star'),true)});
    await t.test('every banner phase resolves all available wish types and rarities',async()=>{
      for(const file of fs.readdirSync('src/lib/data/banners/events')) {
        const {data}=JSON.parse(fs.readFileSync(path.join('src/lib/data/banners/events',file)));
        for(const phase of data) {
          localStorage.clear();await Wish.init(path.basename(file,'.json'),phase.phase);
          for(const type of ['beginner','standard','character-event','weapon-event',...(phase.banners.chronicled?['chronicled']:[])]) {
            for(const rarity of [3,4,5]) {
              const result=Wish.getItem(rarity,type,0);
              assert.ok(result&&Number.isFinite(result.itemID),`${file} phase ${phase.phase}: ${type} ${rarity}`);
            }
          }
        }
      }
    });
    await t.test('actual rolls append persistent history and inventory',async()=>{const records=await HistoryManager.getAllHistories();assert.ok(records.length>=4);assert.ok(records.every(r=>Number.isFinite(r.itemID)))});
    await t.test('real duplicate pulls keep constellations unspent beyond six',async()=>{
      localStorage.clear();await Wish.init('7.1',2);let itemID;
      for(let i=0;i<9;i++){
        guaranteedStatus.set('character-event-5star',true);localPity.set('pity5-character-event',89);
        const r=await roll('character-event',Wish,0);itemID=r.itemID;
        if(i>0)assert.equal(r.stelaFortuna,true);
      }
      const saved=game.owneditem.get(itemID);assert.equal(saved.activated,0);assert.equal(saved.materials,8);
    });
    await t.test('real weapon pulls create distinct unrefined copies',async()=>{
      localStorage.clear();await Wish.init('7.1',2);
      for(let i=0;i<4;i++){localPity.set('pity5-weapon-event',79);await roll('weapon-event',Wish,0)}
      const copies=Object.values(game.owneditem.getAll()).flatMap(r=>r.copies||[]);
      assert.equal(copies.length,4);assert.equal(new Set(copies.map(c=>c.id)).size,4);assert.ok(copies.every(c=>c.refinement===1));
    });
  }finally{Math.random=random;fs.unlinkSync('tests/game-bundle.cjs')}
});
