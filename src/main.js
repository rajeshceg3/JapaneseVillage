import {createSoundscape} from './soundscape.js';
import {SOUND_PLACES} from './sound-places.js';
import * as THREE from 'https://esm.sh/three@0.168.0';
import { mergeGeometries } from 'https://esm.sh/three@0.168.0/examples/jsm/utils/BufferGeometryUtils.js';

const CHUNK = 80;
const VIEW = 3;
const SEED = 20260802;
const biomes = [
  { name: 'Cedar Shrine Valley', ground: 0x5f7f49, fog: 0xbad7ce, accent: 0xb52d2d, tree: 'cedar', mood: 'bell wind through cedar gates' },
  { name: 'Rice Terrace Morning', ground: 0x84aa68, fog: 0xd4edd1, accent: 0xf2d16b, tree: 'willow', mood: 'water mirrors and footpaths' },
  { name: 'Bamboo Mist Grove', ground: 0x4e8b55, fog: 0xb8ddd3, accent: 0x82c47d, tree: 'bamboo', mood: 'tall bamboo corridors' },
  { name: 'Sakura Riverside', ground: 0x6e9358, fog: 0xf3d4df, accent: 0xf0a6bd, tree: 'sakura', mood: 'petals drifting over bridges' },
  { name: 'Snow Lantern Ridge', ground: 0xdfe9e6, fog: 0xd8e9f4, accent: 0xffcf77, tree: 'pine', mood: 'quiet snow and warm paper light' },
  { name: 'Firefly Tea Hamlet', ground: 0x536f3d, fog: 0xa9c4a9, accent: 0xffe891, tree: 'cedar', mood: 'tea houses under fireflies' },
];

function hash(x, z) { const n = Math.sin(x * 127.1 + z * 311.7 + SEED) * 43758.5453; return n - Math.floor(n); }
function smooth(t) { return t * t * (3 - 2 * t); }
function noise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = smooth(x - ix), fz = smooth(z - iz);
  const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, fx), THREE.MathUtils.lerp(c, d, fx), fz);
}
function fbm(x, z) { let v = 0, amp = .55, f = 1; for (let i = 0; i < 5; i++) { v += noise(x * f, z * f) * amp; f *= 2.03; amp *= .48; } return v; }
function biomeAt(z) { return biomes[Math.abs(Math.floor((z + 280) / 220)) % biomes.length]; }
function heightAt(x, z) {
  const ridge = Math.pow(Math.max(0, fbm(x * .006, z * .006) - .42), 2.2) * 92;
  const hills = (fbm(x * .022, z * .022) - .48) * 18;
  const riverCarve = Math.max(0, 1 - Math.abs(riverCenter(z) - x) / 32) * 9;
  return ridge + hills - riverCarve;
}
function riverCenter(z) { return Math.sin(z * .008) * 58 + Math.sin(z * .021) * 21; }

