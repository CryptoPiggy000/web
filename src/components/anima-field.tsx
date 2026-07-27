"use client";

import { useEffect, useRef } from "react";

/**
 * "Anima"-style living particle field — a ~44k-point cloud that morphs between three organic forms and
 * reacts to the cursor (points near the pointer drift toward it and shiver with pointer velocity), over a
 * transparent background so it sits on the light hero. Recoloured to the Piggy Pink palette. Adapted from
 * the verified motion-clone `hero-verdant` reference; raw WebGL, no deps. Honours prefers-reduced-motion
 * (single static frame), clamps DPR, sizes to its container, and pauses when scrolled off-screen.
 * Decorative — the host is marked aria-hidden.
 */
const VERT = [
  "precision highp float;",
  "attribute float a_id; attribute float a_seed;",
  "uniform float u_time,u_aspect,u_dpr,u_mvel,u_morph,u_count,u_camz;",
  "uniform vec2 u_mouse;",
  "varying vec3 v_col; varying float v_alpha;",
  "mat3 rotY(float a){float c=cos(a),s=sin(a);return mat3(c,0.,-s, 0.,1.,0., s,0.,c);}",
  "mat3 rotX(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0., 0.,c,-s, 0.,s,c);}",
  "vec3 sdir(float id){ float y=1.0-2.0*id; float r=sqrt(max(0.0,1.0-y*y)); float ga=id*u_count*2.399963; return vec3(r*cos(ga), y, r*sin(ga)); }",
  "vec3 seedP(float id,float sd){ vec3 d=sdir(id); float n=0.12*sin(d.x*7.0+sd*6.28)*sin(d.y*6.0); return d*(0.5+n); }",
  "vec3 leafP(float id,float sd){ vec3 d=sdir(id); float tp=1.0-0.55*abs(d.y); vec3 p=vec3(d.x*0.5*tp, d.y*1.35, d.z*0.32*tp); p.z+=0.12*sin(d.y*3.14); return p*1.05; }",
  "vec3 bloomP(float id,float sd){ vec3 d=sdir(id); float pet=0.9+0.32*sin(atan(d.z,d.x)*5.0)*(1.0-abs(d.y)); float n=0.10*sin(d.y*8.0+sd*6.28); return d*(pet+n)*1.02; }",
  // Pink-led multi-hue glow palette (hot-pink · magenta · violet · coral · soft-pink) — pink dominates, violet/coral add life on the dark ground.
  "vec3 palette(float t){ vec3 c0=vec3(1.00,0.22,0.52); vec3 c1=vec3(1.00,0.36,0.82); vec3 c2=vec3(0.66,0.44,1.00); vec3 c3=vec3(1.00,0.58,0.42); vec3 c4=vec3(1.00,0.62,0.86); t=fract(t)*5.0; float i=floor(t); float f=smoothstep(0.0,1.0,fract(t)); if(i<1.0)return mix(c0,c1,f); if(i<2.0)return mix(c1,c2,f); if(i<3.0)return mix(c2,c3,f); if(i<4.0)return mix(c3,c4,f); return mix(c4,c0,f); }",
  "void main(){",
  "  float id=a_id, sd=a_seed;",
  "  float m=mod(u_morph,3.0); float seg=floor(m); float f=smoothstep(0.0,1.0,fract(m));",
  "  vec3 A,B;",
  "  if(seg<0.5){A=seedP(id,sd);B=leafP(id,sd);}",
  "  else if(seg<1.5){A=leafP(id,sd);B=bloomP(id,sd);}",
  "  else{A=bloomP(id,sd);B=seedP(id,sd);}",
  "  vec3 pos=mix(A,B,f);",
  "  float h=clamp(pos.y*0.5+0.5,0.0,1.0);",
  "  pos.x += sin(u_time*0.9 + pos.y*1.6 + sd*6.28)*0.05*h;",
  "  pos.z += cos(u_time*0.7 + pos.y*1.2 + sd*3.0)*0.035*h;",
  "  vec3 pr = rotX(u_mouse.y*0.5) * rotY(u_time*0.06 + u_mouse.x*0.7) * pos;",
  "  vec3 dir=normalize(pr+1e-5);",
  "  vec3 mdir=normalize(vec3(u_mouse.x,u_mouse.y,0.6));",
  "  float infl=smoothstep(0.4,1.0,dot(dir,mdir));",
  "  pr += mdir*infl*(0.14+0.5*u_mvel);",
  "  pr.y += infl*u_mvel*0.12*sin(u_time*8.0+sd*10.0);",
  "  vec3 vp=pr - vec3(0.0,0.05,u_camz);",
  "  float w=-vp.z;",
  "  gl_Position=vec4(vp.x*2.0/u_aspect, vp.y*2.0, 0.0, w);",
  "  gl_PointSize = u_dpr*(2.4+3.6*sd)*(3.6/max(w,0.2));",
  "  float depth01=clamp((w-(u_camz-1.8))/3.6,0.0,1.0);",
  "  v_alpha = mix(0.78,0.20,depth01);",
  "  vec3 L=normalize(vec3(-0.5,0.7,0.5));",
  "  float shade=0.58+0.42*dot(dir,L);",
  // Per-particle hue from the palette (seed + a slow drift + a little height), lit by `shade`.
  "  vec3 base=palette(sd + u_time*0.02 + h*0.18);",
  "  vec3 col=base*(0.52+0.30*shade);",
  "  col=mix(col, vec3(1.0,0.50,0.78), infl*0.5);",
  "  v_col=col;",
  "}",
].join("\n");

