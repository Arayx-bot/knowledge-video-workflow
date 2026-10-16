"""Basic data-driven preview renderer; never uses the private legacy scene templates."""
import json,os,subprocess,sys
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
root=Path(sys.argv[1]);plan=json.loads((root/'output/video-plan.json').read_text());out=root/'output/visual-preview.mp4'
font_path=os.environ.get('KNOWLEDGE_VIDEO_FONT')
if not font_path or not Path(font_path).is_file():raise SystemExit('Set KNOWLEDGE_VIDEO_FONT to a locally installed font supporting the narration.')
font=ImageFont.truetype(font_path,40);small=ImageFont.truetype(font_path,28)
args=['ffmpeg','-y','-v','error','-f','rawvideo','-pixel_format','rgb24','-video_size','720x1280','-framerate','30','-i','pipe:0']
if plan['voice']['provider']!='mock':args+=['-i',str(root/'public/audio/voice.wav')]
args+=['-c:v','libx264','-pix_fmt','yuv420p']
if plan['voice']['provider']!='mock':args+=['-c:a','aac','-b:a','160k']
args+=['-movflags','+faststart',str(out)]
process=subprocess.Popen(args,stdin=subprocess.PIPE)
try:
 for scene in plan['scenes']:
  image=Image.new('RGB',(720,1280),'#F4F1EB');draw=ImageDraw.Draw(image)
  lines=[scene['visual']['headline'],*scene['visual'].get('items',[])]
  if 'metric' in scene['visual']:lines.append(str(scene['visual']['metric'])+scene['visual'].get('unit',''))
  y=220
  for line in lines:
   for offset in range(0,len(line),15):draw.text((55,y),line[offset:offset+15],font=font,fill='#282E2B');y+=65
  narration=scene['narration'];y=1000
  for offset in range(0,len(narration),21):draw.text((50,y),narration[offset:offset+21],font=small,fill='#49785C');y+=42
  for _ in range(round(scene['durationSeconds']*30)):process.stdin.write(image.tobytes())
 process.stdin.close()
except BaseException:
 process.kill();process.wait();raise
if process.wait()!=0:raise SystemExit('FFmpeg render failed')
print(out)
