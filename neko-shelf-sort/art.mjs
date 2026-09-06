// Original vector artwork for にゃんこ棚のおかたづけ.
// Every colour variant also has a different symbol or pattern.
const INK = '#684c3f';
const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" aria-hidden="true" focusable="false"><g stroke="${INK}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
const shadow = '<ellipse cx="50" cy="88" rx="30" ry="5" fill="#684c3f" opacity=".10" stroke="none"/>';
const star = (x, y, r = 8, fill = '#fff2a8') => `<polygon points="${Array.from({length:10},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,rad=i%2?r*.45:r;return `${(x+Math.cos(a)*rad).toFixed(2)},${(y+Math.sin(a)*rad).toFixed(2)}`;}).join(' ')}" fill="${fill}" stroke-width="1.5"/>`;
const heart = (x,y,s=1,fill='#f78693') => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 7C-20-4-12-17 0-8 12-17 20-4 0 7Z" fill="${fill}" stroke-width="1.7"/>`;
const eyes = (y=55,gap=10) => `<ellipse cx="${50-gap}" cy="${y}" rx="2.5" ry="3.5" fill="${INK}" stroke="none"/><ellipse cx="${50+gap}" cy="${y}" rx="2.5" ry="3.5" fill="${INK}" stroke="none"/><path d="M46 ${y+8}q4 4 8 0" stroke-width="1.8"/>`;

export const ITEMS = Object.freeze({
  'drink-strawberry': {name:'いちごミルク',category:'のみもの',accent:'#f6a1b0'},
  'drink-melon': {name:'メロンソーダ',category:'のみもの',accent:'#95cba7'},
  'drink-soda': {name:'あおいソーダ',category:'のみもの',accent:'#8cc7e8'},
  'drink-orange': {name:'オレンジ',category:'のみもの',accent:'#f2ad67'},
  'drink-grape': {name:'ぶどう',category:'のみもの',accent:'#b69bd4'},
  'drink-lemon': {name:'レモン',category:'のみもの',accent:'#ead76c'},
  'toy-red-car': {name:'あかいくるま',category:'おもちゃ',accent:'#e98583'},
  'toy-blue-car': {name:'あおいくるま',category:'おもちゃ',accent:'#80b8dc'},
  'toy-yellow-car': {name:'きいろいくるま',category:'おもちゃ',accent:'#eed274'},
  'toy-rocket': {name:'ロケット',category:'おもちゃ',accent:'#9bbcd5'},
  'toy-duck': {name:'あひる',category:'おもちゃ',accent:'#f3cf64'},
  'toy-robot': {name:'ロボット',category:'おもちゃ',accent:'#9cc6b6'},
  'sweet-cookie': {name:'クッキー',category:'おかし',accent:'#cfa271'},
  'sweet-choco': {name:'チョコ',category:'おかし',accent:'#987060'},
  'sweet-donut-pink': {name:'いちごドーナツ',category:'おかし',accent:'#e9a0b3'},
  'sweet-donut-blue': {name:'ソーダドーナツ',category:'おかし',accent:'#9ccfe0'},
  'sweet-cupcake': {name:'カップケーキ',category:'おかし',accent:'#b5a1d5'},
  'sweet-candy': {name:'キャンディ',category:'おかし',accent:'#f2a4a1'},
  'plush-bear-brown': {name:'ちゃいろくま',category:'ぬいぐるみ',accent:'#ba916c'},
  'plush-bear-cream': {name:'クリームくま',category:'ぬいぐるみ',accent:'#ead6ae'},
  'plush-rabbit-pink': {name:'ももうさぎ',category:'ぬいぐるみ',accent:'#edb1bf'},
  'plush-rabbit-blue': {name:'そらうさぎ',category:'ぬいぐるみ',accent:'#a5cddf'},
  'plush-cat-black': {name:'くろねこ',category:'ぬいぐるみ',accent:'#727582'},
  'plush-cat-white': {name:'しろねこ',category:'ぬいぐるみ',accent:'#dfe5e8'},
  'flower-pink': {name:'もものおはな',category:'おはな',accent:'#ed9db0'},
  'flower-blue': {name:'あおいおはな',category:'おはな',accent:'#9dbddd'},
  'flower-yellow': {name:'きいろのおはな',category:'おはな',accent:'#ead16d'},
  'flower-purple': {name:'むらさきのおはな',category:'おはな',accent:'#b8a0d4'},
  'flower-orange': {name:'みかんのおはな',category:'おはな',accent:'#eeae73'},
  'flower-white': {name:'しろいおはな',category:'おはな',accent:'#f8f1dd'},
});

