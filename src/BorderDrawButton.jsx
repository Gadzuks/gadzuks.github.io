import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";

const BORDER = 1;
const GRAY = "rgb(17,24,39)";

export default function BorderDrawButton({
  href,
  children,
  // Grid
  cols = 50,
  rows = 16,
  gap = 1.5,
  opacity = 0.6,
  textPadX = 8,
  textPadY = 4,
  // Water
  dropRadius = 100,
  dropStrength = 0.8,
  waveSpeed = 2.0,
  damping = 0.995,
  speedNorm = 600,
  shadeStrength = 3,
}) {
  const [hovered, setHovered] = useState(false);
  const buttonRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const fadeRef = useRef(0);
  // Double-buffered heightfield: [heightX, heightY, velX, velY] per cell
  const bufferARef = useRef(null);
  const bufferBRef = useRef(null);
  const currentBufferRef = useRef("A");
  const cursorRef = useRef({ x: 0, y: 0, vx: 0, vy: 0, lastTime: 0 });
  const hoveredRef = useRef(false);
  const propsRef = useRef({});

  // Keep refs in sync with props
  hoveredRef.current = hovered;
  propsRef.current = {
    cols, rows, gap, opacity, textPadX, textPadY,
    dropRadius, dropStrength, waveSpeed, damping, speedNorm, shadeStrength,
  };

  // Track cursor/touch continuously while active
  useEffect(() => {
    const button = buttonRef.current;
    if (!button || !hovered) return;

    function updateCursor(clientX, clientY) {
      const rect = button.getBoundingClientRect();
      const now = performance.now();
      const cursor = cursorRef.current;
      const newX = clientX - rect.left - BORDER;
      const newY = clientY - rect.top - BORDER;

      const dt = (now - cursor.lastTime) / 1000;
      if (dt > 0 && dt < 0.1) {
        const rawVx = (newX - cursor.x) / dt;
        const rawVy = (newY - cursor.y) / dt;
        const smooth = 0.3;
        cursor.vx += (rawVx - cursor.vx) * smooth;
        cursor.vy += (rawVy - cursor.vy) * smooth;
      }

      cursor.x = newX;
      cursor.y = newY;
      cursor.lastTime = now;
    }

    function onPointerMove(e) {
      updateCursor(e.clientX, e.clientY);
    }

    function onTouchMove(e) {
      const touch = e.touches[0];
      if (touch) updateCursor(touch.clientX, touch.clientY);
    }

    button.addEventListener("pointermove", onPointerMove);
    button.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      button.removeEventListener("pointermove", onPointerMove);
      button.removeEventListener("touchmove", onTouchMove);
    };
  }, [hovered]);

  // Single animation loop
  useEffect(() => {
    function draw() {
      const canvas = canvasRef.current;
      const button = buttonRef.current;
      if (!canvas || !button) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      const {
        cols, rows, gap, opacity, textPadX, textPadY,
        dropRadius, dropStrength, waveSpeed, damping, speedNorm, shadeStrength,
      } = propsRef.current;
      const isHovered = hoveredRef.current;

      const ctx = canvas.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      const w = button.offsetWidth - BORDER * 2;
      const h = button.offsetHeight - BORDER * 2;

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        ctx.scale(dpr, dpr);
      }

      ctx.clearRect(0, 0, w, h);

      // Fade in/out (for hover state)
      const targetFade = isHovered ? 1 : 0;
      fadeRef.current += (targetFade - fadeRef.current) * 0.1;
      const fade = fadeRef.current;

      // Allocate double buffers
      const cellCount = cols * rows;
      const needed = cellCount * 4;
      if (!bufferARef.current || bufferARef.current.length !== needed) {
        bufferARef.current = new Float32Array(needed);
        bufferBRef.current = new Float32Array(needed);
        currentBufferRef.current = "A";
      }

      const src = currentBufferRef.current === "A" ? bufferARef.current : bufferBRef.current;
      const dst = currentBufferRef.current === "A" ? bufferBRef.current : bufferARef.current;

      // Early exit if fully settled
      if (fade < 0.01) {
        fadeRef.current = 0;
        if (bufferARef.current) bufferARef.current.fill(0);
        if (bufferBRef.current) bufferBRef.current.fill(0);
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      const cellW = w / cols;
      const cellH = h / rows;

      const cursor = cursorRef.current;
      const cursorSpeed = Math.sqrt(cursor.vx * cursor.vx + cursor.vy * cursor.vy);

      // Decay cursor velocity each frame
      cursor.vx *= 0.92;
      cursor.vy *= 0.92;

      // --- Step 1: Add cursor impulse to current buffer ---
      if (isHovered && cursorSpeed > 5) {
        const normalizedSpeed = Math.min(cursorSpeed / speedNorm, 1);

        const colMin = Math.max(0, Math.floor((cursor.x - dropRadius) / cellW));
        const colMax = Math.min(cols - 1, Math.ceil((cursor.x + dropRadius) / cellW));
        const rowMin = Math.max(0, Math.floor((cursor.y - dropRadius) / cellH));
        const rowMax = Math.min(rows - 1, Math.ceil((cursor.y + dropRadius) / cellH));

        for (let row = rowMin; row <= rowMax; row++) {
          for (let col = colMin; col <= colMax; col++) {
            const cx = (col + 0.5) * cellW;
            const cy = (row + 0.5) * cellH;
            const dx = cx - cursor.x;
            const dy = cy - cursor.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < dropRadius && dist > 0.1) {
              const t = 1 - dist / dropRadius;
              const drop = (0.5 - Math.cos(t * Math.PI) * 0.5) * dropStrength * normalizedSpeed;

              const idx = (row * cols + col) * 4;
              src[idx] += (dx / dist) * drop;
              src[idx + 1] += (dy / dist) * drop;
            }
          }
        }
      }

      // --- Step 2: Wave propagation ---
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const idx = (row * cols + col) * 4;

          const hx = src[idx];
          const hy = src[idx + 1];
          let vx = src[idx + 2];
          let vy = src[idx + 3];

          let avgX = 0;
          let avgY = 0;
          let neighbors = 0;

          if (col > 0) {
            const ni = (row * cols + (col - 1)) * 4;
            avgX += src[ni]; avgY += src[ni + 1]; neighbors++;
          }
          if (col < cols - 1) {
            const ni = (row * cols + (col + 1)) * 4;
            avgX += src[ni]; avgY += src[ni + 1]; neighbors++;
          }
          if (row > 0) {
            const ni = ((row - 1) * cols + col) * 4;
            avgX += src[ni]; avgY += src[ni + 1]; neighbors++;
          }
          if (row < rows - 1) {
            const ni = ((row + 1) * cols + col) * 4;
            avgX += src[ni]; avgY += src[ni + 1]; neighbors++;
          }

          avgX /= neighbors;
          avgY /= neighbors;

          vx += (avgX - hx) * waveSpeed;
          vy += (avgY - hy) * waveSpeed;
          vx *= damping;
          vy *= damping;

          dst[idx] = hx + vx;
          dst[idx + 1] = hy + vy;
          dst[idx + 2] = vx;
          dst[idx + 3] = vy;
        }
      }

      // Swap buffers
      currentBufferRef.current = currentBufferRef.current === "A" ? "B" : "A";

      // --- Step 3: Render ---
      ctx.fillStyle = GRAY;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const idx = (row * cols + col) * 4;
          const dispX = dst[idx];
          const dispY = dst[idx + 1];
          const vel = dst[idx + 2] + dst[idx + 3];

          const shade = Math.max(0.15, Math.min(1, opacity + vel * shadeStrength));
          ctx.globalAlpha = fade * shade;

          const barW = cellW - gap;
          const barH = cellH - gap;
          const x = col * cellW + (cellW - barW) / 2 + dispX * fade;
          const y = row * cellH + gap / 2 + dispY * fade;

          ctx.fillRect(x, y, barW, barH);
        }
      }

      // Clear a white zone behind the text for readability (only when hovered)
      if (fade > 0.01) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = "white";
        const textEl = button.querySelector("[data-text]");
        if (textEl) {
          const btnRect = button.getBoundingClientRect();
          const textRect = textEl.getBoundingClientRect();
          const tx = textRect.left - btnRect.left - BORDER - textPadX;
          const ty = textRect.top - btnRect.top - BORDER - textPadY;
          const tw = textRect.width + textPadX * 2;
          const th = textRect.height + textPadY * 2;
          ctx.fillRect(tx, ty, tw, th);
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function handleHoverStart(e) {
    const rect = buttonRef.current.getBoundingClientRect();
    cursorRef.current = {
      x: e.clientX - rect.left - BORDER,
      y: e.clientY - rect.top - BORDER,
      vx: 0,
      vy: 0,
      lastTime: performance.now(),
    };
    setHovered(true);
  }

  function handleTouchStart(e) {
    const touch = e.touches[0];
    if (!touch || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    cursorRef.current = {
      x: touch.clientX - rect.left - BORDER,
      y: touch.clientY - rect.top - BORDER,
      vx: 0,
      vy: 0,
      lastTime: performance.now(),
    };
    setHovered(true);
  }

  return (
    <motion.a
      ref={buttonRef}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onHoverStart={handleHoverStart}
      onHoverEnd={() => setHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={() => setHovered(false)}
      className="relative inline-block border border-gray-900 px-16 py-12 md:px-44 md:py-24 text-sm font-semibold tracking-wide text-gray-900 leading-none overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
      />
      <span data-text className="relative z-10">{children}</span>
    </motion.a>
  );
}
