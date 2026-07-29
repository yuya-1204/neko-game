import {
  ArcRotateCamera,
  Color3,
  Mesh,
  MeshBuilder,
  ParticleSystem,
  Scene,
  TransformNode,
  Vector3
} from "babylonjs";
import { bootstrapGame } from "../shared/runtime";
import type {
  GameDefinition,
  GameFactory,
  GameFactoryContext,
  InputState,
  SceneController,
  StageDefinition
} from "../shared/types";
import {
  createAnimal,
  createCat,
  createCloud,
  createIsland,
  createParticles,
  createRing,
  createRock,
  createTree,
  createWorld,
  hex,
  mat
} from "../shared/visuals";
import type { AnimalKind } from "../shared/visuals";
import { safariStages } from "./stages";

const definition: GameDefinition = {
  id: "fushigi-photo-safari",
  title: "ふしぎ生きもの フォトサファリ",
  subtitle: "足あとを たどって、最高の一枚を とろう",
  description:
    "草原、森、水辺、砂丘、雪山、ひみつ谷を歩く30ステージの3D探索ゲーム。生きもののしぐさを観察し、ゲーム内カメラで図鑑を完成させます。",
  accent: "#47bc91",
  accent2: "#ffd45c",
  ageLabel: "6〜8さい",
  stageNoun: "たんけん",
  primaryLabel: "しゃしん",
  secondaryLabel: "足あとナビ",
  stages: safariStages,
  collectionLabel: "生きもの図鑑",
  collectionTotal: 30,
  safetyNote:
    "使うのはゲームの中のカメラだけです。iPhoneのカメラやマイク、写真フォルダは使いません。"
};

interface SafariAnimal {
  node: TransformNode;
  home: Vector3;
  phase: number;
  speed: number;
  range: number;
  photographed: boolean;
  quality: number;
}

