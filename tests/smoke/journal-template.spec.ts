import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { createFixtureVaultCopy, openFixtureVaultDesktopHarness, removeFixtureVaultCopy } from '../helpers/fixtureVault'
import { openCommandPalette, executeCommand } from './helpers'

let tempVaultDir: string

function writeFixtureNote(vaultPath: string, filename: string, content: string): string {
  const notePath = path.join(vaultPath, filename)
  fs.writeFileSync(notePath, content, 'utf8')
  return notePath
}

test.describe('Journal template substitution and date filenames', () => {
  test.beforeEach(async ({ page }) => {
    tempVaultDir = createFixtureVaultCopy()
    writeFixtureNote(
      tempVaultDir,
      'journal.md',
      '---\ntype: Type\nicon: notebook\ncolor: teal\ntemplate: "# {{date:EEEE, MMMM d}}\\n\\n"\n_filename_template: "{{date:yyyy-MM-dd}}"\n---\n# Journal\n',
    )
    await openFixtureVaultDesktopHarness(page, tempVaultDir)
    await page.setViewportSize({ width: 1600, height: 900 })
  })

  test.afterEach(() => {
    removeFixtureVaultCopy(tempVaultDir)
  })

  test('creates a date-named journal with a substituted body and opens the same note on repeat', async ({ page }) => {
    // First creation: produces today's date-named file with substituted heading.
    await page.locator('aside').getByText('Journals', { exact: true }).first().click()
    await page.locator('[title="Create new note"]').first().click()

    const todayIso = new Date().toISOString().slice(0, 10)
    await expect(page.getByTestId('breadcrumb-filename-trigger')).toContainText(todayIso, { timeout: 5_000 })

    await openCommandPalette(page)
    await executeCommand(page, 'Toggle Raw')
    const rawEditor = page.locator('.cm-content')
    await expect(rawEditor).toContainText('type: Journal')
    await expect(rawEditor).toContainText('# ' + weekdayLongMonthDay(new Date()))

    // Second creation on the same date: opens the existing note (no duplicate, no suffix).
    await page.locator('aside').getByText('Journals', { exact: true }).first().click()
    await page.locator('[title="Create new note"]').first().click()
    await expect(page.getByTestId('breadcrumb-filename-trigger')).toContainText(todayIso, { timeout: 5_000 })

    // Only one journal note file exists on disk.
    const journalFiles = fs.readdirSync(tempVaultDir).filter((name) => /^\d{4}-\d{2}-\d{2}\.md$/.test(name))
    expect(journalFiles).toHaveLength(1)
  })
})

function weekdayLongMonthDay(now: Date): string {
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${weekdays[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`
}
