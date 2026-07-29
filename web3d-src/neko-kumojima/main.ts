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
  createCat,
  createCloud,
  createIsland,
  createParticles,
  createRing,
  createRock,
  createSpirit,
  createTree,
  createWorld,
  hex,
  mat
} from "../shared/visuals";
import { cloudStages } from "./stages";

const definition: GameDefinition = {
  id: "neko-kumojima",
  title: "ねこ雲島と ひかりのしっぽ",
  subtitle: "6つの そらを とび、ひかりの せいれいを たすけよう",
  description:
    "そよかぜ草原から天空の王冠島まで、30のロングコースを飛ぶ3Dアドベンチャー。リング、精霊、ことば、かず、時計のミッションに挑戦します。",
  accent: "#55cceb",
  accent2: "#ffc85c",
  ageLabel: "6〜8さい",
  stageNoun: "フライト",
  primaryLabel: "かぜダッシュ",
  secondaryLabel: "ひかりナビ",
  stages: cloudStages,
  collectionLabel: "ひかりのしっぽ",
  collectionTotal: 30,
  safetyNote:
    "おちても雲が助けます。かたむけ操作を使わなくても、画面のスティックだけですべて遊べます。"
};

interface FlightRing {
  mesh: Mesh;
  collected: boolean;
  phase: number;
}

interface FlightSpirit {
  node: TransformNode;
  collected: boolean;
  phase: number;
  rescuedAt: number;
}

