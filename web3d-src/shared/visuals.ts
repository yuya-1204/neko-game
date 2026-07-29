import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  DynamicTexture,
  GlowLayer,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  ParticleSystem,
  Scene,
  ShadowGenerator,
  StandardMaterial,
  Texture,
  TransformNode,
  Vector3
} from "babylonjs";

export type ColorValue = string | number | Color3;
export type PositionValue = Vector3 | readonly [number, number, number];

export interface MaterialOptions {
  emissive?: ColorValue | boolean;
  emissiveStrength?: number;
  alpha?: number;
  roughness?: number;
  specular?: ColorValue;
  unlit?: boolean;
  doubleSided?: boolean;
}

export interface WorldOptions {
  name?: string;
  clearColor?: ColorValue;
  fogColor?: ColorValue;
  fogDensity?: number;
  sunColor?: ColorValue;
  sunDirection?: PositionValue;
  sunIntensity?: number;
  ambientColor?: ColorValue;
  ambientIntensity?: number;
  glowIntensity?: number;
  shadows?: boolean;
  shadowMapSize?: number;
  camera?: boolean;
  cameraTarget?: PositionValue;
  cameraRadius?: number;
  cameraAlpha?: number;
  cameraBeta?: number;
  sky?: boolean;
}

export interface WorldVisual {
  root: TransformNode;
  environment: TransformNode;
  sun: DirectionalLight;
  fill: HemisphericLight;
  shadowGenerator: ShadowGenerator | null;
  glow: GlowLayer;
  camera: ArcRotateCamera | null;
}

interface BaseVisualOptions {
  name?: string;
  position?: PositionValue;
  rotation?: PositionValue;
  scale?: number | PositionValue;
  shadowGenerator?: ShadowGenerator | null;
}

export interface CatOptions extends BaseVisualOptions {
  bodyColor?: ColorValue;
  patchColor?: ColorValue;
  eyeColor?: ColorValue;
  scarfColor?: ColorValue;
  size?: number;
  scarf?: boolean;
  wings?: boolean;
}

export interface IslandOptions extends BaseVisualOptions {
  radius?: number;
  height?: number;
  topColor?: ColorValue;
  earthColor?: ColorValue;
  rimColor?: ColorValue;
  seed?: number;
  crystals?: number;
}

export interface TreeOptions extends BaseVisualOptions {
  height?: number;
  trunkColor?: ColorValue;
  leafColor?: ColorValue;
  fruitColor?: ColorValue;
  fruitCount?: number;
  seed?: number;
}

export interface CloudOptions extends BaseVisualOptions {
  size?: number;
  color?: ColorValue;
  glowColor?: ColorValue;
  puffs?: number;
  seed?: number;
}

export interface SpiritOptions extends BaseVisualOptions {
  color?: ColorValue;
  accent?: ColorValue;
  size?: number;
  wings?: boolean;
  particles?: boolean;
}

export interface RingOptions extends BaseVisualOptions {
  radius?: number;
  thickness?: number;
  color?: ColorValue;
  emissiveStrength?: number;
  vertical?: boolean;
}

export type AnimalKind = "rabbit" | "fox" | "bird" | "deer" | "turtle" | "tanuki";

export interface AnimalOptions extends BaseVisualOptions {
  kind?: AnimalKind;
  color?: ColorValue;
  accent?: ColorValue;
  size?: number;
}

export interface FishOptions extends BaseVisualOptions {
  color?: ColorValue;
  accent?: ColorValue;
  size?: number;
  stripes?: boolean;
}

export interface RockOptions extends BaseVisualOptions {
  radius?: number;
  color?: ColorValue;
  accent?: ColorValue;
  seed?: number;
  crystal?: boolean;
}

export interface ClockFaceOptions extends BaseVisualOptions {
  radius?: number;
  faceColor?: ColorValue;
  rimColor?: ColorValue;
  hourColor?: ColorValue;
  minuteColor?: ColorValue;
  hour?: number;
  minute?: number;
  showNumbers?: boolean;
}

export interface ParticleOptions {
  name?: string;
  emitter?: TransformNode | Vector3;
  color?: ColorValue;
  color2?: ColorValue;
  capacity?: number;
  emitRate?: number;
  minSize?: number;
  maxSize?: number;
  minLifeTime?: number;
  maxLifeTime?: number;
  speed?: number;
  gravity?: PositionValue;
  blendMode?: number;
  start?: boolean;
}

export interface CoralOptions extends BaseVisualOptions {
  size?: number;
  color?: ColorValue;
  accent?: ColorValue;
  branches?: number;
  seed?: number;
}

export interface GearOptions extends BaseVisualOptions {
  radius?: number;
  thickness?: number;
  teeth?: number;
  color?: ColorValue;
  accent?: ColorValue;
}

let visualId = 0;

function nextName(prefix: string, requested?: string): string {
  visualId += 1;
  return requested || `${prefix}-${visualId}`;
}