interface Footprint {
  mesh: Mesh;
  found: boolean;
  phase: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(current: number, target: number, amount: number): number {
  return current + (target - current) * clamp(amount, 0, 1);
}

function lerpAngle(current: number, target: number, amount: number): number {
  let difference = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (difference < -Math.PI) difference += Math.PI * 2;
  return current + difference * clamp(amount, 0, 1);
}

function seeded(seed: number): () => number {
  let state = Math.max(1, Math.floor(seed)) >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function colorMix(a: string, b: string, amount: number): Color3 {
  return Color3.Lerp(hex(a), hex(b), amount);
}

function xzDistanceSquared(a: Vector3, b: Vector3): number {
  const x = a.x - b.x;
  const z = a.z - b.z;
  return x * x + z * z;
}

function animalKindFor(stage: StageDefinition, index: number): AnimalKind {
  const route = stage.variant;
  if (route.includes("rabbit") || route.includes("hare") || route.includes("ウサギ")) return "rabbit";
  if (
    route.includes("fox") ||
    route.includes("fennec") ||
    route.includes("cat") ||
    route.includes("きつね") ||
    route.includes("ねこ")
  ) {
    return "fox";
  }
  if (
    route.includes("owl") ||
    route.includes("bird") ||
    route.includes("kingfisher") ||
    route.includes("penguin") ||
    route.includes("ちょう") ||
    route.includes("ひよこ")
  ) {
    return "bird";
  }
  if (
    route.includes("deer") ||
    route.includes("camel") ||
    route.includes("unicorn") ||
    route.includes("しか") ||
    route.includes("こじか")
  ) {
    return "deer";
  }
  if (
    route.includes("frog") ||
    route.includes("fish") ||
    route.includes("otter") ||
    route.includes("turtle") ||
    route.includes("かえる") ||
    route.includes("さかな")
  ) {
    return index % 2 === 0 ? "turtle" : "tanuki";
  }
  return index % 3 === 0 ? "tanuki" : index % 3 === 1 ? "rabbit" : "fox";
}

class PhotoSafariController implements SceneController {
  readonly scene: Scene;
  private readonly context: GameFactoryContext;
  private readonly stage: StageDefinition;
  private readonly camera: ArcRotateCamera;
  private readonly cat: TransformNode;
  private readonly albumGate: Mesh;
  private readonly albumGlow: ParticleSystem;
  private readonly animals: SafariAnimal[] = [];
  private readonly footprints: Footprint[] = [];
  private readonly subject: string;
  private elapsed = 0;
  private photos = 0;
  private footprintsFound = 0;
  private photoPoints = 0;
  private navigationTimer = 0;
  private photoZoomTimer = 0;
  private finishStarted = false;
  private disposed = false;
  private boundaryToastAt = -20;

  constructor(context: GameFactoryContext, stage: StageDefinition) {
    this.context = context;
    this.stage = stage;
    this.subject = stage.variant.split(":")[2] ?? "ふしぎな生きもの";
    this.scene = new Scene(context.engine);
    const biome = stage.variant.split(":")[0] ?? "meadow";
    const night = biome === "moon-valley" || stage.variant.includes("night");

    const world = createWorld(this.scene, {
      name: `safari-world-${stage.id}`,
      clearColor: stage.palette[0],
      fogColor: colorMix(stage.palette[0], night ? "#26326e" : "#ffffff", night ? 0.25 : 0.12),
      fogDensity: 0.0052,
      sunColor: night ? "#cad8ff" : "#fff0c7",
      sunDirection: [-0.58, -0.86, 0.31],
      sunIntensity: night ? 1.3 : 2.1,
      ambientColor: night ? "#7d8bd8" : "#d9f5ff",
      ambientIntensity: night ? 0.6 : 0.82,
      glowIntensity: night ? 0.86 : 0.5,
      shadowMapSize: context.ui.getSettings().quality === "eco" ? 512 : 1024,
      camera: true,
      cameraTarget: [0, 1.4, 0],
      cameraRadius: 14.5,
      cameraAlpha: Math.PI / 2,
      cameraBeta: 1.05
    });
    this.camera = world.camera!;
    this.camera.inputs.clear();
    this.camera.fov = 0.86;
    this.camera.minZ = 0.08;
    this.camera.maxZ = 260;
    this.camera.lowerRadiusLimit = 10;
    this.camera.upperRadiusLimit = 18;

    this.cat = createCat(this.scene, {
      name: "カメラねこルル",
      position: [0, 0.08, 4.8],
      size: 0.58,
      bodyColor: "#e89d5d",
      patchColor: "#fff3d7",
      scarfColor: stage.palette[2],
      wings: false,
      shadowGenerator: world.shadowGenerator
    });

    this.createHabitat(world.shadowGenerator);
    this.createAnimals(world.shadowGenerator);
    this.createFootprints(world.shadowGenerator);

    this.albumGate = createRing(this.scene, {
      name: "図鑑テントの門",
      position: [0, 2.45, 0],
      radius: 2.25,
      thickness: 0.42,
      color: stage.palette[2],
      emissiveStrength: 1.25,
      shadowGenerator: world.shadowGenerator
    });
    const albumSign = MeshBuilder.CreateBox(
      "図鑑の看板",
      { width: 3.1, height: 1.15, depth: 0.24 },
      this.scene
    );
    albumSign.position.set(0, 4.85, 0);
    albumSign.material = mat(this.scene, "図鑑の看板マテリアル", "#fff8dc", {
      emissive: stage.palette[2],
      emissiveStrength: 0.12,
      roughness: 0.82
    });
    world.shadowGenerator?.addShadowCaster(albumSign);
    this.albumGlow = createParticles(this.scene, {
      name: "図鑑テントの光",
      emitter: this.albumGate,
      color: stage.palette[2],
      color2: "#ffffff",
      capacity: 150,
      emitRate: context.ui.getSettings().reducedMotion ? 6 : 20,
      minSize: 0.07,
      maxSize: 0.23,
      minLifeTime: 0.6,
      maxLifeTime: 1.4,
      speed: 0.38,
      gravity: [0, 0.28, 0]
    });

    this.camera.setTarget(this.cat.position.add(new Vector3(0, 1.2, -1.4)));
    context.ui.setMission(stage.mission);
    context.ui.setCounter("撮影できた仲間", 0, stage.targets);
    context.ui.setHint("足あとを探し、生きものに近づいて「しゃしん」！", true);
    context.ui.say(`${stage.area}、${stage.title}。${this.subject}を見つけよう！`);
  }

  private createHabitat(
    shadowGenerator: ReturnType<typeof createWorld>["shadowGenerator"]
  ): void {
    const random = seeded(this.stage.seed);
    const biome = this.stage.variant.split(":")[0] ?? "meadow";
    const topColor =
      biome === "snow"
        ? "#e8f4f7"
        : biome === "desert"
          ? "#e8bf72"
          : biome === "moon-valley"
            ? "#536aa1"
            : this.stage.palette[1];
    const earthColor =
      biome === "snow"
        ? "#8797aa"
        : biome === "desert"
          ? "#a36f55"
          : colorMix(this.stage.palette[1], "#5d4b51", 0.56);

    createIsland(this.scene, {
      name: "サファリ大地",
      position: [0, -0.48, 0],
      radius: 34,
      height: 5.5,
      topColor,
      earthColor,
      rimColor: colorMix(topColor, "#ffffff", 0.25),
      seed: this.stage.seed,
      crystals: biome === "moon-valley" ? 8 : biome === "snow" ? 3 : 0,
      shadowGenerator
    });

    const pathMaterial = mat(this.scene, "たんけん道", colorMix(topColor, "#fff3c9", 0.34), {
      roughness: 1
    });
    for (let index = 0; index < 24; index += 1) {
      const angle = (index / 24) * Math.PI * 2 + Math.sin(index * 1.7) * 0.12;
      const radius = 5 + index * 0.92;
      const stone = MeshBuilder.CreateCylinder(
        `道しるべ-${index}`,
        {
          height: 0.08,
          diameterTop: 1.1 + (index % 3) * 0.18,
          diameterBottom: 1.18 + (index % 3) * 0.18,
          tessellation: 10
        },
        this.scene
      );
      stone.position.set(Math.cos(angle) * radius, 0.03, Math.sin(angle) * radius);
      stone.material = pathMaterial;
      stone.receiveShadows = true;
    }

    if (biome === "wetland") {
      for (let index = 0; index < 5; index += 1) {
        const pool = MeshBuilder.CreateDisc(
          `きらめく池-${index}`,
          { radius: 2.4 + random() * 2.8, tessellation: 32, sideOrientation: Mesh.DOUBLESIDE },
          this.scene
        );
        const angle = (index / 5) * Math.PI * 2;
        const distance = 11 + random() * 13;
        pool.position.set(Math.cos(angle) * distance, 0.13, Math.sin(angle) * distance);
        pool.rotation.x = Math.PI / 2;
        pool.material = mat(this.scene, `池マテリアル-${index}`, "#55c8dc", {
          emissive: "#8eeaf1",
          emissiveStrength: 0.18,
          alpha: 0.76,
          doubleSided: true
        });
      }
    }

    const propCount = this.context.ui.getSettings().quality === "eco" ? 16 : 27;
    for (let index = 0; index < propCount; index += 1) {
      const angle = random() * Math.PI * 2;
      const distance = 7.5 + random() * 23;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      const treeFriendly =
        biome !== "desert" && biome !== "moon-valley" && (biome !== "snow" || index % 2 === 0);
      if (treeFriendly && index % 3 !== 0) {
        createTree(this.scene, {
          name: `生息地の木-${index}`,
          position: [x, 0.02, z],
          height: biome === "forest" ? 3.2 + random() * 2.8 : 2.2 + random() * 2,
          trunkColor: biome === "snow" ? "#6d7887" : "#896249",
          leafColor:
            biome === "snow"
              ? "#d9eef0"
              : biome === "forest"
                ? colorMix(this.stage.palette[1], "#215b4b", 0.28)
                : this.stage.palette[1],
          fruitColor: this.stage.palette[2],
          fruitCount: index % 7 === 0 ? 4 : 0,
          seed: this.stage.seed + 100 + index,
          shadowGenerator
        });
      } else {
        createRock(this.scene, {
          name: `生息地の岩-${index}`,
          position: [x, 0.32, z],
          radius: 0.65 + random() * 1.1,
          color:
            biome === "desert"
              ? "#b87f60"
              : biome === "snow"
                ? "#aebdcc"
                : colorMix(this.stage.palette[1], "#56606c", 0.62),
          accent: this.stage.palette[2],
          seed: this.stage.seed + 400 + index,
          crystal: biome === "moon-valley" || (biome === "snow" && index % 6 === 0),
          shadowGenerator
        });
      }
    }

    const cloudCount = this.context.ui.getSettings().quality === "eco" ? 5 : 9;
    for (let index = 0; index < cloudCount; index += 1) {
      const angle = (index / cloudCount) * Math.PI * 2;
      createCloud(this.scene, {
        name: `空の雲-${index}`,
        position: [
          Math.cos(angle) * (20 + random() * 16),
          10 + random() * 8,
          Math.sin(angle) * (20 + random() * 16)
        ],
        size: 2.4 + random() * 3,
        color: colorMix(this.stage.palette[0], "#ffffff", 0.72),
        glowColor: biome === "moon-valley" ? "#9beee4" : this.stage.palette[2],
        puffs: 4 + Math.floor(random() * 4),
        seed: this.stage.seed + 800 + index,
        shadowGenerator
      });
    }
  }

  private createAnimals(
    shadowGenerator: ReturnType<typeof createWorld>["shadowGenerator"]
  ): void {
    const random = seeded(this.stage.seed + 1200);
    const biome = this.stage.variant.split(":")[0] ?? "meadow";
    for (let index = 0; index < this.stage.targets; index += 1) {
      const angle = (index / this.stage.targets) * Math.PI * 2 + random() * 0.42;
      const distance = 9 + random() * 17;
      const kind = animalKindFor(this.stage, index);
      const home = new Vector3(
        Math.cos(angle) * distance,
        kind === "bird" ? 0.36 + random() * 0.6 : 0.08,
        Math.sin(angle) * distance
      );
      const color =
        biome === "moon-valley"
          ? index % 2 === 0
            ? "#a7e7dc"
            : "#c5b2f2"
          : biome === "snow"
            ? index % 2 === 0
              ? "#f1f4f6"
              : "#a9bfd1"
            : biome === "desert"
              ? index % 2 === 0
                ? "#d99b69"
                : "#c7a36e"
              : index % 2 === 0
                ? this.stage.palette[2]
                : this.stage.palette[1];
      const node = createAnimal(this.scene, {
        name: `${this.subject}-${index + 1}`,
        kind,
        position: home,
        size: 0.72 + random() * 0.18,
        color,
        accent: biome === "moon-valley" ? "#f8f0ff" : "#fff1d0",
        shadowGenerator
      });
      this.animals.push({
        node,
        home,
        phase: random() * Math.PI * 2,
        speed: 0.28 + random() * 0.24 + this.stage.difficulty * 0.045,
        range: 0.7 + random() * 1.8,
        photographed: false,
        quality: 0
      });
    }
  }

  private createFootprints(
    shadowGenerator: ReturnType<typeof createWorld>["shadowGenerator"]
  ): void {
    const random = seeded(this.stage.seed + 2400);
    const total = this.stage.bonusTargets + 2;
    for (let index = 0; index < total; index += 1) {
      const angle = (index / total) * Math.PI * 2 + random() * 0.55;
      const distance = 6 + random() * 23;
      const footprint = createRing(this.scene, {
        name: `光る足あと-${index + 1}`,
        position: [Math.cos(angle) * distance, 0.18, Math.sin(angle) * distance],
        radius: 0.52,
        thickness: 0.18,
        color: this.stage.palette[2],
        emissiveStrength: 0.8,
        vertical: false,
        shadowGenerator
      });
      footprint.scaling.z = 1.45;
      footprint.rotation.y = angle + Math.PI / 2;
      this.footprints.push({ mesh: footprint, found: false, phase: random() * Math.PI * 2 });
    }
  }

  update(deltaSeconds: number, input: InputState): void {
    if (this.finishStarted || this.disposed) return;
    const delta = Math.min(deltaSeconds, 0.05);
    this.elapsed += delta;
    this.navigationTimer = Math.max(0, this.navigationTimer - delta);
    this.photoZoomTimer = Math.max(0, this.photoZoomTimer - delta);

    const moveX = clamp(input.moveX, -1, 1);
    const moveForward = clamp(input.moveY, -1, 1);
    const magnitude = Math.min(1, Math.hypot(moveX, moveForward));
    if (magnitude > 0.05) {
      // The chase camera looks toward world -Z, so its screen-right is world -X.
      const normalizedX = -moveX / Math.max(1, magnitude);
      const normalizedZ = -moveForward / Math.max(1, magnitude);
      const speed = 6.2 + this.stage.difficulty * 0.55;
      this.cat.position.x += normalizedX * speed * magnitude * delta;
      this.cat.position.z += normalizedZ * speed * magnitude * delta;
      const targetRotation = Math.atan2(-normalizedX, -normalizedZ);
      this.cat.rotation.y = lerpAngle(this.cat.rotation.y, targetRotation, delta * 8);
    }

    const distanceFromCenter = Math.hypot(this.cat.position.x, this.cat.position.z);
    if (distanceFromCenter > 30.5) {
      const scale = 30.5 / distanceFromCenter;
      this.cat.position.x *= scale;
      this.cat.position.z *= scale;
      if (this.elapsed - this.boundaryToastAt > 7) {
        this.context.ui.toast("この先は深い谷だよ。足あと道へもどろう。", "warn");
        this.boundaryToastAt = this.elapsed;
      }
    }
    this.cat.position.y = 0.08 + (magnitude > 0.05 ? Math.sin(this.elapsed * 11) * 0.035 : 0);

    const desiredRadius = this.photoZoomTimer > 0 ? 10.8 : 14.5;
    this.camera.radius = lerp(this.camera.radius, desiredRadius, delta * 5);
    this.camera.setTarget(
      Vector3.Lerp(
        this.camera.target,
        this.cat.position.add(new Vector3(0, 1.22, -1.2)),
        clamp(delta * 6, 0, 1)
      )
    );

    for (let index = 0; index < this.animals.length; index += 1) {
      const animal = this.animals[index]!;
      const angle = this.elapsed * animal.speed + animal.phase;
      const targetX = animal.home.x + Math.cos(angle) * animal.range;
      const targetZ = animal.home.z + Math.sin(angle * 0.83) * animal.range;
      animal.node.position.x = lerp(animal.node.position.x, targetX, delta * 1.5);
      animal.node.position.z = lerp(animal.node.position.z, targetZ, delta * 1.5);
      animal.node.position.y =
        animal.home.y + Math.sin(this.elapsed * 3.2 + animal.phase) * (animal.photographed ? 0.04 : 0.08);
      animal.node.rotation.y = lerpAngle(
        animal.node.rotation.y,
        Math.atan2(Math.sin(angle), Math.cos(angle)),
        delta * 2
      );
      const selected = this.navigationTimer > 0 && animal === this.nearestUnphotographed();
      const pulse = selected ? 1.12 + Math.sin(this.elapsed * 7) * 0.08 : animal.photographed ? 0.9 : 1;
      animal.node.scaling.setAll(lerp(animal.node.scaling.x, pulse, delta * 5));
    }

    for (const footprint of this.footprints) {
      if (footprint.found) continue;
      footprint.mesh.scaling.y = 1 + Math.sin(this.elapsed * 4 + footprint.phase) * 0.14;
      footprint.mesh.rotation.y += delta * 0.12;
      if (xzDistanceSquared(footprint.mesh.position, this.cat.position) < 1.45 ** 2) {
        footprint.found = true;
        footprint.mesh.setEnabled(false);
        this.footprintsFound += 1;
        this.context.ui.playTone("collect");
        this.context.ui.toast(
          `光る足あとを発見！ ${Math.min(this.footprintsFound, this.stage.bonusTargets)}/${this.stage.bonusTargets}`,
          "good"
        );
        this.burst(footprint.mesh.position, this.stage.palette[2]);
      }
    }

    this.albumGate.rotation.z += delta * (this.photos >= this.stage.targets ? 0.72 : 0.15);
    this.albumGate.scaling.setAll(
      this.photos >= this.stage.targets ? 1 + Math.sin(this.elapsed * 3.2) * 0.045 : 0.86
    );

    if (this.photos >= this.stage.targets) {
      const homeDistance = Math.hypot(this.cat.position.x, this.cat.position.z);
      this.context.ui.setHint(
        homeDistance < 3.4
          ? "図鑑テントについたよ。「しゃしん」でアルバムを完成させよう！"
          : `全員撮影できたよ！ 中央の光る図鑑テントへもどろう（あと ${Math.ceil(homeDistance)}m）`,
        true
      );
    } else {
      const nearest = this.nearestUnphotographed();
      const distance = nearest ? Math.sqrt(xzDistanceSquared(nearest.node.position, this.cat.position)) : 0;
      this.context.ui.setHint(
        nearest && distance < 8.5
          ? `${this.subject}が近くにいるよ。向きを合わせて「しゃしん」！`
          : `${this.subject}を探そう。足あとナビも使えるよ。 撮影 ${this.photos}/${this.stage.targets}`,
        true
      );
    }
  }

  private nearestUnphotographed(): SafariAnimal | null {
    let result: SafariAnimal | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const animal of this.animals) {
      if (animal.photographed) continue;
      const distance = xzDistanceSquared(animal.node.position, this.cat.position);
      if (distance < bestDistance) {
        bestDistance = distance;
        result = animal;
      }
    }
    return result;
  }

  private photoCandidate(): SafariAnimal | null {
    const forward = new Vector3(-Math.sin(this.cat.rotation.y), 0, -Math.cos(this.cat.rotation.y));
    let result: SafariAnimal | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const animal of this.animals) {
      if (animal.photographed) continue;
      const offset = animal.node.position.subtract(this.cat.position);
      offset.y = 0;
      const distance = offset.length();
      if (distance > 9.2 || distance < 0.01) continue;
      const facing = Vector3.Dot(forward, offset.scale(1 / distance));
      if (facing < -0.08) continue;
      const score = distance - facing * 3.1;
      if (score < bestScore) {
        bestScore = score;
        result = animal;
      }
    }
    return result;
  }

