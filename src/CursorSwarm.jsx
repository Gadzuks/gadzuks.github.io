import { useEffect, useLayoutEffect, useMemo, useRef } from "react";

// Colored cursors that "build" the page.
//
// Every element marked `data-build` starts hidden. The first time it scrolls
// into view, one cursor flies in from the side, builds it, and leaves again.
// The attribute's value picks how it is built:
//
//   data-build="box"    drag out a selection box; the element appears inside
//   data-build="type"   type the text out line by line behind a text caret
//   data-build="write"  like type, with a handwriting wobble
//   data-build="stamp"  click, and the element pops into place
//   data-build="hop"    hop along the element's children, popping each one in
//   data-build="carry"  drag the element in from off screen and drop it
//
// After building, the cursor plays with anything inside marked `data-play`:
//
//   data-play="click"  poke a couple of them (calls their click handler, and
//                      shows any `data-play-tip` tooltip inside while there)
//   data-play="sweep"  hover back and forth along it
//   data-play="swirl"  hover in a figure-eight inside it
//   data-play="nudge"  give it a little wiggle
//
// Elements on screen at load are built at an unhurried pace; everything
// reached by scrolling is built faster (`scrollSpeed`).
//
// Motion values would mean dozens of springs re-targeted every frame, so this
// runs its own small spring loop and writes styles directly. It only touches
// plain elements and CSS properties Motion doesn't own (`scale`, `clip-path`).

const COLORS = [
  "#e5484d", "#f76b15", "#f5b800", "#46a758",
  "#12a594", "#3e63dd", "#8e4ec6", "#d6409f",
];

// Arrow tip inside the 24px cursor box
const TIP_X = 4;
const TIP_Y = 2.5;

const HANDLES = [
  "-left-[3px] -top-[3px]",
  "-right-[3px] -top-[3px]",
  "-left-[3px] -bottom-[3px]",
  "-right-[3px] -bottom-[3px]",
];

const POP = "scale 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)";

const rand = (min, max) => min + Math.random() * (max - min);
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (u) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2);
const easeOutBack = (u) => 1 + 2.4 * (u - 1) ** 3 + 1.4 * (u - 1) ** 2;

const center = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

// Scale an element up from nothing with a little overshoot
function pop(el) {
  el.style.transition = POP;
  el.style.scale = "";
  setTimeout(() => {
    el.style.transition = "";
  }, 500);
}

// Undo everything a build may have set, leaving the element as authored
function reveal(el) {
  for (const node of [el, ...el.children]) {
    node.style.scale = "";
  }
  el.style.visibility = "";
  el.style.clipPath = "";
  el.style.transform = "";
}

// The element's rendered lines of text, relative to its own box
function textLines(el, r) {
  const lines = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  while (walker.nextNode()) {
    range.selectNodeContents(walker.currentNode);
    for (const q of range.getClientRects()) {
      if (q.width < 1 || q.height < 1) continue;
      const line = lines.find(
        (l) => Math.min(l.bottom, q.bottom) - Math.max(l.top, q.top) > Math.min(l.bottom - l.top, q.height) * 0.5
      );
      if (line) {
        line.left = Math.min(line.left, q.left);
        line.right = Math.max(line.right, q.right);
        line.top = Math.min(line.top, q.top);
        line.bottom = Math.max(line.bottom, q.bottom);
      } else {
        lines.push({ left: q.left, right: q.right, top: q.top, bottom: q.bottom });
      }
    }
  }
  if (!lines.length) return [{ left: 0, right: r.width, top: 0, bottom: r.height }];
  return lines
    .sort((a, b) => a.top - b.top)
    .map((l) => ({ left: l.left - r.left, right: l.right - r.left, top: l.top - r.top, bottom: l.bottom - r.top }));
}

