---
title: MedScanAI
emoji: 💊
colorFrom: green
colorTo: blue
sdk: docker
pinned: false
---

# MedScanAI

![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=flat-square&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Deployment](https://img.shields.io/badge/Deployment-Hugging%20Face%20Spaces-blue?style=flat-square)
![License](https://img.shields.io/badge/License-Unspecified-lightgrey?style=flat-square)

MedScanAI is an offline-first medicine intelligence platform built as an installable Progressive Web App. It combines browser-resident SQLite search, OCR-assisted medicine package recognition, structured medicine detail retrieval, and a context-aware conversational assistant in one local-first workflow.

## Team Members

| Name | Registration No. | Section | Email |
|---|---:|---|---|
| Mohammad Fayas Khan | 12413692 | 324XP | fayas.khan2024@lpu.in |
| Prem Kumar Gupta | 12415059 | 324XP | premkumar2024@lpu.in |
| Janapareddy Bhaavesh Sai Mohan | 12416561 | 324XP | bhaaveshsai2024@lpu.in |

## Live Demo

[![Hugging Face Spaces](https://img.shields.io/badge/Hugging%20Face-Spaces-ffcc4d?style=for-the-badge&logo=huggingface&logoColor=black)](https://fayasx-med-scan-ai.hf.space)

- Deployment: [fayasx-med-scan-ai.hf.space](https://fayasx-med-scan-ai.hf.space)
- Source Code: [github.com/MohammadFayasKhan/MedScanAI](https://github.com/MohammadFayasKhan/MedScanAI)

## Overview

MedScanAI is designed for medicine lookup scenarios where connectivity is unreliable, package text is noisy, and privacy matters. After the initial load, the application can continue working offline by caching the medicine database locally in IndexedDB and executing queries through `sql.js` in the browser.

The repository implements:

- Offline medicine search over a local SQLite corpus with FTS5-backed lookup
- OCR-based medicine package reading using `tesseract.js`
- Structured extraction of brand, composition, strength, and dosage-form cues
- Confidence-aware candidate ranking instead of brittle exact matching
- Contextual medicine assistance grounded in locally available medicine fields
- PWA installability for repeat offline use on desktop and mobile browsers

## Team Project Context

This repository accompanies the INT428 project submission and the IEEE-formatted report deliverable. The report focuses on the implemented system in this codebase rather than on a separate cloud-based medical imaging model.

## Project Structure

```text
Med_Scan_AI/
├── public/
│   ├── db/
│   │   ├── medscan.db
│   │   └── medscan.db.gz
│   ├── medscanai-logo.svg
│   ├── sql-wasm-browser.wasm
│   └── sql-wasm.wasm
├── scripts/
│   ├── build-database.js
│   ├── format_int428_report.py
│   └── generate_medscanai_ieee_report.py
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
├── deliverables/
├── Dockerfile
├── nginx.conf
├── package.json
├── vite.config.ts
└── README.md
```

## Core Workflow

```text
CSV datasets
  -> scripts/build-database.js
  -> SQLite database with FTS5 index
  -> compressed delivery artifact
  -> browser load via sql.js
  -> IndexedDB cache via localforage
  -> search, OCR matching, medicine details, chat, and history
```

```text
Image upload or camera capture
  -> preprocessing
  -> Tesseract OCR
  -> OCR cleanup
  -> field extraction
  -> weighted candidate scoring
  -> auto-match or user confirmation
```

## Installation and Usage

### Prerequisites

- Node.js 20 or newer
- npm

### Local Development

```bash
npm install
npm run build:db
npm run dev
```

Open the development server at:

```text
http://127.0.0.1:5173/
```

### Production Build

```bash
npm run typecheck
npm run lint
npm run build
npm run preview
```

Preview the production build at:

```text
http://127.0.0.1:4173/
```

### Docker Deployment

```bash
docker build -t medscanai .
docker run -p 8080:80 medscanai
```

Then open:

```text
http://localhost:8080/
```

## Results and Metrics

The current repository snapshot verifies a working offline medicine intelligence system with the following implementation-scale indicators:

| Metric | Value |
|---|---:|
| Medicine records in compiled database | 283,988 |
| FTS5 index rows | 283,988 |
| Distinct manufacturers | 7,640 |
| Compressed database artifact | 278 MB |
| Uncompressed database size | 1.5 GB |
| Production build modules transformed | 2,509 |
| PWA precache entries | 14 |

Key qualitative outcomes:

- Search runs locally after the first successful data load
- OCR supports image upload and camera capture paths
- Matching uses brand, composition, strength, and form-aware scoring
- History and conversational context persist locally across sessions

## Repository Notes

- `public/db/medscan.db` is the compiled offline database used at runtime
- `scripts/build-database.js` prepares the database from source CSV datasets
- `src/db/SqliteDatabase.ts` provides browser-side query execution and fallback search
- `src/hooks/useOCR.ts` manages OCR preprocessing, quality gating, and recognition flow

## Citation

Use the following placeholder citation for academic references until a final publication record is assigned:

```text
M. F. Khan, P. K. Gupta, and J. B. S. Mohan, "MedScanAI: An AI-Powered Offline Medicine Intelligence System with OCR and Conversational Assistant," INT428 Project Repository, Lovely Professional University, 2026.
```

## License

No explicit open-source license file is currently included in this repository. Reuse outside the intended academic and demonstration context should be discussed with the project authors first.

## Disclaimer

MedScanAI is intended for educational and informational use. It does not replace clinical judgment, diagnosis, or treatment planning. Medicine-related decisions should always be validated by a licensed healthcare professional.
