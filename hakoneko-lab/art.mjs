/* Original Canvas illustrations for はこねこ大実験. All coordinates are logical pixels. */
const INK = '#36514a';
const TAU = Math.PI * 2;
const finite = (v, fallback = 0) => Number.isFinite(v) ? v : fallback;
const validPoint = p => !!p && Number.isFinite(p.x) && Number.isFinite(p.y);
const COLORS = {
  sharo: {fur:'#d6a06c', light:'#f3d8ae', shade:'#bd8050', stripe:'#946b47', eyes:'#314c44'},
  yuki: {fur:'#354044', light:'#3e484b', shade:'#283438', stripe:'#485357', eyes:'#e3ce86'},
  hotate: {fur:'#fbfaf3', light:'#fffdf7', shade:'#dce2dd', stripe:'#d6e0dc', eyes:'#6eacb8'},
};
const THEMES = [
  {top:'#f4f2df',bottom:'#e8edda',line:'#cdd9bd',wood:'#dfbc85',ink:'#36514a'},
  {top:'#eff5df',bottom:'#dcead5',line:'#bdd2b8',wood:'#d7b789',ink:'#355946'},
  {top:'#e8e9ef',bottom:'#e0e4ec',line:'#c9ccdf',wood:'#c6b6ae',ink:'#525971'},
];

function path(c, points, fill, stroke = null, lineWidth = 2) {
  if (!points.length) return;
  c.beginPath(); c.moveTo(points[0][0], points[0][1]);
  for (let i=1; i<points.length; i++) c.lineTo(points[i][0], points[i][1]);
  c.closePath();
  if (fill) { c.fillStyle=fill; c.fill(); }
  if (stroke) { c.strokeStyle=stroke; c.lineWidth=lineWidth; c.stroke(); }
}
function rr(c,x,y,w,h,r,fill,stroke=null,lineWidth=2) {
  if (w<=0 || h<=0) return;
  c.beginPath(); c.roundRect(x,y,w,h,Math.min(r,w/2,h/2));
  if(fill){c.fillStyle=fill;c.fill();}
  if(stroke){c.lineWidth=lineWidth;c.strokeStyle=stroke;c.stroke();}
}
function ellipse(c,x,y,rx,ry,fill,stroke=null,lineWidth=2,rotation=0) {
  c.beginPath();c.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),rotation,0,TAU);
  if(fill){c.fillStyle=fill;c.fill();}
  if(stroke){c.strokeStyle=stroke;c.lineWidth=lineWidth;c.stroke();}
}
function line(c,points,color,width=2) {
  if(points.length<2)return;
  c.beginPath();c.moveTo(...points[0]);for(let i=1;i<points.length;i++)c.lineTo(...points[i]);
  c.lineWidth=width;c.strokeStyle=color;c.stroke();
}
function star(c,x,y,r,fill='#efc861',stroke=null,rotation=0) {
  const points=[];for(let i=0;i<10;i++){const angle=-Math.PI/2+i*Math.PI/5+rotation; const radius=i%2?r*.48:r;points.push([x+Math.cos(angle)*radius,y+Math.sin(angle)*radius]);}
  path(c,points,fill,stroke,1.6);
}
function spark(c,x,y,r,color='#dba646') {
  path(c,[[x,y-r],[x+r*.26,y-r*.22],[x+r,y],[x+r*.23,y+r*.21],[x,y+r],[x-r*.23,y+r*.22],[x-r,y],[x-r*.26,y-r*.22]],color);
}
function leaf(c,x,y,size,angle,color='#92ae7e') {
  c.save();c.translate(x,y);c.rotate(angle);c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-size*.7,-size*.7,-size*.3,-size*1.35,0,-size*1.6);c.bezierCurveTo(size*.8,-size*.9,size*.5,-size*.2,0,0);c.fillStyle=color;c.fill();c.restore();
}
function plant(c,x,y,scale=1,pot='#cf9974',time=0) {
  c.save();c.translate(x,y);c.scale(scale,scale);
  line(c,[[0,-13],[2,-57],[5+Math.sin(time*.9)*2,-100]],'#879a6d',3);
  leaf(c,2,-40,23,-.82,'#94ad7a');leaf(c,3,-58,20,.9,'#adbc85');leaf(c,4,-77,18,-.48,'#8fa977');
  path(c,[[-25,-24],[25,-24],[19,15],[-18,15]],pot);
  rr(c,-29,-29,58,10,4,'#ddb397');line(c,[[-11,-14],[-8,8]],'#e7bea2',2);
  c.restore();
}
function paw(c,x,y,s=1,color='#bc996d') {
  c.save();c.translate(x,y);c.scale(s,s);ellipse(c,0,4,7,6,color);ellipse(c,-8,-4,3,4,color,null,1,-.5);ellipse(c,-2,-8,3,4,color);ellipse(c,5,-7,3,4,color);ellipse(c,10,-2,3,4,color,null,1,.5);c.restore();
}

