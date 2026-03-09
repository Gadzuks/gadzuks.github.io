import { useState, useRef, useMemo } from "react";
import { useDialKit } from "dialkit";
import DraggablePhoto from "./DraggablePhoto";
import DitheredText from "./DitheredText";
import ScrollCrab from "./ScrollCrab";
import BorderDrawButton from "./BorderDrawButton";
import SpaceNeedle from "./SpaceNeedle";
import Cloud from "./Cloud";
import WavyUnderline from "./WavyUnderline";

const ALL_PHOTOS = [
  { src: "/pictures/disc-golf-putt-oceanside-course.png", aspectRatio: "4 / 3" },
  { src: "/pictures/crabbing-on-the-beach-double-catch.png", aspectRatio: "3 / 4" },
  { src: "/pictures/hilltop-hike-ocean-vista.png", aspectRatio: "4 / 3" },
  { src: "/pictures/porch-steps-with-pumpkins-fall.png", aspectRatio: "4 / 3" },
  { src: "/pictures/pinnacle-rock-viewpoint-galapagos.png", aspectRatio: "3 / 4" },
  { src: "/pictures/groom-portrait-navy-suit-wedding-day.png", aspectRatio: "2 / 3" },
];

const SLOTS = [
  { width: "clamp(160px, 18vw, 340px)", left: "22%", top: "35%" },
  { width: "clamp(140px, 15vw, 280px)", left: "35%", top: "55%" },
  { width: "clamp(160px, 17vw, 320px)", left: "15%", top: "58%" },
];

function pickRandom3(photos) {
  const shuffled = [...photos].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3).map((photo, i) => ({ ...photo, ...SLOTS[i] }));
}

