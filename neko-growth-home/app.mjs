import { createGame, move, adopt, canAdopt, isStuck, validateState, FEVER_MAX } from './engine.mjs';
import { CATS, catSVG, roomSVG, FURNITURE } from './art.mjs';
import { GameAudio } from './audio.mjs';

const $ = id => document.getElementById(id);
const KEY = 'neko-growth-home:v1';
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const audio = new GameAudio();
const normalLast = () => ({ type:'start', merges:[], spawned:null, translations:[] });
const cleanState = value => ({...value,last:normalLast()});
let state = createGame();
let previous = null;
let best = 0;
let sound = true;
let started = false;
let firstVisit = true;
let selected = null;
let inputLocked = false;
let storageOkay = true;
let roomSignature = '';
let petTimer;
let lastFocus;
let animationTimer;
let focusAfterRender = null;
let pointer = null;
let lastSwipeAt = 0;
let saveNotice = '';
let staleTab = false;

try {
  const raw = localStorage.getItem(KEY);
  if(raw) {
    const data = JSON.parse(raw);
    if(data && validateState(data.state)) {
      state = cleanState(data.state);
      previous = validateState(data.previous) ? cleanState(data.previous) : null;
      best = Number.isSafeInteger(data.best) && data.best >= 0 ? Math.max(data.best,state.score) : state.score;
      sound = data.sound !== false;
      firstVisit = false;
    } else saveNotice = 'ほぞんした パズルを よめなかったので、あたらしく はじめるよ。';
  }
} catch { storageOkay = false; }
audio.setEnabled(sound);

function save() {
  if(staleTab)return;
  try {
    localStorage.setItem(KEY,JSON.stringify({state:cleanState(state),previous:previous ? cleanState(previous) : null,best,sound}));
    storageOkay = true;
  } catch { storageOkay = false; }
  $('saveStatus').textContent = storageOkay ? '● つづきは じどうで ほぞん' : 'ほぞんできません（いまは あそべます）';
  $('saveStatus').classList.toggle('save-warning',!storageOkay);
}

function say(text) { $('announcement').textContent = text; }
function nameOf(level) { return level === -1 ? 'おたすけねずみ' : CATS[level].name; }
function play(name,level=1) { if(started) audio.play(name,level); }
function unlockAudio() { audio.unlock(); if(sound) audio.startMusic(); }
function renderSound() {
  $('soundBtn').innerHTML = `<span aria-hidden="true">${sound?'♫':'♪'}</span><small>おと ${sound?'ON':'OFF'}</small>`;
  $('soundBtn').setAttribute('aria-label',sound?'音を消す':'音を出す');
  $('soundBtn').setAttribute('aria-pressed',String(sound));
}
function toggleSound() {
  sound=!sound;audio.setEnabled(sound);renderSound();save();
  if(started&&sound){unlockAudio();play('button');}
}

