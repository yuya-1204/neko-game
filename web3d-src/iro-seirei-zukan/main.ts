import * as BABYLON from "babylonjs";
import { bootstrapGame } from "../shared/runtime";
import type {
  GameDefinition,
  GameFactory,
  GameFactoryContext,
  InputState,
  SceneController,
  StageDefinition
} from "../shared/types";
import { stages } from "./stages";

const definition: GameDefinition = {
  id: "iro-seirei-zukan",
  title: "おうちの色から生まれる 精霊図鑑",
  subtitle: "いろを みつけて、せいれいを よぼう",
  description: "30の おはなしで、いろ・ことば・かず・とけいを つかって せいれいを そだてます。",
  accent: "#8f65e8",
  accent2: "#ff82bd",
  ageLabel: "6〜8さい",
  stageNoun: "おはなし",
  primaryLabel: "まほう",
  secondaryLabel: "いろさがし",
  stages,
  collectionLabel: "せいれい",
  collectionTotal: 60,
  safetyNote: "カメラは つかわなくても、ぜんぶ あそべます。しゃしんや こえは ほぞんも そうしんも しません。"
};

const namedColors = [
  { name: "あか", hex: "#ef4f5f" },
  { name: "オレンジ", hex: "#f39345" },
  { name: "きいろ", hex: "#f2cc48" },
  { name: "みどり", hex: "#4fbf70" },
  { name: "あお", hex: "#4c91e8" },
  { name: "むらさき", hex: "#8a61d4" },
  { name: "ピンク", hex: "#ee79ad" },
  { name: "しろ", hex: "#ece9df" },
  { name: "くろ", hex: "#383746" },
  { name: "ちゃいろ", hex: "#946747" }
] as const;

function color3(value: string): BABYLON.Color3 {
  return BABYLON.Color3.FromHexString(value);
}

function pbr(
  scene: BABYLON.Scene,
  name: string,
  value: string,
  emissive = 0,
  metallic = 0.05,
  roughness = 0.72
): BABYLON.PBRMaterial {
  const material = new BABYLON.PBRMaterial(name, scene);
  const base = color3(value);
  material.albedoColor = base;
  material.metallic = metallic;
  material.roughness = roughness;
  if (emissive > 0) material.emissiveColor = base.scale(emissive);
  return material;
}

function makeCat(scene: BABYLON.Scene): BABYLON.TransformNode {
  const root = new BABYLON.TransformNode("シャロ", scene);
  const fur = pbr(scene, "ちゃトラ", "#e8914b", 0.04);
  const cream = pbr(scene, "おなか", "#ffe4b3", 0.02);
  const dark = pbr(scene, "しま", "#8e4c32");
  const pink = pbr(scene, "はな", "#f68ca7", 0.08);

  const body = BABYLON.MeshBuilder.CreateSphere("からだ", { diameter: 1.35, segments: 20 }, scene);
  body.scaling.set(0.72, 0.92, 0.7);
  body.position.y = 0.85;
  body.material = fur;
  body.parent = root;

  const belly = BABYLON.MeshBuilder.CreateSphere("おなか", { diameter: 0.82, segments: 16 }, scene);
  belly.scaling.set(0.7, 0.8, 0.3);
  belly.position.set(0, 0.78, -0.49);
  belly.material = cream;
  belly.parent = root;

  const head = BABYLON.MeshBuilder.CreateSphere("かお", { diameter: 1.18, segments: 20 }, scene);
  head.position.set(0, 1.62, -0.04);
  head.material = fur;
  head.parent = root;

  for (const side of [-1, 1]) {
    const ear = BABYLON.MeshBuilder.CreateCylinder(
      `みみ${side}`,
      { diameterTop: 0, diameterBottom: 0.5, height: 0.7, tessellation: 3 },
      scene
    );
    ear.position.set(side * 0.37, 2.12, -0.02);
    ear.rotation.z = side * -0.2;
    ear.material = fur;
    ear.parent = root;

    const eye = BABYLON.MeshBuilder.CreateSphere(`め${side}`, { diameter: 0.13, segments: 10 }, scene);
    eye.position.set(side * 0.22, 1.72, -0.55);
    eye.material = dark;
    eye.parent = root;
  }

  const nose = BABYLON.MeshBuilder.CreateSphere("はな", { diameter: 0.12, segments: 10 }, scene);
  nose.scaling.y = 0.65;
  nose.position.set(0, 1.54, -0.6);
  nose.material = pink;
  nose.parent = root;

  const tailPath = Array.from({ length: 17 }, (_, index) => {
    const angle = -0.25 + (index / 16) * Math.PI * 1.35;
    return new BABYLON.Vector3(Math.cos(angle) * 0.52, Math.sin(angle) * 0.52, 0);
  });
  const tail = BABYLON.MeshBuilder.CreateTube(
    "しっぽ",
    { path: tailPath, radius: 0.09, tessellation: 12 },
    scene
  );
  tail.position.set(0.55, 0.9, 0.35);
  tail.rotation.set(Math.PI / 2, 0.25, -0.4);
  tail.material = fur;
  tail.parent = root;

  root.scaling.setAll(0.82);
  return root;
}

