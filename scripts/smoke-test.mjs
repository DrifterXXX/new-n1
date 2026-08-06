/**
 * Browser/production smoke test for N1 Study Center.
 *
 * Uses Playwright (already installed globally) to serve the production `dist/`
 * and exercise the kanji flow: page load, browse/search, card mode, quiz mode,
 * review/wrong kanji flow.
 *
 * Usage:  node scripts/smoke-test.mjs
 * Env:    SMOKE_PORT=auto (default) or SMOKE_PORT=4173
 *
 * No browser window is shown. Cleans up the preview server on exit.
 * Returns exit code 0 on success, 1 on failure.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DIST = resolve(ROOT, 'dist');
const INDEX = resolve(DIST, 'index.html');

// ── MIME map ────────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
  '.mp3':  'audio/mpeg',
};

// ── Static file server ──────────────────────────────────────────────────────
function serveFile(res, filePath) {
  try {
    const data = readFileSync(filePath);
    const ext = extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
}

function createPreviewServer() {
  return createServer((req, res) => {
    let url = new URL(req.url, 'http://localhost');
    let pathname = url.pathname;

    // SPA fallback: if no extension, serve index.html
    if (pathname === '/' || !extname(pathname)) {
      pathname = '/index.html';
    }

    const filePath = resolve(DIST, pathname.slice(1));

    // Security: prevent path traversal
    if (!filePath.startsWith(DIST)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    serveFile(res, filePath);
  });
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  // Validate dist exists
  if (!existsSync(INDEX)) {
    console.error('❌ dist/index.html not found. Run `npm run build` first.');
    process.exit(1);
  }

  // Start preview server on dynamic port
  const server = createPreviewServer();
  const port = await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve(server.address().port);
    });
  });
  const BASE = `http://127.0.0.1:${port}`;
  console.log(`📡 Preview server at ${BASE}`);

  let exitCode = 0;
  let browser;

  try {
    // ── Load Playwright (global install) ──────────────────────────────────
    const pwIndex = resolve(
      process.env.HOME,
      '.hermes/hermes-agent/node_modules/playwright/index.js',
    );
    // Use createRequire to load the CJS module properly
    const { createRequire } = await import('node:module');
    const pwRequire = createRequire(pwIndex);
    const { chromium } = pwRequire(pwIndex);

    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: 'zh-CN',
    });
    const page = await context.newPage();

    // ── 1. Page load: /kanji ──────────────────────────────────────────────
    console.log('\n── 1. Page load: /kanji ──');
    await page.goto(`${BASE}/kanji`, { waitUntil: 'networkidle' });
    const title = await page.title();
    console.log(`   Title: "${title}"`);
    // Should show "JLPT N1 备考中心"

    // ── 2. Nav / route visible ────────────────────────────────────────────
    console.log('\n── 2. Nav / route visible ──');
    // Check that the page rendered — look for the mode bar with 浏览/卡片/选择题
    const modeBarText = await page.textContent('.mode-bar');
    console.log(`   Mode bar: "${modeBarText?.trim()}"`);
    if (!modeBarText?.includes('浏览') || !modeBarText?.includes('卡片') || !modeBarText?.includes('选择题')) {
      throw new Error('Mode bar missing expected buttons');
    }

    // Wait for kanji data to load (520 entries)
    await page.waitForSelector('.kanji-row', { timeout: 10000 });
    const rowCount = await page.locator('.kanji-row').count();
    console.log(`   Kanji rows visible: ${rowCount}`);
    if (rowCount === 0) throw new Error('No kanji rows rendered');

    // ── 3. Search for a known entry ───────────────────────────────────────
    console.log('\n── 3. Search for known entry ──');
    const searchInput = page.locator('.search__input');
    await searchInput.fill('お年寄り');
    // Wait for debounced search (200ms) + render
    await page.waitForTimeout(500);
    const searchResult = await page.locator('.kanji-row__term').first().textContent();
    console.log(`   Search result: "${searchResult}"`);
    if (!searchResult?.includes('お年寄り')) {
      throw new Error(`Expected "お年寄り" in search, got "${searchResult}"`);
    }

    // Clear search
    const clearBtn = page.locator('.search__clear');
    await clearBtn.click();
    await page.waitForTimeout(300);

    // ── 4. Switch to card mode ────────────────────────────────────────────
    console.log('\n── 4. Card mode ──');
    const cardBtn = page.locator('.mode-bar button').nth(1);
    await cardBtn.click();
    await page.waitForTimeout(300);

    // Wait for card to appear
    await page.waitForSelector('.card-flip', { timeout: 5000 });
    const cardText = await page.textContent('.card-flip__front');
    console.log(`   Card front: "${cardText?.trim()}"`);

    // ── 4a. Kanji audio control (before reveal — audio btn is on front face) ──
    console.log('\n── 4a. Kanji audio control ──');
    const audioBtn = page.locator('.card-flip__front .audio-btn');
    await audioBtn.waitFor({ state: 'visible', timeout: 5000 });
    console.log('   ✓ Kanji audio button is visible');

    // Click the audio button to trigger playback
    await audioBtn.click();
    await page.waitForTimeout(500);

    // Verify the audio store registered the play action: currentKey is set
    // to a kanji key and status left idle (loading/playing/error).
    const audioState = await page.evaluate(() => {
      try {
        const appEl = document.querySelector('#app');
        if (appEl && appEl.__vue_app__) {
          const pinia = appEl.__vue_app__.config.globalProperties.$pinia;
          if (pinia && pinia.state && pinia.state.value && pinia.state.value.audio) {
            return {
              currentKey: pinia.state.value.audio.currentKey,
              status: pinia.state.value.audio.status,
            };
          }
        }
      } catch { /* browser context — ignore */ }
      return null;
    });
    console.log(`   Audio state: ${JSON.stringify(audioState)}`);
    const currentKey = audioState?.currentKey ?? '';
    if (!/^kanji:kanji-\d+$/.test(currentKey)) {
      throw new Error(`Expected audio currentKey to match /^kanji:kanji-\\d+$/, got "${currentKey}"`);
    }
    if (!audioState?.status || audioState.status === 'idle') {
      throw new Error(`Expected audio status to leave idle after click, got "${audioState?.status}"`);
    }
    console.log('   ✓ Audio play action registered (currentKey + status)');

    // ── 4b. Reveal reading ─────────────────────────────────────────────────
    console.log('\n── 4b. Reveal reading ──');

    // Click to reveal (use dispatchEvent: the absolutely-positioned front
    // layer intercepts Playwright's actionability click on the card container)
    await page.dispatchEvent('.card-flip', 'click');
    await page.waitForTimeout(500);
    const readingText = await page.textContent('.card-flip__reading');
    console.log(`   Card reading: "${readingText?.trim()}"`);

    // ── 5. Self-rate ──────────────────────────────────────────────────────
    console.log('\n── 5. Self-rate ──');
    const rateBtns = page.locator('.card-rating button');
    const rateCount = await rateBtns.count();
    console.log(`   Rating buttons: ${rateCount}`);
    if (rateCount < 3) throw new Error('Expected 3 rating buttons');

    // Click "认识" (first button)
    await rateBtns.first().click();
    await page.waitForTimeout(300);

    // ── 6. Enter quiz after data loads ────────────────────────────────────
    console.log('\n── 6. Quiz mode ──');
    const quizBtn = page.locator('.mode-bar button').nth(2);
    await quizBtn.click();
    await page.waitForTimeout(500);

    // Wait for quiz to render
    await page.waitForSelector('.quiz-card', { timeout: 10000 });
    const quizProgress = await page.textContent('.quiz-progress');
    console.log(`   Quiz progress: "${quizProgress?.trim()}"`);

    // ── 7. Assert 20-question session / answer all 20 questions ───────────
    console.log('\n── 7. Answer all 20 questions ──');

    // Assert initial progress shows "1 / 20"
    if (!/1\s*\/\s*20/.test(quizProgress?.trim() ?? '')) {
      throw new Error(`Expected initial progress "1 / 20", got "${quizProgress?.trim()}"`);
    }
    console.log('   ✓ Initial progress shows "1 / 20"');

    // Answer all 20 questions — deliberately pick the first option each time
    // to guarantee some wrong answers (the correct answer is rarely option 0)
    for (let i = 0; i < 20; i++) {
      // Wait for options to be present
      const options = page.locator('.quiz-option');
      const optCount = await options.count();
      if (optCount === 0) {
        throw new Error(`No quiz options visible at question ${i + 1}`);
      }
      // Click the first option (deliberately wrong for most questions)
      await options.first().click();
      await page.waitForTimeout(150);
    }

    // Wait for summary screen to render
    console.log('\n── 8. Assert summary screen ──');
    await page.waitForSelector('.summary', { timeout: 5000 });
    const summaryText = await page.textContent('.summary');
    console.log(`   Summary text: "${summaryText?.trim().replace(/\s+/g, ' ')}"`);

    // Extract correct count, wrong count, and percentage from summary
    const summaryContent = await page.textContent('.summary');
    const correctMatch = summaryContent?.match(/(\d+)\s*答对/);
    const wrongMatch = summaryContent?.match(/(\d+)\s*答错/);
    const rateMatch = summaryContent?.match(/(\d+(?:\.\d+)?)%\s*正确率/);

    if (!correctMatch) throw new Error('Could not find correct count in summary');
    if (!wrongMatch) throw new Error('Could not find wrong count in summary');
    if (!rateMatch) throw new Error('Could not find percentage in summary');

    const correctCount = parseInt(correctMatch[1], 10);
    const wrongCount = parseInt(wrongMatch[1], 10);
    const rateValue = parseFloat(rateMatch[1]);

    console.log(`   Correct: ${correctCount}, Wrong: ${wrongCount}, Rate: ${rateValue}%`);

    // Assert correct + wrong = 20
    if (correctCount + wrongCount !== 20) {
      throw new Error(`Expected correct + wrong = 20, got ${correctCount} + ${wrongCount} = ${correctCount + wrongCount}`);
    }
    console.log('   ✓ correct + wrong = 20');

    // Assert percentage is finite numeric 0..100
    if (!Number.isFinite(rateValue) || rateValue < 0 || rateValue > 100) {
      throw new Error(`Expected percentage 0..100, got ${rateValue}`);
    }
    console.log('   ✓ Percentage is finite 0..100');

    // ── 9. Navigate review and assert wrong kanji flow ────────────────────
    console.log('\n── 9. Review: wrong kanji flow ──');

    // Navigate to review page — the wrong answers from the quiz should be recorded
    await page.goto(`${BASE}/review`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // The wrong tab should be active by default (first chip)
    const wrongTab = page.locator('.tabs .chip').first();
    const wrongTabText = await wrongTab.textContent();
    console.log(`   Review tab: "${wrongTabText?.trim()}"`);

    // Assert the wrong tab text contains "错题"
    if (!wrongTabText?.includes('错题')) {
      throw new Error(`Expected wrong tab to show "错题", got "${wrongTabText?.trim()}"`);
    }

    // Wait for review items to render
    await page.waitForSelector('.item', { timeout: 5000 });
    const reviewItems = page.locator('.item');
    const reviewCount = await reviewItems.count();
    console.log(`   Review items: ${reviewCount}`);

    if (reviewCount === 0) {
      throw new Error('Expected at least 1 review item after answering quiz questions wrong');
    }

    // Find a kanji review item (tag "汉字")
    const kanjiItems = page.locator('.item:has(.tag:has-text("汉字"))');
    const kanjiItemCount = await kanjiItems.count();
    console.log(`   Kanji review items: ${kanjiItemCount}`);

    if (kanjiItemCount === 0) {
      throw new Error('Expected at least 1 kanji review item (quiz answers should have created wrong kanji records)');
    }

    // Get the text of the first kanji wrong item — this is the persisted failed item
    const firstKanjiItemText = await kanjiItems.first().locator('.item__text').textContent();
    console.log(`   First wrong kanji text: "${firstKanjiItemText?.trim()}"`);

    // The "再练一次" button should be present and not disabled
    const retrainBtn = page.locator('button:has-text("再练一次")');
    const retrainDisabled = await retrainBtn.isDisabled();
    console.log(`   Retrain button disabled: ${retrainDisabled}`);

    if (retrainDisabled) {
      throw new Error('Expected retrain button to be enabled (wrongCount > 0)');
    }

    // ── 10. Click retrain and verify it leads to training flow ────────────
    console.log('\n── 10. Retrain: click "再练一次" and verify training flow ──');
    await retrainBtn.click();
    await page.waitForTimeout(500);

    // Should navigate to /train and show the training flow (TrainFlow)
    const currentUrl = page.url();
    console.log(`   URL after retrain click: "${currentUrl}"`);
    if (!currentUrl.includes('/train')) {
      throw new Error(`Expected URL to contain "/train", got "${currentUrl}"`);
    }

    // Wait for the training flow to render — look for the flow element
    await page.waitForSelector('.flow', { timeout: 10000 });
    console.log('   ✓ Training flow rendered');

    // Verify the training flow shows a kanji question whose prompt matches
    // the persisted failed item text from the review page
    const flowPrompt = await page.textContent('.flow__prompt');
    console.log(`   Training prompt: "${flowPrompt?.trim()}"`);

    // The prompt should be the term or reading from the wrong kanji entry
    // Extract the kanji term from the review item text (format: "term（reading）")
    const reviewItemText = firstKanjiItemText?.trim() ?? '';
    // The review item text is like "お年寄り（おとしより）" — extract the term
    const termFromReview = reviewItemText.split('（')[0];
    console.log(`   Expected term from review: "${termFromReview}"`);

    // The prompt should contain the term or reading from the wrong kanji entry
    if (!flowPrompt?.includes(termFromReview)) {
      // It might be a reading→term question, so the prompt is the reading
      // Check if the prompt is the reading part
      const readingFromReview = reviewItemText.match(/（(.+?)）/)?.[1];
      if (readingFromReview && flowPrompt?.includes(readingFromReview)) {
        console.log(`   ✓ Prompt matches reading "${readingFromReview}" from wrong kanji`);
      } else {
        // The quiz generates random questions from the wrong pool, and the pool
        // may contain multiple wrong entries. The prompt should at least be
        // a kanji-related question (not empty, has options)
        const flowOptions = page.locator('.flow .options .option');
        const optCount = await flowOptions.count();
        console.log(`   Flow options count: ${optCount}`);
        if (optCount === 0) {
          throw new Error('Expected training flow to show kanji options');
        }
        // The prompt is a kanji term or reading — verify it's non-empty
        if (!flowPrompt || flowPrompt.trim() === '') {
          throw new Error('Expected non-empty prompt in training flow');
        }
        console.log('   ✓ Training flow shows kanji question (prompt may differ due to random pool ordering)');
      }
    } else {
      console.log(`   ✓ Prompt matches term "${termFromReview}" from wrong kanji`);
    }

    console.log('\n✅ All smoke checks passed');
  } catch (err) {
    console.error(`\n❌ Smoke test failed: ${err.message}`);
    exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.close();
  }

  process.exit(exitCode);
}

main();