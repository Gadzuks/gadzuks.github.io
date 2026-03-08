import { useState } from "react";
import { motion } from "motion/react";

export default function DraggablePhoto({
  src,
  initialRotation,
  entranceDelay,
  dragScale,
  hoverScale,
  dragElastic,
  dragPower,
  dragTimeConstant,
  photoStyle,
  onBringToFront,
}) {
  const [zIndex, setZIndex] = useState(photoStyle.zIndex ?? 1);

  function handleDragStart() {
    if (onBringToFront) {
      const newZ = onBringToFront();
      setZIndex(newZ);
    }
  }

  return (
    // Outer: positioning + centering (CSS translate) + entrance animation (Motion y)
    <motion.div
      className="absolute"
      initial={{
        y: "120vh",
        opacity: 0,
        scale: 0.8,
      }}
      animate={{
        y: 0,
        opacity: 1,
        scale: 1,
      }}
      transition={{
        type: "spring",
        stiffness: 180,
        damping: 20,
        mass: 1.2,
        delay: entranceDelay,
      }}
      style={{
        left: photoStyle.left,
        top: photoStyle.top,
        width: photoStyle.width,
        translate: "-50% -50%",
        zIndex,
        pointerEvents: "auto",
      }}
    >
      {/* Inner: drag + rotation + visual styling */}
      <motion.div
        drag
        dragElastic={dragElastic}
        dragTransition={{
          power: dragPower,
          timeConstant: dragTimeConstant,
        }}
        whileDrag={{
          scale: dragScale,
          boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
        }}
        whileHover={{ scale: hoverScale }}
        onDragStart={handleDragStart}
        draggable={false}
        className="rounded-2xl overflow-hidden shadow-xl cursor-grab active:cursor-grabbing select-none touch-none"
        style={{
          aspectRatio: photoStyle.aspectRatio,
          rotate: initialRotation,
        }}
      >
        <img
          src={src}
          alt=""
          draggable={false}
          className="w-full h-full object-cover"
        />
      </motion.div>
    </motion.div>
  );
}