// Each mode: where the cursor heads first (`anchor`), how long the build takes
// at the opening pace (`dur`), and what happens as it runs (`begin`/`step`/`end`).
// `step` moves the cursor by setting cu.x / cu.y.
const typeMode = {
  caret: true,
  prep(job, r) {
    job.lines = textLines(job.el, r);
    job.total = job.lines.reduce((sum, l) => sum + l.right - l.left, 0);
    job.wobble = job.mode === "write" ? 3 : 0;
  },
  anchor(job, r) {
    const l = job.lines[0];
    return { x: r.left + l.left, y: r.top + (l.top + l.bottom) / 2 };
  },
  dur: (job) => clamp(300 + job.total * 1.5, 500, 1900),
  begin(job) {
    job.el.style.clipPath = "inset(0 100% 100% 0)";
    job.el.style.visibility = "";
  },
  step(job, r, u, cu) {
    const { lines } = job;
    let dist = u * job.total;
    let i = 0;
    while (i < lines.length - 1 && dist > lines[i].right - lines[i].left) {
      dist -= lines[i].right - lines[i].left;
      i++;
    }
    const line = lines[i];
    const fx = line.left + Math.min(dist, line.right - line.left);
    // Everything above the current line, plus the current line up to the caret.
    // The bleed keeps underlines and descenders outside the box visible.
    const bleed = 30;
    const y1 = i === 0 ? -bleed : line.top;
    const y2 = i === lines.length - 1 ? r.height + bleed : lines[i + 1].top;
    const right = r.width + bleed;
    job.el.style.clipPath =
      `polygon(${-bleed}px ${-bleed}px, ${right}px ${-bleed}px, ${right}px ${y1}px, ${fx}px ${y1}px, ${fx}px ${y2}px, ${-bleed}px ${y2}px)`;
    cu.x = r.left + fx;
    cu.y = r.top + (line.top + line.bottom) / 2 + Math.sin(fx / 9) * job.wobble;
    cu.caretHeight = line.bottom - line.top;
  },
  end(job) {
    job.el.style.clipPath = "";
  },
};

