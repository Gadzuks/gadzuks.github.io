const CLOUDS = [
  {
    // Fluffy cloud (from SVG top-right)
    viewBox: "31 6.5 9 5",
    path: "M32.882,11H38.5a.457.457,0,0,0,.129-.018,1.536,1.536,0,0,0-.055-3.053,2.566,2.566,0,0,0-4.687-.87,1.193,1.193,0,0,0-.767.373A1.8,1.8,0,1,0,32.882,11Z",
  },
  {
    // Round cloud (from SVG bottom-left)
    viewBox: "9.5 37 6 4.5",
    path: "M13.33,37.778a2,2,0,0,0-3.537.808A1.25,1.25,0,0,0,10.25,41h3.375a1.627,1.627,0,0,0,1.625-1.625A1.647,1.647,0,0,0,13.33,37.778Z",
  },
  {
    // Wispy cloud (from SVG right side)
    viewBox: "33.5 30.5 6 4",
    path: "M38.578,31.845a1.748,1.748,0,0,0-3.054-.7,1.455,1.455,0,0,0-1.649,1.422A1.439,1.439,0,0,0,35.313,34h2.812a1.125,1.125,0,0,0,.453-2.155Z",
  },
];

export default function Cloud({ variant = 0, size = 20, filled = false, className = "", style }) {
  const cloud = CLOUDS[variant];
  return (
    <svg
      viewBox={cloud.viewBox}
      width={size}
      height={size * 0.55}
      fill={filled ? "white" : "none"}
      stroke="currentColor"
      strokeWidth={0.3}
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={style}
    >
      <path d={cloud.path} />
    </svg>
  );
}
