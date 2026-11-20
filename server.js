const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = __dirname;
loadEnv();
function loadEnv(){try{for(const line of fs.readFileSync(path.join(ROOT,'.env'),'utf8').split(/\r?\n/)){const m=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^['"]|['"]$/g,'');}}catch{}}
const PORT=Number(process.env.PORT||3000);
const allowed={interest:['Animals','Dinosaurs','Space','Vehicles','Nature','Professions','Ocean life','Magic and fantasy','Sports'],theme:['Jungle','Nature','Ocean','Space','Fantasy kingdom','My town','Under the sea'],language:['English','German','Arabic'],level:['Beginner','Growing','Confident']};
const crypto=require('node:crypto');
const DATA_DIR=path.join(ROOT,'data'),DB_FILE=path.join(DATA_DIR,'accounts.json');
const SESSION_MS=14*24*60*60*1000;
const AVATARS=['🦊','🐼','🦁','🐸','🐙','🦄','🐯','🐨'];
let db={users:{},sessions:{}};
try{db=JSON.parse(fs.readFileSync(DB_FILE,'utf8'));}catch{}
db.users=db.users||{};db.sessions=db.sessions||{};
function saveDb(){fs.mkdirSync(DATA_DIR,{recursive:true,mode:0o700});const tmp=DB_FILE+'.tmp';fs.writeFileSync(tmp,JSON.stringify(db),{mode:0o600});fs.renameSync(tmp,DB_FILE);}
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const scrypt=(pw,salt)=>new Promise((ok,fail)=>crypto.scrypt(pw.normalize('NFKC'),salt,64,{N:16384,r:8,p:1},(e,k)=>e?fail(e):ok(k)));
const DUMMY={salt:crypto.randomBytes(16).toString('hex'),hash:crypto.randomBytes(64).toString('hex')};
async function hashPassword(pw){const salt=crypto.randomBytes(16);return{salt:salt.toString('hex'),hash:(await scrypt(pw,salt)).toString('hex')};}
async function checkPassword(pw,user){const rec=user||DUMMY;const key=await scrypt(pw,Buffer.from(rec.salt,'hex'));const ok=crypto.timingSafeEqual(key,Buffer.from(rec.hash,'hex'));return !!user&&ok;}
function cookies(req){const o={};for(const part of String(req.headers.cookie||'').split(';')){const i=part.indexOf('=');if(i>0){try{o[part.slice(0,i).trim()]=decodeURIComponent(part.slice(i+1).trim());}catch{}}}return o;}
function currentUser(req){const t=cookies(req).lmw_session;if(!t)return null;const k=sha(t),s=db.sessions[k];if(!s)return null;if(s.expires<Date.now()){delete db.sessions[k];saveDb();return null;}return db.users[s.userId]||null;}
function sessionCookie(req,token,maxAgeSec){const secure=process.env.COOKIE_SECURE==='true'||req.headers['x-forwarded-proto']==='https';return `lmw_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSec}${secure?'; Secure':''}`;}
function startSession(req,res,user,status,data){const token=crypto.randomBytes(32).toString('base64url');db.sessions[sha(token)]={userId:user.id,expires:Date.now()+SESSION_MS};saveDb();return send(res,status,data,undefined,{'Set-Cookie':sessionCookie(req,token,SESSION_MS/1000)});}
const publicUser=u=>({id:u.id,email:u.email,children:u.children});
const hits=new Map();
function limited(key,max,windowMs){const now=Date.now();let h=hits.get(key);if(!h||h.reset<now){h={n:0,reset:now+windowMs};hits.set(key,h);}h.n+=1;return h.n>max;}
setInterval(()=>{const now=Date.now();for(const[k,v]of hits)if(v.reset<now)hits.delete(k);for(const[k,v]of Object.entries(db.sessions))if(v.expires<now)delete db.sessions[k];},10*60*1000).unref();
const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,NAME_RE=/^[\p{L}\p{N} '’.-]+$/u;
function cleanEmail(v){const e=String(v||'').trim().toLowerCase();if(e.length>254||!EMAIL_RE.test(e))throw new Error('Please enter a valid email address.');return e;}
function cleanPassword(v){const p=typeof v==='string'?v:'';if(p.length<8)throw new Error('Your password needs at least 8 characters.');if(p.length>128)throw new Error('Your password is too long (128 characters at most).');return p;}
function cleanChildren(input,existing=[]){
  if(!Array.isArray(input)||input.length<1||input.length>6)throw new Error('Please add between 1 and 6 children.');
  const owned=new Set(existing.map(c=>c.id)),used=new Set();
  return input.map((c,i)=>{
    const name=String(c&&c.name||'').trim().replace(/\s+/g,' ');const age=Number(c&&c.age);
    if(!name)throw new Error(`Please enter a name for child ${i+1}.`);
    if(name.length>30||!NAME_RE.test(name))throw new Error(`${name.slice(0,30)}: use a first name or nickname with letters, numbers, spaces, hyphens or apostrophes.`);
    if(!Number.isInteger(age)||age<3||age>11)throw new Error(`${name}: age must be between 3 and 11.`);
    const interests=[...new Set(Array.isArray(c.interests)?c.interests:[])].filter(x=>allowed.interest.includes(x));
    if(!interests.length)throw new Error(`Please choose at least one thing ${name} likes.`);
    const id=typeof c.id==='string'&&owned.has(c.id)&&!used.has(c.id)?c.id:crypto.randomUUID();used.add(id);
    return{id,name,age,interests,avatar:AVATARS.includes(c.avatar)?c.avatar:AVATARS[i%AVATARS.length]};
  });
}
const PUBLIC_FILES={'/index.html':'text/html; charset=utf-8','/styles.css':'text/css; charset=utf-8','/script.js':'text/javascript; charset=utf-8','/auth.js':'text/javascript; charset=utf-8','/assets/little-minds-adventure.png':'image/png'};
const CSP="default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json'};
function send(res,status,data,type='application/json; charset=utf-8',extra={}){res.writeHead(status,{'Content-Type':type,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store',...extra});res.end(type.startsWith('application/json')?JSON.stringify(data):data);}
function readBody(req){return new Promise((resolve,reject)=>{let body='';req.on('data',chunk=>{body+=chunk;if(body.length>12000){reject(new Error('Request too large'));req.destroy();}});req.on('end',()=>{try{resolve(JSON.parse(body||'{}'));}catch{reject(new Error('Invalid JSON'));}});req.on('error',reject);});}
function extractText(data){if(data.output_text)return data.output_text;return (data.output||[]).filter(x=>x.type==='message').flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n');}
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const writes=req.method!=='GET'&&req.method!=='HEAD';
  if(writes&&req.headers.origin){try{if(new URL(req.headers.origin).host!==req.headers.host)return send(res,403,{error:'Request blocked.'});}catch{return send(res,403,{error:'Request blocked.'});}}
  const ip=req.socket.remoteAddress||'unknown';
  if(url.pathname.startsWith('/api/auth/')||url.pathname==='/api/children'){
    try{
      if(req.method==='GET'&&url.pathname==='/api/auth/me'){const u=currentUser(req);return u?send(res,200,publicUser(u)):send(res,401,{error:'Not logged in.'});}
      if(req.method==='POST'&&url.pathname==='/api/auth/signup'){
        if(limited('signup:'+ip,10,15*60*1000))return send(res,429,{error:'Too many attempts. Please wait a few minutes and try again.'});
        const b=await readBody(req);const email=cleanEmail(b.email),password=cleanPassword(b.password);
        if(b.parentConfirmed!==true)return send(res,400,{error:'Please confirm that you are the parent or guardian.'});
        const children=cleanChildren(b.children);
        if(Object.values(db.users).some(u=>u.email===email))return send(res,409,{error:'An account with this email already exists. Try logging in instead.',field:'email'});
        const user={id:crypto.randomUUID(),email,...(await hashPassword(password)),children,createdAt:new Date().toISOString()};
        db.users[user.id]=user;saveDb();return startSession(req,res,user,201,publicUser(user));
      }
      if(req.method==='POST'&&url.pathname==='/api/auth/login'){
        const b=await readBody(req);const email=String(b.email||'').trim().toLowerCase().slice(0,254);
        if(limited('login:'+ip,15,15*60*1000)||limited('login-email:'+email,8,15*60*1000))return send(res,429,{error:'Too many attempts. Please wait a few minutes and try again.'});
        const user=Object.values(db.users).find(u=>u.email===email);
        const ok=await checkPassword(typeof b.password==='string'?b.password.slice(0,128):'',user);
        if(!ok)return send(res,401,{error:'That email or password is not right. Please try again.'});
        return startSession(req,res,user,200,publicUser(user));
      }
      if(req.method==='POST'&&url.pathname==='/api/auth/logout'){const t=cookies(req).lmw_session;if(t){delete db.sessions[sha(t)];saveDb();}return send(res,200,{ok:true},undefined,{'Set-Cookie':sessionCookie(req,'',0)});}
      if(req.method==='POST'&&url.pathname==='/api/auth/delete'){
        const user=currentUser(req);if(!user)return send(res,401,{error:'Please log in again.'});
        if(limited('delete:'+user.id,5,15*60*1000))return send(res,429,{error:'Too many attempts. Please wait a few minutes.'});
        const b=await readBody(req);if(!(await checkPassword(typeof b.password==='string'?b.password.slice(0,128):'',user)))return send(res,401,{error:'That password is not right.'});
        delete db.users[user.id];for(const[k,v]of Object.entries(db.sessions))if(v.userId===user.id)delete db.sessions[k];saveDb();
        return send(res,200,{ok:true},undefined,{'Set-Cookie':sessionCookie(req,'',0)});
      }
      if(req.method==='PUT'&&url.pathname==='/api/children'){
        const user=currentUser(req);if(!user)return send(res,401,{error:'Please log in again.'});
        const b=await readBody(req);user.children=cleanChildren(b.children,user.children);saveDb();return send(res,200,publicUser(user));
      }
      return send(res,404,{error:'Not found'});
    }catch(err){return send(res,400,{error:err.message||'Could not process the request.'});}
  }
  if(writes&&(url.pathname==='/api/story'||url.pathname==='/api/illustration')&&!currentUser(req))return send(res,401,{error:'Your session ended. Please log in again.'});
  if(req.method==='POST'&&url.pathname==='/api/illustration'){
    try{
      const b=await readBody(req);
      const name=String(b.name||'').trim().slice(0,30);const age=Number(b.age);const chapter=String(b.chapter||'').slice(0,1800);
      if(!name||!Number.isInteger(age)||age<3||age>11||!chapter)return send(res,400,{error:'Please create a story before requesting illustrations.'});
      if(!process.env.OPENAI_API_KEY)return send(res,503,{error:'AI image generation is not configured. Add your OpenAI API key to the private server environment.'});
      const prompt=`Create one beautiful, child-safe storybook illustration for chapter ${Number(b.chapterNumber)||1}. Character continuity guide (follow exactly): ${String(b.characterGuide||'A friendly child storybook hero').slice(0,500)}. Story interest: ${String(b.interest||'adventure').slice(0,80)}. Setting: ${String(b.theme||'magical world').slice(0,80)}. Chapter scene: ${chapter}. Keep the main character design, outfit, colours and proportions consistent across illustrations. Soft colourful picture-book art, warm friendly expressions, clear composition, no text, no letters, no logos, no frightening content. The child is fictional; do not imitate any real person.`;
      const api=await fetch('https://api.openai.com/v1/images/generations',{method:'POST',headers:{'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_IMAGE_MODEL||'gpt-image-1',prompt,size:'1024x1024',quality:'low',n:1})});
      const payload=await api.json().catch(()=>({}));if(!api.ok){console.error('OpenAI image API error',api.status,payload.error?.message||'');return send(res,502,{error:'Image generation failed. Check image model access and API billing.'});}
      const b64=payload.data?.[0]?.b64_json;if(!b64)return send(res,502,{error:'The image service returned no image.'});
      return send(res,200,{image:`data:image/png;base64,${b64}`});
    }catch(err){return send(res,400,{error:err.message||'Could not process illustration request.'});}
  }
  if(req.method==='POST'&&url.pathname==='/api/story'){
    try{
      const b=await readBody(req);const name=String(b.name||'').trim().slice(0,30);const age=Number(b.age);
      if(!name||!Number.isInteger(age)||age<3||age>11||!allowed.interest.includes(b.interest)||!allowed.theme.includes(b.theme)||!allowed.language.includes(b.language)||!allowed.level.includes(b.level))return send(res,400,{error:'Please check the story choices and try again.'});
      if(!process.env.OPENAI_API_KEY)return send(res,200,{demo:true});
      const language={English:'English',German:'German',Arabic:'Arabic'}[b.language];
      const reading={Beginner:'Use very short sentences, familiar words and a gentle story suitable for a child aged '+age+'.',Growing:'Use clear short paragraphs and introduce a few new words, suitable for a child aged '+age+'.',Confident:'Use varied but age-appropriate vocabulary and a richer plot, suitable for a child aged '+age+'.'}[b.level];
      const prompt=`Create one original, warm, engaging children's story. Child's first name: ${name}. Age: ${age}. Main interest: ${b.interest}. Story setting/theme: ${b.theme}. Write entirely in ${language}. ${reading} Make the child the helpful hero. Include a small age-appropriate challenge solved through kindness, curiosity, teamwork or careful thinking. Keep the story safe, reassuring and non-frightening; no violence, peril, medical advice, dangerous instructions, stereotypes, or requests for personal information. Do not imply the child should go somewhere or do an activity without a trusted adult. Length: about ${age<=5?'180–230':age<=7?'250–330':'350–450'} words. Output exactly: first line the story title, then 5–8 short story paragraphs, then a line 'Questions:' and exactly 3 simple comprehension/discussion questions in ${language}. Do not add markdown headings other than the Questions line.`;
      const api=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-6',input:prompt,max_output_tokens:1100,store:false})});
      const payload=await api.json().catch(()=>({}));if(!api.ok){console.error('OpenAI API error',api.status,payload.error?.message||'');return send(res,502,{error:'The story service could not generate a story. Check the server API key, model setting and API account.'});}
      const story=extractText(payload).trim();if(!story)return send(res,502,{error:'The story service returned an empty story. Please try again.'});
      return send(res,200,{story});
    }catch(err){return send(res,400,{error:err.message||'Could not process the story request.'});}
  }
  if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,{error:'Method not allowed'});
  let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{return send(res,400,'Bad request','text/plain; charset=utf-8');}
  if(pathname==='/')pathname='/index.html';
  const type=PUBLIC_FILES[pathname];if(!type)return send(res,404,'Not found','text/plain; charset=utf-8');
  fs.readFile(path.join(ROOT,pathname),(err,content)=>{if(err)return send(res,404,'Not found','text/plain; charset=utf-8');const headers={'Content-Type':type,'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache','Referrer-Policy':'same-origin'};if(pathname==='/index.html'){headers['Content-Security-Policy']=CSP;headers['X-Frame-Options']='DENY';}res.writeHead(200,headers);res.end(req.method==='HEAD'?undefined:content);});
});
server.listen(PORT,()=>console.log(`Little Minds World running at http://localhost:${PORT}`));