function render(animate=false) {
  const eligible=canAdopt(state);
  if(!eligible.includes(selected)) selected=eligible.length===1?eligible[0]:null;
  const merged=new Map((state.last?.merges||[]).map(m=>[m.index,m]));
  const oldFocus = document.activeElement?.dataset?.index;
  $('board').innerHTML=state.board.map((level,index)=>{
    const cat=level>0?CATS[level]:null;
    const classes=['cell',level?'filled':'empty',eligible.includes(index)?'home-ready':'',selected===index?'chosen':'',animate&&merged.has(index)?'merged':'',animate&&state.last?.spawned===index?'spawned':''].filter(Boolean).join(' ');
    const label=`${Math.floor(index/4)+1}行${index%4+1}列、${level?nameOf(level):'空き'}${eligible.includes(index)?'、おひっこしできます':''}`;
    return `<button class="${classes}" data-index="${index}" data-level="${level}" aria-label="${label}" style="--tile:${cat?.color||'#dce6e7'}" ${level?'':'tabindex="-1"'}>${level?`${catSVG(level)}<span class="level-label">${level>0?level:'★'}</span><span class="cat-label">${level>0?(cat.short||cat.name):'おたすけ'}</span>`:''}</button>`;
  }).join('');
  $('board').dataset.moves=String(state.moves);
  $('board').dataset.adoptions=String(state.adoptions);
  $('board').dataset.fever=String(state.fever);
  $('board').dataset.status=isStuck(state)?'stuck':'playing';
  $('score').textContent=state.score.toLocaleString('ja-JP');
  $('best').textContent=best.toLocaleString('ja-JP');
  $('requestCat').innerHTML=catSVG(state.requestLevel);
  $('requestText').textContent=`「${nameOf(state.requestLevel)}」に あいたいな`;
  $('requestHint').textContent=eligible.length>1?'おひっこしする ネコを えらべるよ':eligible.length?'おひっこしすると、あきマスが できるよ':'おなじネコを あわせて そだてよう';
  document.querySelector('.mission').classList.toggle('ready',eligible.length>0);
  $('adoptBtn').disabled=!eligible.length;
  $('adoptBtn').innerHTML=`${eligible.length?'おひっこし':'そだてよう'} <span aria-hidden="true">→</span>`;
  $('adoptBtn').setAttribute('aria-label',eligible.length?`${nameOf(state.requestLevel)}を おひっこしさせる`:`${nameOf(state.requestLevel)}を そだてよう`);
  $('feverPanel').classList.toggle('ready',state.fever===FEVER_MAX);
  $('feverCount').textContent=`${state.fever} / ${FEVER_MAX}`;
  $('feverTitle').textContent=state.fever===FEVER_MAX?'フィーバー！ つぎは 2だん しんか':'おさかなフィーバー';
  $('feverFill').style.width=`${state.fever/FEVER_MAX*100}%`;
  document.querySelector('.fever-track').setAttribute('aria-valuenow',String(state.fever));
  $('feverHint').textContent=state.fever===FEVER_MAX?'つぎの がったいが チャンス！ じかんは きにしないでね。':'6かい がったいすると、つぎは 2だん しんか！';
  $('undoBtn').disabled=!previous;
  $('introHint').hidden=state.moves>1||state.adoptions>0;
  renderRoom();renderTrail();renderSound();
  if(focusAfterRender!==null){document.querySelector(`[data-index="${focusAfterRender}"]`)?.focus({preventScroll:true});focusAfterRender=null;}
  else if(oldFocus!==undefined&&oldFocus!==null) document.querySelector(`[data-index="${oldFocus}"]`)?.focus({preventScroll:true});
  if(animate){clearTimeout(animationTimer);animationTimer=setTimeout(()=>document.querySelectorAll('.merged,.spawned').forEach(e=>e.classList.remove('merged','spawned')),430);}
}

function renderRoom() {
  $('residentCount').textContent=state.adoptions.toLocaleString('ja-JP');
  $('emptyHome').hidden=state.adoptions>0;
  const sig=state.residents.join(',');
  if(sig!==roomSignature){
    roomSignature=sig;
    $('roomArt').innerHTML=roomSVG(state.adoptions);
    const positions=[[24,79],[49,86],[76,79],[35,96],[64,95],[16,96],[84,96],[55,71],[13,70],[87,69]];
    const residents=state.residents.flatMap((count,level)=>count?[{level,count}]:[]);
    $('roomCats').innerHTML=residents.map(({level,count},i)=>`<button class="room-cat" data-pet="${level}" aria-label="${nameOf(level)}を なでる、おうちに${count}ひき" style="left:${positions[i][0]}%;top:${positions[i][1]}%;z-index:${Math.round(positions[i][1])}">${catSVG(level,i%3===1?'sleep':'sit')}${count>1?`<span class="mini-count">×${count}</span>`:''}</button>`).join('');
  }
  $('homeCaption').textContent=state.adoptions?'ネコを タッチすると、よろこぶよ。':'おひっこしすると、ここで くらしはじめるよ。';
  const next=FURNITURE.find(f=>f.at>state.adoptions);
  const prev=FURNITURE.filter(f=>f.at<=state.adoptions).at(-1)?.at||0;
  $('furnitureName').textContent=next?next.name:'すてきな おうちが できたね！';
  $('furnitureCount').textContent=next?`あと ${next.at-state.adoptions}ひき`:'ぜんぶ あつまった！';
  $('furnitureFill').style.width=next?`${(state.adoptions-prev)/(next.at-prev)*100}%`:'100%';
}
function renderTrail(){
  $('catTrail').innerHTML=CATS.slice(1).map((cat,i)=>{
    const level=i+1,found=state.discovered.includes(level);
    return `<button class="trail-cat ${found?'':'locked'}" data-book="${level}" aria-label="${found?cat.name:'まだ見つけていないネコ'}、レベル${level}">${catSVG(level)}${found?'':'<span class="unknown">?</span>'}<small>${level}</small></button>`;
  }).join('');
}