/** Cat anchor x,y is the centre between its feet. Scale 1 is about 100 x 140px. */
export function drawCat(c,x,y,scale=1,kind='sharo',mood='idle',time=0) {
  if(!c || !Number.isFinite(x) || !Number.isFinite(y))return;
  const p=COLORS[kind]||COLORS.sharo;const happy=['happy','win','won','success'].includes(mood);
  const t=finite(time);const bob=happy?Math.sin(t*4)*1.8:Math.sin(t*1.25)*.5;
  c.save();c.translate(x,y+bob);c.scale(finite(scale,1),finite(scale,1));c.lineCap='round';c.lineJoin='round';
  ellipse(c,1,3,48,8,'#324c4220');
  // A thick curling tail makes each silhouette readable even on a small phone.
  c.beginPath();c.moveTo(22,-19);c.bezierCurveTo(80,-6,81,-58+Math.sin(t*1.7)*4,61,-65);c.strokeStyle=p.shade;c.lineWidth=15;c.stroke();
  c.beginPath();c.moveTo(22,-22);c.bezierCurveTo(74,-10,78,-54+Math.sin(t*1.7)*4,61,-61);c.strokeStyle=p.fur;c.lineWidth=11;c.stroke();
  ellipse(c,0,-37,33,42,p.fur,INK,2.3);
  ellipse(c,0,-29,21,29,p.light);
  ellipse(c,-20,-4,15,9,p.fur,INK,2);ellipse(c,20,-4,15,9,p.fur,INK,2);
  line(c,[[-24,-5],[-24,-1]],p.shade,1.4);line(c,[[-17,-5],[-17,-1]],p.shade,1.4);line(c,[[17,-5],[17,-1]],p.shade,1.4);line(c,[[24,-5],[24,-1]],p.shade,1.4);
  c.save();c.translate(0,Math.sin(t*.8)*.7);
  path(c,[[-34,-91],[-37,-133],[-9,-111]],p.fur,INK,2.3);path(c,[[12,-111],[38,-133],[36,-88]],p.fur,INK,2.3);
  path(c,[[-29,-104],[-31,-122],[-18,-109]],'#dfa897');path(c,[[21,-109],[32,-123],[31,-102]],'#dfa897');
  ellipse(c,0,-86,42,34,p.fur,INK,2.3);
  if(kind==='sharo'){
    for(const [xx,a] of [[-14,-.3],[0,0],[14,.3]]){c.save();c.translate(xx,-113);c.rotate(a);rr(c,-2,0,4,12,2,p.stripe);c.restore();}
    line(c,[[-36,-91],[-27,-89]],p.stripe,3);line(c,[[27,-89],[36,-91]],p.stripe,3);
  } else if(kind==='hotate') {ellipse(c,-17,-113,12,5,'#f1f3ec',null,1,-.2);}
  if(kind==='yuki'){
    ellipse(c,-7,-73,9,7,'#e8ddc4');ellipse(c,7,-73,9,7,'#e8ddc4');
  }else{
    ellipse(c,-11,-72,14,12,p.light);ellipse(c,11,-72,14,12,p.light);
  }
  const blinking=Math.sin(t*.6)>.995;
  for(const ex of [-16,16]){
    if(happy||blinking){c.beginPath();c.moveTo(ex-5,-86);c.quadraticCurveTo(ex,-93,ex+5,-86);c.strokeStyle=p.eyes;c.lineWidth=2.8;c.stroke();}
    else {ellipse(c,ex,-88,3.4,5.2,p.eyes);ellipse(c,ex-.7,-90,1,1.3,'#fff9dd');}
  }
  ellipse(c,-28,-74,6,3.2,'#e1a39088');ellipse(c,28,-74,6,3.2,'#e1a39088');
  path(c,[[-4,-77],[4,-77],[0,-73]],'#bd8273');
  c.beginPath();c.moveTo(0,-73);c.lineTo(0,-69);c.quadraticCurveTo(-4,-65,-7,-70);c.moveTo(0,-69);c.quadraticCurveTo(4,-65,7,-70);c.strokeStyle=INK;c.lineWidth=1.7;c.stroke();
  for(const side of [-1,1]){
    line(c,[[side*28,-76],[side*48,-79]],'#576655',1.3);line(c,[[side*28,-71],[side*46,-69]],'#576655',1.3);
  }
  c.restore();
  path(c,[[-13,-55],[0,-49],[13,-55],[12,-39],[0,-42],[-13,-39]],kind==='yuki'?'#cf9c75':kind==='hotate'?'#cfb966':'#6eaa96',INK,1.2);
  ellipse(c,0,-47,4,4,kind==='hotate'?'#f0d78b':'#f7e7bd');
  if(happy){c.save();c.translate(-29,-44);c.rotate(-.42+Math.sin(t*3)*.05);ellipse(c,0,0,10,19,p.fur,INK,2);ellipse(c,0,-5,5,6,'#d1a090');c.restore();}
  c.restore();
}

