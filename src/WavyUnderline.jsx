import { useRef, useEffect } from "react";

const COLOR_IDLE = [17, 24, 39];
const COLOR_HOVER = [251, 146, 60];

export default function WavyUnderline({
  dotSize = 7.5,
  dotGap = 4,
  waveAmplitude = 3,
  waveFrequency = 0.15,
  waveSpeed = 2,
  hovered = false,
  className = "",
}) {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const phaseRef = useRef(0);
  const lastTimeRef = useRef(null);
  const fadeRef = useRef(0);
  const hoveredRef = useRef(hovered);
  const propsRef = useRef({ dotSize, dotGap, waveAmplitude, waveFrequency, waveSpeed });

  // Keep refs in sync with props
  hoveredRef.current = hovered;
  propsRef.current = { dotSize, dotGap, waveAmplitude, waveFrequency, waveSpeed };

  const height = dotSize + waveAmplitude * 2;

  // Single animation loop — reads all mutable state from refs
  useEffect(() => {
    function draw() {
      const canvas = canvasRef.current;
      const wrapper = wrapperRef.current;
      if (!canvas || !wrapper) return;

      const { dotSize, dotGap, waveAmplitude, waveFrequency, waveSpeed } = propsRef.current;
      const isHovered = hoveredRef.current;
      const dotRadius = dotSize * 0.4;
      const h = dotSize + waveAmplitude * 2;

      const ctx = canvas.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      const w = wrapper.offsetWidth;

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        ctx.scale(dpr, dpr);
      }

      ctx.clearRect(0, 0, w, h);

      // Advance phase when hovered
      const now = performance.now();
      if (lastTimeRef.current !== null && isHovered) {
        const dt = (now - lastTimeRef.current) / 1000;
        phaseRef.current += waveSpeed * dt;
      }
      lastTimeRef.current = now;

      // Fade in/out color
      const targetFade = isHovered ? 1 : 0;
      fadeRef.current += (targetFade - fadeRef.current) * 0.1;
      const fade = fadeRef.current;

      // Interpolate color
      const r = Math.round(COLOR_IDLE[0] + (COLOR_HOVER[0] - COLOR_IDLE[0]) * fade);
      const g = Math.round(COLOR_IDLE[1] + (COLOR_HOVER[1] - COLOR_IDLE[1]) * fade);
      const b = Math.round(COLOR_IDLE[2] + (COLOR_HOVER[2] - COLOR_IDLE[2]) * fade);
      ctx.fillStyle = `rgb(${r},${g},${b})`;

      // Draw dots along sine wave
      const centerY = h / 2;
      const step = dotGap + dotSize;

      for (let x = dotRadius; x < w; x += step) {
        const y = centerY + Math.sin(x * waveFrequency + phaseRef.current) * waveAmplitude;
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []); // runs once — no stale closures since everything is read from refs

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{ height: `${height}px` }}
    >
      <canvas ref={canvasRef} className="pointer-events-none" />
    </div>
  );
}