  primary(pressed: boolean): void {
    if (!pressed || this.finishStarted) return;
    if (this.photos >= this.stage.targets) {
      if (Math.hypot(this.cat.position.x, this.cat.position.z) < 3.5) {
        void this.finishStage();
      } else {
        this.context.ui.toast("撮影はそろったよ。中央の図鑑テントへもどろう。", "info");
      }
      return;
    }

    const animal = this.photoCandidate();
    if (!animal) {
      const nearest = this.nearestUnphotographed();
      const distance = nearest
        ? Math.sqrt(xzDistanceSquared(nearest.node.position, this.cat.position))
        : 0;
      this.context.ui.playTone("wrong");
      this.context.ui.toast(
        nearest && distance < 10
          ? "もう少し生きものの方を向いてみよう。"
          : "生きものにもう少し近づいてみよう。",
        "info"
      );
      return;
    }
    this.takePhoto(animal);
  }

  private takePhoto(animal: SafariAnimal): void {
    animal.photographed = true;
    this.photos += 1;
    const distance = Math.sqrt(xzDistanceSquared(animal.node.position, this.cat.position));
    const quality = Math.round(clamp(420 - Math.abs(distance - 5) * 42, 180, 420));
    animal.quality = quality;
    this.photoPoints += quality;
    this.photoZoomTimer = 0.52;
    this.scene.imageProcessingConfiguration.exposure = 1.45;
    window.setTimeout(() => {
      if (!this.disposed) this.scene.imageProcessingConfiguration.exposure = 1.05;
    }, 90);

    this.context.ui.playTone("photo");
    this.context.ui.setCounter("撮影できた仲間", this.photos, this.stage.targets);
    this.context.ui.toast(
      quality >= 360 ? `ベストショット！ ${this.photos}/${this.stage.targets}` : `いい写真！ ${this.photos}/${this.stage.targets}`,
      "good"
    );
    this.burst(animal.node.position, "#ffffff");
    if (this.photos >= this.stage.targets) {
      this.context.ui.say("アルバムがそろったよ。中央の図鑑テントへもどろう！");
    }
  }