function makeSpirit(
  scene: BABYLON.Scene,
  position: BABYLON.Vector3,
  baseColor: string,
  seed: number
): BABYLON.TransformNode {
  const root = new BABYLON.TransformNode(`せいれい-${seed}`, scene);
  root.position.copyFrom(position);
  const glow = pbr(scene, `せいれい色-${seed}`, baseColor, 0.85, 0, 0.4);
  const light = pbr(scene, `せいれい光-${seed}`, "#fff7d7", 0.9, 0, 0.3);
  const body = BABYLON.MeshBuilder.CreateSphere(
    `せいれい体-${seed}`,
    { diameter: 1.35, segments: 24 },
    scene
  );
  body.scaling.set(0.72 + (seed % 3) * 0.08, 0.9, 0.7);
  body.material = glow;
  body.parent = root;

  const crown = BABYLON.MeshBuilder.CreatePolyhedron(
    `せいれい冠-${seed}`,
    { type: seed % 5, size: 0.42 },
    scene
  );
  crown.position.y = 0.95;
  crown.material = light;
  crown.parent = root;

  for (const side of [-1, 1]) {
    const eye = BABYLON.MeshBuilder.CreateSphere(`せいれい目-${seed}-${side}`, { diameter: 0.13 }, scene);
    eye.position.set(side * 0.22, 0.18, -0.56);
    eye.material = pbr(scene, `目-${seed}-${side}`, "#2e2443");
    eye.parent = root;

    const wing = BABYLON.MeshBuilder.CreateSphere(
      `せいれい羽-${seed}-${side}`,
      { diameter: 0.65, segments: 14 },
      scene
    );
    wing.scaling.set(0.25, 0.75, 0.55);
    wing.position.set(side * 0.68, 0.15, 0.05);
    wing.rotation.z = side * 0.5;
    wing.material = light;
    wing.parent = root;
  }
  return root;
}

