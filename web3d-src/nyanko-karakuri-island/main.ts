import {
  ArcRotateCamera,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  Node,
  ParticleSystem,
  PointerEventTypes,
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
  createCloud,
  createGear,
  createIsland,
  createParticles,
  createRing,
  createRock,
  createTree,
  createWorld,
  hex,
  mat,
  setClockTime,
} from "../shared/visuals";
import {
  isKarakuriStage,
  karakuriPartLabels,
  karakuriStages,
  type KarakuriStage,
  type PartKind,
} from "./stages";

const definition: GameDefinition = {
  id: "nyanko-karakuri-island",
  title: "にゃんこ発明ラボ・からくり島",
  subtitle: "ぶひんを えらび、30の からくりを うごかそう",
  description:
    "6つの島をめぐる3D発明パズル。部品を選んで作業台へ置き、動かし、失敗したらすぐ巻き戻して別の作り方を試せます。",
  accent: "#ffad42",
  accent2: "#42c9be",
  ageLabel: "6〜8さい",
  stageNoun: "はつめい",
  primaryLabel: "うごかす",
  secondaryLabel: "まきもどす",
  stages: karakuriStages,
  collectionLabel: "せっけいず",
  collectionTotal: 30,
  safetyNote:
    "こわれる・なくなる・時間切れはありません。何度でも巻き戻せて、むずかしい時は正しい置き場所が光ります。",
};

interface PlacedPart {
  kind: PartKind;
  root: TransformNode;
}

type PartMetadata =
  | { palettePart: PartKind }
  | { slotIndex: number }
  | { decorative: true };

const PART_COLORS: Record<PartKind, string> = {
  ramp: "#f3a54a",
  wheel: "#4f6681",
  bridge: "#d98c55",
  spring: "#63d9e7",
  lever: "#ee6b73",
  gear: "#f6c657",
  belt: "#5a5578",
  conveyor: "#45b5aa",
  magnet: "#ef6472",
  rail: "#7d91a8",
  switch: "#e96ba5",
  balloon: "#ff7fc1",
  fan: "#65cfe9",
  weight: "#6f7690",
  clock: "#7669db",
};

const PART_ICONS: Record<PartKind, string> = {
  ramp: "◢",
  wheel: "●",
  bridge: "▰",
  spring: "〰",
  lever: "↗",
  gear: "⚙",
  belt: "∞",
  conveyor: "▸▸",
  magnet: "∩",
  rail: "═",
  switch: "⏻",
  balloon: "◯",
  fan: "✣",
  weight: "◆",
  clock: "◷",
};

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

function attachMetadata(root: TransformNode, metadata: PartMetadata): void {
  root.metadata = metadata;
  for (const mesh of root.getChildMeshes(false)) {
    mesh.metadata = metadata;
    mesh.isPickable = true;
  }
}

function metadataFromNode(node: Node | null): PartMetadata | null {
  let current: Node | null = node;
  while (current) {
    const metadata = current.metadata as PartMetadata | null;
    if (metadata && ("palettePart" in metadata || "slotIndex" in metadata)) return metadata;
    current = current.parent;
  }
  return null;
}

function routeX(stage: KarakuriStage, progress: number): number {
  switch (stage.route) {
    case "hill":
      return Math.sin(progress * Math.PI) * 2.1;
    case "zigzag":
      return Math.sin(progress * Math.PI * 3) * 2.2;
    case "split":
      return Math.sin(progress * Math.PI * 2) * 2.7;
    case "spiral":
      return Math.sin(progress * Math.PI * 4) * (0.8 + progress * 1.8);
    case "sky":
      return Math.sin(progress * Math.PI * 2.4) * 3.2;
    case "festival":
      return Math.sin(progress * Math.PI * 5) * 2.3;
    default:
      return (progress - 0.5) * 1.2;
  }
}

class KarakuriController implements SceneController {
  readonly scene: Scene;
  private readonly context: GameFactoryContext;
  private readonly stage: KarakuriStage;
  private readonly camera: ArcRotateCamera;
  private readonly cargo: TransformNode;
  private readonly goal: Mesh;
  private readonly slotPositions: Vector3[];
  private readonly placed: Array<PlacedPart | null>;
  private readonly paletteRoots = new Map<PartKind, TransformNode>();
  private readonly paletteUi: HTMLDivElement;
  private readonly animatedParts: Array<{ kind: PartKind; root: TransformNode }> = [];
  private readonly celebration: ParticleSystem;
  private selected: PartKind | null = null;
  private running = false;
  private finishing = false;
  private disposed = false;
  private runProgress = 0;
  private runLimit = 1;
  private validRun = false;
  private attempts = 0;
  private hintsUsed = 0;
  private elapsed = 0;
  private lastPrimary = false;
  private lastSecondary = false;

