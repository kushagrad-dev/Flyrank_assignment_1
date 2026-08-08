const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { z } = require('zod');

const BASE_URL = 'https://books.toscrape.com';
const CATALOGUE_PAGE_1 = `${BASE_URL}/catalogue/page-1.html`;
const CACHE_DIR = path.join(__dirname, '..', 'cache');
const OUTPUT_DIR = path.join(__dirname, '..', 'output');
const USER_AGENT = 'FlyRankInternshipA9/1.0 (+https://github.com/kushagrad-dev/Flyrank_assignment_1)';
const TIMEOUT_MS = 10000;
const DELAY_MS = 500;



// --- Schema ---
const BookSchema = z.object({
  title: z.string().min(1),
  product_url: z.string().url(),
  price_text: z.string(),
  price_gbp: z.number(),
  availability_text: z.string(),
  rating_text: z.string(),
  description: z.string().nullable(),
  source_page: z.string().url(),
  fetched_at: z.string()
});

function getCacheFilename(url) {
  return url.replace(/https?:\/\//, '').replace(/[^a-z0-9]/gi, '_') + '.html';
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithCache(url) {
  const cacheFile = path.join(CACHE_DIR, getCacheFilename(url));

  if (fs.existsSync(cacheFile)) {
    const html = fs.readFileSync(cacheFile, 'utf-8');
    return { html, cacheHit: true };
  }

  await sleep(DELAY_MS);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT }
    });
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 404) {
    throw new Error(`404 NOT FOUND: ${url}`);
  }

  if (response.status === 403) {
    throw new Error(`403 FORBIDDEN: ${url}`);
  }

  if (response.status !== 200) {
    // retry once for 5xx errors
    await sleep(DELAY_MS * 2);
    const retryResponse = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT }
    });
    if (retryResponse.status !== 200) {
      throw new Error(`Bad status ${retryResponse.status} after retry: ${url}`);
    }
    const html = await retryResponse.text();
    fs.writeFileSync(path.join(CACHE_DIR, getCacheFilename(url)), html, 'utf-8');
    return { html, cacheHit: false };
  }

  const html = await response.text();
  fs.writeFileSync(path.join(CACHE_DIR, getCacheFilename(url)), html, 'utf-8');
  return { html, cacheHit: false };
}

function extractBookLinks(html, pageUrl) {
  const $ = cheerio.load(html);
  const links = [];
  $('article.product_pod h3 a').each((_, el) => {
    const href = $(el).attr('href');
    const absolute = new URL(href, pageUrl).href;
    links.push(absolute);
  });
  return links;
}

function extractNextPage(html, pageUrl) {
  const $ = cheerio.load(html);
  const nextHref = $('li.next a').attr('href');
  if (!nextHref) return null;
  return new URL(nextHref, pageUrl).href;
}

function extractBookDetail(html, productUrl, sourcePageUrl) {
  const $ = cheerio.load(html);

  const title = $('div.product_main h1').text().trim();
  const price_text = $('div.product_main p.price_color').text().trim();
  const availability_text = $('div.product_main p.availability').text().trim();
  const rating_text = $('div.product_main p.star-rating').attr('class').replace('star-rating', '').trim();
  const descEl = $('#product_description ~ p').first();
  const description = descEl.length ? descEl.text().trim() : null;
  const price_gbp = parseFloat(price_text.replace(/[^0-9.]/g, ''));

  return {
    title,
    product_url: productUrl,
    price_text,
    price_gbp,
    availability_text,
    rating_text,
    description,
    source_page: sourcePageUrl,
    fetched_at: new Date().toISOString()
  };
}

async function crawlCatalogue(stats) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  let currentUrl = CATALOGUE_PAGE_1;
  let cataloguePageCount = 0;
  const allBookLinks = [];
  const sourcePageMap = {};

  while (currentUrl && cataloguePageCount < 3) {
    const { html, cacheHit } = await fetchWithCache(currentUrl);
    if (cacheHit) stats.cacheHits++; else stats.pagesFetched++;
    const links = extractBookLinks(html, currentUrl);
    links.forEach(link => { sourcePageMap[link] = currentUrl; });
    allBookLinks.push(...links);
    cataloguePageCount++;
    currentUrl = extractNextPage(html, currentUrl);
  }

  const uniqueUrls = [...new Set(allBookLinks)];
  console.log(`catalogue_pages=${cataloguePageCount}, discovered=${allBookLinks.length}, unique_urls=${uniqueUrls.length}`);
  return { uniqueUrls, sourcePageMap };
}

async function scrapeAndValidate(uniqueUrls, sourcePageMap, stats) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const goodRecords = [];
  const errorRecords = [];
  const seenUrls = new Set();

  for (const url of uniqueUrls) {
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);

    try {
      const { html, cacheHit } = await fetchWithCache(url);
      if (cacheHit) stats.cacheHits++; else stats.pagesFetched++;

      const raw = extractBookDetail(html, url, sourcePageMap[url]);
      const result = BookSchema.safeParse(raw);

      if (result.success) {
        goodRecords.push(result.data);
      } else {
        stats.invalidRecords++;
        errorRecords.push({ url, reason: result.error.message, raw });
      }
    } catch (err) {
      console.error(`FAILED     ${url} — ${err.message}`);
      stats.failedPages++;
      errorRecords.push({ url, reason: err.message });
    }
  }

  // idempotent write — deduplicate by product_url
  const existingRecords = fs.existsSync(path.join(OUTPUT_DIR, 'books.json'))
    ? JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'books.json'), 'utf-8'))
    : [];

  const existingMap = new Map(existingRecords.map(r => [r.product_url, r]));
  goodRecords.forEach(r => existingMap.set(r.product_url, r));
  const finalRecords = [...existingMap.values()];

  fs.writeFileSync(path.join(OUTPUT_DIR, 'books.json'), JSON.stringify(finalRecords, null, 2), 'utf-8');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'errors.json'), JSON.stringify(errorRecords, null, 2), 'utf-8');

  console.log(`valid=${goodRecords.length}, invalid=${stats.invalidRecords}, failed=${stats.failedPages}`);
  console.log(`books.json written with ${finalRecords.length} records`);

  return { goodRecords, errorRecords };
}

async function main() {
  const startTime = new Date();

  const stats = {
    pagesFetched: 0,
    cacheHits: 0,
    invalidRecords: 0,
    failedPages: 0
  };

  const { uniqueUrls, sourcePageMap } = await crawlCatalogue(stats);
  uniqueUrls.push(FAKE_URL);
  sourcePageMap[FAKE_URL] = CATALOGUE_PAGE_1;
  const { goodRecords, errorRecords } = await scrapeAndValidate(uniqueUrls, sourcePageMap, stats);

  const endTime = new Date();
  const runReport = {
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    duration_seconds: ((endTime - startTime) / 1000).toFixed(2),
    pages_fetched: stats.pagesFetched,
    cache_hits: stats.cacheHits,
    valid_records: goodRecords.length,
    invalid_records: stats.invalidRecords,
    failed_pages: stats.failedPages
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'run-report.json'), JSON.stringify(runReport, null, 2), 'utf-8');

  console.log('\nRun report:');
  console.log(JSON.stringify(runReport, null, 2));
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});