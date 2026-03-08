import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "motion/react";

const BORDER = 1;
const GRAY = "rgb(17,24,39)";

export default function BorderDrawButton({
  href,
  children,
  cols = 30,
  rows = 8,
  waveSpeed = 4,
  waveFreq = 0.08,
  amplitude = 3,
  damping = 0.02,
}) {
  const [hovered, setHovered] = useState(false);
  const buttonRef = useRef(null);
  const canvasRef = useRef(null);
  const cursorRef = useRef({ x: 0, y: 0 });
  const hoverStartRef = useRef(0); // timestamp of hover start
  const rafRef = useRef(null);
  const fadeRef = useRef(0);

  // Track cursor continuously while hovering
  useEffect(() => {
    const button = buttonRef.current;
    if (!button || !hovered) return;

    function onMove(e) {
      const rect = button.getBoundingClientRect();
      cursorRef.current = {
        x: e.clientX - rect.left - BORDER,
        y: e.clientY - rect.top - BORDER,
      };
    }

    button.addEventListener("pointermove", onMove);
    return () => button.removeEventListener("pointermove", onMove);
  }, [hovered]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const button = buttonRef.current;
    if (!canvas || !button) return;

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

    // Fade in/out
    const targetFade = hovered ? 1 : 0;
    fadeRef.current += (targetFade - fadeRef.current) * 0.1;
    const fade = fadeRef.current;

    if (fade < 0.01) {
      fadeRef.current = 0;
      return;
    }

    const now = performance.now();
    // Momentum decays continuously from hover start, resets on re-enter
    const timeSinceHover = (now - hoverStartRef.current) / 1000;
    const momentum = Math.exp(-timeSinceHover * 0.4); // settles over ~5-6s

    const elapsed = now / 1000; // use absolute time so wave is continuous
    const cursor = cursorRef.current;

    const cellW = w / cols;
    const cellH = h / rows;
    const gap = 1.5;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cx = (col + 0.5) * cellW;
        const cy = (row + 0.5) * cellH;

        const dx = cx - cursor.x;
        const dy = cy - cursor.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const wave = Math.sin(dist * waveFreq - elapsed * waveSpeed);
        const decay = Math.exp(-dist * damping);
        const displacement = wave * amplitude * decay * fade * momentum;

        const barW = Math.max(0.5, cellW - gap + displacement);
        const barH = cellH - gap;
        const x = col * cellW + (cellW - barW) / 2;
        const y = row * cellH + gap / 2;

        ctx.fillStyle = GRAY;
        ctx.globalAlpha = fade * 0.6;
        ctx.fillRect(x, y, barW, barH);
      }
    }

    // Clear a white zone behind the text for readability
    ctx.globalAlpha = 1;
    ctx.fillStyle = "white";
    const textPadX = 4;
    const textPadY = 2;
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

    rafRef.current = requestAnimationFrame(draw);
  }, [hovered, cols, rows, waveSpeed, waveFreq, amplitude, damping]);

  // Start/stop animation loop
  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [hovered, draw]);

  function handleHoverStart(e) {
    const rect = buttonRef.current.getBoundingClientRect();
    cursorRef.current = {
      x: e.clientX - rect.left - BORDER,
      y: e.clientY - rect.top - BORDER,
    };
    hoverStartRef.current = performance.now();
    setHovered(true);
  }

  // Keep animation running during fade-out
  useEffect(() => {
    if (!hovered && fadeRef.current > 0.01) {
      rafRef.current = requestAnimationFrame(draw);
    }
  }, [hovered, draw]);

  return (
    <motion.a
      ref={buttonRef}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onHoverStart={handleHoverStart}
      onHoverEnd={() => setHovered(false)}
      className="relative inline-block border border-gray-900 px-14 py-8 text-sm font-semibold tracking-wide text-gray-900 leading-none overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
      />
      <span data-text className="relative z-10">{children}</span>
    </motion.a>
  );
}
