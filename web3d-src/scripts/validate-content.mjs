import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("..", import.meta.url));
const games = [
  ["neko-kumojima", "cloudStages"],
  ["fushigi-photo-safari", "safariStages"],
  ["nyanko-karakuri-island", "karakuriStages"],
  ["shinkai-hikari-rescue", "seaStages"],
  ["iro-seirei-zukan", "stages"]
];
const allowedLearning = new Set(["ひらがな", "カタカナ", "たしざん", "ひきざん", "とけい", "かんさつ"]);
const requiredLearning = ["ひらがな", "カタカナ", "たしざん", "ひきざん", "とけい"];
let grandTotal = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const [game, exportName] of games) {
  const file = resolve(root, game, "stages.ts");
  const source = await readFile(file, "utf8");
  const html = await readFile(resolve(root, game, "index.html"), "utf8");
  const manifest = JSON.parse(
    await readFile(resolve(root, "public", game, "manifest.webmanifest"), "utf8")
  );
  assert(
    html.includes('name="apple-mobile-web-app-capable" content="yes"'),
    `${game}: missing iPhone home-screen mode`
  );
  assert(manifest.display === "fullscreen", `${game}: manifest display must be fullscreen`);
  assert(manifest.orientation === "landscape", `${game}: manifest orientation must be landscape`);
  const output = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove
    },
    fileName: file
  }).outputText;
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`;
  const module = await import(moduleUrl);
  const stages = module[exportName];
  assert(Array.isArray(stages), `${game}: stages export is missing`);
  assert(stages.length === 30, `${game}: expected 30 stages, got ${stages.length}`);
  assert(new Set(stages.map((stage) => stage.id)).size === 30, `${game}: stage IDs must be unique`);

  const areas = new Map();
  for (const [index, stage] of stages.entries()) {
    const prefix = `${game} stage ${index + 1}`;
    assert(typeof stage.title === "string" && stage.title.length >= 3, `${prefix}: title`);
    assert(typeof stage.mission === "string" && stage.mission.length >= 8, `${prefix}: mission`);
    assert(stage.palette?.length === 3, `${prefix}: three-color palette`);
    assert(stage.targets >= 1 && stage.targets <= 20, `${prefix}: target budget`);
    assert(allowedLearning.has(stage.learning), `${prefix}: learning kind`);
    assert(stage.question?.choices?.length >= 2, `${prefix}: question choices`);
    assert(
      Number.isInteger(stage.question.answer) &&
      stage.question.answer >= 0 &&
      stage.question.answer < stage.question.choices.length,
      `${prefix}: question answer`
    );
    assert(stage.question.kind === stage.learning || stage.learning === "かんさつ", `${prefix}: learning mismatch`);
    areas.set(stage.area, (areas.get(stage.area) ?? 0) + 1);
  }
  assert(areas.size === 6, `${game}: expected 6 areas, got ${areas.size}`);
  assert([...areas.values()].every((count) => count === 5), `${game}: each area must have five stages`);
  for (const learning of requiredLearning) {
    assert(stages.some((stage) => stage.learning === learning), `${game}: missing ${learning}`);
  }
  grandTotal += stages.length;
  console.log(`OK ${game}: ${stages.length} stages / ${areas.size} areas`);
}

assert(grandTotal === 150, `expected 150 total stages, got ${grandTotal}`);
console.log(`OK total: ${grandTotal} stages`);
