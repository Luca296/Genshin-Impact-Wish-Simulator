import pyaudiowpatch as p, wave, pathlib, json, struct, math, sys
root=pathlib.Path(__file__).resolve().parents[2]/'outputs'/'elemental-reveal'
with p.PyAudio() as pa:
    device=pa.get_default_wasapi_loopback()
    rate=int(device['defaultSampleRate']); channels=device['maxInputChannels']; frames=[]
    with pa.open(format=p.paInt16,channels=channels,rate=rate,input=True,input_device_index=device['index'],frames_per_buffer=1024) as stream:
        (root/'audio-ready.txt').write_text('ready')
        for _ in range(int(rate/1024*12)):
            frames.append(stream.read(1024,exception_on_overflow=False))
data=b''.join(frames)
with wave.open(str(root/'packaged-audio.wav'),'wb') as out:
    out.setnchannels(channels); out.setsampwidth(2); out.setframerate(rate); out.writeframes(data)
values=struct.unpack('<'+str(len(data)//2)+'h',data)
result={'device':device['name'],'seconds':len(values)/channels/rate,'rms':math.sqrt(sum(v*v for v in values)/len(values))/32768,'peak':max(abs(v) for v in values)/32768}
(root/'audio-capture.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result))