const FRAG = [
  "precision highp float;",
  "varying vec3 v_col; varying float v_alpha;",
  "void main(){",
  "  vec2 pc=gl_PointCoord-0.5; float d=length(pc);",
  "  float a=smoothstep(0.5,0.16,d);",
  "  gl_FragColor=vec4(v_col, a*v_alpha);",
  "}",
].join("\n");

export function AnimaField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cvs = ref.current!;
    const gl = (cvs.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: true }) ||
      cvs.getContext("experimental-webgl", { alpha: true, premultipliedAlpha: false })) as WebGLRenderingContext | null;
    if (!gl) return;

    const sh = (t: number, src: string) => {
      const s = gl.createShader(t)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const pr = gl.createProgram()!;
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(pr);
    gl.useProgram(pr);

    const N = 34000;
    const ids = new Float32Array(N);
    const seeds = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      ids[i] = i / N;
      seeds[i] = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
    }
    const buf = (data: Float32Array, loc: string) => {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      const l = gl.getAttribLocation(pr, loc);
      gl.enableVertexAttribArray(l);
      gl.vertexAttribPointer(l, 1, gl.FLOAT, false, 0, 0);
    };
    buf(ids, "a_id");
    buf(seeds, "a_seed");

    const U: Record<string, WebGLUniformLocation | null> = {};
    ["u_time", "u_aspect", "u_dpr", "u_mvel", "u_morph", "u_count", "u_camz", "u_mouse"].forEach(
      (n) => (U[n] = gl.getUniformLocation(pr, n)),
    );

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // additive — particles glow where they overlap, on the dark ground

    const dpr = Math.min(devicePixelRatio || 1, 1.75);
    const size = () => {
      const w = cvs.clientWidth || innerWidth;
      const h = cvs.clientHeight || innerHeight;
      cvs.width = Math.floor(w * dpr);
      cvs.height = Math.floor(h * dpr);
      gl.viewport(0, 0, cvs.width, cvs.height);
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(cvs);

    const tMouse = [0, 0];
    const mouse = [0, 0];
    let mvel = 0;
    let lastX = 0;
    let lastY = 0;
    const onMove = (e: PointerEvent) => {
      const r = cvs.getBoundingClientRect();
      tMouse[0] = ((e.clientX - r.left) / r.width) * 2 - 1;
      tMouse[1] = -(((e.clientY - r.top) / r.height) * 2 - 1);
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      mvel = Math.min(1.0, mvel + Math.sqrt(dx * dx + dy * dy) * 0.004);
    };
    addEventListener("pointermove", onMove);

    const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
    const camz = 3.25;
    let running = true;
    let raf = 0;

    const frame = (t: number) => {
      const morph = reduce ? 2.0 : t * 0.075;
      mouse[0] += (tMouse[0] - mouse[0]) * 0.05;
      mouse[1] += (tMouse[1] - mouse[1]) * 0.05;
      mvel *= 0.92;
      gl.uniform1f(U.u_time, t);
      gl.uniform1f(U.u_aspect, cvs.width / cvs.height);
      gl.uniform1f(U.u_dpr, dpr);
      gl.uniform1f(U.u_mvel, mvel);
      gl.uniform1f(U.u_morph, morph);
      gl.uniform1f(U.u_count, N);
      gl.uniform1f(U.u_camz, camz);
      gl.uniform2f(U.u_mouse, mouse[0], mouse[1]);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.POINTS, 0, N);
    };
    const loop = (ms: number) => {
      if (!running) {
        raf = 0;
        return;
      }
      frame(ms * 0.001);
      raf = requestAnimationFrame(loop);
    };

    const io = new IntersectionObserver(
      ([e]) => {
        running = e.isIntersecting;
        if (running && !reduce && !raf) raf = requestAnimationFrame(loop);
      },
      { threshold: 0.02 },
    );
    io.observe(cvs);

    if (reduce) frame(2.2);
    else raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      removeEventListener("pointermove", onMove);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={className} />;
}
