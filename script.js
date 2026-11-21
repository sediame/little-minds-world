const $ = (s) => document.querySelector(s);
// Everything a child saves (stories, progress, approvals) is kept under a per-account, per-child prefix.
const store = {prefix:'lmw:signed-out:', get(k){return localStorage.getItem(this.prefix+k);}, set(k,v){localStorage.setItem(this.prefix+k,v);}};
let activeChild = null;
const navButtons = document.querySelectorAll('.nav-link');
const pages = document.querySelectorAll('.page');
function showPage(name) {
  pages.forEach(p => p.classList.toggle('active', p.id === name));
  navButtons.forEach(b => b.classList.toggle('active', b.dataset.page === name));
  window.scrollTo({top:0,behavior:'smooth'});
  if (name === 'library') renderLibrary();
  if (name === 'parents') renderParentDashboard();
}
navButtons.forEach(b => b.addEventListener('click', () => showPage(b.dataset.page)));
document.querySelectorAll('[data-page-link]').forEach(b => b.addEventListener('click', () => showPage(b.dataset.pageLink)));
const toast = $('#toast'); let toastTimer;
function notify(message) { toast.textContent=message; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>toast.classList.remove('show'),3000); }
const calmMotion=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function celebrate(){
  if(calmMotion())return;
  const bits=['⭐','✨','🎉','🎈','💛','🌈'],cx=innerWidth/2,cy=innerHeight*0.4;
  for(let i=0;i<22;i++){
    const s=document.createElement('span');s.className='confetti';s.textContent=bits[i%bits.length];s.setAttribute('aria-hidden','true');
    s.style.left=cx+'px';s.style.top=cy+'px';document.body.append(s);
    const a=Math.random()*Math.PI*2,d=120+Math.random()*220,x=Math.cos(a)*d,y=Math.sin(a)*d;
    s.animate([
      {transform:'translate(-50%,-50%) scale(.4)',opacity:1},
      {transform:`translate(calc(-50% + ${x}px),calc(-50% + ${y-60}px)) scale(1.2) rotate(${Math.random()*360}deg)`,opacity:1,offset:.7},
      {transform:`translate(calc(-50% + ${x}px),calc(-50% + ${y+120}px)) scale(1)`,opacity:0}
    ],{duration:1100+Math.random()*500,easing:'cubic-bezier(.2,.7,.3,1)'}).onfinish=()=>s.remove();
  }
}
document.querySelectorAll('.hero-friend').forEach(el=>el.addEventListener('click',()=>{el.classList.remove('hop');void el.offsetWidth;el.classList.add('hop');}));
document.querySelectorAll('[data-scroll]').forEach(b=>b.addEventListener('click',()=>{const t=document.getElementById(b.dataset.scroll);if(t){t.scrollIntoView({behavior:calmMotion()?'auto':'smooth',block:'start'});const f=t.querySelector('input');if(f)setTimeout(()=>f.focus({preventScroll:true}),350);}}));
let currentStory = null;
const storageKey = 'littleMindsWorldStoriesV1';
function getStories(){ try{return JSON.parse(store.get(storageKey)||'[]')}catch{return []} }
function setStories(stories){store.set(storageKey,JSON.stringify(stories));}
function safeText(value){return String(value??'').replace(/[<>]/g,'');}
function splitStory(text){
  const lines=text.trim().split('\n').map(x=>x.trim()).filter(Boolean);
  let title=lines[0]||'A Little Adventure';
  title=title.replace(/^#+\s*/,'').replace(/^title:\s*/i,'').replace(/^"|"$/g,'');
  const qIndex=lines.findIndex(x=>/^questions?:/i.test(x));
  const storyLines=lines.slice(1,qIndex>=0?qIndex:undefined);
  const questionLines=qIndex>=0?lines.slice(qIndex+1).map(x=>x.replace(/^[-•\d.)\s]+/,'' )).filter(Boolean):[];
  const paragraphs=storyLines.map(x=>x.replace(/^[-•]\s*/, '').replace(/^\*\*|\*\*$/g,''));
  return {title,paragraphs,questions:questionLines.length?questionLines.slice(0,3):['What was your favourite part of the adventure?','How did the character solve the problem?','What would you do next?']};
}
function openStory(story){
  currentStory=story;
  trackReading('story_opened', story.title);
  renderChapterArt(story); $('#story-title').textContent=story.title; $('#story-meta').textContent=`${story.name} · Age ${story.age} · ${story.interest} · ${story.theme}`;
  $('#story-body').replaceChildren(...story.paragraphs.map(p=>{const el=document.createElement('p');el.textContent=p;return el;}));
  $('#story-questions').replaceChildren(...story.questions.map(q=>{const li=document.createElement('li');li.textContent=q;return li;}));
  $('#answer-input').value=''; $('#answer-feedback').textContent=''; $('#practice-word').value='';
  $('#story-modal').hidden=false; document.body.classList.add('modal-open');
}
function closeStory(){$('#story-modal').hidden=true;document.body.classList.remove('modal-open');}
$('#close-modal').addEventListener('click',closeStory);$('#story-modal').addEventListener('click',e=>{if(e.target.id==='story-modal')closeStory()});
$('#read-again').addEventListener('click',()=>{if(currentStory)speakText(currentStory.paragraphs.join(' '));});
$('#save-story').addEventListener('click',()=>{if(!currentStory)return;const stories=getStories();if(!stories.some(s=>s.id===currentStory.id)){stories.unshift(currentStory);setStories(stories);notify('Story saved to your library!');}else notify('This story is already saved.');renderLibrary();updateLatest();});
function renderLibrary(){const grid=$('#library-grid');grid.replaceChildren();const stories=getStories();if(!stories.length){const d=document.createElement('div');d.className='empty-state';d.innerHTML='<div class="empty-icon">📚</div><h2>No stories yet</h2><p>Your personalised adventures will appear here.</p><button class="primary-button" data-page-link="home">Create your first story</button>';d.querySelector('button').addEventListener('click',()=>showPage('home'));grid.append(d);return;}
 stories.forEach(story=>{const card=document.createElement('article');card.className='saved-story panel';const icon=document.createElement('div');icon.className='saved-art';icon.textContent=story.icon||'✨';const h=document.createElement('h2');h.textContent=story.title;const p=document.createElement('p');p.textContent=`${story.name} · Age ${story.age} · ${story.theme}`;const read=document.createElement('button');read.className='small-button';read.textContent='Read story ›';read.addEventListener('click',()=>openStory(story));const del=document.createElement('button');del.className='text-button';del.textContent='Delete';del.addEventListener('click',()=>{setStories(getStories().filter(s=>s.id!==story.id));renderLibrary();updateLatest();});card.append(icon,h,p,read,del);grid.append(card);});}
