const part = (kind, x, y, angle = 0, id = kind) => ({ id, kind, x, y, angle });
const ramp = (x, y, angle = .35, id = 'ramp1') => part('ramp', x, y, angle, id);
const spring = (x, y, angle = 0, id = 'spring1') => part('spring', x, y, angle, id);
const fan = (x, y, angle = 0, id = 'fan1') => part('fan', x, y, angle, id);
const bumper = (x, y, id = 'bumper1') => part('bumper', x, y, 0, id);
const goal = (x, y, w = 150, h = 64) => ({ x, y, w, h });
const box = (x, y, w, h, angle = 0) => ({ x, y, w, h, angle });
function stage(id, title, spawn, target, solution, extras = {}) {
  const chapter = Math.floor((id - 1) / 6);
  const inventory = { ramp: 0, spring: 0, fan: 0, bumper: 0 };
  solution.forEach(p => inventory[p.kind]++);
  return { id, title, chapter, cat: ['sharo', 'yuki', 'hotate'][chapter], spawn, goal: target, solution,
    intro: '', hint: '', obstacles: [], inventory, stars: [], par: solution.length, ...extras };
}
export const LEVELS = [
  stage(1, 'ころころ はじめの一歩', { x: 190, y: 90 }, goal(493, 452), [ramp(235, 220, .32)], {
    intro: 'さかを おいて、けいとだまを ねこに とどけよう！', hint: 'けいとだまの 下に、右さがりの さかを おこう。',
  }),
  stage(2, 'ゆきへ おとどけ', { x: 755, y: 85 }, goal(437, 450), [ramp(700, 218, -.38)], {
    intro: 'こんどは ひだりへ ころころ。', hint: 'さかの 左がわを さげてみよう。', cat: 'yuki',
  }),
  stage(3, 'くねくね すべり台', { x: 180, y: 65 }, goal(667, 456), [ramp(230, 165, .4), ramp(390, 294, .28, 'ramp2')], {
    intro: 'ふたつの さかを つないでみよう。', hint: 'ひとつめの さかから とび出す先に、もうひとつ おこう。',
  }),
  stage(4, 'ばねで ぴょーん', { x: 220, y: 165 }, goal(723, 320), [spring(240, 385, .34)], {
    intro: 'ばねの むきを かえて、ぴょーん！', hint: 'ばねを 少し 右に かたむけると、右上に とべるよ。',
  }),
  stage(5, 'ふわっと かぜ便', { x: 260, y: 110 }, goal(389, 452), [fan(160, 255, 0)], {
    intro: 'かぜで けいとだまを おしてみよう。', hint: 'けいとだまが 落ちる道の 左に、せんぷうきを おこう。',
  }),
  stage(6, 'ぽよんと ごあいさつ', { x: 335, y: 80 }, goal(747, 450), [bumper(310, 290)], {
    intro: 'ぽよんに 当てて、ほたてに とどけよう。', hint: 'ぽよんの 右上に 当たると、右へ はずむよ。', cat: 'hotate',
  }),
  stage(7, '花だんを こえて', { x: 170, y: 80 }, goal(480, 446), [ramp(218, 205, .35)], {
    intro: '花だんを とびこえて おとどけ！', hint: 'さかの はしから とび出す いきおいを つかおう。', obstacles: [box(330, 493, 70, 94)],
  }),
  stage(8, '風の トンネル', { x: 195, y: 100 }, goal(480, 456, 160), [fan(110, 270, 0), ramp(290, 395, .25)], {
    intro: 'かぜと さかを くみあわせよう。', hint: 'かぜで 右へ。さかで その先へ ころがそう。', obstacles: [box(470, 195, 250, 25)],
  }),
  stage(9, 'お花の エレベーター', { x: 250, y: 220 }, goal(580, 220), [spring(266, 425, .29)], {
    intro: '高いところの ゆきに とどけよう。', hint: 'ばねを 少し 右へ かたむけて、高いかごを ねらおう。',
  }),
  stage(10, 'ひだりへ ぴょーん', { x: 740, y: 100 }, goal(156, 360), [spring(720, 397, -.38)], {
    intro: 'ばねを まわして、ひだりへ ジャンプ！', hint: 'ばねの 右がわを 高くすると、左上に とべるよ。', cat: 'sharo', obstacles: [box(600, 486, 64, 108)],
  }),
  stage(11, 'おひるね ジグザグ', { x: 270, y: 60 }, goal(415, 454), [ramp(325, 172, .4), bumper(560, 350)], {
    intro: 'すべって、はずんで、ねこへ！', hint: 'さかの先の ぽよんを うごかすと、はずむ向きが かわるよ。',
  }),
  stage(12, 'にわの 大はっけん', { x: 170, y: 75 }, goal(730, 430), [ramp(220, 180, .38), fan(280, 275, -.2)], {
    intro: 'さかの あとは、かぜに おまかせ。', hint: 'さかを 出た けいとだまの 左から、かぜを 当てよう。', cat: 'hotate', obstacles: [box(550, 505, 90, 70)],
  }),
  stage(13, '月まで ぴょーん', { x: 225, y: 180 }, goal(661, 265), [spring(245, 418, .37)], {
    intro: '月の こうぼうへ ようこそ！', hint: '高いかごには、ばねで 大きく ジャンプ。',
  }),
  stage(14, '星の すべり台', { x: 750, y: 70 }, goal(274, 450), [ramp(704, 172, -.42), ramp(535, 310, -.28, 'ramp2')], {
    intro: 'ふたつの さかで、星の道を つくろう。', hint: '右上から 左下へ、さかを つなげてみよう。', cat: 'yuki',
  }),
  stage(15, 'ぎゃくむきの かぜ', { x: 740, y: 110 }, goal(622, 448), [fan(825, 260, Math.PI)], {
    intro: 'せんぷうきを くるり。かぜは ひだりへ！', hint: 'せんぷうきの むきを 左に かえてみよう。', obstacles: [box(635, 505, 90, 70)],
  }),
  stage(16, 'ぽよんの 流れ星', { x: 650, y: 75 }, goal(240, 440), [bumper(674, 286)], {
    intro: 'ぽよんの 左がわに 当ててみよう。', hint: 'ぽよんを 少し 右に おくと、けいとだまは 左へ はずむよ。',
  }),
  stage(17, '星を わたる橋', { x: 190, y: 70 }, goal(820, 435, 190), [ramp(242, 178, .35), fan(375, 350, -.1), ramp(570, 385, .1, 'ramp2')], {
    intro: 'さか、かぜ、さか。星の橋を つなごう。', hint: '右へ 行く力が 足りないときは、かぜを 少し 上むきに。',
  }),
  stage(18, '三びきの 大実験', { x: 180, y: 70 }, goal(720, 325), [ramp(224, 175, .4), spring(470, 415, .15), fan(860, 270, Math.PI)], {
    intro: 'さいごは 大実験！じぶんの 発明で とどけよう。', hint: 'さかで ばねへ。右からの かぜで、とびすぎを おさえよう。',
  }),
];
// Optional stars follow an achievable route. They never participate in the win condition.
const STAR_PAIRS = [
  [[226,193],[372,252]], [[723,184],[563,257]], [[261,153],[460,290]],
  [[260,296],[519,151]], [[280,253],[365,392]], [[345,244],[584,267]],
  [[211,178],[367,251]], [[210,268],[400,400]], [[255,385],[439,183]],
  [[726,346],[391,189]], [[348,157],[533,283]], [[222,156],[421,240]],
  [[225,361],[471,200]], [[680,158],[484,301]], [[720,253],[642,392]],
  [[640,238],[409,248]], [[260,160],[460,307]], [[351,210],[663,177]],
];
LEVELS.forEach((level, i) => { level.stars = STAR_PAIRS[i].map(([x,y]) => ({ x, y })); });
export const SANDBOX = { id: 'free', title: 'じゆうな はつめい', chapter: 0, cat: 'sharo',
  intro: 'すきな 道具で、じぶんだけの しかけを つくろう！', hint: '何どでも ためせるよ。道具を たくさん つかってみよう。',
  spawn: { x: 180, y: 85 }, goal: goal(770, 450, 150), obstacles: [],
  inventory: { ramp: 8, spring: 5, fan: 5, bumper: 6 }, stars: [], solution: [], par: 24,
};
