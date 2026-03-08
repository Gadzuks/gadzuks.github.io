import { useState, useEffect } from "react";

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

export default function DitheredText({ text, href, className = "", interval = 200, amount = 0.3 }) {
  const [display, setDisplay] = useState(() => dither(text, amount));

  useEffect(() => {
    const id = setInterval(() => {
      setDisplay(dither(text, amount));
    }, interval);
    return () => clearInterval(id);
  }, [text, interval, amount]);

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
