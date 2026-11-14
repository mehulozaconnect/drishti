# Drishti — your morning, briefed

A personal news app: Mumbai and Malad, India, world, markets, gold and silver, SIP and mutual funds, Bollywood, movies, viral, phones, gadgets, health and spiritual — only from trusted publishers, cross-checked across outlets, with 60-word summaries.

**Open the app:** https://mehulozaconnect.github.io/drishti/

## How it works
- `scripts/fetch.mjs` runs on GitHub Actions every 30 minutes. It reads trusted feeds (`scripts/sources.mjs`), groups the same story across outlets ("Confirmed by N sources"), ranks the must-know stories, flags related fact-checks, pulls market data, and writes `data/*.json`.
- The app (`index.html`, `js/`, `css/`) is a static installable web app served by GitHub Pages. Weather comes live from Open-Meteo for your current location.

## Optional settings (repo → Settings → Secrets and variables → Actions)
| Secret | What it does |
|---|---|
| `GEMINI_API_KEY` | AI 60-word summaries for Quick 60 (free key from aistudio.google.com/apikey) |
| `NTFY_TOPIC` | 7 am morning brief and breaking-news alerts through the free ntfy app |
| `YOUTUBE_API_KEY` | Trending YouTube videos in India |

Ask Drishti (the in-app AI) uses a Gemini key you paste in the app's Settings; it stays on your phone.

Drishti is for information and education, not financial advice.
