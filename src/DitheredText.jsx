import { useState, useEffect, useRef } from "react";

const GLYPHS = ["$", "@", "#", "%", "&", "*", "~", "+"];

function dither(text, amount = 0.3) {
  return text.split("").map((char) => {
    if (char === " ") return " ";
    if (Math.random() < amount) {
      return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    }
    return char;
  }).join("");
}

export default function DitheredText({
  text,
  href,
  className = "",
  interval = 200,
  amount = 0.3,
  speed = 50,
  burstCount = 3,
}) {
  const [display, setDisplay] = useState(() => dither(text, amount));
  const timeoutRef = useRef(null);

  useEffect(() => {
    const runBurst = () => {
      let frame = 0;
      const tick = () => {
        setDisplay(dither(text, amount));
        frame++;
        if (frame < burstCount) {
          timeoutRef.current = setTimeout(tick, speed);
        }
      };
      tick();
    };

    // Initial burst
    runBurst();

    const id = setInterval(runBurst, interval);
    return () => {
      clearInterval(id);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [text, interval, amount, speed, burstCount]);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`pointer-events-auto cursor-pointer ${className}`}
    >
      {display}
    </a>
  );
}
