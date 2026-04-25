# MedScanAI

<p align="center">
  <img src="./public/medscanai-logo.svg" alt="MedScanAI Logo" width="132" />
</p>

<p align="center">
  <strong>Offline Medicine Intelligence Platform</strong><br />
  <em>Scan. Search. Know.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
  <img src="https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white" />
  <img src="https://img.shields.io/badge/Offline-17A673?style=for-the-badge" />
  <img src="https://img.shields.io/badge/OCR-Tesseract.js-0D7C68?style=for-the-badge" />
</p>

<p align="center">
  <img src="./public/banner.png" alt="MedScanAI Banner" width="920" />
</p>

## Overview
MedScanAI is a fully offline medicine information app built for fast, private access to pharmaceutical data. The project combines a browser-side SQLite runtime, OCR-powered package recognition, confidence-based medicine matching, and a context-aware medicine assistant into one installable Progressive Web App.

The app is designed around a simple promise: after the first load, you should be able to keep working without network access. Search, medicine detail views, recent history, OCR candidate confirmation, and chatbot context are all built around local assets and local storage.

## Why MedScanAI Exists
Medicine lookup tools often assume a stable internet connection, remote APIs, and a user who already knows the exact spelling of a brand or generic. MedScanAI takes a different approach:

- It keeps the core data local.
- It supports uncertain input like blurry package scans.
- It prefers clear confidence feedback over silent wrong matches.
- It treats offline use as the primary path, not a fallback.

## What It Does
- Loads a merged medicine database from local SQLite via `sql.js`
- Caches the database in IndexedDB for repeat offline access
- Supports camera and uploaded-image OCR through one shared pipeline
- Preprocesses images before OCR for better packaging recognition
- Extracts brand, composition, strength, and dosage-form candidates
- Scores likely medicine matches with weighted similarity logic
- Shows top candidates when confidence is not strong enough for auto-selection
- Maintains recent history and medicine chat context locally

## Core Highlights
### Offline-First Data Engine
The data pipeline merges:

- `medscan_az_dataset.csv`
- `medscan_details_data.csv`
- `medscan_raw_data.csv`

Those sources are compiled into `public/db/medscan.db`, which the browser loads through `sql.js`. On first visit, the database is downloaded once and cached locally in IndexedDB. After that, the app can reopen and continue working without network access.

### OCR Pipeline
The OCR system is built as a production-style multi-step flow:

1. Image preprocessing
2. Tesseract recognition
3. OCR text cleanup
4. Structured field extraction
5. Weighted medicine scoring
6. Confidence-based routing

That means MedScanAI does not just take raw OCR text and search the first token. It tries to infer which part of the package is a brand, which part is a strength, and which matches deserve confirmation instead of auto-navigation.

### Confidence-Based Matching
The medicine matcher combines multiple signals instead of relying on a single string comparison:

- Brand similarity
- Composition similarity
- Strength similarity
- Form similarity

It uses weighted scoring with Jaro-Winkler and Levenshtein-based comparisons to avoid weak or noisy OCR output selecting the wrong medicine too aggressively.

### Installable PWA
The project is configured as a Progressive Web App, so it can be installed on desktop and mobile after the initial load. The service worker caches the application shell while IndexedDB keeps the database available locally.

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, Framer Motion |
| Local Data Runtime | `sql.js` |
| Build-Time Data Pipeline | `better-sqlite3`, Node.js |
| Local Cache | IndexedDB via `localforage` |
| OCR | `tesseract.js` |
| State | Zustand, React Context |
| PWA | `vite-plugin-pwa`, Workbox |

## Architecture
```text
CSV Sources
  -> Node build script
  -> SQLite database
  -> Browser fetch
  -> IndexedDB cache
  -> Search / detail / OCR matching / chatbot context
```

```text
Image Capture or Upload
  -> Preprocess image
  -> Tesseract OCR
  -> Clean OCR text
  -> Extract medicine fields
  -> Weighted scoring against medicine candidates
  -> Auto-match or user confirmation
```