function updateLatest(){const story=getStories()[0];const box=$('#latest-story');box.replaceChildren();if(!story){box.innerHTML='<div class="story-picture"><span>🐘</span><span>🌳</span><span>🦋</span></div><div><h3>Your adventure is waiting!</h3><p>Create a story with your favourite things and it will appear here.</p></div>';return;}const art=document.createElement('div');art.className='story-picture';art.textContent=story.icon||'✨';const content=document.createElement('div');const h=document.createElement('h3');h.textContent=story.title;const p=document.createElement('p');p.textContent=`A ${story.theme.toLowerCase()} story about ${story.interest.toLowerCase()}.`;const b=document.createElement('button');b.className='small-button';b.textContent='Read the Story ›';b.addEventListener('click',()=>openStory(story));content.append(h,p,b);box.append(art,content);}
function updateProgress(){const n=Number(store.get('lmwLabsCompleted')||0);const pct=Math.round(n/6*100);$('#progress-percent').textContent=pct+'%';$('#progress-count').textContent=`${n} of 6 Labs`;$(`#progress-ring`).style.background=`conic-gradient(#43c07a 0 ${pct}%,#ffffff ${pct}% 100%)`;$('#bottom-bar').style.width=pct+'%';$('#bottom-count').textContent=`${n} / 6 Labs`;}
function demoStory({name,age,interest,theme,language,level}){
 const simple=Number(age)<=5; const cast={Animals:['a curious little fox','a gentle elephant'],Dinosaurs:['a tiny dinosaur','a friendly triceratops'],Space:['a brave space explorer','a helpful moon robot'],Vehicles:['a little red train','a kind rescue truck'],Nature:['a young nature explorer','a talking oak tree'],Professions:['a thoughtful young doctor','a helpful firefighter'], 'Ocean life':['a playful dolphin','a wise sea turtle'],'Magic and fantasy':['a small dragon','a kind forest wizard'],Sports:['a young football player','a cheerful team captain']}[interest]||['a curious explorer','a helpful friend'];
 const [hero,friend]=cast; const title=`${name} and the ${theme} Discovery`;
 const en=[`One bright morning, ${name} discovered a tiny map beside the garden gate. It showed a winding path into the ${theme.toLowerCase()}.`,`With a backpack and a big smile, ${name} followed the path. Soon, ${hero} appeared. “I need a clever friend,” said ${hero}.`,`Together they met ${friend}. A small problem stood in their way: a stream crossed the path, and their friend could not get across.`,`“Let's stop and make a plan,” said ${name}. They looked around, shared ideas and found a safe line of stepping stones close to the bank. With an adult nearby, they tested each stone before crossing one at a time.`,`On the other side, everyone cheered. ${name} learned that patient thinking, teamwork and trying one step at a time can make a big difference.`,`As the sun began to set, ${name} waved goodbye. The little map shimmered — another adventure was waiting!`];
 const de=[`An einem hellen Morgen fand ${name} eine kleine Karte am Gartentor. Sie zeigte einen Weg in die Welt ${theme}.`,`Mit einem Rucksack machte sich ${name} auf den Weg. Bald traf ${name} ${hero}. „Ich brauche einen klugen Freund“, sagte ${hero}.`,`Gemeinsam trafen sie ${friend}. Ein kleiner Bach versperrte den Weg. Ihr Freund kam nicht hinüber.`,`„Wir halten an und machen einen Plan“, sagte ${name}. Sie schauten sich um und entdeckten sichere Trittsteine nahe am Ufer. Mit einem Erwachsenen in der Nähe prüften sie jeden Stein und gingen langsam hinüber.`,`Auf der anderen Seite freuten sich alle. ${name} hatte gelernt: Zusammenarbeiten, ruhig bleiben und Schritt für Schritt denken hilft.`,`Als die Sonne unterging, winkte ${name} zum Abschied. Auf der Karte erschien schon das nächste Abenteuer!`];
 const ar=[`في صباح جميل، وجد ${name} خريطة صغيرة قرب بوابة الحديقة. كانت تشير إلى طريق يقود إلى عالم ${theme}.`,`حمل ${name} حقيبته وانطلق. وسرعان ما قابل ${hero}. قال له: «أحتاج إلى صديق ذكي يساعدني».`,`وفي الطريق التقيا بـ ${friend}. كان هناك جدول ماء صغير يقطع الطريق، ولم يستطع صديقه العبور.`,`قال ${name}: «لنتوقف ونضع خطة». بحثوا حولهم ووجدوا حجارة ثابتة قرب الضفة. وبوجود شخص بالغ قريب، اختبروا الحجارة وعبروا بهدوء، خطوة بعد خطوة.`,`فرح الجميع في الجهة الأخرى. وتعلم ${name} أن التعاون والتفكير بهدوء والمحاولة خطوة بخطوة تساعدنا على حل المشكلات.`,`وعندما غربت الشمس، لوّح ${name} لأصدقائه. وظهرت على الخريطة مغامرة جديدة!`];
 let paras=language==='German'?de:language==='Arabic'?ar:en;
 if(simple) paras=paras.map(p=>p.replace(/discovered a tiny map beside the garden gate/,'found a little map').replace(/A small problem stood in their way/,'They had a little problem'));
 return {id:crypto.randomUUID(),name,age,interest,theme,language,level,title,paragraphs:paras,questions:language==='German'?['Was war dein Lieblingsteil?','Wie haben die Freunde das Problem gelöst?','Was würdest du als Nächstes tun?']:language==='Arabic'?['ما الجزء الذي أعجبك في القصة؟','كيف حل الأصدقاء المشكلة؟','ماذا كنت ستفعل بعد ذلك؟']:['What was your favourite part?','How did the friends solve the problem?','What would you do next?'],icon:({Animals:'🐘',Dinosaurs:'🦕',Space:'🚀',Vehicles:'🚂',Nature:'🌳',Professions:'🧑‍🚒','Ocean life':'🐬','Magic and fantasy':'🐉',Sports:'⚽'})[interest]||'✨'};
}
$('#story-form').addEventListener('submit',async e=>{
 e.preventDefault();const data={name:$('#child-name').value.trim(),age:$('#age').value,interest:$('#interest').value,theme:$('#theme').value,language:$('#language').value,level:$('#reading-level').value};
 if(!data.name){notify('Please enter the child’s first name.');return;}
 const btn=$('#create-button');btn.disabled=true;btn.textContent='✨ Creating your adventure…';$('#form-message').textContent='A little imagination is on its way…';
 try{
   let story;
   if(document.body.dataset.staticDemo==='true'){
     story=demoStory(data);$('#form-message').textContent='Demo story created locally in your browser.';
   }else{
     const response=await fetch('/api/story',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
     if(!response.ok){if(response.status===401&&window.lmwAuth)window.lmwAuth.expire();const err=await response.json().catch(()=>({}));throw new Error(err.error||'Story service unavailable');}
     const result=await response.json();
     if(result.demo){story=demoStory(data);$('#form-message').textContent='Demo story created. Add your API key to enable AI-created stories.';}
     else {const parsed=splitStory(result.story);story={...data,...parsed,id:crypto.randomUUID(),icon:({Animals:'🐘',Dinosaurs:'🦕',Space:'🚀',Vehicles:'🚂',Nature:'🌳',Professions:'🧑‍🚒','Ocean life':'🐬','Magic and fantasy':'🐉',Sports:'⚽'})[data.interest]||'✨'};$('#form-message').textContent='Your personalised AI story is ready!';}
   }
   makeStoryRecommendations(story);openStory(story);updateLatest();celebrate();
 }catch(err){notify(err.message==='Failed to fetch'?'Start the local server to generate a story.':err.message);$('#form-message').textContent='Could not create the story. Please try again.';}
 finally{btn.disabled=false;btn.innerHTML='✨ Create My Story <span>›</span>';}
});
document.querySelectorAll('[data-lab]').forEach(btn=>btn.addEventListener('click',()=>{
 const name=btn.dataset.lab;logActivity('Opened '+name);
 const card=[...document.querySelectorAll('.visual-mission-card')].find(x=>x.querySelector('h3')?.textContent===name);
 if(card){card.scrollIntoView({behavior:'smooth',block:'center'});card.classList.add('mission-highlight');setTimeout(()=>card.classList.remove('mission-highlight'),1300);}
 else{notify('Create a story to unlock your picture games! 📚');}
}));
$('#clear-stories').addEventListener('click',()=>{if(confirm('Delete all stories saved in this browser?')){setStories([]);renderLibrary();updateLatest();notify('Saved stories deleted.');}});
$('#child-name').addEventListener('input',e=>$('#welcome-title').textContent=`Hello, ${e.target.value.trim()||'little explorer'}!`);

const activityKey='lmwActivityHistory';
function getActivity(){try{return JSON.parse(store.get(activityKey)||'[]')}catch{return []}}
function logActivity(label){const a=getActivity();a.unshift({label,at:new Date().toISOString()});store.set(activityKey,JSON.stringify(a.slice(0,30)));}
function trackReading(type,title){const data=JSON.parse(store.get('lmwReadingStats')||'{"sessions":0,"words":0}');if(type==='story_opened')data.sessions++;if(type==='listened')data.words+=Number(title||0);store.set('lmwReadingStats',JSON.stringify(data));logActivity(type==='listened'?'Listened to a story':`Opened: ${title}`);}
function renderParentDashboard(){renderParentRecommendations();const labs=Number(store.get('lmwLabsCompleted')||0),focus=Number(store.get('lmwFocusSessions')||0),stats=JSON.parse(store.get('lmwReadingStats')||'{"sessions":0,"words":0}');const stories=getStories();const activity=getActivity();$('#parent-stats').innerHTML=`<div class="stat-tile"><strong>${stories.length}</strong><span>Saved stories</span></div><div class="stat-tile"><strong>${stats.sessions}</strong><span>Story sessions opened</span></div><div class="stat-tile"><strong>${labs}/6</strong><span>Learning labs completed</span></div>`;$('#reading-summary').textContent=`${stats.sessions} story sessions`;$('#reading-detail').textContent=`${stats.words} words listened to using the reading teacher.`;$('#reading-bar').style.width=Math.min(100,stats.sessions*15)+'%';$('#focus-summary').textContent=`${focus} focus activities opened`;$('#focus-bar').style.width=Math.min(100,focus*20)+'%';const list=$('#activity-history');list.replaceChildren();if(!activity.length){list.innerHTML='<li>No activities completed yet.</li>';}else activity.slice(0,8).forEach(a=>{const li=document.createElement('li');li.textContent=`${a.label} · ${new Date(a.at).toLocaleDateString()}`;list.append(li);});}
function speakText(text){if(!('speechSynthesis'in window)){notify('Speech playback is not supported in this browser.');return;}speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);const lang=currentStory?.language==='German'?'de-DE':currentStory?.language==='Arabic'?'ar-SA':'en-US';utterance.lang=lang;utterance.rate=0.88;utterance.onend=()=>{if(currentStory){trackReading('listened',text.trim().split(/\s+/).length);$('#reading-feedback').textContent='Great listening! Choose a word to practise next.';}};speechSynthesis.speak(utterance);}
$('#speak-story').addEventListener('click',()=>{if(currentStory)speakText(currentStory.paragraphs.join(' '));});$('#pause-speech').addEventListener('click',()=>speechSynthesis.pause());$('#stop-speech').addEventListener('click',()=>speechSynthesis.cancel());$('#speak-word').addEventListener('click',()=>{const word=$('#practice-word').value.trim();if(!word){$('#reading-feedback').textContent='Type a word from your story first.';return;}speakText(word);$('#reading-feedback').textContent=`Listen carefully to: ${word}`;});
$('#submit-answer').addEventListener('click',()=>{const answer=$('#answer-input').value.trim();if(!answer){$('#answer-feedback').textContent='Try saying or writing an answer first.';return;}$('#answer-feedback').textContent='Wonderful effort! You thought about the story. Ask a grown-up to discuss your answer with you.';logActivity('Answered a story question');});
function renderChapterArt(story){const grid=$('#chapter-art-grid');grid.replaceChildren();(story.paragraphs||[]).forEach((paragraph,i)=>{const card=document.createElement('div');card.className='chapter-art';card.dataset.chapter=i;const label=document.createElement('p');label.textContent=`Chapter ${i+1}: ${paragraph.slice(0,105)}${paragraph.length>105?'…':''}`;card.append(label);grid.append(card);});$('#illustration-status').textContent=document.body.dataset.staticDemo==='true'?'AI chapter illustrations are unavailable in this Pages demo.':'Use “Illustrate chapters” to request a picture for each chapter. The same character guide is reused for consistency.';}
$('#illustrate-story').addEventListener('click',async()=>{if(!currentStory)return;const btn=$('#illustrate-story');btn.disabled=true;$('#illustration-status').textContent='Creating chapter illustrations… this may take a little while.';const cards=[...document.querySelectorAll('#chapter-art-grid .chapter-art')];try{for(let i=0;i<cards.length;i++){const res=await fetch('/api/illustration',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:currentStory.name,age:currentStory.age,interest:currentStory.interest,theme:currentStory.theme,chapter:currentStory.paragraphs[i],chapterNumber:i+1,characterGuide:`A friendly child hero named ${currentStory.name}, age ${currentStory.age}, with a consistent storybook appearance. Keep the child's appearance, outfit, colours and proportions identical in every chapter illustration. Do not base the character on a real person's photo.`})});const data=await res.json();if(res.status===401&&window.lmwAuth)window.lmwAuth.expire();if(!res.ok)throw new Error(data.error||'Illustration service unavailable');const img=document.createElement('img');img.src=data.image;img.alt=`Illustration for chapter ${i+1}`;cards[i].prepend(img);}$('#illustration-status').textContent='All chapter illustrations are ready for this session.';logActivity('Generated chapter illustrations');}catch(err){$('#illustration-status').textContent=err.message+' Check that image generation is enabled on your server.';}finally{btn.disabled=false;}});