export function hex(value: ColorValue): Color3 {
  if (value instanceof Color3) return value.clone();
  if (typeof value === "number") {
    return new Color3(
      ((value >> 16) & 255) / 255,
      ((value >> 8) & 255) / 255,
      (value & 255) / 255
    );
  }

  const normalized = value.trim();
  if (/^#[\da-f]{3}$/i.test(normalized)) {
    const [r = "0", g = "0", b = "0"] = normalized.slice(1).split("");
    return Color3.FromHexString(`#${r}${r}${g}${g}${b}${b}`);
  }
  if (/^[\da-f]{6}$/i.test(normalized)) return Color3.FromHexString(`#${normalized}`);
  if (/^#[\da-f]{8}$/i.test(normalized)) return Color3.FromHexString(normalized.slice(0, 7));
  try {
    return Color3.FromHexString(normalized);
  } catch {
    return new Color3(1, 1, 1);
  }
}

function vec3(value: PositionValue | undefined, fallback = Vector3.Zero()): Vector3 {
  if (!value) return fallback.clone();
  return value instanceof Vector3 ? value.clone() : new Vector3(value[0], value[1], value[2]);
}

function tint(color: ColorValue, amount: number): Color3 {
  const source = hex(color);
  const target = amount >= 0 ? Color3.White() : Color3.Black();
  return Color3.Lerp(source, target, Math.min(1, Math.abs(amount)));
}

export function mat(
  scene: Scene,
  name: string,
  color: ColorValue,
  options: MaterialOptions = {}
): StandardMaterial {
  const material = new StandardMaterial(name, scene);
  const base = hex(color);
  material.diffuseColor = base;
  material.alpha = options.alpha ?? 1;
  material.backFaceCulling = !(options.doubleSided ?? false);
  material.roughness = options.roughness ?? 0.78;
  material.specularColor = options.specular ? hex(options.specular) : tint(base, 0.3).scale(0.22);
  material.disableLighting = options.unlit ?? false;

  if (options.emissive) {
    const emissive = options.emissive === true ? base : hex(options.emissive);
    material.emissiveColor = emissive.scale(options.emissiveStrength ?? 0.65);
  }
  return material;
}

function setTransform(node: TransformNode, options: BaseVisualOptions): void {
  if (options.position) node.position.copyFrom(vec3(options.position));
  if (options.rotation) node.rotation.copyFrom(vec3(options.rotation));
  if (typeof options.scale === "number") node.scaling.setAll(options.scale);
  else if (options.scale) node.scaling.copyFrom(vec3(options.scale, Vector3.One()));
}

function registerShadows(root: TransformNode, generator?: ShadowGenerator | null): void {
  for (const mesh of root.getChildMeshes(false)) {
    mesh.receiveShadows = true;
    if (generator) generator.addShadowCaster(mesh, false);
  }
}

function seeded(seed = 1): () => number {
  let state = Math.max(1, Math.floor(Math.abs(seed))) >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function ball(
  scene: Scene,
  name: string,
  diameter: number,
  material: StandardMaterial,
  parent: TransformNode,
  position: PositionValue,
  scaling: PositionValue = [1, 1, 1],
  segments = 16
): Mesh {
  const mesh = MeshBuilder.CreateSphere(name, { diameter, segments }, scene);
  mesh.material = material;
  mesh.parent = parent;
  mesh.position.copyFrom(vec3(position));
  mesh.scaling.copyFrom(vec3(scaling, Vector3.One()));
  return mesh;
}

function cylinder(
  scene: Scene,
  name: string,
  height: number,
  diameterTop: number,
  diameterBottom: number,
  material: StandardMaterial,
  parent: TransformNode,
  position: PositionValue,
  tessellation = 12
): Mesh {
  const mesh = MeshBuilder.CreateCylinder(
    name,
    { height, diameterTop, diameterBottom, tessellation },
    scene
  );
  mesh.material = material;
  mesh.parent = parent;
  mesh.position.copyFrom(vec3(position));
  return mesh;
}

export function createWorld(scene: Scene, options: WorldOptions = {}): WorldVisual {
  const name = nextName("world", options.name);
  const root = new TransformNode(name, scene);
  const environment = new TransformNode(`${name}-environment`, scene);
  environment.parent = root;

  const clear = hex(options.clearColor ?? "#91dcff");
  const fog = hex(options.fogColor ?? options.clearColor ?? "#bdeaff");
  scene.clearColor = new Color4(clear.r, clear.g, clear.b, 1);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = options.fogDensity ?? 0.004;
  scene.fogColor = fog;
  scene.ambientColor = hex(options.ambientColor ?? "#b8cfff").scale(0.48);

  const image = scene.imageProcessingConfiguration;
  image.contrast = 1.12;
  image.exposure = 1.05;
  image.toneMappingEnabled = true;

  const fill = new HemisphericLight(`${name}-fill`, new Vector3(0.2, 1, 0.1), scene);
  fill.intensity = options.ambientIntensity ?? 0.78;
  fill.diffuse = hex(options.ambientColor ?? "#d8efff");
  fill.groundColor = tint(options.ambientColor ?? "#8fa6c8", -0.35);

  const sun = new DirectionalLight(
    `${name}-sun`,
    vec3(options.sunDirection, new Vector3(-0.45, -0.85, 0.32)).normalize(),
    scene
  );
  sun.diffuse = hex(options.sunColor ?? "#fff1ce");
  sun.intensity = options.sunIntensity ?? 2.25;
  sun.position.set(25, 40, -22);

  const shadowGenerator =
    options.shadows === false
      ? null
      : new ShadowGenerator(options.shadowMapSize ?? 1024, sun, true);
  if (shadowGenerator) {
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurKernel = 20;
    shadowGenerator.bias = 0.0008;
    shadowGenerator.normalBias = 0.025;
    shadowGenerator.setDarkness(0.24);
  }

  const glow = new GlowLayer(`${name}-glow`, scene, {
    mainTextureFixedSize: 512,
    blurKernelSize: 32
  });
  glow.intensity = options.glowIntensity ?? 0.52;

  let camera: ArcRotateCamera | null = null;
  if (options.camera) {
    camera = new ArcRotateCamera(
      `${name}-camera`,
      options.cameraAlpha ?? -Math.PI / 2,
      options.cameraBeta ?? Math.PI / 3,
      options.cameraRadius ?? 24,
      vec3(options.cameraTarget, new Vector3(0, 2, 0)),
      scene
    );
    camera.lowerRadiusLimit = 5;
    camera.upperRadiusLimit = 60;
    camera.lowerBetaLimit = 0.25;
    camera.upperBetaLimit = Math.PI / 2.05;
    camera.wheelPrecision = 35;
    camera.panningSensibility = 0;
    camera.inertia = 0.78;
    scene.activeCamera = camera;
  }

  if (options.sky !== false) {
    const sky = MeshBuilder.CreateSphere(
      `${name}-sky`,
      { diameter: 500, segments: 16, sideOrientation: Mesh.BACKSIDE },
      scene
    );
    sky.parent = environment;
    sky.isPickable = false;
    sky.infiniteDistance = true;
    sky.material = mat(scene, `${name}-sky-material`, tint(clear, 0.2), {
      emissive: tint(clear, 0.08),
      emissiveStrength: 0.9,
      unlit: true,
      doubleSided: true
    });
  }

  return { root, environment, sun, fill, shadowGenerator, glow, camera };
}

export function createCat(scene: Scene, options: CatOptions = {}): TransformNode {
  const name = nextName("cat", options.name);
  const root = new TransformNode(name, scene);
  const size = options.size ?? 1;
  const bodyColor = options.bodyColor ?? "#f6b45f";
  const patchColor = options.patchColor ?? "#fff2d5";
  const eyeColor = options.eyeColor ?? "#254553";
  const bodyMat = mat(scene, `${name}-fur`, bodyColor, { roughness: 0.92 });
  const patchMat = mat(scene, `${name}-patch`, patchColor, { roughness: 0.95 });
  const darkMat = mat(scene, `${name}-features`, eyeColor, { roughness: 0.55 });
  const pinkMat = mat(scene, `${name}-pink`, "#ef8297", { roughness: 0.8 });

  ball(scene, `${name}-body`, 1.6, bodyMat, root, [0, 1.13, 0], [0.78, 1.04, 0.62], 20);
  ball(scene, `${name}-belly`, 1.05, patchMat, root, [0, 1.15, -0.55], [0.72, 0.88, 0.13], 16);
  ball(scene, `${name}-head`, 1.28, bodyMat, root, [0, 2.18, -0.04], [1.02, 0.93, 0.9], 20);

  for (const side of [-1, 1]) {
    const ear = MeshBuilder.CreateCylinder(
      `${name}-ear-${side}`,
      { height: 0.62, diameterTop: 0, diameterBottom: 0.52, tessellation: 3 },
      scene
    );
    ear.material = bodyMat;
    ear.parent = root;
    ear.position.set(side * 0.39, 2.82, 0);
    ear.rotation.z = side * -0.12;
    ear.rotation.y = Math.PI / 2;

    const inner = MeshBuilder.CreateCylinder(
      `${name}-inner-ear-${side}`,
      { height: 0.44, diameterTop: 0, diameterBottom: 0.31, tessellation: 3 },
      scene
    );
    inner.material = pinkMat;
    inner.parent = root;
    inner.position.set(side * 0.39, 2.79, -0.035);
    inner.rotation.copyFrom(ear.rotation);

    ball(scene, `${name}-eye-${side}`, 0.18, darkMat, root, [side * 0.25, 2.25, -0.57], [0.7, 1.05, 0.35], 12);
    ball(scene, `${name}-eye-glint-${side}`, 0.055, patchMat, root, [side * 0.225, 2.3, -0.64], [1, 1, 0.45], 8);
    ball(scene, `${name}-cheek-${side}`, 0.16, pinkMat, root, [side * 0.4, 2.03, -0.57], [1.2, 0.55, 0.3], 10);

    const leg = cylinder(
      scene,
      `${name}-leg-${side}`,
      0.6,
      0.3,
      0.36,
      bodyMat,
      root,
      [side * 0.36, 0.45, -0.02],
      12
    );
    ball(scene, `${name}-paw-${side}`, 0.42, patchMat, root, [side * 0.36, 0.13, -0.13], [1.05, 0.62, 1.2], 12);
    leg.rotation.z = side * 0.03;
  }

  ball(scene, `${name}-muzzle-left`, 0.32, patchMat, root, [-0.13, 2.03, -0.59], [1.1, 0.78, 0.42], 12);
  ball(scene, `${name}-muzzle-right`, 0.32, patchMat, root, [0.13, 2.03, -0.59], [1.1, 0.78, 0.42], 12);
  ball(scene, `${name}-nose`, 0.13, pinkMat, root, [0, 2.12, -0.69], [1.1, 0.75, 0.45], 10);

  const tailPath = [
    new Vector3(0.52, 0.85, 0.1),
    new Vector3(0.92, 1.02, 0.2),
    new Vector3(1.08, 1.52, 0.24),
    new Vector3(0.88, 1.83, 0.18)
  ];
  const tail = MeshBuilder.CreateTube(
    `${name}-tail`,
    { path: tailPath, radius: 0.16, tessellation: 10, cap: Mesh.CAP_ALL },
    scene
  );
  tail.material = bodyMat;
  tail.parent = root;

  if (options.scarf !== false) {
    const scarfMat = mat(scene, `${name}-scarf-material`, options.scarfColor ?? "#62d4d6", {
      roughness: 0.7
    });
    const collar = MeshBuilder.CreateTorus(
      `${name}-scarf`,
      { diameter: 1.07, thickness: 0.17, tessellation: 20 },
      scene
    );
    collar.parent = root;
    collar.material = scarfMat;
    collar.position.set(0, 1.72, 0);
    collar.rotation.x = Math.PI / 2;
    const scarfEnd = MeshBuilder.CreateCylinder(
      `${name}-scarf-end`,
      { height: 0.62, diameterTop: 0.2, diameterBottom: 0.34, tessellation: 4 },
      scene
    );
    scarfEnd.parent = root;
    scarfEnd.material = scarfMat;
    scarfEnd.position.set(0.42, 1.42, 0.27);
    scarfEnd.rotation.z = -0.38;
  }

  if (options.wings) {
    const wingMat = mat(scene, `${name}-wing-material`, "#e8fbff", {
      emissive: "#9deaff",
      emissiveStrength: 0.25,
      alpha: 0.86,
      doubleSided: true
    });
    for (const side of [-1, 1]) {
      const wing = ball(
        scene,
        `${name}-wing-${side}`,
        1.1,
        wingMat,
        root,
        [side * 0.76, 1.38, 0.32],
        [0.2, 0.82, 0.68],
        14
      );
      wing.rotation.z = side * 0.45;
    }
  }

  root.scaling.setAll(size);
  setTransform(root, options);
  root.metadata = { kind: "cat", visualSize: size };
  registerShadows(root, options.shadowGenerator);
  return root;
}

export function createIsland(scene: Scene, options: IslandOptions = {}): TransformNode {
  const name = nextName("island", options.name);
  const root = new TransformNode(name, scene);
  const radius = options.radius ?? 5;
  const height = options.height ?? 3.2;
  const random = seeded(options.seed ?? 1);
  const earth = mat(scene, `${name}-earth`, options.earthColor ?? "#906b63", {
    roughness: 1
  });
  const top = mat(scene, `${name}-top`, options.topColor ?? "#79c86e", { roughness: 0.98 });
  const rim = mat(scene, `${name}-rim`, options.rimColor ?? "#b8df83", { roughness: 0.95 });

  const underside = MeshBuilder.CreateCylinder(
    `${name}-underside`,
    {
      height,
      diameterTop: radius * 1.92,
      diameterBottom: radius * 0.24,
      tessellation: 16,
      subdivisions: 2
    },
    scene
  );
  underside.material = earth;
  underside.parent = root;
  underside.position.y = -height * 0.5;

  const cap = MeshBuilder.CreateCylinder(
    `${name}-meadow`,
    { height: 0.6, diameterTop: radius * 2, diameterBottom: radius * 1.86, tessellation: 24 },
    scene
  );
  cap.material = top;
  cap.parent = root;
  cap.position.y = 0.12;

  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2 + random() * 0.13;
    const stone = ball(
      scene,
      `${name}-rim-${i}`,
      radius * (0.16 + random() * 0.09),
      rim,
      root,
      [Math.cos(angle) * radius * 0.88, 0.42 + random() * 0.08, Math.sin(angle) * radius * 0.88],
      [1.35, 0.45, 0.7],
      10
    );
    stone.rotation.y = -angle;
  }

  const crystalCount = options.crystals ?? 0;
  const crystalMat = mat(scene, `${name}-crystal-material`, "#8feaff", {
    emissive: "#57dfff",
    emissiveStrength: 0.8,
    roughness: 0.15
  });
  for (let i = 0; i < crystalCount; i += 1) {
    const angle = random() * Math.PI * 2;
    const distance = radius * (0.25 + random() * 0.57);
    const crystal = MeshBuilder.CreateCylinder(
      `${name}-crystal-${i}`,
      { height: 0.5 + random() * 0.65, diameterTop: 0, diameterBottom: 0.24, tessellation: 6 },
      scene
    );
    crystal.material = crystalMat;
    crystal.parent = root;
    crystal.position.set(Math.cos(angle) * distance, 0.65, Math.sin(angle) * distance);
    crystal.rotation.z = (random() - 0.5) * 0.22;
  }

  setTransform(root, options);
  root.metadata = { kind: "island", radius, height };
  registerShadows(root, options.shadowGenerator);
  return root;
}

export function createTree(scene: Scene, options: TreeOptions = {}): TransformNode {
  const name = nextName("tree", options.name);
  const root = new TransformNode(name, scene);
  const height = options.height ?? 3;
  const random = seeded(options.seed ?? 4);
  const trunkMat = mat(scene, `${name}-trunk-material`, options.trunkColor ?? "#8b604d", {
    roughness: 1
  });
  const leafColor = options.leafColor ?? "#56b97b";
  const leafMat = mat(scene, `${name}-leaf-material`, leafColor, { roughness: 0.95 });
  const leafLight = mat(scene, `${name}-leaf-light-material`, tint(leafColor, 0.23), {
    roughness: 0.95
  });

  const trunk = cylinder(
    scene,
    `${name}-trunk`,
    height * 0.62,
    height * 0.12,
    height * 0.19,
    trunkMat,
    root,
    [0, height * 0.31, 0],
    10
  );
  trunk.rotation.z = (random() - 0.5) * 0.07;

  const canopyY = height * 0.82;
  const canopyData: Array<[number, number, number, number]> = [
    [0, 0.16, 0, 0.62],
    [-0.32, -0.02, 0.05, 0.46],
    [0.35, -0.04, 0.08, 0.49],
    [0.08, -0.03, -0.3, 0.44],
    [-0.08, 0.31, -0.04, 0.4]
  ];
  canopyData.forEach(([x, y, z, scale], index) => {
    ball(
      scene,
      `${name}-canopy-${index}`,
      height * scale,
      index % 2 === 0 ? leafMat : leafLight,
      root,
      [x * height, canopyY + y * height, z * height],
      [1.12, 0.9, 1],
      14
    );
  });

  const fruitCount = options.fruitCount ?? 0;
  if (fruitCount > 0) {
    const fruitMat = mat(scene, `${name}-fruit-material`, options.fruitColor ?? "#ff8b72", {
      emissive: options.fruitColor ?? "#ff8b72",
      emissiveStrength: 0.12
    });
    for (let i = 0; i < fruitCount; i += 1) {
      const angle = random() * Math.PI * 2;
      const spread = height * (0.13 + random() * 0.24);
      ball(
        scene,
        `${name}-fruit-${i}`,
        height * 0.11,
        fruitMat,
        root,
        [
          Math.cos(angle) * spread,
          canopyY + (random() - 0.35) * height * 0.35,
          Math.sin(angle) * spread
        ],
        [1, 1, 1],
        10
      );
    }
  }

  setTransform(root, options);
  root.metadata = { kind: "tree", height };
  registerShadows(root, options.shadowGenerator);
  return root;
}

export function createCloud(scene: Scene, options: CloudOptions = {}): TransformNode {
  const name = nextName("cloud", options.name);
  const root = new TransformNode(name, scene);
  const size = options.size ?? 2.5;
  const random = seeded(options.seed ?? 9);
  const cloudColor = options.color ?? "#f8fdff";
  const cloudMat = mat(scene, `${name}-material`, cloudColor, {
    emissive: options.glowColor ?? "#d8f4ff",
    emissiveStrength: 0.12,
    roughness: 1
  });
  const shadeMat = mat(scene, `${name}-shade-material`, tint(cloudColor, -0.08), {
    roughness: 1
  });
  const puffs = Math.max(3, options.puffs ?? 7);
  for (let i = 0; i < puffs; i += 1) {
    const center = i === 0;
    const angle = random() * Math.PI * 2;
    const spread = center ? 0 : size * (0.2 + random() * 0.27);
    const puffSize = size * (center ? 0.68 : 0.38 + random() * 0.26);
    ball(
      scene,
      `${name}-puff-${i}`,
      puffSize,
      i > puffs - 3 ? shadeMat : cloudMat,
      root,
      [
        Math.cos(angle) * spread,
        (random() - 0.42) * size * 0.18,
        Math.sin(angle) * spread * 0.58
      ],
      [1.35, 0.72 + random() * 0.22, 1],
      14
    );
  }
  setTransform(root, options);
  root.metadata = { kind: "cloud", size };
  registerShadows(root, options.shadowGenerator);
  return root;
}

export function createSpirit(scene: Scene, options: SpiritOptions = {}): TransformNode {
  const name = nextName("spirit", options.name);
  const root = new TransformNode(name, scene);
  const size = options.size ?? 1;
  const color = options.color ?? "#8fe7ff";
  const accent = options.accent ?? "#fff4a6";
  const glowMat = mat(scene, `${name}-glow-material`, color, {
    emissive: color,
    emissiveStrength: 1.25,
    roughness: 0.12,
    alpha: 0.94
  });
  const accentMat = mat(scene, `${name}-accent-material`, accent, {
    emissive: accent,
    emissiveStrength: 0.8,
    roughness: 0.2
  });
  const eyeMat = mat(scene, `${name}-eye-material`, "#29455d", { roughness: 0.4 });

  ball(scene, `${name}-body`, 0.9, glowMat, root, [0, 0, 0], [0.9, 1.08, 0.78], 18);
  for (const side of [-1, 1]) {
    ball(
      scene,
      `${name}-eye-${side}`,
      0.105,
      eyeMat,
      root,
      [side * 0.17, 0.08, -0.38],
      [0.72, 1, 0.4],
      10
    );
    if (options.wings !== false) {
      const wing = ball(
        scene,
        `${name}-wing-${side}`,
        0.7,
        accentMat,
        root,
        [side * 0.52, 0.02, 0.03],
        [0.22, 0.72, 0.48],
        12
      );
      wing.rotation.z = side * 0.45;
    }
  }
  const halo = MeshBuilder.CreateTorus(
    `${name}-halo`,
    { diameter: 0.75, thickness: 0.065, tessellation: 20 },
    scene
  );
  halo.material = accentMat;
  halo.parent = root;
  halo.position.y = 0.68;
  halo.rotation.x = Math.PI / 2;

  if (options.particles !== false) {
    createParticles(scene, {
      name: `${name}-sparkles`,
      emitter: root,
      color,
      color2: accent,
      capacity: 80,
      emitRate: 12,
      minSize: 0.025,
      maxSize: 0.11,
      minLifeTime: 0.4,
      maxLifeTime: 1.15,
      speed: 0.18
    });
  }

  root.scaling.setAll(size);
  setTransform(root, options);
  root.metadata = { kind: "spirit", visualSize: size };
  registerShadows(root, options.shadowGenerator);
  return root;
}

export function createRing(scene: Scene, options: RingOptions = {}): Mesh {
  const name = nextName("ring", options.name);
  const radius = options.radius ?? 1.5;
  const color = options.color ?? "#ffe67b";
  const ring = MeshBuilder.CreateTorus(
    name,
    {
      diameter: radius * 2,
      thickness: options.thickness ?? Math.max(0.08, radius * 0.09),
      tessellation: 32
    },
    scene
  );
  ring.material = mat(scene, `${name}-material`, color, {
    emissive: color,
    emissiveStrength: options.emissiveStrength ?? 1.1,
    roughness: 0.18
  });
  if (options.vertical !== false) ring.rotation.x = Math.PI / 2;
  setTransform(ring, options);
  ring.metadata = { kind: "ring", radius };
  ring.receiveShadows = true;
  options.shadowGenerator?.addShadowCaster(ring);
  return ring;
}

export function createAnimal(scene: Scene, options: AnimalOptions = {}): TransformNode {
  const name = nextName(options.kind ?? "animal", options.name);
  const root = new TransformNode(name, scene);
  const kind = options.kind ?? "rabbit";
  const size = options.size ?? 1;
  const color = options.color ?? (
    kind === "fox" ? "#e98b54" :
    kind === "bird" ? "#78c8e8" :
    kind === "deer" ? "#b78a64" :
    kind === "turtle" ? "#70b58a" :
    kind === "tanuki" ? "#88776e" :
    "#e7ddd2"
  );
  const accent = options.accent ?? "#fff2dc";
  const bodyMat = mat(scene, `${name}-body-material`, color, { roughness: 0.95 });
  const accentMat = mat(scene, `${name}-accent-material`, accent, { roughness: 0.95 });
  const darkMat = mat(scene, `${name}-dark-material`, "#293f4d", { roughness: 0.55 });

  if (kind === "bird") {
    ball(scene, `${name}-body`, 1, bodyMat, root, [0, 0.65, 0], [0.82, 1, 0.9], 16);
    ball(scene, `${name}-head`, 0.72, accentMat, root, [0, 1.35, -0.08], [1, 1, 0.92], 16);
    for (const side of [-1, 1]) {
      const wing = ball(
        scene,
        `${name}-wing-${side}`,
        0.76,
        bodyMat,
        root,
        [side * 0.52, 0.72, 0.08],
        [0.22, 0.85, 0.6],
        12
      );
      wing.rotation.z = side * 0.42;
      ball(scene, `${name}-eye-${side}`, 0.09, darkMat, root, [side * 0.17, 1.42, -0.42], [1, 1, 0.45], 8);
    }
    const beak = MeshBuilder.CreateCylinder(
      `${name}-beak`,
      { height: 0.34, diameterTop: 0, diameterBottom: 0.24, tessellation: 4 },
      scene
    );
    beak.material = mat(scene, `${name}-beak-material`, "#f4b95f");
    beak.parent = root;
    beak.position.set(0, 1.28, -0.45);
    beak.rotation.x = Math.PI / 2;
  } else if (kind === "turtle") {
    ball(scene, `${name}-shell`, 1.5, bodyMat, root, [0, 0.45, 0], [1, 0.42, 0.78], 16);
    ball(scene, `${name}-head`, 0.56, accentMat, root, [0, 0.43, -0.95], [1, 0.86, 1.15], 14);
    for (const side of [-1, 1]) {
      for (const z of [-0.5, 0.48]) {
        ball(scene, `${name}-leg-${side}-${z}`, 0.36, accentMat, root, [side * 0.68, 0.2, z], [1.25, 0.45, 0.7], 10);
      }
      ball(scene, `${name}-eye-${side}`, 0.07, darkMat, root, [side * 0.14, 0.51, -1.19], [1, 1, 0.5], 8);
    }
  } else {
    ball(scene, `${name}-body`, 1.35, bodyMat, root, [0, 0.8, 0.12], [0.72, 0.9, 0.9], 16);
    ball(scene, `${name}-head`, 1.02, bodyMat, root, [0, 1.62, -0.16], [0.95, 0.9, 0.9], 16);
    ball(scene, `${name}-muzzle`, 0.58, accentMat, root, [0, 1.46, -0.58], [1, 0.72, 0.46], 12);
    for (const side of [-1, 1]) {
      ball(scene, `${name}-eye-${side}`, 0.105, darkMat, root, [side * 0.2, 1.7, -0.59], [0.75, 1, 0.4], 8);
      cylinder(scene, `${name}-leg-${side}`, 0.55, 0.23, 0.29, bodyMat, root, [side * 0.32, 0.28, 0], 10);
    }

    if (kind === "rabbit") {
      for (const side of [-1, 1]) {
        const ear = ball(
          scene,
          `${name}-ear-${side}`,
          0.95,
          bodyMat,
          root,
          [side * 0.25, 2.35, -0.03],
          [0.38, 1.25, 0.42],
          12
        );
        ear.rotation.z = side * -0.12;
      }
      ball(scene, `${name}-tail`, 0.46, accentMat, root, [0, 0.75, 0.79], [1, 1, 1], 12);
    } else if (kind === "deer") {
      for (const side of [-1, 1]) {
        const ear = ball(
          scene,
          `${name}-ear-${side}`,
          0.48,
          accentMat,
          root,
          [side * 0.42, 1.98, -0.02],
          [0.5, 1, 0.4],
          10
        );
        ear.rotation.z = side * 0.65;
        const antler = cylinder(
          scene,
          `${name}-antler-${side}`,
          0.68,
          0.05,
          0.09,
          accentMat,
          root,
          [side * 0.25, 2.35, 0],
          8
        );
        antler.rotation.z = side * -0.2;
      }
    } else {
      for (const side of [-1, 1]) {
        const ear = MeshBuilder.CreateCylinder(
          `${name}-ear-${side}`,
          { height: 0.55, diameterTop: 0, diameterBottom: 0.45, tessellation: 3 },
          scene
        );
        ear.material = kind === "tanuki" ? darkMat : bodyMat;
        ear.parent = root;
        ear.position.set(side * 0.32, 2.17, -0.06);
        ear.rotation.y = Math.PI / 2;
      }
      const tail = ball(
        scene,
        `${name}-tail`,
        kind === "fox" ? 1.18 : 0.9,
        bodyMat,
        root,
        [0.62, 0.82, 0.45],
        [0.48, 1.1, 0.52],
        14
      );
      tail.rotation.z = -0.72;
      if (kind === "tanuki") {
        for (const side of [-1, 1]) {
          const mask = ball(
            scene,
            `${name}-mask-${side}`,
            0.35,
            darkMat,
            root,
            [side * 0.2, 1.68, -0.51],
            [1.1, 0.55, 0.3],
            10
          );
          mask.rotation.z = side * 0.13;
        }
      }
    }
  }

  root.scaling.setAll(size);
  setTransform(root, options);
  root.metadata = { kind, visualSize: size };
  registerShadows(root, options.shadowGenerator);
  return root;
}

export function createFish(scene: Scene, options: FishOptions = {}): TransformNode {
  const name = nextName("fish", options.name);
  const root = new TransformNode(name, scene);
  const size = options.size ?? 1;
  const color = options.color ?? "#54cde2";
  const accent = options.accent ?? "#ffe37d";
  const bodyMat = mat(scene, `${name}-body-material`, color, {
    emissive: color,
    emissiveStrength: 0.08,
    roughness: 0.6
  });
  const accentMat = mat(scene, `${name}-accent-material`, accent, {
    emissive: accent,
    emissiveStrength: 0.18,
    roughness: 0.55
  });
  const eyeMat = mat(scene, `${name}-eye-material`, "#183746", { roughness: 0.35 });

  ball(scene, `${name}-body`, 1.45, bodyMat, root, [0, 0, 0], [1.15, 0.63, 0.58], 18);
  const tail = MeshBuilder.CreateCylinder(
    `${name}-tail`,
    { height: 0.8, diameterTop: 0, diameterBottom: 0.78, tessellation: 3 },
    scene
  );
  tail.material = accentMat;
  tail.parent = root;
  tail.position.set(1.03, 0, 0);
  tail.rotation.z = -Math.PI / 2;
  tail.rotation.y = Math.PI / 2;
  const fin = MeshBuilder.CreateCylinder(
    `${name}-fin`,
    { height: 0.48, diameterTop: 0, diameterBottom: 0.42, tessellation: 3 },
    scene
  );
  fin.material = accentMat;
  fin.parent = root;
  fin.position.set(-0.05, 0.57, 0);
  fin.rotation.z = 0.08;
  ball(scene, `${name}-eye`, 0.16, eyeMat, root, [-0.55, 0.12, -0.54], [0.8, 1, 0.38], 10);
  ball(scene, `${name}-eye-glint`, 0.05, accentMat, root, [-0.58, 0.16, -0.6], [1, 1, 0.45], 8);

  if (options.stripes) {
    for (const x of [-0.05, 0.36]) {
      const stripe = MeshBuilder.CreateTorus(
        `${name}-stripe-${x}`,
        { diameter: 1.02, thickness: 0.09, tessellation: 18 },
        scene
      );
      stripe.parent = root;
      stripe.material = accentMat;
      stripe.position.x = x;
      stripe.rotation.z = Math.PI / 2;
      stripe.scaling.y = 0.72;
    }
  }

  root.scaling.setAll(size);
  setTransform(root, options);
  root.metadata = { kind: "fish", visualSize: size };
  registerShadows(root, options.shadowGenerator);
  return root;
}

export function createRock(scene: Scene, options: RockOptions = {}): Mesh {
  const name = nextName("rock", options.name);
  const random = seeded(options.seed ?? 12);
  const radius = options.radius ?? 1;
  const rock = MeshBuilder.CreatePolyhedron(
    name,
    { type: 1, size: radius, sizeX: 1 + random() * 0.3, sizeY: 0.72 + random() * 0.35, sizeZ: 0.82 + random() * 0.35 },
    scene
  );
  rock.material = mat(scene, `${name}-material`, options.color ?? "#77849a", { roughness: 1 });
  rock.rotation.set(random() * 0.4, random() * Math.PI, random() * 0.26);
  setTransform(rock, options);
  rock.receiveShadows = true;
  options.shadowGenerator?.addShadowCaster(rock);
  rock.metadata = { kind: "rock", radius };

  if (options.crystal) {
    const crystal = MeshBuilder.CreateCylinder(
      `${name}-crystal`,
      { height: radius * 1.15, diameterTop: 0, diameterBottom: radius * 0.35, tessellation: 6 },
      scene
    );
    crystal.parent = rock;
    crystal.position.set(0, radius * 0.75, 0);
    crystal.material = mat(scene, `${name}-crystal-material`, options.accent ?? "#8fe9ff", {
      emissive: options.accent ?? "#8fe9ff",
      emissiveStrength: 0.85,
      roughness: 0.12
    });
    options.shadowGenerator?.addShadowCaster(crystal);
  }
  return rock;
}

export function createClockFace(scene: Scene, options: ClockFaceOptions = {}): TransformNode {
  const name = nextName("clock", options.name);
  const root = new TransformNode(name, scene);
  const radius = options.radius ?? 2;
  const rimColor = options.rimColor ?? "#5cbfc8";
  const faceColor = options.faceColor ?? "#fffaf0";

  const rim = MeshBuilder.CreateCylinder(
    `${name}-rim`,
    { height: radius * 0.18, diameter: radius * 2.12, tessellation: 48 },
    scene
  );
  rim.parent = root;
  rim.rotation.x = Math.PI / 2;
  rim.material = mat(scene, `${name}-rim-material`, rimColor, {
    emissive: rimColor,
    emissiveStrength: 0.12,
    roughness: 0.5
  });

  const face = MeshBuilder.CreateDisc(
    `${name}-face`,
    { radius, tessellation: 64, sideOrientation: Mesh.DOUBLESIDE },
    scene
  );
  face.parent = root;
  face.position.z = -radius * 0.1 - 0.01;
  face.material = mat(scene, `${name}-face-material`, faceColor, {
    emissive: faceColor,
    emissiveStrength: 0.08,
    roughness: 0.95,
    doubleSided: true
  });

  const tickMat = mat(scene, `${name}-tick-material`, tint(rimColor, -0.48), { roughness: 0.7 });
  for (let value = 0; value < 60; value += 1) {
    const major = value % 5 === 0;
    const angle = (value / 60) * Math.PI * 2;
    const tick = MeshBuilder.CreateBox(
      `${name}-tick-${value}`,
      {
        width: major ? radius * 0.075 : radius * 0.025,
        height: major ? radius * 0.24 : radius * 0.11,
        depth: radius * 0.045
      },
      scene
    );
    tick.parent = root;
    tick.material = tickMat;
    tick.position.set(
      Math.sin(angle) * radius * (major ? 0.82 : 0.88),
      Math.cos(angle) * radius * (major ? 0.82 : 0.88),
      -radius * 0.13
    );
    tick.rotation.z = -angle;
  }

  if (options.showNumbers !== false) {
    const texture = new DynamicTexture(`${name}-numbers-texture`, { width: 1024, height: 1024 }, scene, false);
    texture.hasAlpha = true;
    const context = texture.getContext() as unknown as CanvasRenderingContext2D;
    context.clearRect(0, 0, 1024, 1024);
    context.fillStyle = "#27475b";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "bold 84px system-ui, sans-serif";
    for (let value = 1; value <= 12; value += 1) {
      const angle = (value / 12) * Math.PI * 2;
      context.fillText(
        String(value),
        512 + Math.sin(angle) * 360,
        512 - Math.cos(angle) * 360 + 3
      );
    }
    texture.update();
    const numberPlane = MeshBuilder.CreatePlane(`${name}-numbers`, { size: radius * 2 }, scene);
    const numberMaterial = new StandardMaterial(`${name}-numbers-material`, scene);
    numberMaterial.diffuseTexture = texture;
    numberMaterial.opacityTexture = texture;
    numberMaterial.emissiveTexture = texture;
    numberMaterial.useAlphaFromDiffuseTexture = true;
    numberMaterial.disableLighting = true;
    numberMaterial.backFaceCulling = false;
    numberPlane.parent = root;
    numberPlane.material = numberMaterial;
    numberPlane.position.z = -radius * 0.14;
  }

  const hourHand = MeshBuilder.CreateBox(
    `${name}-hour-hand`,
    { width: radius * 0.11, height: radius * 0.92, depth: radius * 0.09 },
    scene
  );
  hourHand.parent = root;
  hourHand.material = mat(scene, `${name}-hour-material`, options.hourColor ?? "#ef7a72", {
    emissive: options.hourColor ?? "#ef7a72",
    emissiveStrength: 0.15
  });
  hourHand.position.set(0, radius * 0.22, -radius * 0.2);

  const minuteHand = MeshBuilder.CreateBox(
    `${name}-minute-hand`,
    { width: radius * 0.075, height: radius * 1.35, depth: radius * 0.08 },
    scene
  );
  minuteHand.parent = root;
  minuteHand.material = mat(scene, `${name}-minute-material`, options.minuteColor ?? "#477bd5", {
    emissive: options.minuteColor ?? "#477bd5",
    emissiveStrength: 0.15
  });
  minuteHand.position.set(0, radius * 0.38, -radius * 0.23);
  ball(
    scene,
    `${name}-pin`,
    radius * 0.18,
    tickMat,
    root,
    [0, 0, -radius * 0.28],
    [1, 1, 0.45],
    12
  );

  const setTime = (hour: number, minute: number): void => {
    hourHand.rotation.z = -(((hour % 12) + minute / 60) / 12) * Math.PI * 2;
    minuteHand.rotation.z = -((minute % 60) / 60) * Math.PI * 2;
  };
  setTime(options.hour ?? 10, options.minute ?? 10);

  setTransform(root, options);
  root.metadata = { kind: "clock", hourHand, minuteHand, setTime };
  registerShadows(root, options.shadowGenerator);
  return root;
}

function particleTexture(scene: Scene, name: string): DynamicTexture {
  const texture = new DynamicTexture(`${name}-texture`, { width: 64, height: 64 }, scene, false);
  texture.hasAlpha = true;
  const context = texture.getContext();
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 31);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.22, "rgba(255,255,255,.95)");
  gradient.addColorStop(0.62, "rgba(255,255,255,.38)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  texture.update();
  return texture;
}

