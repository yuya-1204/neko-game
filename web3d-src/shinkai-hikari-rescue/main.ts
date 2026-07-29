import {
  ArcRotateCamera,
  Mesh,
  MeshBuilder,
  ParticleSystem,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
} from "babylonjs";
import { bootstrapGame } from "../shared/runtime";
import type {
  GameDefinition,
  GameFactoryContext,
  InputState,
  SceneController,
  StageDefinition,
} from "../shared/types";
import {
  createCat,
  createClockFace,
  createCoral,
  createFish,
  createParticles,
  createRing,
  createRock,
  createWorld,
  mat,
  setClockTime,
} from "../shared/visuals";
import { isSeaStage, seaStages, type SeaStage } from "./stages";

const definition: GameDefinition = {
  id: "shinkai-hikari-rescue",
  title: "深海ひかりレスキュー",
  subtitle: "ソナーで みつけて、ひかりの なかまを おうちへ",
  description:
    "6つの海域、30の救助ミッションをめぐる非戦闘3D探索ゲーム。海流や暗い洞窟を進み、生きものを助け、群れと一緒に光の家へ帰ります。",
  accent: "#28d7cf",
  accent2: "#ffca62",
  ageLabel: "6〜8さい",
  stageNoun: "レスキュー",
  primaryLabel: "ソナー",
  secondaryLabel: "たすける",
  stages: seaStages,
  collectionLabel: "ひかりずかん",
  collectionTotal: 30,
  safetyNote:
    "たたかい、酸素切れ、ゲームオーバーはありません。迷った時はソナーが道を光らせ、海流が安全な場所へ戻します。",
};

interface FishFriend {
  root: TransformNode;
  home: Vector3;
  phase: number;
  rescued: boolean;
  followIndex: number;
}

interface Pearl {
  mesh: Mesh;
  collected: boolean;
  phase: number;
}

interface Obstacle {
  position: Vector3;
  radius: number;
}

interface SonarWave {
  mesh: Mesh;
  age: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, amount: number): number {
  return a + (b - a) * clamp(amount, 0, 1);
}

