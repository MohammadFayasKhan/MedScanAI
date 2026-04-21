# MedScan+ — Offline Medical Intelligence Engine

<p align="center">
  <img src="medscan-web/public/icon-192.png" alt="MedScan+ Logo" width="80" />
</p>

<p align="center">
  <strong>100% Offline · AI Chatbot · 11,800+ Medicines · PWA · React + TypeScript + Vite</strong>
</p>

<p align="center">
  <a href="https://github.com/MohammadFayasKhan/MedScanAI">
    <img src="https://img.shields.io/badge/GitHub-MedScanAI-4ECDC4?style=flat-square&logo=github" />
  </a>
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript" />
  <img src="https://img.shields.io/badge/React-18.x-61DAFB?style=flat-square&logo=react" />
  <img src="https://img.shields.io/badge/Vite-5.x-646CFF?style=flat-square&logo=vite" />
  <img src="https://img.shields.io/badge/Offline-PWA-4ECDC4?style=flat-square" />
</p>

---

## Overview

**MedScan+** is a production-grade, 100% offline medical reference Progressive Web App (PWA). It provides structured pharmaceutical data, an AI-powered medical chatbot, and symptom-based medicine discovery — all without a single network request at runtime.

Built as a CV/portfolio project demonstrating full-stack engineering, offline-first architecture, and conversational AI design.

---

## Features

| Feature | Details |
|---|---|
| 🔍 **Intelligent Search** | Medicine name, composition, symptom-based, typo-corrected |
| 🤖 **AI Medical Chatbot** | Context memory, intent detection, streaming responses |
| 💊 **11,800+ Medicines** | Full Indian pharmacopoeia dataset |
| 🧠 **Data Enrichment Engine** | Infers missing fields from 18 drug-class knowledge bases |
| 📱 **PWA** | Install offline, works without internet |
| 📸 **OCR Scanner** | Scan medicine packaging with device camera |
| 🌙 **Dark UI** | iOS-style, Tailwind CSS, Framer Motion animations |
| 🔒 **Zero Cloud Dependency** | No API keys, no server, no tracking |

---

## Architecture

```
medscan-web/
├── public/
│   └── db/
│       └── medicines-optimized.csv   ← 11,800-row medicine dataset (8 columns)
│
└── src/
    ├── workers/
    │   └── db.worker.ts              ← Web Worker: CSV parsing, search indexing
    ├── db/
    │   └── database.ts               ← Worker proxy: queue-based, waitForReady()
    ├── ai/
    │   ├── intentEngine.ts           ← Intent detection logic
    │   ├── contextManager.ts         ← Conversation tracking
    │   └── responseBuilder.ts        ← Dynamic Markdown generator
    ├── search/
    │   ├── fuzzySearch.ts            ← Local fuzzy matching (Levenshtein)
    │   └── ranking.ts                ← Score-based result ranking
    ├── utils/
    │   ├── data-enricher.ts          ← Drug-class inference engine
    │   └── ocr-cleaner.ts            ← OCR post-processing
    ├── hooks/
    │   ├── useChatbot.ts             ← Conversation memory, intelligence layer
    │   ├── useHistory.ts             ← Scan history (localStorage)
    │   └── useOCR.ts                 ← Tesseract.js OCR
    ├── context/
    │   ├── DatabaseContext.tsx       ← DB init, loading state
    │   └── MedicineContext.tsx       ← Shared medicine state
    ├── pages/
    │   ├── HomePage.tsx              ← Dashboard + camera scan
    │   ├── ManualSearchPage.tsx      ← Debounced search + results
    │   ├── MedicineDetailPage.tsx    ← Enriched 9-section accordion
    │   ├── ChatbotPage.tsx           ← ChatGPT-style interface
    │   └── HistoryPage.tsx           ← Scan history
    └── components/
        ├── MessageBubble.tsx         ← Streaming text & timestamp animation
        ├── ChatInput.tsx             ← Smart input with send button
        ├── Navbar.tsx                ← Navigation
        ├── GlobalSearch.tsx          ← Persistent smart search
        ├── ContextHeader.tsx         ← Sticky medicine context bar
        └── AnimatedButton.tsx        ← Framer-motion reusable buttons
        └── ...
```

### Data Flow

```
CSV File → Web Worker → IndexedDB Cache (v3)
                ↓
         searchMedicines()
                ↓
      query-intelligence.ts  ← normalises: typos, aliases, symptoms
                ↓
          Ranked results
                ↓
       data-enricher.ts      ← fills empty fields from drug-class KB
                ↓
    MedicineDetailPage / ChatbotPage
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Styling | Tailwind CSS + CSS Custom Properties |
| Animation | Framer Motion |
| Icons | Lucide React |
| Offline DB | Web Worker + IndexedDB (via localforage) |
| CSV parsing | PapaParse (in worker) |
| OCR | Tesseract.js (WASM) |
| PWA | vite-plugin-pwa (Workbox) |
| Fonts | Inter + Outfit (Google Fonts) |

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### Install & Run

```bash
# Clone
git clone https://github.com/MohammadFayasKhan/MedScanAI.git
cd MedScanAI/medscan-web

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

> **First load**: The app parses 11,800 CSV rows in a Web Worker (~2–4s). Subsequent loads use IndexedDB cache (instant).

### Production Build

```bash
npm run build       # TypeScript check + Vite build
npm run preview     # Preview production build locally
```

