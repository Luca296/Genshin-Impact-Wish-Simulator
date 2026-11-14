"""Check WASAPI output captured by packaged-reveal-quality.cjs. No microphone."""
from pathlib import Path
import array,json,math,wave
out=Path(__file__).resolve().parents[2]/'outputs'/'desktop-1.3.0'/'review'
with wave.open(str(out/'actual-app-audio.wav'),'rb') as w:
 assert w.getsampwidth()==2
 rate=w.getframerate();channels=w.getnchannels();samples=array.array('h',w.readframes(w.getnframes()))
window=int(rate*channels*.05)
levels=[20*math.log10(max(1e-10,math.sqrt(sum(x*x for x in samples[i:i+window])/len(samples[i:i+window]))/32768)) for i in range(0,len(samples),window)]
run=longest=0
for level in levels:
 run=run+.05 if level < -55 else 0
 longest=max(longest,run)
report={'windowSeconds':.05,'silenceThresholdDbfs':-55,'longestQuietRunSeconds':round(longest,3),'passed':longest<.15,'note':'System output loopback; avoid other playing applications during capture.'}
(out/'audio-continuity.json').write_text(json.dumps(report,indent=2));print(json.dumps(report));assert report['passed'],'Unexpected silent gap in actual application output'
