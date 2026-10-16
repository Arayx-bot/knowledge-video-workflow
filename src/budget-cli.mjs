import {mkdir,readFile,writeFile,stat} from 'node:fs/promises';
import {spawnSync,spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {existsSync} from 'node:fs';
import {assertBudgetPlan} from './validate-schema.mjs';

export const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const normalize=s=>s.replace(/\s/g,'');
export function captionChunks(text,max=25){
  const result=[];let chunk='';
  for(const char of text){chunk+=char;if(chunk.length>=max||(/[。！？；]/.test(char)&&chunk.length>=9)){result.push(chunk);chunk='';}}
  if(chunk)result.push(chunk);return result;
}
function run(cmd,args){const r=spawnSync(cmd,args,{encoding:'utf8'});if(r.status!==0)throw Error(`${cmd}: ${r.stderr||r.error?.message||'failed'}`);return r.stdout;}
export function probe(path){const value=Number(run('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',path]).trim());if(!Number.isFinite(value)||value<=0)throw Error(`没有有效音频：${path}`);return value;}
export function buildPlan(script,profile,durations,provider='mock',portable=false){
  if(!normalize(script))throw Error('脚本为空');if(script.length>12000)throw Error('输入过长');
  if(normalize(script)!==normalize(profile.map(x=>x.narration).join('')))throw Error('分镜口播与定稿不一致，请同步 input/renovation-scenes.json。');
  let frames=0;
  const scenes=profile.map((p,i)=>{
    const count=Math.ceil(durations[i]*30);if(!Number.isFinite(count)||count<=0)throw Error('无效场景时长');
    const scene={id:`scene-${String(i+1).padStart(2,'0')}`,startSeconds:frames/30,durationSeconds:count/30,narration:p.narration,visualType:p.type,visual:{headline:p.headline,accent:'#D96348',items:p.items},caption:p.narration};
    if(p.type==='number'){if(portable&&(!Number.isFinite(p.metric)||typeof p.unit!=='string'))throw Error('Portable number scenes require explicit metric and unit');scene.visual.metric=portable?p.metric:(p.key==='experience'?5:2);scene.visual.unit=portable?p.unit:(p.key==='experience'?'年':'万');}
    if(p.type==='comparison'){scene.visual.leftLabel=p.key==='spend-effect'?'实际花费':'值得多花';scene.visual.rightLabel=p.key==='spend-effect'?'呈现效果':'多花没效果';}
    if(p.type==='image_broll')scene.visual.imageQuery='装修预算计算器示意界面';
    frames+=count;return scene;
  });
  const plan={schemaVersion:'1.0',title:portable?'知识视频预览':'装修预算，把钱花对',language:'zh-CN',width:1080,height:1920,fps:30,durationSeconds:frames/30,voice:{provider,voiceId:provider==='macos-say'?'Tingting':'mock',text:script.trim()},scenes};
  assertBudgetPlan(plan);return plan;
}
function stamp(t){const ms=Math.round(t*1000);return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`;}
async function main(){
  if(process.argv.includes('--help')){console.log('Usage: node budget-cli.mjs --workspace USER_DIRECTORY [--mock] [--plan-only] [--portable]');return;}
  const wi=process.argv.indexOf('--workspace');if(wi>=0&&(!process.argv[wi+1]||process.argv[wi+1].startsWith('--')))throw Error('Missing workspace');
  const workspace=wi>=0?resolve(process.argv[wi+1]):root;
  const portable=process.argv.includes('--portable')||!existsSync(resolve(workspace,'src/render_budget.py'));
  const args=new Set(process.argv.slice(2));const mock=args.has('--mock');const prepare=args.has('--prepare');
  const script=await readFile(resolve(workspace,'input/script.md'),'utf8');const profile=JSON.parse(await readFile(resolve(workspace,'input/renovation-scenes.json'),'utf8'));
  const work=resolve(workspace,'work/budget');await mkdir(work,{recursive:true});await mkdir(resolve(workspace,'output'),{recursive:true});await mkdir(resolve(workspace,'public/audio'),{recursive:true});
  const durations=[];const clips=[];
  for(let i=0;i<profile.length;i++){
    const text=profile[i].narration;const id=`scene-${String(i+1).padStart(2,'0')}`;const txt=resolve(work,`${id}.txt`);const aiff=resolve(work,`${id}.aiff`);const hash=createHash('sha256').update(text+'|Tingting|225').digest('hex');const hashPath=resolve(work,`${id}.sha256`);
    await writeFile(txt,text);
    if(prepare){durations.push([...normalize(text)].length/5+.4);continue;}
    if(mock){durations.push([...normalize(text)].length/5+.4);continue;}
    let cached=false;try{cached=(await readFile(hashPath,'utf8'))===hash;probe(aiff);}catch{cached=false;}
    if(!cached){console.log(`临时配音 ${i+1}/${profile.length}`);run('say',['-v','Tingting','-r','225','-f',txt,'-o',aiff]);try{probe(aiff);}catch{throw Error('系统语音服务未生成声音。在本机终端运行 npm run plan；静音排版预览可使用 npm run plan -- --mock。');}await writeFile(hashPath,hash);}
    const d=probe(aiff)+.24;durations.push(d);clips.push(aiff);
  }
  if(prepare){console.log('口播文本已准备；定稿完整保留。');return;}
  const plan=buildPlan(script,profile,durations,mock?'mock':'macos-say',portable);
  await writeFile(resolve(workspace,'output/video-plan.json'),JSON.stringify(plan,null,2)+'\n');
  const edit=plan.scenes.map((s,i)=>({...s,key:profile[i].key,direction:profile[i].direction,mode:'full_screen_with_optional_small_circle',temporaryVoice:!mock,calculatorIsIllustration:profile[i].key.startsWith('calculator-')}));
  await writeFile(resolve(workspace,'output/edit-plan.json'),JSON.stringify(edit,null,2)+'\n');
  let n=1;const subtitles=[];
  for(const scene of plan.scenes){const chunks=captionChunks(scene.narration);const total=chunks.reduce((a,x)=>a+x.length,0);let start=scene.startSeconds;for(const chunk of chunks){const end=start+scene.durationSeconds*chunk.length/total;subtitles.push(`${n++}\n${stamp(start)} --> ${stamp(end)}\n${chunk}\n`);start=end;}}
  await writeFile(resolve(workspace,'output/captions.srt'),subtitles.join('\n'));
  await writeFile(resolve(workspace,'output/edit-timeline.csv'),'scene,start_seconds,end_seconds,visual_type,template,direction\n'+edit.map(s=>[s.id,s.startSeconds.toFixed(3),(s.startSeconds+s.durationSeconds).toFixed(3),s.visualType,s.key,`"${s.direction}"`].join(',')).join('\n')+'\n');
  if(!mock){
    const normalized=[];
    for(let i=0;i<clips.length;i++){const wav=resolve(work,`scene-${i+1}.wav`);run('ffmpeg',['-y','-v','error','-i',clips[i],'-af','apad','-t',String(plan.scenes[i].durationSeconds),'-ar','48000','-ac','2','-c:a','pcm_s16le',wav]);normalized.push(wav);}
    const list=resolve(work,'audio-list.txt');await writeFile(list,normalized.map(p=>`file '${p.replaceAll("'","'\\''")}'`).join('\n'));
    run('ffmpeg',['-y','-v','error','-f','concat','-safe','0','-i',list,'-c','copy',resolve(workspace,'public/audio/voice.wav')]);
    run('ffmpeg',['-y','-v','error','-i',resolve(workspace,'public/audio/voice.wav'),'-c:a','libmp3lame','-q:a','2',resolve(workspace,'public/audio/voice.mp3')]);
  }
  console.log(`计划：${plan.scenes.length} 个场景，${plan.durationSeconds.toFixed(1)} 秒，${plan.voice.provider}`);
  if(args.has('--plan-only'))return;
  const child=spawn('python3',[resolve(root,portable?'src/render_portable.py':'src/render_budget.py'),workspace],{stdio:'inherit'});
  await new Promise((res,rej)=>{child.on('error',rej);child.on('close',code=>code===0?res():rej(Error(`渲染失败 ${code}`)))});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