const MODES = {
  box: {
    anchor: (job, r) => ({ x: r.left, y: r.top }),
    dur: (job, r) => clamp(350 + Math.hypot(r.width, r.height) * 0.8, 550, 1300),
    begin(job, r, boxes) {
      const box = document.createElement("div");
      box.className =
        "absolute left-0 top-0 border border-dashed border-blue-500 transition-opacity duration-300";
      for (const pos of HANDLES) {
        const handle = document.createElement("div");
        handle.className = `absolute ${pos} w-[5px] h-[5px] bg-white border border-blue-500`;
        box.appendChild(handle);
      }
      job.label = document.createElement("div");
      job.label.className =
        "absolute right-0 top-full mt-1.5 px-1.5 py-0.5 rounded bg-blue-500 text-white text-[10px] leading-none font-medium whitespace-nowrap tabular-nums";
      box.appendChild(job.label);
      boxes.appendChild(box);
      job.box = box;
      job.el.style.clipPath = "inset(0 100% 100% 0)";
      job.el.style.visibility = "";
    },
    place(job, r, w, h) {
      job.box.style.transform = `translate3d(${r.left}px, ${r.top}px, 0)`;
      job.box.style.width = `${w}px`;
      job.box.style.height = `${h}px`;
    },
    step(job, r, u, cu) {
      const e = easeInOut(u);
      const w = r.width * e;
      const h = r.height * e;
      this.place(job, r, w, h);
      job.label.textContent = `${Math.round(w)} × ${Math.round(h)}`;
      job.el.style.clipPath = `inset(0 ${r.width - w}px ${r.height - h}px 0)`;
      cu.x = r.left + w;
      cu.y = r.top + h;
    },
    end(job) {
      job.el.style.clipPath = "";
    },
    hold(job, r) {
      this.place(job, r, r.width, r.height);
    },
    finish(job) {
      const { box } = job;
      box.style.opacity = "0";
      setTimeout(() => box.remove(), 320);
    },
  },

  type: typeMode,
  write: typeMode,

  stamp: {
    anchor: (job, r) => center(r),
    dur: () => 450,
    begin(job) {
      job.el.style.scale = "0";
      job.el.style.visibility = "";
    },
    step(job, r, u, cu) {
      const c = center(r);
      cu.x = c.x;
      cu.y = c.y;
      if (u < 0.35) cu.press = 0.72;
      else if (!job.popped) {
        job.popped = true;
        pop(job.el);
      }
    },
    end(job) {
      if (!job.popped) pop(job.el);
    },
  },

  hop: {
    prep(job) {
      job.kids = [...job.el.children];
      job.next = 0;
    },
    anchor: (job, r) => (job.kids[0] ? center(job.kids[0].getBoundingClientRect()) : center(r)),
    dur: (job) => 300 * Math.max(1, job.kids.length),
    begin(job) {
      job.kids.forEach((kid) => {
        kid.style.scale = "0";
      });
      job.el.style.visibility = "";
    },
    popUpTo(job, count) {
      while (job.next < count) pop(job.kids[job.next++]);
    },
    step(job, r, u, cu) {
      const n = job.kids.length;
      if (!n) return;
      const pos = u * n;
      const i = Math.min(n - 1, Math.floor(pos));
      const f = pos - i;
      const to = center(job.kids[i].getBoundingClientRect());
      const from = i > 0 ? center(job.kids[i - 1].getBoundingClientRect()) : to;
      const m = easeInOut(Math.min(1, f / 0.55));
      cu.x = lerp(from.x, to.x, m);
      // A little arc between stops
      cu.y = lerp(from.y, to.y, m) - Math.sin(m * Math.PI) * (i > 0 ? 14 : 0);
      if (f >= 0.55 && f < 0.8) cu.press = 0.72;
      this.popUpTo(job, f >= 0.6 ? i + 1 : i);
    },
    end(job) {
      this.popUpTo(job, job.kids.length);
    },
  },

  carry: {
    // The cursor arrives already holding the element, so there is no approach
    noGo: true,
    dur: () => 1000,
    begin(job, r) {
      const fromLeft = r.left + r.width / 2 < window.innerWidth / 2;
      job.dx = fromLeft ? -(r.right + 60) : window.innerWidth - r.left + 60;
      job.dy = rand(-140, 140);
      job.tilt = rand(8, 16) * (Math.random() < 0.5 ? -1 : 1);
      job.gx = rand(-0.15, 0.15) * r.width;
      job.gy = rand(-0.15, 0.15) * r.height;
      job.el.style.transform = `translate(${job.dx}px, ${job.dy}px) rotate(${job.tilt}deg)`;
      job.el.style.visibility = "";
    },
    step(job, r, u, cu) {
      // Overshoots its spot slightly and settles, like being tossed down
      const k = 1 - easeOutBack(u);
      job.el.style.transform = `translate(${job.dx * k}px, ${job.dy * k}px) rotate(${job.tilt * k}deg)`;
      const c = center(job.el.getBoundingClientRect());
      cu.x = c.x + job.gx;
      cu.y = c.y + job.gy;
    },
    end(job) {
      job.el.style.transform = "";
    },
  },
};

// Synthetic hover, so the cursors can set off the page's own hover effects.
// React's onMouseEnter listens for mouseover/mouseout; Motion's hover and
// plain listeners use the pointer events.
function fire(target, type, x, y) {
  const init = {
    bubbles: !/enter|leave/.test(type),
    clientX: x,
    clientY: y,
    pointerType: "mouse",
    isPrimary: true,
    view: window,
  };
  target.dispatchEvent(type.startsWith("pointer") ? new PointerEvent(type, init) : new MouseEvent(type, init));
}

function hoverPlay(dur, path) {
  return {
    dur: () => dur,
    begin(job, cu) {
      const [target] = job.targets;
      fire(target, "pointerenter", cu.x, cu.y);
      fire(target, "mouseover", cu.x, cu.y);
    },
    step(job, u, cu) {
      const [target] = job.targets;
      const p = path(target.getBoundingClientRect(), u);
      cu.x = p.x;
      cu.y = p.y;
    },
    // Runs after the lead-in blend, so the page sees where the cursor really is
    after(job, cu) {
      fire(job.targets[0], "pointermove", cu.x, cu.y);
    },
    end(job, cu) {
      const [target] = job.targets;
      fire(target, "pointerleave", cu.x, cu.y);
      fire(target, "mouseout", cu.x, cu.y);
    },
  };
}

