# Octopus Mentality

Interactive landing page for a creative branding studio.

## Run locally

Requires Node.js 20.11 or newer. No dependencies or build step are needed.

```sh
node server.mjs
```

Open http://localhost:4173. Set the `PORT` environment variable to use another port.

## Design and interaction

- Instrument Serif display headings and Manrope body copy, served locally.
- Deep blue first-screen background (`#0010A2`) and golden headings (`#FFBF48`). OCTOPUS aligns with the logo's left inset in the updated home mockup.
- The patterned octopus is visible at first; a smooth brush reveals its white surface under the cursor.
- The first screen's blue background hides a white floral relief. Cursor movement reveals it through soft organic patches behind the octopus and typography.
- The octopus and background share one soft organic mask, including the same feathered edges, cursor movement, and fading.
- Each painted area fully disappears over roughly two seconds, including while the cursor continues moving elsewhere. No faint ornament remains behind.
- Text touched by the brush turns golden like the headings, without a shadow.
- The pill below the lower-left studio statement opens the interactive art on the second screen.
- Desktop layout and brush size scale from a 1920 × 1080 reference.
- The octopus follows the cursor with gently eased parallax (up to 28 px horizontally and 20 px vertically at the reference size). Its reveal mask follows the moving image.
- The first screen shows the diagonal guide from the updated mockup. Its text remains in place as the rounded second screen slides over it like a stacked card. The octopus freezes in place and only fades out, without rising or rotating.
- The second screen begins in the clay relief's base red (`#F72526`). Moving the cursor reveals the floral relief through broad, softly feathered organic patches.
- The lower content follows two editorial compositions inspired by the TRACKLIST and PEGASSI sections of [Ascension](https://ascension.pegassi.be/), using original branding-studio copy and this project's fonts and relief background.
- The first composition introduces four disciplines in an asymmetric twelve-column grid, followed by a vertical photograph of a floral cow. The second combines a full-width introduction, a floral deer photograph, numbered notes and two small essays.
- Text is measured into actual lines after the local fonts load. Each line rises through its own clipped mask over 0.9 seconds, with a 0.065-second stagger. Reveals begin on viewport entry and run once; line breaks are recalculated on resize. Screen readers receive each text block once, and reduced-motion mode shows the text immediately.
- Both photographs have a small scroll parallax, disabled for reduced motion. The earlier illustration, statement card and contact form have been removed from the page.
- Both backgrounds use a stronger, bounded lift with subtle shading changes. Petals move together as they emerge and settle back without stretching their fine edges.

The white octopus is composited on a transparent foreground canvas using the background renderer's exact mask. Without WebGL, both layers reuse the same blurred SVG path.

Both relief backgrounds share the native WebGL renderer in `cursor-renderer.js`, configured by `clay-reveal.js`. Two small texture buffers per screen retain and soften the cursor trail; the mask is stored across two color channels so small opacity changes do not round away at high refresh rates. Decay uses elapsed time and includes a finite cleanup, so old areas reach zero even during continuous painting. A second shader blends the relief into the flat background. The renderer stops after 2.6 seconds of inactivity and clears when the section leaves the viewport. The hero's reveal also clears at the start of its scroll transition. A blurred SVG mask provides a fallback without WebGL. `REVEAL_RADIUS` controls the soft outer extent, `TRAIL_LIFETIME` controls the inactivity cutoff, and the `depth` setting controls the rise. Reduced-motion mode disables the displacement and animated shading. No additional dependencies are required.

The original cursor motion was inspired by [React Bits Glow Cursor](https://www.reactbits.dev/animations/glow-cursor?trailLength=31) ([reference source](https://github.com/DavidHDev/react-bits/blob/main/src/content/Animations/GlowCursor/GlowCursor.jsx)). The current relief renderer is implemented in plain JavaScript, with no React, OGL, or runtime dependencies.

## Files

- `index.html`: page markup and SVG mask.
- `styles.css`: layout, typography, and colors.
- `app.js`: responsive hero layout, text hover feedback, and navigation.
- `scene.js`: guide-line scroll transition, octopus parallax, and its fade in place. Parallax is disabled when reduced motion is preferred.
- `clay-reveal.js`: configuration for the white hero relief and red second-screen relief.
- `clay-content.js`: responsive line splitting, masked text reveals, and subtle photograph parallax.
- `cursor-renderer.js`: shared WebGL relief renderer, independent trail fading, and SVG fallback.
- `server.mjs`: local development server.
- `image 67.png`, `image 68.png`, `white-relief.png`, `clay-relief.jpg`, `floral-cow.jpg`, `floral-deer.png`, `logo.svg`: artwork used by the page.
- `fonts/`: local font files and their SIL Open Font License notices.

Source mockups and unused 3D models are not required to run the site and are excluded from this repository. Both relief images are included so the project works after cloning.

The static page can also be hosted on a static web server without Node.js.

## Animal photographs

`floral-cow.jpg` is the user-provided meadow photograph. `floral-deer.png` was generated with the built-in image generation tool using the cow as a style reference: a realistic white deer with cobalt-blue floral markings, slender antlers and natural fur, standing among ferns and moss in a misty birch forest; soft morning light, portrait composition, no text or logos.