function fruitMark(type,x=50,y=56) {
  if(type==='strawberry') return `<path d="M${x-12} ${y-5}Q${x} ${y-15} ${x+12} ${y-5}Q${x+10} ${y+8} ${x} ${y+14}Q${x-10} ${y+8} ${x-12} ${y-5}Z" fill="#ec7184" stroke-width="1.6"/><path d="M${x-9} ${y-5}l6 1 3-7 3 7 6-1" fill="#83b78b" stroke-width="1.5"/><path d="M${x-5} ${y}v2m10-2v2m-5 3v2" stroke="#fff2c8" stroke-width="2"/>`;
  if(type==='melon') return `<circle cx="${x}" cy="${y+1}" r="12" fill="#88be86" stroke-width="1.6"/><path d="M${x-9} ${y-7}l16 16m-19-7 12 12m-3-24 12 12m-13 10 15-15m-22 8 13-13" stroke="#e5f0bf" stroke-width="1.8"/><path d="M${x} ${y-11}v-5h5" stroke-width="1.6"/>`;
  if(type==='soda') return `${star(x,y,12,'#fff3ad')}<circle cx="${x+16}" cy="${y-11}" r="3" fill="#fff" stroke="none"/><circle cx="${x-16}" cy="${y+12}" r="2" fill="#fff" stroke="none"/>`;
  if(type==='grape') return `<g fill="#a37cc4" stroke-width="1.5"><circle cx="${x-6}" cy="${y-5}" r="6"/><circle cx="${x+6}" cy="${y-5}" r="6"/><circle cx="${x}" cy="${y+4}" r="6"/><circle cx="${x}" cy="${y+13}" r="5"/></g><path d="M${x} ${y-11}q3-8 10-6-2 8-10 6Z" fill="#8cb98a" stroke-width="1.4"/>`;
  if(type==='lemon') return `<path d="M${x-14} ${y+2}Q${x-8} ${y-12} ${x+8} ${y-9}l6 7Q${x+8} ${y+12} ${x-8} ${y+9}Z" fill="#f4d860" stroke-width="1.6"/><path d="M${x-7} ${y-2}q4-5 9-3" stroke="#fff5c3" stroke-width="3"/>`;
  return `<circle cx="${x}" cy="${y+1}" r="13" fill="#f9b051" stroke-width="1.6"/><circle cx="${x}" cy="${y+1}" r="8" fill="#ffdb8c" stroke="none"/><path d="M${x} ${y-7}v16m-7-12 14 8m-14 0 14-8" stroke="#fff8d7" stroke-width="1.7"/>`;
}

function drink(id) {
  const kind=id.slice(6), c=ITEMS[id].accent;
  const bottle=['orange','grape','lemon'].includes(kind);
  if(bottle) return `<path d="M40 23h20v10q13 8 13 19v27q0 8-8 8H35q-8 0-8-8V52q0-11 13-19Z" fill="${c}"/><path d="M40 31h20m-28 20q0-8 9-13" stroke="#fff6dc" stroke-width="4"/><rect x="37" y="16" width="26" height="12" rx="4" fill="#fff5dc"/><path d="M42 19v6m8-6v6m8-6v6" stroke="#d7bd98" stroke-width="1.7"/><path d="M28 49q22-5 44 0v28q-22 5-44 0Z" fill="#fff8e6" stroke-width="1.6"/>${fruitMark(kind,50,61)}<path d="M33 80h8" stroke="#fff" stroke-width="3"/>`;
  return `<path d="M56 33l3-22h15" stroke="#fff9e6" stroke-width="8"/><path d="M56 33l3-22h15" stroke="${INK}" stroke-width="2.2"/><path d="M25 32h50l-5 48q-1 7-8 7H38q-7 0-8-7Z" fill="${c}"/><path d="M29 39h41l-1 9q-19-5-39 0Z" fill="#fff9e8" opacity=".65" stroke="none"/><path d="M34 51l2 25" stroke="#fff" opacity=".65" stroke-width="4"/><path d="M23 32q27-8 54 0v5H23Z" fill="#fff6e0"/>${fruitMark(kind,52,60)}<path d="M42 81h18" stroke="#fff5d8" opacity=".7" stroke-width="2.4"/>`;
}