function makeGarden(scene: BABYLON.Scene, stage: StageDefinition): void {
  const ground = BABYLON.MeshBuilder.CreateCylinder(
    "せいれいのにわ",
    { diameter: 31, height: 1.2, tessellation: 64 },
    scene
  );
  ground.position.y = -0.65;
  ground.material = pbr(scene, "にわ", stage.palette[1], 0.02, 0, 0.92);

  const rim = BABYLON.MeshBuilder.CreateTorus(
    "にじのふち",
    { diameter: 27.5, thickness: 0.26, tessellation: 72 },
    scene
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.04;
  rim.material = pbr(scene, "ふちのひかり", stage.palette[2], 0.7, 0.1, 0.3);

  for (let index = 0; index < 18; index += 1) {
    const angle = (index / 18) * Math.PI * 2 + stage.seed * 0.01;
    const radius = 10.5 + (index % 3) * 1.2;
    const stem = BABYLON.MeshBuilder.CreateCylinder(
      `はな-${index}`,
      { diameterTop: 0.12, diameterBottom: 0.2, height: 1 + (index % 2) * 0.4, tessellation: 8 },
      scene
    );
    stem.position.set(Math.cos(angle) * radius, 0.5, Math.sin(angle) * radius);
    stem.material = pbr(scene, `くき-${index}`, "#3a9b63");
    const bloom = BABYLON.MeshBuilder.CreateSphere(`はなびら-${index}`, { diameter: 0.62, segments: 12 }, scene);
    bloom.scaling.y = 0.45;
    bloom.position.set(stem.position.x, stem.position.y + 0.65, stem.position.z);
    bloom.material = pbr(scene, `はないろ-${index}`, stage.palette[index % 3]!, 0.18);
  }

  const altar = BABYLON.MeshBuilder.CreateCylinder(
    "にじのさいだん",
    { diameterTop: 3.2, diameterBottom: 4.1, height: 1.15, tessellation: 32 },
    scene
  );
  altar.position.y = 0.4;
  altar.material = pbr(scene, "さいだん", "#fff4df", 0.08, 0.12, 0.38);
  const altarRing = BABYLON.MeshBuilder.CreateTorus(
    "さいだんのわ",
    { diameter: 3.1, thickness: 0.16, tessellation: 48 },
    scene
  );
  altarRing.rotation.x = Math.PI / 2;
  altarRing.position.y = 1.05;
  altarRing.material = pbr(scene, "さいだん光", stage.palette[0], 0.95, 0, 0.28);
}

function makeSparkles(scene: BABYLON.Scene, emitter: BABYLON.Vector3, color: string): BABYLON.ParticleSystem {
  const particles = new BABYLON.ParticleSystem("まほうのひかり", 500, scene);
  particles.particleTexture = new BABYLON.DynamicTexture("ひかりテクスチャ", { width: 32, height: 32 }, scene, false);
  const context = (particles.particleTexture as BABYLON.DynamicTexture).getContext();
  const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.35, "rgba(255,255,255,.9)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 32, 32);
  (particles.particleTexture as BABYLON.DynamicTexture).update();
  particles.emitter = emitter;
  particles.color1 = color3(color).toColor4(1);
  particles.color2 = new BABYLON.Color4(1, 1, 1, 0.9);
  particles.colorDead = new BABYLON.Color4(1, 1, 1, 0);
  particles.minSize = 0.08;
  particles.maxSize = 0.34;
  particles.minLifeTime = 0.5;
  particles.maxLifeTime = 1.5;
  particles.emitRate = 65;
  particles.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
  particles.direction1 = new BABYLON.Vector3(-1, 0.4, -1);
  particles.direction2 = new BABYLON.Vector3(1, 2.3, 1);
  particles.minEmitPower = 0.4;
  particles.maxEmitPower = 1.6;
  particles.gravity = new BABYLON.Vector3(0, 0.45, 0);
  return particles;
}

function rgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  return [
    Number.parseInt(clean.slice(0, 2), 16),
    Number.parseInt(clean.slice(2, 4), 16),
    Number.parseInt(clean.slice(4, 6), 16)
  ];
}

type NamedColor = (typeof namedColors)[number];

function nearestColor(red: number, green: number, blue: number): NamedColor {
  return namedColors.reduce<{ item: NamedColor; distance: number }>((best, item) => {
    const [r, g, b] = rgb(item.hex);
    const distance = (r - red) ** 2 + (g - green) ** 2 + (b - blue) ** 2;
    return distance < best.distance ? { item, distance } : best;
  }, { item: namedColors[0], distance: Number.POSITIVE_INFINITY }).item;
}

