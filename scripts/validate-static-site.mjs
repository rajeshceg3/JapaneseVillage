import { readFileSync } from 'node:fs';
for (const file of ['index.html', 'src/main.jsx', 'src/styles.css']) {
  const text = readFileSync(file, 'utf8');
  if (!text.trim()) throw new Error(`${file} is empty`);
}
const html = readFileSync('index.html', 'utf8');
if (!html.includes('/src/main.jsx')) throw new Error('index.html must load src/main.jsx');
const app = readFileSync('src/main.jsx', 'utf8');
for (const token of ['three', 'makeChunk', 'biomes', 'heightAt', 'WebGLRenderer']) {
  if (!app.includes(token)) throw new Error(`Missing expected token: ${token}`);
}
console.log('Static Three.js village site validated.');