function car(id) {
  const c=ITEMS[id].accent, type=id.split('-')[1];
  const mark=type==='red'?heart(58,62,.47,'#fff1c9'):type==='blue'?star(58,60,7,'#fff5d5'):`<circle cx="58" cy="62" r="6" fill="#fff4d7"/><circle cx="58" cy="62" r="2" fill="#b79357" stroke="none"/>`;
  return `<path d="M15 55l13-6 10-19h26l12 22 11 5v18H13V62q0-5 2-7Z" fill="${c}"/><path d="M41 35h9v16H31Zm15 0h5l10 16H56Z" fill="#e2f3e8" stroke-width="1.8"/><path d="M16 57h7v8h-9m72-7h-6v7h7" fill="#fff2ae" stroke-width="1.8"/><path d="M19 72h64" stroke="#fff7de" stroke-width="3"/><circle cx="30" cy="76" r="10" fill="#6e6868"/><circle cx="71" cy="76" r="10" fill="#6e6868"/><circle cx="30" cy="76" r="4" fill="#f5e8c9" stroke-width="1.5"/><circle cx="71" cy="76" r="4" fill="#f5e8c9" stroke-width="1.5"/>${mark}<path d="M45 57h5" stroke-width="1.6"/>`;
}

function toy(id) {
  if(id.endsWith('-car')) return car(id);
  if(id==='toy-rocket') return `<path d="M40 76q-2 12 10 17 12-5 10-17" fill="#ffba67"/><path d="M46 77q-1 8 4 11 5-3 4-11" fill="#fff3a9" stroke="none"/><path d="M32 53q-17 9-15 29l21-10m30-19q17 9 15 29L62 72" fill="#e7928b"/><path d="M50 10q-23 19-23 49l9 18h28l9-18q0-30-23-49Z" fill="#e3ebe9"/><path d="M50 10q-12 10-18 23h36q-6-13-18-23Z" fill="#9bbcd5"/><circle cx="50" cy="47" r="12" fill="#91c8d7"/><circle cx="50" cy="47" r="8" fill="#d9f3ef" stroke-width="1.5"/><path d="M45 43l5-3m-14 28h28" stroke="#fff" stroke-width="3"/>${star(50,67,5,'#e8ba72')}`;
  if(id==='toy-duck') return `<path d="M31 59q-11-1-15-13-5 9-3 21 3 19 28 20h22q23-2 24-19-1-12-20-14V38q0-18-18-18T31 38q-1 11 8 17Z" fill="#f3cf64"/><path d="M39 28q5-5 11-4" stroke="#fff3b9" stroke-width="4"/><path d="M63 37l17 7-17 8Z" fill="#edaa68"/><circle cx="53" cy="37" r="3.3" fill="${INK}" stroke="none"/><path d="M35 65q10-11 22 0-7 15-20 7" fill="#ffe5a0" stroke-width="1.7"/><path d="M35 51q9 4 21 0" stroke="#db9674" stroke-width="4"/><path d="M56 51l9 8-11 1Z" fill="#e99188" stroke-width="1.5"/>`;
  return `<path d="M49 24v-9"/><circle cx="49" cy="11" r="5" fill="#e9aa8c"/><rect x="25" y="26" width="49" height="32" rx="9" fill="#abcbbc"/><path d="M25 36h-8v14h8m49-14h8v14h-8" fill="#ead7af"/><rect x="30" y="60" width="39" height="23" rx="5" fill="#a0c3b4"/><path d="M30 64l-11 3v14m50-17 12 3v14" stroke="#a0c3b4" stroke-width="9"/><path d="M38 83v8m22-8v8" stroke="#7e9e92" stroke-width="8"/><path d="M30 92h13m12 0h13" stroke-width="4"/><circle cx="39" cy="39" r="4" fill="#fff7dc"/><circle cx="61" cy="39" r="4" fill="#fff7dc"/><path d="M41 49h17"/><rect x="39" y="67" width="12" height="8" rx="2" fill="#fff2c1" stroke-width="1.4"/><circle cx="59" cy="70" r="3" fill="#e99483" stroke-width="1.4"/>`;
}

