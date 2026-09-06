import {ITEMS, itemSVG, catSVG, heroSVG} from './art.mjs';
import {LEVELS, getLevel, CHAPTERS as SHOP_CHAPTERS} from './levels.mjs';
import {createGame, moveItem, tick, getHint, getCounts} from './engine.mjs';
import {AudioManager, VOICE_LINES} from './audio.mjs';

const $ = id => document.getElementById(id);
const STORAGE = 'neko-shelf-sort-v1';
const CHAPTERS = SHOP_CHAPTERS.map(chapter=>chapter.title);
const CATS = ['sharo','yuki','hotate','sharo'];
const escapeText = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const itemName = id => ITEMS[id]?.name || 'しなもの';
const fmt = t => `${Math.floor(Math.max(0,Math.ceil(t))/60)}:${String(Math.max(0,Math.ceil(t))%60).padStart(2,'0')}`;
let profile = {clears:{},seen:[],lastLevel:1,motion:false,guideSeen:false};
try {
  const data = JSON.parse(localStorage.getItem(STORAGE) || 'null');
  if (data && typeof data === 'object') {
    profile.lastLevel = Math.min(24,Math.max(1,Math.floor(Number(data.lastLevel)||1)));
    profile.motion = data.motion === true;
    profile.guideSeen = data.guideSeen === true;
    profile.seen = Array.isArray(data.seen) ? [...new Set(data.seen.filter(id=>Object.hasOwn(ITEMS,id)))] : [];
    for (let id=1;id<=24;id++) {
      const c=data.clears?.[id];
      if(c && Number.isInteger(c.stars) && c.stars>=1 && c.stars<=3) profile.clears[id]={stars:c.stars,bestTime:Math.max(0,Number(c.bestTime)||0),moves:Math.max(0,Number(c.moves)||0)};
    }
  }
} catch {}
const saveProfile=()=>{try{localStorage.setItem(STORAGE,JSON.stringify(profile));}catch{}};
document.body.classList.toggle('reduced-motion',profile.motion);
const audio = new AudioManager({onSubtitle:text=>{$('subtitle').textContent=text;}});
let state=null,level=null,screen='home',practice=false,selected=null,history=[],undoLeft=3,hintLeft=3;
let modalKind='',guideStep=0,mapPractice=false,seed=0,hintMove=null,warningSpoken=false,spaceWarningSpoken=false,pendingResult=false;
let lastVoice='welcome',lastSpokenAt=0,lastMatchAt=0,combo=0,toastTimer=0,hintTimer=0,modalTimer=0;
let drag=null,ghost=null,suppressClickUntil=0,lastTick=performance.now();
function say(id,force=false){
  const now=performance.now();
  if(!force && now-lastSpokenAt<4700) return;
  lastSpokenAt=now;lastVoice=id;audio.say(id);
}
async function activate(){await audio.unlock(); if(screen==='game'&&!$('modal').open&&state?.status==='playing')audio.startMusic();syncSoundButton();}
function syncSoundButton(){const b=$('soundBtn');b.innerHTML=`${audio.settings.muted?'♩':'♫'}<span>${audio.settings.muted?'おと OFF':'おと'}</span>`;b.setAttribute('aria-label',`音の設定${audio.settings.muted?'、現在すべてOFF':''}`);}
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,2600);}
function seenFront(){let changed=false;for(const s of state.shelves)for(const id of s.front)if(id&&!profile.seen.includes(id)){profile.seen.push(id);changed=true;}if(changed)saveProfile();}
function home(){
  pendingResult=false;closeModal(false);cancelDrag();clearTimeout(modalTimer);state=null;screen='home';audio.stopMusic();audio.stopVoice();
  $('homeScreen').hidden=false;$('gameScreen').hidden=true;
  document.body.classList.remove('playing');window.scrollTo(0,0);
  const count=Object.keys(profile.clears).length;
  $('homeProgress').textContent=count?`${count} / 24 の おみせが すっきり！`:'24のおみせが まっているよ';
  $('startBtn').innerHTML=`${count?'つづきの おみせへ':'おみせを ひらく'} <span>→</span>`;
}
function newSeed(){return (Date.now() ^ Math.floor(Math.random()*0x7fffffff))>>>0;}
async function startLevel(id,{free=false,sameSeed=false,guide=false}={}){
  pendingResult=false;closeModal(false);clearTimeout(modalTimer);cancelDrag();await activate();
  level=getLevel(id);practice=free;seed=sameSeed?seed:newSeed();
  try{state=createGame(level,seed);}catch(error){console.error(error);toast('おみせの準備を やりなおすね。');home();return;}
  selected=null;history=[];undoLeft=3;hintLeft=3;hintMove=null;warningSpoken=false;spaceWarningSpoken=false;combo=0;lastMatchAt=0;
  screen='game';$('homeScreen').hidden=true;$('gameScreen').hidden=false;
  document.body.classList.add('playing');window.scrollTo(0,0);
  $('chapterLabel').textContent=`${String(level.id).padStart(2,'0')} / ${CHAPTERS[level.chapter] || CHAPTERS[0]}`;
  $('stageTitle').textContent=level.title;$('guideCat').innerHTML=catSVG(CATS[level.chapter]||'sharo');
  $('gameScreen').dataset.chapter=String(level.chapter);
  $('modeLabel').textContent=practice?'じかんなしの れんしゅう':'おかたづけタイム';
  if(!practice){profile.lastLevel=id;saveProfile();}
  seenFront();renderBoard();renderHUD();lastTick=performance.now();audio.startMusic();
  if(guide || !profile.guideSeen){guideStep=0;showGuide();}
  else say(practice?'free':level.typeCount>=8?'colors':'start',true);
}
function renderHUD(){
  if(!state)return;const counts=getCounts(state);
  $('timerLabel').textContent=practice?'じかんは たっぷり':'のこりじかん';$('timer').textContent=practice?'∞':fmt(state.timeLeft);
  $('timerFill').style.width=practice?'100%':`${Math.max(0,Math.min(100,state.timeLeft/state.timeLimit*100))}%`;
  $('timerBox').classList.toggle('urgent',!practice&&state.timeLeft<=30);
  $('leftCount').textContent=`あと ${counts.remaining}こ`;$('emptyCount').textContent=`あき ${counts.empty}`;$('emptyCount').classList.toggle('danger',counts.empty<=2);
  $('moveCount').textContent=`${state.moves} て`;$('board').dataset.status=state.status;
  $('undoBtn').disabled=!history.length || (!practice&&undoLeft<=0);$('undoCount').textContent=practice?'∞':undoLeft;
  $('hintBtn').disabled=state.status!=='playing'||(!practice&&hintLeft<=0);$('hintCount').textContent=practice?'∞':hintLeft;
  $('pauseBtn').disabled=state.status!=='playing';
  $('selectionText').textContent=selected?`${itemName(state.shelves[selected.shelf].front[selected.slot])} → あいた ばしょを おしてね`:'しなものを おして、あいた ばしょへ。';
}
function renderBoard(events=[]){
  if(!state)return;const n=state.shelves.length;
  const focused=document.activeElement?.closest?.('.slot');
  const focusPosition=focused?{shelf:focused.dataset.shelf,slot:focused.dataset.slot}:null;
  $('board').className=`board${n>=8?' most':n>=5?' many':''}${selected?' has-selection':''}`;
  $('board').innerHTML=state.shelves.map((shelf,si)=>{
    const matched=events.some(e=>e.type==='match'&&e.shelf===si),revealed=events.some(e=>e.type==='reveal'&&e.shelf===si);
    const back=shelf.back.length;
    return `<section class="shelf${matched?' flash':''}${revealed?' revealed':''}" aria-label="たな ${si+1}" data-shelf="${si}"><div class="shelf-label"><span>たな ${String(si+1).padStart(2,'0')}</span><span class="back-count">${back?`おくに ${back}だん`:'おくは から'}</span></div><div class="back-row${back?'':' empty'}" aria-hidden="true"><span>?</span><span>?</span><span>?</span></div><div class="shelf-slots">${shelf.front.map((id,slot)=>{
      const sel=selected?.shelf===si&&selected?.slot===slot;
      const isFrom=hintMove?.fromShelf===si&&hintMove?.fromSlot===slot,isTo=hintMove?.toShelf===si&&hintMove?.toSlot===slot;
      return `<button class="slot ${id?'has-item':'empty'}${sel?' selected':''}${isFrom?' hint-from':''}${isTo?' hint-to':''}" data-shelf="${si}" data-slot="${slot}" ${id?`data-item="${id}"`:''} aria-label="たな${si+1}の${slot+1}ばん、${id?escapeText(itemName(id)):'あき'}" aria-pressed="${sel}" ${state.status==='playing'?'':'disabled'}>${id?itemSVG(id):''}</button>`;
    }).join('')}</div>${matched?'<div class="match-pop">3つ、すっきり！ ✧</div>':''}</section>`;
  }).join('');renderHUD();
  if(focusPosition)$('board').querySelector(`[data-shelf="${focusPosition.shelf}"][data-slot="${focusPosition.slot}"]`)?.focus({preventScroll:true});
}
function takeMove(from,to){
  if(!state||state.status!=='playing'||$('modal').open)return;
  const previous=state;const result=moveItem(state,from.shelf,from.slot,to.shelf,to.slot);
  if(!result.ok){toast('あいている ばしょに おこう。');return;}
  history.push(previous);if(history.length>60)history.shift();state=result.state;selected=null;hintMove=null;clearTimeout(hintTimer);
  const events=result.events||state.lastEvents||[];seenFront();renderBoard(events);
  const matches=events.filter(e=>e.type==='match').length,reveals=events.filter(e=>e.type==='reveal').length;
  if(matches){
    combo=performance.now()-lastMatchAt<6000?combo+matches:matches;lastMatchAt=performance.now();
    audio.sfx(combo>1?'combo':'match');
    if(combo>1){toast(`${combo} れんぞく！ すっきり！`);say('combo');}
    else say(state.cleared%2?'match1':'match2');
  }else audio.sfx('place');
  const counts=getCounts(state);
  if(reveals&&!matches){audio.sfx('reveal');say('reveal');}
  if(counts.remaining>0&&counts.remaining<=6&&matches)say('last');
  if(counts.empty<=2&&!spaceWarningSpoken&&state.status==='playing'){spaceWarningSpoken=true;say('fewSpaces',true);}
  if(counts.empty>3)spaceWarningSpoken=false;
  if(state.status!=='playing')finish();
}
function selectSlot(button){
  if(!state||state.status!=='playing'||$('modal').open)return;
  const shelf=Number(button.dataset.shelf),slot=Number(button.dataset.slot),id=state.shelves[shelf].front[slot];
  if(id){selected=selected?.shelf===shelf&&selected?.slot===slot?null:{shelf,slot};audio.sfx('select');renderBoard();}
  else if(selected)takeMove(selected,{shelf,slot});
  else toast('さきに、うごかす しなものを おしてね。');
}
$('board').addEventListener('click',e=>{if(performance.now()<suppressClickUntil)return;const b=e.target.closest('.slot');if(b)selectSlot(b);});
$('board').addEventListener('pointerdown',e=>{
  if(drag||!state||state.status!=='playing'||$('modal').open||e.button!==0)return;
  const b=e.target.closest('.slot.has-item');if(!b)return;
  drag={pointerId:e.pointerId,x:e.clientX,y:e.clientY,from:{shelf:Number(b.dataset.shelf),slot:Number(b.dataset.slot)},id:b.dataset.item,active:false};
});
$('board').addEventListener('pointermove',e=>{
  if(!drag||drag.pointerId!==e.pointerId)return;
  if(!drag.active&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>7){
    drag.active=true;$('board').setPointerCapture(e.pointerId);selected=null;
    ghost=document.createElement('div');ghost.className='drag-ghost';ghost.innerHTML=itemSVG(drag.id);document.body.append(ghost);
    $('board').classList.add('has-selection');$('board').querySelector(`[data-shelf="${drag.from.shelf}"][data-slot="${drag.from.slot}"]`)?.classList.add('drag-source');
  }
  if(drag.active){e.preventDefault();ghost.style.left=`${e.clientX-37}px`;ghost.style.top=`${e.clientY-42}px`;
    $('board').querySelectorAll('.drop-target').forEach(b=>b.classList.remove('drop-target'));
    const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('.slot.empty');target?.classList.add('drop-target');
  }
});
$('board').addEventListener('pointerup',e=>{
  if(!drag||drag.pointerId!==e.pointerId)return;const d=drag;
  if(d.active){const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('.slot.empty');suppressClickUntil=performance.now()+400;cancelDrag();if(target)takeMove(d.from,{shelf:Number(target.dataset.shelf),slot:Number(target.dataset.slot)});else renderBoard();}
  else drag=null;
});
$('board').addEventListener('pointercancel',cancelDrag);
window.addEventListener('pointerup',e=>{if(drag?.pointerId===e.pointerId)cancelDrag();});
window.addEventListener('pointercancel',cancelDrag);window.addEventListener('blur',cancelDrag);
function cancelDrag(){if(drag&&$('board').hasPointerCapture?.(drag.pointerId))$('board').releasePointerCapture(drag.pointerId);drag=null;ghost?.remove();ghost=null;$('board').querySelectorAll('.drag-source,.drop-target').forEach(b=>b.classList.remove('drag-source','drop-target'));$('board').classList.toggle('has-selection',!!selected);}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('modal').open&&selected){selected=null;renderBoard();}});
function undo(){
  if(!state||!history.length||(!practice&&undoLeft<=0))return;
  const time=state.timeLeft;if(!practice&&time<=0){toast('じかんぎれだよ。もういちど あそぼう。');return;}
  pendingResult=false;closeModal(false);clearTimeout(modalTimer);cancelDrag();
  state={...history.pop(),timeLeft:time,status:'playing',reason:null,lastEvents:[]};
  if(!practice)undoLeft--;selected=null;hintMove=null;combo=0;renderBoard();audio.startMusic();audio.sfx('undo');say('undo',true);lastTick=performance.now();
}
function hint(){
  if(!state||state.status!=='playing'||(!practice&&hintLeft<=0))return;
  const h=getHint(state);
  if(!h){toast(history.length?'この配置は むずかしいね。「1て もどす」で ためそう。':'おなじものを たなに3つ あつめよう。');return;}
  hintMove=h;selected=null;if(!practice)hintLeft--;renderBoard();
  const id=state.shelves[h.fromShelf].front[h.fromSlot];
  say('hint',true);toast(`${itemName(id)}を たな${h.toShelf+1}の あきへ。`);
  clearTimeout(hintTimer);hintTimer=setTimeout(()=>{hintMove=null;if(state?.status==='playing')renderBoard();},6500);
}
function finish(){
  cancelDrag();audio.stopMusic();const won=state.status==='won';
  if(won&&!practice){
    const ratio=state.timeLeft/state.timeLimit,stars=ratio>=.45?3:ratio>=.18?2:1;const old=profile.clears[level.id];
    profile.clears[level.id]={stars:Math.max(old?.stars||0,stars),bestTime:Math.max(old?.bestTime||0,state.timeLeft),moves:old?.moves?Math.min(old.moves,state.moves):state.moves};
    profile.lastLevel=Math.min(24,level.id+1);saveProfile();
  }
  say(won?(Object.keys(profile.clears).length===24&&!practice?'allclear':'win'):state.reason==='time'?'loseTime':'loseSpace',true);
  audio.sfx(won?'win':'retry');if(won)confetti();
  const finishedState=state;clearTimeout(modalTimer);modalTimer=setTimeout(()=>{if(state===finishedState&&state.status!=='playing'){if($('modal').open)pendingResult=true;else showResult();}},won?750:150);
}
function confetti(){
  if(profile.motion||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  $('celebration').innerHTML=Array.from({length:36},(_,i)=>`<i class="confetti" style="left:${Math.random()*100}%;top:-20px;background:${['#d49a66','#82aa94','#e7b5a2','#e3ca76'][i%4]};animation-delay:${Math.random()*.35}s"></i>`).join('');
  setTimeout(()=>$('celebration').replaceChildren(),2400);
}
function openModal(html,kind){
  cancelDrag();modalKind=kind;audio.stopMusic();$('modalContent').innerHTML=html;$('closeModal').hidden=kind==='result';if(!$('modal').open)$('modal').showModal();
}
function closeModal(resume=true){
  const was=modalKind;modalKind='';if($('modal').open)$('modal').close();$('closeModal').hidden=false;audio.stopVoice();
  if(was==='guide'){profile.guideSeen=true;saveProfile();}
  lastTick=performance.now();
  if(resume&&pendingResult&&state&&state.status!=='playing'){pendingResult=false;showResult();return;}
  if(resume&&screen==='game'&&state?.status==='playing'){audio.startMusic();if(was==='guide')say(practice?'free':'start',true);}
}
$('closeModal').onclick=()=>closeModal();$('modal').addEventListener('cancel',e=>{e.preventDefault();if(modalKind!=='result')closeModal();});
function showResult(){
  const won=state.status==='won',time=state.timeLimit-state.timeLeft;
  const stars=practice?0:state.timeLeft/state.timeLimit>=.45?3:state.timeLeft/state.timeLimit>=.18?2:1;
  openModal(`<div class="result"><div class="result-art">${catSVG(CATS[level.chapter]||'sharo',won?'happy':'calm')}</div><div class="modal-kicker">${won?'ALL TIDY!':'LET’S TRY AGAIN'}</div>${won&&!practice?`<div class="result-stars" aria-label="星${stars}個">${'★'.repeat(stars)}${'☆'.repeat(3-stars)}</div>`:''}<h2 class="modal-title">${won?'すっきり！ ありがとう！':state.reason==='time'?'じかんに なったよ':'あきが なくなっちゃった'}</h2><p class="modal-note">${won?'ネコたちの おみせが、きれいに なったよ。':state.reason==='time'?'つぎは もっと うまく できるかも。<br>「じかんなし」で れんしゅうも できるよ。':'品物を そろえるために、あきが 必要だよ。<br>少し もどして、ならべかたを かえてみよう。'}</p>${won?`<div class="result-stats"><span><small>おかたづけ</small><b>${state.totalItems}こ</b></span><span><small>${practice?'うごかした回数':'かかったじかん'}</small><b>${practice?state.moves+'て':fmt(time)}</b></span></div>`:''}<div class="modal-actions">${won&&level.id<24?'<button class="primary" id="resultNext">つぎの おみせへ →</button>':`<button class="primary" id="resultRetry">もういちど あそぶ</button>`}${!won&&state.reason==='space'&&history.length&&(practice||undoLeft>0)?'<button class="outline" id="resultUndo">1て もどして つづける</button>':!won&&!practice?'<button class="outline" id="resultPractice">じかんなしで れんしゅう</button>':'<button class="outline" id="resultMap">おみせを えらぶ</button>'}</div><button class="text-button" id="resultHome" style="margin-top:15px">ホームへ もどる</button></div>`,'result');
  $('resultNext')?.addEventListener('click',()=>startLevel(level.id+1,{free:practice}));$('resultRetry')?.addEventListener('click',()=>startLevel(level.id,{free:practice,sameSeed:!won}));$('resultUndo')?.addEventListener('click',undo);$('resultPractice')?.addEventListener('click',()=>startLevel(level.id,{free:true,sameSeed:true}));$('resultMap')?.addEventListener('click',()=>showMap(practice));$('resultHome').onclick=home;
}
function showGuide(){
  const guides=[
    {id:'guide1',title:'おなじ たなに、3つ。',text:'おなじ しなものを、おなじ たなに 3つ。<br>そろうと、ぱっと 消えるよ。',visual:`<span>${itemSVG('drink-strawberry')}</span><span>${itemSVG('drink-strawberry')}</span><span>${itemSVG('drink-strawberry')}</span><b>✧</b>`},
    {id:'guide2',title:'あいている ばしょへ。',text:'しなものを おして、あきを おそう。<br>ゆびで つかんで、うごかしても OK。',visual:`<span>${itemSVG('plush-bear-brown')}</span><b>→</b><span style="border:2px dashed #8fab93;border-radius:12px;aspect-ratio:1;display:grid;place-items:center;font-size:26px;color:#8fab93">+</span>`},
    {id:'guide3',title:'おくには、なにが あるかな？',text:'てまえが 全部 なくなると、<br>おくの しなものが 前に 出てくるよ。',visual:`<span style="background:#e2d5bd;border-radius:10px;padding:15px;text-align:center;font-size:30px">?</span><b>→</b><span>${itemSVG('flower-pink')}</span>`},
    {id:'guide4',title:'あきと じかんを、大切に。',text:'あきが なくなるか、じかんぎれで おしまい。<br>色ちがいは、べつの しなものだよ。<br>れんしゅうでは、じかんは へらないよ。',visual:`<span>${itemSVG('toy-red-car')}</span><b>≠</b><span>${itemSVG('toy-blue-car')}</span>`}
  ];const g=guides[guideStep];
  openModal(`<div class="modal-kicker">HOW TO PLAY / ${guideStep+1} OF 4</div><h2 class="modal-title">${g.title}</h2><div class="guide-visual">${g.visual}</div><p class="guide-copy">${g.text}</p><div class="guide-progress">${guides.map((_,i)=>`<i class="${i===guideStep?'active':''}"></i>`).join('')}</div><div class="modal-actions">${guideStep?'<button class="outline" id="guideBack">もどる</button>':''}<button class="primary" id="guideNext">${guideStep===3?'わかった！ はじめよう':'つぎへ →'}</button></div><p class="settings-credit" style="text-align:center">音声：VOICEVOX:ずんだもん</p>`,'guide');
  $('guideBack')?.addEventListener('click',()=>{guideStep--;showGuide();});$('guideNext').onclick=()=>{if(guideStep<3){guideStep++;showGuide();}else closeModal();};say(g.id,true);
}
function showMap(free=practice){
  mapPractice=free;openModal(`<div class="modal-kicker">24 LITTLE SHOPS</div><h2 class="modal-title">どのおみせを、きれいにする？</h2><p class="modal-note">すきな ステージから あそべるよ。<br>後半は しゅるいや 色ちがいが ふえるよ。</p><div class="stage-switch"><button id="mapTimed" class="${!free?'active':''}">◷ じかんに ちょうせん</button><button id="mapPractice" class="${free?'active':''}">☀ じかんなし</button></div>${CHAPTERS.map((name,c)=>`<h3 class="chapter-name">${['☀','♧','❀','✧'][c]} ${name}</h3><div class="stage-grid">${LEVELS.filter(l=>l.chapter===c).map(l=>`<button class="stage-tile${profile.clears[l.id]?' cleared':''}" data-level="${l.id}" aria-label="ステージ${l.id} ${escapeText(l.title)}、${l.typeCount}しゅるい、星${profile.clears[l.id]?.stars||0}個"><strong>${String(l.id).padStart(2,'0')}</strong><span>${profile.clears[l.id]?'★'.repeat(profile.clears[l.id].stars)+'☆'.repeat(3-profile.clears[l.id].stars):l.typeCount+'しゅるい'}</span></button>`).join('')}</div>`).join('')}`,'map');
  $('mapTimed').onclick=()=>showMap(false);$('mapPractice').onclick=()=>showMap(true);$('modalContent').querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>startLevel(Number(b.dataset.level),{free:mapPractice}));
}
function showSettings(){
  const s=audio.settings;openModal(`<div class="modal-kicker">SOUND & COMFORT</div><h2 class="modal-title">おとの せってい</h2><p class="modal-note">音なしでも、文字の あんないで あそべるよ。</p><label class="settings-row"><span>すべての音を OFF</span><input id="muteToggle" type="checkbox" ${s.muted?'checked':''}></label>${[['voice','ずんだもんの声'],['music','BGM'],['sfx','こうかおん']].map(([key,name])=>`<label class="settings-row"><span>${name}</span><input type="range" min="0" max="100" value="${Math.round(s[key]*100)}" aria-label="${name}" data-volume="${key}"><output>${Math.round(s[key]*100)}%</output></label>`).join('')}<label class="settings-row"><span>かざりの動きを ひかえる</span><input type="checkbox" id="motionToggle" ${profile.motion?'checked':''}></label><div class="modal-actions"><button class="outline" id="testVoice">♫ 声を きいてみる</button><button class="primary" id="settingsDone">できた</button></div><p class="settings-credit">音声：VOICEVOX:ずんだもん<br>設定は、このブラウザに保存されます。</p>`,'settings');
  $('muteToggle').onchange=e=>{audio.setSettings({muted:e.target.checked});syncSoundButton();};
  $('modalContent').querySelectorAll('[data-volume]').forEach(input=>input.oninput=()=>{audio.setSettings({[input.dataset.volume]:Number(input.value)/100});input.nextElementSibling.textContent=`${input.value}%`;});
  $('motionToggle').onchange=e=>{profile.motion=e.target.checked;document.body.classList.toggle('reduced-motion',profile.motion);saveProfile();};
  $('testVoice').onclick=async()=>{await activate();say('welcome',true);};$('settingsDone').onclick=()=>closeModal();
}
function showCollection(){
  const entries=Object.entries(ITEMS);openModal(`<div class="modal-kicker">LITTLE THINGS COLLECTION</div><h2 class="modal-title">こもの ずかん</h2><p class="modal-note">おみせで 見つけた しなもの。<br>いままでに ${profile.seen.length} / ${entries.length} しゅるいを 見つけたよ。</p><div class="collection-grid">${entries.map(([id,item])=>`<div class="collection-item${profile.seen.includes(id)?'':' unseen'}">${itemSVG(id)}<span>${profile.seen.includes(id)?escapeText(item.name):'まだ みつけてない'}</span></div>`).join('')}</div><p class="empty-guide">色ちがいや もようちがいは、べつの しなものだよ。</p>`,'collection');
}
function showPause(){
  if(screen!=='game'||state?.status!=='playing')return;
  openModal('<div class="modal-kicker">TAKE A LITTLE BREAK</div><h2 class="modal-title">ちょっと、ひとやすみ。</h2><p class="modal-note">じかんは 止まっているよ。<br>じゅんびが できたら、つづけよう。</p><div class="modal-actions"><button class="primary" id="resumeBtn">つづける →</button><button class="outline" id="pauseHome">ホームへ</button></div>','pause');
  $('resumeBtn').onclick=()=>{closeModal();say('resume',true);};$('pauseHome').onclick=home;say('pause',true);
}
function confirmRetry(){
  openModal('<div class="modal-kicker">FRESH START</div><h2 class="modal-title">はじめから、やってみる？</h2><p class="modal-note">おなじ ならびかたで、もういちど あそべるよ。</p><div class="modal-actions"><button id="confirmRetry" class="primary">はじめから</button><button id="cancelRetry" class="outline">このまま つづける</button></div>','retry');
  $('confirmRetry').onclick=()=>startLevel(level.id,{free:practice,sameSeed:true});$('cancelRetry').onclick=()=>closeModal();
}
function showCredits(){openModal(`<div class="modal-kicker">ABOUT THIS GAME</div><h2 class="modal-title">にゃんこ棚のおかたづけ</h2><p class="modal-note">シャロ（茶トラ）、ゆき（黒）、ほたて（白）の小さなお店で遊ぶ、棚の並べ替えパズルです。全24ステージ。6歳ごろから、ご家族でもどうぞ。</p><p class="settings-credit">企画・公開：山岸産業医事務所<br>音声：VOICEVOX:ずんだもん<br>描画・音楽・効果音：このゲーム用のオリジナル制作<br><br>進捗・図鑑・設定はこのブラウザ内に保存されます。ブラウザのデータを消すと記録も消えます。登録やVOICEVOXの起動は不要です。練習のクリアは挑戦モードの星には含まれません。</p><p class="settings-credit"><a href="https://voicevox.hiroshiba.jp/term/" target="_blank" rel="noopener">VOICEVOX 利用規約</a> · <a href="https://zunko.jp/con_ongen_kiyaku.html" target="_blank" rel="noopener">ずんだもん 音声利用規約</a></p>`,'credits');}

