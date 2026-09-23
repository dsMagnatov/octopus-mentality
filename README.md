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
- The first screen's red background hides a white floral relief. Cursor movement reveals it through soft organic patches behind the octopus and typography.
- A 31-point following chain paints the octopus white with a uniform 250 px width at the reference size, rounded ends, and no taper.
- After stopping, the octopus's white reveal fades in 450 ms. Each part of the background relief fades independently over roughly two seconds.
- Text touched by the brush turns opaque white like the headings, without a shadow.
- Desktop layout and brush size scale from a 1920 × 1080 reference.
- Scrolling wipes the first screen's lines with its background color, erases the circle from the opposite side, and lifts text and octopus upward at staggered times.
- The second screen begins in the clay relief's base red (`#F72526`). Moving the cursor reveals the floral relief through broad, softly feathered organic patches.
- Both backgrounds use a stronger, bounded lift with subtle shading changes. Petals move together as they emerge and settle back without stretching their fine edges.

An SVG alpha mask reveals the white octopus. Its brush width and timing can be adjusted through the constants at the top of `app.js`.

Both relief backgrounds share the native WebGL renderer in `cursor-renderer.js`, configured by `clay-reveal.js`. Two small texture buffers per screen retain and soften the cursor trail; a second shader blends the relief into the flat background. The renderer stops after 2.6 seconds of inactivity and clears when the section leaves the viewport. The hero's reveal also clears at the start of its scroll transition. A blurred SVG mask provides a fallback without WebGL. `REVEAL_RADIUS` controls the soft outer extent, `TRAIL_LIFETIME` controls the inactivity cutoff, and the `depth` setting controls the rise. Reduced-motion mode disables the displacement and animated shading. No additional dependencies are required.

The motion is inspired by [React Bits Glow Cursor](https://www.reactbits.dev/animations/glow-cursor?trailLength=31) ([reference source](https://github.com/DavidHDev/react-bits/blob/main/src/content/Animations/GlowCursor/GlowCursor.jsx)). This project implements its own renderer and following chain in plain JavaScript, with no React, OGL, or runtime dependencies.

## Files

- `index.html`: page markup and SVG mask.
- `styles.css`: layout, typography, and colors.
- `app.js`: brush animation and navigation.
- `scene.js`: staggered scroll transition out of the first screen.
- `clay-reveal.js`: configuration for the white hero relief and red second-screen relief.
- `cursor-renderer.js`: shared WebGL relief renderer, independent trail fading, and SVG fallback.
- `server.mjs`: local development server.
- `image 67.png`, `image 68.png`, `white-relief.png`, `clay-relief.jpg`, `logo.svg`: artwork used by the page.
- `fonts/`: local font files and their SIL Open Font License notices.

Source mockups and unused 3D models are not required to run the site and are excluded from this repository. Both relief images are included so the project works after cloning.

The static page can also be hosted on a static web server without Node.js.
