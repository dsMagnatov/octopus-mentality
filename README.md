# Octopus Mentality

Interactive two-screen site for a creative branding studio.

## Run locally

Requires Node.js 20.11 or newer. No dependencies or build step are needed.

```sh
node server.mjs
```

Open http://localhost:4173. Set the `PORT` environment variable to use another port.

## Design and interaction

- Anton headings and Manrope body copy, served locally.
- Red background (`#F52525`) and white headings (`#FFFFFF`).
- The patterned octopus is visible at first; a smooth brush reveals its white surface under the cursor.
- A white ribbon follows the cursor, with a uniform 250 px width at the reference size, rounded ends, and no taper.
- A 31-point following chain bends and catches up naturally, with a short delayed background trail.
- After stopping, the white reveal fades in 450 ms and the background ribbon in 690 ms.
- Text touched by the brush turns opaque white like the headings, without a shadow.
- Desktop layout and brush size scale from a 1920 × 1080 reference.
- Scrolling wipes the first screen's lines with its background color, erases the circle from the opposite side, and lifts text and octopus upward at staggered times.
- The second screen begins in the clay relief's base red (`#F72526`). Moving the cursor reveals the floral relief through broad, softly feathered organic patches.
- Each part of the clay trail fades independently over roughly two seconds. A slight image displacement follows its shading, giving the emerging relief a sense of depth.

The ribbon uses native WebGL for smooth, soft edges, with an SVG alpha mask revealing the white octopus. It falls back to a white SVG path if WebGL is unavailable. Animation stops completely once the ribbon fades. Its width and timing can be adjusted through the constants at the top of `app.js`.

The clay reveal has a separate native WebGL renderer in `clay-reveal.js`. Two small texture buffers retain and soften the cursor trail; a second shader blends the relief into the flat background. The renderer stops after 2.6 seconds of inactivity and clears when the section leaves the viewport. A blurred SVG mask provides a fallback without WebGL. `REVEAL_RADIUS` controls its soft outer extent, and `TRAIL_LIFETIME` controls the inactivity cutoff. No additional dependencies are required.

The motion is inspired by [React Bits Glow Cursor](https://www.reactbits.dev/animations/glow-cursor?trailLength=31) ([reference source](https://github.com/DavidHDev/react-bits/blob/main/src/content/Animations/GlowCursor/GlowCursor.jsx)). This project implements its own renderer and following chain in plain JavaScript, with no React, OGL, or runtime dependencies.

## Files

- `index.html`: page markup and SVG mask.
- `styles.css`: layout, typography, and colors.
- `app.js`: brush animation and navigation.
- `scene.js`: staggered scroll transition out of the first screen.
- `clay-reveal.js`: soft clay reveal, independent trail fading, and SVG fallback.
- `cursor-renderer.js`: WebGL ribbon rendering.
- `server.mjs`: local development server.
- `image 67.png`, `image 68.png`, `clay-relief.jpg`, `logo.svg`: artwork used by the page.
- `fonts/`: local font files and their SIL Open Font License notices.

Source mockups and unused 3D models are not required to run the site and are excluded from this repository. `clay-relief.jpg` is included because the second screen needs it.

The static page can also be hosted on a static web server without Node.js.