async function chooseColor(target: string): Promise<{ color: string; matched: boolean } | null> {
  return new Promise((resolve) => {
    let stream: MediaStream | null = null;
    let settled = false;
    const overlay = document.createElement("div");
    overlay.className = "color-finder";
    overlay.innerHTML = `
      <div class="color-finder__card" role="dialog" aria-modal="true" aria-label="いろさがし">
        <h2>いろを みつけよう</h2>
        <p>イラストの いろを えらぶか、カメラで ものの いろを みつけてね。</p>
        <div class="color-finder__palette"></div>
        <div class="color-finder__camera">
          <button type="button" class="camera-start">📷 カメラで いろを さがす</button>
          <p class="privacy">まんなかの いろだけを、このiPhoneの なかで みわけます。しゃしん・こえ・ばしょは、ほぞんも そうしんも しません。</p>
        </div>
        <button type="button" class="finder-close">もどる</button>
      </div>`;
    document.body.append(overlay);

    const style = document.createElement("style");
    style.textContent = `
      .color-finder{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;padding:calc(18px + env(safe-area-inset-top)) calc(18px + env(safe-area-inset-right)) calc(18px + env(safe-area-inset-bottom)) calc(18px + env(safe-area-inset-left));background:rgba(22,15,48,.82);backdrop-filter:blur(10px)}
      .color-finder__card{width:min(680px,96vw);max-height:92vh;overflow:auto;border:3px solid rgba(255,255,255,.8);border-radius:28px;padding:20px;background:linear-gradient(145deg,#fff9ff,#efe8ff);color:#35274f;text-align:center;box-shadow:0 24px 70px rgba(0,0,0,.35)}
      .color-finder h2{margin:0 0 6px;font-size:clamp(24px,5vw,38px)}
      .color-finder p{font-weight:700;line-height:1.6}
      .color-finder__palette{display:grid;grid-template-columns:repeat(5,minmax(58px,1fr));gap:10px;margin:16px 0}
      .color-chip{min-height:64px;border:3px solid #fff;border-radius:18px;color:#201936;font-weight:900;text-shadow:0 1px rgba(255,255,255,.8);box-shadow:0 5px 0 rgba(47,35,70,.25)}
      .camera-start,.finder-close,.camera-use{min-height:50px;border:0;border-radius:16px;padding:10px 18px;background:#6c4fd3;color:white;font-size:17px;font-weight:900}
      .finder-close{margin-top:10px;background:#786e83}
      .privacy{font-size:13px}
      .camera-preview{position:relative;width:min(520px,86vw);margin:10px auto;overflow:hidden;border-radius:18px;background:#1d1730}
      .camera-preview video{display:block;width:100%;max-height:42vh;object-fit:cover}
      .camera-reticle{position:absolute;left:50%;top:50%;width:72px;height:72px;translate:-50% -50%;border:4px solid white;border-radius:18px;box-shadow:0 0 0 999px rgba(0,0,0,.2)}
      @media(max-width:520px){.color-finder__palette{grid-template-columns:repeat(5,1fr);gap:6px}.color-chip{min-height:52px;font-size:12px}.color-finder__card{padding:13px}}
    `;
    overlay.append(style);

    const stopCamera = () => {
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
    };
    const finish = (color: string | null) => {
      if (settled) return;
      settled = true;
      stopCamera();
      document.removeEventListener("visibilitychange", visibilityStop);
      window.removeEventListener("pagehide", pageHideStop);
      overlay.remove();
      if (color === null) {
        resolve(null);
        return;
      }
      const [tr, tg, tb] = rgb(target);
      const [cr, cg, cb] = rgb(color);
      const distance = Math.sqrt((tr - cr) ** 2 + (tg - cg) ** 2 + (tb - cb) ** 2);
      resolve({ color, matched: distance < 125 });
    };
    const visibilityStop = () => {
      if (document.hidden) stopCamera();
    };
    const pageHideStop = () => {
      finish(null);
    };
    document.addEventListener("visibilitychange", visibilityStop);
    window.addEventListener("pagehide", pageHideStop, { once: true });

    const palette = overlay.querySelector(".color-finder__palette")!;
    for (const item of namedColors) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "color-chip";
      button.style.background = item.hex;
      button.textContent = item.name;
      button.addEventListener("click", () => finish(item.hex));
      palette.append(button);
    }

    overlay.querySelector(".finder-close")?.addEventListener("click", () => finish(null));
    overlay.querySelector(".camera-start")?.addEventListener("click", async () => {
      const cameraArea = overlay.querySelector(".color-finder__camera")!;
      const startButton = overlay.querySelector<HTMLButtonElement>(".camera-start");
      if (startButton) startButton.disabled = true;
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("camera unavailable");
        const requestedStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (settled || !overlay.isConnected) {
          requestedStream.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = requestedStream;
        cameraArea.innerHTML = `
          <div class="camera-preview"><video autoplay playsinline muted></video><span class="camera-reticle"></span></div>
          <button type="button" class="camera-use">まんなかの いろを つかう</button>
          <p class="privacy">ひとの かおではなく、ものの いろを さがそう。</p>`;
        const video = cameraArea.querySelector("video") as HTMLVideoElement;
        video.srcObject = stream;
        await video.play();
        cameraArea.querySelector(".camera-use")?.addEventListener("click", () => {
          const sample = document.createElement("canvas");
          sample.width = 32;
          sample.height = 32;
          const context = sample.getContext("2d", { willReadFrequently: true });
          if (!context || !video.videoWidth) {
            finish(target);
            return;
          }
          const side = Math.min(video.videoWidth, video.videoHeight) * 0.16;
          context.drawImage(
            video,
            video.videoWidth / 2 - side / 2,
            video.videoHeight / 2 - side / 2,
            side,
            side,
            0,
            0,
            32,
            32
          );
          const pixels = context.getImageData(0, 0, 32, 32).data;
          let red = 0;
          let green = 0;
          let blue = 0;
          let count = 0;
          for (let index = 0; index < pixels.length; index += 16) {
            red += pixels[index] ?? 0;
            green += pixels[index + 1] ?? 0;
            blue += pixels[index + 2] ?? 0;
            count += 1;
          }
          const picked = nearestColor(red / count, green / count, blue / count);
          finish(picked.hex);
        });
      } catch {
        stopCamera();
        if (!settled && overlay.isConnected) {
          cameraArea.innerHTML = `<p class="privacy">カメラを つかえませんでした。うえの イラストから えらべるよ。</p>`;
        }
      }
    });
  });
}

