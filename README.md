# 🏭 Empire Engine

A deep, mobile-first **idle tycoon PWA** — build, automate, and ascend through one of 8 industries. Pick Tech, Space Mining, Culinary, Energy, Fashion, Biotech, Media, or Agriculture; each has its own production chain, resources, mechanic, advisors, and story thread.

Built with **Vite + React + TypeScript + Tailwind**. Everything runs client-side (localStorage save, offline progress, installable PWA). No backend.

## Play

- **Live (GitHub Pages):** https://gunsam-999.github.io/empire-engine/
- **Install on Android:** open the link in Chrome → menu → **Install app / Add to Home screen**. Runs standalone and offline.

## Features

- 8 industries × 50 facilities (400 total), 5-tier production chains
- 40 collectible advisors, 24+ research nodes across 5 branches
- 25-beat, 5-act story with an ethics/reputation system
- 3-tier prestige (Restructure → IPO → Conglomerate)
- Dynamic market with supply/demand + sparkline, golden-bubble & random events
- Offline earnings, dynamic accent-color theming, big-number notation (K→M→B→t→aa…)
- Auto-save, base64 save export/import, service-worker offline support

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm run dev:lan    # expose dev server on your LAN (test on a phone)
npm run build      # production build -> dist/
npm run serve      # preview the production build on your LAN (port 4173)
```

## Deploy

Pushing to `main` triggers the GitHub Actions workflow in `.github/workflows/deploy.yml`, which builds and publishes `dist/` to GitHub Pages automatically.

One-time setup: in the repo, **Settings → Pages → Build and deployment → Source: GitHub Actions**.
