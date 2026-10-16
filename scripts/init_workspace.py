"""Create new user inputs containing only a wholly synthetic example."""
import argparse,json
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);args=p.parse_args()
if args.output.exists() or args.output.is_symlink():raise SystemExit('Destination exists; no overwrite')
folder=args.output/'input';folder.mkdir(parents=True)
text='这是虚构的知识视频示例。先记录需求，再核对选择。'
profile=[{'key':'synthetic-one','type':'talking_text','narration':text,'headline':'虚构示例','items':['记录需求','核对选择'],'direction':'Synthetic, no real claims'}]
(folder/'script.md').write_text(text,encoding='utf-8');(folder/'renovation-scenes.json').write_text(json.dumps(profile,ensure_ascii=False,indent=2),encoding='utf-8')
