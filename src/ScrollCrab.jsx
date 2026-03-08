import { useEffect, useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
} from "motion/react";

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
  description,
  font = "font-sans",
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

  return (
    <motion.div
      style={{ left, rotate }}
      className={`absolute top-0 ${size} select-none cursor-default group`}
    >
      🦀
      {name && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="px-3 py-2 bg-gray-900 text-white rounded-lg shadow-lg whitespace-nowrap text-center">
            <div className={`${font} text-sm font-bold`}>{name}</div>
            {description && <div className="text-[10px] text-gray-400 mt-0.5">{description}</div>}
          </div>
          <div className="w-2 h-2 bg-gray-900 rotate-45 mx-auto -mt-1" />
        </div>
      )}
    </motion.div>
  );
}
