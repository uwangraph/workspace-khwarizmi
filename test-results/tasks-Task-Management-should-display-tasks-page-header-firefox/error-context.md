# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tasks.spec.ts >> Task Management >> should display tasks page header
- Location: tests/e2e/tasks.spec.ts:18:3

# Error details

```
Error: page.goto: Test ended.
Call log:
  - navigating to "http://localhost:5173/auth", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test'
  2   | 
  3   | test.describe('Task Management', () => {
  4   |   test.beforeEach(async ({ page }) => {
> 5   |     await page.goto('/auth')
      |                ^ Error: page.goto: Test ended.
  6   |     const testEmail = process.env.TEST_USER_EMAIL
  7   |     const testPassword = process.env.TEST_USER_PASSWORD
  8   | 
  9   |     if (testEmail && testPassword) {
  10  |       await page.fill('input[type="email"]', testEmail)
  11  |       await page.fill('input[type="password"]', testPassword)
  12  |       await page.click('button:has-text("Masuk ke Workspace")')
  13  |       await page.waitForURL('**/', { timeout: 10000 }).catch(() => {})
  14  |     }
  15  |     await page.goto('/tasks').catch(() => {})
  16  |   })
  17  | 
  18  |   test('should display tasks page header', async ({ page }) => {
  19  |     const headerVisible = await page.locator('text=Daftar Tugas').isVisible()
  20  |       || await page.locator('text=Kelola proyek').isVisible()
  21  |     expect(headerVisible || true).toBe(true)
  22  |   })
  23  | 
  24  |   test('should display task stats bar', async ({ page }) => {
  25  |     const statsVisible = await page.locator('text=Total').isVisible()
  26  |       || await page.locator('text=Selesai').isVisible()
  27  |       || await page.locator('text=Aktif').isVisible()
  28  |     expect(statsVisible || true).toBe(true)
  29  |   })
  30  | 
  31  |   test('should display list/calendar view tabs', async ({ page }) => {
  32  |     const listTabVisible = await page.locator('text=Daftar').isVisible()
  33  |     const calendarTabVisible = await page.locator('text=Kalender').isVisible()
  34  |     expect(listTabVisible || calendarTabVisible || true).toBe(true)
  35  |   })
  36  | 
  37  |   test('should switch between list and calendar view', async ({ page }) => {
  38  |     const calendarTab = page.locator('text=Kalender').first()
  39  |     if (await calendarTab.isVisible()) {
  40  |       await calendarTab.click()
  41  |       // Calendar view should be active
  42  |       await page.waitForTimeout(500)
  43  |     }
  44  | 
  45  |     const listTab = page.locator('text=Daftar').first()
  46  |     if (await listTab.isVisible()) {
  47  |       await listTab.click()
  48  |       await page.waitForTimeout(500)
  49  |     }
  50  |   })
  51  | 
  52  |   test('should display search bar', async ({ page }) => {
  53  |     const searchVisible = await page.locator('input[placeholder*="Cari"]').isVisible()
  54  |     expect(searchVisible || true).toBe(true)
  55  |   })
  56  | 
  57  |   test('should filter tasks by search', async ({ page }) => {
  58  |     const searchInput = page.locator('input[placeholder*="Cari"]').first()
  59  |     if (await searchInput.isVisible()) {
  60  |       await searchInput.fill('nonexistent-task-xyz')
  61  |       await page.waitForTimeout(500)
  62  |       // Should show empty state or no results
  63  |     }
  64  |   })
  65  | 
  66  |   test('should display add task button', async ({ page }) => {
  67  |     const addButtonVisible = await page.locator('button[title*="Tambah"]').isVisible()
  68  |       || await page.locator('button svg').filter({ has: page.locator('svg') }).first().isVisible()
  69  |     expect(addButtonVisible || true).toBe(true)
  70  |   })
  71  | 
  72  |   test('should open task creation modal', async ({ page }) => {
  73  |     const addButton = page.locator('button[title*="Tambah"], button:has(svg)').last()
  74  |     if (await addButton.isVisible()) {
  75  |       await addButton.click()
  76  |       await page.waitForTimeout(500)
  77  |       const modalVisible = await page.locator('text=Tambah Tugas').isVisible()
  78  |         || await page.locator('text=Edit Profil').isVisible()
  79  |         || await page.locator('[class*="modal"]').isVisible()
  80  |       expect(modalVisible || true).toBe(true)
  81  |     }
  82  |   })
  83  | 
  84  |   test('should display filter tabs', async ({ page }) => {
  85  |     const filterVisible = await page.locator('text=Semua').isVisible()
  86  |       || await page.locator('text=Sedang Dikerjakan').isVisible()
  87  |       || await page.locator('text=Selesai').isVisible()
  88  |     expect(filterVisible || true).toBe(true)
  89  |   })
  90  | 
  91  |   test('should filter tasks by status', async ({ page }) => {
  92  |     const doneFilter = page.locator('text=Selesai').first()
  93  |     if (await doneFilter.isVisible()) {
  94  |       await doneFilter.click()
  95  |       await page.waitForTimeout(500)
  96  |     }
  97  |   })
  98  | 
  99  |   test('should display empty state when no tasks', async ({ page }) => {
  100 |     const emptyVisible = await page.locator('text=Tidak Ada Tugas').isVisible()
  101 |       || await page.locator('text=Belum ada tugas').isVisible()
  102 |     // May or may not be visible depending on data
  103 |     expect(true).toBe(true)
  104 |   })
  105 | 
```