const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const BASE_URL = 'https://books.toscrape.com';
const CATALOGUE_PAGE_1 = `${BASE_URL}/catalogue/page-1.html`;
const CACHE_DIR = path.join(__dirname, '..', 'cache');
const USER_AGENT = 'FlyRankInternshipA9/1.0 (+https://github.com/kushagrad-dev/Flyrank_assignment_1)';
const TIMEOUT_MS = 10000;
const DELAY_MS = 500;

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
    console.log(`CACHE HIT  ${url} (${html.length} bytes)`);
    return html;
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

  if (response.status !== 200) {
    throw new Error(`Bad status ${response.status} for ${url}`);
  }

  const html = await response.text();
  fs.writeFileSync(cacheFile, html, 'utf-8');
  console.log(`FETCH      ${url} (${html.length} bytes)`);
  return html;
}

function extractBookLinks(html, pageUrl) {
  const $ = cheerio.load(html);
  const links = [];

  $('article.product_pod h3 a').each((_, el) => {
    const href = $(el).attr('href');
    // href is relative like ../../../book-name/index.html
    // resolve against the catalogue base
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

async function crawlCatalogue() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  let currentUrl = CATALOGUE_PAGE_1;
  let cataloguePageCount = 0;
  const allBookLinks = [];

  while (currentUrl && cataloguePageCount < 3) {
    const html = await fetchWithCache(currentUrl);
    cataloguePageCount++;

    const links = extractBookLinks(html, currentUrl);
    allBookLinks.push(...links);

    const nextUrl = extractNextPage(html, currentUrl);
    currentUrl = nextUrl;
  }

  // deduplicate
  const uniqueUrls = [...new Set(allBookLinks)];

  console.log(`\ncatalogue_pages=${cataloguePageCount}`);
  console.log(`discovered=${allBookLinks.length}`);
  console.log(`unique_urls=${uniqueUrls.length}`);

  return uniqueUrls;
}

async function main() {
  await crawlCatalogue();
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});