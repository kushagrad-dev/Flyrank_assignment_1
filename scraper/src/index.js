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

  // description is inside #product_description ~ p
  const descEl = $('#product_description ~ p').first();
  const description = descEl.length ? descEl.text().trim() : null;

  return {
    title,
    product_url: productUrl,
    price_text,
    availability_text,
    rating_text,
    description,
    source_page: sourcePageUrl,
    fetched_at: new Date().toISOString()
  };
}

async function crawlCatalogue() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  let currentUrl = CATALOGUE_PAGE_1;
  let cataloguePageCount = 0;
  const allBookLinks = [];
  const sourcePageMap = {};

  while (currentUrl && cataloguePageCount < 3) {
    const html = await fetchWithCache(currentUrl);
    const links = extractBookLinks(html, currentUrl);
    links.forEach(link => { sourcePageMap[link] = currentUrl; });
    allBookLinks.push(...links);
    cataloguePageCount++;
    currentUrl = extractNextPage(html, currentUrl);
  }

  const uniqueUrls = [...new Set(allBookLinks)];
  console.log(`\ncatalogue_pages=${cataloguePageCount}, discovered=${allBookLinks.length}, unique_urls=${uniqueUrls.length}`);
  return { uniqueUrls, sourcePageMap };
}

async function scrapeBooks(uniqueUrls, sourcePageMap) {
  const rawRecords = [];

  for (const url of uniqueUrls) {
    const html = await fetchWithCache(url);
    const record = extractBookDetail(html, url, sourcePageMap[url]);
    rawRecords.push(record);
  }

  console.log(`\ndetail_pages=${rawRecords.length}`);
  console.log('\nSample record:');
  console.log(JSON.stringify(rawRecords[0], null, 2));

  return rawRecords;
}

async function main() {
  const { uniqueUrls, sourcePageMap } = await crawlCatalogue();
  await scrapeBooks(uniqueUrls, sourcePageMap);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});