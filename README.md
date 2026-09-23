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
- A smooth SVG brush reveals the octopus ornament under the cursor.
- A delayed white trail lingers on the background, then fades away.
- Text touched by the brush turns mint without a shadow.
- Desktop layout and brush size scale from a 1920 × 1080 reference.

The brush uses frame-based pointer smoothing, quadratic curves, and an SVG alpha mask. Its width and timing can be adjusted through the constants at the top of `app.js`.

## Files

- `index.html`: page markup and SVG mask.
- `styles.css`: layout, typography, and colors.
- `app.js`: brush animation and navigation.
- `server.mjs`: local development server.
- `image 67.png`, `image 68.png`, `logo.svg`: artwork used by the page.
- `fonts/`: local font files and their SIL Open Font License notices.

Source mockups and unused 3D models are not required to run the site and are excluded from this repository.

The static page can also be hosted on a static web server without Node.js.