function sweet(id) {
  if(id==='sweet-cookie') return `<path d="M43 17l10 2 10-2 7 8 10 3 2 11 6 10-5 10-1 12-11 5-8 9-12-2-11 3-9-8-12-3-2-12-5-10 5-10 1-12 12-4Z" fill="#d9aa72"/><circle cx="50" cy="52" r="27" fill="#edc58b" stroke="#ba885c" stroke-width="1.5"/><path d="M34 30q9-6 18-4" stroke="#fff0bf" stroke-width="4"/><g fill="#92705c" stroke-width="1.4"><path d="M33 40l6-2 3 7-8 2Z"/><path d="M57 34l8 3-4 8-7-3Z"/><path d="M45 54l7-3 4 7-8 3Z"/><path d="M30 64l6-2 4 5-6 5Z"/><path d="M64 61l7-1 1 7-7 1Z"/></g><g fill="#b88858" stroke="none"><circle cx="47" cy="37" r="2"/><circle cx="64" cy="52" r="2"/><circle cx="48" cy="73" r="2"/></g>`;
  if(id==='sweet-choco') return `<path d="M28 13h44l4 66H24Z" fill="#94695a"/><g fill="#ae8070" stroke-width="1.7"><path d="M31 18h15v17H30Z"/><path d="M51 18h16l1 17H51Z"/><path d="M30 40h16v17H29Z"/><path d="M51 40h17l1 17H51Z"/></g><path d="M21 50l17 9 14-7 14 7 13-9 2 39H19Z" fill="#e3a2a5"/><path d="M21 50l17 9 14-7 14 7 13-9-5 13H26Z" fill="#fff1d9" stroke-width="1.4"/><rect x="30" y="65" width="40" height="16" rx="5" fill="#fff1d9" stroke-width="1.4"/>${heart(50,75,.53,'#c47b81')}<path d="M23 84h54" stroke="#f5c8c0" stroke-width="3"/>`;
  if(id.startsWith('sweet-donut')) {
    const pink=id.endsWith('pink'),c=ITEMS[id].accent;
    return `<circle cx="50" cy="51" r="36" fill="#dca56d"/><path d="M19 54q-6-10 1-21 4-13 17-15 12-7 23-2 15 1 21 14 8 9 4 19-2 8-8 6-5-1-7 5-4 9-11 2-4-4-8 0-7 10-14 1-3-5-8-2-7 3-10-7Z" fill="${c}"/><circle cx="50" cy="49" r="12" fill="#fff8e9"/><path d="M28 29l5-4m29 2 5 3M25 45l5 2m38-5 5-3M43 23l4 2m-2 46 5 1" stroke="#fff8df" stroke-width="3"/>${pink?`<path d="M37 36l-4 4m30 15 4 4m-27-1-4 2" stroke="#bc758b" stroke-width="2.7"/>${heart(58,31,.3,'#fff6cc')}`:`${star(34,38,5,'#fff3b5')}${star(67,55,5,'#fff3b5')}<path d="M47 28l3-3" stroke="#6496bc" stroke-width="2.8"/>`}<path d="M28 75q9 9 24 8" stroke="#f2d1a0" stroke-width="3"/>`;
  }
  if(id==='sweet-cupcake') return `<path d="M27 56h46l-7 31H34Z" fill="#b8a2d1"/><path d="M36 61l3 21m10-21v21m14-21-3 21" stroke="#e6d9ee" stroke-width="3"/><path d="M23 54q-7-12 7-17-6-10 10-15 0-13 14-15-4 10 10 15 14 4 8 15 13 4 8 15-3 6-12 3-6 9-16 1-9 7-16 0-10 5-13-2Z" fill="#fff0d1"/><path d="M37 25q11 7 27 1M30 40q14 7 40 0" stroke="#e9c6a7" stroke-width="2"/><circle cx="58" cy="16" r="6" fill="#df8c91"/><path d="M59 10q0-7 6-7" stroke="#86a87e" stroke-width="2"/>${star(51,70,7,'#fff1c8')}`;
  return `<path d="M29 37 9 30l5 16-7 15 23-3m41-21 20-7-5 16 7 15-23-3" fill="#e8adad"/><path d="M14 37l14 7m-13 9 13-3m58-13-14 7m13 9-13-3" stroke="#ffe9d7" stroke-width="2"/><ellipse cx="50" cy="47" rx="27" ry="22" fill="#fff1d7"/><path d="M28 38q18-12 36 23m-24-34q17 9 24 33m-34-7q3 8 13 13m13-39q16 1 19 16" stroke="#e3979e" stroke-width="9"/><ellipse cx="50" cy="47" rx="27" ry="22" stroke="${INK}" fill="none"/><path d="M34 34q5-4 11-4" stroke="#fff" opacity=".8" stroke-width="3"/>`;
}