function drawYarn(c,x,y,r=15,angle=0) {
  if(!Number.isFinite(x)||!Number.isFinite(y))return;
  c.save();c.translate(x,y);c.rotate(finite(angle));
  ellipse(c,1,r*.28,r*.95,r*.75,'#a85d4820');
  ellipse(c,0,0,r,r,'#e68d70','#a75e4b',1.6);
  c.save();c.beginPath();c.arc(0,0,r-.7,0,TAU);c.clip();
  c.strokeStyle='#bc6956';c.lineWidth=Math.max(.9,r*.065);
  for(let i=-3;i<=3;i++){
    c.beginPath();c.moveTo(-r*1.1,i*r*.31-r*.45);c.quadraticCurveTo(-r*.1,i*r*.31+r*.2,r*1.1,i*r*.31+r*.25);c.stroke();
  }
  c.rotate(1.12);c.strokeStyle='#f5b397';
  for(let i=-2;i<=2;i++){
    c.beginPath();c.moveTo(-r,i*r*.32);c.quadraticCurveTo(-r*.1,i*r*.32-r*.48,r,i*r*.32-.2*r);c.stroke();
  }
  c.restore();ellipse(c,-r*.32,-r*.42,r*.12,r*.07,'#ffe1bc');c.restore();
}

function drawRamp(c,selected=false) {
  rr(c,-90,-6,180,18,5,'#c49358');rr(c,-90,-8,180,14,4,'#edc087','#986d46',1.8);
  line(c,[[-78,-3],[78,-3]],'#fbe0ad',2);
  line(c,[[-59,2],[-11,2]],'#d9a771',1);line(c,[[16,2],[65,2]],'#d9a771',1);
  for(const x of [-78,78]){ellipse(c,x,-1,2.5,2.5,'#997b52');ellipse(c,x-.4,-1.4,.8,.8,'#ffe8b8');}
  if(selected){line(c,[[-60,-16],[60,-16]],'#287f78',1.5);for(const x of [-60,60])line(c,[[x,-20],[x,-12]],'#287f78',1.5);}
}
function drawSpring(c,time=0,compression=0) {
  const k=Math.max(0,Math.min(1,compression));
  rr(c,-48,4,96,11,4,'#c09095','#8b666d',1.5);
  for(const x of [-28,27]){
    const points=[];
    for(let i=0;i<=8;i++)points.push([x+(i%2?-8:8),3-i*1.8*(1-k*.42)]);
    line(c,points,'#9b7689',3);line(c,points.map(([px,py])=>[px-1,py-.8]),'#e4b7c8',1);
  }
  rr(c,-50,-11+k*6,100,9,4,'#eeaec1','#9c7388',1.8);
  rr(c,-43,-10+k*6,86,2,1,'#f9ced8');
  for(const x of [-38,38])ellipse(c,x,9,2.2,2.2,'#815d6a');
  c.save();c.globalAlpha=.45;line(c,[[-6,-23],[0,-29],[6,-23]],'#a5788f',2);c.restore();
}
function drawFan(c,time=0,showWind=true,active=true) {
  if(showWind){
    const wind=c.createLinearGradient(25,0,305,0);wind.addColorStop(0,'#8abfaf23');wind.addColorStop(.75,'#93c4b013');wind.addColorStop(1,'#93c4b000');
    path(c,[[20,-69],[300,-94],[300,94],[20,69]],wind);
    c.save();c.beginPath();c.rect(28,-95,275,190);c.clip();
    for(let i=0;i<8;i++){
      const run=((i*41+(active?time*52:0))%280+280)%280;
      const yy=[-44,9,43,-14,64,-63,29,-32][i];
      const opacity=(1-Math.abs(run-130)/160)*.36;c.globalAlpha=Math.max(.05,opacity);
      c.beginPath();c.moveTo(31+run,yy);c.bezierCurveTo(45+run,yy-4,57+run,yy+4,70+run,yy);c.strokeStyle='#5c9e90';c.lineWidth=2;c.stroke();
    }
    c.restore();
  }
  // Side-facing desk fan. The arrow shows the same direction as the physical wind.
  rr(c,-25,23,48,9,4,'#729f91','#4c796e',1.6);rr(c,-10,2,16,25,4,'#8db8a6','#4c796e',1.4);
  rr(c,-32,-26,47,48,13,'#a8d0bc','#527f73',2);
  ellipse(c,15,-3,18,25,'#def0d6','#527f73',2);
  c.save();c.translate(15,-3);c.scale(.7,1);c.rotate(active?time*6:0);
  for(let i=0;i<3;i++){c.rotate(TAU/3);c.beginPath();c.moveTo(0,0);c.bezierCurveTo(3,-18,19,-22,15,-8);c.bezierCurveTo(13,-1,5,4,0,0);c.fillStyle='#7aac9b';c.fill();}
  c.restore();
  ellipse(c,15,-3,4,4,'#ebf1d8','#739d8b',1);
  c.save();c.globalAlpha=.65;for(const off of [-10,0,10]){c.beginPath();c.ellipse(15+off*.75,-3,Math.max(3,13-Math.abs(off)*.3),22,0,-Math.PI/2,Math.PI/2);c.strokeStyle='#528373';c.lineWidth=1;c.stroke();}c.restore();
  rr(c,-26,-15,7,22,3,'#badcc4');
  line(c,[[40,0],[57,0],[52,-4]],'#568e7c',2);line(c,[[57,0],[52,4]],'#568e7c',2);
}
function drawBumper(c,time=0,compression=0) {
  const k=Math.max(0,Math.min(1,compression));
  c.save();c.scale(1+k*.1,1-k*.08);
  ellipse(c,0,3,34,34,'#cda752');ellipse(c,0,0,34,32,'#f0cb72','#ac8944',1.8);
  ellipse(c,-2,-3,27,25,'#f3d58b');
  c.save();c.setLineDash([3,4]);ellipse(c,0,-1,29,27,null,'#cba34f',1);c.restore();
  ellipse(c,-9,-5,2.2,3,'#856d42');ellipse(c,9,-5,2.2,3,'#856d42');
  c.beginPath();c.moveTo(-4,3);c.quadraticCurveTo(0,8,4,3);c.strokeStyle='#957747';c.lineWidth=1.5;c.stroke();
  ellipse(c,-17,3,4,2,'#e5ad62');ellipse(c,17,3,4,2,'#e5ad62');
  c.restore();
}
function drawPart(c,p,{selected=false,ghost=false,time=0,active=false,compression=0,showWind=true}={}) {
  if(!validPoint(p)||!['ramp','spring','fan','bumper'].includes(p.kind))return;
  c.save();c.translate(p.x,p.y);c.rotate(finite(p.angle));
  if(ghost)c.globalAlpha*=.26;
  if(selected){
    c.save();c.shadowColor='#2e807532';c.shadowBlur=15;c.strokeStyle='#2d8b7f';c.lineWidth=2;c.setLineDash([5,5]);
    if(p.kind==='bumper')ellipse(c,0,0,43,43,null,'#2d8b7f',2);
    else {const w=p.kind==='ramp'?200:p.kind==='spring'?122:91;const h=p.kind==='ramp'?37:p.kind==='spring'?51:85;rr(c,-w/2,-h/2,w,h,12,null,'#2d8b7f',2);}
    c.restore();
  }
  c.save();c.shadowColor='#52624620';c.shadowBlur=5;c.shadowOffsetY=4;
  if(p.kind==='ramp')drawRamp(c,selected);
  else if(p.kind==='spring')drawSpring(c,time,compression);
  else if(p.kind==='fan')drawFan(c,time,showWind,active);
  else drawBumper(c,time,compression);
  c.restore();
  if(selected){ellipse(c,0,0,3.5,3.5,'#fff9e6','#287f78',1.5);}
  c.restore();
}