function particlesAt(element, symbols=['✦','♥','✧']) {
  if(reduced.matches||!element)return;
  const rect=element.getBoundingClientRect();
  for(let i=0;i<15;i++){
    const p=document.createElement('span');p.className='particle';p.textContent=symbols[i%symbols.length];
    p.style.cssText=`--x:${rect.left+rect.width/2}px;--y:${rect.top+rect.height/2}px;--s:${12+Math.random()*13}px;--dx:${(Math.random()-.5)*230}px;--dy:${-50-Math.random()*170}px;--rot:${(Math.random()-.5)*90}deg;color:${['#dc8c77','#dbb85b','#8ba581'][i%3]}`;
    $('particles').append(p);setTimeout(()=>p.remove(),1550);
  }
}
function moveFeedback(before){
  const merges=state.last.merges;
  const boosted=merges.some(m=>m.fever);
  const fresh=state.discovered.filter(l=>!before.discovered.includes(l));
  if(boosted){play('fever');particlesAt($('board'),['★','✦','🐟']);say('フィーバー！ いっきに 2だん しんかしたよ！');}
  else if(fresh.length){const level=Math.max(...fresh);play('merge',level);say(`はじめまして！ 「${nameOf(level)}」が うまれたよ。`);particlesAt(document.querySelector(`[data-level="${level}"]`));}
  else if(merges.length){play('merge',merges[0].level);say(merges.length>1?`${merges.length}くみ いっしょに がったい！`:`${nameOf(merges[0].level)}に しんか！`);}
  else play('move');
  if(before.fever<FEVER_MAX&&state.fever===FEVER_MAX){say('おさかな まんたん！ つぎの がったいは 2だん しんか！');play('fever');}
  else if(!boosted&&canAdopt(state).length&&!canAdopt(before).length) say(`${nameOf(state.requestLevel)}が できた！ 「おひっこし」で おうちへ。`);
  if(state.board[state.last.spawned]===-1) say('おたすけねずみ！ どのネコとも がったいできるよ。');
}
function doMove(direction){
  if(!started||$('modal').open||inputLocked||staleTab)return;
  unlockAudio();
  const next=move(state,direction);
  if(next===state){$('board').classList.remove('shake');void $('board').offsetWidth;$('board').classList.add('shake');setTimeout(()=>$('board').classList.remove('shake'),220);return;}
  previous=cleanState(state);const before=state;state=next;best=Math.max(best,state.score);selected=null;
  const ghosts=[];
  if(!reduced.matches)for(const motion of state.last.translations||[]){
    if(motion.from===motion.to)continue;
    const from=document.querySelector(`[data-index="${motion.from}"]`),to=document.querySelector(`[data-index="${motion.to}"]`);
    const fr=from.getBoundingClientRect(),tr=to.getBoundingClientRect(),br=$('board').getBoundingClientRect();
    const clone=from.cloneNode(true);clone.removeAttribute('data-index');clone.removeAttribute('data-level');clone.removeAttribute('aria-label');clone.setAttribute('aria-hidden','true');clone.tabIndex=-1;
    clone.className='cell filled slide-cat';clone.style.cssText+=`;left:${fr.left-br.left}px;top:${fr.top-br.top}px;width:${fr.width}px;height:${fr.height}px;--mx:${tr.left-fr.left}px;--my:${tr.top-fr.top}px`;
    ghosts.push({clone,index:motion.to});
  }
  inputLocked=true;
  render(true);
  if(ghosts.length){
    const destinations=new Set(ghosts.map(g=>g.index));
    if(state.last.spawned!==null)destinations.add(state.last.spawned);
    for(const i of destinations)document.querySelector(`[data-index="${i}"]`)?.classList.add('arriving');
    for(const {clone} of ghosts)$('board').append(clone);
    requestAnimationFrame(()=>requestAnimationFrame(()=>ghosts.forEach(({clone})=>clone.classList.add('go'))));
    setTimeout(()=>{ghosts.forEach(({clone})=>clone.remove());document.querySelectorAll('.arriving').forEach(e=>e.classList.remove('arriving'));inputLocked=false;},180);
  } else setTimeout(()=>{inputLocked=false;},130);
  save();moveFeedback(before);
  if(isStuck(state))setTimeout(()=>{if(isStuck(state)&&!$('modal').open)showStuck();},420);
}
function doAdopt(index){
  if(!started||inputLocked||staleTab)return;
  const next=adopt(state,index);if(next===state)return;
  const old=state;const level=state.board[index];
  const source=document.querySelector(`[data-index="${index}"]`);
  const rect=source?.getBoundingClientRect();
  previous=cleanState(state);state=next;selected=null;inputLocked=true;
  play('adopt',level);render();save();
  say(`${nameOf(level)}、いらっしゃい！ おうちの なかで なでてみよう。`);
  particlesAt($('requestCat'));
  if(rect&&!reduced.matches){
    const ghost=document.createElement('div');ghost.className='adopt-ghost';ghost.innerHTML=catSVG(level,'happy');ghost.style.left=`${rect.left}px`;ghost.style.top=`${rect.top}px`;$('particles').append(ghost);
    const target=$('room').getBoundingClientRect();
    requestAnimationFrame(()=>requestAnimationFrame(()=>{ghost.style.transform=`translate(${target.left+target.width/2-rect.left}px,${Math.min(target.top+target.height*.7,innerHeight-60)-rect.top}px) scale(.65)`;ghost.style.opacity='0';}));
    setTimeout(()=>ghost.remove(),800);
  }
  setTimeout(()=>{inputLocked=false;},400);
  const furniture=FURNITURE.find(f=>old.adoptions<f.at&&state.adoptions>=f.at);
  if(furniture)setTimeout(()=>{if(state.adoptions>=furniture.at&&!$('modal').open)showMilestone(furniture,level);},750);
}
function adoptButton(){
  const possible=canAdopt(state);
  if(!possible.length)return;
  if(selected!==null)doAdopt(selected);
  else if(possible.length===1)doAdopt(possible[0]);
  else {say('おひっこししたい ネコを 1ぴき タッチしてね。');possible.forEach(i=>document.querySelector(`[data-index="${i}"]`)?.classList.add('merged'));$('board').scrollIntoView({block:'nearest',behavior:reduced.matches?'instant':'smooth'});}
}
function undo(){
  if(!previous||inputLocked||staleTab)return;
  state=previous;previous=null;selected=null;render();save();play('button');say('1て もどしたよ。ほかの うごかしかたも ためしてみよう。');
}
function pet(level,button){
  if(!started)return;unlockAudio();play('pet',level);button.classList.remove('petted');void button.offsetWidth;button.classList.add('petted');particlesAt(button,['♥','♡','♪']);
  const phrases=['にゃー。なでてくれて ありがとう。','ごろごろ…… ここ、すき。','いっしょに あそぼう！','ぽかぽか。ねむくなっちゃった。','きょうも あえて うれしいな。'];
  $('petBubble').textContent=phrases[Math.floor(Math.random()*phrases.length)];$('petBubble').classList.add('show');clearTimeout(petTimer);petTimer=setTimeout(()=>$('petBubble').classList.remove('show'),2400);
}