function plush(id) {
  const bear=id.includes('bear'), rabbit=id.includes('rabbit'), black=id.endsWith('black'), c=ITEMS[id].accent;
  const shade=black?'#969398':id.endsWith('white')?'#f5eee5':id.endsWith('cream')?'#f5e8c8':id.endsWith('brown')?'#d8b28b':id.endsWith('pink')?'#f9d4d8':'#d8e9eb';
  const edge=black?'#514c52':INK, facial=black?'#ffe9b9':INK;
  const ears=bear?`<circle cx="27" cy="26" r="12" fill="${c}"/><circle cx="73" cy="26" r="12" fill="${c}"/><circle cx="27" cy="26" r="6" fill="${shade}" stroke="none"/><circle cx="73" cy="26" r="6" fill="${shade}" stroke="none"/>`:rabbit?`<ellipse cx="34" cy="24" rx="10" ry="22" fill="${c}" transform="rotate(-10 34 24)"/><ellipse cx="66" cy="24" rx="10" ry="22" fill="${c}" transform="rotate(10 66 24)"/><path d="M34 10v21m32-21v21" stroke="${shade}" stroke-width="6"/>`:`<path d="M25 40 20 15l25 15m10 0 25-15-5 25" fill="${c}"/><path d="m26 26 3 12 9-6m36-6-3 12-9-6" fill="${shade}" stroke="none"/>`;
  const bow=id.endsWith('brown')||id.endsWith('pink')||black?`<path d="M49 68l-12-6v14l12-6 13 6V62Z" fill="${black?'#e5be6f':'#91b9a7'}" stroke-width="1.5"/><circle cx="50" cy="69" r="3" fill="#fff0c9" stroke-width="1.2"/>`:`${star(50,71,8,'#e9b16e')}`;
  return `<g stroke="${edge}"><ellipse cx="50" cy="70" rx="24" ry="20" fill="${c}"/><ellipse cx="25" cy="64" rx="10" ry="15" fill="${c}" transform="rotate(26 25 64)"/><ellipse cx="75" cy="64" rx="10" ry="15" fill="${c}" transform="rotate(-26 75 64)"/><ellipse cx="34" cy="83" rx="13" ry="10" fill="${c}"/><ellipse cx="67" cy="83" rx="13" ry="10" fill="${c}"/>${ears}<ellipse cx="50" cy="44" rx="29" ry="25" fill="${c}"/><ellipse cx="50" cy="54" rx="13" ry="9" fill="${shade}" stroke="none"/><path d="m39 41 4 4m0-4-4 4m18-4 4 4m0-4-4 4" stroke="${facial}" stroke-width="2.3"/><path d="m47 50 3 3 3-3Z" fill="${facial}" stroke="${facial}" stroke-width="1.2"/><path d="M50 54v3m-4 0q4 3 8 0" stroke="${facial}" stroke-width="1.5"/>${bow}<path d="M50 79v5m-3-3h6" stroke="${facial}" stroke-width="1.2" opacity=".65"/></g>`;
}

