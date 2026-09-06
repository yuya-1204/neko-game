/** Every colour is a separate matching identity. No network or account is needed. */
export const ITEM_IDS = Object.freeze([
  'drink-strawberry', 'drink-melon', 'drink-soda', 'drink-orange', 'drink-grape', 'drink-lemon',
  'toy-red-car', 'toy-blue-car', 'toy-yellow-car', 'toy-rocket', 'toy-duck', 'toy-robot',
  'sweet-cookie', 'sweet-choco', 'sweet-donut-pink', 'sweet-donut-blue', 'sweet-cupcake', 'sweet-candy',
  'plush-bear-brown', 'plush-bear-cream', 'plush-rabbit-pink', 'plush-rabbit-blue', 'plush-cat-black', 'plush-cat-white',
  'flower-pink', 'flower-blue', 'flower-yellow', 'flower-purple', 'flower-orange', 'flower-white',
]);

export const CHAPTERS = Object.freeze([
  { title: 'はじめてのお店', subtitle: '3つそろえる、をやってみよう', cat: 'sharo' },
  { title: 'にぎやか商店街', subtitle: '奥の小物も、こんにちは', cat: 'yuki' },
  { title: 'いろどりマルシェ', subtitle: '色のちがいを、よく見てね', cat: 'hotate' },
  { title: 'ほしぞら百貨店', subtitle: 'みんなのお店を、すっきり！', cat: 'sharo' },
]);

// Each chapter introduces a different mix of all five categories. In later
// chapters similar shapes in different colours deliberately appear together.
const CHAPTER_ITEMS = [
  ['drink-strawberry', 'toy-red-car', 'sweet-cookie', 'plush-bear-brown', 'flower-pink', 'drink-melon'],
  ['drink-soda', 'toy-rocket', 'sweet-choco', 'plush-rabbit-pink', 'flower-yellow', 'toy-duck', 'sweet-cupcake', 'flower-orange', 'toy-robot', 'sweet-candy'],
  ['drink-orange', 'toy-yellow-car', 'sweet-donut-pink', 'plush-rabbit-blue', 'flower-purple', 'drink-grape', 'sweet-donut-blue', 'plush-rabbit-pink', 'flower-white', 'drink-lemon'],
  ['drink-strawberry', 'plush-bear-brown', 'toy-red-car', 'sweet-donut-pink', 'flower-pink', 'drink-melon', 'plush-bear-cream', 'toy-blue-car', 'sweet-donut-blue', 'flower-blue', 'plush-cat-black', 'plush-cat-white'],
];
const TITLES = [
  '3つで、すっきり！', '奥からこんにちは', 'あいた棚をつかおう', 'おもちゃの日', 'こものパーティー', 'はじめての店長さん',
  'ソーダとロケット', 'うさぎのおみせ', 'おはなとおやつ', '棚のおくのおく', 'たくさん並べよう', '商店街のおてつだい',
  'ピンク？ あお？', 'にている、ちがう', 'ふたごのドーナツ', 'いろどりいっぱい', 'マルシェのおおだな', 'おかたづけ名人',
  'ほしぞら開店', 'くまとねこの日', 'ふたつのいろ', 'お店はおおにぎわい', 'とっておきの棚', 'みんなで、すっきり！',
];
const SPECS = [
  // types, shelves, maximum layers (front included), triples, seconds
  [3, 4, 2, 3, 150], [3, 4, 2, 4, 150], [4, 4, 2, 4, 155],
  [4, 5, 2, 5, 155], [5, 5, 2, 6, 165], [6, 5, 2, 7, 175],
  [6, 5, 3, 8, 175], [6, 6, 3, 9, 180], [7, 6, 3, 10, 185],
  [7, 6, 3, 11, 190], [8, 6, 3, 12, 195], [8, 6, 3, 13, 200],
  [8, 7, 3, 14, 205], [8, 7, 3, 15, 210], [9, 7, 3, 16, 215],
  [9, 7, 4, 17, 215], [10, 7, 4, 18, 220], [10, 7, 4, 19, 225],
  [10, 8, 4, 20, 225], [10, 8, 4, 21, 230], [11, 8, 4, 22, 235],
  [11, 8, 4, 23, 235], [12, 8, 4, 24, 240], [12, 8, 4, 25, 240],
];

export const LEVELS = Object.freeze(SPECS.map(([typeCount, shelfCount, layerCount, groups, timeLimit], index) => {
  const chapter = Math.floor(index / 6);
  const itemPool = CHAPTER_ITEMS[chapter];
  const offset = chapter === 1 ? index % 6 : 0;
  return Object.freeze({
    id: index + 1,
    title: TITLES[index],
    chapter,
    cat: CHAPTERS[chapter].cat,
    typeCount, shelfCount, layerCount, groups, timeLimit,
    items: Object.freeze(Array.from({ length: typeCount }, (_, n) => itemPool[(n + offset) % itemPool.length])),
    // The timer rewards fluent sorting without rushing the first explanation.
    parMoves: groups * 3,
  });
}));

export function getLevel(id) {
  return LEVELS.find(level => level.id === Number(id)) || LEVELS[0];
}
