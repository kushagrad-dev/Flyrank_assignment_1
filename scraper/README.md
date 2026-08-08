# Polite Scraper — Books to Scrape

## Target classification

- **Site:** Books to Scrape (https://books.toscrape.com)
- **Why this site:** A public sandbox built specifically for practising web scraping.
- **Scope:** First 3 catalogue pages only — 60 book pages total
- **Data collected:** Title, price, availability, rating, description, product URL, source page, fetch timestamp
- **Why appropriate:** The site exists for this exact purpose — not a real shop, no real users

## Robots.txt

Requested https://books.toscrape.com/robots.txt — returned 404 (no robots file found). A missing file is not permission; it is just a missing file.

## Politeness rules

- Honest user-agent identifying this scraper and linking to the repo
- 500ms minimum delay between real requests
- Timeout on every request — never wait forever
- Cache saved HTML — development reads from cache, not the live site

## How to run

```bash
cd scraper
npm install
node src/index.js
```

Output: output/books.json and output/run-report.json

## Ethics note

Use an official API when one exists. Never bypass logins, paywalls, or blocks. Collect only what you need. I will not reuse this code on another site without checking its rules and terms first.

## Limitation

Only tested against Books to Scrape. Will break if the site HTML structure changes.

## Run report (sample)

```json
{
  "start_time": "2026-08-08T19:07:10.687Z",
  "end_time": "2026-08-08T19:07:10.889Z",
  "duration_seconds": "0.20",
  "pages_fetched": 0,
  "cache_hits": 63,
  "valid_records": 60,
  "invalid_records": 0,
  "failed_pages": 0
}
```

## Why no browser was needed

The data is already present in the HTML the server sends. A browser would only add memory and startup cost for zero benefit.