function flower(id) {
  const c=ITEMS[id].accent,kind=id.slice(7);
  const petals = kind==='white'?Array.from({length:8},(_,i)=>`<ellipse cx="50" cy="23" rx="7" ry="13" fill="${c}" transform="rotate(${i*45} 50 37)" stroke-width="1.8"/>`).join(''):kind==='purple'?Array.from({length:5},(_,i)=>`<path d="M50 38q-17-4-13-16 4-10 13-4 9-6 13 4 4 12-13 16Z" fill="${c}" transform="rotate(${i*72} 50 38)" stroke-width="1.8"/>`).join(''):Array.from({length:5},(_,i)=>`<ellipse cx="50" cy="24" rx="11" ry="13" fill="${c}" transform="rotate(${i*72} 50 38)" stroke-width="1.8"/>`).join('');
  const mark=kind==='pink'?heart(50,76,.4,'#fff4d9'):kind==='blue'?`<path d="M41 72l5 4 5-4 5 4 5-4m-20 7 5 4 5-4 5 4 5-4" stroke="#fff4da" stroke-width="2"/>`:kind==='yellow'?star(50,75,6,'#fff5d5'):kind==='purple'?`<path d="M39 76h22m-16-5v10m10-10v10" stroke="#fff4dc" stroke-width="2"/>`:kind==='orange'?`<circle cx="41" cy="75" r="2.5" fill="#fff3d7" stroke="none"/><circle cx="50" cy="79" r="2.5" fill="#fff3d7" stroke="none"/><circle cx="59" cy="75" r="2.5" fill="#fff3d7" stroke="none"/>`:`<path d="m40 77 5-7 5 7 5-7 5 7" stroke="#fff4dd" stroke-width="2"/>`;
  return `<path d="M50 41v31" stroke="#7eaa7f" stroke-width="4"/><path d="M49 60q-22-3-19-15 18-2 19 15Zm2-7q19-1 19-13-17-2-19 13Z" fill="#95bc8d" stroke-width="1.7"/>${petals}<circle cx="50" cy="38" r="9" fill="${kind==='yellow'?'#ba8959':'#f6d785'}" stroke-width="1.8"/><circle cx="47" cy="36" r="1.5" fill="${INK}" stroke="none"/><circle cx="53" cy="36" r="1.5" fill="${INK}" stroke="none"/><path d="M47 41q3 2 6 0" stroke-width="1.2"/><path d="M30 66h40l-6 22H36Z" fill="${kind==='blue'?'#8fafa8':kind==='purple'?'#ad929f':'#d89c7c'}"/><rect x="27" y="62" width="46" height="8" rx="3" fill="#e9b997"/>${mark}`;
}

export function itemSVG(id) {
  if(!Object.hasOwn(ITEMS,id)) return svg(shadow+star(50,50,25));
  const art=id.startsWith('drink-')?drink(id):id.startsWith('toy-')?toy(id):id.startsWith('sweet-')?sweet(id):id.startsWith('plush-')?plush(id):flower(id);
  return svg(shadow+art);
}

