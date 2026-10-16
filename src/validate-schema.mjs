import {readFileSync} from 'node:fs';
const schema=JSON.parse(readFileSync(new URL('../video-plan.schema.json',import.meta.url),'utf8'));

// This V0 schema uses only these assertion keywords; fail closed if it grows.
const supported=new Set(['$schema','$id','title','description','type','additionalProperties','required','properties','const','enum','minLength','maxLength','pattern','minimum','maximum','exclusiveMinimum','items','minItems','maxItems']);
function checkSchema(s){for(const k of Object.keys(s))if(!supported.has(k))throw Error(`Unsupported schema keyword: ${k}`);for(const p of Object.values(s.properties||{}))checkSchema(p);if(s.items)checkSchema(s.items);}
checkSchema(schema);
export function validateSchema(value,s=schema,path='$'){
  const fail=m=>{throw Error(`Video Plan schema validation failed: ${path} ${m}`)};
  if(s.type){const ok=s.type==='object'?value!==null&&typeof value==='object'&&!Array.isArray(value):s.type==='array'?Array.isArray(value):s.type==='number'?typeof value==='number'&&Number.isFinite(value):typeof value===s.type;if(!ok)fail(`must be ${s.type}`);}
  if('const' in s&&value!==s.const)fail(`must equal ${s.const}`);
  if(s.enum&&!s.enum.includes(value))fail('has an unsupported value');
  if(typeof value==='string'){if(s.minLength!==undefined&&[...value].length<s.minLength)fail('is too short');if(s.maxLength!==undefined&&[...value].length>s.maxLength)fail('is too long');if(s.pattern&&!new RegExp(s.pattern).test(value))fail('has an invalid pattern');}
  if(typeof value==='number'){if(s.minimum!==undefined&&value<s.minimum)fail('is below minimum');if(s.maximum!==undefined&&value>s.maximum)fail('is above maximum');if(s.exclusiveMinimum!==undefined&&value<=s.exclusiveMinimum)fail('must exceed minimum');}
  if(Array.isArray(value)){if(s.minItems!==undefined&&value.length<s.minItems)fail('has too few items');if(s.maxItems!==undefined&&value.length>s.maxItems)fail('has too many items');if(s.items)value.forEach((item,i)=>validateSchema(item,s.items,`${path}[${i}]`));}
  if(value!==null&&typeof value==='object'&&!Array.isArray(value)){for(const k of s.required||[])if(!(k in value))fail(`is missing ${k}`);for(const [k,v] of Object.entries(value)){if(s.properties?.[k])validateSchema(v,s.properties[k],`${path}.${k}`);else if(s.additionalProperties===false)fail(`has unknown property ${k}`);}}
}
export function assertBudgetPlan(plan){
  validateSchema(plan);
  let frame=0;const ids=new Set();
  for(const scene of plan.scenes){if(ids.has(scene.id))throw Error('Duplicate scene ID');ids.add(scene.id);if(Math.abs(scene.startSeconds-frame/plan.fps)>.00001)throw Error('Non-contiguous timeline');const frames=Math.round(scene.durationSeconds*plan.fps);if(frames<1)throw Error('Empty scene');frame+=frames;}
  if(Math.abs(plan.durationSeconds-frame/plan.fps)>.00001)throw Error('Duration does not match the timeline');
}