export function createParticles(scene: Scene, options: ParticleOptions = {}): ParticleSystem {
  const name = nextName("particles", options.name);
  const particles = new ParticleSystem(name, options.capacity ?? 240, scene);
  particles.particleTexture = particleTexture(scene, name);
  particles.emitter =
    options.emitter instanceof Vector3
      ? options.emitter
      : options.emitter?.getChildMeshes(false)[0] ?? options.emitter?.getAbsolutePosition() ?? Vector3.Zero();
  particles.color1 = Color4.FromColor3(hex(options.color ?? "#fff4a6"), 1);
  particles.color2 = Color4.FromColor3(hex(options.color2 ?? options.color ?? "#8fe9ff"), 0.85);
  particles.colorDead = new Color4(particles.color2.r, particles.color2.g, particles.color2.b, 0);
  particles.minSize = options.minSize ?? 0.05;
  particles.maxSize = options.maxSize ?? 0.2;
  particles.minLifeTime = options.minLifeTime ?? 0.45;
  particles.maxLifeTime = options.maxLifeTime ?? 1.45;
  particles.emitRate = options.emitRate ?? 28;
  particles.minEmitPower = (options.speed ?? 0.5) * 0.25;
  particles.maxEmitPower = options.speed ?? 0.5;
  particles.direction1 = new Vector3(-0.55, 0.25, -0.55);
  particles.direction2 = new Vector3(0.55, 1.15, 0.55);
  particles.minEmitBox = new Vector3(-0.08, -0.08, -0.08);
  particles.maxEmitBox = new Vector3(0.08, 0.08, 0.08);
  particles.gravity = vec3(options.gravity, new Vector3(0, -0.18, 0));
  particles.minAngularSpeed = -2.5;
  particles.maxAngularSpeed = 2.5;
  particles.minInitialRotation = 0;
  particles.maxInitialRotation = Math.PI * 2;
  particles.blendMode = options.blendMode ?? ParticleSystem.BLENDMODE_ADD;
  particles.updateSpeed = 1 / 60;
  if (options.start !== false) particles.start();
  return particles;
}