export function catSVG(id,mood='happy') {
  const type=['sharo','yuki','hotate'].includes(id)?id:'sharo';
  const c=type==='yuki'?'#45454d':type==='hotate'?'#fff9ef':'#e9ae70';
  const line=type==='yuki'?'#302f38':INK;
  const eye=type==='yuki'?'#f1d69c':type==='hotate'?'#6f9299':INK;
  const scarf=type==='yuki'?'#d9bd79':type==='hotate'?'#e9a4b3':'#83b9a5';
  const face=mood==='sleepy'?`<path d="M34 46q5 4 10 0m12 0q5 4 10 0"/>`:mood==='surprised'?`<ellipse cx="39" cy="46" rx="3" ry="4" fill="${eye}"/><ellipse cx="61" cy="46" rx="3" ry="4" fill="${eye}"/>`:`<path d="M34 47q5-8 10 0m12 0q5-8 10 0"/>`;
  return svg(`<g stroke="${line}"><path d="M73 75q22 1 15-19" stroke="${c}" stroke-width="10"/><path d="M73 75q22 1 15-19" stroke="${line}" stroke-width="2"/><ellipse cx="50" cy="73" rx="24" ry="20" fill="${c}"/><path d="M22 44 20 12 40 24q10-4 20 0l20-12-2 32" fill="${c}"/><path d="m26 23 2 14 10-9m36-5-2 14-10-9" fill="${type==='yuki'?'#97858d':'#e9afb1'}" stroke="none"/><ellipse cx="50" cy="45" rx="31" ry="27" fill="${c}"/>${type==='sharo'?'<path d="M44 21l2 9m8-9-2 9m-29 9 9 3m-10 5 8 2m47-10-9 3m10 5-8 2" stroke="#b67b4d" stroke-width="4"/>':''}<ellipse cx="50" cy="56" rx="13" ry="9" fill="${type==='yuki'?'#eee0bd':'#fff4df'}" stroke="none"/><g stroke="${eye}" stroke-width="2.4">${face}<path d="m47 51 3 3 3-3Z" fill="${type==='yuki'?'#a49ba3':'#ca8c8d'}" stroke-width="1.3"/>${mood==='surprised'?`<ellipse cx="50" cy="60" rx="3" ry="4" fill="${eye}" stroke="none"/>`:'<path d="M50 54v3q-5 6-9 0m9 0q5 6 9 0" stroke-width="1.6"/>'}</g><path d="m22 52-10-2m10 8-10 1m66-7 10-2m-10 8 10 1" stroke-width="1.5"/><path d="M31 67q19 10 38 0l-4 10q-15 7-30 0Z" fill="${scarf}" stroke-width="1.5"/><path d="m61 73 10 13-13-2Z" fill="${scarf}" stroke-width="1.5"/><ellipse cx="35" cy="88" rx="11" ry="7" fill="${c}"/><ellipse cx="64" cy="88" rx="11" ry="7" fill="${c}"/><path d="M33 87v4m5-4v4m23-4v4m5-4v4" stroke-width="1.2"/></g>`);
}

function nest(markup,x,y,w,h=w) {
  return markup.replace('<svg ',`<svg x="${x}" y="${y}" width="${w}" height="${h}" `);
}

