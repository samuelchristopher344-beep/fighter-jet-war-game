// src/game/sim.ts
import * as THREE4 from "three";

// src/game/jet.ts
import * as THREE from "three";
var skinMap = null;
function useSkin(map) {
  skinMap = map;
}
function paintMaterial(color, mapped = true) {
  return new THREE.MeshPhysicalMaterial({
    color,
    map: mapped ? skinMap : null,
    metalness: mapped ? 0.78 : 0.45,
    roughness: mapped ? 0.34 : 0.55,
    clearcoat: mapped ? 0.55 : 0,
    clearcoatRoughness: 0.28,
    side: THREE.DoubleSide
  });
}
function tailMark(text, ink) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.clearRect(0, 0, 256, 128);
  ctx.fillStyle = ink;
  ctx.font = "700 92px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 68);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(48, 28);
  ctx.lineTo(128, 8);
  ctx.lineTo(208, 28);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
function wing(sign, material) {
  const s = sign;
  const top = 0.08;
  const bot = -0.06;
  const p = [
    [0.4 * s, top, 1.7],
    [7.15 * s, 0, -0.15],
    [6.25 * s, -0.02, -2.75],
    [0.5 * s, top - 0.02, -1.45],
    [0.4 * s, bot, 1.7],
    [7.15 * s, bot - 0.05, -0.15],
    [6.25 * s, bot - 0.06, -2.75],
    [0.5 * s, bot, -1.45]
  ];
  const v = [];
  const push = (a, b, c) => {
    v.push(...p[a], ...p[b], ...p[c]);
  };
  if (s > 0) {
    push(0, 1, 2);
    push(0, 2, 3);
    push(4, 6, 5);
    push(4, 7, 6);
  } else {
    push(0, 2, 1);
    push(0, 3, 2);
    push(4, 5, 6);
    push(4, 6, 7);
  }
  push(0, 3, 7);
  push(0, 7, 4);
  push(1, 5, 6);
  push(1, 6, 2);
  push(0, 4, 5);
  push(0, 5, 1);
  push(3, 2, 6);
  push(3, 6, 7);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  geo.computeVertexNormals();
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) * 0.07 + 0.5;
    uv[i * 2 + 1] = pos.getZ(i) * 0.05 + 0.5;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return new THREE.Mesh(geo, material);
}
function makeScreen(w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex })
  );
  mesh.rotation.y = Math.PI;
  return { canvas, ctx, tex, mesh };
}
function createJet(kind, number) {
  const root = new THREE.Group();
  const exterior = new THREE.Group();
  root.add(exterior);
  const paint = paintMaterial(kind === "own" ? 16777215 : 14996166);
  const dark = paintMaterial(10134445);
  const hot = new THREE.MeshStandardMaterial({
    color: 2761762,
    metalness: 0.8,
    roughness: 0.4
  });
  const profile = [
    new THREE.Vector2(0.01, 9.15),
    new THREE.Vector2(0.16, 8.2),
    new THREE.Vector2(0.38, 6.4),
    new THREE.Vector2(0.58, 4.2),
    new THREE.Vector2(0.72, 1.2),
    new THREE.Vector2(0.78, -2.2),
    new THREE.Vector2(0.7, -5.4),
    new THREE.Vector2(0.48, -7.6),
    new THREE.Vector2(0.22, -8.7),
    new THREE.Vector2(0.05, -9.15)
  ];
  const fuse = new THREE.LatheGeometry(profile, 40);
  fuse.rotateX(Math.PI / 2);
  exterior.add(new THREE.Mesh(fuse, paint));
  exterior.add(wing(1, paint));
  exterior.add(wing(-1, paint));
  const glass = new THREE.MeshStandardMaterial({
    color: 10474734,
    metalness: 0.85,
    roughness: 0.08,
    transparent: true,
    opacity: 0.38,
    side: THREE.DoubleSide
  });
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.55, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), glass);
  canopy.scale.set(0.82, 0.62, 1.55);
  canopy.position.set(0, 0.62, 3.55);
  exterior.add(canopy);
  for (const side of [-1, 1]) {
    const intake = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 3.1), dark);
    intake.position.set(0.95 * side, -0.08, 0.9);
    exterior.add(intake);
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 1.15, 14), hot);
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(0.58 * side, 0.02, -8.35);
    exterior.add(nozzle);
    const stab = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.08, 1.25), paint);
    stab.position.set(1.95 * side, 0.18, -7.25);
    stab.rotation.y = -0.4 * side;
    stab.rotation.z = -0.04 * side;
    exterior.add(stab);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.45, 2.15), paint);
    tail.position.set(0.92 * side, 1.5, -6.45);
    tail.rotation.z = -0.14 * side;
    tail.rotation.y = 0.2 * side;
    exterior.add(tail);
    const decal = new THREE.Mesh(
      new THREE.PlaneGeometry(0.95, 0.48),
      new THREE.MeshBasicMaterial({
        map: tailMark(number, kind === "own" ? "#d5dbe3" : "#e8d0b0"),
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    decal.position.set(0.99 * side, 1.55, -6.35);
    decal.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    exterior.add(decal);
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 8), dark);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(3.1 * side, -0.18, -0.7);
    exterior.add(rail);
    const missile = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 1.5, 3, 6), paintMaterial(12962254));
    missile.rotation.z = Math.PI / 2;
    missile.position.set(3.1 * side, -0.38, -0.55);
    exterior.add(missile);
  }
  const glows = [];
  const flames = [];
  for (const side of [-1, 1]) {
    const mat = new THREE.MeshBasicMaterial({ color: 16738858 });
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.32, 16), mat);
    glow.position.set(0.58 * side, 0.02, -8.94);
    glow.rotation.y = Math.PI;
    exterior.add(glow);
    glows.push(mat);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 16734744,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.34, 3.1, 12, 1, true), outerMat);
    outer.rotation.x = -Math.PI / 2;
    outer.position.set(0.58 * side, 0.02, -10.5);
    outer.visible = false;
    exterior.add(outer);
    flames.push(outer);
    const core = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 2.1, 8, 1, true),
      new THREE.MeshBasicMaterial({
        color: 16774084,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      })
    );
    core.rotation.x = -Math.PI / 2;
    core.position.set(0.58 * side, 0.02, -9.9);
    core.visible = false;
    core.userData.core = true;
    exterior.add(core);
    flames.push(core);
  }
  const pitot = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.1, 6), dark);
  pitot.rotation.x = Math.PI / 2;
  pitot.position.set(0, 0.02, 9.5);
  exterior.add(pitot);
  let cockpit = null;
  let stick2 = null;
  const screens = [];
  if (kind === "own") {
    cockpit = new THREE.Group();
    cockpit.visible = false;
    root.add(cockpit);
    const frame = paintMaterial(1316894, false);
    const consoleMat = paintMaterial(2238513, false);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 2.2), frame);
    floor.position.set(0, -0.02, 2.5);
    cockpit.add(floor);
    const dash = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.42, 0.72), consoleMat);
    dash.position.set(0, 0.28, 3.55);
    dash.rotation.x = -0.35;
    cockpit.add(dash);
    const glare = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.06, 0.28), frame);
    glare.position.set(0, 0.58, 3.15);
    cockpit.add(glare);
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.55, 0.05), frame);
      rail.position.set(0.78 * side, 0.85, 3.05);
      cockpit.add(rail);
      const bow = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 1.1), frame);
      bow.position.set(0.62 * side, 1.05, 3.7);
      bow.rotation.x = -0.5;
      cockpit.add(bow);
      const sideConsole = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.9), consoleMat);
      sideConsole.position.set(0.72 * side, 0.18, 2.7);
      cockpit.add(sideConsole);
    }
    const arch = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.05, 0.05), frame);
    arch.position.set(0, 1.22, 4.15);
    cockpit.add(arch);
    const layout = [
      [-0.46, 0.36, 3.72, 0.42, 0.34],
      [0.02, 0.4, 3.78, 0.5, 0.4],
      [0.5, 0.36, 3.72, 0.42, 0.34],
      [0.02, 0.14, 3.42, 0.7, 0.22]
    ];
    for (const [x, y, z, w, h] of layout) {
      const screen = makeScreen(w, h);
      screen.mesh.position.set(x, y, z);
      cockpit.add(screen.mesh);
      const bezel = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, h + 0.04, 0.03), frame);
      bezel.position.set(x, y, z + 0.02);
      cockpit.add(bezel);
      screens.push(screen);
    }
    stick2 = new THREE.Group();
    stick2.position.set(0, 0.12, 2.55);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.42, 8), frame);
    shaft.position.y = 0.16;
    stick2.add(shaft);
    const grip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), paintMaterial(2764856, false));
    grip.position.y = 0.38;
    stick2.add(grip);
    cockpit.add(stick2);
  }
  exterior.traverse((obj) => {
    const mesh = obj;
    if (mesh.isMesh) mesh.castShadow = true;
  });
  return { root, exterior, cockpit, glows, flames, stick: stick2, screens };
}

