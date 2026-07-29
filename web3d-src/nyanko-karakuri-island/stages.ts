import type {
  LearningKind,
  LearningQuestion,
  StageDefinition,
} from "../shared/types";

export type PartKind =
  | "ramp"
  | "wheel"
  | "bridge"
  | "spring"
  | "lever"
  | "gear"
  | "belt"
  | "conveyor"
  | "magnet"
  | "rail"
  | "switch"
  | "balloon"
  | "fan"
  | "weight"
  | "clock";

export type RouteKind =
  | "straight"
  | "hill"
  | "zigzag"
  | "split"
  | "spiral"
  | "sky"
  | "festival";

export interface KarakuriStage extends StageDefinition {
  parts: PartKind[];
  solutions: PartKind[][];
  slotCount: number;
  route: RouteKind;
  height: number;
  scenery: string;
}

interface StageSpec {
  title: string;
  description: string;
  mission: string;
  parts: PartKind[];
  solutions: PartKind[][];
  route: RouteKind;
  height: number;
  scenery: string;
  question: LearningQuestion;
}

interface AreaSpec {
  area: string;
  palette: [string, string, string];
  learning: LearningKind;
  stages: StageSpec[];
}

const q = (
  kind: LearningKind,
  prompt: string,
  choices: string[],
  answer: number,
  hint: string,
  speak = prompt,
): LearningQuestion => ({ kind, prompt, choices, answer, hint, speak });