export function heroSVG() {
  const goods = [
    ['drink-strawberry',128,116],['drink-melon',202,116],['drink-strawberry',276,116],
    ['plush-bear-brown',396,117],['plush-rabbit-pink',470,116],['plush-bear-brown',544,117],
    ['sweet-donut-pink',125,243],['sweet-cookie',200,243],['sweet-donut-pink',275,243],
    ['toy-blue-car',397,244],['toy-duck',471,244],['toy-blue-car',545,244],
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 520" fill="none" aria-hidden="true" focusable="false">
    <ellipse cx="365" cy="478" rx="284" ry="24" fill="#d5bc9b" opacity=".18"/>
    <path d="M74 290C13 185 85 47 220 48c77-90 208-33 262-5 136-24 227 69 195 200 47 115-52 229-159 224H209C103 472 52 390 74 290Z" fill="#f9e6cd"/>
    <path d="M40 156q-5-19 10-33m-18 56q-12-2-16-13M676 294q21-11 25-29" stroke="#c8d7b0" stroke-width="7" stroke-linecap="round"/>
    <g stroke="#775440" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <rect x="103" y="83" width="532" height="326" rx="20" fill="#bf9268"/>
      <rect x="117" y="94" width="504" height="300" rx="12" fill="#efce9e"/>
      <rect x="125" y="105" width="235" height="112" rx="7" fill="#f8e2bd" stroke="none"/>
      <rect x="377" y="105" width="235" height="112" rx="7" fill="#f8e2bd" stroke="none"/>
      <rect x="125" y="235" width="235" height="112" rx="7" fill="#f8e2bd" stroke="none"/>
      <rect x="377" y="235" width="235" height="112" rx="7" fill="#f8e2bd" stroke="none"/>
      <path d="M369 99v284" stroke="#c99b6c" stroke-width="14"/>
      <path d="M119 131h491M120 157h490M120 270h491M120 303h491" stroke="#edcfa5" stroke-width="1.3"/>
      <path d="M145 120q17-9 33-1m312 26q29-8 64-1m-415 165q21-10 46-1m326-33q25-6 39-1" stroke="#e9c89b" stroke-width="2"/>
    </g>
    ${goods.map(([id,x,y])=>nest(itemSVG(id),x,y,78,95)).join('')}
    <g stroke="#775440" stroke-width="3" stroke-linejoin="round">
      <rect x="107" y="207" width="523" height="16" rx="5" fill="#dcb584"/>
      <path d="M117 212h502" stroke="#f8dbaa" stroke-width="3"/>
      <rect x="107" y="337" width="523" height="16" rx="5" fill="#dcb584"/>
      <path d="M117 342h502" stroke="#f8dbaa" stroke-width="3"/>
      <path d="M105 382h528v29H105Z" fill="#d6aa7e"/>
      <path d="M124 411v35h17v-35m453 0v35h17v-35" fill="#ba8b66"/>
      <path d="M103 95V80q0-10 12-10h507q13 0 13 10v15Z" fill="#e8bc94"/>
      <path d="M119 77h497" stroke="#ffe1b8" stroke-width="3"/>
    </g>
    <g stroke="#a58968" stroke-width="2" stroke-linecap="round">
      <path d="M114 39q250 79 506 0"/>
      <path d="m144 47 18 30 19-21" fill="#e5aaa7"/>
      <path d="m233 68 22 24 16-20" fill="#b7cdb2"/>
      <path d="m326 79 20 27 18-26" fill="#e7ce83"/>
      <path d="m420 75 23 23 15-29" fill="#d7b4c5"/>
      <path d="m515 57 26 23 11-33" fill="#b6ccd4"/>
    </g>
    <g stroke="#775440" stroke-width="2.2" stroke-linejoin="round">
      <rect x="300" y="386" width="140" height="63" rx="9" fill="#fff3dd" transform="rotate(-3 370 417)"/>
      <path d="m332 406-2-9 11 7m18 0 10-7-2 11" fill="#e9bf93"/>
      <ellipse cx="350" cy="414" rx="21" ry="15" fill="#e9bf93"/>
      <path d="M341 414h2m14 0h2m-10 5q3 3 6 0" stroke-linecap="round"/>
      <path d="m389 412 8 8 17-18" stroke="#85af9b" stroke-width="6" stroke-linecap="round"/>
    </g>
    ${nest(catSVG('sharo'),158,356,137,137)}
    ${nest(catSVG('yuki'),422,365,126,126)}
    ${nest(catSVG('hotate'),537,359,123,123)}
    ${nest(itemSVG('flower-pink'),40,354,94,116)}
    <g stroke="#b39b76" stroke-width="2" stroke-linecap="round"><path d="m72 91 0 14m-7-7h14m586 16v15m-7-8h14m-14 80v9m-5-5h10"/><path d="m75 322 5 9 10 2-8 6 1 10-8-5-9 4 3-10-7-7 10-1Z" fill="#f4d787" stroke-width="1.7"/></g>
    <circle cx="654" cy="69" r="5" fill="#dfb4af"/><circle cx="65" cy="277" r="5" fill="#d2b9cb"/>
  </svg>`;
}