  secondary(pressed: boolean): void {
    if (!pressed || this.finishStarted) return;
    const nearest = this.nearestUnphotographed();
    if (!nearest) {
      this.context.ui.toast("みんな撮影できたよ。図鑑テントへもどろう！", "good");
      return;
    }
    this.navigationTimer = 4.5;
    const dx = nearest.node.position.x - this.cat.position.x;
    const dz = nearest.node.position.z - this.cat.position.z;
    const direction =
      Math.abs(dx) > Math.abs(dz)
        ? dx < 0
          ? "画面の右"
          : "画面の左"
        : dz < 0
          ? "画面の奥"
          : "画面の手前";
    this.context.ui.playTone("magic");
    this.context.ui.toast(`${direction}に光る足あと！ ${this.subject}がいるよ。`, "good");
    this.burst(nearest.node.position, this.stage.palette[2]);
  }

  private burst(position: Vector3, color: string): void {
    const particles = createParticles(this.scene, {
      emitter: position.clone(),
      color,
      color2: this.stage.palette[0],
      capacity: 90,
      emitRate: 240,
      minSize: 0.07,
      maxSize: 0.28,
      minLifeTime: 0.25,
      maxLifeTime: 0.8,
      speed: 1.4,
      gravity: [0, 0.35, 0]
    });
    window.setTimeout(() => particles.stop(), 180);
    window.setTimeout(() => particles.dispose(), 1050);
  }