export function createCoral(scene: Scene, options: CoralOptions = {}): TransformNode {
  const name = nextName("coral", options.name);
  const root = new TransformNode(name, scene);
  const size = options.size ?? 1.5;
  const random = seeded(options.seed ?? 22);
  const material = mat(scene, `${name}-material`, options.color ?? "#f27da3", {
    emissive: options.accent ?? "#ff9bb6",
    emissiveStrength: 0.13,
    roughness: 0.9
  });
  const branches = Math.max(3, options.branches ?? 7);
  for (let i = 0; i < branches; i += 1) {
    const angle = (i / branches) * Math.PI * 2 + random() * 0.45;
    const height = size * (0.45 + random() * 0.62);
    const branch = cylinder(
      scene,
      `${name}-branch-${i}`,
      height,
      size * 0.08,
      size * 0.14,
      material,
      root,
      [Math.cos(angle) * size * random() * 0.28, height * 0.5, Math.sin(angle) * size * random() * 0.28],
      8
    );
    branch.rotation.z = Math.cos(angle) * (0.12 + random() * 0.28);
    branch.rotation.x = Math.sin(angle) * (0.12 + random() * 0.28);
    ball(
      scene,
      `${name}-tip-${i}`,
      size * 0.2,
      material,
      root,
      [branch.position.x + Math.sin(branch.rotation.z) * height * 0.5, height * 0.95, branch.position.z],
      [1, 1, 1],
      10
    );
  }
  setTransform(root, options);
  root.metadata = { kind: "coral", size };
  registerShadows(root, options.shadowGenerator);
  return root;
}

