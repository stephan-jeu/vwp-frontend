import { test, expect } from '@playwright/test'

test.describe('Admin Projects', () => {
  test.beforeEach(async ({ page }) => {
    // Mock auth/me as admin and seed initial projects
    await page.route('**/auth/me', async (route) => {
      await route.fulfill({ json: { sub: 'admin@example.com', admin: true } })
    })
    await page.route('**/projects', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          json: [{ id: 1, code: 'P-001', location: 'Loc A', google_drive_folder: null }]
        })
      } else if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON()
        await route.fulfill({ status: 201, json: { id: 2, ...body } })
      } else {
        await route.continue()
      }
    })
    await page.route('**/projects/2', async (route) => {
      if (route.request().method() === 'PUT') {
        const body = route.request().postDataJSON()
        await route.fulfill({ json: { id: 2, ...body } })
      } else if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 204, body: '' })
      } else {
        await route.continue()
      }
    })

    // Seed access token to pass auth middleware
    await page.addInitScript(() => {
      window.localStorage.setItem('access_token', 'e2e-token')
      window.localStorage.setItem('refresh_token', 'e2e-refresh')
      // Point frontend to playwright baseURL if needed; assume same origin in dev
    })
  })

  test('create, edit, filter, delete project', async ({ page }) => {
    await page.goto('/admin/projects')

    // Ensure table shows initial row
    await expect(page.getByTestId('projects-table')).toBeVisible()
    await expect(page.getByText('P-001')).toBeVisible()

    // Create
    await page.getByTestId('input-code').fill('P-002')
    await page.getByTestId('input-location').fill('Loc B')
    await page.getByTestId('btn-submit').click()
    await expect(page.getByText('P-002')).toBeVisible()

    // Enter edit mode by clicking row
    await page.getByText('P-002').click()
    await page.getByTestId('input-location').fill('Loc B updated')

    // Update route is /projects/2 (configured above)
    await page.getByTestId('btn-submit').click()

    // Filter
    await page.getByTestId('global-filter').fill('P-002')
    await expect(page.getByText('P-001')).toHaveCount(0)
    await expect(page.getByText('P-002')).toBeVisible()

    // Delete
    await page.getByTestId('btn-delete-2').click()
    await expect(page.getByTestId('delete-modal')).toBeVisible()
    await page.getByTestId('btn-modal-delete').click()
    await expect(page.getByText('P-002')).toHaveCount(0)
  })
})




