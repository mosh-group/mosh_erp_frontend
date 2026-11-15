/* R34: streamed, resumable private attachments. Files stay original; nothing is stored in localStorage. */
(function(){'use strict';
const PART=256*1024,HASH_BLOCK=1024*1024;let epoch=0;const controllers=new Set(),active=new Set();
const api=()=>window.MoshApi,owner=()=>String(api()?.user?.id||'');
function guard(who,e){if(!who||owner()!==who||e!==epoch)throw new Error('تغيّر حساب الدخول أو انتهت الجلسة؛ توقف الرفع.');}
class Sha256 {
 constructor(){this.h=new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);this.buf=new Uint8Array(64);this.used=0;this.total=0;this.w=new Uint32Array(64);this.done=false;}
 block(b,o){const k=SHA_K,h=this.h,w=this.w,rr=(v,s)=>(v>>>s)|(v<<(32-s));
  for(let i=0;i<16;i++){const j=o+i*4;w[i]=((b[j]<<24)|(b[j+1]<<16)|(b[j+2]<<8)|b[j+3])>>>0;}
  for(let i=16;i<64;i++){const a=w[i-15],z=w[i-2];w[i]=(w[i-16]+(rr(a,7)^rr(a,18)^(a>>>3))+w[i-7]+(rr(z,17)^rr(z,19)^(z>>>10)))>>>0;}
  let [a,b0,c,d,e,f,g,hh]=h;
  for(let i=0;i<64;i++){const t1=(hh+(rr(e,6)^rr(e,11)^rr(e,25))+((e&f)^(~e&g))+k[i]+w[i])>>>0,t2=((rr(a,2)^rr(a,13)^rr(a,22))+((a&b0)^(a&c)^(b0&c)))>>>0;hh=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b0;b0=a;a=(t1+t2)>>>0;}
  [a,b0,c,d,e,f,g,hh].forEach((x,i)=>h[i]=(h[i]+x)>>>0);
 }
 update(value){if(this.done)throw new Error('Hash already finalized');const bytes=value instanceof Uint8Array?value:new Uint8Array(value);this.total+=bytes.length;let at=0;
  if(this.used){const n=Math.min(64-this.used,bytes.length);this.buf.set(bytes.subarray(0,n),this.used);this.used+=n;at=n;if(this.used===64){this.block(this.buf,0);this.used=0;}}
  for(;at+64<=bytes.length;at+=64)this.block(bytes,at);
  if(at<bytes.length){this.buf.set(bytes.subarray(at));this.used=bytes.length-at;}return this;
 }
 digest(){if(this.done)return this.hex;const n=this.total,last=new Uint8Array(this.used<56?64:128);last.set(this.buf.subarray(0,this.used));last[this.used]=128;const d=new DataView(last.buffer);d.setUint32(last.length-8,Math.floor(n/0x20000000));d.setUint32(last.length-4,(n*8)>>>0);for(let i=0;i<last.length;i+=64)this.block(last,i);this.done=true;return this.hex=Array.from(this.h,v=>v.toString(16).padStart(8,'0')).join('');}
}
const SHA_K=new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
function sha256(bytes){return new Sha256().update(bytes).digest();}
function progress(record,percent,phase){record._r34Percent=percent;const detail={key:record.key,name:record.name,percent,phase};record.onProgress?.(detail);document.dispatchEvent(new CustomEvent('mosh:upload-progress',{detail}));}
async function hashBlob(blob,check,onProgress){const hash=new Sha256();for(let p=0;p<blob.size;p+=HASH_BLOCK){check();hash.update(new Uint8Array(await blob.slice(p,p+HASH_BLOCK).arrayBuffer()));onProgress?.(Math.min(100,Math.floor((p+HASH_BLOCK)/blob.size*100)));await new Promise(r=>setTimeout(r,0));}check();return hash.digest();}
async function retrySleep(ms,signal){return new Promise((resolve,reject)=>{let timer;const abort=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);reject(new Error('توقف الرفع بسبب انتهاء الجلسة.'));};if(signal.aborted)return abort();const done=()=>{signal.removeEventListener('abort',abort);resolve();};timer=setTimeout(done,ms);signal.addEventListener('abort',abort,{once:true});});}
async function req(who,e,path,options,onWait){guard(who,e);const c=new AbortController();controllers.add(c);try{let result;for(let attempt=0;attempt<3;attempt++){guard(who,e);try{result=await api().request(path,{...options,signal:c.signal});break;}catch(error){guard(who,e);if((!error.network&&![429,502,503,504].includes(error.status))||attempt===2)throw error;let delay=Math.min(2500,500*(attempt+1));if(error.status===429){delay=Math.max(1000,Number(error.retryAfter)>0?Number(error.retryAfter)*1000:Number(error.retryAt)>Date.now()?Number(error.retryAt)-Date.now():60000)+250;if(delay>300250)throw error;onWait?.(delay);}await retrySleep(delay,c.signal);}}guard(who,e);return result;}finally{controllers.delete(c);}}
async function upload(record){const who=owner(),e=epoch;guard(who,e);const blob=record?.blob;if(!(blob instanceof Blob)||blob.size<1||!Number.isSafeInteger(blob.size))throw new Error('الملف فارغ أو حجمه غير قابل للقراءة.');if(!record.key)throw new Error('مفتاح المرفق مفقود.');const job={};active.add(job);const send=(path,options)=>req(who,e,path,options,()=>progress(record,record._r34Percent||0,'rate_limit'));
 try{progress(record,0,'hashing');const hash=record._r34Hash||await hashBlob(blob,()=>guard(who,e),n=>progress(record,n,'hashing'));record._r34Hash=hash;
 const s=await send('/files-upload/start',{method:'POST',body:{key:record.key,name:record.name||'attachment.bin',kind:record.kind||'attachment',size:blob.size,sha256:hash}});
 if(!s||!/^[a-f0-9]{64}$/.test(s.id)||s.chunkSize!==PART||s.parts!==Math.ceil(blob.size/PART))throw new Error('استجابة بدء رفع الملف غير صالحة.');const received=new Set(s.received||[]);record._r34Session=s.id;
 if(!s.complete)for(let i=0;i<s.parts;i++){guard(who,e);if(!received.has(i)){const part=new Uint8Array(await blob.slice(i*PART,Math.min(blob.size,(i+1)*PART)).arrayBuffer());let raw='';for(let n=0;n<part.length;n+=8192)raw+=String.fromCharCode(...part.subarray(n,n+8192));await send('/files-upload/'+s.id+'/parts/'+i,{method:'PUT',body:{base64:btoa(raw)}});}progress(record,Math.floor((i+1)/s.parts*100),'uploading');}
 progress(record,100,'verifying');const result=await send('/files-upload/'+s.id+'/complete',{method:'POST',body:{}});if(!result||result.key!==record.key)throw new Error('لم يؤكد الخادم اكتمال المرفق.');progress(record,100,'stored');return result.key;
 }finally{active.delete(job);}}
async function addTaskFiles(taskId,files){if(!window.MoshChat34)throw new Error('لم يكتمل تحميل محرر المحادثة؛ حدّث الصفحة.');return window.MoshChat34.stage(taskId,files);}
function clear(){epoch++;for(const c of controllers)c.abort();controllers.clear();active.clear();}
window.MoshUpload31={sha256,Sha256,hashBlob,upload,addTaskFiles,clear,maxBytes:null};if(api())api().upload=upload;
for(const name of ['mosh:logout-complete','mosh:session-expired'])document.addEventListener(name,clear);
window.addEventListener('beforeunload',e=>{if(active.size){e.preventDefault();e.returnValue='';}});
})();
