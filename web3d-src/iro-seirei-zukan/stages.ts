import type { LearningQuestion, StageDefinition } from "../shared/types";

const chapterTitles = [
  "にじの げんかん",
  "ことばの もり",
  "カタカナ アトリエ",
  "かずの キッチン",
  "わけっこ ひろば",
  "とけいの とう"
] as const;

const titles = [
  ["あかい ほのお", "きいろい おひさま", "みどりの はっぱ", "あおい しずく", "にじいろの とびら"],
  ["あさの ことば", "ねこの ことば", "そらの ことば", "はなの ことば", "もじの おまつり"],
  ["ピンクの リボン", "オレンジの ランプ", "ブルーの ガラス", "グリーンの ボタン", "カラフル アトリエ"],
  ["しずくを 3こ", "ふたつの おさら", "みんなで なんこ", "10こに しよう", "にじの レシピ"],
  ["のこりは いくつ", "3びきに わけよう", "へった しずく", "おさらを かたづけよう", "わけっこ パーティー"],
  ["あさ 7じ", "おやつは 3じ", "6じはんの ごはん", "9じ15ふんの ほし", "とけいとうの おまつり"]
] as const;

const descriptions = [
  ["あかいものを みつけよう", "あたたかい きいろを あつめよう", "はっぱの みどりを さがそう", "みずの あおを みつけよう", "5つの いろを つなげよう"],
  ["『あ』から はじまる ことば", "ねこの なまえを ならべよう", "そらに ある ことばを さがそう", "はなの もじを つなごう", "ひらがなを ぜんぶ とどけよう"],
  ["カタカナの いろを えらぼう", "ランプの なまえを よもう", "ブルーの かけらを あつめよう", "ボタンを カタカナで よもう", "カタカナの かんばんを なおそう"],
  ["しずくを かぞえて まぜよう", "ふたつの かずを あわせよう", "せいれいの ぶんも たそう", "10こに なる くみあわせ", "いろと かずの おおきな レシピ"],
  ["つかった あとの かずを みよう", "おなじ かずずつ わけよう", "とんでいった ぶんを ひこう", "のこった おさらを かぞえよう", "みんなで じょうずに わけよう"],
  ["あさの とけいを あわせよう", "3じに おやつを とどけよう", "6じはんに しょくどうを ひらこう", "9じ15ふんに ほしを よぼう", "4つの じこくを じゅんに あわせよう"]
] as const;

const palettes: [string, string, string][][] = [
  [
    ["#ff5c62", "#ff9c63", "#ffd15c"],
    ["#ffd95c", "#fff0a2", "#ff9a58"],
    ["#56c878", "#a8e063", "#2f9b78"],
    ["#4ebcff", "#6b8cff", "#8ee9ff"],
    ["#ff6f91", "#ffd65c", "#5ed7a1"]
  ],
  [
    ["#ff8d6d", "#ffd875", "#f3b7d5"],
    ["#c88bf4", "#ff8fb1", "#7cc9ff"],
    ["#6da8ff", "#b1e1ff", "#f7d783"],
    ["#ff7fab", "#85d98b", "#fff0a8"],
    ["#916be9", "#5dd3ca", "#ffbc66"]
  ],
  [
    ["#ff80b7", "#ffc6dc", "#8b68d8"],
    ["#ff994f", "#ffd06c", "#cb5f35"],
    ["#4f9cff", "#85ddff", "#3859b8"],
    ["#58c983", "#a7e65f", "#2f8c67"],
    ["#ff6d85", "#ffd85c", "#5ad3c5"]
  ],
  [
    ["#ff7c65", "#ffd15a", "#52c99b"],
    ["#4ebdff", "#7e79ef", "#ff8cc0"],
    ["#ffd15b", "#ff8c60", "#5dcc8b"],
    ["#57c7ff", "#8e77f0", "#ffc454"],
    ["#ff6f8e", "#5ed3c4", "#ffd85d"]
  ],
  [
    ["#735de3", "#5fc4ff", "#ff8dba"],
    ["#ff995d", "#ffd365", "#55ca91"],
    ["#58bfff", "#8273ed", "#f178b0"],
    ["#ffc45d", "#ff7f6a", "#69ce91"],
    ["#8a68e8", "#56d1c1", "#ffd361"]
  ],
  [
    ["#ffbd57", "#ff755f", "#73c6ff"],
    ["#ff8e6e", "#ffd55e", "#856ce8"],
    ["#496fd4", "#71c8ff", "#ffd46a"],
    ["#6249b8", "#a573ef", "#e6c5ff"],
    ["#ff6f91", "#ffd45d", "#5fd0bd"]
  ]
];

const variants = [
  ["color-red", "color-yellow", "color-green", "color-blue", "color-rainbow"],
  ["word-a", "word-neko", "word-sora", "word-hana", "word-festival"],
  ["kana-pink", "kana-orange", "kana-blue", "kana-green", "kana-colorful"],
  ["add-three", "add-plates", "add-friends", "add-ten", "add-recipe"],
  ["sub-left", "sub-share", "sub-fly", "sub-plates", "sub-party"],
  ["clock-seven", "clock-three", "clock-six-thirty", "clock-nine-fifteen", "clock-festival"]
];