class SpiritGardenController implements SceneController {
  readonly scene: BABYLON.Scene;
  private readonly camera: BABYLON.ArcRotateCamera;
  private readonly cat: BABYLON.TransformNode;
  private readonly stage: StageDefinition;
  private readonly context: GameFactoryContext;
  private readonly drops: BABYLON.Mesh[] = [];
  private readonly bonusDrops: BABYLON.Mesh[] = [];
  private collected = 0;
  private bonus = 0;
  private elapsed = 0;
  private ritualRunning = false;
  private disposed = false;
  private sparkle: BABYLON.ParticleSystem;

  constructor(context: GameFactoryContext, stage: StageDefinition) {
    this.context = context;
    this.stage = stage;
    this.scene = new BABYLON.Scene(context.engine);
    this.scene.clearColor = color3(stage.palette[2]).scale(0.34).toColor4(1);
    this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    this.scene.fogDensity = 0.013;
    this.scene.fogColor = color3(stage.palette[2]).scale(0.5);

    const sky = BABYLON.MeshBuilder.CreateSphere("まほうのそら", { diameter: 130, segments: 24, sideOrientation: BABYLON.Mesh.BACKSIDE }, this.scene);
    sky.material = pbr(this.scene, "そらのいろ", stage.palette[2], 0.08, 0, 1);
    sky.isPickable = false;

    const hemi = new BABYLON.HemisphericLight("やわらかい光", new BABYLON.Vector3(0.2, 1, -0.3), this.scene);
    hemi.intensity = 0.7;
    hemi.diffuse = color3("#fff8ea");
    hemi.groundColor = color3(stage.palette[1]).scale(0.45);
    const sun = new BABYLON.DirectionalLight("にじの光", new BABYLON.Vector3(-0.4, -1, 0.5), this.scene);
    sun.position.set(14, 24, -18);
    sun.intensity = 0.95;

    this.scene.imageProcessingConfiguration.toneMappingEnabled = true;
    this.scene.imageProcessingConfiguration.toneMappingType =
      BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
    this.scene.imageProcessingConfiguration.exposure = 0.84;
    this.scene.imageProcessingConfiguration.contrast = 1.12;

    this.camera = new BABYLON.ArcRotateCamera(
      "カメラ",
      -Math.PI / 2,
      1.03,
      11,
      new BABYLON.Vector3(0, 1, 5),
      this.scene
    );
    this.camera.lowerRadiusLimit = 8;
    this.camera.upperRadiusLimit = 14;
    this.camera.lowerBetaLimit = 0.62;
    this.camera.upperBetaLimit = 1.35;
    this.camera.fov = 0.82;

    makeGarden(this.scene, stage);
    this.cat = makeCat(this.scene);
    this.cat.position.set(0, 0.08, 7.5);
    this.cat.rotation.y = Math.PI;

    this.sparkle = makeSparkles(this.scene, new BABYLON.Vector3(0, 1.5, 0), stage.palette[0]);
    this.sparkle.start();
    this.createDrops();

    try {
      const pipeline = new BABYLON.DefaultRenderingPipeline(
        "まほうの光",
        true,
        this.scene,
        [this.camera],
        true
      );
      pipeline.fxaaEnabled = true;
      pipeline.bloomEnabled = !context.ui.getSettings().reducedMotion;
      pipeline.bloomThreshold = 0.82;
      pipeline.bloomWeight = 0.2;
      pipeline.bloomKernel = 36;
      pipeline.samples = 1;
    } catch {
      // A basic forward-rendered scene remains fully playable.
    }

    context.ui.setMission(stage.mission);
    context.ui.setCounter("ひかりの しずく", 0, stage.targets);
    context.ui.setHint("しずくに ちかづくと、じどうで あつめられるよ。", true);
    context.ui.say(stage.mission);
  }