/** Toolbox icon bounds are clear; no labels or emoji are baked into the illustration. */
export function drawToolIcon(c,kind,width=128,height=74) {
  if(!c)return;c.save();c.clearRect(0,0,width,height);c.translate(width/2,height/2);c.scale(width/128,height/74);c.lineCap='round';c.lineJoin='round';
  const zoom=kind==='ramp'?.56:kind==='spring'?.8:kind==='bumper'?.77:.86;
  c.scale(zoom,zoom);if(kind==='ramp')c.rotate(-.13);
  if(kind==='ramp')drawRamp(c);else if(kind==='spring')drawSpring(c);else if(kind==='fan')drawFan(c,0,false,false);else if(kind==='bumper')drawBumper(c);
  c.restore();
}

function background(c,theme,time,reducedMotion) {
  const palette=THEMES[theme];
  const gradient=c.createLinearGradient(0,0,0,540);gradient.addColorStop(0,palette.top);gradient.addColorStop(1,palette.bottom);c.fillStyle=gradient;c.fillRect(0,0,960,540);
  if(theme===0){
    c.save();c.globalAlpha=.38;
    for(let x=25;x<960;x+=34)for(let y=28;y<510;y+=34)ellipse(c,x,y,1,1,'#adbca0');c.restore();
    // A broad, quiet window shape leaves the useful centre of the board uncluttered.
    c.save();c.globalAlpha=.44;rr(c,758,19,157,167,69,'#d4e4c8');rr(c,768,29,137,147,60,'#e8efcf');
    line(c,[[837,31],[837,172]],'#c5d4b2',5);line(c,[[769,111],[904,111]],'#c5d4b2',5);rr(c,749,183,175,9,4,'#c5d4b2');c.restore();
    c.save();c.globalAlpha=.4;plant(c,908,515,.65,'#c4ab82',reducedMotion?0:time);c.restore();
  }else if(theme===1){
    c.save();c.globalAlpha=.45;
    ellipse(c,95,55,41,41,'#f6df9a');ellipse(c,102,53,31,31,'#fbebbd');
    c.beginPath();c.moveTo(0,432);c.bezierCurveTo(240,282,377,474,576,412);c.bezierCurveTo(750,357,805,433,960,361);c.lineTo(960,540);c.lineTo(0,540);c.closePath();c.fillStyle='#c3dbb8';c.fill();
    c.beginPath();c.moveTo(0,479);c.bezierCurveTo(220,435,406,462,541,478);c.bezierCurveTo(717,497,818,433,960,450);c.lineTo(960,540);c.lineTo(0,540);c.closePath();c.fillStyle='#accba6';c.fill();c.restore();
    for(let i=0;i<9;i++){const x=24+i*119;const y=518+(i%3)*6;leaf(c,x,y,8,Math.sin(i)*.7,'#9db98a');
      if(i%2===0){line(c,[[x,y],[x+3,y-22]],'#9caf7e',1.3);for(let petal=0;petal<5;petal++){const angle=petal*TAU/5;ellipse(c,x+3+Math.cos(angle)*4,y-23+Math.sin(angle)*4,3,3,i%4===0?'#e8c781':'#e8b6a4');}ellipse(c,x+3,y-23,2,2,'#caa663');}
    }
    c.save();c.globalAlpha=.35;for(const [x,y,s]of[[170,81,.65],[540,47,.5],[890,100,.7]]){
      ellipse(c,x,y,43*s,11*s,'#fffef0');ellipse(c,x-12*s,y-5*s,20*s,11*s,'#fffef0');ellipse(c,x+10*s,y-8*s,19*s,15*s,'#fffef0');
    }c.restore();
  }else{
    c.save();c.globalAlpha=.35;path(c,[[0,110],[480,-69],[960,110],[960,133],[480,-44],[0,133]],'#c5c6d3');
    rr(c,748,34,149,144,67,'#b4bfd3');rr(c,757,43,131,128,60,'#d5dced');
    ellipse(c,828,93,32,32,'#f5e6b1');ellipse(c,840,82,29,29,'#d5dced');
    line(c,[[823,46],[823,170]],'#acb9d0',5);line(c,[[758,113],[889,113]],'#acb9d0',5);c.restore();
    for(let i=0;i<29;i++){const x=27+(i*137)%901,y=25+(i*79)%442;const pulse=reducedMotion?1:.7+.3*Math.sin(time*.8+i);
      c.save();c.globalAlpha=.14+.19*pulse;if(i%4===0)spark(c,x,y,3+i%3,'#999ab5');else ellipse(c,x,y,1.2,1.2,'#939eb7');c.restore();
    }
  }
  // A board edge, not a floor collider: falling below it always remains visible.
  c.fillStyle=theme===2?'#d2d5de':'#d9dec4';c.fillRect(0,532,960,8);
  line(c,[[0,533],[960,533]],theme===2?'#c4c7d4':'#bdcba8',1);
  c.save();c.globalAlpha=.32;
  for(let i=0;i<18;i++)line(c,[[i*59+8,536],[i*59+29,536]],theme===2?'#b4b9c9':'#b2c196',1);c.restore();
}
function obstacle(c,o,theme) {
  if(!validPoint(o))return;const w=finite(o.w,60),h=finite(o.h,50);if(w<=0||h<=0)return;
  c.save();c.translate(o.x,o.y);c.rotate(finite(o.angle));
  rr(c,-w/2,-h/2,w,h,Math.min(7,h/3),theme===2?'#b7b6c6':theme===1?'#b4c69c':'#c9b690',theme===2?'#8b8da2':'#8d9e77',1.8);
  if(h>38){
    line(c,[[-w/2+5,-h/2+9],[w/2-5,-h/2+9]],theme===2?'#d3cedd':'#dde1be',2);
    c.save();c.globalAlpha=.35;for(let x=-w/2+12;x<w/2-5;x+=21)line(c,[[x,-h/2+13],[x,h/2-5]],theme===2?'#8b8da2':'#7f9268',1);c.restore();
    if(theme!==2&&w>45&&h>55){leaf(c,-w/2+16,-h/2+3,13,-.8,'#9baf80');leaf(c,w/2-16,-h/2+3,10,.8,'#a7b98a');}
  }else {line(c,[[-w/2+10,-h/2+5],[w/2-10,-h/2+5]],theme===2?'#d6d2df':'#e7dfba',2);}
  c.restore();
}
function goalBack(c,g,cat,time,won=false) {
  const w=finite(g.w,130),h=finite(g.h,64),left=g.x-w/2,top=g.y-h/2;
  // Keep the cat outside the open basket so the landing path stays easy to read.
  const side=g.x>770?-1:1;
  const catX=g.x+side*(w/2+40);
  drawCat(c,catX,g.y+h/2+5,.62,cat,won?'happy':'idle',time);
  ellipse(c,g.x,g.y+h/2+7,w*.64,9,'#6670581b');
  rr(c,left,top,w,h,8,'#ecdbb5');
  rr(c,left+9,top+7,w-18,h-15,5,'#e1c491');
  // The two little folded tabs read as cardboard, while the gap is genuinely open.
  path(c,[[left-4,top],[left+7,top+9],[left+7,top+25],[left-11,top+16]],'#e2be83','#b28d5b',1.3);
  path(c,[[left+w+4,top],[left+w-7,top+9],[left+w-7,top+25],[left+w+11,top+16]],'#e6c68f','#b28d5b',1.3);
  line(c,[[left+13,top+16],[left+w-13,top+16]],'#d3b584',1);
}
function goalFront(c,g) {
  const w=finite(g.w,130),h=finite(g.h,64),left=g.x-w/2,top=g.y-h/2;
  rr(c,left-4,top,9,h+4,4,'#cfa574','#a88356',1.5);
  rr(c,left+w-5,top,9,h+4,4,'#cfa574','#a88356',1.5);
  rr(c,left-4,g.y+h/2-4,w+8,10,3,'#d3ad7e','#a88356',1.5);
  // Low front lip lets the child see the yarn settle before the success screen.
  rr(c,left+6,g.y+h/2-16,w-12,15,3,'#e6c591');
  line(c,[[left+10,g.y+h/2-13],[left+w-10,g.y+h/2-13]],'#f1d9ae',2);
  paw(c,g.x,g.y+h/2-9,.6,'#b88f5e');
}
function spawnHolder(c,spawn) {
  if(!validPoint(spawn))return;
  const x=spawn.x,y=spawn.y;
  c.save();c.globalAlpha=.9;
  line(c,[[x,0],[x,y-35]],'#9eb09a',1.5);
  rr(c,x-32,y-34,64,8,4,'#a8ba9c','#7c977b',1.3);
  line(c,[[x-21,y-27],[x-21,y-19]],'#8eab8f',2);line(c,[[x+21,y-27],[x+21,y-19]],'#8eab8f',2);
  line(c,[[x-28,y-18],[x-17,y-13]],'#a7bd9f',2);line(c,[[x+17,y-13],[x+28,y-18]],'#a7bd9f',2);
  c.restore();
}