// What a cursor does with `data-play` elements once the build is finished.
// These run in real time, not sped up, so the reaction has time to show.
const PLAYS = {
  click: {
    pick: (targets) => [...targets].sort(() => Math.random() - 0.5).slice(0, 2),
    dur: (job) => 1000 * job.targets.length,
    // Show one target's `data-play-tip` (its tooltip) at a time
    tip(job, el) {
      if (job.tipEl === el) return;
      if (job.tipEl) job.tipEl.style.opacity = "";
      if (el) el.style.opacity = "1";
      job.tipEl = el;
    },
    step(job, u, cu) {
      const n = job.targets.length;
      const pos = u * n;
      const i = Math.min(n - 1, Math.floor(pos));
      const f = pos - i;
      const to = center(job.targets[i].getBoundingClientRect());
      const from = i > 0 ? center(job.targets[i - 1].getBoundingClientRect()) : to;
      const m = easeInOut(Math.min(1, f / 0.35));
      cu.x = lerp(from.x, to.x, m);
      cu.y = lerp(from.y, to.y, m) - Math.sin(m * Math.PI) * (i > 0 ? 18 : 0);
      // Hover (tooltip), then click, then linger so the name can be read
      this.tip(job, f >= 0.3 ? job.targets[i].querySelector("[data-play-tip]") : null);
      if (f >= 0.45 && f < 0.6) cu.press = 0.72;
      if (f >= 0.5 && job.clicked !== i) {
        job.clicked = i;
        job.targets[i].click();
      }
    },
    end(job) {
      this.tip(job, null);
    },
  },

  // Right edge to left edge and back, along the bottom
  sweep: hoverPlay(1500, (r, u) => ({
    x: r.left + r.width * (0.5 + 0.5 * Math.cos(u * Math.PI * 2)),
    y: r.bottom - 6,
  })),

  // A figure-eight through the middle
  swirl: hoverPlay(1900, (r, u) => ({
    x: r.left + r.width * (0.5 + 0.3 * Math.sin(u * Math.PI * 3)),
    y: r.top + r.height * (0.5 + 0.25 * Math.sin(u * Math.PI * 6)),
  })),

  nudge: {
    dur: () => 650,
    step(job, u, cu) {
      const [target] = job.targets;
      target.style.transform = `rotate(${Math.sin(u * Math.PI * 3) * 5 * (1 - u)}deg)`;
      const c = center(target.getBoundingClientRect());
      cu.x = c.x + (job.gx ?? 0);
      cu.y = c.y + (job.gy ?? 0);
    },
    end(job) {
      job.targets[0].style.transform = "";
    },
  },
};

// Which cursor icon the page would show at the cursor's position
function hoverGlyph(cu) {
  const el = document.elementFromPoint(cu.x, cu.y);
  if (!el) return "arrow";
  const cursor = getComputedStyle(el).cursor;
  if (cursor === "grab" || cursor === "grabbing") return cursor;
  if (cursor === "pointer" || (cursor === "auto" && el.closest("a[href], button"))) return "hand";
  return "arrow";
}

function playTargets(el) {
  return el.matches("[data-play]") ? [el] : [...el.querySelectorAll("[data-play]")];
}