function boot() {
  const ambience=createSoundscape(SOUND_PLACES);window.villageSound=ambience;
  let soundPlace=biomes.indexOf(biomeAt(44));
  const root = document.getElementById('root');
  const biomeLabel = document.getElementById('biome');
  const chunkLabel = document.getElementById('chunks');
  const moodLabel = document.getElementById('mood');
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xbad7ce, 0.0052);
  const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, .1, 1600);
  camera.position.set(0, 20, 44);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(innerWidth, innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.06;
  root.appendChild(renderer.domElement);

  const hemi = new THREE.HemisphereLight(0xfff4da, 0x203b4b, 1.9); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd39c, 3.2); sun.position.set(-120, 160, 80); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); scene.add(sun);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(950, 48, 24), new THREE.ShaderMaterial({ side: THREE.BackSide, uniforms: { t: { value: 0 } }, vertexShader: 'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}', fragmentShader: 'varying vec3 v;uniform float t;void main(){float h=normalize(v).y*.5+.5;vec3 dawn=vec3(1.,.78,.55);vec3 zen=vec3(.34,.62,.88);vec3 night=vec3(.05,.08,.18);vec3 col=mix(dawn,zen,smoothstep(.15,1.,h));col=mix(col,night,smoothstep(.72,1.,sin(t)*.5+.5)*.35);gl_FragColor=vec4(col,1.);}' })); scene.add(sky);

  const mats = {
    trunk: new THREE.MeshStandardMaterial({ color: 0x56351f, roughness: .92 }), roof: new THREE.MeshStandardMaterial({ color: 0x213444, roughness: .78 }), wood: new THREE.MeshStandardMaterial({ color: 0x8c5b36, roughness: .85 }),
    paper: new THREE.MeshStandardMaterial({ color: 0xfff1d2, emissive: 0xffbd66, emissiveIntensity: .55 }), water: new THREE.MeshPhysicalMaterial({ color: 0x59b4c8, transparent: true, opacity: .68, roughness: .05, metalness: 0, transmission: .25 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x8f9288, roughness: 1 }), path: new THREE.MeshStandardMaterial({ color: 0xb29b74, roughness: 1 }), snow: new THREE.MeshStandardMaterial({ color: 0xf0f7f4, roughness: .75 }),
  };
  // Lantern meshes remain in every chunk; only the eight nearest need real
  // dynamic lights. Hundreds of simultaneous PointLights compile oversized
  // shaders and make even the first scene stall.
  const treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85 });
  function paintGeo(geo, bottom, top) {
    const cb = new THREE.Color(bottom), ct = new THREE.Color(top === undefined ? bottom : top), tmp = new THREE.Color();
    const pos = geo.attributes.position, colors = new Float32Array(pos.count * 3);
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); if (y < min) min = y; if (y > max) max = y; }
    for (let i = 0; i < pos.count; i++) { const k = max > min ? (pos.getY(i) - min) / (max - min) : 0; tmp.copy(cb).lerp(ct, k); colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }
  const lanternPositions = new Map();
  const lightPool = Array.from({ length: 8 }, () => { const light = new THREE.PointLight(0xffc76a, 1.35, 28); scene.add(light); return light; });
  const chunks = new Map(); const fireflies = []; const petals = []; const birds = []; const keys = {};

  function addHouse(g, x, z, b) {
    const y = heightAt(x, z) + 1.7;
    const body = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 8), mats.wood);
    body.position.set(x, y, z); body.castShadow = body.receiveShadow = true; g.add(body);
    // Kirizuma-style gabled roof with eaves overhang, ridge along the long axis
    const tri = new THREE.Shape([new THREE.Vector2(-4.9, 0), new THREE.Vector2(4.9, 0), new THREE.Vector2(0, 3.0)]);
    const roofGeo = new THREE.ExtrudeGeometry(tri, { depth: 11.4, bevelEnabled: false });
    roofGeo.rotateY(Math.PI / 2);
    roofGeo.translate(-5.7, 0, 0);
    const roof = new THREE.Mesh(roofGeo, mats.roof);
    roof.position.set(x, y + 2.5, z); roof.castShadow = true; g.add(roof);
    const door = new THREE.Mesh(new THREE.BoxGeometry(2, 2.7, .18), mats.paper);
    door.position.set(x, y + .25, z + 4.1); g.add(door);
    if (hash(x, z) > .58) addTorii(g, x + 9, z - 8, b.accent);
  }
  function addTorii(g, x, z, color) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: .55 });
    const y = heightAt(x, z);
    const parts = [
      { geo: new THREE.CylinderGeometry(.42, .52, 8.2, 10), pos: [-2.9, 4.1, 0], rot: [0, 0, .045] },
      { geo: new THREE.CylinderGeometry(.42, .52, 8.2, 10), pos: [2.9, 4.1, 0], rot: [0, 0, -.045] },
      { geo: new THREE.BoxGeometry(7.0, .55, .6), pos: [0, 5.9, 0] },
      { geo: new THREE.BoxGeometry(9.2, .8, .8), pos: [0, 8.0, 0] },
      { geo: new THREE.BoxGeometry(8.0, .55, .7), pos: [0, 8.68, 0] },
      { geo: new THREE.BoxGeometry(1.5, .8, .8), pos: [-4.9, 8.35, 0], rot: [0, 0, .28] },
      { geo: new THREE.BoxGeometry(1.5, .8, .8), pos: [4.9, 8.35, 0], rot: [0, 0, -.28] },
    ];
    for (const p of parts) { const m = new THREE.Mesh(p.geo, mat); m.position.set(x + p.pos[0], y + p.pos[1], z + p.pos[2]); if (p.rot) m.rotation.set(p.rot[0], p.rot[1], p.rot[2]); m.castShadow = true; g.add(m); }
  }
  function addTree(g, x, z, kind, accent) {
    const y = heightAt(x, z);
    const parts = [];
    const trunkH = kind === 'bamboo' ? 9 : 5;
    const trunk = new THREE.CylinderGeometry(.32, .72, trunkH, 8);
    trunk.translate(x, y + trunkH / 2, z);
    paintGeo(trunk, kind === 'bamboo' ? 0x35853e : 0x4a2e1a, kind === 'bamboo' ? 0x5cbf6c : 0x6b4a2c);
    parts.push(trunk);
    if (kind === 'sakura') {
      const c1 = new THREE.IcosahedronGeometry(3.1, 1); c1.translate(x, y + 8.2, z); paintGeo(c1, 0xd98ba4, accent);
      const c2 = new THREE.IcosahedronGeometry(2.3, 1); c2.translate(x + 1.7, y + 9.4, z + .8); paintGeo(c2, 0xe3a3b8, 0xf6c7d4);
      const c3 = new THREE.IcosahedronGeometry(1.8, 1); c3.translate(x - 1.6, y + 9.0, z - .9); paintGeo(c3, 0xd98ba4, 0xf0b6c6);
      parts.push(c1, c2, c3);
    } else if (kind === 'bamboo') {
      const b2 = new THREE.CylinderGeometry(.22, .3, 7.5, 6); b2.translate(x + .9, y + 3.75, z + .5); paintGeo(b2, 0x2f7d38, 0x57b567);
      const b3 = new THREE.CylinderGeometry(.18, .26, 6.4, 6); b3.translate(x - .8, y + 3.2, z - .4); paintGeo(b3, 0x2f7d38, 0x4fae5e);
      const t1 = new THREE.ConeGeometry(1.5, 2.6, 7); t1.translate(x, y + 9.8, z); paintGeo(t1, 0x2c7034, 0x49a355);
      const t2 = new THREE.ConeGeometry(1.2, 2.1, 7); t2.translate(x + .9, y + 8.2, z + .5); paintGeo(t2, 0x2c7034, 0x49a355);
      parts.push(b2, b3, t1, t2);
    } else if (kind === 'willow') {
      const top = new THREE.ConeGeometry(3.9, 4.6, 9); top.translate(x, y + 8.6, z); paintGeo(top, 0x4d7a40, 0x7fae62);
      const skirt = new THREE.ConeGeometry(4.4, 5.2, 9); skirt.translate(x, y + 6.2, z); paintGeo(skirt, 0x40682f, 0x5d8a48);
      parts.push(top, skirt);
    } else {
      const base = kind === 'pine' ? 0x14402f : 0x1a4c33, tip = kind === 'pine' ? 0x2c6a4e : 0x35795a;
      const l1 = new THREE.ConeGeometry(3.7, 4.4, 10); l1.translate(x, y + 6.4, z); paintGeo(l1, base, tip);
      const l2 = new THREE.ConeGeometry(2.9, 3.8, 10); l2.translate(x, y + 9.2, z); paintGeo(l2, base, tip);
      const l3 = new THREE.ConeGeometry(2.0, 3.2, 10); l3.translate(x, y + 11.6, z); paintGeo(l3, base, tip);
      parts.push(l1, l2, l3);
    }
    const geos = parts.map(p => p.index ? p.toNonIndexed() : p);
    const tree = new THREE.Mesh(mergeGeometries(geos, false), treeMat);
    tree.castShadow = true;
    g.add(tree);
  }
  function addLantern(g, x, z) {
    const y = heightAt(x, z);
    const base = new THREE.Mesh(new THREE.BoxGeometry(.9, .35, .9), mats.stone); base.position.set(x, y + .17, z); g.add(base);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.12, .16, 1.7, 8), mats.stone); pole.position.set(x, y + 1.2, z); g.add(pole);
    const platform = new THREE.Mesh(new THREE.BoxGeometry(.75, .18, .75), mats.stone); platform.position.set(x, y + 2.12, z); g.add(platform);
    const lightPosition = new THREE.Vector3(x, y + 2.58, z);
    if (!lanternPositions.has(g)) lanternPositions.set(g, []);
    lanternPositions.get(g).push(lightPosition);
    const box = new THREE.Mesh(new THREE.BoxGeometry(.62, .68, .62), mats.paper); box.position.copy(lightPosition); g.add(box);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(.66, .5, 4), mats.stone); cap.position.set(x, y + 3.16, z); cap.rotation.y = Math.PI / 4; g.add(cap);
  }
  function addBridge(g, x, z) { const y = Math.max(heightAt(x - 13, z), heightAt(x + 13, z)) + 1.2; const deck = new THREE.Mesh(new THREE.BoxGeometry(32, 1.1, 5), mats.wood); deck.position.set(x, y, z); deck.rotation.z = .08; deck.castShadow = true; g.add(deck); for (const sx of [-13, 13]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(1, 3, 6), mats.wood); rail.position.set(x + sx, y + 1.8, z); g.add(rail); } }
  function addTerraces(g, worldX, worldZ) {
    for (let row = 0; row < 7; row++) {
      const z = worldZ - 25 + row * 8;
      const geometry = new THREE.PlaneGeometry(CHUNK * .72, 5, 16, 2);
      geometry.rotateX(-Math.PI / 2);
      const positions = geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i) + worldX, worldZPoint = positions.getZ(i) + z;
        positions.setXYZ(i, x, heightAt(x, worldZPoint) + .18, worldZPoint);
      }
      geometry.computeVertexNormals();
      const terrace = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: row % 2 ? 0x74a35d : 0x8bb56a, roughness: .35, metalness: .08 }));
      terrace.receiveShadow = true; g.add(terrace);
    }
  }

  function makeChunk(cx, cz) {
    const key = `${cx},${cz}`; if (chunks.has(key)) return;
    const g = new THREE.Group(); const worldX = cx * CHUNK, worldZ = cz * CHUNK, b = biomeAt(worldZ);
    const geo = new THREE.PlaneGeometry(CHUNK, CHUNK, 32, 32); geo.rotateX(-Math.PI / 2); const arr = geo.attributes.position.array;
    const gcol = new Float32Array(arr.length);
    const gbase = new THREE.Color(b.name.includes('Snow') ? mats.snow.color : b.ground), gtmp = new THREE.Color();
    for (let i = 0; i < arr.length; i += 3) {
      const wx = arr[i] + worldX, wz = arr[i + 2] + worldZ;
      arr[i + 1] = heightAt(wx, wz);
      gtmp.copy(gbase).multiplyScalar(.88 + fbm(wx * .09, wz * .09) * .22);
      gcol[i] = gtmp.r; gcol[i + 1] = gtmp.g; gcol[i + 2] = gtmp.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(gcol, 3));
    geo.computeVertexNormals(); const groundMat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .96 }); const ground = new THREE.Mesh(geo, groundMat); ground.position.set(worldX, 0, worldZ); ground.receiveShadow = true; g.add(ground);
    const localRiver = riverCenter(worldZ); if (Math.abs(worldX - localRiver) < CHUNK * .85) { const water = new THREE.Mesh(new THREE.PlaneGeometry(24, CHUNK), mats.water); water.rotateX(-Math.PI / 2); water.position.set(localRiver, .9, worldZ); g.add(water); if (hash(cx, cz) > .52) addBridge(g, localRiver, worldZ + (hash(cz, cx) - .5) * 40); }
    const path = new THREE.Mesh(new THREE.PlaneGeometry(6, CHUNK * 1.1), mats.path); path.rotateX(-Math.PI / 2); path.position.set(worldX + Math.sin(cz * .4) * 16, heightAt(worldX, worldZ) + .12, worldZ); path.rotation.z = Math.sin(cz * .7) * .12; g.add(path);
    for (let i = 0; i < 48; i++) { const x = worldX + (hash(i + cx * 9, cz) - .5) * CHUNK, z = worldZ + (hash(cx, i + cz * 7) - .5) * CHUNK; if (Math.abs(x - riverCenter(z)) < 16 || (b.name.includes('Rice') && Math.abs(x - worldX) < CHUNK * .38 && Math.abs(z - worldZ) < 31)) continue; if (hash(x, z) < .13) addHouse(g, x, z, b); else addTree(g, x, z, b.tree, b.accent); }
    for (let i = 0; i < 10; i++) if (hash(cx * 31 + i, cz) > .42) addLantern(g, worldX + (i - 4.5) * 8, worldZ + Math.sin(i + cz) * 13);
    if (hash(cx, cz) > .84) addTorii(g, worldX, worldZ, b.accent); if (b.name.includes('Rice')) addTerraces(g, worldX, worldZ);
    chunks.set(key, g); scene.add(g); updateHud(b);
  }
  function updateHud(b) { biomeLabel.textContent = b.name; moodLabel.textContent = b.mood; chunkLabel.textContent = `Streaming ${chunks.size} procedural chunks · ${Math.round(camera.position.z)}m into the frontier`; }

  addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; if (e.key.toLowerCase() === 'm') document.body.classList.toggle('zen'); });
  addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
  renderer.domElement.addEventListener('click', () => renderer.domElement.requestPointerLock?.());
  addEventListener('mousemove', e => { if (document.pointerLockElement === renderer.domElement) yaw -= e.movementX * .0022; });
  for (let i = 0; i < 90; i++) { const bird = new THREE.Mesh(new THREE.ConeGeometry(.7, 2.2, 3), new THREE.MeshStandardMaterial({ color: 0x1b2028 })); bird.position.set((hash(i, 1) - .5) * 480, 58 + hash(i, 2) * 55, (hash(i, 3) - .5) * 540); birds.push(bird); scene.add(bird); }
  for (let i = 0; i < 160; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(.08 + hash(i, 4) * .1, 6, 4), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffe891 : 0xf0a6bd, transparent: true, opacity: .75 })); p.position.set((hash(i, 5) - .5) * 240, 8 + hash(i, 6) * 40, (hash(i, 7) - .5) * 260); (i % 2 ? fireflies : petals).push(p); scene.add(p); }

  let yaw = 0, t = 0, lastFrame = performance.now();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const places = document.createElement('nav'); places.className = 'places'; places.setAttribute('aria-label', 'Visit a landscape');
  places.innerHTML = ['Shrine', 'Rice', 'Bamboo', 'Sakura', 'Snow', 'Tea'].map((name, i) => `<button data-place="${i}">${name}</button>`).join('') + '<button id="reset-view">Reset view</button><button id="sound" aria-pressed="false">Sound on</button>';
  document.body.appendChild(places);
  document.getElementById('sound').onclick=()=>{const on=ambience.toggle(soundPlace);const b=document.getElementById('sound');b.textContent=on?'Sound off':'Sound on';b.setAttribute('aria-pressed',String(on))};
  function visit(index) { camera.position.set(0, heightAt(0, -170 + index * 220) + 18, -170 + index * 220); yaw = 0; }
  places.querySelectorAll('[data-place]').forEach(button => button.addEventListener('click', () => visit(Number(button.dataset.place))));
  document.getElementById('reset-view').addEventListener('click', () => { camera.position.set(0,20,44); yaw = 0; });
  let lastTouch = null;
  renderer.domElement.addEventListener('pointerdown', e => { if(e.pointerType === 'touch') { lastTouch = e.clientX; renderer.domElement.setPointerCapture(e.pointerId); } });
  renderer.domElement.addEventListener('pointermove', e => { if(lastTouch !== null) { yaw -= (e.clientX - lastTouch) * .006; lastTouch = e.clientX; } });
  renderer.domElement.addEventListener('pointerup', () => lastTouch = null);
  renderer.domElement.addEventListener('pointercancel', () => lastTouch = null);
  addEventListener('blur', () => { for(const key in keys) keys[key] = false; lastTouch = null; });
  function tick() {
    requestAnimationFrame(tick); const now = performance.now(); const frameScale = Math.min(.05, (now - lastFrame) / 1000) * 60; lastFrame = now;
    if (!reducedMotion.matches) t += .01 * frameScale; sky.material.uniforms.t.value = t;
    if (keys['a']) yaw += .025 * frameScale; if (keys['d']) yaw -= .025 * frameScale;
    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)); const side = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)); const sprint = keys['shift'] ? 1.7 : 1;
    if (keys['w'] || keys['arrowup']) camera.position.addScaledVector(forward, .82 * sprint * frameScale); if (keys['s']) camera.position.addScaledVector(forward, -.55 * frameScale); if (keys['q']) camera.position.addScaledVector(side, -.55 * frameScale); if (keys['e']) camera.position.addScaledVector(side, .55 * frameScale);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, heightAt(camera.position.x, camera.position.z) + 18 + Math.sin(t * 2) * .35, .065); camera.lookAt(camera.position.x + Math.sin(yaw) * 44, camera.position.y - 7, camera.position.z + Math.cos(yaw) * 44);
    const cx = Math.floor(camera.position.x / CHUNK), cz = Math.floor(camera.position.z / CHUNK); for (let x = cx - VIEW; x <= cx + VIEW; x++) for (let z = cz - VIEW; z <= cz + VIEW; z++) makeChunk(x, z);
    for (const [k, g] of chunks) { const [x, z] = k.split(',').map(Number); if (Math.abs(x - cx) > VIEW + 1 || Math.abs(z - cz) > VIEW + 1) { scene.remove(g); chunks.delete(k); lanternPositions.delete(g); g.traverse(object => { if (object.isMesh) { object.geometry.dispose(); if (!Object.values(mats).includes(object.material)) object.material.dispose(); } }); } }
    const b = biomeAt(camera.position.z); const nextPlace=biomes.indexOf(b);if(nextPlace!==soundPlace){soundPlace=nextPlace;ambience.setPlace(soundPlace)} updateHud(b); scene.fog.color.lerp(new THREE.Color(b.fog), .012); renderer.setClearColor(scene.fog.color);
    if (!reducedMotion.matches) birds.forEach((bird, i) => { bird.position.x += Math.sin(t + i) * .08; bird.position.z += .26; if (bird.position.z - camera.position.z > 280) bird.position.z -= 560; bird.rotation.y = Math.sin(t + i); });
    if (!reducedMotion.matches) fireflies.forEach((p, i) => { p.position.x += Math.sin(t * 2 + i) * .018; p.position.y += Math.sin(t * 3 + i) * .012; p.position.z += .18; if (p.position.z - camera.position.z > 130) p.position.z -= 260; p.material.opacity = .35 + Math.sin(t * 4 + i) * .25; });
    if (!reducedMotion.matches) petals.forEach((p, i) => { p.position.x += Math.sin(t + i) * .04; p.position.y -= .012; p.position.z += .1; if (p.position.y < heightAt(p.position.x, p.position.z) + 2) p.position.y += 42; if (p.position.z - camera.position.z > 130) p.position.z -= 260; });
    sky.position.copy(camera.position);
    const nearest = [...lanternPositions.values()].flat().sort((a,b) => a.distanceToSquared(camera.position) - b.distanceToSquared(camera.position));
    lightPool.forEach((light, i) => { light.visible = Boolean(nearest[i]); if (nearest[i]) light.position.copy(nearest[i]); });
    renderer.domElement.dataset.camera = camera.position.toArray().map(n => n.toFixed(1)).join(',');
    renderer.domElement.dataset.chunks = String(chunks.size);
    renderer.domElement.dataset.activeLights = String(lightPool.filter(light => light.visible).length);
    renderer.render(scene, camera);
  }
  tick();
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
}
boot();