---

## Docker Deployment

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY medscan-web/package*.json ./
RUN npm ci
COPY medscan-web/ .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

```bash
docker build -t medscan-plus .
docker run -p 8080:80 medscan-plus
```

> **nginx.conf** must serve all routes to `index.html` (SPA routing) and set `Cross-Origin-Embedder-Policy: require-corp` headers (required for SharedArrayBuffer / Tesseract WASM).

---

## Chatbot Intelligence

The chatbot uses a multi-layer pipeline — **no LLM required**:

```
User Input
    ↓
intentEngine.ts
  • Intent detection (dosage / side_effects / pregnancy / interactions / symptom / medicine)
  • Context-aware fallback mapping
    ↓
contextManager.ts
  • Conversation memory (follow-up uses last medicine)
  • Symptom queries force new medicine search (overrides context)
    ↓
fuzzySearch.ts / ranking.ts
  • Typo correction (paracitamol → paracetamol)
  • Symptom expansion & Levenshtein matching
    ↓
responseBuilder.ts
  • Strict formatting matching the specific intent
  • Zero redundant repetition (doesn't return uses when asking for dosage)
    ↓
MessageBubble.tsx
  • ChatGPT-style streaming text animation
  • Read receipts & timestamps
```

### Example Conversation

```
User: Paracetamol
Bot: [Loads & shows uses, mechanism, category for best Paracetamol match]

User: dosage
Bot: For Paracetamol, adults typically take 500–1000 mg every 4–6 hours...

User: is it safe in pregnancy?
Bot: Paracetamol is generally considered safe at recommended doses during all trimesters...

User: fever medicine
Bot: [Overrides context] Medicines commonly used for fever: Crocin, Calpol 500mg, Dolo 650...
```

---

## Search Capabilities

| Query | Result |
|---|---|
| `Paracetamol` | All medicines with Paracetamol in name or composition |
| `paracitamol` | Corrected → finds Paracetamol |
| `acetaminophen` | Alias → finds Paracetamol |
| `fever` | Symptom → finds analgesic/antipyretic medicines |
| `infection` | Symptom → finds antibiotics |
| `Crocin` | Exact brand → instant match |
| `para` | Prefix → all medicines starting with "para" |

---

## Data Enrichment Engine

When CSV fields are empty, `data-enricher.ts` infers medically accurate content from the drug's pharmacological class:

| CSV Category | Inferred Fields |
|---|---|
| `P-Aminophenol Derivative` | Paracetamol-class: analgesic mechanism, liver warnings, safe pregnancy info |
| `NSAID` | COX inhibitor mechanism, GI warnings, avoid in 3rd trimester |
| `Antibiotic` | Resistance warnings, full course guidance, allergy precautions |
| `Antihypertensive` | BP monitoring, ACE inhibitor cough, renal precautions |
| `Antihistamine` | Sedating vs. non-sedating effects, driving warnings |
| `Proton Pump Inhibitor` | Take before meals, long-term magnesium depletion |
| + 12 more classes | Statins, antidiabetics, bronchodilators, corticosteroids... |

All enriched content includes a mandatory disclaimer: *"⚕️ For informational purposes only. Consult a licensed healthcare professional."*

---

## Medical Safety Disclaimer

> **MedScan+ is for educational and informational purposes only.**
> It does NOT constitute medical advice, diagnosis, or treatment.
> Always consult a qualified and licensed healthcare professional before starting, stopping, or changing any medication.
> In case of a medical emergency, call your local emergency services immediately.

---

## File Structure

```
MedScanAI/
└── medscan-web/
    ├── public/
    │   ├── db/medicines-optimized.csv   ✅ 11,800 medicine dataset
    │   ├── icon-192.png
    │   └── icon-512.png
    ├── src/
    │   ├── components/   ChatBubble, ChatInput, Navbar, ...
    │   ├── context/      DatabaseContext, MedicineContext
    │   ├── db/           database.ts (worker proxy)
    │   ├── hooks/        useChatbot, useHistory, useOCR
    │   ├── pages/        Home, Search, Detail, Chatbot, History
    │   ├── types/        medicine.ts (full TypeScript schema)
    │   ├── utils/        data-enricher, query-intelligence, chatbot-engine
    │   ├── workers/      db.worker.ts (CSV → IndexedDB)
    │   └── index.css     Tailwind + CSS custom properties
    ├── tailwind.config.js
    ├── vite.config.ts
    └── package.json
```

---

## Developer Notes

### IndexedDB Cache
The worker stores parsed CSV in IndexedDB under key `medscan-csv-store-v3`. To force a re-parse (after CSV changes), increment this version in both `db.worker.ts` and `db/database.ts`.

### COOP/COEP Headers
Required for Tesseract.js WASM. Set in `vite.config.ts` for dev and configured in nginx for production:
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

### Search Scoring
Results are ranked by a 6-tier relevance system:
1. Exact brand name match (score: 100)
2. Brand name starts with query (80)
3. Brand name contains query (60)
4. Composition starts with query (55)
5. Composition contains query (40)
6. Uses / category contains query (20)

---

## License

MIT © Mohammad Fayas Khan — Built for academic & portfolio demonstration.

---

<p align="center">Made with ❤️ and TypeScript · <a href="https://github.com/MohammadFayasKhan/MedScanAI">GitHub</a></p>