/** Render the 960 x 540 experiment board without changing the caller's DPR transform. */
export function drawScene(c,level,placements=[],sim=null,options={}) {
  if(!c||!level)return;
  const time=options.reducedMotion?0:finite(options.time);
  const rawTheme=options.theme??level.chapter??0;
  const theme=Number.isFinite(rawTheme)?Math.max(0,Math.min(2,Math.floor(rawTheme))):['garden','moon'].includes(rawTheme)?(rawTheme==='garden'?1:2):0;
  c.save();c.lineCap='round';c.lineJoin='round';c.clearRect(0,0,960,540);
  background(c,theme,time,options.reducedMotion);
  for(const o of level.obstacles||[])obstacle(c,o,theme);
  if(validPoint(level.goal))goalBack(c,level.goal,level.cat||'sharo',time,sim?.status==='won');
  if(validPoint(level.spawn))spawnHolder(c,level.spawn);
  // Stars remain visible until physically touched, then become a tiny quiet twinkle.
  for(const [i,s]of(level.stars||[]).entries()){
    if(!validPoint(s))continue;
    const got=sim?.stars?.has?.(i)||sim?.stars?.has?.(s.id);
    if(got){c.save();c.globalAlpha=.22;spark(c,s.x,s.y,5,'#d3a84c');c.restore();continue;}
    const bob=options.reducedMotion?0:Math.sin(time*1.9+i)*2;
    ellipse(c,s.x,s.y+bob,20,20,'#fff7ce5c');star(c,s.x,s.y+bob,12,'#edc766','#bb9653',Math.sin(time+i)*.06);
    ellipse(c,s.x-2,s.y-4+bob,1.6,1.6,'#fff2c4');
  }
  if(options.showTrace!==false&&Array.isArray(sim?.trace)&&sim.trace.length>1){
    c.save();c.strokeStyle='#ab9b8a';c.globalAlpha=.43;c.lineWidth=2;c.setLineDash([2,7]);c.beginPath();
    let begun=false;for(const p of sim.trace){if(!validPoint(p))continue;if(!begun){c.moveTo(p.x,p.y);begun=true;}else c.lineTo(p.x,p.y);}c.stroke();c.restore();
  }
  for(const p of options.ghostParts||[])drawPart(c,p,{ghost:true,time,active:false});
  for(const p of placements||[]){
    if(!validPoint(p))continue;
    const lastBounce=sim?.eventTimes?.[`${p.kind==='spring'?'spring':'bounce'}:${p.id}`];
    const age=lastBounce==null?100:finite(sim?.elapsed)-lastBounce;
    const compression=options.reducedMotion?0:Math.max(0,1-age/.23);
    drawPart(c,p,{selected:p.id===options.selectedId,time,active:sim?.status==='running',compression});
  }
  if(options.previewPart)drawPart(c,options.previewPart,{ghost:true,time,active:false});
  const ball=validPoint(sim?.ball)?sim.ball:level.spawn;
  if(validPoint(ball))drawYarn(c,ball.x,ball.y,finite(ball.r,15),finite(ball.angle));
  if(validPoint(level.goal))goalFront(c,level.goal);
  for(const p of options.particles||[]){
    if(!validPoint(p))continue;
    const opacity=Number.isFinite(p.alpha)?p.alpha:Number.isFinite(p.life)?Math.min(1,p.life):1;
    c.save();c.globalAlpha=Math.max(0,Math.min(1,opacity));
    if(p.kind==='star'||p.type==='star')star(c,p.x,p.y,finite(p.size,5),p.color||'#e6ba54',null,finite(p.angle));
    else if(p.kind==='spark'||p.type==='spark')spark(c,p.x,p.y,finite(p.size,4),p.color||'#e0b554');
    else {c.translate(p.x,p.y);c.rotate(finite(p.angle));rr(c,-3,-2,finite(p.size,6),finite(p.size,6)*.6,1,p.color||'#e5b77a');}
    c.restore();
  }
  c.restore();
}