  private async finishStage(): Promise<void> {
    if (this.finishStarted) return;
    this.finishStarted = true;
    this.context.ui.playTone("success");
    this.context.ui.say("すてきな図鑑ができたよ。観察クイズに挑戦しよう！");
    const learned = await this.context.ui.ask(this.stage.question);
    if (this.disposed) return;
    const footprintBonus = this.footprintsFound >= this.stage.bonusTargets;
    const stars = (footprintBonus && learned ? 3 : footprintBonus || learned ? 2 : 1) as 1 | 2 | 3;
    this.context.ui.addCollection(this.stage.id);
    this.context.ui.complete({
      stars,
      score:
        900 +
        this.photoPoints +
        this.footprintsFound * 130 +
        (learned ? 500 : 0) +
        Math.max(0, 800 - Math.round(this.elapsed * 3)),
      collected: this.photos + this.footprintsFound,
      bonus: footprintBonus,
      message:
        stars === 3
          ? `${this.subject}の特別な図鑑ページが完成！`
          : learned
            ? "よく見て、よく考えた観察名人！"
            : "いっしょに答えを見つけて、図鑑が完成したよ！"
    });
  }

  pause(): void {
    this.albumGlow.stop();
  }

  resume(): void {
    this.albumGlow.start();
  }

  dispose(): void {
    this.disposed = true;
    this.albumGlow.dispose();
    this.scene.dispose();
  }
}

const createPhotoSafari: GameFactory = (context, stage) =>
  new PhotoSafariController(context, stage);

void bootstrapGame(definition, createPhotoSafari);
