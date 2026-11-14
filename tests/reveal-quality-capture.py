import pathlib,time,json,wave,pyaudiowpatch as p
out=pathlib.Path(__file__).resolve().parents[2]/'outputs'/'desktop-1.3.0'/'review';out.mkdir(exist_ok=True)
with p.PyAudio() as pa:
 device=pa.get_default_wasapi_loopback();rate=int(device['defaultSampleRate']);channels=device['maxInputChannels'];frames=[]
 with pa.open(format=p.paInt16,channels=channels,rate=rate,input=True,input_device_index=device['index'],frames_per_buffer=1024) as stream:
  (out/'capture-ready.json').write_text(json.dumps({'start':time.time()*1000,'device':device['name']}))
  for _ in range(int(rate/1024*32)):frames.append(stream.read(1024,exception_on_overflow=False))
 with wave.open(str(out/'actual-app-audio.wav'),'wb') as w:w.setnchannels(channels);w.setsampwidth(2);w.setframerate(rate);w.writeframes(b''.join(frames))
print('Captured actual app output',flush=True)