// Story-linked lab recommendations: suggestions are generated locally from the child's story choices.
// A parent must approve each suggestion before it appears in the child's mission list.
const recommendationKey='lmwStoryLabRecommendationsV2';
const approvedKey='lmwApprovedStoryLabsV1';
const completedKey='lmwCompletedStoryLabsV1';
let activeMission=null;
const labBlueprints=[
 {lab:'Brain Lab',icon:'🧠',skill:'Memory, concentration and logic',type:'memory',task:(s,a)=>a<=5?'Turn over the cards. Can you find the matching story pictures?':`Remember the story pictures and find all the matching pairs from “${s.title}”.`,why:(s)=>`Remember the ${s.interest.toLowerCase()} friends and story clues.`},
 {lab:'Science Lab',icon:'🔬',skill:'Experiments, patterns and STEAM',type:'pattern',task:(s,a)=>a<=5?'Look at the colours and pictures. What comes next?':`Discover the pattern hiding in ${s.theme.toLowerCase()}. Choose what should come next.`,why:(s)=>`Explore a pattern inspired by the world of “${s.title}”.`},
 {lab:'Creative Lab',icon:'🎨',skill:'Drawing, building and imagination',type:'color',task:(s)=>`Bring a picture from “${s.title}” to life. Pick your colours and paint the story scene!`,why:(s)=>`Create a colourful new version of the ${s.theme.toLowerCase()} story world.`},
 {lab:'Reading Lab',icon:'📖',skill:'Letters, words and comprehension',type:'wordmatch',task:(s,a)=>a<=5?'Look at the picture. Can you find its first letter?':`Match a story word to the picture. Read it aloud or ask a grown-up to help.`,why:(s)=>`Use a word from the ${s.interest.toLowerCase()} adventure.`},
 {lab:'Focus Lab',icon:'🎯',skill:'Attention and executive functions',type:'differences',task:(s,a)=>a<=5?'Look closely! Can you spot what changed?':`Compare the two story pictures and tap every detail that is different.`,why:(s)=>`Look carefully for tiny changes in the story world.`},
 {lab:'Discovery Lab',icon:'🌍',skill:'Nature, animals and real-world activities',type:'shadow',task:(s)=>`Meet a friend from “${s.title}”. Match the animal to its shadow!`,why:(s)=>`Explore animals and habitats connected to ${s.interest.toLowerCase()}.`}
];
const motifSets={
 'Animals':['🦊','🐘','🦋','🐢','🦉','🐰'],'Dinosaurs':['🦕','🦖','🥚','🌋','🌿','🦴'],
 'Space':['🚀','🌙','⭐','🪐','👽','☄️'],'Vehicles':['🚂','🚗','🚁','🚲','🚢','🚌'],
 'Nature':['🌳','🌼','🍄','🌈','🌻','🍃'],'Professions':['🚒','👩‍🚀','🩺','👷','🚓','🎨'],
 'Ocean life':['🐬','🐠','🐙','🦀','🐚','🪸'],'Magic and fantasy':['🐉','🦄','🪄','🏰','💎','🧚'],
 'Sports':['⚽','🏀','🎾','🏆','🥅','🏃']
};
function storyMotifs(s){return motifSets[s.interest]||['⭐','🌳','🦋','🏰','🌈','🐻'];}
function shuffleItems(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function makeStoryRecommendations(story){
 const age=Number(story.age)||6, motifs=storyMotifs(story);
 const activities=labBlueprints.map((b,index)=>({
  id:crypto.randomUUID(),storyId:story.id,storyTitle:story.title,name:story.name,age,
  interest:story.interest,theme:story.theme,lab:b.lab,icon:b.icon,skill:b.skill,
  type:b.type,task:b.task(story,age),reason:b.why(story),motifs,
  status:'pending',createdAt:new Date().toISOString()
 }));
 saveRecommendations(activities);renderRecommendations();renderParentDashboard();
}
function getRecommendations(){try{return JSON.parse(store.get(recommendationKey)||'[]')}catch{return []}}
function saveRecommendations(items){store.set(recommendationKey,JSON.stringify(items));}
function getApproved(){try{return JSON.parse(store.get(approvedKey)||'[]')}catch{return []}}
function saveApproved(items){store.set(approvedKey,JSON.stringify(items));}
function getCompleted(){try{return JSON.parse(store.get(completedKey)||'[]')}catch{return []}}
function makeLabPicture(icon,accent){
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 190"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${accent}"/><stop offset="1" stop-color="#fff7d9"/></linearGradient></defs><rect width="420" height="190" rx="26" fill="url(#g)"/><circle cx="345" cy="35" r="22" fill="#fff" opacity=".55"/><path d="M0 145 Q90 100 180 150 T420 135 V190 H0Z" fill="#fff" opacity=".48"/><circle cx="75" cy="42" r="16" fill="#fff" opacity=".5"/><text x="210" y="128" text-anchor="middle" font-size="100">${icon}</text><path d="M25 155 l12 -18 12 18 M365 150 l10 -14 10 14" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round"/></svg>`;
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
function renderRecommendations(){
 const grid=$('#recommendation-grid');if(!grid)return;grid.replaceChildren();
 const recs=getRecommendations(),intro=$('#recommendation-intro');
 if(!recs.length){intro.textContent='Make a story to unlock six playful missions!';grid.innerHTML='<div class="recommendation-empty">📚 Create your story to start playing!</div>';}
 else{
  const story=recs[0];intro.textContent=`${story.storyTitle} · Age ${story.age} · 6 picture games!`;
  const accents=['#b9eee8','#e6d3ff','#ffd9e5','#dff0bd','#ffe3ad','#cde6ff'];
  recs.forEach((r,index)=>{
   const card=document.createElement('article');card.className='recommendation-card visual-mission-card';
   const art=document.createElement('img');art.className='mission-card-art';art.src=makeLabPicture(`${(r.motifs||[])[0]||'✨'} ${r.icon}`,accents[index%accents.length]);art.alt=`${r.lab} colourful illustration`;
   const head=document.createElement('div');head.className='recommendation-card-head';
   const icon=document.createElement('span');icon.className='recommendation-icon';icon.textContent=r.icon;
   const status=document.createElement('span');status.className='status-pill';status.textContent=r.status==='pending'?'Grown-up check':r.status==='approved'?'Ready to play':'Skipped';
   head.append(icon,status);
   const title=document.createElement('h3');title.textContent=r.lab;
   const skill=document.createElement('p');skill.className='recommendation-skill';skill.textContent=r.skill;
   const task=document.createElement('p');task.className='recommendation-task';task.textContent=r.task;
   card.append(art,head,title,skill,task);
   if(r.status==='approved'){const play=document.createElement('button');play.className='small-button mission-play-button';play.textContent='▶ Play now';play.addEventListener('click',()=>startMission(r));card.append(play);}
   else if(r.status==='pending'){const note=document.createElement('p');note.className='muted';note.textContent='🔒 Ask a grown-up to unlock';card.append(note);}
   grid.append(card);
  });
 }
 renderApprovedLabs();
}
function renderApprovedLabs(){
 const box=$('#approved-labs');if(!box)return;box.replaceChildren();
 const approved=getApproved().filter(x=>!getCompleted().some(c=>c.id===x.id));
 if(!approved.length){box.innerHTML='<p class="muted">No missions unlocked yet. Ask a grown-up to approve a game!</p>';return;}
 approved.forEach(m=>{const card=document.createElement('article');card.className='approved-mission';const info=document.createElement('div');const h=document.createElement('h3');h.textContent=`${m.icon} ${m.lab}`;const p=document.createElement('p');p.textContent=m.skill+' · '+m.storyTitle;info.append(h,p);const b=document.createElement('button');b.className='small-button';b.textContent='Play ›';b.addEventListener('click',()=>startMission(m));card.append(info,b);box.append(card);});
}
function renderParentRecommendations(){
 const box=$('#parent-recommendations');if(!box)return;box.replaceChildren();const pending=getRecommendations().filter(r=>r.status==='pending');
 if(!pending.length){box.innerHTML='<p>No suggestions waiting for review.</p>';return;}
 pending.forEach(r=>{const card=document.createElement('div');card.className='parent-suggestion';const h=document.createElement('h3');h.textContent=`${r.icon} ${r.lab}`;const p=document.createElement('p');p.textContent=`${r.name}, age ${r.age} · ${r.storyTitle}`;const desc=document.createElement('p');desc.textContent=r.task;const actions=document.createElement('div');actions.className='suggestion-actions';const approve=document.createElement('button');approve.className='small-button';approve.textContent='Approve';approve.addEventListener('click',()=>{const all=getRecommendations();const item=all.find(x=>x.id===r.id);if(item)item.status='approved';saveRecommendations(all);saveApproved([...getApproved(),{...r,status:'approved'}]);logActivity('Parent approved '+r.lab);renderRecommendations();renderParentDashboard();notify('Mission approved and added to the activity list.');});const skip=document.createElement('button');skip.className='text-button';skip.textContent='Skip';skip.addEventListener('click',()=>{const all=getRecommendations();const item=all.find(x=>x.id===r.id);if(item)item.status='skipped';saveRecommendations(all);renderRecommendations();renderParentDashboard();});actions.append(approve,skip);card.append(h,p,desc,actions);box.append(card);});
}
function gameNode(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;}
function gameDone(message='Amazing work! You solved it! ⭐'){
 $('#lab-game-feedback').textContent=message;
 $('#complete-lab').disabled=false;
}
function gameIntro(stage,text){stage.append(gameNode('p','game-prompt',text));}
function renderMemoryGame(m,stage){
 const age=Number(m.age)||6,icons=(m.motifs||storyMotifs(m));
 const tabs=gameNode('div','game-tabs'),content=gameNode('div','game-mode-content');
 const memory=gameNode('button','small-button','🧠 Memory pairs'),puzzle=gameNode('button','small-button','🧩 Picture puzzle');
 const show=(mode)=>{content.replaceChildren();$('#lab-game-feedback').textContent='You can do it!';$('#complete-lab').disabled=true;memory.classList.toggle('active',mode==='memory');puzzle.classList.toggle('active',mode==='puzzle');if(mode==='memory')renderMemoryPairs(m,content);else renderPicturePuzzle(m,content);};
 memory.addEventListener('click',()=>show('memory'));puzzle.addEventListener('click',()=>show('puzzle'));tabs.append(memory,puzzle);stage.append(tabs,content);show('memory');
}
function renderMemoryPairs(m,stage){
 const age=Number(m.age)||6,pairCount=age<=5?2:age<=8?3:4,icons=(m.motifs||storyMotifs(m)).slice(0,pairCount);
 const cards=shuffleItems([...icons,...icons]);let first=null,lock=false,matches=0;
 const grid=gameNode('div','memory-game-grid');stage.append(grid);
 cards.forEach(icon=>{
  const b=gameNode('button','memory-tile','❔');b.type='button';b.setAttribute('aria-label','Hidden picture card');
  b.addEventListener('click',()=>{
   if(lock||b.dataset.open==='1'||b.dataset.matched==='1')return;
   b.dataset.open='1';b.textContent=icon;b.classList.add('is-open');
   if(!first){first={icon,b};return;}
   if(first.icon===icon){first.b.dataset.matched='1';b.dataset.matched='1';first.b.classList.add('is-matched');b.classList.add('is-matched');matches++;first=null;if(matches===pairCount)gameDone('All pairs found! Super memory! 🏆');}
   else{lock=true;const prior=first;first=null;setTimeout(()=>{prior.b.textContent='❔';b.textContent='❔';prior.b.dataset.open='0';b.dataset.open='0';prior.b.classList.remove('is-open');b.classList.remove('is-open');lock=false;},650);}
  });grid.append(b);
 });
}
function renderPicturePuzzle(m,stage){
 const age=Number(m.age)||6,icons=(m.motifs||storyMotifs(m)).slice(0,age<=5?3:4),order=shuffleItems(icons);let next=0;
 gameIntro(stage,'Put the story pictures in the right order! Tap them one by one.');
 const tray=gameNode('div','puzzle-tray'),slots=gameNode('div','puzzle-slots');
 icons.forEach((icon,i)=>slots.append(gameNode('span','puzzle-slot',String(i+1))));
 order.forEach(icon=>{const b=gameNode('button','puzzle-piece',icon);b.addEventListener('click',()=>{if(b.disabled)return;if(icon===icons[next]){b.disabled=true;b.classList.add('puzzle-correct');slots.children[next].textContent=icon;next++;if(next===icons.length)gameDone('Puzzle complete! You put the story together! 🧩');}else $('#lab-game-feedback').textContent='Try another piece. What comes first?';});tray.append(b);});
 stage.append(slots,tray);
}
function renderScienceGame(m,stage){
 const tabs=gameNode('div','game-tabs'),content=gameNode('div','game-mode-content');
 const pattern=gameNode('button','small-button','🌈 Pattern game'),experiment=gameNode('button','small-button','🧪 Float test');
 const show=(mode)=>{content.replaceChildren();$('#lab-game-feedback').textContent='You can do it!';$('#complete-lab').disabled=true;pattern.classList.toggle('active',mode==='pattern');experiment.classList.toggle('active',mode==='experiment');if(mode==='pattern')renderPatternChallenge(m,content);else renderFloatExperiment(m,content);};
 pattern.addEventListener('click',()=>show('pattern'));experiment.addEventListener('click',()=>show('experiment'));tabs.append(pattern,experiment);stage.append(tabs,content);show('pattern');
}
function renderPatternChallenge(m,stage){
 const age=Number(m.age)||6,icons=m.motifs||storyMotifs(m);
 const sequence=age<=5?[icons[0],icons[1],icons[0],icons[1]]:age<=8?[icons[0],icons[1],icons[2],icons[0],icons[1]]:[icons[0],icons[1],icons[2],icons[1],icons[0],icons[1]];
 const answer=age<=5?icons[0]:icons[2];
 const row=gameNode('div','pattern-sequence');sequence.forEach(x=>row.append(gameNode('span','pattern-piece',x)));row.append(gameNode('span','pattern-piece pattern-question','?'));stage.append(row);
 const choices=gameNode('div','game-choice-row');
 shuffleItems([answer,icons[age<=5?2:0],icons[age<=5?3:4]]).forEach(x=>{const b=gameNode('button','picture-choice',x);b.addEventListener('click',()=>{if(x===answer){[...choices.children].forEach(c=>c.disabled=true);gameDone('You found the pattern! 🔬');}else $('#lab-game-feedback').textContent='Try again! Look at the order. 👀';});choices.append(b);});stage.append(choices);
}
function renderFloatExperiment(m,stage){
 const age=Number(m.age)||6;
 gameIntro(stage,age<=5?'Which one can float on the water?':'Make a prediction: which story-bridge material will float? Ask a grown-up to test it safely.');
 stage.append(gameNode('div','experiment-art','🌊 🛶 🌊'));
 const correct='🪵',options=age<=5?['🪵','🪨']:['🪵','🪨','🧱'];
 const row=gameNode('div','game-choice-row');
 shuffleItems(options).forEach(x=>{const b=gameNode('button','picture-choice',x);b.addEventListener('click',()=>{if(x===correct){[...row.children].forEach(c=>c.disabled=true);gameDone('Great prediction! Wood can float. 🧪');}else $('#lab-game-feedback').textContent='Try again! Think about what is lighter than water.';});row.append(b);});stage.append(row);
}
function renderColorGame(m,stage){
 const age=Number(m.age)||6;
 gameIntro(stage,age<=5?'Pick a colour, then tap a shape!':'Choose a colour and paint the story picture. Colour at least two parts!');
 const palette=gameNode('div','color-palette'),colors=['#ff6b6b','#ffca3a','#70c1b3','#6c9cf5','#b58ae8','#f58fc4','#8bc34a'];
 let selected=colors[0],painted=new Set();
 colors.forEach(c=>{const b=gameNode('button','color-swatch');b.style.background=c;b.setAttribute('aria-label','Choose paint colour');b.addEventListener('click',()=>{selected=c;[...palette.children].forEach(x=>x.classList.remove('selected'));b.classList.add('selected');});palette.append(b);});
 palette.firstChild.classList.add('selected');stage.append(palette);
 const wrap=gameNode('div','colour-picture');
 wrap.innerHTML='<svg viewBox="0 0 340 205" role="img" aria-label="A storybook garden waiting to be coloured"><rect x="4" y="4" width="332" height="197" rx="20" fill="#f4fbff" stroke="#c9def2" stroke-width="4"/><circle data-part="sun" cx="275" cy="48" r="25" fill="#fff" stroke="#7a8ca8" stroke-width="4"/><path d="M15 160 Q85 90 165 160 T325 145 V195 H15Z" fill="#fff" stroke="#7a8ca8" stroke-width="4" data-part="hill"/><rect data-part="house" x="126" y="93" width="82" height="76" rx="5" fill="#fff" stroke="#7a8ca8" stroke-width="4"/><path d="M115 97 L167 52 L220 97Z" fill="#fff" stroke="#7a8ca8" stroke-width="4" data-part="roof"/><circle data-part="tree" cx="65" cy="105" r="31" fill="#fff" stroke="#7a8ca8" stroke-width="4"/><rect x="59" y="132" width="12" height="39" fill="#fff" stroke="#7a8ca8" stroke-width="4"/><rect data-part="door" x="158" y="127" width="20" height="42" fill="#fff" stroke="#7a8ca8" stroke-width="3"/><path d="M240 170 Q260 140 280 170" fill="none" stroke="#7a8ca8" stroke-width="4"/></svg>';
 const storyStamp=gameNode('div','color-story-stamp',`${(m.motifs||storyMotifs(m))[0]} ${m.interest} story scene`);stage.append(storyStamp);
 wrap.querySelectorAll('[data-part]').forEach(part=>{part.style.cursor='pointer';part.addEventListener('click',()=>{part.setAttribute('fill',selected);painted.add(part.dataset.part);if(painted.size>=2)gameDone('Your story picture is colourful! 🎨');});});
 stage.append(wrap);
}
function renderWordGame(m,stage){
 const age=Number(m.age)||6,icons=m.motifs||storyMotifs(m),word=(m.interest||'story').trim();
 gameIntro(stage,age<=5?`Which letter starts “${word}”?`:`Which story word belongs with this picture?`);
 stage.append(gameNode('div','word-picture',icons[0]));
 const target=age<=5?word[0].toUpperCase():word;
 const distractors=age<=5?['B','M','S','T'].filter(x=>x!==target).slice(0,2):['Forest','Ocean','Rocket','Garden'].filter(x=>x.toLowerCase()!==word.toLowerCase()).slice(0,2);
 const choices=gameNode('div','game-choice-row');
 shuffleItems([target,...distractors]).forEach(x=>{const b=gameNode('button','word-choice',x);b.addEventListener('click',()=>{if(x===target){[...choices.children].forEach(c=>c.disabled=true);gameDone('That is the right match! 📖');}else $('#lab-game-feedback').textContent='Have another look at the picture!';});choices.append(b);});stage.append(choices);
}
function renderDifferencesGame(m,stage){
 const age=Number(m.age)||6,icons=m.motifs||storyMotifs(m),count=age<=5?4:age<=8?5:6,diffCount=age<=5?1:age<=8?2:3;
 const left=Array.from({length:count},(_,i)=>icons[i%icons.length]),right=[...left],positions=shuffleItems([...Array(count).keys()]).slice(0,diffCount);
 positions.forEach((p,i)=>right[p]=icons[(icons.indexOf(right[p])+2+i)%icons.length]);
 gameIntro(stage,`Two story pictures! Tap the ${diffCount} different ${diffCount===1?'picture':'pictures'} on the RIGHT.`);
 const compare=gameNode('div','difference-compare');
 const makeRow=(arr,label,clickable)=>{const col=gameNode('div','difference-column');col.append(gameNode('strong','',label));const row=gameNode('div','difference-row');arr.forEach((icon,i)=>{const b=gameNode('button','difference-tile',icon);b.disabled=!clickable;if(clickable)b.addEventListener('click',()=>{if(positions.includes(i)){b.classList.add('found-difference');b.disabled=true;positions.splice(positions.indexOf(i),1);if(!positions.length)gameDone('Eagle eyes! You found them all! 🦅');}else{b.classList.add('wrong-difference');setTimeout(()=>b.classList.remove('wrong-difference'),400);}});row.append(b);});col.append(row);return col;};
 compare.append(makeRow(left,'PICTURE A',false),makeRow(right,'PICTURE B',true));stage.append(compare);
}
function renderShadowGame(m,stage){
 const icons=m.motifs||storyMotifs(m),target=icons[0],choices=shuffleItems([target,...icons.slice(1,4)]);
 gameIntro(stage,'Which story friend or object matches this mystery shadow?');
 const shadow=gameNode('div','shadow-picture',target);shadow.style.filter='brightness(0)';stage.append(shadow);
 const row=gameNode('div','game-choice-row');
 choices.forEach(x=>{const b=gameNode('button','picture-choice',x);b.addEventListener('click',()=>{if(x===target){[...row.children].forEach(c=>c.disabled=true);gameDone('Shadow solved! Great exploring! 🌍');}else $('#lab-game-feedback').textContent='Not quite. Try another picture!';});row.append(b);});stage.append(row);
}
function startMission(m){
 activeMission=m;$('#lab-modal-title').textContent=`${m.icon} ${m.lab}`;
 $('#lab-modal-why').textContent=m.reason;$('#lab-modal-task').textContent=m.task;
 $('#lab-modal-skill').textContent='⭐ '+m.skill;$('#lab-game-stage').replaceChildren();
 $('#lab-game-feedback').textContent='You can do it!';$('#complete-lab').disabled=true;
 const stage=$('#lab-game-stage');
 if(m.type==='memory')renderMemoryGame(m,stage);
 else if(m.type==='pattern')renderScienceGame(m,stage);
 else if(m.type==='color')renderColorGame(m,stage);
 else if(m.type==='wordmatch')renderWordGame(m,stage);
 else if(m.type==='differences')renderDifferencesGame(m,stage);
 else if(m.type==='shadow')renderShadowGame(m,stage);
 $('#lab-modal').hidden=false;document.body.classList.add('modal-open');
}
function closeMission(){$('#lab-modal').hidden=true;document.body.classList.remove('modal-open');}
$('#close-lab-modal').addEventListener('click',closeMission);
$('#lab-modal').addEventListener('click',e=>{if(e.target.id==='lab-modal')closeMission();});
$('#complete-lab').addEventListener('click',()=>{if(!activeMission)return;const done=getCompleted();if(!done.some(x=>x.id===activeMission.id)){done.unshift({...activeMission,completedAt:new Date().toISOString()});store.set(completedKey,JSON.stringify(done));logActivity('Completed '+activeMission.lab);const unique=new Set(done.map(x=>x.lab));store.set('lmwLabsCompleted',Math.min(6,unique.size));if(activeMission.lab==='Brain Lab'||activeMission.lab==='Focus Lab')store.set('lmwFocusSessions',Number(store.get('lmwFocusSessions')||0)+1);}closeMission();updateProgress();renderApprovedLabs();renderParentDashboard();notify('Mission completed! Great effort. ⭐');celebrate();});

function applyChildToUi(child){
  activeChild=child;
  $('#child-name').value=child.name;$('#age').value=String(child.age);
  const own=(child.interests||[]).find(i=>[...$('#interest').options].some(o=>o.value===i));if(own)$('#interest').value=own;
  $('#welcome-title').textContent=`Hello, ${child.name}!`;
  const av=$('#switch-child');av.textContent=child.avatar||'🧒';av.setAttribute('aria-label',`${child.name} is playing. Switch child`);
}
window.lmwApp={
  start(user,child){
    store.prefix=`lmw:${user.id}:${child.id}:`;
    closeStory();closeMission();if('speechSynthesis'in window)speechSynthesis.cancel();
    applyChildToUi(child);$('#form-message').textContent='';
    showPage('home');renderLibrary();updateLatest();updateProgress();
    if(!getRecommendations().length&&getStories().length)makeStoryRecommendations(getStories()[0]);else renderRecommendations();
    renderParentDashboard();
  },
  updateChild(child){applyChildToUi(child);},
  stop(){store.prefix='lmw:signed-out:';activeChild=null;closeStory();closeMission();if('speechSynthesis'in window)speechSynthesis.cancel();},
  purge(userId,childId){const p=childId?`lmw:${userId}:${childId}:`:`lmw:${userId}:`;Object.keys(localStorage).filter(k=>k.startsWith(p)).forEach(k=>localStorage.removeItem(k));}
};


/* =========================================================
   Animal buddy: welcome movie + gentle nudges toward all six labs
   ========================================================= */
(function(){
  const BUDDIES={'🦊':'Finn the Fox','🐼':'Pip the Panda','🦁':'Leo the Lion','🐸':'Freddie the Frog','🐙':'Olly the Octopus','🦄':'Uma the Unicorn','🐯':'Tilly the Tiger','🐨':'Kobi the Koala'};
  const FRIENDS=['🐘','🐼','🦁','🐸','🐙','🦄','🐯','🐨','🦊'];
  const LABS=[['🧠','Brain','teal'],['🔬','Science','purple'],['🎨','Creative','pink'],['📖','Reading','green'],['🎯','Focus','orange'],['🌍','Discovery','blue']];
  const root=$('#welcome-movie'),stage=$('#movie-stage'),caption=$('#movie-caption'),dots=$('#movie-dots');
  const synth=('speechSynthesis'in window)?window.speechSynthesis:null;
  const SOUND_KEY='lmwMovieSound';
  let timer=null,idx=0,paused=false,remaining=0,startedAt=0,ctx=null,lastFocus=null,sound=false,playing=false;

  const mk=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const buddyName=a=>BUDDIES[a]||'your animal friend';
  const friendsFor=hero=>FRIENDS.filter(a=>a!==hero).slice(0,4);
  const hero=(a,extra='')=>{const w=mk('div','mv-hero '+extra);w.append(mk('span','mv-talk',a));return w;};
  const friend=(a,i)=>{const w=mk('div','mv-friend');w.style.setProperty('--i',i);w.append(mk('span','mv-hop',a));return w;};

  const scenes=[
    {ms:5200,text:()=>`Hi ${ctx.name}! I’m ${buddyName(ctx.hero)}. Welcome to Little Minds World!`,
     build(){stage.append(hero(ctx.hero,'mv-center'),mk('div','mv-wave','👋'),mk('div','mv-name',buddyName(ctx.hero)));}},
    {ms:4600,text:()=>'My animal friends are here too. We can’t wait to play with you!',
     build(){const row=mk('div','mv-friends');friendsFor(ctx.hero).forEach((a,i)=>row.append(friend(a,i)));stage.append(hero(ctx.hero,'mv-left'),row);}},
    {ms:5600,text:()=>`First, make a story with ${ctx.name} as the hero! Pick what you love, then tap Create My Story.`,
     build(){const book=mk('div','mv-book');book.append(mk('span','mv-book-icon','📖'),mk('span','mv-spark s1','✨'),mk('span','mv-spark s2','✨'),mk('span','mv-spark s3','⭐'));
       stage.append(hero(ctx.hero,'mv-left'),book,mk('div','mv-fake-button','✨ Create My Story'));}},
    {ms:7000,text:()=>'Then ask a grown-up to unlock your six games. Play them all to win six stars!',
     build(){const grid=mk('div','mv-labs');LABS.forEach(([e,n,c],i)=>{const b=mk('div','mv-lab '+c);b.style.setProperty('--i',i);b.append(mk('span','mv-lab-icon',e),mk('span','mv-lab-name',n));grid.append(b);});
       const stars=mk('div','mv-stars');for(let i=0;i<6;i++){const s=mk('span','',' ⭐');s.textContent='⭐';s.style.setProperty('--i',i);stars.append(s);}
       stage.append(hero(ctx.hero,'mv-small'),grid,stars);}},
    {ms:0,text:()=>`You can do it, ${ctx.name}! Let’s go!`,final:true,
     build(){const l=mk('div','mv-side mv-side-l'),r=mk('div','mv-side mv-side-r');const f=friendsFor(ctx.hero);f.slice(0,2).forEach((a,i)=>l.append(friend(a,i)));f.slice(2,4).forEach((a,i)=>r.append(friend(a,i+2)));
       stage.append(l,hero(ctx.hero,'mv-center mv-cheer'),r);for(let i=0;i<10;i++){const c=mk('span','mv-confetti',['⭐','🎉','✨','💛','🌈'][i%5]);c.style.setProperty('--x',(8+i*9)+'%');c.style.setProperty('--d',(i*0.28)+'s');stage.append(c);}}}
  ];

  function say(text){
    if(!synth)return;synth.cancel();if(!sound)return;
    const u=new SpeechSynthesisUtterance(text);u.lang='en';u.rate=.92;u.pitch=1.2;synth.speak(u);
  }
  function setSound(on,remember){
    sound=!!on&&!!synth;
    const b=$('#movie-sound');b.textContent=sound?'🔊 Sound on':'🔇 Sound off';b.setAttribute('aria-pressed',String(sound));b.hidden=!synth;
    if(remember)try{localStorage.setItem(SOUND_KEY,sound?'on':'off');}catch{}
    if(!sound&&synth)synth.cancel();
  }
  function schedule(ms){clearTimeout(timer);remaining=ms;startedAt=Date.now();timer=setTimeout(next,ms);}
  function showScene(i){
    idx=i;const sc=scenes[i];stage.replaceChildren();sc.build();
    const t=sc.text();caption.textContent=t;say(t);
    [...dots.children].forEach((d,k)=>{d.className=k<i?'done':k===i?'current':'';});
    $('#movie-skip').hidden=!!sc.final;$('#movie-again').hidden=!sc.final;$('#movie-go').hidden=!sc.final;
    $('#movie-pause').hidden=!!sc.final;
    if(sc.final){clearTimeout(timer);if(typeof celebrate==='function')celebrate();$('#movie-go').focus({preventScroll:true});}
    else schedule(sc.ms);
  }
  function next(){if(idx<scenes.length-1)showScene(idx+1);}
  function togglePause(){
    paused=!paused;root.classList.toggle('paused',paused);$('#movie-pause').textContent=paused?'▶ Play':'⏸ Pause';
    if(paused){clearTimeout(timer);remaining=Math.max(300,remaining-(Date.now()-startedAt));if(synth)synth.pause();}
    else{schedule(remaining);if(synth)synth.resume();}
  }
  function open(child){
    if(!child)return;
    ctx={name:child.name,hero:child.avatar||'🦊'};
    lastFocus=document.activeElement;paused=false;root.classList.remove('paused');$('#movie-pause').textContent='⏸ Pause';
    dots.replaceChildren(...scenes.map(()=>mk('i')));
    let saved=null;try{saved=localStorage.getItem(SOUND_KEY);}catch{}
    const gesture=!!(navigator.userActivation&&navigator.userActivation.hasBeenActive);
    setSound(saved?saved==='on':gesture,false);
    root.hidden=false;playing=true;document.body.classList.add('modal-open');
    const shell=document.querySelector('.app-shell');if(shell)shell.inert=true;
    showScene(0);$('#movie-skip').focus({preventScroll:true});
  }
  function close(go){
    if(!playing)return;playing=false;clearTimeout(timer);if(synth)synth.cancel();
    root.hidden=true;stage.replaceChildren();
    const shell=document.querySelector('.app-shell');if(shell)shell.inert=false;
    document.body.classList.remove('modal-open');
    if(go){showPage('home');const t=document.getElementById('create-panel');if(t){t.scrollIntoView({behavior:calmMotion()?'auto':'smooth',block:'start'});setTimeout(()=>{const f=t.querySelector('input');if(f)f.focus({preventScroll:true});},350);}}
    else if(lastFocus&&document.contains(lastFocus))lastFocus.focus();
  }
  $('#movie-skip').addEventListener('click',()=>close(false));
  $('#movie-go').addEventListener('click',()=>close(true));
  $('#movie-again').addEventListener('click',()=>{paused=false;root.classList.remove('paused');showScene(0);$('#movie-skip').focus({preventScroll:true});});
  $('#movie-pause').addEventListener('click',togglePause);
  $('#movie-sound').addEventListener('click',()=>{setSound(!sound,true);if(sound&&playing)say(caption.textContent);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&playing)close(false);});
  $('#replay-welcome').addEventListener('click',()=>open(activeChild));

  /* a short, kind nudge from the child's own animal */
  function refreshBuddyTip(){
    if(!activeChild)return;
    const name=activeChild.name,recs=getRecommendations(),approved=recs.filter(r=>r.status==='approved').length,done=Number(store.get('lmwLabsCompleted')||0),stories=getStories().length;
    let msg;
    if(!recs.length&&!stories)msg=`Hi ${name}! Let’s make a story together. Tap Create My Story!`;
    else if(done>=6)msg=`You finished all six labs, ${name}! You’re a superstar!`;
    else if(!approved)msg='Your six games are ready. Ask a grown-up to unlock them!';
    else if(done===0)msg='Your games are unlocked! Tap Play now to win your first star.';
    else if(approved<6&&done>=approved)msg=`Great job! ${done} star${done===1?'':'s'} so far. Ask a grown-up to unlock more games.`;
    else msg=`${done} of 6 stars! ${6-done} more to go. You can do it!`;
    document.querySelectorAll('.buddy-tip').forEach(t=>{t.querySelector('.buddy-face').textContent=activeChild.avatar||'🦊';t.querySelector('.buddy-tip-text').textContent=msg;});
  }
  let lastCount=-1;
  const _progress=updateProgress;
  updateProgress=function(){
    _progress();
    const n=Number(store.get('lmwLabsCompleted')||0);
    if(lastCount>=0&&n===6&&lastCount<6){celebrate();notify('All six labs done! You’re a superstar! 🌟');}
    lastCount=n;refreshBuddyTip();
  };
  const _recs=renderRecommendations;
  renderRecommendations=function(){_recs();refreshBuddyTip();};

  const _start=window.lmwApp.start,_stop=window.lmwApp.stop,_update=window.lmwApp.updateChild;
  window.lmwApp.start=function(user,child){lastCount=-1;_start(user,child);refreshBuddyTip();};
  window.lmwApp.stop=function(){close(false);_stop();};
  window.lmwApp.updateChild=function(child){_update(child);refreshBuddyTip();};
  /* plays once per login session for each child; the Watch button replays it any time */
  window.lmwApp.welcome=function(user,child){
    const key=`lmw:welcomed:${user.id}:${child.id}`;
    try{if(sessionStorage.getItem(key))return;sessionStorage.setItem(key,'1');}catch{}
    open(child);
  };
})();
