# Project: joedemaria.com

Personal portfolio site for Joe DeMaria.

## Stack

- **Framework:** React 19 with Vite 7
- **Styling:** Tailwind CSS 4 (via `@tailwindcss/vite` plugin)
- **Animation:** Motion (framer-motion successor) + DialKit for tuning
- **Hosting:** GitHub Pages with custom domain (joedemaria.com)
- **Deploy:** GitHub Actions on push to `redesign` branch

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — preview production build locally

## Project Structure

- `src/` — React components and styles
- `public/` — static assets served at root (images, CNAME)
- `public/pictures/` — images (headshots, project mockups, favicon)

## Conventions

- Use Tailwind utility classes for styling; avoid custom CSS unless necessary
- Keep components in `src/` (flat structure for now, organize into folders as it grows)
- Static assets go in `public/`, referenced with absolute paths (e.g., `/pictures/foo.png`)
- Use Motion for animations, DialKit for tuning animation values during development

## Motion + Drag Rules

- Import from `"motion/react"` (not `"motion"`)
- Never set `transform` as a string on a `motion.div` — Motion owns `transform`
- Use CSS `translate` property for centering (separate from Motion's `transform`)
- Separate entrance animations and drag onto different `motion.div` layers (entrance on outer, drag on inner) — they fight over `x`/`y` if on the same element
- Parent z-index matters: children's `zIndex` can't escape a parent with `z-index: auto`
- Use `pointer-events-none` on containers, `pointer-events: auto` on individual interactive items
- Use `overflow-x-hidden` on root (not `overflow-hidden` on sections) so dragged items can escape their section
- Expose all animation values through DialKit in the parent component, pass as props to children
