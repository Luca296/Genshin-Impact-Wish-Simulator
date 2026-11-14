"""Reproduce the offline artwork pass from preserved originals; never upscale an upscale."""
import argparse,concurrent.futures,hashlib,json,math,subprocess,time,zipfile,shutil
from pathlib import Path
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('--upscaler',required=True);p.add_argument('--models',required=True);p.add_argument('--cache',default='../audit/hd/cache');p.add_argument('--limit',type=int);p.add_argument('--native-only',action='store_true');a=p.parse_args()
root=Path(__file__).resolve().parents[1];cache=Path(a.cache).resolve();cache.mkdir(parents=True,exist_ok=True)
archive=root/'artwork/originals.zip'
with zipfile.ZipFile(archive) as z:
 for name in z.namelist():
  dst=cache/'originals'/name
  if not dst.exists():dst.parent.mkdir(parents=True,exist_ok=True);dst.write_bytes(z.read(name))
 jobs=z.namelist()
natives={}
for r in json.loads((root/'artwork/native-sources.json').read_text()):
 if r.get('status')==0:natives[(r['name'],r['kind'])]=r
manifestPath=root/'artwork/manifest.json';manifest=json.loads(manifestPath.read_text()) if manifestPath.exists() else {'version':1,'model':'realesrgan-x4plus-anime','modelSha256':hashlib.sha256((Path(a.models)/'realesrgan-x4plus-anime.bin').read_bytes()).hexdigest(),'blendAi':.6,'files':{}}
start=time.time();pending=[];pool=concurrent.futures.ThreadPoolExecutor(max_workers=3)
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def save(job,src,target,aiPath,method,meta):
 original=Image.open(src).convert('RGBA');base=original.resize(target,Image.Resampling.LANCZOS)
 if aiPath:
  result=Image.open(aiPath).convert('RGB').resize(target,Image.Resampling.LANCZOS)
  result=Image.blend(base.convert('RGB'),result,.6)
  if original.getchannel('A').getextrema()[0]<255:result.putalpha(base.getchannel('A'))
 else:result=base
 dst=root/job;tmp=dst.with_suffix('.hd.webp')
 if method=='native-resolution-retained' and tuple(target)==original.size:shutil.copyfile(src,tmp)
 else:result.save(tmp,format='WEBP',quality=95,method=4,exact=True)
 tmp.replace(dst)
 record={'originalSha256':digest(cache/'originals'/job),'sourceSha256':digest(src),'outputSha256':digest(dst),'originalSize':Image.open(cache/'originals'/job).size,'sourceSize':original.size,'outputSize':target,'method':method,**meta};return job,record
for i,job in enumerate(jobs[:a.limit] if a.limit else jobs):
 dst=root/job;old=manifest['files'].get(job)
 kindNow='wish' if '/wishcard/' in job else 'portrait' if '/art-nobg/' in job or '/face/' in job else '';candidate=natives.get((Path(job).stem,kindNow))
 if a.native_only and not candidate:continue
 if old and dst.exists() and digest(dst)==old['outputSha256'] and (not candidate or old.get('sourceUrl')==candidate['url']):continue
 src=cache/'originals'/job;im=Image.open(src);method='anime4x-downsample-blend';meta={}
 name=Path(job).stem;kind='wish' if '/wishcard/' in job else 'portrait' if '/art-nobg/' in job or '/face/' in job else ''
 native=natives.get((name,kind))
 if native:
  src=root/native['bundledSource'];im=Image.open(src);meta={'sourceUrl':native['url']};method='crop-from-original' if native.get('derivation') else 'native-original';target=im.size
  if native.get('derivation'):meta['derivation']=native['derivation']
  pending.append(pool.submit(save,job,src,target,None,method,meta));continue
 if max(im.size)<200:
  manifest['files'][job]={'originalSha256':digest(src),'outputSha256':digest(dst),'originalSize':im.size,'outputSize':im.size,'method':'retained-no-native-original-found'};continue
 if any(folder in job for folder in ['/banner/character-events/','/banner/weapons/','/banner/standard/','/banner/beginner/']):
  factor=3200/im.width
  if im.width>=2560:factor=1
 elif '/banner/blank/' in job:factor=2
 elif '/background/' in job:factor=min(2,4096/max(im.size))
 else:factor=min(2,4096/max(im.size))
 target=(round(im.width*factor),round(im.height*factor))
 if factor<=1:pending.append(pool.submit(save,job,src,target,None,'native-resolution-retained',meta));continue
 raw=cache/(str(i)+'-ai4.png');log=cache/(str(i)+'.log')
 if not raw.exists():
  with log.open('w') as out:
   result=subprocess.run([str(Path(a.upscaler).resolve()),'-i',str(src),'-o',str(raw),'-n','realesrgan-x4plus-anime','-m',str(Path(a.models).resolve()),'-s','4','-t','128','-j','1:1:1'],stdout=out,stderr=out,timeout=240)
  if result.returncode or not raw.exists():raise RuntimeError('Upscaler failed: '+job+' '+str(log))
 pending.append(pool.submit(save,job,src,target,raw,method,meta))
 finished=[f for f in pending if f.done()]
 for f in finished:
  key,record=f.result();manifest['files'][key]=record;pending.remove(f)
 if i%10==0:
  manifestPath.write_text(json.dumps(manifest,indent=2));print(f'{i+1}/{len(jobs)} processed; {time.time()-start:.0f}s',flush=True)
for f in concurrent.futures.as_completed(pending):
 key,record=f.result();manifest['files'][key]=record
pool.shutdown();manifestPath.write_text(json.dumps(manifest,indent=2));print('COMPLETE',len(manifest['files']),'in',round(time.time()-start),'seconds',flush=True)