  private createDrops(): void {
    const total = this.stage.targets + this.stage.bonusTargets;
    for (let index = 0; index < total; index += 1) {
      const angle = ((index + 1) / (total + 1)) * Math.PI * 2 + this.stage.seed * 0.037;
      const lane = index % 2;
      const radius = 5.2 + lane * 3.3 + ((index * 7 + this.stage.seed) % 3) * 0.45;
      const mesh = BABYLON.MeshBuilder.CreatePolyhedron(
        `しずく-${index}`,
        { type: (index + this.stage.areaIndex) % 5, size: index < this.stage.targets ? 0.48 : 0.36 },
        this.scene
      );
      mesh.position.set(Math.cos(angle) * radius, 0.8 + (index % 3) * 0.28, Math.sin(angle) * radius);
      const isBonus = index >= this.stage.targets;
      mesh.material = pbr(
        this.scene,
        `しずく色-${index}`,
        isBonus ? this.stage.palette[2] : this.stage.palette[0],
        isBonus ? 0.95 : 0.72,
        0.05,
        0.25
      );
      mesh.metadata = { baseY: mesh.position.y, phase: index * 0.73, isBonus };
      if (isBonus) this.bonusDrops.push(mesh);
      else this.drops.push(mesh);
    }
  }

  update(deltaSeconds: number, input: InputState): void {
    if (this.disposed || this.ritualRunning) return;
    this.elapsed += deltaSeconds;
    const forward = new BABYLON.Vector3(
      -Math.cos(this.camera.alpha),
      0,
      -Math.sin(this.camera.alpha)
    ).normalize();
    const right = new BABYLON.Vector3(forward.z, 0, -forward.x);
    const motion = forward.scale(input.moveY).addInPlace(right.scale(input.moveX));
    if (motion.lengthSquared() > 0.01) {
      motion.normalize();
      this.cat.position.addInPlace(motion.scale(deltaSeconds * 5.2));
      this.cat.rotation.y = Math.atan2(motion.x, motion.z);
      const distance = Math.hypot(this.cat.position.x, this.cat.position.z);
      if (distance > 13.5) {
        const scale = 13.5 / distance;
        this.cat.position.x *= scale;
        this.cat.position.z *= scale;
      }
    }

    this.camera.alpha -= input.lookX * 0.025;
    this.camera.beta = BABYLON.Scalar.Clamp(this.camera.beta + input.lookY * 0.018, 0.68, 1.28);
    this.camera.target = BABYLON.Vector3.Lerp(
      this.camera.target,
      this.cat.position.add(new BABYLON.Vector3(0, 1.1, 0)),
      Math.min(1, deltaSeconds * 6)
    );

    const allDrops = [...this.drops, ...this.bonusDrops];
    for (const mesh of allDrops) {
      if (mesh.isDisposed()) continue;
      const metadata = mesh.metadata as { baseY: number; phase: number; isBonus: boolean };
      mesh.rotation.y += deltaSeconds * 1.8;
      mesh.rotation.x += deltaSeconds * 0.7;
      mesh.position.y = metadata.baseY + Math.sin(this.elapsed * 2.3 + metadata.phase) * 0.18;
      if (BABYLON.Vector3.DistanceSquared(mesh.position, this.cat.position) < 2.05) {
        if (metadata.isBonus) {
          this.bonus += 1;
          this.context.ui.toast("めずらしい にじのしずく！", "good");
        } else {
          this.collected += 1;
          this.context.ui.setCounter("ひかりの しずく", this.collected, this.stage.targets);
        }
        this.context.ui.playTone("collect");
        mesh.dispose();
      }
    }

    if (this.collected >= this.stage.targets) {
      const nearAltar = Math.hypot(this.cat.position.x, this.cat.position.z) < 3.4;
      this.context.ui.setHint(
        nearAltar ? "「まほう」を おして、せいれいを よぼう！" : "まんなかの さいだんへ もどろう。",
        true
      );
    }
  }

