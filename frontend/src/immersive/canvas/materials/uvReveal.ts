import * as THREE from 'three';

// ─── GLSL ──────────────────────────────────────────────────────────────────────
export const UV_VERT = /* glsl */`
  varying vec2 vUv;
  varying vec4 vClip;

  void main() {
    vUv = uv;
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vClip = clip;
    gl_Position = clip;
  }
`;

export const UV_FRAG = /* glsl */`
  uniform sampler2D uBaseMap;
  uniform sampler2D uUVMap;
  uniform vec2 uMouse;
  uniform float uAspect;
  uniform float uRadius;
  uniform float uTime;

  varying vec2 vUv;
  varying vec4 vClip;

  void main() {
    vec2 ndc = vClip.xy / vClip.w;
    vec2 corrected = vec2((ndc.x - uMouse.x) * uAspect, ndc.y - uMouse.y);
    float dist = length(corrected);

    // Soft reveal circle with inner hot core
    float outer = 1.0 - smoothstep(0.0, uRadius, dist);
    float inner = 1.0 - smoothstep(0.0, uRadius * 0.35, dist);

    float reveal = outer * 0.65 + inner * 0.35;

    // Flicker
    reveal *= 0.88 + 0.12 * sin(uTime * 14.3 + ndc.x * 8.0);

    vec4 base   = texture2D(uBaseMap, vUv);
    vec4 uvInk  = texture2D(uUVMap,  vUv);

    // UV ink is cyan on black — additive screen blend
    vec3 screen = 1.0 - (1.0 - base.rgb) * (1.0 - uvInk.rgb * reveal);
    gl_FragColor = vec4(mix(base.rgb, screen, reveal * uvInk.a + uvInk.r * reveal * 0.5), 1.0);
  }
`;

// ─── Factory ───────────────────────────────────────────────────────────────────
export function createUVRevealMaterial(
  baseMap: THREE.Texture,
  uvMap: THREE.Texture,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uBaseMap: { value: baseMap },
      uUVMap:   { value: uvMap  },
      uMouse:   { value: new THREE.Vector2(0, 0) },
      uAspect:  { value: window.innerWidth / window.innerHeight },
      uRadius:  { value: 0.40 },
      uTime:    { value: 0 },
    },
    vertexShader:   UV_VERT,
    fragmentShader: UV_FRAG,
  });
}

// ─── UV hidden content texture ─────────────────────────────────────────────────
export function makeUVInkTex(
  width: number,
  height: number,
  drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = width; c.height = height;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);
  drawFn(ctx, width, height);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// ─── Risk Lab UV hidden ink content ───────────────────────────────────────────
export function drawRiskLabUVInk(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cyan = '#7df9ff';

  // Fingerprint rings
  const prints = [[0.2,0.35],[0.75,0.6],[0.45,0.78],[0.6,0.25]];
  prints.forEach(([fx,fy]) => {
    const cx = fx*w, cy = fy*h;
    for (let r = 6; r <= 28; r += 5) {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(125,249,255,${0.55 - r*0.012})`; ctx.lineWidth = 1.1;
      ctx.stroke();
    }
    // ridge lines
    for (let i = 0; i < 8; i++) {
      const a = (i/8) * Math.PI*2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a)*8, cy + Math.sin(a)*8);
      ctx.lineTo(cx + Math.cos(a)*26, cy + Math.sin(a)*26);
      ctx.strokeStyle = `rgba(125,249,255,0.2)`; ctx.lineWidth = 0.6;
      ctx.stroke();
    }
  });

  // Text annotations
  ctx.fillStyle = cyan; ctx.font = 'bold 18px "JetBrains Mono", monospace';
  ctx.fillText('RISK SCORE: 0.847', 30, 60);
  ctx.font = '14px "JetBrains Mono", monospace';
  ctx.fillStyle = `rgba(125,249,255,0.85)`;
  ctx.fillText('FRAUD PROBABILITY: 94.2%', 30, 85);
  ctx.fillText('ANOMALY CLUSTER: K=7', 30, 105);
  ctx.fillText(`CHAIN HEAD: 0xA8F2C3D1`, 30, 125);

  // Evidence box outlines
  [[0.55*w, 0.2*h, 110, 75], [0.1*w, 0.55*h, 90, 60]].forEach(([ex,ey,ew,eh]) => {
    ctx.strokeStyle = `rgba(125,249,255,0.6)`; ctx.lineWidth = 1.2;
    ctx.strokeRect(ex, ey, ew, eh);
    ctx.fillStyle = cyan; ctx.font = '9px monospace';
    ctx.fillText('EVIDENCE', ex+4, ey+14);
  });

  // Grid of probability dots
  for (let r = 0; r < 6; r++) {
    for (let c2 = 0; c2 < 10; c2++) {
      const prob = Math.random();
      if (prob > 0.6) {
        ctx.beginPath();
        ctx.arc(w*0.7 + c2*18 - 90, h*0.7 + r*18, 3+prob*3, 0, Math.PI*2);
        ctx.fillStyle = `rgba(125,249,255,${0.3+prob*0.5})`; ctx.fill();
      }
    }
  }

  // VERITA watermark
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.font = 'bold 80px Georgia, serif';
  ctx.fillStyle = cyan;
  ctx.textAlign = 'center';
  ctx.fillText('VERITA', w/2, h/2+28);
  ctx.restore();
}
