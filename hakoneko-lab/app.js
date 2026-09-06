import { WORLD, PARTS, createSimulation, stepSimulation, hitTestPart, clampPart } from './physics.mjs';
import { LEVELS, SANDBOX } from './levels.mjs';
import { AudioManager } from './audio.mjs';
import { drawScene, drawHero, drawToolIcon, drawCat, drawWin } from './art.mjs';

const $ = id => document.getElementById(id);
const clone = value => JSON.parse(JSON.stringify(value));
const escapeHTML = value => String(value).replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const STORE = 'hakoneko-lab-v1';
const CHAPTERS = ['こもれび工房','そよかぜの庭','星あかりの屋根裏'];
const TOOL_NAMES = {ramp:'さか',spring:'ばね',fan:'せんぷうき',bumper:'ぽよん'};
const DEFAULT_ANGLES = {ramp:Math.PI/12,spring:0,fan:0,bumper:0};
let memory = {version:1,clears:{},drafts:{},slots:[],lastStage:1,attempts:0,settings:{trace:true,reducedMotion:false},seenTools:[]};
try {
  const stored=JSON.parse(localStorage.getItem(STORE)||'null');
  if(stored && stored.version===1 && typeof stored==='object') {
    memory={...memory,...stored,clears:stored.clears&&typeof stored.clears==='object'?stored.clears:{},drafts:stored.drafts&&typeof stored.drafts==='object'?stored.drafts:{},slots:Array.isArray(stored.slots)?stored.slots.slice(0,6):[],settings:{trace:true,reducedMotion:false,...stored.settings},seenTools:Array.isArray(stored.seenTools)?stored.seenTools:[]};
  }
}catch{}
const state = {screen:'home',level:null,placements:[],selectedId:null,sim:null,previousTrace:[],undo:[],redo:[],hint:0,theme:0,particles:[],drag:null,paused:false,winTimer:null,dirty:false,storageFailed:false};
const audio = new AudioManager({onSubtitle:text=>{ $('subtitleText').textContent=text; }});
const mediaReduced=matchMedia('(prefers-reduced-motion: reduce)');
const reduced=()=>mediaReduced.matches||memory.settings.reducedMotion;
let partId=1,lastFrame=0,toastTimer=0,saveTimer=0,lastSfx=0;
const canvas=$('gameCanvas'), ctx=canvas.getContext('2d');
const hero=$('heroCanvas'), heroCtx=hero.getContext('2d');
const modal=$('modal');
const isFree=()=>state.level?.id==='free';
const isRunning=()=>state.sim?.status==='running';
const isEditing=()=>!state.sim;
function persist(){try{localStorage.setItem(STORE,JSON.stringify(memory));state.storageFailed=false;return true;}catch{state.storageFailed=true;return false;}}
function notify(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3000);}
function subtitle(text){$('subtitleText').textContent=text;}
async function activateAudio(){await audio.unlock();audio.startMusic();}
function queueSave(){clearTimeout(saveTimer);saveTimer=setTimeout(saveDraft,250);}
function saveDraft(){if(!state.level)return;memory.drafts[state.level.id]={placements:clone(state.placements),...(isFree()?{spawn:clone(state.level.spawn),goal:clone(state.level.goal),theme:state.theme}:{})};persist();}
function validPart(p){return p&&typeof p==='object'&&Object.hasOwn(PARTS,p.kind)&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.angle);}
function normalizeParts(parts,inventory){const counts={};return (Array.isArray(parts)?parts:[]).filter(validPart).filter(p=>{counts[p.kind]=(counts[p.kind]||0)+1;return counts[p.kind]<=(inventory[p.kind]||0);}).slice(0,24).map(p=>clampPart({...p,id:`p${partId++}`}));}
function safePoint(p,fallback,kind='spawn'){const margin=kind==='goal'?90:30;return p&&Number.isFinite(p.x)&&Number.isFinite(p.y)?{...fallback,x:Math.max(margin,Math.min(960-margin,p.x)),y:Math.max(35,Math.min(kind==='goal'?490:480,p.y))}:clone(fallback);}
function snapshot(){return {placements:clone(state.placements),spawn:clone(state.level.spawn),goal:clone(state.level.goal)};}
function recordUndo(){state.undo.push(snapshot());if(state.undo.length>70)state.undo.shift();state.redo=[];}
function applySnapshot(snap){state.placements=clone(snap.placements);state.level.spawn=clone(snap.spawn);state.level.goal=clone(snap.goal);state.selectedId=null;renderControls();queueSave();}
function undo(){if(!isEditing()||!state.undo.length)return;state.redo.push(snapshot());applySnapshot(state.undo.pop());audio.sfx('rotate');}
function redo(){if(!isEditing()||!state.redo.length)return;state.undo.push(snapshot());applySnapshot(state.redo.pop());audio.sfx('rotate');}
function openModal(html){finishDrag();state.paused=true;$('modalContent').innerHTML=html;if(!modal.open)modal.showModal();}
function closeModal(){modal.close();state.paused=false;audio.stopVoice();if(state.screen==='game')canvas.focus({preventScroll:true});}
$('closeModal').onclick=closeModal;
modal.addEventListener('cancel',()=>{state.paused=false;audio.stopVoice();});
modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});
function clearWinTimer(){if(state.winTimer)clearTimeout(state.winTimer);state.winTimer=null;}
function showHome(){saveDraft();finishDrag();clearWinTimer();state.screen='home';state.sim=null;state.paused=false;audio.stopVoice();document.body.classList.remove('playing');$('homeScreen').hidden=false;$('gameScreen').hidden=true;updateHome();window.scrollTo({top:0});}
function updateHome(){const n=LEVELS.filter(l=>memory.clears[l.id]).length;$('homeProgress').textContent=n?`${n} / 18 のじっけんが できたよ！`:'18のじっけんが まっているよ';$('startBtn').innerHTML=n?'つづきの じっけんへ <span>→</span>':'じっけんを はじめる <span>→</span>';}
function enterLevel(id,{reset=false,fromSlot=null}={}){
  if(modal.open)closeModal();saveDraft();clearWinTimer();finishDrag();
  state.level=clone(id==='free'?SANDBOX:LEVELS.find(l=>l.id===id)||LEVELS[0]);
  state.screen='game';document.body.classList.add('playing');state.sim=null;state.previousTrace=[];state.selectedId=null;state.undo=[];state.redo=[];state.hint=state.level.id===1?1:0;state.particles=[];state.paused=false;
  const saved=fromSlot||(!reset?memory.drafts[id]:null);
  state.placements=normalizeParts(saved?.placements,state.level.inventory);
  state.theme=state.level.chapter;
  if(isFree()&&saved){state.level.spawn=safePoint(saved.spawn,SANDBOX.spawn,'spawn');state.level.goal=safePoint(saved.goal,SANDBOX.goal,'goal');state.theme=[0,1,2].includes(saved.theme)?saved.theme:0;state.level.cat=['sharo','yuki','hotate'][state.theme];state.level.chapter=state.theme;}
  if(!isFree()){memory.lastStage=state.level.id;persist();}
  $('homeScreen').hidden=true;$('gameScreen').hidden=false;document.body.classList.toggle('free-mode',isFree());
  $('stageTitle').textContent=state.level.title;
  $('chapterLabel').textContent=isFree()?'FREE LAB / きみだけの工房':`${String(state.level.id).padStart(2,'0')} / ${CHAPTERS[state.level.chapter]}`;
  $('missionText').textContent=state.level.intro||'けいとだまを ネコのはこに とどけよう。';
  $('sandboxOptions').hidden=!isFree();$('saveBtn').hidden=!isFree();$('themeSelect').value=String(state.theme);
  $('hintText').textContent=state.hint?state.level.hint:'こまったら、ヒントを みてみよう。';$('exampleBtn').hidden=true;
  renderControls();subtitle(isFree()?'どうぐを おいてみよう。毛糸玉と ネコのはこも うごかせるよ。':'どうぐを えらぶ → おく → ころがす。なんどでも ためせるよ。');
  audio.say(isFree()?'sandbox':state.level.id===1?'place':state.level.id===7?'garden':state.level.id===13?'moon':'goal');
  window.scrollTo({top:0});
}
function renderTools(){
  const inventory=state.level.inventory;
  const used={};state.placements.forEach(p=>used[p.kind]=(used[p.kind]||0)+1);
  $('toolButtons').innerHTML=Object.entries(TOOL_NAMES).map(([kind,label])=>{const remaining=Math.max(0,(inventory[kind]||0)-(used[kind]||0));return `<button class="tool-button ${selected()?.kind===kind?'active':''}" data-tool="${kind}" aria-label="${label}を置く、残り${remaining}個" ${!isEditing()||!remaining?'disabled':''}><canvas width="128" height="74" aria-hidden="true"></canvas><span>${label}</span><span class="remaining">${remaining>0?'×'+remaining:'—'}</span></button>`;}).join('');
  $('toolButtons').querySelectorAll('[data-tool]').forEach(button=>{drawToolIcon(button.querySelector('canvas').getContext('2d'),button.dataset.tool,128,74);button.onclick=()=>addPart(button.dataset.tool);});
  $('toolCount').textContent=`${state.placements.length}こ / ${Object.values(inventory).reduce((a,b)=>a+b,0)}こ`;
}
function selected(){return state.placements.find(p=>p.id===state.selectedId);}
function renderSelection(){const p=selected();$('selectionPanel').hidden=!p||!isEditing();if(!p)return;const deg=Math.round(p.angle*180/Math.PI);$('selectedName').textContent=TOOL_NAMES[p.kind];$('angleLabel').textContent=`かたむき ${deg}°`;$('angleSlider').value=deg;}
function renderControls(){
  renderTools();renderSelection();$('undoBtn').disabled=!state.undo.length||!isEditing();$('redoBtn').disabled=!state.redo.length||!isEditing();
  $('runBtn').disabled=!isEditing();$('rewindBtn').disabled=isEditing();$('hintBtn').disabled=!isEditing();$('exampleBtn').disabled=!isEditing();
  $('saveBtn').disabled=!isEditing();$('themeSelect').disabled=!isEditing();
  $('modePill').textContent=isEditing()?'✂ つくるじかん':isRunning()?'● じっけんちゅう':'✦ じっけんの けっか';$('modePill').classList.toggle('running',!isEditing());
  $('traceBtn').setAttribute('aria-pressed',String(memory.settings.trace));$('traceBtn').innerHTML=`⋯ <span>あしあと ${memory.settings.trace?'ON':'OFF'}</span>`;
  $('runStatus').hidden=!state.sim||isRunning();if(state.sim?.status==='lost')$('runStatus').textContent='まきもどして、ちょっと かえてみよう。';if(state.sim?.status==='won')$('runStatus').textContent='とどいた！ すてきな はつめい！';
  updateStars();
}
function updateStars(){const pickups=state.sim?.stars?.size||0;const earned=state.sim?.status==='won'?Math.min(3,1+pickups):Math.min(2,pickups);$('starCount').textContent=isFree()?'✦ FREE':'★'.repeat(earned)+'☆'.repeat(3-earned);$('starCount').setAttribute('aria-label',isFree()?'自由な実験':`星${earned}個`);}
function addPart(kind){
  if(!isEditing())return;const count=state.placements.filter(p=>p.kind===kind).length;if(count>=(state.level.inventory[kind]||0))return;
  recordUndo();const p=clampPart({id:`p${partId++}`,kind,x:450+(count%3)*35,y:250+(count%3)*45,angle:DEFAULT_ANGLES[kind]});state.placements.push(p);state.selectedId=p.id;renderControls();queueSave();audio.sfx('place');
  subtitle(`${TOOL_NAMES[kind]}を おいたよ。ドラッグで うごかして、むきを かえてみよう。`);
  if(!memory.seenTools.includes(kind)){memory.seenTools.push(kind);audio.say(kind);persist();}
}
function removePart(){if(!isEditing()||!selected())return;recordUndo();state.placements=state.placements.filter(p=>p.id!==state.selectedId);state.selectedId=null;audio.sfx('place');renderControls();queueSave();}
function rotatePart(delta){const p=selected();if(!isEditing()||!p)return;recordUndo();p.angle+=delta;clampPart(p);audio.sfx('rotate');renderSelection();queueSave();$('undoBtn').disabled=false;}
function nudge(dx,dy){const p=selected();if(!isEditing()||!p)return;recordUndo();p.x+=dx;p.y+=dy;clampPart(p);renderControls();queueSave();}
function launch(){if(!isEditing())return;finishDrag();saveDraft();state.sim=createSimulation(clone(state.level),clone(state.placements));state.particles=[];state.selectedId=null;memory.attempts=(Number(memory.attempts)||0)+1;persist();audio.sfx('launch');renderControls();subtitle('ころころ…どこへ とどくかな？');}
function rewind(){if(!state.sim)return;clearWinTimer();state.previousTrace=state.sim.trace?.map(p=>({...p}))||[];state.sim=null;state.particles=[];audio.stopVoice();audio.sfx('retry');renderControls();subtitle('あしあとを ヒントに、すこし かえてみよう。');}
function showHint(){if(!isEditing())return;state.hint++;$('hintText').textContent=state.level.hint;if(!isFree()){$('exampleBtn').hidden=false;$('hintBtn').textContent=state.hint>1?'ヒントを みる':'おきばも みる';}audio.say('hint');}
function placeExample(){if(!isEditing()||isFree())return;recordUndo();state.placements=normalizeParts(state.level.solution,state.level.inventory);state.selectedId=state.placements[0]?.id||null;state.hint=2;renderControls();queueSave();subtitle('おてほんを おいたよ。ころがしてから、じぶんの くふうも ためそう。');audio.sfx('place');}
function point(e){const r=canvas.getBoundingClientRect();const scale=Math.min(r.width/WORLD.width,r.height/WORLD.height);const ox=(r.width-WORLD.width*scale)/2,oy=(r.height-WORLD.height*scale)/2;return{x:(e.clientX-r.left-ox)/scale,y:(e.clientY-r.top-oy)/scale,scale};}
function pickAt(p){const padding=Math.min(30,Math.max(10,18/p.scale));return [...state.placements].reverse().find(part=>hitTestPart(part,p.x,p.y,padding));}
canvas.addEventListener('pointerdown',e=>{
  if(!isEditing()||state.paused||state.drag||e.button>0)return;
  const p=point(e);if(p.x<0||p.x>960||p.y<0||p.y>540)return;e.preventDefault();canvas.focus({preventScroll:true});
  const part=pickAt(p);let target=part,kind='part';
  if(!part&&isFree()){
    if(Math.hypot(p.x-state.level.spawn.x,p.y-state.level.spawn.y)<Math.max(26,22/p.scale)){target=state.level.spawn;kind='spawn';}
    else if(Math.abs(p.x-state.level.goal.x)<state.level.goal.w/2+12&&Math.abs(p.y-state.level.goal.y)<state.level.goal.h/2+24){target=state.level.goal;kind='goal';}
  }
  if(target){state.selectedId=part?.id||null;state.drag={pointerId:e.pointerId,kind,target,start:p,original:snapshot(),dx:p.x-target.x,dy:p.y-target.y,moved:false};canvas.setPointerCapture(e.pointerId);}
  else if(selected()){recordUndo();const s=selected();s.x=p.x;s.y=p.y;clampPart(s);audio.sfx('place');queueSave();}
  renderControls();
});
canvas.addEventListener('pointermove',e=>{const d=state.drag;if(!d||d.pointerId!==e.pointerId||!isEditing())return;e.preventDefault();const p=point(e);if(Math.hypot(p.x-d.start.x,p.y-d.start.y)>2)d.moved=true;if(!d.moved)return;d.target.x=p.x-d.dx;d.target.y=p.y-d.dy;if(d.kind==='part')clampPart(d.target);else {const margin=d.kind==='goal'?90:30;d.target.x=Math.max(margin,Math.min(960-margin,d.target.x));d.target.y=Math.max(35,Math.min(d.kind==='goal'?490:480,d.target.y));}renderSelection();});
function finishDrag(){const d=state.drag;if(!d)return;if(d.moved){state.undo.push(d.original);if(state.undo.length>70)state.undo.shift();state.redo=[];queueSave();audio.sfx('place');}try{canvas.releasePointerCapture(d.pointerId);}catch{}state.drag=null;if(state.level)renderControls();}
function endPointer(e){if(state.drag?.pointerId===e.pointerId)finishDrag();}
canvas.addEventListener('pointerup',endPointer);canvas.addEventListener('pointercancel',endPointer);canvas.addEventListener('lostpointercapture',endPointer);
canvas.addEventListener('keydown',e=>{if(modal.open||!state.level)return;if(e.code==='Space'){e.preventDefault();isEditing()?launch():rewind();return;}if(!isEditing())return;const dirs={ArrowLeft:[-8,0],ArrowRight:[8,0],ArrowUp:[0,-8],ArrowDown:[0,8]};if(dirs[e.key]){e.preventDefault();nudge(...dirs[e.key]);}else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();removePart();}else if(e.key.toLowerCase()==='q')rotatePart(-Math.PI/12);else if(e.key.toLowerCase()==='e')rotatePart(Math.PI/12);else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();}});
let sliderEditing=false;
$('angleSlider').addEventListener('input',e=>{if(!isEditing()||!selected())return;if(!sliderEditing){recordUndo();sliderEditing=true;}selected().angle=Number(e.target.value)*Math.PI/180;clampPart(selected());renderSelection();queueSave();$('undoBtn').disabled=false;});
$('angleSlider').addEventListener('change',()=>{sliderEditing=false;audio.sfx('rotate');});
$('rotateLeft').onclick=()=>rotatePart(-Math.PI/12);$('rotateRight').onclick=()=>rotatePart(Math.PI/12);$('deleteBtn').onclick=removePart;
document.querySelectorAll('[data-nudge]').forEach(b=>b.onclick=()=>nudge(...b.dataset.nudge.split(',').map(Number)));
function showMap(){
  openModal(`<p class="modal-eyebrow">EXPERIMENT NOTEBOOK</p><h2 class="modal-title">どの じっけんに する？</h2><p class="modal-description">すきなところから あそべるよ。星は おまけ。<br>ネコに とどいたら、じっけん せいこう！</p>${CHAPTERS.map((name,chapter)=>`<h3 class="chapter-title">${['☀','❀','☾'][chapter]} ${name}</h3><div class="stage-grid">${LEVELS.filter(l=>l.chapter===chapter).map(l=>{const n=Math.max(0,Math.min(3,Number(memory.clears[l.id]?.stars)||0));return `<button class="stage-card ${state.level?.id===l.id?'current':''}" data-stage="${l.id}" aria-label="実験${l.id} ${escapeHTML(l.title)}、星${n}個"><b>${String(l.id).padStart(2,'0')}</b><small>${escapeHTML(l.title)}</small><span>${'★'.repeat(n)+'☆'.repeat(3-n)}</span></button>`;}).join('')}</div>`).join('')}<div class="modal-actions"><button id="mapFree" class="secondary">✂ じゆうに つくる</button></div>`);
  modal.querySelectorAll('[data-stage]').forEach(b=>b.onclick=async()=>{await activateAudio();enterLevel(Number(b.dataset.stage));});$('mapFree').onclick=async()=>{await activateAudio();enterLevel('free');};
}
function recordClear(){if(isFree()||state.sim?.status!=='won')return;const stars=Math.min(3,1+(state.sim.stars?.size||0));const old=memory.clears[state.level.id];memory.clears[state.level.id]={stars:Math.max(old?.stars||0,stars),parts:Math.min(old?.parts??99,state.placements.length)};persist();}
function showWin(){
  if(state.sim?.status!=='won'||modal.open||state.screen!=='game')return;
  const stars=Math.min(3,1+(state.sim.stars?.size||0));
  const allClear=LEVELS.every(l=>memory.clears[l.id]);
  openModal(`<div class="win-content"><canvas id="winArt" class="win-scene" width="460" height="290" aria-label="毛糸玉を受け取って喜ぶ猫"></canvas><div class="win-stars">${isFree()?'✦ ✧ ✦':'★'.repeat(stars)+'☆'.repeat(3-stars)}</div><h2 class="modal-title">${!isFree()&&allClear?'きみは はつめい名人！':'とどいた！ だいせいこう！'}</h2><p class="win-note">${!isFree()&&allClear?'18のじっけんを ぜんぶ クリア！<br>つぎは じぶんだけの しかけを つくってみよう。':stars<3&&!isFree()?'とどけられたら、はなまる！<br>星も とるには、どんな しかけに しよう？':'きみの しかけで、ネコが にっこり。<br>ちがう とどけかたも あるかな？'}</p><div class="modal-actions"><button id="winNext" class="primary">${isFree()?'しかけを ほぞん':state.level.id===18?'じゆうに つくる →':'つぎの じっけん →'}</button><button id="winAgain" class="secondary">もっと くふうする</button></div></div>`);
  drawWin($('winArt').getContext('2d'),state.level.cat);
  audio.say(!isFree()&&allClear?'allclear':`success${1+(Number(state.level.id)||0)%3}`);
  $('winNext').onclick=()=>{if(isFree()){closeModal();rewind();showSave();}else enterLevel(state.level.id===18?'free':state.level.id+1);};
  $('winAgain').onclick=()=>{closeModal();rewind();};
}
function showSound(){
  openModal(`<p class="modal-eyebrow">SOUND & COMFORT</p><h2 class="modal-title">おとの せってい</h2><p class="modal-description">音なしでも、文字の あんないで あそべるよ。</p><label class="setting-toggle"><input id="muteToggle" type="checkbox" ${audio.settings.muted?'checked':''}> すべての音を OFF</label>${[['voice','ずんだもんの声'],['music','BGM'],['sfx','こうかおん']].map(([id,label])=>`<label class="setting-row"><span>${label}</span><input data-volume="${id}" type="range" min="0" max="100" step="5" value="${Math.round(audio.settings[id]*100)}"><output>${Math.round(audio.settings[id]*100)}%</output></label>`).join('')}<label class="setting-toggle"><input id="motionToggle" type="checkbox" ${memory.settings.reducedMotion?'checked':''}> かざりの 動きを ひかえめに</label><div class="modal-actions"><button id="testVoice" class="secondary">♫ 声を きいてみる</button></div><p class="howto-tip">音声：VOICEVOX:ずんだもん<br>声・BGM・効果音の大きさは、このブラウザに保存されます。</p>`);
  $('muteToggle').onchange=e=>{audio.setSettings({muted:e.target.checked});updateSoundButton();};
  modal.querySelectorAll('[data-volume]').forEach(input=>input.oninput=()=>{audio.setSettings({[input.dataset.volume]:Number(input.value)/100});input.nextElementSibling.value=input.value+'%';});
  $('motionToggle').onchange=e=>{memory.settings.reducedMotion=e.target.checked;persist();};
  $('testVoice').onclick=async()=>{await activateAudio();audio.say('greeting');};
}
function updateSoundButton(){$('soundBtn').setAttribute('aria-label',audio.settings.muted?'音の設定、現在すべてOFF':'音の設定');$('soundBtn').innerHTML=`${audio.settings.muted?'♩':'♫'} <span>${audio.settings.muted?'おと OFF':'おと'}</span>`;}
function showHelp(){openModal(`<p class="modal-eyebrow">HOW TO PLAY</p><h2 class="modal-title">ためして、ひらめこう。</h2><p class="modal-description">けいとだまを、ネコの はこに とどけるゲーム。<br>せいかいは ひとつじゃないよ。</p><div class="howto-grid"><div class="howto-step"><b>① どうぐを おく</b>どうぐばこの ボタンを おそう。<br>道具を ドラッグするか、道具を えらんでから おきたい ばしょを タップ。</div><div class="howto-step"><b>② むきを かえる</b>道具を えらんだら、↶ ↷ や スライダーで かたむけよう。<br>矢印ボタンで 少しずつ うごかせるよ。</div><div class="howto-step"><b>③ ころがす！</b>毛糸玉の 動きを みよう。<br>「まきもどす」で すぐ もどせるよ。こまったら ヒントを みてね。</div></div><p class="howto-tip">星は おまけ。とらなくても クリアできるよ。<br>スマホは横向きにすると、実験台が大きく見えます。<br>パソコン：道具を選んで矢印キーで移動、Q・Eで回転、Deleteで片付け、Spaceで実験／巻き戻し。<br>自由制作では、毛糸玉の出発点とネコの箱も動かせます。</p><div class="modal-actions"><button id="helpDone" class="primary">わかった！</button></div>`);$('helpDone').onclick=closeModal;}
function showRecords(){const cleared=LEVELS.filter(l=>memory.clears[l.id]).length;const stars=LEVELS.reduce((sum,l)=>sum+(Math.min(3,Number(memory.clears[l.id]?.stars))||0),0);openModal(`<p class="modal-eyebrow">MY INVENTION NOTEBOOK</p><h2 class="modal-title">きみの はつめいノート</h2><div class="records"><div class="record"><b>${cleared}<small>/18</small></b><span>できた じっけん</span></div><div class="record"><b>${stars}<small>/54</small></b><span>あつめた 星</span></div><div class="record"><b>${memory.slots.length}</b><span>ほぞんした さくひん</span></div></div><p class="modal-description">${cleared===18?'はつめい名人、おめでとう！':cleared>=6?'いろんな しかけが できてきたね。': 'ひとつの「どうなる？」から、発明は はじまるよ。'}<br>なんど ためしても だいじょうぶ。きみの ペースで あそぼう。</p><div class="modal-actions"><button id="recordsMap" class="primary">じっけんを えらぶ</button><button id="recordsFree" class="secondary">さくひんを ひらく</button></div><p class="howto-tip">記録はこの端末・ブラウザに保存されます。ブラウザのデータを消すと記録も消えます。</p>`);$('recordsMap').onclick=showMap;$('recordsFree').onclick=()=>showSlots();}
function showSave(){
  if(!isFree())return;
  openModal(`<p class="modal-eyebrow">SAVE YOUR INVENTION</p><h2 class="modal-title">しかけに 名前を つけよう</h2><p class="modal-description">6つまで ほぞんできるよ。あとで また あそぼう。</p><form id="saveForm" class="save-form"><input id="creationName" maxlength="24" required placeholder="たとえば：ぴょんぴょん こうぼう" aria-label="作品の名前"><button class="primary" type="submit">ほぞん</button></form><div id="saveSlotList" class="save-slots"></div>`);
  $('saveForm').onsubmit=e=>{e.preventDefault();const name=$('creationName').value.trim();if(!name){$('creationName').focus();return;}const creation={name,placements:clone(state.placements),spawn:clone(state.level.spawn),goal:clone(state.level.goal),theme:state.theme,at:new Date().toISOString()};
    if(memory.slots.length>=6){notify('6つ いっぱいだよ。下の作品を えらんで 上書きできるよ。');renderSaveSlots(creation);return;}memory.slots.push(creation);if(persist()){closeModal();notify('しかけを ほぞんしたよ！');audio.say('save');}else notify('このブラウザでは保存できません。端末の空き容量や設定を確認してください。');};
  renderSaveSlots(null);
}
function renderSaveSlots(pending){const list=$('saveSlotList');if(!list)return;list.innerHTML=memory.slots.map((slot,i)=>`<div class="save-slot"><div><b>${escapeHTML(slot.name)}</b><p>${slot.placements?.length||0}この道具 · ${CHAPTERS[slot.theme]||CHAPTERS[0]}</p></div><button class="secondary small" data-overwrite="${i}">${pending?'ここに 上書き':'上書きする'}</button></div>`).join('');list.querySelectorAll('[data-overwrite]').forEach(b=>b.onclick=()=>{const name=$('creationName').value.trim()||memory.slots[Number(b.dataset.overwrite)].name;const i=Number(b.dataset.overwrite);openModal(`<h2 class="modal-title">この さくひんを 入れかえる？</h2><p class="modal-description">「${escapeHTML(memory.slots[i].name)}」を、いまの しかけに 入れかえます。</p><div class="modal-actions"><button id="confirmOverwrite" class="primary">入れかえて ほぞん</button><button id="cancelOverwrite" class="secondary">もどる</button></div>`);$('confirmOverwrite').onclick=()=>{memory.slots[i]=pending||{name,placements:clone(state.placements),spawn:clone(state.level.spawn),goal:clone(state.level.goal),theme:state.theme,at:new Date().toISOString()};if(persist()){closeModal();notify('しかけを ほぞんしたよ！');audio.say('save');}else notify('保存できませんでした。');};$('cancelOverwrite').onclick=showSave;});}
function showSlots(){openModal(`<p class="modal-eyebrow">YOUR LITTLE WORKSHOPS</p><h2 class="modal-title">ほぞんした さくひん</h2><div class="save-slots">${memory.slots.length?memory.slots.map((slot,i)=>`<div class="save-slot"><div><b>${escapeHTML(slot.name)}</b><p>${slot.placements?.length||0}この道具 · ${CHAPTERS[slot.theme]||CHAPTERS[0]}</p></div><button class="secondary small" data-load="${i}">ひらく →</button></div>`).join(''):'<p class="modal-description">まだ さくひんは ないよ。<br>じゆうに つくって、ほぞんしてみよう！</p>'}</div><div class="modal-actions"><button id="newFree" class="primary">あたらしく つくる</button></div>`);modal.querySelectorAll('[data-load]').forEach(b=>b.onclick=async()=>{await activateAudio();enterLevel('free',{fromSlot:memory.slots[Number(b.dataset.load)]});});$('newFree').onclick=async()=>{await activateAudio();enterLevel('free',{reset:true});};}
function showCredits(){openModal(`<p class="modal-eyebrow">ABOUT THIS GAME</p><h2 class="modal-title">はこねこ大実験</h2><div class="credits-copy"><p>にゃんこ発明ラボ2<br>シャロ・ゆき・ほたてと、じぶんの仕掛けを作る物理パズル。道具の位置・角度・風の向きで、毛糸玉の動きが変わります。</p><p>企画・公開：山岸産業医事務所<br>音声：<strong>VOICEVOX:ずんだもん</strong><br>音楽・効果音・イラスト：このゲームのためのオリジナル制作</p><p>クリア記録・設定・作品は、この端末のブラウザ内に保存されます。アカウント登録は不要です。音声はゲームに同梱されています。</p><p><a href="https://yamayu-sangyoui-oyama.localinfo.jp/pages/9869339/page_202607060244" target="_blank" rel="noopener">ほかのネコゲームであそぶ ↗</a></p><p><a href="https://voicevox.hiroshiba.jp/" target="_blank" rel="noopener">VOICEVOX</a> / <a href="https://zunko.jp/con_ongen_kiyaku.html" target="_blank" rel="noopener">音声利用規約</a></p><p>version 1.0 · 2026</p></div>`);}
function burst(x,y,color='#e5b650'){if(reduced())return;for(let i=0;i<14;i++)state.particles.push({x,y,vx:(Math.random()-.5)*150,vy:-50-Math.random()*130,life:1,color});}
function processEvents(){if(!state.sim)return;for(const e of state.sim.events.splice(0)){if(e.type==='star'){audio.sfx('star');burst(e.x,e.y);updateStars();}else if(e.type==='spring'){audio.sfx('spring');burst(e.x,e.y,'#e9a0ac');}else if(['bounce','collision','bumper'].includes(e.type)&&performance.now()-lastSfx>130){audio.sfx('bounce');lastSfx=performance.now();}}}
function renderLoop(now){
  requestAnimationFrame(renderLoop);const dt=Math.min(.25,(now-lastFrame)/1000||0);lastFrame=now;if(document.hidden)return;
  if(state.screen==='home'){heroCtx.setTransform(hero.width/960,0,0,hero.height/660,0,0);drawHero(heroCtx,reduced()?0:now/1000);return;}
  if(!state.level)return;
  canvas.dataset.status=state.sim?.status||'editing';canvas.dataset.elapsed=String(state.sim?.elapsed||0);
  if(isRunning()&&!state.paused){const prev=state.sim.status;stepSimulation(state.sim,dt);processEvents();if(prev!==state.sim.status){renderControls();if(state.sim.status==='won'){recordClear();audio.sfx('win');burst(state.level.goal.x,state.level.goal.y);state.winTimer=setTimeout(showWin,750);}else{audio.sfx('retry');audio.say(memory.attempts%2?'retry1':'retry2');}}}
  state.particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=160*dt;p.life-=dt;});state.particles=state.particles.filter(p=>p.life>0);
  ctx.setTransform(canvas.width/960,0,0,canvas.height/540,0,0);
  const renderSim=state.sim||((memory.settings.trace&&state.previousTrace.length)?{trace:state.previousTrace,stars:new Set(),status:'preview'}:null);
  drawScene(ctx,state.level,state.placements,renderSim,{time:reduced()?0:now/1000,selectedId:state.selectedId,ghostParts:isEditing()&&state.hint>=1&&!isFree()?state.level.solution.slice(0,state.hint>=2?undefined:1):[],showTrace:memory.settings.trace,reducedMotion:reduced(),particles:state.particles,theme:state.theme});
}
function setResolution(){const dpr=Math.min(devicePixelRatio||1,2);canvas.width=960*dpr;canvas.height=540*dpr;hero.width=960*dpr;hero.height=660*dpr;}
$('home').onclick=showHome;$('startBtn').onclick=async()=>{await activateAudio();const next=LEVELS.find(l=>!memory.clears[l.id]);enterLevel(next?.id||memory.lastStage||1);};$('sandboxBtn').onclick=async()=>{await activateAudio();enterLevel('free');};$('stagesBtn').onclick=showMap;$('mapBtn').onclick=showMap;
$('runBtn').onclick=launch;$('rewindBtn').onclick=rewind;$('undoBtn').onclick=undo;$('redoBtn').onclick=redo;$('hintBtn').onclick=showHint;$('exampleBtn').onclick=placeExample;
$('traceBtn').onclick=()=>{memory.settings.trace=!memory.settings.trace;persist();renderControls();};$('soundBtn').onclick=showSound;$('helpBtn').onclick=showHelp;$('creditsBtn').onclick=showCredits;$('albumBtn').onclick=showRecords;
$('readBtn').onclick=async()=>{await activateAudio();audio.say(isFree()?'sandbox':state.level?.id===1?'place':'goal');};$('saveBtn').onclick=showSave;$('loadBtn').onclick=showSlots;
$('themeSelect').onchange=e=>{state.theme=Number(e.target.value);state.level.chapter=state.theme;state.level.cat=['sharo','yuki','hotate'][state.theme];queueSave();};
$('fullscreenBtn').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else notify('端末を横向きにすると、大きくあそべるよ。');}catch{notify('端末を横向きにすると、大きくあそべるよ。');}};
document.addEventListener('visibilitychange',()=>{lastFrame=performance.now();if(document.hidden){finishDrag();saveDraft();audio.stopVoice();audio.stopMusic();}else if(state.screen==='game')audio.startMusic();});
window.addEventListener('pagehide',()=>{saveDraft();audio.stopVoice();audio.stopMusic();});window.addEventListener('resize',setResolution);
for(const eventName of ['pointerdown','keydown'])document.addEventListener(eventName,()=>{if(state.screen==='game'&&!audio.unlocked)void activateAudio();},{passive:true});
setResolution();updateHome();updateSoundButton();requestAnimationFrame(renderLoop);