interface DriftingCloud {
  node: TransformNode;
  speed: number;
  startX: number;
  phase: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(current: number, target: number, amount: number): number {
  return current + (target - current) * clamp(amount, 0, 1);
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

function routeHash(value: string): number {
  let result = 17;
  for (const char of value) result = (result * 31 + char.charCodeAt(0)) >>> 0;
  return result;
}

const RING_COLORS = ["#ff3f7f", "#ff9f1c", "#7657ff", "#00a86b", "#e83cff"] as const;
const SPIRIT_COLORS = ["#ff4f87", "#ffad24", "#795cff", "#16b968", "#df45d3"] as const;
const SPIRIT_ACCENTS = ["#ffd83d", "#ff5f45", "#39dfc1", "#ff82c2", "#55d7ff"] as const;

class CloudFlightController implements SceneController {
  readonly scene: Scene;
  private readonly context: GameFactoryContext;
  private readonly stage: StageDefinition;
  private readonly camera: ArcRotateCamera;
  private readonly cat: TransformNode;
  private readonly rings: FlightRing[] = [];
  private readonly spirits: FlightSpirit[] = [];
  private readonly clouds: DriftingCloud[] = [];
  private readonly trail: ParticleSystem;
  private readonly gateGlow: ParticleSystem;
  private readonly goal: Mesh;
  private readonly trackLength: number;
  private elapsed = 0;
  private ringCount = 0;
  private spiritCount = 0;
  private magicTimer = 0;
  private finishStarted = false;
  private disposed = false;
  private lastHelpAt = -20;
  private dashAmount = 0;

  constructor(context: GameFactoryContext, stage: StageDefinition) {
    this.context = context;
    this.stage = stage;
    this.scene = new Scene(context.engine);
    this.trackLength = 235 + stage.areaIndex * 24 + stage.difficulty * 18;

    const night = stage.variant.startsWith("moon") || stage.variant.startsWith("crown");
    const world = createWorld(this.scene, {
      name: `cloud-world-${stage.id}`,
      clearColor: stage.palette[0],
      fogColor: colorMix(stage.palette[0], stage.palette[2], 0.18),
      fogDensity: night ? 0.0026 : 0.0035,
      sunColor: night ? "#c9dcff" : "#fff2cb",
      sunDirection: [-0.45, -0.82, 0.36],
      sunIntensity: night ? 1.15 : 1.35,
      ambientColor: night ? "#879ce9" : "#d7f4ff",
      ambientIntensity: night ? 0.58 : 0.64,
      glowIntensity: night ? 0.68 : 0.38,
      shadowMapSize: context.ui.getSettings().quality === "eco" ? 512 : 1024,
      camera: true,
      cameraTarget: [0, 8, 0],
      cameraRadius: 12.5,
      cameraAlpha: Math.PI / 2,
      cameraBeta: 1.43
    });

    this.camera = world.camera!;
    this.camera.fov = 0.8;
    this.camera.minZ = 0.08;
    this.camera.maxZ = 650;
    this.camera.lowerRadiusLimit = 9;
    this.camera.upperRadiusLimit = 17;
    this.camera.inputs.clear();

    const startPoint = this.flightPoint(-0.035);
    this.cat = createCat(this.scene, {
      name: "そらねこミル",
      position: [startPoint.x, startPoint.y, startPoint.z],
      size: 0.98,
      bodyColor: "#efa963",
      patchColor: "#fff2d1",
      scarfColor: stage.palette[2],
      wings: true,
      shadowGenerator: world.shadowGenerator
    });

    this.trail = createParticles(this.scene, {
      name: "ひかりのしっぽ",
      emitter: this.cat,
      color: stage.palette[2],
      color2: stage.palette[0],
      capacity: context.ui.getSettings().quality === "eco" ? 120 : 320,
      emitRate: context.ui.getSettings().reducedMotion ? 12 : 48,
      minSize: 0.05,
      maxSize: 0.22,
      minLifeTime: 0.45,
      maxLifeTime: 1.4,
      speed: 0.35,
      gravity: [0, 0.08, 1.2]
    });

    this.createWindRoad();
    this.createTerrain(world.shadowGenerator);
    this.createCollectibles(world.shadowGenerator);

    const goalPoint = this.flightPoint(1.03);
    this.goal = createRing(this.scene, {
      name: "おかえり門",
      position: goalPoint,
      radius: 3.35,
      thickness: 0.5,
      color: stage.palette[2],
      emissiveStrength: 1.45,
      shadowGenerator: world.shadowGenerator
    });
    const innerGate = createRing(this.scene, {
      name: "おかえり門の光",
      position: goalPoint,
      radius: 2.72,
      thickness: 0.16,
      color: "#ffffff",
      emissiveStrength: 1.8
    });
    innerGate.parent = this.goal;
    innerGate.position.set(0, 0, 0);
    this.gateGlow = createParticles(this.scene, {
      name: "門のきらめき",
      emitter: this.goal,
      color: stage.palette[2],
      color2: "#ffffff",
      capacity: 180,
      emitRate: context.ui.getSettings().reducedMotion ? 8 : 26,
      minSize: 0.08,
      maxSize: 0.28,
      minLifeTime: 0.6,
      maxLifeTime: 1.5,
      speed: 0.45,
      gravity: [0, 0.28, 0]
    });

    this.camera.setTarget(this.cat.position.add(new Vector3(0, 1.05, -1.8)));
    context.ui.setMission(stage.mission);
    context.ui.setCounter("助けた精霊", 0, stage.targets);
    context.ui.setHint("左のスティックで上下左右へ。リングの中を飛ぼう！", true);
    context.ui.say(`${stage.area}、${stage.title}。ひかりの精霊を助けにいこう！`);
  }

  private flightPoint(progress: number, sideOffset = 0): Vector3 {
    const route = this.stage.variant.split(":")[1] ?? "gentle";
    const hash = routeHash(route);
    const turns = 1.2 + (hash % 5) * 0.34;
    const phase = ((hash >>> 3) % 17) * 0.15;
    const amplitude = 5.8 + this.stage.difficulty * 1.65 + (hash % 3);
    let x = Math.sin(progress * Math.PI * 2 * turns + phase) * amplitude;
    let y =
      8.8 +
      Math.sin(progress * Math.PI * (2.2 + ((hash >>> 5) % 4) * 0.35) + phase * 0.7) *
        (2.2 + this.stage.difficulty * 0.55);

    if (route.includes("rise") || route.includes("stairs")) y += progress * 5.5;
    if (route.includes("dive")) y += Math.sin(progress * Math.PI) * 7 - progress * 2;
    if (route.includes("spiral") || route.includes("helix")) {
      x += Math.cos(progress * Math.PI * 7) * 3.8;
      y += Math.sin(progress * Math.PI * 7) * 2.4;
    }
    if (route.includes("maze") || route.includes("corridor")) {
      x = Math.round(x / 4.5) * 4.5;
    }
    if (route.includes("grand") || route.includes("tour") || route.includes("jewel")) {
      x += Math.sin(progress * Math.PI * 6.5) * 3.5;
    }

    return new Vector3(x + sideOffset, clamp(y, 5.2, 17.5), 9 - progress * this.trackLength);
  }

  private createWindRoad(): void {
    const path: Vector3[] = [];
    for (let index = 0; index <= 90; index += 1) path.push(this.flightPoint(index / 90));
    const ribbon = MeshBuilder.CreateTube(
      "そよかぜの道",
      {
        path,
        radius: 0.075,
        tessellation: 8,
        updatable: false,
        cap: Mesh.CAP_ALL
      },
      this.scene
    );
    ribbon.material = mat(this.scene, "そよかぜの道マテリアル", this.stage.palette[2], {
      emissive: this.stage.palette[2],
      emissiveStrength: 0.95,
      alpha: 0.34
    });
    ribbon.isPickable = false;

    const lanternMaterial = mat(
      this.scene,
      "そらみちランタンの いろ",
      this.stage.palette[1],
      {
        emissive: this.stage.palette[2],
        emissiveStrength: 0.7,
        roughness: 0.32
      }
    );
    for (let index = 0; index < 28; index += 1) {
      const progress = 0.09 + (index / 27) * 0.89;
      const point = this.flightPoint(
        progress,
        (index % 2 === 0 ? -1 : 1) * (2.8 + (index % 3) * 0.75)
      );
      const lantern = MeshBuilder.CreateSphere(
        `そらみちランタン-${index + 1}`,
        { diameter: 0.58 + (index % 4 === 0 ? 0.18 : 0), segments: 10 },
        this.scene
      );
      lantern.position.copyFrom(point);
      lantern.position.y -= 0.65;
      lantern.material = lanternMaterial;
      lantern.isPickable = false;
    }
  }

  private createTerrain(shadowGenerator: ReturnType<typeof createWorld>["shadowGenerator"]): void {
    const random = seeded(this.stage.seed);
    const biome = this.stage.variant.split(":")[0] ?? "meadow";
    const earthColor = colorMix(this.stage.palette[1], "#594459", 0.58);
    const treeColor =
      biome === "sunset"
        ? "#e78a65"
        : biome === "moon"
          ? "#5964b7"
          : biome === "aurora"
            ? "#b9ecdf"
            : biome === "crown"
              ? "#f0b75e"
              : this.stage.palette[1];

    for (let index = 0; index < 13; index += 1) {
      const progress = index / 12;
      const center = this.flightPoint(progress);
      const side = index % 2 === 0 ? -1 : 1;
      const radius = 4.2 + random() * 2.6;
      const islandX = center.x + side * (10.5 + random() * 8);
      const islandY = center.y - 5.5 - random() * 3;
      const island = createIsland(this.scene, {
        name: `浮島-${index + 1}`,
        position: [islandX, islandY, center.z + (random() - 0.5) * 11],
        radius,
        height: 3.5 + random() * 3.2,
        topColor: this.stage.palette[1],
        earthColor,
        rimColor: colorMix(this.stage.palette[1], "#ffffff", 0.24),
        seed: this.stage.seed + index * 37,
        crystals: biome === "aurora" || biome === "moon" || biome === "crown" ? 2 + (index % 3) : 0,
        shadowGenerator
      });

      if (biome !== "aurora" && biome !== "crown") {
        const treeCount = biome === "moon" ? 2 : 1 + (index % 3);
        for (let treeIndex = 0; treeIndex < treeCount; treeIndex += 1) {
          const angle = random() * Math.PI * 2;
          const distance = radius * (0.25 + random() * 0.42);
          createTree(this.scene, {
            name: `空の木-${index}-${treeIndex}`,
            position: [
              island.position.x + Math.cos(angle) * distance,
              island.position.y + 0.48,
              island.position.z + Math.sin(angle) * distance
            ],
            height: 2.2 + random() * 1.8,
            leafColor: treeColor,
            fruitColor: this.stage.palette[2],
            fruitCount: index % 4 === 0 ? 3 : 0,
            seed: this.stage.seed + index * 11 + treeIndex,
            shadowGenerator
          });
        }
      } else {
        createRock(this.scene, {
          name: `光る岩-${index}`,
          position: [island.position.x, island.position.y + 0.8, island.position.z],
          radius: 0.8 + random() * 0.7,
          color: earthColor,
          accent: this.stage.palette[2],
          crystal: true,
          seed: this.stage.seed + index,
          shadowGenerator
        });
      }
    }

    const cloudCount = this.context.ui.getSettings().quality === "eco" ? 15 : 26;
    for (let index = 0; index < cloudCount; index += 1) {
      const progress = random() * 1.12;
      const point = this.flightPoint(progress);
      const side = index % 2 === 0 ? -1 : 1;
      const node = createCloud(this.scene, {
        name: `ながれる雲-${index}`,
        position: [
          point.x + side * (7 + random() * 10),
          4.5 + random() * 10,
          point.z + (random() - 0.5) * 17
        ],
        size: 2.5 + random() * 2.8,
        color: colorMix(this.stage.palette[0], "#ffffff", 0.66),
        glowColor: biome === "moon" ? "#aab9ff" : this.stage.palette[2],
        puffs: 4 + Math.floor(random() * 4),
        seed: this.stage.seed + 900 + index,
        shadowGenerator
      });
      this.clouds.push({
        node,
        speed: 0.12 + random() * 0.24,
        startX: node.position.x,
        phase: random() * Math.PI * 2
      });
    }
  }

  private createCollectibles(
    shadowGenerator: ReturnType<typeof createWorld>["shadowGenerator"]
  ): void {
    const random = seeded(this.stage.seed + 500);
    const ringTotal = this.stage.bonusTargets + 5;
    for (let index = 0; index < ringTotal; index += 1) {
      const progress = 0.055 + (index / Math.max(1, ringTotal - 1)) * 0.83;
      const point = this.flightPoint(progress, (random() - 0.5) * 1.4);
      const ringColor = RING_COLORS[(index + this.stage.areaIndex) % RING_COLORS.length]!;
      const ring = createRing(this.scene, {
        name: `ひかりリング-${index + 1}`,
        position: point,
        radius: 1.55 + (index % 5 === 4 ? 0.28 : 0),
        thickness: 0.29,
        color: ringColor,
        emissiveStrength: 1.45,
        shadowGenerator
      });
      const beacon = MeshBuilder.CreateSphere(
        `リングの ひかり-${index + 1}`,
        { diameter: 0.62, segments: 10 },
        this.scene
      );
      beacon.parent = ring;
      beacon.material = mat(
        this.scene,
        `リングの ひかりマテリアル-${index + 1}`,
        ringColor,
        {
          emissive: ringColor,
          emissiveStrength: 1.45,
          roughness: 0.2
        }
      );
      beacon.isPickable = false;
      this.rings.push({ mesh: ring, collected: false, phase: random() * Math.PI * 2 });
    }

    for (let index = 0; index < this.stage.targets; index += 1) {
      const progress = 0.13 + (index / Math.max(1, this.stage.targets - 1)) * 0.68;
      const side = index % 2 === 0 ? 1 : -1;
      const point = this.flightPoint(progress, side * (2.6 + random() * 2.4));
      const spiritColor =
        SPIRIT_COLORS[(index + this.stage.areaIndex) % SPIRIT_COLORS.length]!;
      const spiritAccent =
        SPIRIT_ACCENTS[(index * 2 + this.stage.areaIndex) % SPIRIT_ACCENTS.length]!;
      const spirit = createSpirit(this.scene, {
        name: `迷子の精霊-${index + 1}`,
        position: point,
        size: 1.02 + this.stage.difficulty * 0.08,
        color: spiritColor,
        accent: spiritAccent,
        wings: true,
        particles: this.context.ui.getSettings().quality !== "eco",
        shadowGenerator
      });
      this.spirits.push({
        node: spirit,
        collected: false,
        phase: random() * Math.PI * 2,
        rescuedAt: -1
      });
    }
  }

  update(deltaSeconds: number, input: InputState): void {
    if (this.finishStarted || this.disposed) return;
    const delta = Math.min(deltaSeconds, 0.05);
    this.elapsed += delta;
    this.magicTimer = Math.max(0, this.magicTimer - delta);

    const tiltScale = this.context.ui.getSettings().tilt ? 0.72 : 0;
    const horizontal = clamp(input.moveX + input.tiltX * tiltScale, -1, 1);
    const vertical = clamp(input.moveY - input.tiltY * tiltScale, -1, 1);
    const dashTarget = input.primaryHeld ? 1 : 0;
    this.dashAmount = lerp(this.dashAmount, dashTarget, delta * 5.5);
    const speed = 8.3 + this.stage.difficulty * 1.1 + this.dashAmount * 5.2;

    // At alpha +PI/2 the chase camera's screen-right is world -X.
    this.cat.position.x = clamp(this.cat.position.x - horizontal * delta * 9.5, -20, 20);
    this.cat.position.y = clamp(this.cat.position.y + vertical * delta * 7.7, 3.9, 18.5);
    this.cat.position.z -= speed * delta;
    const routeProgress = clamp((9 - this.cat.position.z) / this.trackLength, 0, 1);
    const routeGuide = this.flightPoint(routeProgress);
    const horizontalAssist = Math.abs(horizontal) < 0.08 ? 0.72 : 0.16;
    const verticalAssist = Math.abs(vertical) < 0.08 ? 0.38 : 0.1;
    this.cat.position.x = lerp(this.cat.position.x, routeGuide.x, delta * horizontalAssist);
    this.cat.position.y = lerp(this.cat.position.y, routeGuide.y, delta * verticalAssist);
    // Positive Z roll leans local-up toward world -X, which is screen-right for this camera.
    this.cat.rotation.z = lerp(this.cat.rotation.z, horizontal * 0.38, delta * 5);
    this.cat.rotation.x = lerp(this.cat.rotation.x, vertical * 0.18, delta * 4);
    this.cat.rotation.y = Math.sin(this.elapsed * 0.6) * 0.025;
    this.cat.position.y += Math.sin(this.elapsed * 5.2) * delta * 0.08;
    this.trail.emitRate =
      (this.context.ui.getSettings().reducedMotion ? 12 : 42) + this.dashAmount * 70;

    this.camera.radius = lerp(this.camera.radius, 12.4 + this.dashAmount * 2, delta * 3);
    this.camera.setTarget(
      Vector3.Lerp(
        this.camera.target,
        this.cat.position.add(new Vector3(0, 1.05, -1.8 - this.dashAmount * 1.2)),
        clamp(delta * 5, 0, 1)
      )
    );

    for (const cloud of this.clouds) {
      cloud.node.position.x =
        cloud.startX + Math.sin(this.elapsed * cloud.speed + cloud.phase) * 2.4;
    }

    for (const ring of this.rings) {
      if (ring.collected) continue;
      ring.mesh.rotation.z += delta * (0.45 + this.stage.difficulty * 0.08);
      ring.mesh.scaling.setAll(1 + Math.sin(this.elapsed * 3 + ring.phase) * 0.035);
      const collectRadius = this.magicTimer > 0 ? 3.7 : 2.25;
      if (Vector3.DistanceSquared(ring.mesh.position, this.cat.position) < collectRadius ** 2) {
        this.collectRing(ring);
      }
    }

    for (let index = 0; index < this.spirits.length; index += 1) {
      const spirit = this.spirits[index]!;
      if (spirit.collected) continue;
      spirit.node.rotation.y += delta * 1.25;
      spirit.node.position.y += Math.sin(this.elapsed * 3.1 + spirit.phase) * delta * 0.28;
      const collectRadius =
        this.magicTimer > 0 || (this.elapsed > 110 && this.stage.difficulty === 1) ? 5.3 : 3.1;
      if (Vector3.DistanceSquared(spirit.node.position, this.cat.position) < collectRadius ** 2) {
        this.collectSpirit(spirit);
      } else if (spirit.node.position.z > this.cat.position.z + 19) {
        const ahead = 42 + index * 7;
        spirit.node.position.set(
          clamp(this.cat.position.x + (index % 2 === 0 ? 1 : -1) * (3 + index * 0.35), -17, 17),
          clamp(this.cat.position.y + Math.sin(index) * 2.4, 5, 17),
          this.cat.position.z - ahead
        );
        if (this.elapsed - this.lastHelpAt > 12) {
          this.context.ui.toast("雲の風が、迷子の精霊を前へ運んだよ。", "info");
          this.lastHelpAt = this.elapsed;
        }
      }
    }

    const ready = this.spiritCount >= this.stage.targets;
    if (this.goal.position.z > this.cat.position.z + 10) {
      this.goal.position.set(
        clamp(this.cat.position.x * 0.35, -8, 8),
        clamp(this.cat.position.y, 6.5, 14.5),
        this.cat.position.z - (ready ? 54 : 82)
      );
    }
    this.goal.rotation.z += delta * (ready ? 0.7 : 0.2);
    const gateScale = ready ? 1 + Math.sin(this.elapsed * 3) * 0.04 : 0.82;
    this.goal.scaling.setAll(gateScale);

    if (ready) {
      this.context.ui.setHint(
        this.ringCount >= this.stage.bonusTargets
          ? "リング目標も達成！ 光る「おかえり門」へ飛びこもう！"
          : `精霊を全員助けたよ。リングは あと ${Math.max(0, this.stage.bonusTargets - this.ringCount)}こで星ボーナス！`,
        true
      );
      if (Vector3.DistanceSquared(this.goal.position, this.cat.position) < 4.1 ** 2) {
        void this.finishStage();
      }
    } else {
      this.context.ui.setHint(
        `精霊 あと ${this.stage.targets - this.spiritCount}ひき・リング ${this.ringCount}/${this.stage.bonusTargets}`,
        true
      );
    }
  }

  private collectRing(ring: FlightRing): void {
    ring.collected = true;
    ring.mesh.setEnabled(false);
    this.ringCount += 1;
    this.context.ui.playTone("collect");
    if (this.ringCount === this.stage.bonusTargets) {
      this.context.ui.toast("リング目標クリア！ きらきら星ボーナス！", "good");
      this.context.ui.say("リング目標クリア！");
    }
    this.burst(ring.mesh.position, this.stage.palette[2]);
  }

  private collectSpirit(spirit: FlightSpirit): void {
    spirit.collected = true;
    spirit.rescuedAt = this.elapsed;
    spirit.node.setEnabled(false);
    this.spiritCount += 1;
    this.context.ui.setCounter("助けた精霊", this.spiritCount, this.stage.targets);
    this.context.ui.playTone("magic");
    this.context.ui.toast(`精霊をたすけた！ ${this.spiritCount}/${this.stage.targets}`, "good");
    this.burst(spirit.node.position, "#ffffff");
    if (this.spiritCount >= this.stage.targets) {
      this.context.ui.say("みんな助けたよ。おかえり門へ向かおう！");
    }
  }

  private burst(position: Vector3, color: string): void {
    const particles = createParticles(this.scene, {
      emitter: position.clone(),
      color,
      color2: this.stage.palette[0],
      capacity: 90,
      emitRate: 260,
      minSize: 0.08,
      maxSize: 0.3,
      minLifeTime: 0.25,
      maxLifeTime: 0.75,
      speed: 1.7,
      gravity: [0, 0.4, 0]
    });
    window.setTimeout(() => particles.stop(), 180);
    window.setTimeout(() => particles.dispose(), 1000);
  }

  primary(pressed: boolean): void {
    if (!pressed || this.finishStarted) return;
    this.context.ui.playTone("tap");
  }

  secondary(pressed: boolean): void {
    if (!pressed || this.finishStarted || this.magicTimer > 0.2) return;
    this.magicTimer = 4.5;
    this.context.ui.playTone("magic");
    this.context.ui.toast("ひかりナビ！ 近くのリングと精霊を引きよせるよ。", "good");
    this.burst(this.cat.position, this.stage.palette[0]);
  }

  private async finishStage(): Promise<void> {
    if (this.finishStarted) return;
    this.finishStarted = true;
    this.context.ui.playTone("success");
    this.context.ui.say("おかえり！ 最後のひかりの問題だよ。");
    const learned = await this.context.ui.ask(this.stage.question);
    if (this.disposed) return;
    const ringBonus = this.ringCount >= this.stage.bonusTargets;
    const stars = (ringBonus && learned ? 3 : ringBonus || learned ? 2 : 1) as 1 | 2 | 3;
    this.context.ui.addCollection(this.stage.id);
    this.context.ui.complete({
      stars,
      score:
        1200 +
        this.spiritCount * 240 +
        this.ringCount * 55 +
        (learned ? 500 : 0) +
        Math.max(0, 900 - Math.round(this.elapsed * 4)),
      collected: this.spiritCount + this.ringCount,
      bonus: ringBonus,
      message:
        stars === 3
          ? "光のしっぽが空いっぱいにのびたよ！"
          : learned
            ? "ことばと数のひかりが強くなったよ！"
            : "いっしょに答えを見つけて、ぶじに帰れたよ！"
    });
  }

  pause(): void {
    this.trail.stop();
    this.gateGlow.stop();
  }

  resume(): void {
    this.trail.start();
    this.gateGlow.start();
  }

  dispose(): void {
    this.disposed = true;
    this.trail.dispose();
    this.gateGlow.dispose();
    this.scene.dispose();
  }
}

const createCloudFlight: GameFactory = (context, stage) =>
  new CloudFlightController(context, stage);

void bootstrapGame(definition, createCloudFlight);