const areas: AreaSpec[] = [
  {
    area: "かぜの はらっぱ",
    palette: ["#a8e56f", "#ffd76a", "#62b6ff"],
    learning: "ひらがな",
    stages: [
      {
        title: "ころころ どんぐり",
        description: "さかと くるまで、どんぐりを はこぼう。",
        mission: "2つの ばしょに ぶひんを おいて、どんぐりを ゴールへ とどけよう",
        parts: ["ramp", "wheel", "spring"],
        solutions: [["ramp", "wheel"], ["spring", "wheel"]],
        route: "straight",
        height: 0.2,
        scenery: "windmill",
        question: q("ひらがな", "「さか」の はじめの もじは？", ["さ", "か", "き"], 0, "さ・か と こえに だしてみよう"),
      },
      {
        title: "はしを かけよう",
        description: "たにを こえる ながい からくり。",
        mission: "はしと さかを つないで、にもつぐるまを むこうへ とどけよう",
        parts: ["bridge", "ramp", "wheel", "spring"],
        solutions: [["bridge", "ramp", "wheel"], ["ramp", "bridge", "wheel"]],
        route: "hill",
        height: 0.7,
        scenery: "brook",
        question: q("ひらがな", "「はし」の おわりの もじは？", ["は", "し", "ほ"], 1, "は・し。さいごは どの おとかな"),
      },
      {
        title: "ふたつの ベル",
        description: "レバーで ベルを ならしてから すすもう。",
        mission: "ベルを ならし、きいろい はしを わたろう",
        parts: ["lever", "bridge", "wheel", "ramp"],
        solutions: [["lever", "bridge", "wheel"], ["ramp", "lever", "wheel"]],
        route: "zigzag",
        height: 0.4,
        scenery: "bells",
        question: q("ひらがな", "「べる」と おなじ はじめの おとは？", ["へ", "べ", "ぺ"], 1, "てんてんが ついた「べ」だよ"),
      },
      {
        title: "ぴょんと かぜみち",
        description: "ばねで とび、はしへ ちゃくちしよう。",
        mission: "ばねを つかって、たかい かぜみちへ のせよう",
        parts: ["spring", "bridge", "wheel", "ramp"],
        solutions: [["spring", "bridge", "wheel"], ["ramp", "spring", "wheel"]],
        route: "split",
        height: 1.1,
        scenery: "flowers",
        question: q("ひらがな", "「ぴょん」の はじめの もじは？", ["ひ", "び", "ぴ"], 2, "まるが ついた「ぴ」だよ"),
      },
      {
        title: "おおきな かざぐるま",
        description: "4つの ぶひんで かざぐるまを うごかそう。",
        mission: "ながい みちを つくり、おおきな かざぐるまへ とどけよう",
        parts: ["ramp", "lever", "bridge", "wheel", "spring"],
        solutions: [
          ["ramp", "lever", "bridge", "wheel"],
          ["spring", "lever", "bridge", "wheel"],
        ],
        route: "spiral",
        height: 1.4,
        scenery: "great-windmill",
        question: q("ひらがな", "「かざぐるま」は どれ？", ["かさぐるま", "かざぐるま", "かざくるま"], 1, "「ざ」には てんてんが あるよ"),
      },
    ],
  },
  {
    area: "ギアの みなと",
    palette: ["#ff9f5a", "#32c7c9", "#485d8b"],
    learning: "カタカナ",
    stages: [
      {
        title: "ギアの ごあいさつ",
        description: "ギアを まわして みなとの とびらを あけよう。",
        mission: "ギアと レバーを つないで、にもつを はこぼう",
        parts: ["gear", "lever", "wheel"],
        solutions: [["gear", "lever", "wheel"], ["lever", "gear", "wheel"]],
        route: "straight",
        height: 0.3,
        scenery: "harbor",
        question: q("カタカナ", "「ぎあ」を カタカナに すると？", ["ギア", "キア", "ギヤ"], 0, "てんてんが ついた「ギ」だよ"),
      },
      {
        title: "ベルトの はし",
        description: "ながい ベルトで ちからを とどけよう。",
        mission: "はなれた ギアまで ベルトを つなごう",
        parts: ["gear", "belt", "bridge", "wheel"],
        solutions: [["gear", "belt", "wheel"], ["belt", "gear", "wheel"]],
        route: "hill",
        height: 0.8,
        scenery: "rope-bridge",
        question: q("カタカナ", "「ベルト」の はじめは？", ["ヘ", "ベ", "ペ"], 1, "「ベ」には てんてんが あるよ"),
      },
      {
        title: "レバーの もん",
        description: "じゅんばんに レバーを おして もんを ひらこう。",
        mission: "レバー、ベルト、くるまを じゅんに おこう",
        parts: ["lever", "belt", "wheel", "gear"],
        solutions: [["lever", "belt", "wheel"], ["gear", "lever", "wheel"]],
        route: "zigzag",
        height: 0.5,
        scenery: "warehouse",
        question: q("カタカナ", "ただしい「レバー」は どれ？", ["レパー", "しバー", "レバー"], 2, "レ・バ・ー と よもう"),
      },
      {
        title: "コンベア ぐるぐる",
        description: "コンベアを のりついで たかい ふねへ。",
        mission: "コンベアと ギアで にもつを うえへ はこぼう",
        parts: ["conveyor", "gear", "belt", "wheel"],
        solutions: [
          ["conveyor", "gear", "belt", "wheel"],
          ["gear", "belt", "conveyor", "wheel"],
        ],
        route: "split",
        height: 1.2,
        scenery: "cargo-ship",
        question: q("カタカナ", "「コンベア」の さいごは？", ["ア", "ヤ", "マ"], 0, "コ・ン・ベ・ア。さいごは「ア」"),
      },
      {
        title: "みなとの おおクレーン",
        description: "5つの そうちで おおきな はこを つりあげよう。",
        mission: "みなとの ぜんぶの そうちを うごかそう",
        parts: ["lever", "gear", "belt", "conveyor", "wheel"],
        solutions: [
          ["lever", "gear", "belt", "conveyor", "wheel"],
          ["gear", "lever", "belt", "conveyor", "wheel"],
        ],
        route: "spiral",
        height: 1.5,
        scenery: "great-crane",
        question: q("カタカナ", "「くれーん」を カタカナに すると？", ["クレーン", "グレーン", "クレソ"], 0, "ク・レ・ー・ン と よもう"),
      },
    ],
  },
  {
    area: "じしゃく こうざん",
    palette: ["#9c6fe4", "#57d5ba", "#3a3858"],
    learning: "たしざん",
    stages: [
      {
        title: "くっつく トロッコ",
        description: "じしゃくで トロッコを ひっぱろう。",
        mission: "じしゃくと レールを おいて、ひかる いしを はこぼう",
        parts: ["magnet", "rail", "wheel"],
        solutions: [["magnet", "rail", "wheel"], ["rail", "magnet", "wheel"]],
        route: "straight",
        height: 0.3,
        scenery: "crystal-mine",
        question: q("たしざん", "ひかる いしが 2こと 3こ。ぜんぶで？", ["4こ", "5こ", "6こ"], 1, "2こに 3こを たして かぞえよう"),
      },
      {
        title: "ふたつの じしゃく",
        description: "ひく ちからを 2かい つなごう。",
        mission: "ふたつの じしゃくで たにを こえよう",
        parts: ["magnet", "bridge", "rail", "wheel"],
        solutions: [
          ["magnet", "bridge", "magnet", "wheel"],
          ["rail", "magnet", "bridge", "wheel"],
        ],
        route: "hill",
        height: 0.9,
        scenery: "purple-canyon",
        question: q("たしざん", "4こ と 5こを あわせると？", ["8こ", "9こ", "10こ"], 1, "4の つぎを 5かい かぞえよう"),
      },
      {
        title: "きらきら ぶんき",
        description: "スイッチで 2つの みちを ひとつに。",
        mission: "みぎと ひだりの トロッコを ごうりゅうさせよう",
        parts: ["switch", "rail", "magnet", "wheel"],
        solutions: [
          ["switch", "rail", "magnet", "wheel"],
          ["magnet", "switch", "rail", "wheel"],
        ],
        route: "split",
        height: 0.6,
        scenery: "forked-mine",
        question: q("たしざん", "7びきと 3びき。みんなで？", ["9ひき", "10ぴき", "11ぴき"], 1, "7から 8、9、10と すすもう"),
      },
      {
        title: "じしゃく エレベーター",
        description: "じしゃくの ちからで うえの レールへ。",
        mission: "たかい ばしょへ トロッコを あげよう",
        parts: ["magnet", "lever", "rail", "bridge", "wheel"],
        solutions: [
          ["lever", "magnet", "bridge", "wheel"],
          ["magnet", "rail", "bridge", "wheel"],
        ],
        route: "zigzag",
        height: 1.3,
        scenery: "lift-shaft",
        question: q("たしざん", "8＋6は いくつ？", ["13", "14", "15"], 1, "8に 2を たして10。のこり4で14"),
      },
      {
        title: "こうざんの ほうせき",
        description: "5つの しかけで おおきな ほうせきを はこぼう。",
        mission: "じしゃく こうざんの おくから ほうせきを とどけよう",
        parts: ["switch", "magnet", "rail", "bridge", "wheel"],
        solutions: [
          ["switch", "magnet", "rail", "bridge", "wheel"],
          ["magnet", "switch", "bridge", "rail", "wheel"],
        ],
        route: "spiral",
        height: 1.6,
        scenery: "gem-vault",
        question: q("たしざん", "9＋8は いくつ？", ["16", "17", "18"], 1, "9に 1を たして10。のこり7で17"),
      },
    ],
  },
  {
    area: "ふうせん こうじょう",
    palette: ["#ff70ad", "#79dbff", "#fff2a5"],
    learning: "ひきざん",
    stages: [
      {
        title: "ふわふわ にもつ",
        description: "ふうせんで にもつを うかせよう。",
        mission: "ふうせんと かぜで ゴールまで とばそう",
        parts: ["balloon", "fan", "bridge"],
        solutions: [["balloon", "fan", "bridge"], ["fan", "balloon", "bridge"]],
        route: "sky",
        height: 1.0,
        scenery: "balloon-yard",
        question: q("ひきざん", "ふうせんが 7こ。2こ とんだら のこりは？", ["4こ", "5こ", "6こ"], 1, "7から 2こ へらそう"),
      },
      {
        title: "おもりを はずそう",
        description: "おもりを へらすと ふうせんが あがるよ。",
        mission: "ちょうどよい おもさにして そらの はしへ",
        parts: ["weight", "balloon", "fan", "bridge"],
        solutions: [
          ["weight", "balloon", "fan", "bridge"],
          ["balloon", "weight", "fan", "bridge"],
        ],
        route: "hill",
        height: 1.2,
        scenery: "weight-room",
        question: q("ひきざん", "10この おもりから 3こ はずすと？", ["6こ", "7こ", "8こ"], 1, "10、9、8、7と 3こ もどろう"),
      },
      {
        title: "かぜの まがりかど",
        description: "ふたつの かぜで そらの みちを まがろう。",
        mission: "かぜの むきを かえて きいろい くもへ",
        parts: ["fan", "balloon", "lever", "bridge"],
        solutions: [
          ["fan", "lever", "balloon", "bridge"],
          ["balloon", "fan", "lever", "bridge"],
        ],
        route: "zigzag",
        height: 1.4,
        scenery: "wind-corner",
        question: q("ひきざん", "12－5は いくつ？", ["6", "7", "8"], 1, "12から 5つ もどって かぞえよう"),
      },
      {
        title: "そらの はいたつびん",
        description: "ふわりと うかせ、ばねで さいごの ひとおし。",
        mission: "にもつを そらの 3つの しまへ はいたつしよう",
        parts: ["balloon", "fan", "spring", "weight", "bridge"],
        solutions: [
          ["weight", "balloon", "fan", "spring", "bridge"],
          ["balloon", "fan", "weight", "spring", "bridge"],
        ],
        route: "split",
        height: 1.7,
        scenery: "sky-post",
        question: q("ひきざん", "15－6は いくつ？", ["8", "9", "10"], 1, "15から 5で10。もう1ひいて9"),
      },
      {
        title: "にじいろ こうじょう",
        description: "そらいっぱいの ふうせん からくり。",
        mission: "おおきな にじの ゲートまで とばそう",
        parts: ["weight", "balloon", "fan", "lever", "bridge"],
        solutions: [
          ["weight", "balloon", "fan", "lever", "bridge"],
          ["balloon", "weight", "lever", "fan", "bridge"],
        ],
        route: "spiral",
        height: 2.0,
        scenery: "rainbow-factory",
        question: q("ひきざん", "18－9は いくつ？", ["8", "9", "10"], 1, "18を 9と9に わけて みよう"),
      },
    ],
  },
  {
    area: "とけいの まち",
    palette: ["#7f8cff", "#ffd05e", "#6a467f"],
    learning: "とけい",
    stages: [
      {
        title: "3じの とびら",
        description: "3じに ひらく とびらを うごかそう。",
        mission: "とけいを さいしょに おいて、3じの とびらを あけよう",
        parts: ["clock", "lever", "wheel"],
        solutions: [["clock", "lever", "wheel"], ["lever", "clock", "wheel"]],
        route: "straight",
        height: 0.4,
        scenery: "clock-square",
        question: q("とけい", "ながい はりが 12、みじかい はりが 3。なんじ？", ["2じ", "3じ", "3じ30ぷん"], 1, "みじかい はりが「じ」を おしえるよ"),
      },
      {
        title: "3じはんの バス",
        description: "3じ30ぷんに バスを しゅっぱつさせよう。",
        mission: "とけいと ベルトで バスの しゃこを あけよう",
        parts: ["clock", "belt", "gear", "wheel"],
        solutions: [["clock", "belt", "gear", "wheel"], ["gear", "clock", "belt", "wheel"]],
        route: "hill",
        height: 0.7,
        scenery: "bus-stop",
        question: q("とけい", "3じ30ぷんは どれ？", ["3じ", "3じはん", "4じはん"], 1, "30ぷんは「はん」とも いうよ"),
      },
      {
        title: "6じの おんがく",
        description: "ふたつの とけいで まちの おとを つなごう。",
        mission: "6じに ベルが なる からくりを つくろう",
        parts: ["clock", "gear", "lever", "belt"],
        solutions: [
          ["clock", "gear", "lever", "belt"],
          ["clock", "lever", "gear", "belt"],
        ],
        route: "zigzag",
        height: 1.0,
        scenery: "music-street",
        question: q("とけい", "6じの ながい はりは どこ？", ["12", "6", "3"], 0, "ちょうどの とき、ながい はりは12"),
      },
      {
        title: "9じ15ふんの れっしゃ",
        description: "15ふんの しゅっぱつに まにあわせよう。",
        mission: "とけい、ギア、コンベアを つないで れっしゃを だそう",
        parts: ["clock", "gear", "conveyor", "lever", "wheel"],
        solutions: [
          ["clock", "gear", "conveyor", "lever", "wheel"],
          ["gear", "clock", "lever", "conveyor", "wheel"],
        ],
        route: "split",
        height: 1.2,
        scenery: "station",
        question: q("とけい", "9じ15ふん。ながい はりは どこ？", ["3", "6", "9"], 0, "15ふんで ながい はりは3"),
      },
      {
        title: "まちの おおどけい",
        description: "5つの そうちで とけいとうを うごかそう。",
        mission: "12じに まちじゅうの ベルを ならそう",
        parts: ["clock", "gear", "belt", "lever", "wheel"],
        solutions: [
          ["clock", "gear", "belt", "lever", "wheel"],
          ["gear", "clock", "lever", "belt", "wheel"],
        ],
        route: "spiral",
        height: 1.6,
        scenery: "clock-tower",
        question: q("とけい", "12じ。ながい はりと みじかい はりは？", ["どちらも12", "どちらも6", "3と12"], 0, "12じ ちょうどは、ふたつとも12"),
      },
    ],
  },
  {
    area: "おおまつり じま",
    palette: ["#ff5f6d", "#ffc85c", "#4cd6c6"],
    learning: "かんさつ",
    stages: [
      {
        title: "やたいの じゅんび",
        description: "いままでの ぶひんで やたいへ はこぼう。",
        mission: "2つの みちから すきな しかけを えらぼう",
        parts: ["ramp", "wheel", "gear", "conveyor"],
        solutions: [["ramp", "gear", "wheel"], ["conveyor", "gear", "wheel"]],
        route: "festival",
        height: 0.5,
        scenery: "food-stalls",
        question: q("ひらがな", "「まつり」の まんなかの もじは？", ["ま", "つ", "り"], 1, "ま・つ・り と ゆっくり よもう"),
      },
      {
        title: "キラキラ ライト",
        description: "じしゃくと ギアで ライトを つけよう。",
        mission: "ライトの でんきを おおきな ステージへ とどけよう",
        parts: ["magnet", "gear", "belt", "switch"],
        solutions: [
          ["switch", "magnet", "gear", "belt"],
          ["magnet", "switch", "gear", "belt"],
        ],
        route: "zigzag",
        height: 0.9,
        scenery: "lantern-lane",
        question: q("カタカナ", "「らいと」を カタカナに すると？", ["ライト", "うイト", "ライトー"], 0, "ラ・イ・ト と よもう"),
      },
      {
        title: "10この おくりもの",
        description: "ふたつの はこを ひとつの みちへ。",
        mission: "おくりものを ごうりゅうさせて ぶたいへ はこぼう",
        parts: ["switch", "rail", "bridge", "conveyor", "wheel"],
        solutions: [
          ["switch", "rail", "bridge", "conveyor", "wheel"],
          ["rail", "switch", "conveyor", "bridge", "wheel"],
        ],
        route: "split",
        height: 1.1,
        scenery: "gift-plaza",
        question: q("たしざん", "6この はこと 4この はこ。ぜんぶで？", ["9こ", "10こ", "11こ"], 1, "6に4を たすと10"),
      },
      {
        title: "ふうせん パレード",
        description: "そらと じめんの ふたつの みち。",
        mission: "パレードの ねこぐるまを にじの もんへ",
        parts: ["balloon", "fan", "weight", "bridge", "wheel"],
        solutions: [
          ["weight", "balloon", "fan", "bridge", "wheel"],
          ["balloon", "weight", "bridge", "fan", "wheel"],
        ],
        route: "sky",
        height: 1.8,
        scenery: "parade",
        question: q("ひきざん", "20この かざりから 8こ つかった。のこりは？", ["11こ", "12こ", "13こ"], 1, "20から8。10を のこして 2を たすと12"),
      },
      {
        title: "にゃんこ だいからくり",
        description: "ぜんぶの しまの ちからを ひとつに。",
        mission: "5つの ぶひんを えらび、まつりの はなを ひらかせよう",
        parts: ["clock", "gear", "magnet", "balloon", "fan", "wheel"],
        solutions: [
          ["clock", "gear", "magnet", "balloon", "fan"],
          ["clock", "magnet", "gear", "fan", "balloon"],
          ["gear", "clock", "magnet", "balloon", "fan"],
        ],
        route: "festival",
        height: 2.2,
        scenery: "grand-finale",
        question: q("とけい", "まつりは 7じ30ぷん。どれ？", ["7じ", "7じはん", "8じはん"], 1, "30ぷんは「はん」だよ"),
      },
    ],
  },
];