  primary(pressed: boolean): void {
    if (!pressed || this.ritualRunning) return;
    if (this.collected < this.stage.targets) {
      this.context.ui.toast(`あと ${this.stage.targets - this.collected}こ みつけよう。`, "info");
      return;
    }
    if (Math.hypot(this.cat.position.x, this.cat.position.z) >= 3.4) {
      this.context.ui.toast("まんなかの さいだんへ いこう。", "info");
      return;
    }
    void this.ritual();
  }

  secondary(pressed: boolean): void {
    if (!pressed || this.ritualRunning) return;
    void chooseColor(this.stage.palette[0]).then((picked) => {
      if (!this.disposed && picked) {
        const { color } = picked;
        this.context.ui.toast(`${nearestColor(...rgb(color)).name}を みつけたよ。`, "good");
      }
    });
  }

  private async ritual(): Promise<void> {
    this.ritualRunning = true;
    this.context.ui.setHint("すきな ほうほうで いろを ひとつ みつけよう。", true);
    const picked = await chooseColor(this.stage.palette[0]);
    if (this.disposed) return;
    if (!picked) {
      this.ritualRunning = false;
      this.context.ui.setHint("「まほう」を おすと、いろさがしを もういちど ためせるよ。", true);
      return;
    }
    const learned = await this.context.ui.ask(this.stage.question);
    if (this.disposed) return;
    const spirit = makeSpirit(this.scene, new BABYLON.Vector3(0, 2.2, 0), picked.color, this.stage.seed);
    const birthSparkles = makeSparkles(this.scene, new BABYLON.Vector3(0, 2.3, 0), picked.color);
    birthSparkles.emitRate = 260;
    birthSparkles.start();
    this.context.ui.playTone("magic");
    this.context.ui.say(`${this.stage.title}の せいれいが うまれたよ！`);
    this.context.ui.addCollection(this.stage.id);
    if (this.bonus >= this.stage.bonusTargets) {
      this.context.ui.addCollection(`${this.stage.id}-rare`);
    }

    let time = 0;
    const animation = this.scene.onBeforeRenderObservable.add(() => {
      const delta = this.scene.getEngine().getDeltaTime() / 1000;
      time += delta;
      spirit.position.y = 2.2 + Math.sin(time * 3) * 0.24;
      spirit.rotation.y += delta * 1.5;
      spirit.scaling.setAll(Math.min(1, time / 0.9));
      if (time > 1.8) {
        this.scene.onBeforeRenderObservable.remove(animation);
        birthSparkles.stop();
        const stars = (this.bonus >= this.stage.bonusTargets && picked.matched ? 3 : this.bonus > 0 || picked.matched ? 2 : 1) as 1 | 2 | 3;
        this.context.ui.complete({
          stars,
          score: Math.max(100, 1400 - Math.round(this.elapsed * 8)) + this.bonus * 200,
          collected: this.collected + this.bonus,
          bonus: this.bonus >= this.stage.bonusTargets,
          message: learned ? "せいれいと なかよく なれたよ！" : "いっしょに こたえを みつけたよ！"
        });
      }
    });
  }

  pause(): void {
    this.scene.animationGroups.forEach((group) => group.pause());
  }

  resume(): void {
    this.scene.animationGroups.forEach((group) => group.play(group.loopAnimation));
  }

  dispose(): void {
    this.disposed = true;
    this.sparkle.dispose();
    this.scene.dispose();
  }
}

const createSpiritGarden: GameFactory = (context, stage) =>
  new SpiritGardenController(context, stage);

void bootstrapGame(definition, createSpiritGarden);
