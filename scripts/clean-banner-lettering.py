"""Remove only old heading/subheading ink, retaining each poster's original blend."""
import argparse,hashlib,json,subprocess,zipfile
from pathlib import Path
import cv2,numpy as np
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('--upscaler',required=True);p.add_argument('--models',required=True);p.add_argument('--cache',required=True);a=p.parse_args()
root=Path(__file__).resolve().parents[1];cache=Path(a.cache).resolve();cache.mkdir(parents=True,exist_ok=True);layouts=json.loads((root/'src/lib/data/banner-label-layouts.json').read_text());manifestPath=root/'artwork/manifest.json';manifest=json.loads(manifestPath.read_text());records={}
with zipfile.ZipFile(root/'artwork/originals.zip') as z:
 for name in layouts:
  folder='weapons' if name.startswith('epitome') else 'character-events';key='src/images/banner/'+folder+'/'+name+'.webp';im=Image.open(z.open(key)).convert('RGBA');pixels=np.array(im);gray=cv2.cvtColor(pixels[:,:,:3],cv2.COLOR_RGB2GRAY);roi=np.zeros(gray.shape,np.uint8)
  alternate=name in ['when-warm-winds-cavort-1','surging-ballad-1','epitome-invocation-105']
  boxes=[(50,125,475,195),(50,215,365,253)] if name=='surging-ballad-1' else [(45,70,480,198),(50,215,365,253)] if alternate else [(45,35,575 if name.startswith('to-the-looking-glass') else 480,158),(45,175,365,213)]
  for x1,y1,x2,y2 in boxes:roi[y1:y2,x1:x2]=255
  ink=((gray<195)&(roi>0)).astype(np.uint8)*255;count,labels,stats,_=cv2.connectedComponentsWithStats(ink,8);mask=np.zeros_like(ink)
  for i,(x,y,w,h,area) in enumerate(stats[1:],1):
   if 2<=w<=110 and 3<=h<=75 and 8<=area<=5500:mask[labels==i]=255
  mask=cv2.dilate(mask,np.ones((5,5),np.uint8));assert (mask>0).mean()<.13,name
  rgb=cv2.inpaint(pixels[:,:,:3],mask,5,cv2.INPAINT_TELEA);assert np.array_equal(rgb[mask==0],pixels[:,:,:3][mask==0]),name
  clean=Image.fromarray(rgb).convert('RGBA');clean.putalpha(im.getchannel('A'));src=cache/(name+'-clean.png');clean.save(src);raw=cache/(name+'-ai4.png');log=cache/(name+'.log')
  with log.open('w') as f:
   run=subprocess.run([str(Path(a.upscaler).resolve()),'-i',str(src),'-o',str(raw),'-n','realesrgan-x4plus-anime','-m',str(Path(a.models).resolve()),'-s','4','-t','128','-j','1:1:1'],stdout=f,stderr=f,timeout=180)
  assert run.returncode==0,name;size=(3200,round(im.height*3200/im.width));base=clean.resize(size,Image.Resampling.LANCZOS);ai=Image.open(raw).convert('RGB').resize(size,Image.Resampling.LANCZOS);out=Image.blend(base.convert('RGB'),ai,.6)
  if im.getchannel('A').getextrema()[0]<255:out.putalpha(base.getchannel('A'))
  dst=root/key;out.save(dst,format='WEBP',quality=95,method=4,exact=True)
  manifest['files'][key].update({'sourceSha256':hashlib.sha256(src.read_bytes()).hexdigest(),'outputSha256':hashlib.sha256(dst.read_bytes()).hexdigest(),'method':'letter-cleanup-and-anime4x-blend','sourceSize':im.size,'outputSize':size})
  records[name]={'source':key,'boxes':boxes,'threshold':195,'dilation':5,'inpaintRadius':5,'inpaintMethod':'OpenCV Telea','maskPixels':int((mask>0).sum()),'maskFraction':float((mask>0).mean()),'changedPixelsOutsideMask':0,'outputSha256':manifest['files'][key]['outputSha256']};print('CLEANED',name,flush=True)
(root/'artwork/letter-cleanup.json').write_text(json.dumps(records,indent=2));manifestPath.write_text(json.dumps(manifest,indent=2));print('COMPLETE',len(records),flush=True)