/** Homepage diorama, logical 960 x 660. Original shapes, no external images. */
export function drawHero(c,time=0) {
  if(!c)return;const t=finite(time);c.save();c.clearRect(0,0,960,660);c.lineCap='round';c.lineJoin='round';
  // Organic backing and a quiet ruled sheet suggest a child's well loved workbench.
  c.beginPath();c.moveTo(94,344);c.bezierCurveTo(53,190,221,94,390,101);c.bezierCurveTo(560,45,776,131,833,261);c.bezierCurveTo(916,403,835,565,657,585);c.bezierCurveTo(384,638,126,555,94,344);c.fillStyle='#e8ecdc';c.fill();
  c.save();c.translate(421,330);c.rotate(-.075);rr(c,-278,-219,556,386,19,'#f9f7e9','#dce1cb',2);c.globalAlpha=.39;
  for(let x=-250;x<260;x+=26)line(c,[[x,-203],[x,150]],'#cbd8c0',.8);
  for(let y=-196;y<159;y+=26)line(c,[[-263,y],[263,y]],'#cbd8c0',.8);c.restore();
  // Masking tape and little pencil annotations, all drawn into the illustration.
  c.save();c.translate(193,123);c.rotate(-.28);path(c,[[-34,-12],[36,-12],[31,-6],[36,0],[31,6],[34,12],[-36,12],[-32,6],[-36,0],[-31,-6]],'#d9dfb7b0');c.restore();
  c.save();c.translate(681,512);c.rotate(-.17);path(c,[[-40,-12],[40,-12],[35,-6],[40,0],[36,6],[39,12],[-40,12],[-37,6],[-40,0],[-36,-6]],'#d9dfb7a0');c.restore();
  // Floating wooden bench, with a warm thickness and small joinery details.
  ellipse(c,495,589,350,26,'#afbf9d25');
  path(c,[[142,465],[736,416],[860,498],[257,566]],'#ddbd87','#b79363',2);
  path(c,[[257,566],[860,498],[860,522],[258,589]],'#cea66d','#b18c5d',2);
  path(c,[[142,465],[257,566],[258,589],[142,487]],'#d1aa72','#b18c5d',2);
  for(let i=0;i<5;i++)line(c,[[207+i*108,490-i*7],[296+i*106,555-i*12]],'#e9cca2',1);
  rr(c,303,575,28,45,7,'#bfa37a');rr(c,767,532,26,49,7,'#bfa37a');
  plant(c,815,424,.83,'#c99570',t);
  // Pinned cardboard support towers hold up the ramp in the display sculpture.
  path(c,[[240,277],[274,275],[296,462],[254,466]],'#d7b88a','#b08a60',2);
  path(c,[[382,324],[414,319],[431,446],[394,450]],'#e3c797','#b08a60',2);
  for(let i=0;i<5;i++)rr(c,260+i*1.8,322+i*26,10,4,2,'#b29268');
  c.save();c.translate(326,281);c.rotate(.29);c.scale(1.57,1.57);drawRamp(c);c.restore();
  // A second ramp and a spring make the journey readable at first glance.
  c.save();c.translate(506,435);c.rotate(-.16);c.scale(1.4,1.4);drawSpring(c,t);c.restore();
  c.save();c.translate(624,330);c.rotate(-.28);c.scale(.92,.92);drawRamp(c);c.restore();
  c.save();c.translate(278,431);c.rotate(-.12);c.scale(1.2,1.2);drawFan(c,t*.7,true,true);c.restore();
  // A dotted flight path has space around it, with an animated yarn only on the upper arc.
  c.save();c.setLineDash([3,10]);c.strokeStyle='#c1956e';c.lineWidth=2;c.beginPath();c.moveTo(438,326);c.bezierCurveTo(471,353,474,397,505,413);c.bezierCurveTo(570,212,650,185,713,296);c.stroke();c.restore();
  const phase=(t*.14)%1;
  const bx=507+phase*205;
  const by=411-220*Math.sin(phase*Math.PI)-phase*100;
  drawYarn(c,bx,by,21,phase*5);
  drawYarn(c,275+Math.sin(t*.7)*3,246,24,t*.25);
  // The office's three cats: orange tabby Sharo, black Yuki, and white Hotate.
  drawCat(c,704,347,1.05,'yuki','idle',t);
  const basket={x:715,y:384,w:140,h:83};
  ellipse(c,715,433,87,10,'#6e765026');rr(c,645,342,140,83,9,'#dfc497','#b89160',2);rr(c,656,353,118,57,6,'#c7a373');
  drawYarn(c,716,393,23,.7);goalFront(c,basket);
  drawCat(c,401,550,1.03,'sharo','happy',t);
  drawCat(c,747,569,1.05,'hotate','idle',t+.8);
  // Ruler, tiny loose washer, and soft sparkles finish the handmade illustration.
  c.save();c.translate(560,520);c.rotate(-.11);rr(c,-53,-7,110,15,3,'#edd9a4','#bb9d63',1.3);
  for(let i=0;i<15;i++)line(c,[[-46+i*6.5,-6],[-46+i*6.5,i%5===0?3:-1]],'#ac915e',1);c.restore();
  ellipse(c,624,524,9,4,'#adba9a');ellipse(c,624,524,4,1.8,'#dfc394');
  spark(c,554,154,14,'#dbaa52');spark(c,192,363,10,'#e2b25e');spark(c,817,271,8,'#d1a567');
  line(c,[[559,177],[568,173]],'#cba46c',2);line(c,[[578,160],[582,152]],'#cba46c',2);
  c.restore();
}