  constructor(context: GameFactoryContext, sourceStage: StageDefinition) {
    this.context = context;
    this.stage = isKarakuriStage(sourceStage) ? sourceStage : karakuriStages[0]!;
    this.scene = new Scene(context.engine);

    const world = createWorld(this.scene, {
      name: `karakuri-world-${this.stage.id}`,
      clearColor: this.stage.palette[2],
      fogColor: this.stage.palette[2],
      fogDensity: 0.003,
      sunColor: "#fff1cf",
      sunIntensity: 2.2,
      ambientColor: this.stage.palette[0],
      ambientIntensity: 0.72,
      glowIntensity: 0.55,
      shadowMapSize: context.ui.getSettings().quality === "eco" ? 512 : 1024,
      camera: true,
      cameraTarget: [0, 1.1, -0.5],
      cameraRadius: 24,
      cameraAlpha: -Math.PI / 2,
      cameraBeta: 1.03,
    });
    this.camera = world.camera!;
    this.camera.fov = 0.83;
    this.camera.minZ = 0.08;
    this.camera.maxZ = 300;
    this.camera.lowerRadiusLimit = 20;
    this.camera.upperRadiusLimit = 28;
    this.camera.inputs.clear();

    createIsland(this.scene, {
      name: this.stage.area,
      position: [0, -0.65, -0.5],
      radius: 15.5,
      height: 5.5,
      topColor: this.stage.palette[0],
      earthColor: "#6f5861",
      rimColor: this.stage.palette[1],
      seed: this.stage.seed,
      crystals: this.stage.areaIndex === 2 || this.stage.areaIndex === 5 ? 7 : 2,
      shadowGenerator: world.shadowGenerator,
    });

    this.slotPositions = Array.from({ length: this.stage.slotCount }, (_, index) => {
      const progress = (index + 1) / (this.stage.slotCount + 1);
      return new Vector3(
        routeX(this.stage, progress),
        0.72 + Math.sin(progress * Math.PI) * this.stage.height * 0.18,
        4.2 - progress * 10.2,
      );
    });
    this.placed = Array.from({ length: this.stage.slotCount }, () => null);

    this.createTrack(world.shadowGenerator);
    this.createSlots();
    this.createPalette(world.shadowGenerator);
    this.paletteUi = this.createPaletteUi();
    this.createScenery(world.shadowGenerator);

    const start = this.pathPoint(0);
    this.cargo = this.createCargo(start, world.shadowGenerator);
    const goalPosition = this.pathPoint(1);
    this.goal = createRing(this.scene, {
      name: "ゴールの わ",
      position: [goalPosition.x, goalPosition.y + 0.7, goalPosition.z],
      radius: 1.5,
      thickness: 0.22,
      color: this.stage.palette[1],
      emissiveStrength: 1.3,
      shadowGenerator: world.shadowGenerator,
    });
    this.goal.rotation.y = Math.PI / 2;

    createCat(this.scene, {
      name: "はつめいねこ ミケ",
      position: [-6.8, 0.15, 5.1],
      rotation: [0, 0.55, 0],
      size: 0.72,
      bodyColor: "#f0aa62",
      patchColor: "#fff0d5",
      scarfColor: this.stage.palette[2],
      shadowGenerator: world.shadowGenerator,
    });

    this.celebration = createParticles(this.scene, {
      name: "ひらめきの きらめき",
      emitter: this.goal,
      color: this.stage.palette[1],
      color2: "#ffffff",
      capacity: 220,
      emitRate: 0,
      minSize: 0.06,
      maxSize: 0.28,
      minLifeTime: 0.35,
      maxLifeTime: 1,
      speed: 1.2,
      gravity: [0, 0.35, 0],
      start: true,
    });

    this.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type !== PointerEventTypes.POINTERPICK || this.running || this.finishing) return;
      const metadata = metadataFromNode(pointerInfo.pickInfo?.pickedMesh ?? null);
      if (!metadata) return;
      if ("palettePart" in metadata) this.selectPart(metadata.palettePart);
      else if ("slotIndex" in metadata) this.placeAt(metadata.slotIndex);
    });

    context.ui.setMission(this.stage.mission);
    context.ui.setCounter("おいた ぶひん", 0, this.stage.slotCount);
    context.ui.setHint("下の ぶひんを タップして、ひかる わに おこう", true);
    context.ui.say(
      `${this.stage.area}、${this.stage.title}。ぶひんを えらんで からくりを つくろう！`,
    );
  }

  private createTrack(
    shadowGenerator: ReturnType<typeof createWorld>["shadowGenerator"],
  ): void {
    const path: Vector3[] = [];
    for (let index = 0; index <= 64; index += 1) {
      const point = this.pathPoint(index / 64);
      path.push(new Vector3(point.x, point.y - 0.18, point.z));
    }
    const road = MeshBuilder.CreateTube(
      "からくりの みち",
      {
        path,
        radius: 0.17,
        tessellation: 10,
        cap: Mesh.CAP_ALL,
      },
      this.scene,
    );
    road.material = mat(this.scene, "みちの マテリアル", this.stage.palette[1], {
      emissive: this.stage.palette[1],
      emissiveStrength: 0.18,
      roughness: 0.72,
    });
    road.receiveShadows = true;
    shadowGenerator?.addShadowCaster(road);

    const startPad = MeshBuilder.CreateCylinder(
      "スタートだい",
      { height: 0.35, diameter: 2.3, tessellation: 20 },
      this.scene,
    );
    startPad.position.copyFrom(this.pathPoint(0));
    startPad.position.y -= 0.28;
    startPad.material = mat(this.scene, "スタートだいの いろ", this.stage.palette[2], {
      roughness: 0.8,
    });
    startPad.receiveShadows = true;
    shadowGenerator?.addShadowCaster(startPad);
  }

  private createSlots(): void {
    this.slotPositions.forEach((position, index) => {
      const ring = createRing(this.scene, {
        name: `ぶひんスロット-${index + 1}`,
        position: [position.x, position.y, position.z],
        radius: 0.94,
        thickness: 0.13,
        color: index % 2 === 0 ? "#ffffff" : this.stage.palette[1],
        emissiveStrength: 1.05,
        vertical: false,
      });
      ring.metadata = { slotIndex: index } satisfies PartMetadata;
      const pad = MeshBuilder.CreateCylinder(
        `ぶひんだい-${index + 1}`,
        { height: 0.18, diameter: 1.65, tessellation: 18 },
        this.scene,
      );
      pad.position.set(position.x, position.y - 0.16, position.z);
      pad.material = mat(this.scene, `ぶひんだい-${index + 1}-いろ`, "#eaf7fb", {
        alpha: 0.72,
        emissive: "#8edff0",
        emissiveStrength: 0.16,
      });
      pad.metadata = { slotIndex: index } satisfies PartMetadata;
    });
  }

  private createPalette(
    shadowGenerator: ReturnType<typeof createWorld>["shadowGenerator"],
  ): void {
    const count = this.stage.parts.length;
    this.stage.parts.forEach((kind, index) => {
      const x = (index - (count - 1) / 2) * Math.min(2.45, 12 / Math.max(1, count - 1));
      const root = this.createPartVisual(
        kind,
        new Vector3(x, 0.55, 7.1),
        0.66,
        shadowGenerator,
      );
      attachMetadata(root, { palettePart: kind });
      this.paletteRoots.set(kind, root);
      this.createLabel(
        karakuriPartLabels[kind],
        new Vector3(x, 1.95, 7.1),
        { palettePart: kind },
      );
    });
  }

  private createPaletteUi(): HTMLDivElement {
    const palette = document.createElement("div");
    palette.className = "karakuri-palette";
    palette.setAttribute("role", "group");
    palette.setAttribute("aria-label", "おく ぶひんを えらぶ");

    for (const kind of [...new Set(this.stage.parts)]) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "karakuri-palette__part";
      button.dataset.karakuriPart = kind;
      button.setAttribute("aria-pressed", "false");
      button.style.setProperty("--part-color", PART_COLORS[kind]);

      const icon = document.createElement("span");
      icon.className = "karakuri-palette__icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = PART_ICONS[kind];

      const label = document.createElement("span");
      label.textContent = karakuriPartLabels[kind];
      button.append(icon, label);
      button.addEventListener("click", () => this.selectPart(kind));
      palette.append(button);
    }

    const shell = document.querySelector<HTMLElement>(".neko-shell");
    (shell ?? document.body).append(palette);
    return palette;
  }

  private createScenery(
    shadowGenerator: ReturnType<typeof createWorld>["shadowGenerator"],
  ): void {
    const random = seeded(this.stage.seed + 700);
    for (let index = 0; index < 10; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const x = side * (7.2 + random() * 4.5);
      const z = 5.2 - index * 1.25 + (random() - 0.5) * 2;
      if (this.stage.areaIndex === 0) {
        createTree(this.scene, {
          name: `はらっぱの き-${index}`,
          position: [x, -0.08, z],
          height: 2.2 + random() * 1.5,
          leafColor: index % 2 ? "#72c963" : "#9ade68",
          fruitColor: this.stage.palette[1],
          fruitCount: index % 3,
          seed: this.stage.seed + index,
          shadowGenerator,
        });
      } else if (this.stage.areaIndex === 2) {
        createRock(this.scene, {
          name: `こうざんの いわ-${index}`,
          position: [x, 0.2, z],
          radius: 0.8 + random() * 0.7,
          color: "#554a70",
          accent: this.stage.palette[1],
          crystal: index % 2 === 0,
          seed: this.stage.seed + index,
          shadowGenerator,
        });
      } else if (this.stage.areaIndex === 3) {
        createCloud(this.scene, {
          name: `こうじょうの くも-${index}`,
          position: [x, 2.4 + random() * 2.4, z],
          size: 1.2 + random() * 1.5,
          color: "#fff7fc",
          glowColor: this.stage.palette[1],
          seed: this.stage.seed + index,
          shadowGenerator,
        });
      } else if (this.stage.areaIndex === 4 && index < 6) {
        const clock = createClockFace(this.scene, {
          name: `まちどけい-${index}`,
          position: [x, 1.8, z],
          radius: 0.8,
          hour: (index * 2 + 1) % 12,
          minute: index % 2 ? 30 : 0,
          rimColor: this.stage.palette[1],
          shadowGenerator,
        });
        clock.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        const lantern = MeshBuilder.CreateSphere(
          `まつりライト-${index}`,
          { diameter: 0.65, segments: 12 },
          this.scene,
        );
        lantern.position.set(x, 1.2 + random(), z);
        lantern.material = mat(
          this.scene,
          `まつりライト-${index}-いろ`,
          index % 2 ? this.stage.palette[1] : this.stage.palette[2],
          { emissive: true, emissiveStrength: 1.1 },
        );
      }
    }
  }

  private createCargo(
    position: Vector3,
    shadowGenerator: ReturnType<typeof createWorld>["shadowGenerator"],
  ): TransformNode {
    const root = new TransformNode("はこぶ どんぐり", this.scene);
    root.position.copyFrom(position);
    const body = MeshBuilder.CreateSphere(
      "どんぐりの からだ",
      { diameter: 0.85, segments: 16 },
      this.scene,
    );
    body.parent = root;
    body.material = mat(this.scene, "どんぐりの いろ", "#b87643", { roughness: 0.92 });
    const cap = MeshBuilder.CreateSphere(
      "どんぐりの ぼうし",
      { diameter: 0.62, segments: 12 },
      this.scene,
    );
    cap.parent = root;
    cap.position.y = 0.34;
    cap.scaling.y = 0.45;
    cap.material = mat(this.scene, "どんぐりぼうしの いろ", "#6d4c3b", {
      roughness: 1,
    });
    shadowGenerator?.addShadowCaster(body);
    shadowGenerator?.addShadowCaster(cap);
    return root;
  }

  private createLabel(text: string, position: Vector3, metadata: PartMetadata): Mesh {
    const texture = new DynamicTexture(
      `ラベル-${text}`,
      { width: 512, height: 160 },
      this.scene,
      true,
    );
    texture.hasAlpha = true;
    const context = texture.getContext();
    context.clearRect(0, 0, 512, 160);
    context.fillStyle = "rgba(20,36,55,0.82)";
    context.fillRect(6, 8, 500, 144);
    texture.drawText(text, null, 106, "bold 70px sans-serif", "#ffffff", "transparent", true);
    texture.update();

    const material = new StandardMaterial(`ラベル-${text}-マテリアル`, this.scene);
    material.diffuseTexture = texture;
    material.opacityTexture = texture;
    material.emissiveColor = hex("#ffffff");
    material.disableLighting = true;
    material.backFaceCulling = false;

    const plane = MeshBuilder.CreatePlane(
      `ラベル-${text}-めん`,
      { width: 2.1, height: 0.66 },
      this.scene,
    );
    plane.position.copyFrom(position);
    plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
    plane.material = material;
    plane.metadata = metadata;
    return plane;
  }

  private createPartVisual(
    kind: PartKind,
    position: Vector3,
    scale: number,
    shadowGenerator: ReturnType<typeof createWorld>["shadowGenerator"],
  ): TransformNode {
    const root = new TransformNode(`${karakuriPartLabels[kind]}-${this.animatedParts.length}`, this.scene);
    root.position.copyFrom(position);
    root.scaling.setAll(scale);
    const color = PART_COLORS[kind];
    const primary = mat(this.scene, `${root.name}-いろ`, color, {
      roughness: kind === "gear" || kind === "magnet" ? 0.42 : 0.76,
      specular: "#fff4c2",
    });
    const accent = mat(this.scene, `${root.name}-アクセント`, this.stage.palette[1], {
      emissive: this.stage.palette[1],
      emissiveStrength: 0.22,
      roughness: 0.55,
    });
    const addBox = (
      name: string,
      size: { width: number; height: number; depth: number },
      at: [number, number, number],
      material = primary,
    ): Mesh => {
      const mesh = MeshBuilder.CreateBox(name, size, this.scene);
      mesh.parent = root;
      mesh.position.set(...at);
      mesh.material = material;
      shadowGenerator?.addShadowCaster(mesh);
      return mesh;
    };

    switch (kind) {
      case "ramp": {
        const ramp = addBox("さか", { width: 2.1, height: 0.3, depth: 1.2 }, [0, 0.2, 0]);
        ramp.rotation.z = -0.28;
        break;
      }
      case "wheel": {
        addBox("くるまの だい", { width: 1.6, height: 0.35, depth: 0.9 }, [0, 0.45, 0], accent);
        for (const side of [-1, 1]) {
          const wheel = MeshBuilder.CreateCylinder(
            `くるまの わ-${side}`,
            { height: 0.22, diameter: 0.82, tessellation: 16 },
            this.scene,
          );
          wheel.parent = root;
          wheel.position.set(side * 0.65, 0.16, 0);
          wheel.rotation.z = Math.PI / 2;
          wheel.material = primary;
          shadowGenerator?.addShadowCaster(wheel);
        }
        break;
      }
      case "bridge":
        addBox("はし", { width: 2.3, height: 0.26, depth: 1.15 }, [0, 0.35, 0]);
        addBox("はしの あし1", { width: 0.25, height: 0.65, depth: 0.95 }, [-0.8, 0, 0], accent);
        addBox("はしの あし2", { width: 0.25, height: 0.65, depth: 0.95 }, [0.8, 0, 0], accent);
        break;
      case "spring": {
        const path: Vector3[] = [];
        for (let index = 0; index <= 28; index += 1) {
          const t = index / 28;
          path.push(new Vector3(Math.cos(t * Math.PI * 8) * 0.48, t * 1.4, Math.sin(t * Math.PI * 8) * 0.48));
        }
        const spring = MeshBuilder.CreateTube(
          "ばね",
          { path, radius: 0.09, tessellation: 8 },
          this.scene,
        );
        spring.parent = root;
        spring.material = primary;
        shadowGenerator?.addShadowCaster(spring);
        break;
      }
      case "lever":
      case "switch": {
        addBox("レバーの だい", { width: 1.4, height: 0.25, depth: 1.05 }, [0, 0.15, 0], accent);
        const arm = addBox("レバー", { width: 0.2, height: 1.45, depth: 0.2 }, [0, 0.85, 0]);
        arm.rotation.z = -0.38;
        const knob = MeshBuilder.CreateSphere(
          "レバーの まる",
          { diameter: 0.45, segments: 12 },
          this.scene,
        );
        knob.parent = root;
        knob.position.set(0.28, 1.5, 0);
        knob.material = primary;
        break;
      }
      case "gear": {
        const gear = createGear(this.scene, {
          name: "ギア",
          radius: 1,
          thickness: 0.28,
          teeth: 12,
          color,
          accent: this.stage.palette[1],
          shadowGenerator,
        });
        gear.parent = root;
        gear.position.y = 0.8;
        gear.rotation.y = Math.PI / 2;
        break;
      }
      case "belt": {
        const belt = MeshBuilder.CreateTorus(
          "ベルト",
          { diameter: 1.55, thickness: 0.2, tessellation: 24 },
          this.scene,
        );
        belt.parent = root;
        belt.position.y = 0.75;
        belt.scaling.x = 1.35;
        belt.material = primary;
        break;
      }
      case "conveyor": {
        addBox("コンベアの だい", { width: 2.2, height: 0.28, depth: 1.2 }, [0, 0.2, 0], accent);
        for (let index = -2; index <= 2; index += 1) {
          const roller = MeshBuilder.CreateCylinder(
            `ローラー-${index}`,
            { height: 1.05, diameter: 0.28, tessellation: 12 },
            this.scene,
          );
          roller.parent = root;
          roller.position.set(index * 0.43, 0.45, 0);
          roller.rotation.x = Math.PI / 2;
          roller.material = primary;
        }
        break;
      }
      case "magnet":
        addBox("じしゃく ひだり", { width: 0.42, height: 1.45, depth: 0.55 }, [-0.55, 0.75, 0]);
        addBox("じしゃく みぎ", { width: 0.42, height: 1.45, depth: 0.55 }, [0.55, 0.75, 0], accent);
        addBox("じしゃく した", { width: 1.52, height: 0.42, depth: 0.55 }, [0, 0.18, 0]);
        break;
      case "rail":
        addBox("レール1", { width: 2.3, height: 0.18, depth: 0.2 }, [0, 0.25, -0.4]);
        addBox("レール2", { width: 2.3, height: 0.18, depth: 0.2 }, [0, 0.25, 0.4]);
        for (const x of [-0.8, 0, 0.8]) {
          addBox(`まくらぎ-${x}`, { width: 0.18, height: 0.12, depth: 1.15 }, [x, 0.12, 0], accent);
        }
        break;
      case "balloon": {
        for (const side of [-0.48, 0, 0.48]) {
          const balloon = MeshBuilder.CreateSphere(
            `ふうせん-${side}`,
            { diameter: 0.86, segments: 14 },
            this.scene,
          );
          balloon.parent = root;
          balloon.position.set(side, 1.05 + Math.abs(side) * 0.3, 0);
          balloon.scaling.y = 1.18;
          balloon.material = side === 0 ? primary : accent;
        }
        addBox("ふうせんの かご", { width: 1.25, height: 0.42, depth: 0.85 }, [0, 0.05, 0], primary);
        break;
      }
      case "fan": {
        const hub = MeshBuilder.CreateCylinder(
          "せんぷうきの まんなか",
          { height: 0.45, diameter: 0.58, tessellation: 16 },
          this.scene,
        );
        hub.parent = root;
        hub.position.y = 0.78;
        hub.rotation.x = Math.PI / 2;
        hub.material = accent;
        for (let index = 0; index < 4; index += 1) {
          const blade = addBox(
            `はね-${index}`,
            { width: 0.28, height: 1.25, depth: 0.15 },
            [0, 1.35, 0],
          );
          blade.rotation.z = (index * Math.PI) / 2;
          blade.position.set(Math.cos(blade.rotation.z) * 0.48, 0.78 + Math.sin(blade.rotation.z) * 0.48, 0);
        }
        break;
      }
      case "weight":
        addBox("おもり", { width: 1.1, height: 1.15, depth: 1 }, [0, 0.58, 0]);
        addBox("おもりの とって", { width: 0.55, height: 0.22, depth: 0.32 }, [0, 1.28, 0], accent);
        break;
      case "clock": {
        const clock = createClockFace(this.scene, {
          name: "とけい",
          position: [0, 0.95, 0],
          radius: 0.95,
          faceColor: "#fff8e8",
          rimColor: color,
          hourColor: this.stage.palette[2],
          minuteColor: this.stage.palette[1],
          hour: this.stage.areaIndex === 5 ? 7 : 3 + (this.stage.seed % 6),
          minute: this.stage.difficulty >= 2 ? 30 : 0,
          showNumbers: true,
          shadowGenerator,
        });
        clock.parent = root;
        clock.rotation.y = Math.PI;
        setClockTime(
          clock,
          this.stage.areaIndex === 5 ? 7 : 3 + (this.stage.seed % 6),
          this.stage.difficulty >= 2 ? 30 : 0,
        );
        break;
      }
    }

    attachMetadata(root, { decorative: true });
    this.animatedParts.push({ kind, root });
    return root;
  }

  private pathPoint(progress: number): Vector3 {
    const nodes = [
      new Vector3(routeX(this.stage, 0), 0.82, 5.35),
      ...this.slotPositions,
      new Vector3(routeX(this.stage, 1), 0.82, -7.1),
    ];
    const scaled = clamp(progress, 0, 1) * (nodes.length - 1);
    const index = Math.min(nodes.length - 2, Math.floor(scaled));
    const local = scaled - index;
    const from = nodes[index]!;
    const to = nodes[index + 1]!;
    const result = Vector3.Lerp(from, to, local);
    const currentPart = this.placed[Math.max(0, index - 1)]?.kind;
    const lift =
      currentPart === "spring"
        ? Math.sin(local * Math.PI) * 1.6
        : currentPart === "balloon"
          ? Math.sin(local * Math.PI) * 2.1
          : currentPart === "ramp"
            ? Math.sin(local * Math.PI) * 0.55
            : 0;
    result.y += lift;
    return result;
  }

  private selectPart(kind: PartKind): void {
    this.selected = kind;
    for (const [part, root] of this.paletteRoots) {
      root.scaling.setAll(part === kind ? 0.82 : 0.66);
      root.position.y = part === kind ? 0.78 : 0.55;
    }
    for (const button of this.paletteUi.querySelectorAll<HTMLButtonElement>("[data-karakuri-part]")) {
      const selected = button.dataset.karakuriPart === kind;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    }
    this.context.ui.playTone("tap");
    this.context.ui.toast(`${karakuriPartLabels[kind]}を えらんだよ。ひかる わを タップ！`, "info");
    this.context.ui.setHint(`${karakuriPartLabels[kind]}を おく ばしょを タップしよう`, true);
  }

  private placeAt(index: number): void {
    if (!this.selected || index < 0 || index >= this.placed.length) {
      this.context.ui.toast("さきに 下の ぶひんを えらぼう", "info");
      return;
    }
    this.placed[index]?.root.dispose(false, true);
    const position = this.slotPositions[index]!;
    const root = this.createPartVisual(this.selected, position.add(new Vector3(0, 0.08, 0)), 0.76, null);
    attachMetadata(root, { slotIndex: index });
    this.placed[index] = { kind: this.selected, root };
    this.context.ui.playTone("collect");
    this.context.ui.setCounter(
      "おいた ぶひん",
      this.placed.filter(Boolean).length,
      this.stage.slotCount,
    );
    const nextEmpty = this.placed.findIndex((part) => part === null);
    if (nextEmpty < 0) {
      this.context.ui.setHint("ぶひんが そろったよ。「うごかす」を おしてみよう！", true);
      this.context.ui.say("ぶひんが そろったよ。うごかしてみよう！");
    } else {
      this.context.ui.setHint(`つぎは ${nextEmpty + 1}ばんの わ。ちがう ぶひんも えらべるよ`, true);
    }
  }

  private arrangement(): PartKind[] {
    return this.placed.map((part) => part?.kind ?? "ramp");
  }

  private matchingSolution(): PartKind[] | null {
    if (this.placed.some((part) => !part)) return null;
    const arrangement = this.arrangement();
    return (
      this.stage.solutions.find(
        (solution) =>
          solution.length === arrangement.length &&
          solution.every((part, index) => part === arrangement[index]),
      ) ?? null
    );
  }

  private bestRepair(): { solution: PartKind[]; mismatch: number } {
    const arrangement = this.arrangement();
    let bestSolution = this.stage.solutions[0]!;
    let bestMismatch = 0;
    for (const solution of this.stage.solutions) {
      let match = 0;
      while (match < solution.length && solution[match] === arrangement[match]) match += 1;
      if (match > bestMismatch) {
        bestMismatch = match;
        bestSolution = solution;
      }
    }
    return { solution: bestSolution, mismatch: bestMismatch };
  }

  private firstMismatch(): number {
    return this.bestRepair().mismatch;
  }

  private startRun(): void {
    if (this.running || this.finishing) return;
    if (this.placed.some((part) => !part)) {
      const empty = this.placed.findIndex((part) => !part);
      this.context.ui.toast(`${empty + 1}ばんの わが まだ あいているよ`, "info");
      this.context.ui.setHint("ぶひんを ぜんぶ おいてから うごかそう", true);
      return;
    }
    this.attempts += 1;
    const solution = this.matchingSolution();
    this.validRun = solution !== null;
    this.runLimit = this.validRun
      ? 1
      : clamp((this.firstMismatch() + 1.25) / (this.stage.slotCount + 1), 0.22, 0.82);
    this.runProgress = 0;
    this.running = true;
    this.context.ui.playTone("tap");
    this.context.ui.setHint("からくり うごきだした！", true);
  }

  private rewind(): void {
    if (this.finishing) return;
    this.running = false;
    this.runProgress = 0;
    this.cargo.position.copyFrom(this.pathPoint(0));
    this.cargo.rotation.set(0, 0, 0);
    this.context.ui.playTone("tap");
    this.context.ui.toast("さいしょまで まきもどしたよ。ぶひんは そのまま！", "info");
    this.context.ui.setHint("ぶひんを かえて、もういちど ためそう", true);
  }

  private failRun(): void {
    this.running = false;
    this.context.ui.playTone("wrong");
    const { solution: bestSolution, mismatch } = this.bestRepair();
    if (this.attempts >= 4 && mismatch < this.placed.length) {
      this.hintsUsed += 1;
      const expected = bestSolution[mismatch]!;
      this.selected = expected;
      this.placeAt(mismatch);
      this.context.ui.toast(
        `${mismatch + 1}ばんに ${karakuriPartLabels[expected]}を おいて おてつだいしたよ`,
        "good",
      );
    } else if (this.attempts >= 2) {
      this.hintsUsed += 1;
      const expected = bestSolution[mismatch] ?? bestSolution[0]!;
      this.context.ui.toast(
        `${mismatch + 1}ばんの ちかくで「${karakuriPartLabels[expected]}」を ためしてみよう`,
        "info",
      );
    } else {
      this.context.ui.toast("おしい！ まきもどして ならべかえてみよう", "info");
    }
    this.context.ui.setHint("「まきもどす」で すぐ もどれるよ", true);
  }

  update(deltaSeconds: number, input: InputState): void {
    if (this.disposed) return;
    const delta = Math.min(0.05, deltaSeconds);
    this.elapsed += delta;

    const look = input.lookX + input.moveX * 0.18;
    this.camera.alpha = lerp(this.camera.alpha, -Math.PI / 2 + look * 0.16, delta * 2.2);
    this.goal.rotation.z += delta * 0.55;

    for (const part of this.animatedParts) {
      if (part.root.isDisposed()) continue;
      if (part.kind === "gear" || part.kind === "fan" || part.kind === "wheel") {
        part.root.rotation.z += delta * (this.running ? 2.8 : 0.3);
      } else if (part.kind === "balloon") {
        part.root.position.y += Math.sin(this.elapsed * 2.6 + part.root.uniqueId) * delta * 0.045;
      } else if (part.kind === "spring" && this.running) {
        part.root.scaling.y = 0.76 + Math.sin(this.elapsed * 8) * 0.08;
      }
    }

    if (input.primaryHeld && !this.lastPrimary) this.startRun();
    if (input.secondaryHeld && !this.lastSecondary) this.rewind();
    this.lastPrimary = input.primaryHeld;
    this.lastSecondary = input.secondaryHeld;

    if (!this.running || this.finishing) return;
    this.runProgress = Math.min(this.runLimit, this.runProgress + delta * (0.16 + this.stage.difficulty * 0.012));
    this.cargo.position.copyFrom(this.pathPoint(this.runProgress));
    this.cargo.rotation.x += delta * 3.2;
    this.cargo.rotation.z += delta * 1.4;

    if (this.runProgress >= this.runLimit - 0.0001) {
      if (this.validRun) void this.finishStage();
      else this.failRun();
    }
  }

  primary(pressed: boolean): void {
    if (pressed && !this.lastPrimary) this.startRun();
    this.lastPrimary = pressed;
  }

  secondary(pressed: boolean): void {
    if (pressed && !this.lastSecondary) this.rewind();
    this.lastSecondary = pressed;
  }

  private async finishStage(): Promise<void> {
    if (this.finishing) return;
    this.finishing = true;
    this.running = false;
    this.celebration.emitRate = this.context.ui.getSettings().reducedMotion ? 18 : 110;
    window.setTimeout(() => {
      if (!this.celebration.isDisposed) this.celebration.emitRate = 0;
    }, 1200);
    this.context.ui.playTone("success");
    this.context.ui.say("できた！ さいごの ひらめき もんだいだよ。");
    const learned = await this.context.ui.ask(this.stage.question);
    if (this.disposed) return;
    const bonus = this.attempts <= 2 && this.hintsUsed === 0;
    const stars = (learned && bonus ? 3 : learned || bonus ? 2 : 1) as 1 | 2 | 3;
    this.context.ui.addCollection(this.stage.id);
    this.context.ui.complete({
      stars,
      score:
        1200 +
        this.stage.slotCount * 180 +
        (learned ? 500 : 0) +
        (bonus ? 450 : 0) +
        Math.max(0, 600 - this.attempts * 80),
      collected: this.stage.slotCount,
      bonus,
      message:
        stars === 3
          ? "べつの つくりかたも ためせる、だいはつめい！"
          : learned
            ? "ことばと かずの ひらめきも ぴかぴか！"
            : "おてつだいを つかって、からくりが かんせいしたよ！",
    });
  }

  pause(): void {
    this.celebration.stop();
    this.paletteUi.hidden = true;
  }

  resume(): void {
    this.celebration.start();
    this.paletteUi.hidden = false;
  }

  dispose(): void {
    this.disposed = true;
    this.paletteUi.remove();
    this.celebration.dispose();
    this.scene.dispose();
  }
}

void bootstrapGame(definition, (context, stage) => new KarakuriController(context, stage));