// src/game/world.ts
import * as THREE2 from "three";
function hash(ix, iz) {
  const s = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise(x, z) {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const fx = x - x0;
  const fz = z - z0;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = hash(x0, z0);
  const b = hash(x0 + 1, z0);
  const c = hash(x0, z0 + 1);
  const d = hash(x0 + 1, z0 + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}
function fbm(x, z) {
  let amp = 1;
  let freq = 32e-5;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < 5; i++) {
    sum += noise(x * freq, z * freq) * amp;
    norm += amp;
    freq *= 2.13;
    amp *= 0.5;
  }
  return sum / norm;
}
function terrainHeight(x, z) {
  const riverX = Math.sin(z * 35e-5) * 1600;
  const river = Math.exp(-(((x - riverX) / 340) ** 2));
  const ridge = fbm(x, z);
  let h = ridge * 980 + fbm(x + 4e3, z - 2e3) * 220 - river * 820;
  if (h < 40) h = 40 - (40 - h) * 0.05;
  return h;
}
function createWorld(scene, look) {
  scene.background = new THREE2.Color(9357551);
  scene.fog = new THREE2.Fog(12966122, 9e3, 17e3);
  const hemi = new THREE2.HemisphereLight(15201279, 6969925, 0.85);
  scene.add(hemi);
  const sun = new THREE2.DirectionalLight(16774888, 2.6);
  sun.position.set(-80, 120, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 280;
  sun.shadow.camera.left = -70;
  sun.shadow.camera.right = 70;
  sun.shadow.camera.top = 70;
  sun.shadow.camera.bottom = -70;
  sun.shadow.bias = -4e-4;
  scene.add(sun);
  scene.add(sun.target);
  let sky = null;
  if (look?.sky) {
    sky = new THREE2.Mesh(
      new THREE2.SphereGeometry(14e3, 48, 32),
      new THREE2.MeshBasicMaterial({ map: look.sky, side: THREE2.BackSide, depthWrite: false })
    );
    sky.frustumCulled = false;
    scene.add(sky);
  }
  const geo = new THREE2.PlaneGeometry(18e3, 18e3, 160, 160);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const color = new THREE2.Color();
  const tint = new THREE2.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = terrainHeight(x, z);
    pos.setY(i, h);
    if (h < 48) tint.set(9425130);
    else if (h < 180) tint.set(16777215);
    else if (h < 520) tint.set(15921382);
    else if (h < 760) tint.set(15196890);
    else tint.set(16777215);
    color.copy(tint);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geo.setAttribute("color", new THREE2.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const terrain = new THREE2.Mesh(
    geo,
    new THREE2.MeshStandardMaterial({
      map: look?.ground ?? null,
      vertexColors: true,
      roughness: 0.86,
      metalness: 0.02
    })
  );
  terrain.receiveShadow = true;
  terrain.matrixAutoUpdate = false;
  terrain.updateMatrix();
  scene.add(terrain);
  const water = new THREE2.Mesh(
    new THREE2.PlaneGeometry(18e3, 18e3),
    new THREE2.MeshPhysicalMaterial({
      color: 1603752,
      metalness: 0.55,
      roughness: 0.06,
      transparent: true,
      opacity: 0.9
    })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = 42;
  scene.add(water);
  const puff = document.createElement("canvas");
  puff.width = 256;
  puff.height = 256;
  const pg = puff.getContext("2d");
  if (pg) {
    for (let i = 0; i < 7; i++) {
      const x = 64 + i * 41 % 130;
      const y = 78 + i * 29 % 90;
      const r = 46 + i % 3 * 16;
      const grd = pg.createRadialGradient(x, y, 2, x, y, r);
      grd.addColorStop(0, "rgba(255,255,255,0.92)");
      grd.addColorStop(1, "rgba(255,255,255,0)");
      pg.fillStyle = grd;
      pg.beginPath();
      pg.arc(x, y, r, 0, Math.PI * 2);
      pg.fill();
    }
  }
  const puffTex = new THREE2.CanvasTexture(puff);
  puffTex.colorSpace = THREE2.SRGBColorSpace;
  const cloudMat = new THREE2.SpriteMaterial({
    map: puffTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.78
  });
  const clouds = new THREE2.Group();
  for (let i = 0; i < 40; i++) {
    const s = new THREE2.Sprite(cloudMat);
    const ang = Math.random() * Math.PI * 2;
    const rad = 500 + Math.random() * 6800;
    const sc = 320 + Math.random() * 720;
    s.position.set(Math.cos(ang) * rad, 1500 + Math.random() * 2e3, Math.sin(ang) * rad);
    s.scale.set(sc, sc * 0.58, 1);
    clouds.add(s);
  }
  scene.add(clouds);
  const sunGlow = document.createElement("canvas");
  sunGlow.width = 128;
  sunGlow.height = 128;
  const sg = sunGlow.getContext("2d");
  if (sg) {
    const g = sg.createRadialGradient(64, 64, 4, 64, 64, 64);
    g.addColorStop(0, "rgba(255,252,235,1)");
    g.addColorStop(0.2, "rgba(255,214,120,0.85)");
    g.addColorStop(1, "rgba(255,160,40,0)");
    sg.fillStyle = g;
    sg.fillRect(0, 0, 128, 128);
  }
  const sunTex = new THREE2.CanvasTexture(sunGlow);
  sunTex.colorSpace = THREE2.SRGBColorSpace;
  const sunDisk = new THREE2.Sprite(
    new THREE2.SpriteMaterial({
      map: sunTex,
      transparent: true,
      depthWrite: false,
      blending: THREE2.AdditiveBlending
    })
  );
  sunDisk.scale.set(1400, 1400, 1);
  scene.add(sunDisk);
  return { terrain, clouds, sky, sun, sunDisk };
}

// src/game/look.ts
import * as THREE3 from "three";
function prep(url, repeatX, repeatY, wrap) {
  const tex = new THREE3.TextureLoader().load(url);
  tex.colorSpace = THREE3.SRGBColorSpace;
  tex.wrapS = wrap;
  tex.wrapT = wrap;
  tex.anisotropy = 16;
  tex.repeat.set(repeatX, repeatY);
  return tex;
}
function loadLook() {
  return {
    panel: prep("/textures/panel.jpg", 4, 2, THREE3.RepeatWrapping),
    ground: prep("/textures/ground.jpg", 32, 32, THREE3.RepeatWrapping),
    sky: prep("/textures/sky.jpg", 1, 1, THREE3.ClampToEdgeWrapping)
  };
}

// src/game/hud.ts
var GREEN = "#b6f5a2";
var DIM = "rgba(182,245,162,0.62)";
var RED = "#ff5c48";
function commas(n) {
  return Math.round(n).toLocaleString("en-US");
}
function pad(n, width = 3) {
  const v = (Math.round(n) % 360 + 360) % 360;
  return String(v).padStart(width, "0");
}
function clock(t) {
  const s = Math.max(0, Math.floor(t));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor(s / 60) % 60;
  const ss = s % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
function tape(ctx, x, y, heading, width) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - width / 2, y - 18, width, 36);
  ctx.clip();
  ctx.strokeStyle = GREEN;
  ctx.fillStyle = GREEN;
  ctx.lineWidth = 1.25;
  const pxPerDeg = 4.2;
  for (let d = -60; d <= 60; d += 5) {
    const hd = heading + d;
    const px = x + d * pxPerDeg;
    const major = Math.round(hd) % 10 === 0;
    ctx.beginPath();
    ctx.moveTo(px, y + 8);
    ctx.lineTo(px, y + (major ? 16 : 12));
    ctx.stroke();
    if (major) {
      ctx.font = "600 12px 'Share Tech Mono', ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText(pad(hd), px, y + 4);
    }
  }
  ctx.restore();
  ctx.strokeStyle = GREEN;
  ctx.beginPath();
  ctx.moveTo(x, y + 18);
  ctx.lineTo(x - 6, y + 26);
  ctx.lineTo(x + 6, y + 26);
  ctx.closePath();
  ctx.stroke();
}
function reticle(ctx, x, y, locked) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = locked ? RED : GREEN;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, 54, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(0, 0, 28, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  for (const a of [0, 90, 180, 270]) {
    const r = a * Math.PI / 180;
    ctx.beginPath();
    ctx.moveTo(Math.cos(r) * 46, Math.sin(r) * 46);
    ctx.lineTo(Math.cos(r) * 64, Math.sin(r) * 64);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.lineTo(-4, 0);
  ctx.moveTo(4, 0);
  ctx.lineTo(10, 0);
  ctx.moveTo(0, -10);
  ctx.lineTo(0, -4);
  ctx.moveTo(0, 4);
  ctx.lineTo(0, 10);
  ctx.stroke();
  ctx.restore();
}
function ladder(ctx, cx, cy, pitch, horizonAngle) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(horizonAngle);
  ctx.strokeStyle = GREEN;
  ctx.fillStyle = GREEN;
  ctx.lineWidth = 1.25;
  ctx.font = "600 11px 'Share Tech Mono', ui-monospace, monospace";
  ctx.textAlign = "left";
  const noseUp = -pitch;
  const px = 280;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.moveTo(-220, noseUp * px);
  ctx.lineTo(220, noseUp * px);
  ctx.stroke();
  for (let deg = -40; deg <= 40; deg += 10) {
    if (deg === 0) continue;
    const y = (noseUp - deg * Math.PI / 180) * px;
    if (Math.abs(y) > 220) continue;
    const w = Math.abs(deg) % 20 === 0 ? 64 : 28;
    ctx.beginPath();
    ctx.moveTo(-w, y);
    ctx.lineTo(w, y);
    ctx.stroke();
    if (Math.abs(deg) % 20 === 0) ctx.fillText(String(Math.abs(deg)), w + 6, y + 4);
  }
  ctx.restore();
}
function rwr(ctx, x, y, blips) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = GREEN;
  ctx.fillStyle = GREEN;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, 46, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = "600 11px 'Share Tech Mono', ui-monospace, monospace";
  ctx.textAlign = "left";
  ctx.fillText("RWR", -46, -54);
  for (const b of blips) {
    const r = Math.min(40, b.dist / 8e3 * 40);
    const px = Math.sin(b.bearing) * r;
    const py = -Math.cos(b.bearing) * r;
    ctx.fillStyle = b.locked ? RED : GREEN;
    ctx.fillRect(px - 2.5, py - 2.5, 5, 5);
  }
  ctx.restore();
}
function drawHud(ctx, w, h, m) {
  ctx.clearRect(0, 0, w, h);
  if (m.hit > 0.05) {
    const g = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.6);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, `rgba(140, 24, 16, ${Math.min(0.45, m.hit)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  if (m.g > 3.1) {
    const a = Math.min(0.5, (m.g - 3.1) * 0.16);
    const vg = ctx.createRadialGradient(w / 2, h / 2, w * 0.22, w / 2, h / 2, w * 0.62);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, `rgba(0,0,0,${a})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }
  const cockpit = m.mode === "cockpit";
  const cx = w / 2;
  const cy = cockpit ? h * 0.36 : h * 0.46;
  const horizon = cockpit ? -m.roll : 0;
  ctx.fillStyle = GREEN;
  ctx.strokeStyle = GREEN;
  ctx.font = "600 15px 'Share Tech Mono', ui-monospace, monospace";
  ctx.textAlign = "left";
  if (cockpit) {
    ctx.fillText(m.g.toFixed(1), 28, 36);
    ctx.font = "600 28px 'Share Tech Mono', ui-monospace, monospace";
    ctx.fillText(String(Math.round(m.spdKt)), 28, 68);
    ctx.font = "600 14px 'Share Tech Mono', ui-monospace, monospace";
    ctx.fillText(`AOA ${m.aoa >= 0 ? "+" : ""}${m.aoa.toFixed(1)}`, 28, 92);
    ctx.textAlign = "center";
    ctx.font = "600 20px 'Share Tech Mono', ui-monospace, monospace";
    ctx.fillText(`${commas(m.altFt)} FT`, cx, 34);
    ctx.font = "600 14px 'Share Tech Mono', ui-monospace, monospace";
    ctx.fillText(`M ${m.mach.toFixed(2)}`, cx, 54);
    ctx.textAlign = "right";
    ctx.fillText(m.vs >= 0 ? `+${Math.round(m.vs)}` : String(Math.round(m.vs)), w - 28, 40);
    tape(ctx, cx, cy + 150, m.heading, Math.min(420, w * 0.55));
  } else {
    ctx.fillText(`ALT  ${commas(m.altFt)} FT`, 24, 36);
    ctx.fillText(`SPD  ${Math.round(m.spdKt)} KT`, 24, 58);
    ctx.textAlign = "right";
    ctx.fillText(`TIME  ${clock(m.time)}`, w - 24, 36);
    ctx.fillText(`SCORE ${commas(m.score)}`, w - 24, 58);
    ctx.textAlign = "center";
    ctx.fillText(`M ${m.mach.toFixed(2)}`, cx, 78);
    tape(ctx, cx, 36, m.heading, Math.min(460, w * 0.46));
    ctx.textAlign = "left";
    ctx.font = "600 14px 'Share Tech Mono', ui-monospace, monospace";
    const lines = [
      `GUN  ${m.gun}`,
      `MSL  ${m.msl}`,
      `FLR  ${m.flares}`,
      "A/A",
      `AOA ${m.aoa >= 0 ? "+" : ""}${m.aoa.toFixed(1)}`
    ];
    lines.forEach((line, i) => ctx.fillText(line, 24, h * 0.34 + i * 22));
    ctx.fillStyle = DIM;
    ctx.fillText(`FUEL ${commas(m.fuel)} LB`, 24, h - 56);
    ctx.fillText(`OIL 92   TEMP ${Math.round(m.temp)}`, 24, h - 34);
    ctx.fillStyle = GREEN;
    ctx.textAlign = "center";
    ctx.fillText(`WPT ${m.wave}    ${Math.round(m.hp)} HP`, cx, h - 34);
    rwr(ctx, w - 78, h - 92, m.blips);
  }
  ladder(ctx, cx, cy, m.pitch, horizon);
  const locked = m.blips.find((b) => b.locked) ?? null;
  reticle(ctx, cx, cy, Boolean(locked));
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-m.roll);
  ctx.strokeStyle = GREEN;
  ctx.beginPath();
  ctx.arc(0, 0, 78, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
  ctx.rotate(m.roll);
  ctx.beginPath();
  ctx.moveTo(0, -86);
  ctx.lineTo(-5, -76);
  ctx.lineTo(5, -76);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
  if (m.lockSeal > 0.04) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = m.lockSeal > 0.82 ? RED : GREEN;
    ctx.lineWidth = 1.7;
    const gap = (1 - m.lockSeal) * Math.PI;
    ctx.beginPath();
    ctx.arc(0, 0, 68, gap, Math.PI * 2 - gap);
    ctx.stroke();
    ctx.restore();
  }
  if (m.piperOn) {
    ctx.save();
    ctx.translate(m.piperX, m.piperY);
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.moveTo(-14, 0);
    ctx.lineTo(-5, 0);
    ctx.moveTo(5, 0);
    ctx.lineTo(14, 0);
    ctx.moveTo(0, -14);
    ctx.lineTo(0, -5);
    ctx.moveTo(0, 5);
    ctx.lineTo(0, 14);
    ctx.stroke();
    ctx.restore();
  }
  if (m.mark > 0) {
    ctx.strokeStyle = "#f4fff0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 9, cy - 9);
    ctx.lineTo(cx + 9, cy + 9);
    ctx.moveTo(cx + 9, cy - 9);
    ctx.lineTo(cx - 9, cy + 9);
    ctx.stroke();
  }
  if (m.hit > 0.25) {
    ctx.strokeStyle = `rgba(255, 70, 48, ${Math.min(1, m.hit)})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    const ang = m.hitBrg - Math.PI / 2;
    ctx.arc(cx, cy, Math.min(w, h) * 0.28, ang - 0.35, ang + 0.35);
    ctx.stroke();
  }
  if (locked) {
    ctx.strokeStyle = RED;
    ctx.fillStyle = RED;
    ctx.lineWidth = 1.5;
    ctx.font = "600 13px 'Share Tech Mono', ui-monospace, monospace";
    if (locked.ahead && locked.sx > 40 && locked.sx < w - 40 && locked.sy > 40 && locked.sy < h - 40) {
      ctx.strokeRect(locked.sx - 18, locked.sy - 18, 36, 36);
      ctx.textAlign = "left";
      ctx.fillText(`${(locked.dist / 1852).toFixed(1)}`, locked.sx + 22, locked.sy - 6);
    }
    const brg = locked.bearing * 180 / Math.PI;
    const side = brg >= 0 ? "R" : "L";
    ctx.textAlign = cockpit ? "center" : "left";
    const tx = cockpit ? cx : w - 210;
    const ty = cockpit ? cy + 78 : h * 0.32;
    ctx.fillText("TGT", tx, ty);
    ctx.fillText(`${Math.abs(brg).toFixed(0)}${side}`, tx, ty + 18);
    ctx.fillText(`${(locked.dist / 1852).toFixed(1)} NM`, tx, ty + 36);
  }
  ctx.textAlign = "center";
  ctx.fillStyle = m.stall || m.fuel < 900 ? RED : GREEN;
  ctx.font = "600 16px 'Share Tech Mono', ui-monospace, monospace";
  if (m.stall) ctx.fillText("SLOW", cx, cy - 92);
  if (m.fuel < 900) ctx.fillText("BINGO", cx, cockpit ? 78 : h * 0.2);
  if (m.incoming) {
    ctx.fillStyle = RED;
    ctx.strokeStyle = RED;
    ctx.font = "700 28px 'Share Tech Mono', ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText("MISSILE", cx, cockpit ? h * 0.16 : 118);
    const ax = cx + Math.sin(m.incomingBrg) * Math.min(w, h) * 0.3;
    const ay = cy - Math.cos(m.incomingBrg) * Math.min(w, h) * 0.22;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ax, ay, 11, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax + Math.sin(m.incomingBrg) * 16, ay - Math.cos(m.incomingBrg) * 16);
    ctx.stroke();
  }
  if (m.burn) {
    ctx.fillStyle = GREEN;
    ctx.fillText("AB", cx, cockpit ? cy - 108 : cy + 92);
  }
  if (m.banner) {
    ctx.fillStyle = GREEN;
    ctx.font = "600 22px 'Share Tech Mono', ui-monospace, monospace";
    ctx.fillText(m.banner, cx, cockpit ? h * 0.22 : h * 0.18);
  }
  ctx.textAlign = "right";
  ctx.fillStyle = DIM;
  ctx.font = "600 12px 'Share Tech Mono', ui-monospace, monospace";
  ctx.fillText(cockpit ? "COCKPIT" : m.mode === "far" ? "TAIL" : "CHASE", w - 24, cockpit ? h * 0.2 : 80);
}
function paintMfds(screens, m, now) {
  if (screens.length < 4) return;
  paintRadar(screens[0], m, now);
  paintMap(screens[1], m, false);
  paintMap(screens[2], m, true);
  paintEngines(screens[3], m);
  for (const s of screens) s.tex.needsUpdate = true;
}
function paintRadar(screen, m, now) {
  const { ctx, canvas } = screen;
  const w = canvas.width;
  const c = w / 2;
  ctx.fillStyle = "#04140c";
  ctx.fillRect(0, 0, w, w);
  ctx.strokeStyle = "#1f8f3a";
  ctx.fillStyle = "#9dff74";
  ctx.lineWidth = 2;
  ctx.font = "600 16px sans-serif";
  ctx.fillText("A/A", 12, 22);
  ctx.fillText("NORM", w - 62, 22);
  for (const r of [40, 75, 110]) {
    ctx.beginPath();
    ctx.arc(c, c + 10, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  const sweep = now * 1.4 % (Math.PI * 2);
  ctx.strokeStyle = "#b6ff8a";
  ctx.beginPath();
  ctx.moveTo(c, c + 10);
  ctx.lineTo(c + Math.sin(sweep) * 110, c + 10 - Math.cos(sweep) * 110);
  ctx.stroke();
  for (const b of m.blips) {
    const rr = Math.min(110, b.dist / 9e3 * 110);
    const x = c + Math.sin(b.bearing) * rr;
    const y = c + 10 - Math.cos(b.bearing) * rr;
    ctx.fillStyle = b.locked ? "#ff5c48" : "#d6ff4a";
    ctx.beginPath();
    ctx.arc(x, y, b.locked ? 5 : 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#9dff74";
  ctx.font = "600 14px sans-serif";
  ctx.fillText("25 NM", 12, w - 14);
}
function paintMap(screen, m, wide) {
  const { ctx, canvas } = screen;
  const w = canvas.width;
  ctx.fillStyle = "#102033";
  ctx.fillRect(0, 0, w, w);
  const span = wide ? 14e3 : 6e3;
  const step = 8;
  for (let y = 0; y < w; y += step) {
    for (let x = 0; x < w; x += step) {
      const wx = m.px + (x - w / 2) / w * span;
      const wz = m.pz + (w / 2 - y) / w * span;
      const h = ((Math.sin(wx * 4e-4) + Math.cos(wz * 35e-5)) * 0.5 + 1) / 2;
      const river = Math.exp(-(((wx - Math.sin(wz * 35e-5) * 1600) / 500) ** 2));
      if (river > 0.4) ctx.fillStyle = "#1a6286";
      else if (h > 0.72) ctx.fillStyle = "#8d867c";
      else ctx.fillStyle = h > 0.45 ? "#5e6b40" : "#3d5a32";
      ctx.fillRect(x, y, step, step);
    }
  }
  ctx.save();
  ctx.translate(w / 2, w / 2);
  ctx.rotate(-m.meshYaw);
  ctx.fillStyle = "#d6ff4a";
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(5, 7);
  ctx.lineTo(-5, 7);
  ctx.closePath();
  ctx.fill();
  for (const b of m.blips) {
    const dx = Math.sin(b.bearing) * b.dist;
    const dz = Math.cos(b.bearing) * b.dist;
    const x = dx / span * w;
    const y = -(dz / span) * w;
    ctx.fillStyle = "#ff5c48";
    ctx.fillRect(x - 2, y - 2, 4, 4);
  }
  ctx.restore();
  ctx.fillStyle = "#d5ffe0";
  ctx.font = "600 15px sans-serif";
  ctx.fillText(wide ? "TAC" : "NAV", 10, 20);
  ctx.fillText(wide ? "NORM" : "15 NM", w - (wide ? 58 : 62), 20);
}
function paintEngines(screen, m) {
  const { ctx, canvas } = screen;
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = "#06140c";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#9dff74";
  ctx.font = "600 15px sans-serif";
  const rows = [
    `FUEL  ${commas(m.fuel)}`,
    `OIL   105   105`,
    `RPM   ${Math.round(m.rpm)}   ${Math.round(m.rpm)}`,
    `TEMP  ${Math.round(m.temp)}   ${Math.round(m.temp)}`,
    `HYD   2800  2800`
  ];
  rows.forEach((row, i) => ctx.fillText(row, 12, 28 + i * 22));
  ctx.strokeStyle = "#1f8f3a";
  ctx.lineWidth = 3;
  for (const [x, label] of [
    [w * 0.72, "N1"],
    [w * 0.9, "N2"]
  ]) {
    ctx.beginPath();
    ctx.arc(x, h * 0.72, 28, 0, Math.PI * 2);
    ctx.stroke();
    const a = -Math.PI / 2 + m.rpm / 110 * Math.PI * 1.4;
    ctx.beginPath();
    ctx.moveTo(x, h * 0.72);
    ctx.lineTo(x + Math.cos(a) * 22, h * 0.72 + Math.sin(a) * 22);
    ctx.stroke();
    ctx.fillText(label, x - 10, h * 0.72 + 44);
  }
}

// src/game/sim.ts
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
var BEST_KEY = "sky-vanguard-best";
var _fwd = new THREE4.Vector3();
var _up = new THREE4.Vector3();
var _to = new THREE4.Vector3();
var _cam = new THREE4.Vector3();
var _look = new THREE4.Vector3();
var _ndc = new THREE4.Vector3();
function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}
function angNorm(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}
function mountSkyVanguard(host2, hooks) {
  const renderer = new THREE4.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE4.SRGBColorSpace;
  renderer.toneMapping = THREE4.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE4.PCFSoftShadowMap;
  renderer.setClearColor(9357551, 1);
  host2.appendChild(renderer.domElement);
  const hudCanvas = document.createElement("canvas");
  hudCanvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;";
  host2.appendChild(hudCanvas);
  const hud2d = hudCanvas.getContext("2d");
  if (!hud2d) throw new Error("hud");
  const hudCtx = hud2d;
  const scene = new THREE4.Scene();
  const look = loadLook();
  const world = createWorld(scene, look);
  useSkin(look.panel);
  const pmrem = new THREE4.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  const camera = new THREE4.PerspectiveCamera(62, 1, 0.08, 28e3);
  scene.add(camera);
  const player = makeCraft("own", "203", false);
  scene.add(player.rig.root);
  player.rig.root.position.set(0, 3400, 0);
  const bandits = [];
  const shots = [];
  for (let i = 0; i < 48; i++) {
    const mesh = new THREE4.Mesh(
      new THREE4.BoxGeometry(0.12, 0.12, 2.2),
      new THREE4.MeshBasicMaterial({ color: i < 36 ? 16769162 : 16742972 })
    );
    mesh.visible = false;
    scene.add(mesh);
    shots.push({
      active: false,
      pos: new THREE4.Vector3(),
      vel: new THREE4.Vector3(),
      life: 0,
      friendly: i < 36,
      homing: false,
      target: -1,
      mesh
    });
  }
  const boomCanvas = document.createElement("canvas");
  boomCanvas.width = 128;
  boomCanvas.height = 128;
  const boomCtx = boomCanvas.getContext("2d");
  if (boomCtx) {
    const g = boomCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,236,1)");
    g.addColorStop(0.22, "rgba(255,176,48,0.95)");
    g.addColorStop(0.55, "rgba(255,64,12,0.35)");
    g.addColorStop(1, "rgba(20,0,0,0)");
    boomCtx.fillStyle = g;
    boomCtx.fillRect(0, 0, 128, 128);
  }
  const boomMap = new THREE4.CanvasTexture(boomCanvas);
  boomMap.colorSpace = THREE4.SRGBColorSpace;
  const booms = [];
  for (let i = 0; i < 8; i++) {
    const fire2 = new THREE4.Sprite(
      new THREE4.SpriteMaterial({
        map: boomMap,
        transparent: true,
        depthWrite: false,
        blending: THREE4.AdditiveBlending
      })
    );
    fire2.visible = false;
    scene.add(fire2);
    const ring = new THREE4.Mesh(
      new THREE4.RingGeometry(0.82, 1.05, 28),
      new THREE4.MeshBasicMaterial({
        color: 16765600,
        transparent: true,
        opacity: 0.8,
        side: THREE4.DoubleSide,
        depthWrite: false,
        blending: THREE4.AdditiveBlending
      })
    );
    ring.visible = false;
    scene.add(ring);
    booms.push({ fire: fire2, ring, life: 0 });
  }
  const trailCanvas = document.createElement("canvas");
  trailCanvas.width = 64;
  trailCanvas.height = 64;
  const trailCtx = trailCanvas.getContext("2d");
  if (trailCtx) {
    const g = trailCtx.createRadialGradient(32, 32, 1, 32, 32, 30);
    g.addColorStop(0, "rgba(255,255,255,0.75)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    trailCtx.fillStyle = g;
    trailCtx.fillRect(0, 0, 64, 64);
  }
  const trailMap = new THREE4.CanvasTexture(trailCanvas);
  const puffs = [];
  for (let i = 0; i < 110; i++) {
    const s = new THREE4.Sprite(
      new THREE4.SpriteMaterial({ map: trailMap, transparent: true, depthWrite: false, opacity: 0.35 })
    );
    s.visible = false;
    scene.add(s);
    puffs.push({ s, life: 0, max: 1.4, grow: 8 });
  }
  let puffI = 0;
  const keys = /* @__PURE__ */ new Set();
  let qa = null;
  let steerOverride = null;
  let seen = { missile: 0, flare: 0, cam: 0, lock: 0 };
  let mode = "chase";
  let phase = "brief";
  let score2 = 0;
  let best = 0;
  try {
    best = Number(localStorage.getItem(BEST_KEY) || 0) || 0;
  } catch {
    best = 0;
  }
  let wave = 1;
  let banner = "";
  let bannerT = 0;
  let time = 0;
  let hit = 0;
  let fuel = 6800;
  let gun = 560;
  let msl = 6;
  let flares = 30;
  let flareT = 0;
  let gunCd = 0;
  let mslCd = 0;
  let lock = 0;
  let lockSeal = 0;
  let mark = 0;
  let hitBrg = 0;
  let warnT = 0;
  let trailT = 0;
  let banditTrail = 0;
  let shake = 0;
  let mfdT = 0;
  let uiT = 0;
  let audio = null;
  let engineGain = null;
  let engineOsc = null;
  let disposed = false;
  const camLabels = { chase: "CHASE", far: "TAIL", cockpit: "COCKPIT" };
  function held(code) {
    return (qa ?? keys).has(code);
  }
  function publish(force = false) {
    const now = performance.now();
    if (!force && now - uiT < 120) return;
    uiT = now;
    hooks.onChange({
      phase,
      score: score2,
      best,
      wave,
      hp: Math.max(0, player.hp),
      cam: camLabels[mode],
      ready: true
    });
  }
  function orient(craft) {
    craft.rig.root.rotation.order = "YXZ";
    craft.rig.root.rotation.set(craft.pitch, craft.meshYaw, craft.roll);
    craft.rig.root.updateMatrixWorld();
    _fwd.set(0, 0, 1).transformDirection(craft.rig.root.matrixWorld);
  }
  function fly(craft, rollIn, pitchIn, yawIn, burn, dt) {
    craft.roll += rollIn * 1.85 * dt;
    if (Math.abs(rollIn) < 0.08) craft.roll += -craft.roll * 0.4 * dt;
    craft.roll = angNorm(craft.roll);
    craft.meshYaw += -rollIn * 0.72 * dt;
    craft.meshYaw += -Math.sin(craft.roll) * 0.95 * dt * Math.min(1, craft.speed / 110);
    craft.meshYaw += -yawIn * 0.55 * dt;
    craft.pitch += -pitchIn * 0.92 * dt;
    if (Math.abs(pitchIn) < 0.08) craft.pitch += -craft.pitch * 0.45 * dt;
    craft.pitch = clamp(craft.pitch, -1.05, 1.15);
    const cruise = burn && fuel > 0 ? 400 : fuel > 0 || craft.ai ? 255 : 170;
    craft.speed += (cruise - craft.speed) * (burn ? 0.9 : 0.3) * dt;
    orient(craft);
    craft.speed -= _fwd.y * 9.8 * dt;
    craft.speed = clamp(craft.speed, 60, 520);
    craft.rig.root.position.addScaledVector(_fwd, craft.speed * dt);
    const p = craft.rig.root.position;
    const floor = Math.max(48, terrainHeight(p.x, p.z)) + 14;
    if (p.y < floor) {
      p.y = floor;
      craft.pitch = -0.2;
      if (craft.speed > 160) {
        craft.hp -= 50 * dt;
        craft.speed *= 0.98;
        shake = Math.min(1, shake + 0.4);
      }
    }
    if (Math.abs(p.x) > 8200) p.x = Math.sign(p.x) * 8200;
    if (Math.abs(p.z) > 8200) p.z = Math.sign(p.z) * 8200;
  }
  function spawnWave() {
    const n = Math.min(5, 2 + wave);
    while (bandits.length < n) {
      const b = makeCraft("bandit", String(bandits.length + 1).padStart(2, "0"), true);
      scene.add(b.rig.root);
      bandits.push(b);
    }
    const origin = player.rig.root.position;
    for (let i = 0; i < bandits.length; i++) {
      const b = bandits[i];
      b.alive = i < n;
      b.hp = 72;
      b.rig.root.visible = b.alive;
      if (!b.alive) continue;
      const ang = i / n * Math.PI * 2 + 0.4;
      const dist = 1600 + i * 380;
      b.rig.root.position.set(origin.x + Math.sin(ang) * dist, origin.y + (i - 1) * 140, origin.z + Math.cos(ang) * dist);
      b.meshYaw = Math.atan2(origin.x - b.rig.root.position.x, origin.z - b.rig.root.position.z);
      b.pitch = 0;
      b.roll = 0;
      b.speed = 240;
      b.shoot = 1 + i * 0.4;
      b.missile = 4 + i;
    }
    banner = `WAVE ${wave}`;
    bannerT = 2.4;
  }
  function boomAt(p) {
    const b = booms.find((x) => x.life <= 0);
    if (!b) return;
    b.life = 0.85;
    b.fire.visible = true;
    b.fire.position.copy(p);
    b.fire.scale.set(12, 12, 1);
    b.fire.material.opacity = 1;
    b.ring.visible = true;
    b.ring.position.copy(p);
    b.ring.scale.setScalar(6);
    b.ring.material.opacity = 0.85;
    tone(68, 0.24, "sawtooth", 0.06);
  }
  function fire(craft, friendly, homing, target, speed) {
    const any = shots.find((s) => !s.active);
    if (!any) return;
    orient(craft);
    const muzzle = _look.set(0, 0.1, 9).applyMatrix4(craft.rig.root.matrixWorld);
    any.active = true;
    any.friendly = friendly;
    any.homing = homing;
    any.target = target;
    any.life = homing ? 7 : 1.35;
    any.pos.copy(muzzle);
    any.vel.copy(_fwd).multiplyScalar(speed);
    any.mesh.visible = true;
    any.mesh.scale.set(homing ? 1.6 : 1, homing ? 1.6 : 1, homing ? 2.6 : 1);
  }
  function kill(craft) {
    craft.alive = false;
    craft.hp = 0;
    craft.rig.root.visible = false;
    for (const f of craft.rig.flames) f.visible = false;
    boomAt(craft.rig.root.position);
    if (craft.ai) {
      score2 += 300;
      if (bandits.every((b) => !b.alive)) {
        wave += 1;
        score2 += 700;
        spawnWave();
      }
      banner = "SPLASH";
      bannerT = 1.25;
    }
  }
  function endSortie() {
    phase = "down";
    best = Math.max(best, score2);
    try {
      localStorage.setItem(BEST_KEY, String(best));
    } catch {
    }
    banner = "JET DOWN";
    publish(true);
  }
  function resetSortie() {
    player.alive = true;
    player.hp = 100;
    player.speed = 230;
    player.meshYaw = 0;
    player.pitch = 0.02;
    player.roll = 0;
    player.rig.root.visible = true;
    player.rig.root.position.set(0, 3400, 0);
    fuel = 6800;
    gun = 560;
    msl = 6;
    flares = 30;
    score2 = 0;
    wave = 1;
    time = 0;
    hit = 0;
    lock = 0;
    lockSeal = 0;
    mark = 0;
    mode = "chase";
    for (const s of shots) {
      s.active = false;
      s.mesh.visible = false;
    }
    spawnWave();
    phase = "fly";
    publish(true);
  }
  function start2() {
    if (phase === "fly") return;
    ensureAudio();
    if (phase === "down") resetSortie();
    else {
      player.speed = 230;
      player.alive = true;
      phase = "fly";
      spawnWave();
      publish(true);
    }
  }
  hooks.api.current = { start: start2, restart: start2 };
  function ensureAudio() {
    if (audio) {
      if (audio.state === "suspended") void audio.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audio = new Ctx();
    engineGain = audio.createGain();
    engineGain.gain.value = 1e-4;
    engineOsc = audio.createOscillator();
    engineOsc.type = "sawtooth";
    engineOsc.frequency.value = 70;
    const filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 280;
    engineOsc.connect(filter);
    filter.connect(engineGain);
    engineGain.connect(audio.destination);
    engineOsc.start();
    void audio.resume();
  }
  function blipGun() {
    tone(180, 0.05, "square", 0.04);
  }
  function tone(freq, dur, type = "square", gain = 0.04) {
    if (!audio) return;
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(1e-4, audio.currentTime + dur);
    o.connect(g);
    g.connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + dur + 0.02);
  }
  function setBurn(craft, on) {
    const flick = 0.72 + Math.random() * 0.5;
    for (const f of craft.rig.flames) {
      f.visible = on;
      if (!on) continue;
      const core = Boolean(f.userData.core);
      f.scale.set(core ? 0.55 : 1, flick * (core ? 0.75 : 1), 1);
    }
    const hot = on ? 1 : 0.28;
    for (const g of craft.rig.glows) g.color.setRGB(1, 0.2 + hot * 0.55, 0.05);
  }
  function puffAt(pos, grow) {
    const p = puffs[puffI];
    puffI = (puffI + 1) % puffs.length;
    p.life = 1.35;
    p.max = 1.35;
    p.grow = grow;
    p.s.visible = true;
    p.s.position.copy(pos);
    p.s.scale.set(grow, grow * 0.42, 1);
    p.s.material.opacity = 0.36;
  }
  const onDown = (e) => {
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
    keys.add(e.code);
  };
  const onUp = (e) => keys.delete(e.code);
  const onBlur = () => keys.clear();
  window.addEventListener("keydown", onDown);
  window.addEventListener("keyup", onUp);
  window.addEventListener("blur", onBlur);
  window.__controlsTest = {
    getYaw: () => -player.meshYaw,
    getSpeed: () => player.speed,
    getRoll: () => player.roll,
    setKeys: (codes) => {
      qa = codes.length ? new Set(codes) : null;
    },
    setSteer: (v) => {
      steerOverride = v;
    }
  };
  function resize() {
    const w = host2.clientWidth || 1;
    const h = host2.clientHeight || 1;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    hudCanvas.width = Math.floor(w * dpr);
    hudCanvas.height = Math.floor(h * dpr);
    hudCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host2);
  resize();
  const timer = new THREE4.Timer();
  timer.connect(document);
  let lastMfd = 0;
  function frame() {
    if (disposed) return;
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
    const touch2 = hooks.readTouch();
    if (hooks.takePending()) start2();
    if (phase !== "fly") {
      const t = timer.getElapsed();
      orient(player);
      const p = player.rig.root.position;
      _cam.set(p.x + Math.sin(t * 0.18) * 34, p.y + 6.5, p.z + Math.cos(t * 0.18) * 24);
      camera.position.lerp(_cam, 1 - Math.exp(-2 * Math.max(dt, 0.016)));
      camera.up.set(0, 1, 0);
      camera.lookAt(p.x, p.y + 0.4, p.z);
      for (const g of player.rig.glows) g.color.setRGB(1, 0.45, 0.15);
      if (engineGain) engineGain.gain.value = 1e-4;
      dress();
      renderer.render(scene, camera);
      hudCtx.clearRect(0, 0, host2.clientWidth, host2.clientHeight);
      return;
    }
    time += dt;
    bannerT -= dt;
    if (bannerT <= 0) banner = "";
    hit = Math.max(0, hit - dt * 0.8);
    mark = Math.max(0, mark - dt);
    shake *= Math.exp(-3.2 * dt);
    flareT = Math.max(0, flareT - dt);
    gunCd = Math.max(0, gunCd - dt);
    mslCd = Math.max(0, mslCd - dt);
    fuel = Math.max(0, fuel - ((held("ShiftLeft") || held("ShiftRight") || touch2.burn) && fuel > 0 ? 16 : 5.5) * dt);
    let rollIn = (held("KeyA") || held("ArrowLeft") ? 1 : 0) + (held("KeyD") || held("ArrowRight") ? -1 : 0);
    let pitchIn = (held("KeyW") || held("ArrowUp") ? 1 : 0) + (held("KeyS") || held("ArrowDown") ? -1 : 0);
    const yawIn = (held("KeyQ") ? 1 : 0) + (held("KeyE") ? -1 : 0);
    if (qa == null) {
      rollIn = clamp(rollIn + touch2.roll, -1, 1);
      pitchIn = clamp(pitchIn + touch2.pitch, -1, 1);
    }
    if (steerOverride != null) rollIn = clamp(steerOverride, -1, 1);
    const burn = (held("ShiftLeft") || held("ShiftRight") || qa == null && touch2.burn) && fuel > 0;
    if (player.alive) {
      fly(player, rollIn, pitchIn, yawIn, burn, dt);
      setBurn(player, burn);
      if (player.rig.stick) {
        player.rig.stick.rotation.z = -rollIn * 0.45;
        player.rig.stick.rotation.x = -pitchIn * 0.4;
      }
      if (player.hp <= 0) {
        player.alive = false;
        endSortie();
      }
    } else {
      player.roll += dt * 1.4;
      player.pitch = clamp(player.pitch + dt * 0.2, -0.2, 1.1);
      orient(player);
      player.rig.root.position.y -= 30 * dt;
    }
    const pPos = player.rig.root.position;
    _up.set(0, 0, 1).transformDirection(player.rig.root.matrixWorld);
    for (let i = 0; i < bandits.length; i++) {
      const b = bandits[i];
      if (!b.alive) {
        for (const f of b.rig.flames) f.visible = false;
        continue;
      }
      const dist = b.rig.root.position.distanceTo(pPos);
      _to.copy(pPos).addScaledVector(_up, Math.min(480, dist * 0.3)).sub(b.rig.root.position);
      const desired = Math.atan2(_to.x, _to.z);
      const err = angNorm(desired - b.meshYaw);
      const behind = Math.abs(err) > 2.05;
      let rollCmd = clamp(clamp(-err * 1.5, -1.15, 1.15) - b.roll, -1, 1);
      rollCmd = clamp(rollCmd + Math.sin(time * 1.7 + i * 1.3) * 0.2, -1, 1);
      const altErr = pPos.y - b.rig.root.position.y;
      let pitchCmd = clamp(-altErr / 620 - b.pitch, -1, 1);
      let burning = dist > 1500 || b.speed < 210;
      if (behind && dist < 900) {
        rollCmd = i % 2 === 0 ? 1 : -1;
        pitchCmd = -0.3;
        burning = true;
      } else if (dist < 200) {
        pitchCmd = -0.9;
        burning = true;
      }
      fly(b, rollCmd, pitchCmd, 0, burning, dt);
      setBurn(b, burning);
      b.shoot -= dt;
      b.missile -= dt;
      if (b.shoot <= 0 && dist < 1e3 && Math.abs(err) < 0.28) {
        fire(b, false, false, -1, 820);
        b.shoot = 0.16;
      }
      if (b.missile <= 0 && dist > 400 && dist < 2600 && Math.abs(err) < 0.42 && flareT <= 0) {
        fire(b, false, true, -1, 430);
        b.missile = 8;
        tone(520, 0.08, "square", 0.03);
      }
      if (b.hp <= 0) kill(b);
    }
    const wantGun = held("Space") || qa == null && touch2.gun;
    if (player.alive && wantGun && gunCd <= 0 && gun > 0) {
      fire(player, true, false, lock, 980);
      gun -= 1;
      gunCd = 0.075;
      shake = Math.min(0.35, shake + 0.05);
      blipGun();
    }
    const missileEdge = edge("KeyF") || touch2.edges.missile !== seen.missile;
    seen.missile = touch2.edges.missile;
    if (missileEdge && player.alive && mslCd <= 0 && msl > 0 && bandits[lock]?.alive) {
      if (lockSeal < 0.72) {
        banner = "NO LOCK";
        bannerT = 0.55;
      } else {
        fire(player, true, true, lock, 460);
        msl -= 1;
        mslCd = 0.45;
        tone(110, 0.18, "sawtooth", 0.045);
      }
    }
    const flareEdge = edge("KeyV") || touch2.edges.flare !== seen.flare;
    seen.flare = touch2.edges.flare;
    if (flareEdge && flares > 0) {
      flares -= 1;
      flareT = 2.4;
      for (const s of shots) if (s.active && s.homing && !s.friendly) s.homing = false;
    }
    if (edge("KeyC") || touch2.edges.cam !== seen.cam) {
      seen.cam = touch2.edges.cam;
      mode = mode === "chase" ? "far" : mode === "far" ? "cockpit" : "chase";
      const cockpitOn = mode === "cockpit";
      player.rig.exterior.visible = !cockpitOn;
      if (player.rig.cockpit) player.rig.cockpit.visible = cockpitOn;
      publish(true);
    }
    if (edge("KeyR") || touch2.edges.lock !== seen.lock) {
      seen.lock = touch2.edges.lock;
      const alive = bandits.map((b, i) => b.alive ? i : -1).filter((i) => i >= 0);
      if (alive.length) {
        const idx = alive.indexOf(lock);
        lock = alive[(idx + 1) % alive.length];
      }
    } else if (!bandits[lock]?.alive) {
      const next = bandits.findIndex((b) => b.alive);
      if (next >= 0) lock = next;
    }
    for (const s of shots) {
      if (!s.active) continue;
      s.life -= dt;
      if (s.homing) {
        const tgt = s.friendly ? bandits[s.target] : player;
        const ok = s.friendly ? Boolean(tgt && tgt.alive) : player.alive && flareT <= 0;
        if (ok && tgt) {
          const tp = s.friendly ? tgt.rig.root.position : player.rig.root.position;
          _to.copy(tp).sub(s.pos);
          if (_to.lengthSq() > 1) {
            _to.normalize().multiplyScalar(s.friendly ? 520 : 420);
            s.vel.lerp(_to, 1 - Math.exp(-2.4 * dt));
          }
        }
      }
      s.pos.addScaledVector(s.vel, dt);
      s.mesh.position.copy(s.pos);
      s.mesh.lookAt(_look.copy(s.pos).add(s.vel));
      let gone = s.life <= 0;
      if (s.friendly) {
        for (const b of bandits) {
          if (!b.alive) continue;
          if (b.rig.root.position.distanceTo(s.pos) < (s.homing ? 16 : 10)) {
            b.hp -= s.homing ? 56 : 9;
            mark = 0.16;
            gone = true;
            boomAt(s.pos);
            break;
          }
        }
      } else if (player.alive && pPos.distanceTo(s.pos) < (s.homing ? 14 : 8)) {
        player.hp -= s.homing ? 22 : 7;
        hit = 1;
        _cam.copy(s.pos).sub(pPos);
        hitBrg = angNorm(Math.atan2(_cam.x, _cam.z) - player.meshYaw);
        shake = 0.8;
        gone = true;
        boomAt(s.pos);
      }
      if (gone) {
        s.active = false;
        s.mesh.visible = false;
      }
    }
    if (player.alive && player.hp <= 0) {
      player.alive = false;
      endSortie();
    }
    for (const b of booms) {
      if (b.life <= 0) continue;
      b.life -= dt;
      const k = 1 - b.life / 0.85;
      const s = 10 + k * 42;
      b.fire.scale.set(s, s, 1);
      b.fire.material.opacity = Math.max(0, 1 - k);
      b.ring.scale.setScalar(5 + k * 30);
      b.ring.lookAt(camera.position);
      b.ring.material.opacity = Math.max(0, 0.8 * (1 - k));
      if (b.life <= 0) {
        b.fire.visible = false;
        b.ring.visible = false;
      }
    }
    for (const p of puffs) {
      if (p.life <= 0) continue;
      p.life -= dt;
      const k = Math.max(0, p.life / p.max);
      const size = p.grow + (1 - k) * p.grow * 1.8;
      p.s.scale.set(size, size * 0.4, 1);
      p.s.material.opacity = 0.34 * k;
      if (p.life <= 0) p.s.visible = false;
    }
    trailT -= dt;
    if (trailT <= 0 && player.alive && player.speed > 190) {
      trailT = 0.048;
      for (const side of [-1, 1]) {
        _look.set(6.8 * side, 0.05, -0.4).applyMatrix4(player.rig.root.matrixWorld);
        puffAt(_look, Math.abs(player.roll) > 0.85 ? 16 : 8);
      }
    }
    banditTrail -= dt;
    if (banditTrail <= 0) {
      banditTrail = 0.11;
      for (const b of bandits) {
        if (!b.alive || b.speed < 240) continue;
        _look.set(0.2, 0.3, -9.1).applyMatrix4(b.rig.root.matrixWorld);
        puffAt(_look, 10);
      }
    }
    if (mode === "cockpit") {
      camera.up.set(0, 1, 0);
      player.rig.root.updateMatrixWorld(true);
      camera.position.set(0, 1.02, 2.15);
      camera.rotation.set(0.12, Math.PI, 0);
      player.rig.root.add(camera);
    } else {
      if (camera.parent) camera.parent.remove(camera);
      scene.add(camera);
      orient(player);
      const dist = mode === "far" ? 52 : 26;
      const lift = mode === "far" ? 12 : 6.2;
      _cam.copy(pPos).addScaledVector(_fwd, -dist);
      _cam.y += lift;
      camera.up.set(0, 1, 0);
      camera.position.lerp(_cam, 1 - Math.exp(-3.4 * dt));
      _look.copy(pPos).addScaledVector(_fwd, 16);
      _look.y += 0.6;
      camera.lookAt(_look);
    }
    if (shake > 0.02) {
      camera.position.x += (Math.random() - 0.5) * shake * 0.7;
      camera.position.y += (Math.random() - 0.5) * shake * 0.45;
    }
    const wantFov = mode === "cockpit" ? 74 : 58 + Math.min(12, player.speed / 48) + (burn ? 5 : 0);
    if (Math.abs(camera.fov - wantFov) > 0.04) {
      camera.fov += (wantFov - camera.fov) * Math.min(1, dt * 3.5);
      camera.updateProjectionMatrix();
    }
    if (audio && engineGain && engineOsc) {
      engineOsc.frequency.value = 64 + player.speed / 400 * 90 + (burn ? 36 : 0);
      engineGain.gain.value = 0.02 + (burn ? 0.012 : 0);
    }
    const w = host2.clientWidth;
    const h = host2.clientHeight;
    const blips = [];
    orient(player);
    for (let i = 0; i < bandits.length; i++) {
      const b = bandits[i];
      if (!b.alive) continue;
      _to.copy(b.rig.root.position).sub(pPos);
      const dist = _to.length();
      const world2 = Math.atan2(_to.x, _to.z);
      const bearing = angNorm(world2 - player.meshYaw);
      _ndc.copy(b.rig.root.position).project(camera);
      blips.push({
        bearing,
        dist,
        alt: b.rig.root.position.y,
        sx: (_ndc.x * 0.5 + 0.5) * w,
        sy: (-_ndc.y * 0.5 + 0.5) * h,
        ahead: _ndc.z < 1 && bearing > -1.2 && bearing < 1.2,
        locked: i === lock
      });
    }
    let incoming = false;
    let incomingBrg = 0;
    let nearest = 1e9;
    if (player.alive && flareT <= 0) {
      for (const s of shots) {
        if (!s.active || s.friendly || !s.homing) continue;
        const d = pPos.distanceTo(s.pos);
        if (d < nearest) {
          nearest = d;
          incoming = true;
          _to.copy(s.pos).sub(pPos);
          incomingBrg = angNorm(Math.atan2(_to.x, _to.z) - player.meshYaw);
        }
      }
    }
    if (incoming) {
      warnT -= dt;
      if (warnT <= 0) {
        tone(980, 0.06, "square", 0.035);
        warnT = 0.32;
      }
    } else {
      warnT = 0;
    }
    let piperOn = false;
    let piperX = 0;
    let piperY = 0;
    const lockedCraft = bandits[lock];
    if (lockedCraft?.alive && player.alive) {
      const rel = _cam.copy(lockedCraft.rig.root.position).sub(pPos);
      const dist = rel.length();
      const bearing = angNorm(Math.atan2(rel.x, rel.z) - player.meshYaw);
      if (Math.abs(bearing) < 0.5 && dist < 5200 && dist > 30) lockSeal = Math.min(1, lockSeal + dt * 0.9);
      else lockSeal = Math.max(0, lockSeal - dt * 1.3);
      orient(lockedCraft);
      const leadT = clamp(dist / 1050, 0.05, 2.2);
      _look.copy(lockedCraft.rig.root.position).addScaledVector(_fwd, lockedCraft.speed * leadT);
      _ndc.copy(_look).project(camera);
      if (_ndc.z < 1) {
        piperOn = true;
        piperX = (_ndc.x * 0.5 + 0.5) * w;
        piperY = (-_ndc.y * 0.5 + 0.5) * h;
      }
      orient(player);
    } else {
      lockSeal = Math.max(0, lockSeal - dt * 1.6);
    }
    const model = {
      mode,
      altFt: pPos.y * 3.28084,
      spdKt: player.speed * 1.94384,
      mach: player.speed / 340,
      vs: _fwd.y * player.speed * 196.85,
      heading: (player.meshYaw * 180 / Math.PI + 360) % 360,
      pitch: player.pitch,
      roll: player.roll,
      g: 1 + Math.abs(pitchIn) * 2.4 + Math.abs(player.roll) * 0.35,
      aoa: -player.pitch * 12,
      fuel,
      gun,
      msl,
      flares,
      score: score2,
      time,
      hp: player.hp,
      wave,
      banner,
      burn,
      stall: player.speed < 90,
      hit,
      rpm: 78 + player.speed / 400 * 22 + (burn ? 8 : 0),
      temp: 620 + player.speed * 0.4 + (burn ? 80 : 0),
      oil: 92,
      blips,
      meshYaw: player.meshYaw,
      px: pPos.x,
      pz: pPos.z,
      piperX,
      piperY,
      piperOn,
      incoming,
      incomingBrg,
      mark,
      lockSeal,
      hitBrg
    };
    mfdT += dt;
    if (mode === "cockpit" && mfdT > 0.08 && player.rig.screens.length) {
      mfdT = 0;
      lastMfd = time;
      paintMfds(player.rig.screens, model, lastMfd);
    }
    drawHud(hudCtx, w, h, model);
    dress();
    renderer.render(scene, camera);
    publish();
  }
  function dress() {
    const p = player.rig.root.position;
    world.sun.position.set(p.x - 90, p.y + 150, p.z + 40);
    world.sun.target.position.copy(p);
    world.sun.target.updateMatrixWorld();
    if (world.sky) world.sky.position.copy(camera.position);
    world.sunDisk.position.copy(camera.position);
    world.sunDisk.position.x -= 2600;
    world.sunDisk.position.y += 1500;
    world.sunDisk.position.z += 800;
  }
  const prevEdge = /* @__PURE__ */ new Set();
  function edge(code) {
    const down = held(code);
    const was = prevEdge.has(code);
    if (down) prevEdge.add(code);
    else prevEdge.delete(code);
    return down && !was;
  }
  renderer.setAnimationLoop(frame);
  publish(true);
  return () => {
    disposed = true;
    renderer.setAnimationLoop(null);
    timer.disconnect();
    window.removeEventListener("keydown", onDown);
    window.removeEventListener("keyup", onUp);
    window.removeEventListener("blur", onBlur);
    ro.disconnect();
    if (window.__controlsTest) delete window.__controlsTest;
    renderer.dispose();
    host2.replaceChildren();
    if (audio) void audio.close();
  };
}
function makeCraft(kind, number, ai) {
  return {
    rig: createJet(kind, number),
    meshYaw: 0,
    pitch: 0,
    roll: 0,
    speed: 0,
    hp: 100,
    alive: true,
    shoot: 1,
    missile: 6,
    ai
  };
}

// src/deploy/static-main.ts
var host = document.getElementById("stage");
var panel = document.getElementById("panel");
var title = document.getElementById("title");
var score = document.getElementById("score");
var start = document.getElementById("start");
var stick = document.getElementById("stick");
var touchBar = document.getElementById("touch");
if (!host || !panel || !title || !score || !start || !stick || !touchBar) {
  throw new Error("shell");
}
var touch = {
  roll: 0,
  pitch: 0,
  burn: false,
  gun: false,
  edges: { missile: 0, flare: 0, cam: 0, lock: 0 }
};
var api = { current: null };
var pending = false;
mountSkyVanguard(host, {
  readTouch: () => touch,
  onChange: (ui) => {
    const flying = ui.phase === "fly";
    panel.hidden = flying;
    touchBar.hidden = !flying;
    title.textContent = ui.phase === "down" ? "Jet down" : "Clear for takeoff";
    score.textContent = ui.phase === "down" ? `BEST ${ui.best.toLocaleString("en-US")} \xB7 SCORE ${ui.score.toLocaleString("en-US")}` : `BEST ${ui.best.toLocaleString("en-US")}`;
  },
  api,
  takePending: () => {
    if (!pending) return false;
    pending = false;
    return true;
  }
});
start.addEventListener("click", () => {
  if (api.current) api.current.start();
  else pending = true;
});
var stickId = null;
var pad2 = stick;
function stickTo(clientX, clientY) {
  const bounds = pad2.getBoundingClientRect();
  const x = (clientX - bounds.left) / bounds.width * 2 - 1;
  const y = (clientY - bounds.top) / bounds.height * 2 - 1;
  touch.roll = Math.max(-1, Math.min(1, -x));
  touch.pitch = Math.max(-1, Math.min(1, -y));
}
pad2.addEventListener("pointerdown", (e) => {
  stickId = e.pointerId;
  pad2.setPointerCapture(e.pointerId);
  stickTo(e.clientX, e.clientY);
});
pad2.addEventListener("pointermove", (e) => {
  if (stickId !== e.pointerId) return;
  stickTo(e.clientX, e.clientY);
});
pad2.addEventListener("pointerup", (e) => {
  if (stickId !== e.pointerId) return;
  stickId = null;
  touch.roll = 0;
  touch.pitch = 0;
});
function hold(id, key) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("pointerdown", (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    touch[key] = true;
  });
  const up = () => {
    touch[key] = false;
  };
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
}
hold("burn", "burn");
hold("gun", "gun");
function pulse(id, key) {
  const el = document.getElementById(id);
  el?.addEventListener("pointerup", () => {
    touch.edges[key] += 1;
  });
}
pulse("msl", "missile");
pulse("cam", "cam");