function showDialog(content,{closable=true}={}){
  if(!$('modal').open)lastFocus=document.activeElement;
  $('modalContent').innerHTML=content;$('closeModal').hidden=!closable;
  if(!$('modal').open)$('modal').showModal();
  const first=$('modalContent').querySelector('button,input');if(first)first.focus({preventScroll:true});
}
function closeDialog(){
  if(!started||staleTab)return;
  $('modal').close();if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});
}
function welcome(){
  showDialog(`<div class="welcome-cats" aria-hidden="true">${catSVG(2)}${catSVG(5,'happy')}${catSVG(3)}</div><div class="eyebrow" style="text-align:center">ネコ成長パズル 2</div><h2 id="modalTitle">ひみつのネコのおうち</h2><p class="sub">あわせて、そだてて、おひっこし。<br>ちいさなネコたちと、おうちを つくろう。</p>${firstVisit?`<div class="how-steps"><div class="how-step"><div class="how-icon">↔</div><div><b>ゆびで スーッと、がったい！</b><p>おなじネコを あわせると、しんかするよ。</p></div></div><div class="how-step"><div class="how-icon">⌂</div><div><b>おねがいのネコが できたら おひっこし</b><p>おうちに なかまが ふえて、パズルも ひろびろ。</p></div></div></div>`:`<p class="sub">おかえりなさい。<br>おうちの ${state.adoptions}ひきが まっているよ。</p>`}<label class="sound-choice"><input id="startSound" type="checkbox" ${sound?'checked':''}>おんがくと おとを だす</label><button class="primary" id="startBtn">${firstVisit?'あそびに いこう':'つづきから あそぶ'}　→</button><p class="dialog-note">じかんせいげん なし。いつでも やめて、つづきから。<br>スマホ・タブレット・パソコンで あそべます。</p>`,{closable:false});
  $('startBtn').onclick=()=>{
    sound=$('startSound').checked;audio.setEnabled(sound);started=true;unlockAudio();play('button');renderSound();save();$('modal').close();$('board').focus({preventScroll:true});
    if(saveNotice)say(saveNotice);else if(firstVisit)say('まずは スワイプ！ おなじネコを くっつけてみよう。');
    firstVisit=false;
    if(isStuck(state))showStuck();
  };
}
function showHelp(){
  showDialog(`<h2 id="modalTitle">あそびかた</h2><p class="sub">あせらなくて だいじょうぶ。<br>ネコを あわせて、おうちを そだてよう。</p><div class="how-steps"><div class="how-step"><div class="how-icon">↔</div><div><b>1. おなじネコを あわせよう</b><p>上下左右に スワイプすると、みんなが うごくよ。<br>矢印キー・がめんの矢印ボタンでも OK。</p></div></div><div class="how-step"><div class="how-icon">⌂</div><div><b>2. おねがいのネコを おひっこし</b><p>「おひっこし」を おすと、おうちへ。<br>なんびきか いるときは、ネコを タッチして えらぼう。</p></div></div><div class="how-step"><div class="how-icon">🐟</div><div><b>3. 6かい がったいで フィーバー！</b><p>つぎの がったい1回が 2だん しんか。<br>じかんは きにしなくて いいよ。</p></div></div><div class="how-step"><div class="how-icon">${catSVG(-1)}</div><div><b>ねずみは おたすけやく</b><p>どのネコとも がったいして、しんかさせるよ。<br>ねずみどうしは がったいしないよ。</p></div></div><div class="how-step"><div class="how-icon">♥</div><div><b>おうちの ネコを なでてみよう</b><p>なかまが ふえると、かぐも ふえるよ。<br>「1て もどす」で、ちがう うごきも ためせるよ。</p></div></div></div><button id="helpDone" class="primary">わかった！</button><p class="dialog-note">あたらしいパズルにしても、ネコ・かぐ・ずかんは のこります。<br>ほぞんは このブラウザの中だけです。<br>ブラウザのデータを消すと、きろくも消えます。</p><p class="credit">イラスト・音楽・効果音：このゲームのためのオリジナル制作。<br>読み上げ音声は使っていません。音なしでもすべて遊べます。</p>`);
  $('helpDone').onclick=closeDialog;
}
function showBook(){
  showDialog(`<div class="eyebrow" style="text-align:center">CAT COLLECTION</div><h2 id="modalTitle">ネコずかん</h2><p class="sub">${state.discovered.length} / 10しゅるい はっけん！<br>まだ あっていないネコは、どんな すがたかな？</p><div class="book-grid">${CATS.slice(1).map((c,i)=>{const level=i+1,found=state.discovered.includes(level);return `<button class="book-cat ${found?'':'locked'}" data-catdetail="${level}" aria-label="レベル${level} ${found?c.name:'まだ見つかっていないネコ'}">${catSVG(level)}<span>${found?c.name:'？？？'}</span><small>${state.residents[level]?`おうちに ${state.residents[level]}ひき`:`レベル ${level}`}</small></button>`;}).join('')}</div><h3 style="font-size:13px;margin-top:23px">おうちの かぐ</h3><div class="furniture-list">${FURNITURE.map(f=>`<div class="${state.adoptions>=f.at?'':'unfound'}">${state.adoptions>=f.at?'✓':'○'} ${f.name}<br><small>${f.at}ひき おひっこしで とうじょう</small></div>`).join('')}</div><button class="primary" id="bookDone">パズルに もどる</button>`);
  $('bookDone').onclick=closeDialog;
}
function showMilestone(furniture,level){
  particlesAt($('room'));
  showDialog(`<div class="milestone-art" aria-hidden="true">${catSVG(level,'happy')}</div><div class="eyebrow" style="text-align:center">NEW FURNITURE</div><h2 id="modalTitle">${furniture.name}が<br>とどいたよ！</h2><p class="sub">${state.adoptions}ひきの なかまが おひっこし。<br>おうちが もっと すてきに なったね。</p><button id="milestoneDone" class="primary">おうちを みてみよう　→</button>`);
  $('milestoneDone').onclick=()=>{closeDialog();$('room').scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'center'});};
}
function newPuzzle(){
  const fresh=createGame();state={...fresh,residents:[...state.residents],adoptions:state.adoptions,requestIndex:state.requestIndex,requestLevel:state.requestLevel,discovered:[...new Set([...state.discovered,1])]};
  previous=null;selected=null;inputLocked=false;render();save();closeDialog();say('あたらしい パズルだよ。おうちのネコは、みんな そのまま！');$('board').scrollIntoView({block:'center',behavior:reduced.matches?'instant':'smooth'});$('board').focus({preventScroll:true});
}
function confirmNew(){
  showDialog(`<div class="milestone-art" aria-hidden="true">${catSVG(1)}</div><h2 id="modalTitle">あたらしく はじめる？</h2><p class="sub">パズルの ネコと スコアを あたらしくするよ。<br><b>おうち・かぐ・ずかん・ベストは のこるよ。</b></p><button id="newConfirm" class="primary">あたらしい パズルにする</button><button id="newCancel" class="soft-button full">いまの パズルを つづける</button>`);
  $('newConfirm').onclick=newPuzzle;$('newCancel').onclick=closeDialog;
}
function showStuck(){
  showDialog(`<div class="milestone-art" aria-hidden="true">${catSVG(Math.max(...state.discovered),'sleep')}</div><h2 id="modalTitle">いっぱい あそんだね！</h2><p class="sub">いまは うごかせるネコが いないみたい。<br>${previous?'1て もどして、ちがう ほうこうも ためせるよ。':'あたらしい パズルで また あそぼう。'}<br>おうちの なかまや かぐは、そのまま のこるよ。</p>${previous?'<button id="stuckUndo" class="primary">1て もどして ためす　↶</button>':''}<button id="stuckNew" class="${previous?'soft-button full':'primary'}">あたらしい パズルで あそぶ</button><button id="stuckHome" class="soft-button full">おうちを ながめる</button>`);
  if($('stuckUndo'))$('stuckUndo').onclick=()=>{inputLocked=false;undo();closeDialog();};
  $('stuckNew').onclick=newPuzzle;$('stuckHome').onclick=closeDialog;
}