export const karakuriStages: KarakuriStage[] = areas.flatMap((area, areaIndex) =>
  area.stages.map((stage, stageIndex) => {
    const slotCount = stage.solutions[0]?.length ?? 3;
    const number = areaIndex * 5 + stageIndex + 1;
    return {
      id: `karakuri-${String(number).padStart(2, "0")}`,
      area: area.area,
      areaIndex,
      title: stage.title,
      description: stage.description,
      mission: stage.mission,
      learning: stage.question.kind,
      difficulty: (stageIndex < 2 ? 1 : stageIndex < 4 ? 2 : 3) as 1 | 2 | 3,
      palette: area.palette,
      seed: 701 + number * 97,
      targets: slotCount,
      bonusTargets: 1,
      question: stage.question,
      variant: `${stage.route}:${stage.scenery}`,
      parts: stage.parts,
      solutions: stage.solutions,
      slotCount,
      route: stage.route,
      height: stage.height,
      scenery: stage.scenery,
    };
  }),
);

export const karakuriPartLabels: Record<PartKind, string> = {
  ramp: "さか",
  wheel: "くるま",
  bridge: "はし",
  spring: "ばね",
  lever: "レバー",
  gear: "ギア",
  belt: "ベルト",
  conveyor: "コンベア",
  magnet: "じしゃく",
  rail: "レール",
  switch: "スイッチ",
  balloon: "ふうせん",
  fan: "せんぷうき",
  weight: "おもり",
  clock: "とけい",
};

export const isKarakuriStage = (stage: StageDefinition): stage is KarakuriStage =>
  "solutions" in stage && Array.isArray((stage as Partial<KarakuriStage>).solutions);
