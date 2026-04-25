# MedScanAI

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
  <img src="https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white" />
  <img src="https://img.shields.io/badge/Offline-4CAF50?style=for-the-badge" />
</p>

<p align="center">
  <strong>Offline Medicine Intelligence Platform</strong><br />
  <em>Scan. Search. Know.</em>
</p>

<p align="center">
  <img src="./public/banner.png" alt="MedScanAI Home" width="900" />
</p>

## Overview
MedScanAI is an offline-first medical information web app built with React and TypeScript. It combines:

- Local SQLite medicine knowledge (loaded in-browser via `sql.js`)
- Fast medicine lookup with ranked matching
- OCR-based package recognition with confidence-aware candidate selection
- Context-aware medicine chatbot responses
- Progressive Web App support for installable offline use

The current dataset pipeline merges three sources into a single local database:

- `medscan_az_dataset.csv`
- `medscan_details_data.csv`
- `medscan_raw_data.csv`

## Key Features
- Unified OCR pipeline for camera and upload
- Image preprocessing before OCR
- Structured OCR extraction: brand, composition, strength, form
- Weighted medicine matching with confidence tiers
- Top-match confirmation UX for low-confidence scans
- Full offline database caching in IndexedDB
- Modern dark glassmorphism UI
- PWA install and service worker caching

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| State | Zustand, React Context |
| Styling | Tailwind CSS, Framer Motion |
| OCR | Tesseract.js (WASM) |
| Data Engine | SQLite (`better-sqlite3` build-time, `sql.js` runtime) |
| Client Cache | IndexedDB via `localforage` |
| Search/Match | Custom weighted matcher (Jaro-Winkler + Levenshtein) |
| PWA | `vite-plugin-pwa`, Workbox |

## Project Structure
```text
medscan-web/
├── public/
│   ├── db/
│   │   └── medscan.db
│   ├── sql-wasm.wasm
│   ├── sql-wasm-browser.wasm
│   └── banner.png
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
├── vite.config.ts
└── README.md
```

## Local Development
```bash
npm install
npm run build:db
npm run dev
```

App runs at:

```text
http://127.0.0.1:5173/
```

## Production Build
```bash
npm run typecheck
npm run lint
npm run build
npm run preview
```

## Docker Deployment
```bash
docker build -t medscanai .
docker run -p 8080:80 medscanai
```

App runs at:

```text
http://localhost:8080/
```

## Offline Behavior
After first load:

- App shell is cached by service worker
- SQLite database is cached in IndexedDB
- Search, detail pages, chat context, and scan history continue to work without network

## OCR Flow
```text
Image Capture/Upload
  -> Preprocess (grayscale + contrast + threshold)
  -> Tesseract recognition
  -> Field extraction
  -> Weighted medicine scoring
  -> Confidence routing
```

Confidence routing:

- `>= 75`: auto-accept best match
- `50-74`: show top candidates for selection
- `< 50`: prompt retry/manual search

## NPM Scripts
- `npm run dev` : start development server
- `npm run build:db` : build `public/db/medscan.db` from CSV sources
- `npm run typecheck` : strict TypeScript check
- `npm run lint` : ESLint checks
- `npm run build` : production build
- `npm run preview` : preview production build

## Medical Disclaimer
This project is for educational and informational purposes only and does not provide medical diagnosis or treatment guidance. Always consult a licensed healthcare professional.