$('soundBtn').onclick=toggleSound;
$('adoptBtn').onclick=()=>{unlockAudio();adoptButton();};
$('undoBtn').onclick=undo;
$('newBtn').onclick=confirmNew;
$('helpBtn').onclick=showHelp;
$('bookBtn').onclick=showBook;
$('allCatsBtn').onclick=showBook;
$('catTrail').onclick=e=>{if(e.target.closest('[data-book]'))showBook();};
$('roomCats').onclick=e=>{const b=e.target.closest('[data-pet]');if(b)pet(Number(b.dataset.pet),b);};
$('modalContent').onclick=e=>{
  const button=e.target.closest('[data-catdetail]');if(!button)return;
  const level=Number(button.dataset.catdetail);
  if(state.discovered.includes(level)){play('pet',level);button.querySelector('svg').outerHTML=catSVG(level,'happy');}
};
$('closeModal').onclick=closeDialog;
$('modal').addEventListener('cancel',e=>{if(!started||staleTab)e.preventDefault();});
$('modal').addEventListener('click',e=>{if(e.target===$('modal')&&started){const r=$('modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog();}});
document.querySelectorAll('[data-dir]').forEach(b=>b.onclick=()=>doMove(b.dataset.dir));
document.addEventListener('keydown',e=>{
  if(e.altKey||e.ctrlKey||e.metaKey||$('modal').open||!started)return;
  const direction={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',a:'left',d:'right',w:'up',s:'down'}[e.key];
  if(direction){e.preventDefault();if(!e.repeat)doMove(direction);}
});
$('board').addEventListener('pointerdown',e=>{
  if(!started||e.isPrimary===false||e.button>0||inputLocked)return;
  pointer={x:e.clientX,y:e.clientY,id:e.pointerId,index:e.target.closest('[data-index]')?.dataset.index};
  $('board').setPointerCapture(e.pointerId);
});
$('board').addEventListener('pointerup',e=>{
  if(!pointer||pointer.id!==e.pointerId)return;
  const p=pointer;pointer=null;
  const dx=e.clientX-p.x,dy=e.clientY-p.y;
  if(Math.max(Math.abs(dx),Math.abs(dy))>24){
    lastSwipeAt=Date.now();doMove(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'));
  }else if(p.index!==undefined){tileTap(Number(p.index));}
});
$('board').addEventListener('pointercancel',()=>{pointer=null;});
$('board').addEventListener('lostpointercapture',()=>{pointer=null;});
function tileTap(index){
  if(!started||inputLocked)return;
  const eligible=canAdopt(state);
  if(eligible.includes(index)){
    if(selected===index)doAdopt(index);
    else {selected=index;focusAfterRender=index;render();say(`${nameOf(state.requestLevel)}を えらんだよ。「おひっこし」を おしてね。`);play('button');}
  }else if(state.board[index]){play('pet',state.board[index]);say(state.board[index]===-1?'ねずみは どのネコとも がったいできるよ。':'スワイプで おなじネコを くっつけよう。');}
}
// Click with detail=0 is keyboard/assistive activation; pointer taps are handled above.
$('board').addEventListener('click',e=>{if(e.detail===0&&Date.now()-lastSwipeAt>350){const b=e.target.closest('[data-index]');if(b)tileTap(Number(b.dataset.index));}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){audio.suspend();save();}else if(!staleTab)audio.resume();});
window.addEventListener('pagehide',()=>{audio.suspend();save();});
window.addEventListener('pageshow',()=>{if(!staleTab)audio.resume();});
window.addEventListener('storage',e=>{
  if(e.key===KEY&&e.newValue&&!staleTab){
    staleTab=true;inputLocked=true;audio.suspend();
    showDialog('<h2 id="modalTitle">ほかのタブで すすんだよ</h2><p class="sub">あたらしい きろくを よみこんで、<br>つづきから あそぼう。</p><button id="reloadSaved" class="primary">つづきを よみこむ</button>',{closable:false});
    $('reloadSaved').onclick=()=>location.reload();
  }
});
render();
if(!storageOkay){$('saveStatus').textContent='ほぞんできません（いまは あそべます）';$('saveStatus').classList.add('save-warning');}
welcome();
