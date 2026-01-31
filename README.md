# D4X Sound Player

A simple web app to browse, search, and play D4X game sound files.

## Features

- **Fuzzy search** - Find sounds by name
- **Alphabetical pagination** - Browse by letter (A-Z, #)
- **Letter pagination** - 50 sounds per page when a letter has more
- **Play / Stop toggle** - Click Play to listen, click again to stop
- **Download** - Download any sound as MP3

## Usage

```bash
# Development (recommended)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Run `npm run dev` and open http://localhost:5173/ (or the port shown).

## Requirements

- MP3 files in the parent Audio folder (ENVIRO, UNITS, VOICES, UI, Media)
- Run `node scripts/generate-sounds.js` to regenerate the manifest and copy MP3s to `public/` after adding sounds

## GitHub Pages Deployment

Uses **GitHub Actions** to build and deploy (bypasses Jekyll). The workflow in `.github/workflows/deploy-pages.yml` runs on every push to `main` or `master` and sets the base path from the repo name automatically.

### 1. Use GitHub Actions as the Pages source

Go to your repo **Settings → Pages**. Under "Build and deployment", set **Source** to **GitHub Actions** (not "Deploy from a branch").

### 2. Push to trigger deployment

Push to `main` or `master`. The workflow in `.github/workflows/deploy-pages.yml` will build the player and deploy to Pages.

Site URL: `https://USERNAME.github.io/REPO-NAME/`

If the workflow fails on "Install dependencies" (e.g. "package-lock.json out of sync"), run `npm install` locally and commit the updated `package-lock.json`.

### Local deploy (alternative)

```bash
cd player
npm install
npm run deploy
```

Then set Pages source to **Deploy from a branch** → `gh-pages` → `/(root)`.
