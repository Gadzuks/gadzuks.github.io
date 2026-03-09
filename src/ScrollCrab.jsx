import { useEffect, useRef, useState, useCallback } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  useAnimate,
} from "motion/react";

// Click animation sequences per personality
const CLICK_ANIMATIONS = {
  // Clawdia — shy dip down and back up
  dip: async (animate) => {
    await animate("span.crab-emoji", { y: 8, scale: 0.85 }, { duration: 0.15 });
    await animate("span.crab-emoji", { y: 0, scale: 1 }, { type: "spring", stiffness: 400, damping: 10 });
  },
  // Big Pinch — stubborn side-to-side shake
  shake: async (animate) => {
    await animate("span.crab-emoji", { x: -6 }, { duration: 0.06 });
    await animate("span.crab-emoji", { x: 6 }, { duration: 0.06 });
    await animate("span.crab-emoji", { x: -4 }, { duration: 0.06 });
    await animate("span.crab-emoji", { x: 4 }, { duration: 0.06 });
    await animate("span.crab-emoji", { x: -2 }, { duration: 0.06 });
    await animate("span.crab-emoji", { x: 0 }, { duration: 0.06 });
  },
  // Scooter — zooms forward then zips back
  dash: async (animate) => {
    await animate("span.crab-emoji", { x: 40, scale: 1.1 }, { duration: 0.15, ease: "easeIn" });
    await animate("span.crab-emoji", { x: 0, scale: 1 }, { type: "spring", stiffness: 300, damping: 12 });
  },
  // Sandy — elegant 360 spin
  spin: async (animate) => {
    await animate("span.crab-emoji", { rotate: 360 }, { duration: 0.5, ease: [0.2, 0.8, 0.3, 1] });
    await animate("span.crab-emoji", { rotate: 0 }, { duration: 0 });
  },
  // Shelby — dramatic eye-roll tilt backward
  tilt: async (animate) => {
    await animate("span.crab-emoji", { rotate: -30, y: -4 }, { duration: 0.2 });
    await animate("span.crab-emoji", { rotate: 0, y: 0 }, { type: "spring", stiffness: 200, damping: 8 });
  },
};

export default function ScrollCrab({
  targetRef,
  wobbleMax,
  springStiffness,
  springDamping,
  idleNudge,
  idleInterval,
  leftRange = ["0%", "90%"],
  sineOffset = 0,
  size = "text-2xl md:text-3xl",
  name,
  font = "font-sans",
  clickAnimation,
  activeCrab,
  setActiveCrab,
}) {
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start end", "end start"],
  });

  // Horizontal position — scroll progress mapped to left %
  const left = useTransform(scrollYProgress, [0, 1], leftRange);

  // Scroll-driven wobble — sine wave, same as original vertical version
  const scrollRotate = useTransform(
    scrollYProgress,
    (progress) => Math.sin((progress + sineOffset) * Math.PI * 6) * wobbleMax
  );

  // Idle nudge — occasional random impulse
  const idleRotate = useMotionValue(0);
  const idleTimer = useRef(null);

  useEffect(() => {
    idleTimer.current = setInterval(() => {
      const nudge = (Math.random() - 0.5) * 2 * idleNudge;
      idleRotate.set(nudge);
      setTimeout(() => idleRotate.set(0), 300);
    }, idleInterval);

    return () => clearInterval(idleTimer.current);
  }, [idleNudge, idleInterval, idleRotate]);

  // Combine scroll wobble + idle nudge, smooth with spring
  const combined = useTransform(
    [scrollRotate, idleRotate],
    ([scroll, idle]) => scroll + idle
  );
  const rotate = useSpring(combined, {
    stiffness: springStiffness,
    damping: springDamping,
  });

  // Click animation via useAnimate
  const [scope, animate] = useAnimate();
  const [animating, setAnimating] = useState(false);
  const tapped = activeCrab === name;

  const isTouchRef = useRef(false);

  const handleClick = useCallback(async () => {
    if (animating || !clickAnimation || !CLICK_ANIMATIONS[clickAnimation]) return;
    // Only show sticky tooltip on touch devices
    if (isTouchRef.current) {
      setActiveCrab(name);
      isTouchRef.current = false;
    }
    setAnimating(true);
    try {
      await CLICK_ANIMATIONS[clickAnimation](animate);
    } finally {
      setAnimating(false);
    }
  }, [animating, clickAnimation, animate, name, setActiveCrab]);

  // Dismiss tooltip on scroll
  useEffect(() => {
    if (!tapped) return;
    function onScroll() {
      setActiveCrab(null);
    }
    window.addEventListener("scroll", onScroll, { passive: true, once: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [tapped, setActiveCrab]);

  return (
    <motion.div
      style={{ left, rotate }}
      className={`absolute top-0 ${size} select-none ${clickAnimation ? "cursor-pointer" : "cursor-default"} group`}
      ref={scope}
      onClick={handleClick}
      onTouchStart={() => { isTouchRef.current = true; }}
    >
      <span className="crab-emoji inline-block">🦀</span>
      {name && (
        <div className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-2 transition-opacity pointer-events-none ${tapped ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
          <div className="px-3 py-1.5 bg-gray-900 text-white rounded-lg shadow-lg whitespace-nowrap text-center">
            <div className={`${font}`}>{name}</div>
          </div>
          <div className="w-2 h-2 bg-gray-900 rotate-45 mx-auto -mt-1" />
        </div>
      )}
    </motion.div>
  );
}
