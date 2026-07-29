import type { LearningKind, LearningQuestion, StageDefinition } from "../shared/types";

interface CloudStageSeed {
  title: string;
  description: string;
  route: string;
  question: LearningQuestion;
}

interface CloudAreaSeed {
  area: string;
  palette: [string, string, string];
  biome: string;
  stages: CloudStageSeed[];
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

const cloudAreas: CloudAreaSeed[] = [
  {
    area: "そよかぜ草原",
    palette: ["#72d9ff", "#7ee787", "#fff2a8"],
    biome: "meadow",
    stages: [
      {
        title: "はじめての そら",
        description: "やわらかな雲と草の島をぬける、はじめての飛行です。",
        route: "gentle",
        question: question("ひらがな", "「そら」の はじめの もじは？", ["そ", "ら", "さ"], 0, "そ・ら と ゆっくり読もう。")
      },
      {
        title: "ふうせんの こみち",
        description: "色とりどりの風船を目印に、ゆるやかなカーブを飛びます。",
        route: "balloon-curve",
        question: question("カタカナ", "「ネコ」と おなじ よみかたは？", ["ねこ", "いぬ", "とり"], 0, "ネ は ね、コ は こ と読むよ。")
      },
      {
        title: "みつばちリング",
        description: "花の島をめぐり、みつばちのようにリングをつなぎます。",
        route: "flower-eight",
        question: question("たしざん", "みつばちが 2ひき。3びき きたら ぜんぶで？", ["4ひき", "5ひき", "6ぴき"], 1, "2から 3つ数えてみよう。")
      },
      {
        title: "かぜぐるまの丘",
        description: "回る風車のあいだを通り、迷子の精霊を助けます。",
        route: "windmill-slalom",
        question: question("ひきざん", "風車が 6こ。2こ とまると、まわるのは？", ["3こ", "4こ", "5こ"], 1, "6から 2つもどろう。")
      },
      {
        title: "おひるの おかえり門",
        description: "高い丘から雲の谷へ下り、空域の大きな門をひらきます。",
        route: "hill-dive",
        question: question("とけい", "ながい はりが 12、みじかい はりが 1。なんじ？", ["12じ", "1じ", "6じ"], 1, "みじかい針が「時」を教えるよ。")
      }
    ]
  },
  {
    area: "にじしずく渓谷",
    palette: ["#56c7ff", "#c68cff", "#ffdf6e"],
    biome: "rainbow",
    stages: [
      {
        title: "にじの はし",
        description: "滝のしぶきにかかる虹を渡り、光のしずくを集めます。",
        route: "rainbow-bridge",
        question: question("ひらがな", "「にじ」の さいごの もじは？", ["に", "し", "じ"], 2, "に・じ。うしろの音を聞こう。")
      },
      {
        title: "キラキラたき",
        description: "光る滝を上へ上へと登る、たて長の飛行ルートです。",
        route: "waterfall-rise",
        question: question("カタカナ", "「ソラ」は どれ？", ["そら", "さら", "そり"], 0, "ソ は そ、ラ は ら。")
      },
      {
        title: "しずくの たしざん",
        description: "二つの小川を行き来して、青と桃色の精霊を集めます。",
        route: "twin-stream",
        question: question("たしざん", "青いしずく 4こ、桃色 3こ。ぜんぶで？", ["6こ", "7こ", "8こ"], 1, "4、5、6、7 と数えよう。")
      },
      {
        title: "うずまき雲の谷",
        description: "ゆっくり動く渦巻き雲をよけながら、谷を往復します。",
        route: "cloud-spiral",
        question: question("ひきざん", "しずくが 9こ。3こ つかうと のこりは？", ["5こ", "6こ", "7こ"], 1, "9から 3つもどろう。")
      },
      {
        title: "さんじの にじ門",
        description: "七色のリングを順番に通り、渓谷の空を明るくします。",
        route: "seven-colors",
        question: question("とけい", "ながい はりが 12、みじかい はりが 3。なんじ？", ["2じ", "3じ", "4じ"], 1, "みじかい針が 3をさしているよ。")
      }
    ]
  },
  {
    area: "夕焼け風車丘",
    palette: ["#ff9a73", "#f7c95c", "#b978e8"],
    biome: "sunset",
    stages: [
      {
        title: "あかね雲の かいだん",
        description: "夕焼け雲を階段のように登り、丘の頂上をめざします。",
        route: "sunset-stairs",
        question: question("ひらがな", "「ゆうやけ」の まんなかに ある もじは？", ["う", "や", "け"], 1, "ゆ・う・や・け。音を一つずつ数えよう。")
      },
      {
        title: "ヒカリ風車レース",
        description: "大きさの違う風車をくぐり、光の道をつなぎます。",
        route: "windmill-race",
        question: question("カタカナ", "「カゼ」の よみかたは？", ["かさ", "かぜ", "かぎ"], 1, "カ は か、ゼ は ぜ。")
      },
      {
        title: "ふたご丘の リング",
        description: "二つの丘を何度も渡る、長い波形のルートです。",
        route: "twin-hills",
        question: question("たしざん", "左の丘に 5ひき、右に 4ひき。ぜんぶで？", ["8ひき", "9ひき", "10ぴき"], 1, "5に 4を足そう。")
      },
      {
        title: "木の葉の かくれみち",
        description: "舞う木の葉を追い、岩のアーチの裏にいる精霊を探します。",
        route: "leaf-canyon",
        question: question("ひきざん", "木の葉が 12まい。5まい とんだら のこりは？", ["6まい", "7まい", "8まい"], 1, "12から 5つもどろう。")
      },
      {
        title: "ごじの 金色ゲート",
        description: "日が沈む前に金色の門へ帰る、夕焼け空域の大冒険です。",
        route: "golden-gate",
        question: question("とけい", "ながい はりが 12、みじかい はりが 5。なんじ？", ["4じ", "5じ", "6じ"], 1, "短い針を見よう。")
      }
    ]
  },
  {
    area: "月あかり星の森",
    palette: ["#273b8f", "#6967d8", "#f5e98c"],
    biome: "moon",
    stages: [
      {
        title: "ほしの ささやき",
        description: "光る木々の上を静かに飛び、小さな星精霊を見つけます。",
        route: "star-whisper",
        question: question("ひらがな", "「ほしぞら」は なんもじ？", ["3もじ", "4もじ", "5もじ"], 1, "ほ・し・ぞ・ら と数えよう。")
      },
      {
        title: "ムーンライト迷路",
        description: "月光の柱を目印に、森の上の分かれ道を進みます。",
        route: "moon-maze",
        question: question("カタカナ", "「ツキ」と おなじ よみかたは？", ["つき", "つぎ", "すき"], 0, "ツ は つ、キ は き。")
      },
      {
        title: "流れ星コンボ",
        description: "落ちてくる星を追いながら、連続リングに挑戦します。",
        route: "comet-combo",
        question: question("たしざん", "星が 7こ ひかり、5こ ふえたら？", ["11こ", "12こ", "13こ"], 1, "7から 5つ先まで数えよう。")
      },
      {
        title: "ふくろうの 木立",
        description: "ふくろうの合図で高さを変え、枝のトンネルをぬけます。",
        route: "owl-grove",
        question: question("ひきざん", "ふくろうが 14わ。6わ ねたら おきているのは？", ["7わ", "8わ", "9わ"], 1, "14から 6を引こう。")
      },
      {
        title: "はちじの 星座門",
        description: "星座の形に並んだリングを通り、夜空の門を完成させます。",
        route: "constellation",
        question: question("とけい", "ながい はりが 12、みじかい はりが 8。なんじ？", ["7じ", "8じ", "9じ"], 1, "短い針が 8をさしているよ。")
      }
    ]
  },
  {
    area: "雪雲オーロラ海",
    palette: ["#75d7ed", "#77f2c4", "#e7f3ff"],
    biome: "aurora",
    stages: [
      {
        title: "こおり雲の トンネル",
        description: "透き通る氷のアーチをくぐり、白い精霊を助けます。",
        route: "ice-tunnel",
        question: question("ひらがな", "「こおり」と おなじ はじめの もじは？", ["くも", "こなゆき", "そら"], 1, "こおりは「こ」から始まるよ。")
      },
      {
        title: "オーロラウェーブ",
        description: "ゆれる光のカーテンに沿って、波のように飛びます。",
        route: "aurora-wave",
        question: question("カタカナ", "「ユキ」は どれ？", ["ゆき", "ゆめ", "ゆび"], 0, "ユ は ゆ、キ は き。")
      },
      {
        title: "ペンギン島の おとどけ",
        description: "離れた氷島をめぐり、ペンギンの光を集めます。",
        route: "penguin-hop",
        question: question("たしざん", "ペンギンが 8わ。7わ きたら ぜんぶで？", ["14わ", "15わ", "16わ"], 1, "8に 7を足そう。")
      },
      {
        title: "ふぶきの らせん",
        description: "雪粒の流れを読み、高く低く続くらせんを進みます。",
        route: "blizzard-helix",
        question: question("ひきざん", "雪玉が 18こ。9こ つかったら のこりは？", ["8こ", "9こ", "10こ"], 1, "18の半分は 9だね。")
      },
      {
        title: "くじの オーロラ門",
        description: "氷山の上に浮かぶ大門をめざす、長い空中コースです。",
        route: "aurora-gate",
        question: question("とけい", "ながい はりが 6、みじかい はりは 9と10の あいだ。なんじはん？", ["8じはん", "9じはん", "10じはん"], 1, "長い針が6なら、30分＝はん。")
      }
    ]
  },
  {
    area: "天空の王冠島",
    palette: ["#6654c8", "#ffce54", "#ff8fc7"],
    biome: "crown",
    stages: [
      {
        title: "ことばの 王冠",
        description: "文字の形に並ぶ島々をめぐり、王冠のかけらを集めます。",
        route: "letter-crown",
        question: question("ひらがな", "「おうかん」の 2ばんめの もじは？", ["お", "う", "か"], 1, "お・う・か・ん。2番目を見つけよう。")
      },
      {
        title: "カタカナ天空回廊",
        description: "空に浮かぶ回廊を曲がり、光る文字ゲートを通ります。",
        route: "sky-corridor",
        question: question("カタカナ", "「ヒカリ」を ひらがなに すると？", ["ひかり", "ひこうき", "ひだり"], 0, "ヒ・カ・リ を一つずつ読もう。")
      },
      {
        title: "王さまの 宝石",
        description: "宝石島をすべて訪ねる、広い空域のロングフライトです。",
        route: "jewel-tour",
        question: question("たしざん", "赤い宝石 9こ、青い宝石 8こ。ぜんぶで？", ["16こ", "17こ", "18こ"], 1, "9に 8を足そう。")
      },
      {
        title: "ドラゴン雲の 試練",
        description: "動くドラゴン雲をよけ、急上昇と急降下を使い分けます。",
        route: "dragon-cloud",
        question: question("ひきざん", "光が 20こ。ドラゴンが 7こ かくすと のこりは？", ["12こ", "13こ", "14こ"], 1, "20から7。20から10引いて、3もどそう。")
      },
      {
        title: "じゅうじの ひかりのしっぽ",
        description: "六つの空域の力を集め、空いっぱいに光のしっぽを描きます。",
        route: "grand-finale",
        question: question("とけい", "ながい はりが 6、みじかい はりは 10と11の あいだ。なんじはん？", ["9じはん", "10じはん", "11じはん"], 1, "長い針が6で半。短い針は10を過ぎたところ。")
      }
    ]
  }
];

export const cloudStages: StageDefinition[] = cloudAreas.flatMap((area, areaIndex) =>
  area.stages.map((seed, stageIndex) => {
    const globalIndex = areaIndex * 5 + stageIndex;
    const targets = 3 + Math.floor(globalIndex / 5) + (stageIndex >= 3 ? 1 : 0);
    const bonusTargets = 10 + areaIndex * 2 + stageIndex * 2;
    return {
      id: `cloud-${String(globalIndex + 1).padStart(2, "0")}`,
      area: area.area,
      areaIndex,
      title: seed.title,
      description: seed.description,
      mission: `リングを ${bonusTargets}こ 通り、精霊を ${targets}ひき 助けて、帰りの門へ！`,
      learning: seed.question.kind,
      difficulty: areaIndex < 2 ? 1 : areaIndex < 4 ? 2 : 3,
      palette: area.palette,
      seed: 1103 + globalIndex * 97,
      targets,
      bonusTargets,
      question: seed.question,
      variant: `${area.biome}:${seed.route}`
    };
  })
);

export const CLOUD_AREA_COUNT = cloudAreas.length;