export function createGear(scene: Scene, options: GearOptions = {}): TransformNode {
  const name = nextName("gear", options.name);
  const root = new TransformNode(name, scene);
  const radius = options.radius ?? 1.2;
  const thickness = options.thickness ?? radius * 0.24;
  const teeth = Math.max(6, options.teeth ?? 12);
  const gearMat = mat(scene, `${name}-material`, options.color ?? "#ebb95e", {
    specular: options.accent ?? "#fff1a4",
    roughness: 0.42
  });
  const wheel = MeshBuilder.CreateTorus(
    `${name}-wheel`,
    { diameter: radius * 1.35, thickness: radius * 0.34, tessellation: Math.max(24, teeth * 2) },
    scene
  );
  wheel.parent = root;
  wheel.material = gearMat;
  wheel.rotation.x = Math.PI / 2;
  for (let i = 0; i < teeth; i += 1) {
    const angle = (i / teeth) * Math.PI * 2;
    const tooth = MeshBuilder.CreateBox(
      `${name}-tooth-${i}`,
      { width: radius * 0.28, height: radius * 0.34, depth: thickness },
      scene
    );
    tooth.parent = root;
    tooth.material = gearMat;
    tooth.position.set(Math.cos(angle) * radius * 0.86, Math.sin(angle) * radius * 0.86, 0);
    tooth.rotation.z = angle;
  }
  const hub = MeshBuilder.CreateCylinder(
    `${name}-hub`,
    { height: thickness * 1.1, diameter: radius * 0.33, tessellation: 18 },
    scene
  );
  hub.parent = root;
  hub.material = gearMat;
  hub.rotation.x = Math.PI / 2;
  setTransform(root, options);
  root.metadata = { kind: "gear", radius, teeth };
  registerShadows(root, options.shadowGenerator);
  return root;
}

export function addShadowCasters(root: TransformNode, generator: ShadowGenerator | null): void {
  registerShadows(root, generator);
}

export function setClockTime(clock: TransformNode, hour: number, minute: number): void {
  const setter = (clock.metadata as { setTime?: (h: number, m: number) => void } | null)?.setTime;
  setter?.(hour, minute);
}

export { Vector3, Color3, Color4 };
