# mooizicht

Dark, Gemini-inspired frontend for an **outreach automation** platform — n8n + Apify agents that research companies, send personalized emails, and track responses.

## The entry animation

The app opens with a point-cloud face sequence (`src/components/FaceIntro.tsx`):

1. **Profile** — the face is turned to the side, vertical reference lines fade in.
2. **Disturb** — the lines rush the face and ripple it apart (the glitch beat).
3. **Turn** — the face rotates to look straight at you and settles.
4. **Zoom** — the camera pushes in and dissolves into the app.

Click / press Enter to skip.

### Using the real face image

The animation reads its depth from `public/face.png`. Drop the uploaded wireframe-face
image there (brightness = depth) for the exact look. Without it, a procedural face-relief
is synthesized so the sequence still runs.

```
public/face.png   ← put the uploaded face image here
```

## Pages

| Page          | What it shows                                                        |
| ------------- | ------------------------------------------------------------------- |
| **Overview**  | How many companies reached out over time, where, what they do, who responded |
| **Map**       | Mapbox dark map of every target company by location & status        |
| **Companies** | Searchable, filterable pipeline of companies                        |
| **Agents**    | n8n / Apify agents and the pipeline they form                       |
| **Outreach**  | Campaigns, AI-drafted emails, follow-up sequences                   |
| **Data**      | CSV import (drag & drop) + enriched dataset export                  |

## Run

```bash
npm install
npm run dev
```

Opens on http://localhost:5173.

## Mapbox

The Map page needs a Mapbox token. Either:

- set `VITE_MAPBOX_TOKEN` in a `.env` file (see `.env.example`), or
- paste it into the field on the Map page (stored in `localStorage`).

Without a token the Map page falls back to a static target view.

## Stack

React + TypeScript + Vite · recharts · mapbox-gl · framer-motion · lucide-react.

Mock data lives in `src/lib/data.ts` — wire it to your real n8n / Apify outputs.