/** Small illustration for the success dialog, logical 460 x 290. */
export function drawWin(c,cat='sharo') {
  if(!c)return;c.save();c.clearRect(0,0,460,290);c.lineCap='round';c.lineJoin='round';
  ellipse(c,230,161,141,104,'#ecf0df');ellipse(c,230,239,119,15,'#b7c5a329');
  drawCat(c,222,246,1.22,typeof cat==='string'?cat:'sharo','happy',1.3);
  const g={x:300,y:210,w:93,h:59};rr(c,254,181,93,59,7,'#e4c799','#aa8b5e',1.7);rr(c,262,189,77,41,5,'#d4b37e');drawYarn(c,301,210,20,-.4);goalFront(c,g);
  star(c,124,97,20,'#e9be5f','#c39d50',-.2);star(c,336,91,17,'#efcc7c','#c9a760',.2);star(c,242,42,15,'#f0cf80','#c6a660');
  spark(c,98,169,10,'#8daf97');spark(c,365,166,9,'#d4ac57');
  for(const [x,y,a,col]of[[137,57,.3,'#dca58b'],[367,120,-.6,'#9aba9b'],[170,32,-.4,'#a0b998'],[97,127,.6,'#cfb47b'],[315,44,.7,'#dca58b']]){
    c.save();c.translate(x,y);c.rotate(a);rr(c,-3,-6,6,12,2,col);c.restore();
  }
  c.restore();
}