const hiraganaQuestions: LearningQuestion[] = [
  { prompt: "「あ」から はじまるのは どれ？", choices: ["あめ", "ねこ", "そら"], answer: 0, hint: "あ・め。さいしょの おとを きこう。", kind: "ひらがな" },
  { prompt: "「ねこ」の さいしょの もじは？", choices: ["め", "ね", "れ"], answer: 1, hint: "ね・こ と ゆっくり いってみよう。", kind: "ひらがな" },
  { prompt: "そらに あるものは どれ？", choices: ["くも", "いす", "くつ"], answer: 0, hint: "おそらを みあげると みえるよ。", kind: "ひらがな" },
  { prompt: "「はな」は どの じゅんばん？", choices: ["は・な", "な・は", "は・は"], answer: 0, hint: "は、つぎに な。", kind: "ひらがな" },
  { prompt: "「もじ」の さいごの もじは？", choices: ["も", "し", "じ"], answer: 2, hint: "も・じ。さいごの おとだよ。", kind: "ひらがな" }
];

const katakanaQuestions: LearningQuestion[] = [
  { prompt: "「ピンク」は どれ？", choices: ["ピンク", "ビンク", "ピソク"], answer: 0, hint: "ピ・ン・ク と よもう。", kind: "カタカナ" },
  { prompt: "「ランプ」の さいしょは？", choices: ["ラ", "フ", "ワ"], answer: 0, hint: "ラ・ン・プ。", kind: "カタカナ" },
  { prompt: "「ブルー」の まんなかは？", choices: ["ル", "ラ", "ロ"], answer: 0, hint: "ブ・ルー と よもう。", kind: "カタカナ" },
  { prompt: "「ボタン」は どれ？", choices: ["ポタン", "ボタン", "ホタン"], answer: 1, hint: "てんてんが ついた ボ だよ。", kind: "カタカナ" },
  { prompt: "いろが いっぱい、は どれ？", choices: ["カラフル", "カメラ", "カラカラ"], answer: 0, hint: "カ・ラ・フ・ル。", kind: "カタカナ" }
];

function additionQuestion(index: number): LearningQuestion {
  const pairs = [[2, 3], [4, 3], [5, 4], [6, 4], [8, 7]] as const;
  const [a, b] = pairs[index]!;
  const answer = a + b;
  return {
    prompt: `${a}こ と ${b}こ。あわせて なんこ？`,
    choices: [`${answer - 1}こ`, `${answer}こ`, `${answer + 1}こ`],
    answer: 1,
    hint: `${a}から ${b}こ、ゆびで すすめよう。`,
    kind: "たしざん"
  };
}

function subtractionQuestion(index: number): LearningQuestion {
  const pairs = [[6, 2], [8, 3], [10, 4], [13, 5], [18, 7]] as const;
  const [a, b] = pairs[index]!;
  const answer = a - b;
  return {
    prompt: `${a}こ から ${b}こ つかったよ。のこりは？`,
    choices: [`${answer + 1}こ`, `${answer - 1}こ`, `${answer}こ`],
    answer: 2,
    hint: `${a}から ${b}かい、ひとつずつ もどろう。`,
    kind: "ひきざん"
  };
}

const clockQuestions: LearningQuestion[] = [
  { prompt: "あさ 7じは どれ？", choices: ["7:00", "5:00", "7:30"], answer: 0, hint: "ながい はりは 12、みじかい はりは 7。", kind: "とけい" },
  { prompt: "おやつの 3じは どれ？", choices: ["3:30", "3:00", "6:00"], answer: 1, hint: "ながい はりが 12なら、ちょうど。", kind: "とけい" },
  { prompt: "6じはんは どれ？", choices: ["6:00", "6:15", "6:30"], answer: 2, hint: "はん、は 30ぷん。", kind: "とけい" },
  { prompt: "9じ15ふんは どれ？", choices: ["9:15", "9:05", "9:50"], answer: 0, hint: "ながい はりが 3で 15ぷん。", kind: "とけい" },
  { prompt: "4じの 30ぷんあと は？", choices: ["4:15", "4:30", "5:00"], answer: 1, hint: "30ぷんあと は 4じはん。", kind: "とけい" }
];

function questionFor(chapter: number, index: number): LearningQuestion {
  if (chapter === 0) {
    const colorWords = ["あか", "きいろ", "みどり", "あお", "にじ"];
    return {
      prompt: `「${colorWords[index]}」の さいしょの もじは？`,
      choices: index === 0 ? ["あ", "か", "お"] : index === 1 ? ["き", "い", "ろ"] : index === 2 ? ["み", "ど", "り"] : index === 3 ? ["あ", "お", "う"] : ["に", "じ", "い"],
      answer: 0,
      hint: `${colorWords[index]} と ゆっくり いってみよう。`,
      kind: "ひらがな"
    };
  }
  if (chapter === 1) return hiraganaQuestions[index]!;
  if (chapter === 2) return katakanaQuestions[index]!;
  if (chapter === 3) return additionQuestion(index);
  if (chapter === 4) return subtractionQuestion(index);
  return clockQuestions[index]!;
}

export const stages: StageDefinition[] = chapterTitles.flatMap((area, chapter) =>
  titles[chapter]!.map((title, index) => ({
    id: `spirit-${chapter + 1}-${index + 1}`,
    area,
    areaIndex: chapter,
    title,
    description: descriptions[chapter]![index]!,
    mission: `${descriptions[chapter]![index]!}。ひかりの しずくを あつめて、せいれいを よぼう。`,
    learning: questionFor(chapter, index).kind,
    difficulty: (index < 2 ? 1 : index < 4 ? 2 : 3) as 1 | 2 | 3,
    palette: palettes[chapter]![index]!,
    seed: 5100 + chapter * 101 + index * 17,
    targets: 3 + Math.min(index, 2),
    bonusTargets: 2,
    question: questionFor(chapter, index),
    variant: variants[chapter]![index]!
  }))
);
