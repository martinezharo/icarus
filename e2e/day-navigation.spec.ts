import { expect, test, type Page } from '@playwright/test';
import { Buffer } from 'node:buffer';

/**
 * The day pane's day stepper jumps between days that hold entries (skipping
 * empty ones and crossing months), while the entry pager stays within a day.
 */

function vevent(uid: string, date: string, title: string): string[] {
  return [
    'BEGIN:VEVENT',
    `UID:${uid}@icarus.diary`,
    `DTSTART;VALUE=DATE:${date}`,
    `SUMMARY:${title}`,
    'END:VEVENT',
  ];
}

const DIARY_ICS = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//icarus//EN',
  ...vevent('a', '20251231', 'New year eve'),
  ...vevent('b', '20260608', 'Morning walk'),
  ...vevent('c', '20260608', 'Evening swim'),
  ...vevent('d', '20260620', 'Midsummer'),
  'END:VCALENDAR',
  '',
].join('\r\n');

async function importDiary(page: Page): Promise<void> {
  await page.goto('/');
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Import a diary/ }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: 'diary.ics',
    mimeType: 'text/calendar',
    buffer: Buffer.from(DIARY_ICS),
  });
}

async function openFromSearch(page: Page, title: string): Promise<void> {
  await page.getByPlaceholder('Search entries…').fill(title);
  await page.getByText(title).first().click();
  await expect(page.getByRole('article').getByText(title)).toBeVisible();
}

const heading = (page: Page) => page.getByRole('complementary').getByRole('heading', { level: 2 });
const article = (page: Page) => page.getByRole('complementary').getByRole('article');

test('steps between days with entries and between entries of a day', async ({ page }) => {
  await importDiary(page);
  await openFromSearch(page, 'Midsummer');

  const prevDay = page.getByRole('button', { name: 'Previous day' });
  const nextDay = page.getByRole('button', { name: 'Next day' });

  // Last day: nothing later.
  await expect(nextDay).toBeDisabled();

  // Skips the empty days between 20 and 8 June, and opens on the first entry.
  await prevDay.click();
  await expect(heading(page)).toContainText('2026');
  await expect(article(page)).toContainText('Morning walk');
  await expect(page.getByText('1 / 2')).toBeVisible();
  await page.screenshot({ path: 'test-results/day-navigation-pane.png' });

  // The entry pager stays on the same day.
  await page.getByRole('button', { name: 'Next entry' }).click();
  await expect(article(page)).toContainText('Evening swim');
  await page.keyboard.press('Shift+ArrowLeft');
  await expect(article(page)).toContainText('Morning walk');

  // ← crosses into the previous year and moves the calendar along with it.
  await page.keyboard.press('ArrowLeft');
  await expect(article(page)).toContainText('New year eve');
  await expect(prevDay).toBeDisabled();
  await expect(page.getByText('December 2025')).toBeVisible();
  await expect(page.getByText('1 / 2')).toBeHidden();

  await page.keyboard.press('ArrowRight');
  await expect(article(page)).toContainText('Morning walk');

  // Full-screen reader carries the same controls.
  await page.getByRole('button', { name: 'View full screen' }).click();
  await expect(page.getByRole('button', { name: 'Exit full screen' })).toBeVisible();
  await page.waitForTimeout(300); // let the fade-in settle for the screenshot
  await page.screenshot({ path: 'test-results/day-navigation-fullscreen.png' });
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('heading', { name: 'Midsummer' }).last()).toBeVisible();
});
