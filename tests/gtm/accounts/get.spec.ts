// @ts-check
import { test, expect } from '@playwright/test';

test.describe('GTM Account', () => {
  let accountId = '';

  test.beforeEach(async ({ page }) => {
    // Navigate to the page
    await page.goto('http://localhost:3000/dashboard/gtm/accounts');

    await page.waitForFunction('document.querySelector("select").length > 0');
    const accountIds = await page.$$eval('select option', (options) =>
      options.map((option) => (option as HTMLOptionElement).value)
    );

    // Ensure there's at least one account ID
    expect(accountIds.length).toBeGreaterThan(0);

    // Use the first account ID
    accountId = accountIds[0];

    // Select the account ID in the select element
    await page.selectOption('select', accountId);

    // Click the submit button
    await page.click('button[type="submit"]');
  });

  test('GTM Account FrontEnd', async ({ page }) => {
    // Check the status of the response
    const response = await page.goto(
      `http://localhost:3000/api/dashboard/gtm/accounts/${accountId}`
    );

    expect(response?.status()).toBe(200);
  });

  test('GTM Account Expect JSON', async ({ page }) => {
    const response = await page.goto(
      `http://localhost:3000/api/dashboard/gtm/accounts/${accountId}`
    );

    const contentType = response?.headers()['content-type'];
    expect(contentType).toContain('json');
    expect(contentType).toContain('application/json');
  });

  test('GTM Account Expect correct properties', async ({ page }) => {
    const response = await page.goto(
      `http://localhost:3000/api/dashboard/gtm/accounts/${accountId}`
    );
    const body = await response?.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('meta');
    expect(body).toHaveProperty('errors');
  });

  test('GTM Account Expect correct data properties', async ({ page }) => {
    const response = await page.goto(
      `http://localhost:3000/api/dashboard/gtm/accounts/${accountId}`
    );
    const body = await response?.json();

    body.data.forEach((item) => {
      expect(item).toHaveProperty('path');
      expect(item).toHaveProperty('accountId');
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('fingerprint');
      expect(item).toHaveProperty('tagManagerUrl');
      expect(item).toHaveProperty('features');
    });
  });

  test('GTM Account Expect correct features properties', async ({ page }) => {
    const response = await page.goto(
      `http://localhost:3000/api/dashboard/gtm/accounts/${accountId}`
    );
    const body = await response?.json();
    body.data.forEach((item) => {
      expect(item.features).toHaveProperty('supportUserPermissions');
      expect(item.features).toHaveProperty('supportMultipleContainers');
    });
  });

  test('GTM Account Expect correct meta properties', async ({ page }) => {
    const response = await page.goto(
      `http://localhost:3000/api/dashboard/gtm/accounts/${accountId}`
    );
    const body = await response?.json();
    expect(body.meta).toHaveProperty('totalResults');
  });

  test('GTM Account Expect correct errors properties', async ({ page }) => {
    const response = await page.goto(
      `http://localhost:3000/api/dashboard/gtm/accounts/${accountId}`
    );
    const body = await response?.json();
    expect(body.errors).toBeNull();
  });

  test('GTM Account Expect Lenght of Body > 0', async ({ page }) => {
    const response = await page.goto(
      `http://localhost:3000/api/dashboard/gtm/accounts/${accountId}`
    );
    const body = await response?.json();
    expect(body.data.length).toBeGreaterThan(0);
  });

  test('GTM Account Expect Body Not to Throw', async ({ page }) => {
    const response = await page.goto(
      `http://localhost:3000/api/dashboard/gtm/accounts/${accountId}`
    );
    const body = await response?.json();
    expect(async () => {
      await body;
    }).not.toThrow();
  });

  test('GTM Account Expect correct data value types', async ({ page }) => {
    const response = await page.goto(
      `http://localhost:3000/api/dashboard/gtm/accounts/${accountId}`
    );
    const body = await response?.json();
    body.data.forEach((item) => {
      expect(typeof item.path).toBe('string');
      expect(typeof item.accountId).toBe('string');
      expect(typeof item.name).toBe('string');
      expect(typeof item.fingerprint).toBe('string');
      expect(typeof item.tagManagerUrl).toBe('string');
      expect(typeof item.features).toBe('object');
      expect(typeof item.features.supportUserPermissions).toBe('boolean');
      expect(typeof item.features.supportMultipleContainers).toBe('boolean');
    });
  });

  test('GTM Account Expect correct meta value types', async ({ page }) => {
    const response = await page.goto(
      `http://localhost:3000/api/dashboard/gtm/accounts/${accountId}`
    );
    const body = await response?.json();
    expect(typeof body.meta.totalResults).toBe('number');
  });

  test('GTM Account Expect errors to be null or array', async ({ page }) => {
    const response = await page.goto(
      `http://localhost:3000/api/dashboard/gtm/accounts/${accountId}`
    );
    const body = await response?.json();
    if (body.errors !== null) {
      expect(Array.isArray(body.errors)).toBe(true);
    } else {
      expect(body.errors).toBeNull();
    }
  });
});

test.describe('GTM Account Error Cases', () => {
  let accountId = 'nonexistent';

  test('GTM Account Nonexistent', async ({ page }) => {
    // Navigate to the page
    const response = await page.goto(
      `http://localhost:3000/api/dashboard/gtm/accounts/${accountId}`
    );

    // Check the status of the response
    expect(response?.status()).toBe(400);
  });

  test('GTM Account 404', async ({ page }) => {
    // Navigate to the page
    const response = await page.goto(
      `http://localhost:3000/api/dashboard/gtm/account/${accountId}`
    );

    // Check the status of the response
    expect(response?.status()).toBe(404);
  });

  test('GTM Account Invalid JSON', async ({ page }) => {
    // Navigate to the page
    const response = await page.goto(
      `http://localhost:3000/api/dashboard/gtm/accounts/${accountId}`
    );

    // Check if the response is valid JSON
    let body;
    try {
      body = await response?.json();
    } catch (error) {
      body = null;
    }
    expect(body).toEqual({
      error:
        '"accountId" with value "nonexistent" fails to match the required pattern: /^\\d{10}$/',
    });
  });
});
