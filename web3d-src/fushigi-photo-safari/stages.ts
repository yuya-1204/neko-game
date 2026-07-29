import type { LearningKind, LearningQuestion, StageDefinition } from "../shared/types";

interface SafariStageSeed {
  title: string;
  description: string;
  route: string;
  subject: string;
  question: LearningQuestion;
}

interface SafariAreaSeed {
  area: string;
  palette: [string, string, string];
  biome: string;
  stages: SafariStageSeed[];
}

function question(
  kind: LearningKind,
  prompt: string,
  choices: [string, string, string],
  answer: number,
  hint: string,
  speak?: string
): LearningQuestion {
  return { kind, prompt, choices, answer, hint, speak };
}

const safariAreas: SafariAreaSeed[] = [
  {
    area: "ひだまり草原",
    palette: ["#70cff5", "#82d66f", "#ffe27b"],
    biome: "meadow",
    stages: [
      {
        title: "ちょうちょの 野原",
        description: "花のまわりを飛ぶちょうちょを、そっと近くから撮影します。",
        route: "flower-field",
        subject: "ちょうちょ",
        question: question("ひらがな", "「ちょうちょ」の はじめの もじは？", ["ち", "よ", "う"], 0, "ちょうちょは「ち」から始まるよ。")
      },
      {
        title: "ウサギの かくれんぼ",
        description: "草むらから顔を出すウサギを探し、動きをよく見ます。",
        route: "burrow-loop",
        subject: "ウサギ",
        question: question("カタカナ", "「ウサギ」と おなじ よみかたは？", ["うなぎ", "うさぎ", "うきわ"], 1, "ウ・サ・ギ と読もう。")
      },
      {
        title: "ひよこの おさんぽ",
        description: "親鳥について歩くひよこの列を追い、全員を写真に収めます。",
        route: "chick-trail",
        subject: "ひよこ",
        question: question("たしざん", "ひよこが 3わ。4わ きたら ぜんぶで？", ["6わ", "7わ", "8わ"], 1, "3から4つ先まで数えよう。")
      },
      {
        title: "こりすと 木の実",
        description: "木から木へ走るこりすを追って、草原の端まで探検します。",
        route: "acorn-zigzag",
        subject: "こりす",
        question: question("ひきざん", "木の実が 8こ。3こ たべたら のこりは？", ["4こ", "5こ", "6こ"], 1, "8から3つもどろう。")
      },
      {
        title: "おひるの 草原アルバム",
        description: "丘・池・花畑を一周し、草原の仲間をまとめて撮影します。",
        route: "meadow-grand-tour",
        subject: "草原のなかま",
        question: question("とけい", "ながい はりが12、みじかい はりが12。なんじ？", ["11じ", "12じ", "1じ"], 1, "短い針も長い針も12だよ。")
      }
    ]
  },
  {
    area: "ささやきの森",
    palette: ["#4cae87", "#296b58", "#ffd279"],
    biome: "forest",
    stages: [
      {
        title: "こもれびキツネ",
        description: "木漏れ日の道に残る足あとをたどり、キツネを見つけます。",
        route: "fox-tracks",
        subject: "きつね",
        question: question("ひらがな", "「きつね」の さいごの もじは？", ["き", "つ", "ね"], 2, "き・つ・ね。最後の音は「ね」。")
      },
      {
        title: "フクロウの 森",
        description: "高い枝を見上げ、静かにとまるフクロウを撮影します。",
        route: "owl-canopy",
        subject: "フクロウ",
        question: question("カタカナ", "「フクロウ」は どれ？", ["ふくろう", "ふうせん", "ふくろ"], 0, "フ・ク・ロ・ウ と読もう。")
      },
      {
        title: "しかの 泉",
        description: "森の泉をめぐるしかの家族を、いろいろな向きから撮ります。",
        route: "deer-spring",
        subject: "しか",
        question: question("たしざん", "しかが 5とう。3とう きたら ぜんぶで？", ["7とう", "8とう", "9とう"], 1, "5に3を足そう。")
      },
      {
        title: "あらいぐまの 夜食",
        description: "岩かげや丸太の裏を探し、食べ物を運ぶあらいぐまを追います。",
        route: "raccoon-log",
        subject: "あらいぐま",
        question: question("ひきざん", "木の実が 11こ。4こ はこぶと のこりは？", ["6こ", "7こ", "8こ"], 1, "11から4を引こう。")
      },
      {
        title: "よる7じの 森",
        description: "月明かりの森で、昼とは違う生き物たちを撮影します。",
        route: "night-forest",
        subject: "夜のなかま",
        question: question("とけい", "ながい はりが12、みじかい はりが7。なんじ？", ["6じ", "7じ", "8じ"], 1, "短い針が7をさしているよ。")
      }
    ]
  },
  {
    area: "きらめき水辺",
    palette: ["#58cef2", "#3e9fc0", "#f2fb9a"],
    biome: "wetland",
    stages: [
      {
        title: "かわせみダイブ",
        description: "水面近くを飛ぶかわせみを、橋と中州からねらいます。",
        route: "kingfisher-river",
        subject: "かわせみ",
        question: question("ひらがな", "「かわせみ」は なんもじ？", ["3もじ", "4もじ", "5もじ"], 1, "か・わ・せ・み と数えよう。")
      },
      {
        title: "カワウソすべり台",
        description: "川岸をすべるカワウソを追い、楽しい瞬間を撮ります。",
        route: "otter-slide",
        subject: "カワウソ",
        question: question("カタカナ", "「カワウソ」の よみかたは？", ["かわうそ", "かわぞこ", "かわぐち"], 0, "カ・ワ・ウ・ソ と読もう。")
      },
      {
        title: "かえるの 合唱",
        description: "ハスの葉をめぐり、歌っているかえるを一匹ずつ撮影します。",
        route: "frog-pond",
        subject: "かえる",
        question: question("たしざん", "かえるが 6ぴき。5ひき きたら ぜんぶで？", ["10ぴき", "11ぴき", "12ひき"], 1, "6から5つ先まで数えよう。")
      },
      {
        title: "さかなの 銀河",
        description: "透明な浅瀬を歩き、群れになって泳ぐ魚を見つけます。",
        route: "fish-shallows",
        subject: "さかな",
        question: question("ひきざん", "魚が 15ひき。6ぴき かくれると 見えるのは？", ["8ひき", "9ひき", "10ぴき"], 1, "15から6を引こう。")
      },
      {
        title: "ごご3じの 水辺",
        description: "滝、橋、池をめぐるロングコースで、水辺図鑑を仕上げます。",
        route: "wetland-grand-tour",
        subject: "水辺のなかま",
        question: question("とけい", "ながい はりが6、みじかい はりは3と4の あいだ。なんじはん？", ["2じはん", "3じはん", "4じはん"], 1, "長い針が6なら半。短い針は3を過ぎたところ。")
      }
    ]
  },
  {
    area: "夕焼け砂丘",
    palette: ["#ffab68", "#e9c06c", "#9c65bd"],
    biome: "desert",
    stages: [
      {
        title: "すなの ねこ",
        description: "足あとが風で消える前にたどり、砂漠のねこを探します。",
        route: "sand-cat-tracks",
        subject: "すなのねこ",
        question: question("ひらがな", "「すなねこ」の 3ばんめの もじは？", ["す", "な", "ね"], 2, "す・な・ね・こ。3番目は「ね」。")
      },
      {
        title: "ラクダの オアシス",
        description: "砂丘を越えてオアシスへ向かうラクダの隊列を撮ります。",
        route: "camel-oasis",
        subject: "ラクダ",
        question: question("カタカナ", "「ラクダ」と おなじ よみかたは？", ["らくだ", "らっぱ", "だくだく"], 0, "ラ・ク・ダ と読もう。")
      },
      {
        title: "ミーアキャット見張り隊",
        description: "岩山で立ち上がる見張り役を、遠くと近くから撮影します。",
        route: "meerkat-ridge",
        subject: "ミーアキャット",
        question: question("たしざん", "見張りが 7ひき。6ぴき ふえると ぜんぶで？", ["12ひき", "13びき", "14ひき"], 1, "7に6を足そう。")
      },
      {
        title: "フェネックの 星砂",
        description: "大きな耳を目印に、岩穴を行き来するフェネックを追います。",
        route: "fennec-caves",
        subject: "フェネック",
        question: question("ひきざん", "星砂が 17こ。8こ こぼすと のこりは？", ["8こ", "9こ", "10こ"], 1, "17から8を引こう。")
      },
      {
        title: "ごご6じの 砂丘",
        description: "長い影をたよりに砂漠を一周し、夕暮れの生き物を集めます。",
        route: "desert-sunset-tour",
        subject: "砂丘のなかま",
        question: question("とけい", "ながい はりが12、みじかい はりが6。なんじ？", ["5じ", "6じ", "7じ"], 1, "短い針が6をさしているよ。")
      }
    ]
  },
  {
    area: "白銀の山",
    palette: ["#a5ddf5", "#dceaf5", "#81b6d7"],
    biome: "snow",
    stages: [
      {
        title: "ゆきうさぎの 足あと",
        description: "新雪に残った小さな足あとを追い、雪うさぎを撮影します。",
        route: "snow-hare",
        subject: "ゆきうさぎ",
        question: question("ひらがな", "「ゆきうさぎ」の はじめと さいごは？", ["ゆ・ぎ", "ゆ・き", "き・ぎ"], 0, "ゆきうさぎは「ゆ」から始まり「ぎ」で終わるよ。")
      },
      {
        title: "ペンギン氷上パレード",
        description: "氷の橋を渡るペンギンを、隊列がそろった瞬間に撮ります。",
        route: "penguin-parade",
        subject: "ペンギン",
        question: question("カタカナ", "「ペンギン」は どれ？", ["ぺんぎん", "ぺんき", "ぺんだこ"], 0, "ペ・ン・ギ・ン と読もう。")
      },
      {
        title: "しろくまの 魚つり",
        description: "氷の穴をめぐるしろくま親子の決定的な一枚を撮ります。",
        route: "polar-fishing",
        subject: "しろくま",
        question: question("たしざん", "魚を 8ひき つり、9ひき ふえたら？", ["16ひき", "17ひき", "18ひき"], 1, "8に9を足そう。")
      },
      {
        title: "オオカミの 峠",
        description: "遠吠えを聞き分け、雪の峠を走るオオカミを探します。",
        route: "wolf-pass",
        subject: "オオカミ",
        question: question("ひきざん", "足あとが 19こ。9こ 雪で消えると のこりは？", ["9こ", "10こ", "11こ"], 1, "19から9を引こう。")
      },
      {
        title: "あさ8じの 雪山",
        description: "山頂、氷湖、針葉樹の森をめぐり、雪山図鑑を完成させます。",
        route: "snow-grand-tour",
        subject: "雪山のなかま",
        question: question("とけい", "ながい はりが6、みじかい はりは8と9の あいだ。なんじはん？", ["7じはん", "8じはん", "9じはん"], 1, "長い針が6なら半。短い針は8を過ぎたところ。")
      }
    ]
  },
  {
    area: "月光ひみつ谷",
    palette: ["#4252a0", "#7d69c9", "#9af4de"],
    biome: "moon-valley",
    stages: [
      {
        title: "ひかる こじか",
        description: "月の花が咲く谷で、淡く光るこじかを探します。",
        route: "glow-fawn",
        subject: "ひかるこじか",
        question: question("ひらがな", "「つきあかり」は なんもじ？", ["4もじ", "5もじ", "6もじ"], 1, "つ・き・あ・か・り と数えよう。")
      },
      {
        title: "ユニコーンの 泉",
        description: "虹色の足あとをたどり、泉に現れるユニコーンを撮ります。",
        route: "unicorn-spring",
        subject: "ユニコーン",
        question: question("カタカナ", "「ユニコーン」の はじめの もじは？", ["ニ", "ユ", "コ"], 1, "ユ・ニ・コーン。最初は「ユ」。")
      },
      {
        title: "星ぎつねの 家族",
        description: "星明かりの岩場で遊ぶきつねの家族を、全員見つけます。",
        route: "star-fox-family",
        subject: "星ぎつね",
        question: question("たしざん", "星ぎつねが 9ひき。7ひき きたら ぜんぶで？", ["15ひき", "16ぴき", "17ひき"], 1, "9に7を足そう。")
      },
      {
        title: "月うさぎの 遺跡",
        description: "古い石門と浮かぶ岩をめぐり、すばやい月うさぎを追います。",
        route: "moon-rabbit-ruins",
        subject: "月うさぎ",
        question: question("ひきざん", "月の石が 20こ。8こ 光ると 光らないのは？", ["11こ", "12こ", "13こ"], 1, "20から8を引こう。")
      },
      {
        title: "よる10じの 夢アルバム",
        description: "六つの生息地につながる谷で、最後の幻獣写真を集めます。",
        route: "dream-finale",
        subject: "ひみつ谷のなかま",
        question: question("とけい", "ながい はりが6、みじかい はりは10と11の あいだ。なんじはん？", ["9じはん", "10じはん", "11じはん"], 1, "長い針が6なら半。短い針は10を過ぎたところ。")
      }
    ]
  }
];

export const safariStages: StageDefinition[] = safariAreas.flatMap((area, areaIndex) =>
  area.stages.map((seed, stageIndex) => {
    const globalIndex = areaIndex * 5 + stageIndex;
    const targets = 3 + Math.floor(globalIndex / 6) + (stageIndex === 4 ? 1 : 0);
    const bonusTargets = Math.min(targets, 2 + areaIndex + Math.floor(stageIndex / 2));
    return {
      id: `safari-${String(globalIndex + 1).padStart(2, "0")}`,
      area: area.area,
      areaIndex,
      title: seed.title,
      description: seed.description,
      mission: `${seed.subject}たちを ${targets}ひき 撮影し、足あとを ${bonusTargets}こ 見つけよう！`,
      learning: seed.question.kind,
      difficulty: areaIndex < 2 ? 1 : areaIndex < 4 ? 2 : 3,
      palette: area.palette,
      seed: 2207 + globalIndex * 89,
      targets,
      bonusTargets,
      question: seed.question,
      variant: `${area.biome}:${seed.route}:${seed.subject}`
    };
  })
);

export const SAFARI_AREA_COUNT = safariAreas.length;
