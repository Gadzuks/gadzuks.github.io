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
}) {
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start end", "end start"],
  });

  // Vertical position: 0% to 100% of the container
  const top = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  // Scroll-driven wobble: sine wave based on scroll position
  // As the crab travels down, it rocks back and forth
  const scrollRotate = useTransform(
    scrollYProgress,
    (progress) => Math.sin(progress * Math.PI * 6) * wobbleMax
  );

  // Idle nudge: occasional random impulse
  const idleRotate = useMotionValue(0);
  const idleTimer = useRef(null);

  useEffect(() => {
    idleTimer.current = setInterval(() => {
      const nudge = (Math.random() - 0.5) * 2 * idleNudge;
      idleRotate.set(nudge);
      // Reset after a moment so spring decays back to 0
      setTimeout(() => idleRotate.set(0), 300);
    }, idleInterval);

    return () => clearInterval(idleTimer.current);
  }, [idleNudge, idleInterval, idleRotate]);

  // Combine scroll + idle rotation into one spring
  const combinedRotate = useTransform(
    [scrollRotate, idleRotate],
    ([scroll, idle]) => scroll + idle
  );
  const rotate = useSpring(combinedRotate, {
    stiffness: springStiffness,
    damping: springDamping,
  });

  return (
    <motion.div
      style={{ top, rotate }}
      className="absolute -left-8 md:-left-12 text-2xl md:text-3xl select-none pointer-events-none"
      aria-hidden="true"
    >
      🦀
    </motion.div>
  );
}
