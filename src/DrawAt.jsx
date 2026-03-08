import { useRef, useState, useEffect } from "react";

export default function DrawAt({ className = "", drawing = false }) {
  const pathRef = useRef(null);
  const [length, setLength] = useState(0);

  useEffect(() => {
    if (pathRef.current) {
      setLength(pathRef.current.getTotalLength());
    }
  }, []);

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      style={{
        width: "0.85em",
        height: "0.85em",
        display: "inline-block",
        verticalAlign: "-0.1em",
        overflow: "visible",
      }}
    >
      <path
        ref={pathRef}
        d={`
          M 72 55
          C 72 35 62 20 50 20
          C 35 20 22 35 22 50
          C 22 65 35 80 50 80
          C 60 80 68 75 74 68
          M 72 55
          L 72 38
          C 72 38 62 30 55 38
          C 48 46 48 62 55 66
          C 62 70 72 62 72 55
          Z
        `}
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: length || 400,
          strokeDashoffset: drawing ? 0 : length || 400,
          transition: drawing
            ? "stroke-dashoffset 0.8s ease-out"
            : "stroke-dashoffset 0.3s ease-in",
        }}
      />
    </svg>
  );
}