$('heroArt').innerHTML=heroSVG();syncSoundButton();home();
$('startBtn').onclick=()=>startLevel(profile.lastLevel);
$('practiceBtn').onclick=async()=>{await activate();showMap(true);};$('stageSelectBtn').onclick=()=>showMap(false);$('mapBtn').onclick=()=>showMap(practice);
$('homeBtn').onclick=()=>{if(screen==='game'&&state?.status==='playing')showPause();else home();};
$('soundBtn').onclick=async()=>{await activate();showSettings();};$('helpBtn').onclick=async()=>{await activate();guideStep=0;showGuide();};$('collectionBtn').onclick=showCollection;$('creditsBtn').onclick=showCredits;
$('undoBtn').onclick=undo;$('hintBtn').onclick=hint;$('pauseBtn').onclick=showPause;$('retryBtn').onclick=confirmRetry;$('repeatBtn').onclick=async()=>{await activate();say(lastVoice,true);};
document.addEventListener('visibilitychange',()=>{lastTick=performance.now();if(document.hidden&&screen==='game'&&state?.status==='playing'&&!$('modal').open)showPause();});
document.addEventListener('pointerdown',()=>{if(!audio.unlocked)activate();},{passive:true});
document.addEventListener('keydown',()=>{if(!audio.unlocked)activate();},{passive:true});
setInterval(()=>{
  const now=performance.now(),dt=(now-lastTick)/1000;lastTick=now;
  if(screen!=='game'||!state||state.status!=='playing'||practice||$('modal').open||document.hidden)return;
  state=tick(state,dt);renderHUD();
  if(state.timeLeft<=30&&!warningSpoken&&state.status==='playing'){warningSpoken=true;audio.sfx('warning');say('timeWarning',true);}
  if(state.status==='lost'){renderBoard();finish();}
},160);
