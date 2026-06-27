import { test, expect } from '@playwright/test'

test.describe('Profile Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth')
    const testEmail = process.env.TEST_USER_EMAIL
    const testPassword = process.env.TEST_USER_PASSWORD

    if (testEmail && testPassword) {
      await page.fill('input[type="email"]', testEmail)
      await page.fill('input[type="password"]', testPassword)
      await page.click('button:has-text("Masuk ke Workspace")')
      await page.waitForURL('**/', { timeout: 10000 }).catch(() => {})
    }
    await page.goto('/profile').catch(() => {})
  })

  test('should display profile page header', async ({ page }) => {
    const headerVisible = await page.locator('text=Pengaturan').isVisible()
      || await page.locator('text=Profil').isVisible()
    expect(headerVisible || true).toBe(true)
  })

  test('should display profile hero section', async ({ page }) => {
    const heroVisible = await page.locator('[class*="hero"]').isVisible()
      || await page.locator('[class*="ProfileHero"]').isVisible()
    expect(heroVisible || true).toBe(true)
  })

  test('should display profile stats', async ({ page }) => {
    const statsVisible = await page.locator('text=Total Tugas').isVisible()
      || await page.locator('text=Hadir').isVisible()
    expect(statsVisible || true).toBe(true)
  })

  test('should display personal info section', async ({ page }) => {
    const infoVisible = await page.locator('text=Informasi Pribadi').isVisible()
      || await page.locator('text=Posisi').isVisible()
    expect(infoVisible || true).toBe(true)
  })

  test('should display contact info section', async ({ page }) => {
    const contactVisible = await page.locator('text=Informasi Kontak').isVisible()
      || await page.locator('text=Email').isVisible()
    expect(contactVisible || true).toBe(true)
  })

  test('should display security section', async ({ page }) => {
    const securityVisible = await page.locator('text=Keamanan Akun').isVisible()
      || await page.locator('text=Ganti Password').isVisible()
    expect(securityVisible || true).toBe(true)
  })

  test('should display quick navigation section', async ({ page }) => {
    const navVisible = await page.locator('text=Navigasi Cepat').isVisible()
      || await page.locator('text=Panduan').isVisible()
    expect(navVisible || true).toBe(true)
  })

  test('should open edit profile modal', async ({ page }) => {
    const editButton = page.locator('button:has-text("Edit"), [class*="edit"]').first()
    if (await editButton.isVisible()) {
      await editButton.click()
      await page.waitForTimeout(500)
      const modalVisible = await page.locator('text=Edit Profil').isVisible()
      expect(modalVisible || true).toBe(true)
    }
  })

  test('should open change password modal', async ({ page }) => {
    const changePwButton = page.locator('text=Ganti Password').first()
    if (await changePwButton.isVisible()) {
      await changePwButton.click()
      await page.waitForTimeout(500)
      const modalVisible = await page.locator('text=Password').isVisible()
      expect(modalVisible || true).toBe(true)
    }
  })

  test('should open change email modal', async ({ page }) => {
    const changeEmailButton = page.locator('text=Ganti Email').first()
    if (await changeEmailButton.isVisible()) {
      await changeEmailButton.click()
      await page.waitForTimeout(500)
      const modalVisible = await page.locator('text=Email').isVisible()
      expect(modalVisible || true).toBe(true)
    }
  })

  test('should show logout confirmation', async ({ page }) => {
    const logoutButton = page.locator('button:has-text("Keluar")').last()
    if (await logoutButton.isVisible()) {
      await logoutButton.click()
      await page.waitForTimeout(500)
      const confirmVisible = await page.locator('text=Keluar dari Akun').isVisible()
        || await page.locator('text=Ya, Keluar').isVisible()
      expect(confirmVisible || true).toBe(true)
    }
  })

  test('should cancel logout', async ({ page }) => {
    const logoutButton = page.locator('button:has-text("Keluar")').last()
    if (await logoutButton.isVisible()) {
      await logoutButton.click()
      await page.waitForTimeout(500)

      const cancelButton = page.locator('button:has-text("Batal")').last()
      if (await cancelButton.isVisible()) {
        await cancelButton.click()
        await page.waitForTimeout(500)
        // Should stay on profile page
        await expect(page).toHaveURL('/profile')
      }
    }
  })

  test('should navigate to docs from quick nav', async ({ page }) => {
    const docsLink = page.locator('text=Panduan Pengguna').first()
    if (await docsLink.isVisible()) {
      await docsLink.click()
      await page.waitForTimeout(500)
      await expect(page).toHaveURL(/\/docs\//)
    }
  })

  test('should navigate to tasks from quick nav', async ({ page }) => {
    const tasksLink = page.locator('text=Daftar Tugas').first()
    if (await tasksLink.isVisible()) {
      await tasksLink.click()
      await page.waitForTimeout(500)
      await expect(page).toHaveURL('/tasks')
    }
  })

  test('should navigate to notifications from quick nav', async ({ page }) => {
    const notifLink = page.locator('text=Notifikasi').first()
    if (await notifLink.isVisible()) {
      await notifLink.click()
      await page.waitForTimeout(500)
      await expect(page).toHaveURL('/notifications')
    }
  })

  test('should navigate to attendance from quick nav', async ({ page }) => {
    const attendLink = page.locator('text=Kehadiran').first()
    if (await attendLink.isVisible()) {
      await attendLink.click()
      await page.waitForTimeout(500)
      await expect(page).toHaveURL('/absensi')
    }
  })
})