export default function CursorSwarm({
  maxCursors = 10,
  stiffness = 45,
  damping = 10,
  cursorSize = 1,
  buildSpeed = 1,
  scrollSpeed = 2,
  buildSelector = "[data-build]",
}) {
  const boxesRef = useRef(null);
  const cursorsRef = useRef(null);
  const cfg = useRef({});

  // Size of the cursor pool (the most that can be building at once).
  // None for reduced motion, so the page just shows normally.
  const n = useMemo(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return 0;
    return Math.round(maxCursors);
  }, [maxCursors]);

  // Live dial values, read by the loop every frame
  useEffect(() => {
    cfg.current = { stiffness, damping, cursorSize, buildSpeed, scrollSpeed };
  });

  // Layout effect so buildable elements are hidden before the first paint.
  useLayoutEffect(() => {
    const boxes = boxesRef.current;
    if (!boxes || !cursorsRef.current || n === 0) return;

    const buildable = [...document.querySelectorAll(buildSelector)];
    const queue = [];
    let firstBatch = true; // the observer's first report = what's on screen at load
    let nextDispatch = 0;
    let running = false;
    let raf = 0;
    let last = performance.now();

    buildable.forEach((el) => {
      el.style.visibility = "hidden";
    });

    const cursors = [...cursorsRef.current.children].map((el) => ({
      el,
      glyphs: {
        arrow: el.children[0],
        caret: el.children[1],
        hand: el.children[2],
        grab: el.children[3],
        grabbing: el.children[4],
      },
      glyph: "arrow",
      caret: el.children[1],
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      s: 0,
      sv: 0,
      size: rand(0.9, 1.1),
      k: rand(0.8, 1.2),
      press: 1,
      caretHeight: 0,
      exitSpeed: 1,
      parked: true,
      exit: null,
      job: null,
    }));

    function setGlyph(cu, name) {
      if (cu.glyph === name) return;
      cu.glyph = name;
      for (const key in cu.glyphs) {
        cu.glyphs[key].style.display = key === name ? "block" : "none";
      }
    }

    // Give the next waiting element to a cursor: one already on screen and
    // free if there is one, otherwise one brought in from the side.
    function dispatch(now) {
      const item = queue[0];
      if (now - item.t > 6000) {
        // Never leave content hidden if no cursor got to it
        reveal(item.el);
        queue.shift();
        return;
      }
      const el = item.el;
      const mode = MODES[el.dataset.build] ? el.dataset.build : "box";
      const def = MODES[mode];
      const r = el.getBoundingClientRect();
      // Elements on screen at load get the opening pace; anything reached by
      // scrolling is built faster.
      const speed = item.opening ? 1 : 1.8 * cfg.current.scrollSpeed;
      const job = { el, mode, phase: "go", t0: now, speed };
      def.prep?.(job, r);
      const anchor = def.noGo ? null : def.anchor(job, r);

      let best = null;
      let bestDist = Infinity;
      const parked = [];
      for (const cu of cursors) {
        if (cu.job) continue;
        if (cu.parked) parked.push(cu);
        else if (anchor) {
          const dist = Math.hypot(cu.x - anchor.x, cu.y - anchor.y);
          if (dist < bestDist) {
            bestDist = dist;
            best = cu;
          }
        }
      }
      if (!best && parked.length) {
        best = parked[Math.floor(rand(0, parked.length))];
        if (anchor) {
          const w = window.innerWidth;
          const nearLeft = anchor.x < w / 2;
          const fromLeft = Math.random() < 0.75 ? nearLeft : !nearLeft;
          best.x = fromLeft ? -50 : w + 50;
          best.y = clamp(anchor.y + rand(-160, 160), 20, window.innerHeight - 20);
        }
        best.vx = 0;
        best.vy = 0;
        best.s = 0;
        best.sv = 0;
        best.parked = false;
      }
      if (!best) return; // every cursor is busy; try again next frame

      if (def.noGo) {
        job.phase = "work";
        job.dur = def.dur(job, r) / (cfg.current.buildSpeed * speed);
        def.begin(job, r, boxes);
      }
      best.exit = null;
      best.job = job;
      queue.shift();
      nextDispatch = now + 180 / speed;
    }

    function frame(now) {
      const dt = Math.min((now - last) / 1000, 1 / 30) || 1 / 60;
      last = now;
      const c = cfg.current;
      const vw = window.innerWidth;

      if (queue.length && now >= nextDispatch) dispatch(now);

      let active = 0;
      for (const cu of cursors) {
        if (cu.parked) continue;
        active++;
        cu.press = 1;
        let tx = null;
        let ty = null;
        let boost = 1;
        let glyph = "arrow";

        if (cu.job) {
          const job = cu.job;
          const def = MODES[job.mode];
          const r = job.el.getBoundingClientRect();
          if (job.phase === "go") {
            const a = def.anchor(job, r);
            tx = a.x;
            ty = a.y;
            // Spring travel time falls with the square root of stiffness
            boost = 1.8 * job.speed ** 2;
            if (Math.hypot(tx - cu.x, ty - cu.y) < 10 || now - job.t0 > 1800 / job.speed) {
              job.phase = "work";
              job.t0 = now;
              job.dur = def.dur(job, r) / (c.buildSpeed * job.speed);
              def.begin(job, r, boxes);
            }
          }
          if (job.phase === "work") {
            const u = Math.min(1, (now - job.t0) / job.dur);
            def.step(job, r, u, cu);
            // Typing shows a text caret, carrying a closed hand, and anything
            // else whatever the page would show there (a hand over links)
            if (def.caret) glyph = "caret";
            else if (job.mode === "carry") glyph = "grabbing";
            else if (job.mode !== "box") glyph = hoverGlyph(cu);
            if (def.caret) {
              cu.caret.style.height = `${cu.caretHeight}px`;
              cu.caret.style.top = `${TIP_Y - cu.caretHeight / 2}px`;
            }
            tx = null;
            if (u >= 1) {
              def.end(job);
              const targets = playTargets(job.el);
              const play = targets.length ? PLAYS[targets[0].dataset.play] : null;
              job.t0 = now;
              if (play) {
                // Built: now play with it
                def.finish?.(job);
                job.finished = true;
                job.phase = "play";
                job.play = play;
                job.targets = play.pick ? play.pick(targets) : targets;
                job.dur = play.dur(job);
                job.px = cu.x;
                job.py = cu.y;
                play.begin?.(job, cu);
              } else {
                job.phase = "done";
                job.ox = cu.x - r.left;
                job.oy = cu.y - r.top;
              }
            }
          } else if (job.phase === "play") {
            const u = Math.min(1, (now - job.t0) / job.dur);
            job.play.step(job, u, cu);
            // Ease from where the build ended into the play's path
            const lead = easeInOut(Math.min(1, u / 0.15));
            cu.x = lerp(job.px, cu.x, lead);
            cu.y = lerp(job.py, cu.y, lead);
            job.play.after?.(job, cu);
            glyph = job.play === PLAYS.nudge ? "grabbing" : hoverGlyph(cu);
            if (u >= 1) {
              job.play.end?.(job, cu);
              job.phase = "done";
              job.t0 = now;
              job.ox = cu.x - r.left;
              job.oy = cu.y - r.top;
            }
          } else if (job.phase === "done") {
            // Rest on the finished element for a beat
            cu.x = r.left + job.ox;
            cu.y = r.top + job.oy;
            if (!job.finished) def.hold?.(job, r);
            glyph = hoverGlyph(cu);
            if (now - job.t0 > 400 / job.speed) {
              if (!job.finished) def.finish?.(job);
              cu.exitSpeed = job.speed;
              cu.job = null;
            }
          }
        } else {
          // Nothing to do: wait a beat, then head off the nearest side
          if (!cu.exit) {
            cu.exit = {
              x: cu.x < vw / 2 ? -70 : vw + 70,
              y: cu.y + rand(-140, 140),
              at: now + rand(120, 450) / cu.exitSpeed,
            };
          }
          if (now < cu.exit.at) {
            tx = cu.x;
            ty = cu.y;
          } else {
            tx = cu.exit.x;
            ty = cu.exit.y;
            boost = cu.exitSpeed ** 2;
          }
          if (cu.x < -40 || cu.x > vw + 40) {
            cu.parked = true;
            cu.exit = null;
            cu.el.style.opacity = "0";
            active--;
            continue;
          }
        }

        if (tx === null) {
          // Position was set directly this frame
          cu.vx = 0;
          cu.vy = 0;
        } else {
          // Capped so very high speeds can't make the spring overshoot wildly
          const k = Math.min(c.stiffness * cu.k * boost, 2500);
          const d = Math.min(c.damping * Math.sqrt(boost), 70);
          cu.vx += (k * (tx - cu.x) - d * cu.vx) * dt;
          cu.vy += (k * (ty - cu.y) - d * cu.vy) * dt;
          cu.x += cu.vx * dt;
          cu.y += cu.vy * dt;
        }

        const scaleTo = cu.size * c.cursorSize * cu.press;
        cu.sv += (260 * (scaleTo - cu.s) - 17 * cu.sv) * dt;
        cu.s = Math.max(0, cu.s + cu.sv * dt);
        setGlyph(cu, glyph);
        cu.el.style.opacity = "1";
        cu.el.style.transform = `translate3d(${cu.x - TIP_X}px, ${cu.y - TIP_Y}px, 0) scale(${cu.s})`;
      }

      // Sleep while every cursor is off screen and nothing is waiting
      if (active === 0 && queue.length === 0) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(frame);
    }

    function wake() {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    // Queue each element for building the first time it scrolls into view
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          io.unobserve(entry.target);
          queue.push({ el: entry.target, t: performance.now(), opening: firstBatch });
        }
        firstBatch = false;
        if (queue.length) wake();
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    buildable.forEach((el) => io.observe(el));

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      buildable.forEach(reveal);
      boxes.replaceChildren();
      cursors.forEach((cu) => {
        cu.el.style.opacity = "0";
        setGlyph(cu, "arrow");
      });
    };
  }, [n, buildSelector]);

  return (
    <div aria-hidden="true" className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      <div ref={boxesRef} />
      <div ref={cursorsRef}>
        {Array.from({ length: n }, (_, i) => (
          <div
            key={i}
            className="absolute left-0 top-0 w-6 h-6 opacity-0 will-change-transform drop-shadow-[0_1px_2px_rgba(0,0,0,0.28)]"
            style={{ transformOrigin: `${TIP_X}px ${TIP_Y}px` }}
          >
            {/* Arrow */}
            <svg width="24" height="24" viewBox="0 0 24 24">
              <path
                d="M4 2.5v17.2l4.6-4.3 3 6.9 3.1-1.35-3-6.75h6.3z"
                fill={COLORS[i % COLORS.length]}
                stroke="#fff"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
            {/* Text caret, shown while typing */}
            <div
              className="absolute hidden w-[3px] rounded-full ring-1 ring-white"
              style={{ left: TIP_X - 1.5, background: COLORS[i % COLORS.length] }}
            />
            {/* Pointing hand, shown over links and other clickable things */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              className="absolute hidden"
              style={{ left: TIP_X - 11.5, top: TIP_Y - 2 }}
            >
              <path
                d="M10 3.5a1.5 1.5 0 0 1 3 0V10l5.2 1.1a2 2 0 0 1 1.6 2.2l-.7 5.2a3 3 0 0 1-3 2.5h-4.3a3 3 0 0 1-2.4-1.2L5.3 14.6a1.4 1.4 0 0 1 2.1-1.8L10 15z"
                fill={COLORS[i % COLORS.length]}
                stroke="#fff"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
            {/* Open hand, shown over draggable things */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              className="absolute hidden"
              style={{ left: TIP_X - 11.5, top: TIP_Y - 12 }}
            >
              <path
                d="M7 11V6.5a1.5 1.5 0 0 1 3 0V5a1.5 1.5 0 0 1 3 0v1a1.5 1.5 0 0 1 3 0v2a1.5 1.5 0 0 1 3 0v7a6 6 0 0 1-6 6h-1.5a6 6 0 0 1-4.6-2.2L3.6 14.8a1.5 1.5 0 0 1 2.3-1.9z"
                fill={COLORS[i % COLORS.length]}
                stroke="#fff"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
            {/* Closed hand, shown while carrying */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              className="absolute hidden"
              style={{ left: TIP_X - 11.5, top: TIP_Y - 14 }}
            >
              <path
                d="M7 12V9.5a1.5 1.5 0 0 1 3 0V9a1.5 1.5 0 0 1 3 0a1.5 1.5 0 0 1 3 0v.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1.5a6 6 0 0 1-4.6-2.2L4.6 16a1.5 1.5 0 0 1 2.4-1.8z"
                fill={COLORS[i % COLORS.length]}
                stroke="#fff"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}
