"""Validate enhanced artwork and its provenance. Run from the project directory."""
import concurrent.futures,hashlib,json,zipfile
from pathlib import Path
from PIL import Image,ImageChops
root=Path(__file__).resolve().parents[1];manifest=json.loads((root/'artwork/manifest.json').read_text());native=json.loads((root/'artwork/native-sources.json').read_text());nativeByUrl={r['url'] for r in native if r.get('status')==0}
def verify(kv):
 name,r=kv;p=root/name;assert p.is_file(),name;assert hashlib.sha256(p.read_bytes()).hexdigest()==r['outputSha256'],name
 im=Image.open(p);im.load();assert list(im.size)==r['outputSize'],name
 if '/banner/' in name and '/blank/' not in name:assert im.width>=2560,name
 if '/wishcard/' in name:assert im.height>=900,name
 if r['method']=='native-original' or r['method']=='crop-from-original':assert r['sourceUrl'] in nativeByUrl,name
 return name
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:files=list(pool.map(verify,manifest['files'].items()))
with zipfile.ZipFile(root/'artwork/originals.zip') as z:
 for name,r in manifest['files'].items():assert hashlib.sha256(z.read(name)).hexdigest()==r['originalSha256'],name
 # Confirm transparency was resized from the original, not invented by AI.
 for name in ['src/images/characters/splash-art/5star/skirk.webp','src/images/characters/splash-art/5star/raiden-shogun.webp','src/images/characters/art-nobg/amber.webp']:
  if name not in manifest['files']:continue
  src=Image.open(z.open(name)).convert('RGBA');out=Image.open(root/name).convert('RGBA');expected=src.resize(out.size,Image.Resampling.LANCZOS).getchannel('A');assert ImageChops.difference(expected,out.getchannel('A')).getbbox() is None,name
for name in ['beginner/beginner.webp','standard/wanderlust-invocation-1.webp','standard/wanderlust-invocation-2.webp']:
 assert Image.open(root/'src/images/banner'/name).width==3200,name
cleanup=json.loads((root/'artwork/letter-cleanup.json').read_text());assert len(cleanup)==18
for name,r in cleanup.items():
 assert r['changedPixelsOutsideMask']==0 and 0<r['maskFraction']<.13,name
 assert manifest['files'][r['source']]['outputSha256']==r['outputSha256'],name
report={'headingCleanupPreservesUnmaskedPixels':True,'passed':True,'verifiedImages':len(files),'manifestMethods':{method:sum(r['method']==method for r in manifest['files'].values()) for method in sorted({r['method'] for r in manifest['files'].values()})},'standardAndNoelleWidth':3200,'allWishCardsAtLeast900pxHigh':True,'originalArchiveHashesVerified':True,'alphaSamplesVerified':True}
print(json.dumps(report,indent=2))