function seeded(seed: number): () => number {
  let state = Math.max(1, Math.floor(seed)) >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function horizontalDistanceSquared(a: Vector3, b: Vector3): number {
  const x = a.x - b.x;
  const z = a.z - b.z;
  return x * x + z * z;
}

function fishPositions(stage: SeaStage): Vector3[] {
  const random = seeded(stage.seed + 41);
  const positions: Vector3[] = [];
  const count = stage.targets;
  for (let index = 0; index < count; index += 1) {
    const ratio = count <= 1 ? 0 : index / (count - 1);
    let x = 0;
    let z = 0;
    switch (stage.formation) {
      case "arc": {
        const angle = -1.15 + ratio * 2.3;
        const radius = 10 + (index % 2) * 4 + stage.difficulty;
        x = Math.sin(angle) * radius;
        z = -4 - Math.cos(angle) * radius;
        break;
      }
      case "ring": {
        const angle = (index / count) * Math.PI * 2 + 0.4;
        const radius = 11 + stage.difficulty * 1.2;
        x = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius - 3;
        break;
      }
      case "line":
        x = (ratio - 0.5) * 24 + Math.sin(index * 1.7) * 1.8;
        z = -7 - index * 1.7;
        break;
      case "school": {
        const row = Math.floor(index / 3);
        const column = index % 3;
        x = (column - 1) * 4.5 + (row % 2) * 1.8;
        z = -9 - row * 5.2;
        break;
      }
      case "layers": {
        const angle = index * 2.1;
        x = Math.sin(angle) * (7 + index * 0.75);
        z = -7 - Math.cos(angle) * (5 + index * 0.7);
        break;
      }
    }
    if (stage.route === "split") x += index % 2 === 0 ? 4.5 : -4.5;
    if (stage.route === "current") z -= index * 1.2;
    if (stage.route === "cave") x = clamp(x, -12, 12);
    positions.push(
      new Vector3(
        x + (random() - 0.5) * 1.5,
        0.2 + (random() - 0.5) * stage.depthRange * 2,
        z + (random() - 0.5) * 2,
      ),
    );
  }
  return positions;
}

class SeaRescueController implements SceneController {
  readonly scene: Scene;
  private readonly context: GameFactoryContext;
  private readonly stage: SeaStage;
  private readonly camera: ArcRotateCamera;
  private readonly submarine: TransformNode;
  private readonly propeller: TransformNode;
  private readonly homeRing: Mesh;
  private readonly homePosition: Vector3;
  private readonly fish: FishFriend[] = [];
  private readonly pearls: Pearl[] = [];
  private readonly obstacles: Obstacle[] = [];
  private readonly sonarWaves: SonarWave[] = [];
  private readonly bubbles: ParticleSystem;
  private rescuedCount = 0;
  private pearlCount = 0;
  private elapsed = 0;
  private sonarTimer = 0;
  private sonarCooldown = 0;
  private finishing = false;
  private disposed = false;
  private lastPrimary = false;
  private lastSecondary = false;
  private lastBoundaryHelp = -20;
  private lastObstacleSound = -5;
  private lastProgressAt = 0;

  constructor(context: GameFactoryContext, sourceStage: StageDefinition) {
    this.context = context;
    this.stage = isSeaStage(sourceStage) ? sourceStage : seaStages[0]!;
    this.scene = new Scene(context.engine);

    const world = createWorld(this.scene, {
      name: `shinkai-world-${this.stage.id}`,
      clearColor: this.stage.palette[2],
      fogColor: this.stage.palette[2],
      fogDensity: 0.008 + (1 - this.stage.visibility) * 0.035,
      sunColor: this.stage.areaIndex < 2 ? "#bbf6ff" : "#80a9ff",
      sunDirection: [-0.25, -0.9, 0.18],
      sunIntensity: this.stage.areaIndex < 2 ? 1.5 : 0.72,
      ambientColor: this.stage.palette[0],
      ambientIntensity: 0.58,
      glowIntensity: this.stage.areaIndex >= 3 ? 1.05 : 0.72,
      shadowMapSize: context.ui.getSettings().quality === "eco" ? 512 : 1024,
      camera: true,
      cameraTarget: [0, 0, -2],
      cameraRadius: 17,
      cameraAlpha: -Math.PI / 2,
      cameraBeta: 0.9,
    });
    this.camera = world.camera!;
    this.camera.fov = 0.86;
    this.camera.minZ = 0.08;
    this.camera.maxZ = 260;
    this.camera.lowerRadiusLimit = 14;
    this.camera.upperRadiusLimit = 22;
    this.camera.inputs.clear();

    const seabed = MeshBuilder.CreateGround(
      "うみの そこ",
      { width: 60, height: 70, subdivisions: 2 },
      this.scene,
    );
    seabed.position.set(0, -4.2, -8);
    seabed.material = mat(
      this.scene,
      "うみの そこの いろ",
      this.stage.areaIndex < 2 ? "#2f8f95" : "#18375f",
      {
      roughness: 1,
      emissive: this.stage.palette[0],
      emissiveStrength: this.stage.areaIndex >= 3 ? 0.04 : 0.07,
      },
    );
    seabed.receiveShadows = true;

    const submarine = this.createSubmarine(world.shadowGenerator);
    this.submarine = submarine.root;
    this.propeller = submarine.propeller;
    this.submarine.position.set(0, 0.4, 3.5);

    this.homePosition = new Vector3(...this.stage.beacon);
    this.homeRing = createRing(this.scene, {
      name: "ひかりの いえ",
      position: this.homePosition,
      radius: 2.25,
      thickness: 0.3,
      color: this.stage.palette[1],
      emissiveStrength: 1.45,
      vertical: false,
      shadowGenerator: world.shadowGenerator,
    });
    const homeLight = MeshBuilder.CreateCylinder(
      "いえの ひかり",
      { height: 0.18, diameter: 3.7, tessellation: 24 },
      this.scene,
    );
    homeLight.position.copyFrom(this.homePosition);
    homeLight.position.y -= 0.12;
    homeLight.material = mat(this.scene, "いえの ひかりの いろ", this.stage.palette[1], {
      emissive: true,
      emissiveStrength: 1.15,
      alpha: 0.72,
    });

    if (this.stage.route === "clock-gate" || this.stage.areaIndex === 4) {
      const clock = createClockFace(this.scene, {
        name: "しおどけい",
        position: [this.homePosition.x, this.homePosition.y + 2.7, this.homePosition.z],
        radius: 1.15,
        faceColor: "#fff9df",
        rimColor: this.stage.palette[1],
        hourColor: this.stage.palette[2],
        minuteColor: "#f15f78",
        hour: this.stage.difficulty === 1 ? 3 : this.stage.difficulty === 2 ? 5 : 9,
        minute: this.stage.difficulty === 1 ? 0 : this.stage.difficulty === 2 ? 30 : 15,
        showNumbers: true,
        shadowGenerator: world.shadowGenerator,
      });
      clock.rotation.y = Math.PI;
      setClockTime(
        clock,
        this.stage.difficulty === 1 ? 3 : this.stage.difficulty === 2 ? 5 : 9,
        this.stage.difficulty === 1 ? 0 : this.stage.difficulty === 2 ? 30 : 15,
      );
    }

    this.createSeaLife(world.shadowGenerator);
    this.createFishFriends(world.shadowGenerator);
    this.createPearls();
    this.createCurrentRoads();

    this.bubbles = createParticles(this.scene, {
      name: "せんすいきの あわ",
      emitter: this.submarine,
      color: "#d9fbff",
      color2: this.stage.palette[0],
      capacity: context.ui.getSettings().quality === "eco" ? 90 : 220,
      emitRate: context.ui.getSettings().reducedMotion ? 8 : 34,
      minSize: 0.04,
      maxSize: 0.18,
      minLifeTime: 0.65,
      maxLifeTime: 1.8,
      speed: 0.3,
      gravity: [0, 0.48, 0.7],
    });

    context.ui.setMission(this.stage.mission);
    context.ui.setCounter("たすけた なかま", 0, this.stage.targets);
    context.ui.setHint("スティックで すすみ、「ソナー」で ひかりを さがそう", true);
    context.ui.say(
      `${this.stage.area}、${this.stage.title}。${this.stage.creature}を たすけに いこう！`,
    );
  }

  private createSubmarine(
    shadowGenerator: ReturnType<typeof createWorld>["shadowGenerator"],
  ): { root: TransformNode; propeller: TransformNode } {
    const root = new TransformNode("ねこせんすいき", this.scene);
    const hullMaterial = mat(this.scene, "せんすいきの いろ", "#f4bd46", {
      roughness: 0.48,
      specular: "#fff1b0",
    });
    const accentMaterial = mat(this.scene, "せんすいきの アクセント", "#e45d75", {
      roughness: 0.58,
    });
    const glassMaterial = mat(this.scene, "まるまど", "#8be8ff", {
      emissive: "#4cc9ff",
      emissiveStrength: 0.45,
      alpha: 0.76,
      roughness: 0.18,
    });

    const hull = MeshBuilder.CreateSphere(
      "せんすいきの からだ",
      { diameter: 2.2, segments: 20 },
      this.scene,
    );
    hull.parent = root;
    hull.scaling.set(0.82, 0.65, 1.4);
    hull.material = hullMaterial;
    shadowGenerator?.addShadowCaster(hull);

    const windowMesh = MeshBuilder.CreateSphere(
      "せんすいきの まど",
      { diameter: 1.15, segments: 18 },
      this.scene,
    );
    windowMesh.parent = root;
    windowMesh.position.set(0, 0.42, -0.35);
    windowMesh.scaling.set(0.82, 0.62, 0.78);
    windowMesh.material = glassMaterial;

    const nose = MeshBuilder.CreateCylinder(
      "せんすいきの はな",
      { height: 0.9, diameterTop: 0, diameterBottom: 1.1, tessellation: 18 },
      this.scene,
    );
    nose.parent = root;
    nose.position.z = -1.45;
    nose.rotation.x = Math.PI / 2;
    nose.material = hullMaterial;

    for (const side of [-1, 1]) {
      const fin = MeshBuilder.CreateBox(
        `せんすいきの ひれ-${side}`,
        { width: 1.2, height: 0.12, depth: 0.75 },
        this.scene,
      );
      fin.parent = root;
      fin.position.set(side * 1.05, -0.2, 0.2);
      fin.rotation.z = side * -0.12;
      fin.material = accentMaterial;
    }

    const propeller = new TransformNode("プロペラ", this.scene);
    propeller.parent = root;
    propeller.position.set(0, 0, 1.65);
    const hub = MeshBuilder.CreateCylinder(
      "プロペラの まんなか",
      { height: 0.42, diameter: 0.4, tessellation: 14 },
      this.scene,
    );
    hub.parent = propeller;
    hub.rotation.x = Math.PI / 2;
    hub.material = accentMaterial;
    for (let index = 0; index < 4; index += 1) {
      const blade = MeshBuilder.CreateBox(
        `プロペラの はね-${index}`,
        { width: 0.23, height: 1.05, depth: 0.12 },
        this.scene,
      );
      blade.parent = propeller;
      blade.position.y = 0.48;
      blade.rotation.z = (index * Math.PI) / 2;
      blade.material = accentMaterial;
    }

    const pilot = createCat(this.scene, {
      name: "パイロットねこ",
      position: [0, 0.18, -0.42],
      rotation: [0, Math.PI, 0],
      size: 0.22,
      bodyColor: "#e8a55e",
      patchColor: "#fff0d3",
      scarfColor: "#38c9d4",
      scarf: true,
      shadowGenerator: null,
    });
    pilot.parent = root;

    return { root, propeller };
  }

  private createSeaLife(
    shadowGenerator: ReturnType<typeof createWorld>["shadowGenerator"],
  ): void {
    const random = seeded(this.stage.seed + 300);
    for (let index = 0; index < this.stage.obstacleCount; index += 1) {
      let x = (random() - 0.5) * 40;
      let z = -28 + random() * 44;
      const position = new Vector3(x, -3.55 + random() * 0.5, z);
      if (
        horizontalDistanceSquared(position, this.submarine.position) < 24 ||
        horizontalDistanceSquared(position, this.homePosition) < 16
      ) {
        x += x >= 0 ? 6 : -6;
        z -= 4;
        position.set(x, position.y, z);
      }
      const radius = 0.75 + random() * 1.25;
      this.obstacles.push({ position: position.clone(), radius: radius * 0.86 });

      if (index % 2 === 0) {
        createCoral(this.scene, {
          name: `サンゴ-${index}`,
          position,
          size: radius * 1.2,
          color: index % 4 === 0 ? this.stage.palette[1] : this.stage.palette[0],
          accent: this.stage.areaIndex >= 3 ? "#8ffcff" : "#ff9f9f",
          branches: 3 + (index % 4),
          seed: this.stage.seed + index,
          shadowGenerator,
        });
      } else {
        createRock(this.scene, {
          name: `うみの いわ-${index}`,
          position,
          radius,
          color: this.stage.areaIndex >= 3 ? "#26345f" : "#607c8b",
          accent: this.stage.palette[0],
          crystal: this.stage.areaIndex >= 3 && index % 3 === 1,
          seed: this.stage.seed + index,
          shadowGenerator,
        });
      }
    }

    // A denser, non-blocking foreground makes the first view feel like a
    // living reef without turning decoration into collision hazards.
    const scenicCount = this.context.ui.getSettings().quality === "eco" ? 12 : 22;
    for (let index = 0; index < scenicCount; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const x = side * (4.8 + random() * 12.5);
      const z = -4 + random() * 24;
      const position = new Vector3(x, -3.62 + random() * 0.22, z);
      if (index % 3 !== 2) {
        createCoral(this.scene, {
          name: `けしきの サンゴ-${index}`,
          position,
          size: 0.55 + random() * 0.72,
          color: index % 2 === 0 ? this.stage.palette[1] : "#ff8fb5",
          accent: index % 4 === 0 ? "#fff0a5" : this.stage.palette[0],
          branches: 3 + (index % 3),
          seed: this.stage.seed + 1600 + index,
          shadowGenerator,
        });
      } else {
        createRock(this.scene, {
          name: `けしきの いわ-${index}`,
          position,
          radius: 0.48 + random() * 0.48,
          color: this.stage.areaIndex >= 3 ? "#26345f" : "#527c87",
          accent: this.stage.palette[0],
          crystal: index % 6 === 2,
          seed: this.stage.seed + 1800 + index,
          shadowGenerator,
        });
      }

      if (index % 4 === 0) {
        createFish(this.scene, {
          name: `けしきの こざかな-${index}`,
          position: [x * 0.78, -1.5 + random() * 1.8, z - 1.5],
          size: 0.25 + random() * 0.09,
          color: "#b9f4ef",
          accent: this.stage.palette[1],
          shadowGenerator: null,
        });
      }
    }
  }

  private createFishFriends(
    shadowGenerator: ReturnType<typeof createWorld>["shadowGenerator"],
  ): void {
    const positions = fishPositions(this.stage);
    positions.forEach((position, index) => {
      const fish = createFish(this.scene, {
        name: `${this.stage.creature}-${index + 1}`,
        position,
        size: 0.62 + (index % 3) * 0.05,
        color: this.stage.creatureColor,
        accent: index % 2 === 0 ? this.stage.palette[1] : "#ffffff",
        stripes: index % 3 === 0,
        shadowGenerator,
      });
      fish.rotation.y = (index % 2 === 0 ? 1 : -1) * 0.5;
      this.fish.push({
        root: fish,
        home: position.clone(),
        phase: index * 1.37,
        rescued: false,
        followIndex: -1,
      });
    });
  }

  private createPearls(): void {
    const random = seeded(this.stage.seed + 900);
    for (let index = 0; index < this.stage.pearlCount; index += 1) {
      const angle = ((index + 0.35) / this.stage.pearlCount) * Math.PI * 2;
      const radius = 8 + random() * 8;
      const pearl = MeshBuilder.CreateSphere(
        `ひかりしんじゅ-${index + 1}`,
        { diameter: 0.58, segments: 14 },
        this.scene,
      );
      pearl.position.set(
        Math.cos(angle) * radius,
        -0.4 + random() * this.stage.depthRange,
        -8 + Math.sin(angle) * radius,
      );
      pearl.material = mat(this.scene, `ひかりしんじゅ-${index + 1}-いろ`, "#fff6c8", {
        emissive: "#ffe474",
        emissiveStrength: 1.35,
        roughness: 0.12,
      });
      this.pearls.push({ mesh: pearl, collected: false, phase: random() * Math.PI * 2 });
    }
  }

  private createCurrentRoads(): void {
    if (
      this.stage.route !== "current" &&
      this.stage.route !== "split" &&
      Math.hypot(...this.stage.current) < 0.08
    ) {
      return;
    }
    const currentColor = this.stage.palette[0];
    for (let lane = -1; lane <= 1; lane += 1) {
      const path: Vector3[] = [];
      for (let index = 0; index <= 30; index += 1) {
        const progress = index / 30;
        path.push(
          new Vector3(
            lane * 5 + Math.sin(progress * Math.PI * 4 + lane) * 1.5,
            -1.4 + Math.sin(progress * Math.PI * 2 + lane) * 0.7,
            8 - progress * 36,
          ),
        );
      }
      const stream = MeshBuilder.CreateTube(
        `しおの みち-${lane}`,
        { path, radius: 0.055, tessellation: 7, cap: Mesh.CAP_ALL },
        this.scene,
      );
      stream.material = mat(this.scene, `しおの みち-${lane}-いろ`, currentColor, {
        emissive: currentColor,
        emissiveStrength: 0.8,
        alpha: 0.28,
      });
      stream.isPickable = false;
    }
  }

  private nearestUnrescued(): FishFriend | null {
    let nearest: FishFriend | null = null;
    let best = Number.POSITIVE_INFINITY;
    for (const friend of this.fish) {
      if (friend.rescued) continue;
      const distance = Vector3.DistanceSquared(friend.root.position, this.submarine.position);
      if (distance < best) {
        best = distance;
        nearest = friend;
      }
    }
    return nearest;
  }

  private useSonar(): void {
    if (this.finishing || this.sonarCooldown > 0) {
      if (this.sonarCooldown > 0.2) {
        this.context.ui.toast("ソナーは もうすぐ つかえるよ", "info");
      }
      return;
    }
    this.sonarTimer = 4.5;
    this.sonarCooldown = 2.4;
    this.context.ui.playTone("magic");
    const wave = createRing(this.scene, {
      name: `ソナー-${this.elapsed}`,
      position: this.submarine.position,
      radius: 1,
      thickness: 0.12,
      color: "#8ffcff",
      emissiveStrength: 1.5,
      vertical: false,
    });
    this.sonarWaves.push({ mesh: wave, age: 0 });
    const nearest = this.nearestUnrescued();
    if (nearest) {
      const direction = nearest.root.position.subtract(this.submarine.position);
      const horizontal = Math.abs(direction.x) > Math.abs(direction.z)
        ? direction.x > 0 ? "みぎ" : "ひだり"
        : direction.z > 0 ? "おく" : "てまえ";
      this.context.ui.toast(`${horizontal}の ほうに ${this.stage.creature}の ひかり！`, "good");
      this.context.ui.setHint(`${horizontal}へ すすもう。ひかりの ちかくで「たすける」`, true);
    } else {
      this.context.ui.toast("みんな いっしょ！ ひかりの いえへ かえろう", "good");
    }
  }

  private rescueNearest(): void {
    if (this.finishing) return;
    const friend = this.nearestUnrescued();
    if (!friend) {
      this.context.ui.toast("みんな たすけたよ。ひかりの いえへ かえろう！", "good");
      return;
    }
    const distance = Vector3.Distance(friend.root.position, this.submarine.position);
    const rescueRange = this.sonarTimer > 0 ? 4.4 : 3.2;
    if (distance > rescueRange) {
      this.context.ui.playTone("tap");
      this.context.ui.toast("もうすこし ちかづいてから たすけよう", "info");
      this.context.ui.setHint("ソナーを つかうと、ちかい なかまが おおきく ひかるよ", true);
      return;
    }
    friend.rescued = true;
    friend.followIndex = this.rescuedCount;
    this.rescuedCount += 1;
    this.lastProgressAt = this.elapsed;
    this.context.ui.setCounter("たすけた なかま", this.rescuedCount, this.stage.targets);
    this.context.ui.playTone("collect");
    this.context.ui.toast(
      `${this.stage.creature}を たすけた！ ${this.rescuedCount}/${this.stage.targets}`,
      "good",
    );
    this.burst(friend.root.position, this.stage.creatureColor);
    if (this.rescuedCount >= this.stage.targets) {
      this.context.ui.say("みんな たすけたよ。ひかりの いえへ かえろう！");
      this.context.ui.setHint("きいろく ひかる おおきな わへ かえろう", true);
    }
  }

  private burst(position: Vector3, color: string): void {
    const particles = createParticles(this.scene, {
      name: `レスキューの ひかり-${this.elapsed}`,
      emitter: position.clone(),
      color,
      color2: "#ffffff",
      capacity: 90,
      emitRate: 260,
      minSize: 0.07,
      maxSize: 0.28,
      minLifeTime: 0.25,
      maxLifeTime: 0.85,
      speed: 1.4,
      gravity: [0, 0.42, 0],
    });
    window.setTimeout(() => particles.stop(), 180);
    window.setTimeout(() => particles.dispose(), 1100);
  }

  update(deltaSeconds: number, input: InputState): void {
    if (this.disposed) return;
    const delta = Math.min(0.05, deltaSeconds);
    this.elapsed += delta;
    this.sonarTimer = Math.max(0, this.sonarTimer - delta);
    this.sonarCooldown = Math.max(0, this.sonarCooldown - delta);

    if (input.primaryHeld && !this.lastPrimary) this.useSonar();
    if (input.secondaryHeld && !this.lastSecondary) this.rescueNearest();
    this.lastPrimary = input.primaryHeld;
    this.lastSecondary = input.secondaryHeld;

    const settings = this.context.ui.getSettings();
    const tiltScale = settings.tilt ? 0.5 : 0;
    const moveX = clamp(input.moveX + input.tiltX * tiltScale, -1, 1);
    const moveZ = clamp(input.moveY - input.tiltY * tiltScale, -1, 1);
    const depthInput = clamp(input.lookY, -1, 1);
    const movement = new Vector3(moveX, depthInput * 0.58, moveZ);
    if (movement.lengthSquared() > 1) movement.normalize();
    const speed = 5.4 + this.stage.difficulty * 0.55;
    const currentScale = settings.reducedMotion ? 1.8 : 3;
    movement.x += this.stage.current[0] * currentScale;
    movement.z += this.stage.current[1] * currentScale;

    const oldPosition = this.submarine.position.clone();
    this.submarine.position.addInPlace(movement.scale(delta * speed));
    this.submarine.position.y = clamp(this.submarine.position.y, -2.5, 2.8);
    this.submarine.position.x = clamp(this.submarine.position.x, -22, 22);
    this.submarine.position.z = clamp(this.submarine.position.z, -34, 14);

    let bumped = false;
    for (const obstacle of this.obstacles) {
      const minimum = obstacle.radius + 1.05;
      const difference = this.submarine.position.subtract(obstacle.position);
      const distanceSquared = difference.lengthSquared();
      if (distanceSquared < minimum * minimum) {
        this.submarine.position.copyFrom(oldPosition);
        const horizontal = new Vector3(difference.x, 0, difference.z);
        if (horizontal.lengthSquared() > 0.001) {
          horizontal.normalize();
          this.submarine.position.addInPlace(horizontal.scale(0.18));
        }
        bumped = true;
        break;
      }
    }
    if (bumped && this.elapsed - this.lastObstacleSound > 2.5) {
      this.lastObstacleSound = this.elapsed;
      this.context.ui.playTone("tap");
      this.context.ui.toast("ぽよん！ サンゴの よこを ゆっくり とおろう", "info");
    }

    if (
      (Math.abs(this.submarine.position.x) > 21.8 ||
        this.submarine.position.z < -33.8 ||
        this.submarine.position.z > 13.8) &&
      this.elapsed - this.lastBoundaryHelp > 10
    ) {
      this.lastBoundaryHelp = this.elapsed;
      this.context.ui.toast("やさしい しおが、うみの まんなかへ おしてくれたよ", "info");
      this.submarine.position.x *= 0.82;
      this.submarine.position.z = clamp(this.submarine.position.z, -29, 10);
    }

    const moving = movement.lengthSquared() > 0.05;
    if (moving) {
      const targetRotation = Math.atan2(movement.x, movement.z) + Math.PI;
      let difference = targetRotation - this.submarine.rotation.y;
      while (difference > Math.PI) difference -= Math.PI * 2;
      while (difference < -Math.PI) difference += Math.PI * 2;
      this.submarine.rotation.y += difference * clamp(delta * 4.5, 0, 1);
      this.submarine.rotation.z = lerp(this.submarine.rotation.z, -moveX * 0.12, delta * 4);
    } else {
      this.submarine.rotation.z = lerp(this.submarine.rotation.z, 0, delta * 4);
    }
    this.propeller.rotation.z += delta * (moving ? 12 : 3.5);
    this.submarine.position.y += Math.sin(this.elapsed * 2.1) * delta * 0.035;

    this.camera.alpha = lerp(this.camera.alpha, -Math.PI / 2 - input.lookX * 0.18, delta * 2);
    this.camera.setTarget(
      Vector3.Lerp(
        this.camera.target,
        this.submarine.position.add(new Vector3(0, 0.25, -2.3)),
        clamp(delta * 4.2, 0, 1),
      ),
    );

    this.updateFish(delta);
    this.updatePearls(delta);
    this.updateSonar(delta);
    this.homeRing.rotation.y += delta * 0.55;
    this.homeRing.scaling.setAll(
      1 + Math.sin(this.elapsed * (this.rescuedCount >= this.stage.targets ? 3 : 1.5)) * 0.04,
    );

    if (this.rescuedCount >= this.stage.targets) {
      const homeDistance = Vector3.Distance(this.submarine.position, this.homePosition);
      this.context.ui.setHint(
        homeDistance < 7
          ? "もうすぐ ひかりの いえ！ おおきな わへ はいろう"
          : `みんな いっしょ。ひかりの いえまで あと ${Math.ceil(homeDistance)}`,
        true,
      );
      if (homeDistance < 2.75) void this.finishStage();
    } else if (this.elapsed - this.lastProgressAt > 45 && this.sonarCooldown <= 0) {
      this.context.ui.setHint("まよったら「ソナー」。なかまの ほうこうが わかるよ", true);
    }
  }

  private updateFish(delta: number): void {
    for (const friend of this.fish) {
      if (friend.rescued) {
        const index = friend.followIndex;
        const row = Math.floor(index / 3);
        const column = index % 3;
        const local = new Vector3((column - 1) * 1.45, (index % 2) * 0.45 - 0.2, 2.8 + row * 1.45);
        const cos = Math.cos(this.submarine.rotation.y);
        const sin = Math.sin(this.submarine.rotation.y);
        const target = new Vector3(
          this.submarine.position.x + local.x * cos + local.z * sin,
          this.submarine.position.y + local.y,
          this.submarine.position.z - local.x * sin + local.z * cos,
        );
        friend.root.position.copyFrom(
          Vector3.Lerp(friend.root.position, target, clamp(delta * 3.4, 0, 1)),
        );
        friend.root.rotation.y = lerp(friend.root.rotation.y, this.submarine.rotation.y, delta * 3);
      } else {
        friend.root.position.y =
          friend.home.y + Math.sin(this.elapsed * 1.8 + friend.phase) * 0.42;
        friend.root.position.x =
          friend.home.x + Math.sin(this.elapsed * 0.55 + friend.phase) * 0.55;
        friend.root.rotation.y += Math.sin(this.elapsed + friend.phase) * delta * 0.18;
        const nearSonar =
          this.sonarTimer > 0 &&
          Vector3.DistanceSquared(friend.root.position, this.submarine.position) < 22 * 22;
        const scale = nearSonar
          ? 0.84 + Math.sin(this.elapsed * 7 + friend.phase) * 0.12
          : 0.66 + (friend.followIndex % 3) * 0.04;
        friend.root.scaling.setAll(scale);
      }
    }
  }

  private updatePearls(delta: number): void {
    for (const pearl of this.pearls) {
      if (pearl.collected) continue;
      pearl.mesh.rotation.y += delta * 1.5;
      pearl.mesh.position.y += Math.sin(this.elapsed * 2.6 + pearl.phase) * delta * 0.2;
      pearl.mesh.scaling.setAll(1 + Math.sin(this.elapsed * 3 + pearl.phase) * 0.08);
      if (Vector3.DistanceSquared(pearl.mesh.position, this.submarine.position) < 2.1 * 2.1) {
        pearl.collected = true;
        pearl.mesh.setEnabled(false);
        this.pearlCount += 1;
        this.context.ui.playTone("collect");
        this.context.ui.toast(
          `ひかりしんじゅ！ ${this.pearlCount}/${this.stage.pearlCount}`,
          "good",
        );
        this.burst(pearl.mesh.position, "#fff3a1");
      }
    }
  }

  private updateSonar(delta: number): void {
    for (let index = this.sonarWaves.length - 1; index >= 0; index -= 1) {
      const wave = this.sonarWaves[index]!;
      wave.age += delta;
      wave.mesh.position.copyFrom(this.submarine.position);
      wave.mesh.scaling.setAll(1 + wave.age * 8);
      const material = wave.mesh.material as StandardMaterial | null;
      if (material) material.alpha = clamp(1 - wave.age / 1.25, 0, 1);
      if (wave.age >= 1.25) {
        wave.mesh.dispose(false, true);
        this.sonarWaves.splice(index, 1);
      }
    }
  }

  primary(pressed: boolean): void {
    if (pressed && !this.lastPrimary) this.useSonar();
    this.lastPrimary = pressed;
  }

  secondary(pressed: boolean): void {
    if (pressed && !this.lastSecondary) this.rescueNearest();
    this.lastSecondary = pressed;
  }

  private async finishStage(): Promise<void> {
    if (this.finishing) return;
    this.finishing = true;
    this.context.ui.playTone("success");
    this.context.ui.say("おかえり！ さいごの ひかりもんだいだよ。");
    this.burst(this.homePosition, this.stage.palette[1]);
    const learned = await this.context.ui.ask(this.stage.question);
    if (this.disposed) return;
    const pearlBonus = this.pearlCount >= this.stage.pearlCount;
    const stars = (learned && pearlBonus ? 3 : learned || pearlBonus ? 2 : 1) as 1 | 2 | 3;
    this.context.ui.addCollection(this.stage.id);
    this.context.ui.complete({
      stars,
      score:
        1400 +
        this.rescuedCount * 210 +
        this.pearlCount * 260 +
        (learned ? 500 : 0) +
        Math.max(0, 700 - Math.round(this.elapsed * 2)),
      collected: this.rescuedCount + this.pearlCount,
      bonus: pearlBonus,
      message:
        stars === 3
          ? `${this.stage.creature}と しんじゅが、ずかんで ぴかぴか！`
          : learned
            ? "ことばと かずの ひかりも つよくなったよ！"
            : "みんなで ぶじに おうちへ かえれたよ！",
    });
  }

  pause(): void {
    this.bubbles.stop();
  }

  resume(): void {
    this.bubbles.start();
  }

  dispose(): void {
    this.disposed = true;
    this.bubbles.dispose();
    this.scene.dispose();
  }
}

void bootstrapGame(definition, (context, stage) => new SeaRescueController(context, stage));