// Randomize on mount: rotation (-10 to 10 deg) and z-index order
function randomizePhotos(count) {
  const rotations = Array.from({ length: count }, () =>
    Math.round((Math.random() - 0.5) * 20)
  );
  // Shuffle z-index order so stacking varies per visit
  const indices = Array.from({ length: count }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const zIndices = indices.map((order) => 10 + order);
  return { rotations, zIndices };
}

export default function App() {
  const [nameHovered, setNameHovered] = useState(false);
  const zCounter = useRef(20);
  const experienceListRef = useRef(null);
  const photos = useMemo(() => pickRandom3(ALL_PHOTOS), []);
  const initial = useMemo(() => randomizePhotos(photos.length), []);

  const dials = useDialKit("Controls", {
    drag: {
      scale: [1.05, 1, 1.2, 0.01],
      hoverScale: [1.02, 1, 1.1, 0.01],
      elastic: [1, 0, 1, 0.1],
      power: [0.1, 0, 2, 0.1],
      timeConstant: [100, 100, 2000, 50],
      entranceStagger: [0.15, 0, 0.5, 0.01],
    },
    underline: {
      dotSize: [6.5, 1, 8, 0.5],
      dotGap: [4, 4, 20, 1],
      waveAmplitude: [3, 1, 8, 0.5],
      waveFrequency: [0.05, 0.05, 0.4, 0.01],
      waveSpeed: [2, 0.5, 6, 0.25],
    },
    dither: {
      interval: [750, 50, 2000, 50],
      amount: [0.05, 0, 1, 0.05],
      speed: [100, 10, 200, 10],
      burstCount: [3, 1, 10, 1],
    },
    crab: {
      wobbleMax: [8, 0, 20, 1],
      springStiffness: [200, 50, 400, 10],
      springDamping: [25, 5, 50, 1],
      idleNudge: [16, 0, 20, 1],
      idleInterval: [1500, 1000, 10000, 500],
    },
    btnGrid: {
      cols: [50, 10, 80, 1],
      rows: [20, 3, 30, 1],
      gap: [1.75, 0, 5, 0.25],
      opacity: [0.6, 0.1, 1, 0.05],
      textPadX: [8, 0, 20, 1],
      textPadY: [4, 0, 12, 1],
    },
    btnWater: {
      dropRadius: [60, 20, 200, 5],
      dropStrength: [0.65, 0.05, 2, 0.05],
      waveSpeed: [0.5, 0.5, 4, 0.1],
      damping: [0.965, 0.9, 0.999, 0.001],
      speedNorm: [300, 100, 1000, 50],
      shadeStrength: [0.5, 0, 10, 0.5],
    },
  });

  function bringToFront() {
    zCounter.current += 1;
    return zCounter.current;
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased overflow-x-hidden">
      <section className="min-h-screen relative">
        {/* Collage container */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          <div className="relative w-full h-full translate-x-[25%] -translate-y-[15%] md:translate-x-0 md:translate-y-0">
          {photos.map((photo, i) => (
            <DraggablePhoto
              key={photo.src}
              src={photo.src}
              initialRotation={initial.rotations[i]}
              entranceDelay={i * dials.drag.entranceStagger}
              dragScale={dials.drag.scale}
              hoverScale={dials.drag.hoverScale}
              dragElastic={dials.drag.elastic}
              dragPower={dials.drag.power}
              dragTimeConstant={dials.drag.timeConstant}
              photoStyle={{ ...photo, zIndex: initial.zIndices[i] }}
              onBringToFront={bringToFront}
            />
          ))}
          </div>
        </div>

        {/* Text content */}
        <div className="relative flex items-center min-h-screen md:justify-end px-6 md:px-16 lg:px-24 max-w-6xl mx-auto pointer-events-none">
          <div className="pt-[35vh] md:pt-0 md:w-1/2 md:pl-8">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              <a
                href="/JoeDeMaria_Resume.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="font-['Caveat'] pointer-events-auto cursor-pointer relative inline-block"
                onMouseEnter={() => setNameHovered(true)}
                onMouseLeave={() => setNameHovered(false)}
              >
                Joe DeMaria
                <WavyUnderline
                  className="absolute -bottom-5 left-0 w-full"
                  dotSize={dials.underline.dotSize}
                  dotGap={dials.underline.dotGap}
                  waveAmplitude={dials.underline.waveAmplitude}
                  waveFrequency={dials.underline.waveFrequency}
                  waveSpeed={dials.underline.waveSpeed}
                  hovered={nameHovered}
                />
              </a>
            </h1>
            <p className="mt-8 text-lg md:text-xl text-gray-600 leading-relaxed pointer-events-auto">
              I'm a Product Designer dedicated to building incredible user
              experiences. Working to transform marketing at{" "}
              <DitheredText
                text="Hightouch"
                href="https://hightouch.com"
                className="text-gray-600 hover:text-[#01C167] transition-colors duration-300"
                interval={dials.dither.interval}
                amount={dials.dither.amount}
                speed={dials.dither.speed}
                burstCount={dials.dither.burstCount}
              />.
            </p>
          </div>
        </div>
      </section>

      {/* Case Studies */}
      <section className="px-6 md:px-16 lg:px-24 max-w-6xl mx-auto py-32">
        <h2 className="text-sm font-semibold tracking-widest text-gray-900 border-b border-gray-900 inline-block pb-1 mb-20">
          CASE STUDIES
        </h2>

        <div className="space-y-0 divide-y divide-gray-200">
          <a
            href="https://medium.com/@jdemaria43/creating-signal-amongst-noise-the-evolution-of-apm-customer-experience-4085d42a658"
            target="_blank"
            rel="noopener noreferrer"
            className="group block py-12 first:pt-0"
          >
            <p className="text-sm text-gray-400 mb-3">New Relic</p>
            <h3 className="text-2xl md:text-4xl font-bold mb-3 group-hover:text-gray-500 transition-colors">
              The Evolution of APM Customer Experience
            </h3>
            <p className="text-gray-500">
              Redesigned summary tiles to surface actionable insights, increasing vulnerability management add-on conversion by over 400%.
            </p>
          </a>

          <a
            href="https://medium.com/@jdemaria43/social-media-management-product-design-c71e95f82c84"
            target="_blank"
            rel="noopener noreferrer"
            className="group block py-12"
          >
            <p className="text-sm text-gray-400 mb-3">Social Report</p>
            <h3 className="text-2xl md:text-4xl font-bold mb-3 group-hover:text-gray-500 transition-colors">
              Social Media Management Product Design
            </h3>
            <p className="text-gray-500">
              Designing a comprehensive social media management platform.
            </p>
          </a>
        </div>
      </section>

      {/* Experience */}
      <section className="px-6 md:px-16 lg:px-24 max-w-6xl mx-auto py-32">
        <div ref={experienceListRef} className="relative">
          <h2 className="text-sm font-semibold tracking-widest text-gray-900 border-b border-gray-900 inline-block pb-1 mb-4">
            EXPERIENCE
          </h2>
          <p className="text-gray-500 mb-4">Over a decade thinking about people and how I can make their life 1% better using technology.</p>

          <div className="relative h-8 mb-1">
            <ScrollCrab
              targetRef={experienceListRef}
              wobbleMax={dials.crab.wobbleMax}
              springStiffness={dials.crab.springStiffness}
              springDamping={dials.crab.springDamping}
              idleNudge={dials.crab.idleNudge}
              idleInterval={dials.crab.idleInterval}
              leftRange={["0%", "18%"]}
              size="text-lg md:text-xl"
              name="Clawdia"
              description="the eldest daughter, always trailing behind"
              font="font-serif italic"
            />
            <ScrollCrab
              targetRef={experienceListRef}
              wobbleMax={dials.crab.wobbleMax}
              springStiffness={dials.crab.springStiffness}
              springDamping={dials.crab.springDamping}
              idleNudge={dials.crab.idleNudge}
              idleInterval={dials.crab.idleInterval + 600}
              leftRange={["20%", "30%"]}
              sineOffset={0.2}
              size="text-3xl md:text-4xl"
              name="Big Pinch"
              description="the dad, won't be rushed"
              font="font-[Caveat] text-base"
            />
            <ScrollCrab
              targetRef={experienceListRef}
              wobbleMax={dials.crab.wobbleMax}
              springStiffness={dials.crab.springStiffness}
              springDamping={dials.crab.springDamping}
              idleNudge={dials.crab.idleNudge}
              idleInterval={dials.crab.idleInterval + 1100}
              leftRange={["33%", "55%"]}
              sineOffset={0.4}
              size="text-base md:text-lg"
              name="Scooter"
              description="the baby, fastest legs in the family"
              font="font-mono tracking-tight"
            />
            <ScrollCrab
              targetRef={experienceListRef}
              wobbleMax={dials.crab.wobbleMax}
              springStiffness={dials.crab.springStiffness}
              springDamping={dials.crab.springDamping}
              idleNudge={dials.crab.idleNudge}
              idleInterval={dials.crab.idleInterval + 400}
              leftRange={["58%", "72%"]}
              sineOffset={0.6}
              size="text-2xl md:text-3xl"
              name="Sandy"
              description="the mom, always a few steps ahead"
              font="font-sans tracking-widest uppercase text-xs"
            />
            <ScrollCrab
              targetRef={experienceListRef}
              wobbleMax={dials.crab.wobbleMax}
              springStiffness={dials.crab.springStiffness}
              springDamping={dials.crab.springDamping}
              idleNudge={dials.crab.idleNudge}
              idleInterval={dials.crab.idleInterval + 1500}
              leftRange={["75%", "90%"]}
              sineOffset={0.8}
              size="text-xl md:text-2xl"
              name="Shelby"
              description="the teen, out front pretending not to know them"
              font="font-serif"
            />
          </div>

          <div className="space-y-0 divide-y divide-gray-200">
          {[
            { company: "Hightouch", role: "Senior Product Designer", dates: "2025 – Present", url: "https://hightouch.com", brandColor: "#01C167" },
            { company: "DataRobot", role: "Staff Product Designer", dates: "2024 – 2025", url: "https://datarobot.com", brandColor: "#0736C4" },
            { company: "New Relic", role: "Senior → Lead Product Designer", dates: "2021 – 2024", url: "https://newrelic.com", brandColor: "#1CE783" },
            { company: "Pipeline CRM", role: "Product Designer", dates: "2019 – 2021", url: "https://pipelinecrm.com", brandColor: "#0076BC" },
          ].map((job) => (
            <a
              key={job.company}
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group py-6 flex justify-between items-baseline"
            >
              <div>
                <h3 className="font-bold text-lg transition-colors duration-200 group-hover:text-[var(--brand)]" style={{ "--brand": job.brandColor }}>{job.company}</h3>
                <p className="text-sm text-gray-500">{job.role}</p>
              </div>
              <p className="text-sm text-gray-400">{job.dates}</p>
            </a>
          ))}
          <div className="py-6">
            <p className="text-gray-400 text-sm">+ Social Report, VPGame, and Microsoft (contracts)</p>
          </div>
        </div>

          <div className="mt-16 text-center">
            <BorderDrawButton
              href="/JoeDeMaria_Resume.pdf"
              cols={dials.btnGrid.cols}
              rows={dials.btnGrid.rows}
              gap={dials.btnGrid.gap}
              opacity={dials.btnGrid.opacity}
              textPadX={dials.btnGrid.textPadX}
              textPadY={dials.btnGrid.textPadY}
              dropRadius={dials.btnWater.dropRadius}
              dropStrength={dials.btnWater.dropStrength}
              waveSpeed={dials.btnWater.waveSpeed}
              damping={dials.btnWater.damping}
              speedNorm={dials.btnWater.speedNorm}
              shadeStrength={dials.btnWater.shadeStrength}

            >
              VIEW MY RESUME
            </BorderDrawButton>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 px-6 md:px-16 lg:px-24 max-w-6xl mx-auto py-20">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-8">
          <div>
            <p className="text-sm font-semibold tracking-widest text-gray-400 mb-2">I'M AVAILABLE</p>
            <h2 className="text-4xl md:text-5xl font-bold font-['Caveat']">Let's Connect!</h2>
          </div>
          <div className="md:text-right">
            <a href="mailto:jdemaria43@gmail.com" className="text-lg font-semibold underline decoration-2 decoration-transparent hover:decoration-[#FFA745] transition-all duration-200">
              jdemaria43@gmail.com
            </a>
            <div className="flex items-center gap-2 mt-2 md:justify-end text-gray-500">
              <a href="https://linkedin.com/in/joedemaria" target="_blank" rel="noopener noreferrer" className="hover:text-[#2E77B5] underline decoration-2 decoration-transparent hover:decoration-[#2E77B5] transition-all duration-200">LinkedIn</a>
              <div className="relative overflow-hidden w-12 h-12 flex items-end justify-center pointer-events-none">
                {/* White knockout layer so clouds are occluded */}
                <SpaceNeedle size={42} className="text-white relative z-[5]" />
                {/* Visible needle on top */}
                <SpaceNeedle size={42} className="text-gray-400 absolute bottom-0 left-1/2 -translate-x-1/2 z-10" />
                <Cloud variant={0} size={14} filled className="absolute text-gray-400 z-[15]" style={{ top: 16, animationName: "cloud-drift", animationDuration: "14s", animationTimingFunction: "linear", animationIterationCount: "infinite" }} />
                <Cloud variant={2} size={10} className="absolute text-gray-400/70 z-[1]" style={{ top: 24, animationName: "cloud-drift", animationDuration: "20s", animationTimingFunction: "linear", animationIterationCount: "infinite", animationDelay: "-8s" }} />
              </div>
              <span>Seattle, WA</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
