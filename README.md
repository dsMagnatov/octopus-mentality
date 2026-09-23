# Octopus Mentality

Interactive desktop landing page for a creative branding studio.

## Run locally

Requires Node.js 20.11 or newer. No dependencies or build step are needed.

```sh
node server.mjs
```

Open http://localhost:4173. Set the `PORT` environment variable to use another port.

## Design and interaction

- Anton headings and Manrope body copy, served locally.
- Red background (`#F52525`) and mint headings (`#92FFF6`).
- The patterned octopus is visible at first; a smooth brush reveals its white surface under the cursor.
- A white ribbon follows the cursor, with a uniform 250 px width at the reference size, rounded ends, and no taper.
- A 31-point following chain bends and catches up naturally, with a short delayed background trail.
- After stopping, the white reveal fades in 450 ms and the background ribbon in 690 ms.
- Text touched by the brush turns mint without a shadow.
- Desktop layout and brush size scale from a 1920 × 1080 reference.

The ribbon uses native WebGL for smooth, soft edges, with an SVG alpha mask revealing the white octopus. It falls back to a white SVG path if WebGL is unavailable. Animation stops completely once the ribbon fades. Its width and timing can be adjusted through the constants at the top of `app.js`.

The motion is inspired by [React Bits Glow Cursor](https://www.reactbits.dev/animations/glow-cursor?trailLength=31) ([reference source](https://github.com/DavidHDev/react-bits/blob/main/src/content/Animations/GlowCursor/GlowCursor.jsx)). This project implements its own renderer and following chain in plain JavaScript, with no React, OGL, or runtime dependencies.

## Files

- `index.html`: page markup and SVG mask.
- `styles.css`: layout, typography, and colors.
- `app.js`: brush animation and navigation.
- `cursor-renderer.js`: WebGL ribbon rendering.
- `server.mjs`: local development server.
- `image 67.png`, `image 68.png`, `logo.svg`: artwork used by the page.
- `fonts/`: local font files and their SIL Open Font License notices.

Source mockups and unused 3D models are not required to run the site and are excluded from this repository.

The static page can also be hosted on a static web server without Node.js.
