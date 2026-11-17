import { useState } from "react";
import { motion } from "motion/react";

export default function DraggablePhoto({
  src340,
  src680,
  placeholder,
  initialRotation,
  dragScale,
  hoverScale,
  dragElastic,
  dragPower,
  dragTimeConstant,
  photoStyle,
  onBringToFront,
}) {
  const [zIndex, setZIndex] = useState(photoStyle.zIndex ?? 1);
  const [loaded, setLoaded] = useState(false);

  function handleDragStart() {
    if (onBringToFront) {
      const newZ = onBringToFront();
      setZIndex(newZ);
    }
  }

  return (
    // Outer: positioning + centering (CSS translate). A cursor drags the photo
    // in and drops it (`data-build="carry"`), so there is no entrance here.
    <div
      className="absolute"
      data-build="carry"
      data-play="nudge"
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
        className="relative rounded-2xl overflow-hidden shadow-xl cursor-grab active:cursor-grabbing select-none touch-none"
        style={{
          aspectRatio: photoStyle.aspectRatio,
          rotate: initialRotation,
        }}
      >
        {/* Blur placeholder — renders instantly from base64 */}
        <img
          src={placeholder}
          alt=""
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            filter: "blur(20px)",
            transform: "scale(1.1)",
            opacity: loaded ? 0 : 1,
            transition: "opacity 0.4s ease-out",
          }}
        />
        {/* Real image with responsive srcset */}
        <img
          srcSet={`${src340} 340w, ${src680} 680w`}
          sizes={photoStyle.width}
          alt=""
          draggable={false}
          onLoad={() => setLoaded(true)}
          className="w-full h-full object-cover"
          style={{
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.4s ease-out",
          }}
        />
      </motion.div>
    </div>
  );
}