## Project Structure
```text
medscan-web/
├── public/
│   ├── db/
│   │   ├── medscan.db
│   │   └── medscan_optimized_dataset.csv
│   ├── banner.png
│   ├── medscanai-logo.svg
│   ├── sql-wasm.wasm
│   └── sql-wasm-browser.wasm
├── scripts/
│   └── build-database.js
├── src/
│   ├── ai/
│   ├── components/
│   ├── context/
│   ├── db/
│   ├── hooks/
│   ├── pages/
│   ├── search/
│   ├── services/
│   ├── store/
│   ├── types/
│   ├── utils/
│   └── workers/
├── Dockerfile
├── nginx.conf
├── package.json
├── vite.config.ts
└── README.md
```

## Running Locally
```bash
npm install
npm run build:db
npm run dev
```

Development app:

```text
http://127.0.0.1:5173/
```

## Production Commands
```bash
npm run lint -- --max-warnings=0
npm run typecheck
npm run build
npm run preview
```

Preview app:

```text
http://127.0.0.1:4173/
```

## Offline Deployment Methods
If your goal is to use the project offline on your own machine, these are the best deployment options.

### 1. Local PWA Install
Best for: laptop or desktop usage with a browser

How to use it:

1. Run the app once with `npm run dev` or `npm run preview`
2. Open it in Chrome or Edge
3. Install the app from the browser install prompt
4. Let the app fully load once so the service worker and IndexedDB cache are populated
5. After that, you can reopen the installed app offline

Why it works:

- The app shell is cached by the service worker
- The SQLite database is cached locally in IndexedDB
- No remote API is required for normal use

### 2. Static Build Served Locally
Best for: simple offline desktop use without Docker

Build it:

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

Then open:

```text
http://127.0.0.1:4173/
```

Offline note:
You still need one successful first load to cache the assets and database locally. After that, the app can continue offline.

### 3. Docker + Nginx
Best for: stable local deployment, kiosk use, or portable self-hosting

Build and run:

```bash
docker build -t medscanai .
docker run -p 8080:80 medscanai
```

Then open:

```text
http://localhost:8080/
```

Why this is useful:

- Consistent runtime environment
- Good for demos and portfolio deployment
- Easy to keep running on a local machine without a Node dev server

### 4. LAN Deployment
Best for: using the app from another device on the same network

Run either:

```bash
npm run dev -- --host 0.0.0.0
```

or:

```bash
npm run preview -- --host 0.0.0.0
```

Then access it from another device using your machine's local IP.

Offline note:
Each device still needs one successful online load from that host so it can cache the app locally for later offline use.

### 5. Desktop Wrapper
Best for: a true app-like offline install

The current codebase is a strong candidate for wrapping with:

- Tauri
- Electron

Why this helps:

- App launches like a native desktop application
- Local files and database bundle cleanly
- Useful for shipping a self-contained offline tool

## Recommended Offline Access Path
If your main goal is to use MedScanAI offline yourself, the most practical route is:

1. `npm run build`
2. `npm run preview`
3. Open the app in Chrome or Edge
4. Install it as a PWA
5. Load the database completely once
6. Turn off network and reopen the app

That gives you the least friction with the current setup.

## NPM Scripts
| Command | Purpose |
|---|---|
| `npm run dev` | Start Vite development server |
| `npm run build:db` | Build `public/db/medscan.db` from source CSVs |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript checks |
| `npm run build` | Create production build |
| `npm run preview` | Serve built app locally |

## Current Assets
Important runtime assets included in this repo:

- `public/db/medscan.db`
- `public/sql-wasm.wasm`
- `public/sql-wasm-browser.wasm`
- `public/banner.png`
- `public/medscanai-logo.svg`

## Medical Disclaimer
MedScanAI is intended for educational and informational use. It does not replace medical diagnosis, professional judgment, or treatment guidance. Always consult a licensed healthcare professional for clinical decisions.
