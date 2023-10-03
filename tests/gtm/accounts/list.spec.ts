// @ts-check
import { test, expect } from '@playwright/test';

test('GTM Account Expect 200', async ({ page }) => {
  const response = await page.goto(
    'http://localhost:3000/api/dashboard/gtm/accounts'
  );
  expect(response?.status()).toBe(200);
});

test('GTM Account Expect JSON', async ({ page }) => {
  const response = await page.goto(
    'http://localhost:3000/api/dashboard/gtm/accounts'
  );

  const contentType = response?.headers()['content-type'];
  expect(contentType).toContain('json');
  expect(contentType).toContain('application/json');
});

test('GTM Account Expect correct properties', async ({ page }) => {
  const response = await page.goto(
    'http://localhost:3000/api/dashboard/gtm/accounts'
  );
  const body = await response?.json();
  expect(body).toHaveProperty('data');
  expect(body).toHaveProperty('meta');
  expect(body).toHaveProperty('errors');
});

test('GTM Account Expect correct data properties', async ({ page }) => {
  const response = await page.goto(
    'http://localhost:3000/api/dashboard/gtm/accounts'
  );
  const body = await response?.json();
  body.data.forEach((item) => {
    expect(item).toHaveProperty('path');
    expect(item).toHaveProperty('accountId');
    expect(typeof item.accountId).toBe('string');
    expect(item).toHaveProperty('name');
    expect(typeof item.name).toBe('string');
    expect(item).toHaveProperty('features');
  });
});

test('GTM Account Expect correct features properties', async ({ page }) => {
  const response = await page.goto(
    'http://localhost:3000/api/dashboard/gtm/accounts'
  );
  const body = await response?.json();
  body.data.forEach((item) => {
    expect(item.features).toHaveProperty('supportUserPermissions');
    expect(item.features).toHaveProperty('supportMultipleContainers');
  });
});

test('GTM Account Expect correct meta properties', async ({ page }) => {
  const response = await page.goto(
    'http://localhost:3000/api/dashboard/gtm/accounts'
  );
  const body = await response?.json();
  expect(body.meta).toHaveProperty('total');
  expect(body.meta).toHaveProperty('pageNumber');
  expect(body.meta).toHaveProperty('totalPages');
  expect(body.meta).toHaveProperty('pageSize');
});

test('GTM Account Expect correct meta data types', async ({ page }) => {
  const response = await page.goto(
    'http://localhost:3000/api/dashboard/gtm/accounts'
  );
  const body = await response?.json();
  expect(typeof body.meta.total).toBe('number');
  expect(typeof body.meta.pageNumber).toBe('number');
  expect(typeof body.meta.totalPages).toBe('number');
  expect(typeof body.meta.pageSize).toBe('number');
});

test('GTM Account Expect correct meta data values', async ({ page }) => {
  const response = await page.goto(
    'http://localhost:3000/api/dashboard/gtm/accounts'
  );
  const body = await response?.json();
  expect(body.meta.total).toBeGreaterThan(0);
  expect(body.meta.pageNumber).toBe(1);
  expect(body.meta.totalPages).toBeGreaterThan(0);
  expect(body.meta.pageSize).toBeGreaterThan(0);
});

test('GTM Account Expect correct errors properties', async ({ page }) => {
  const response = await page.goto(
    'http://localhost:3000/api/dashboard/gtm/accounts'
  );
  const body = await response?.json();
  expect(body.errors).toBeNull();
});

test('GTM Account Expect Lenght of Body > 0', async ({ page }) => {
  const response = await page.goto(
    'http://localhost:3000/api/dashboard/gtm/accounts'
  );
  const body = await response?.json();
  expect(body.data.length).toBeGreaterThan(0);
});

test('GTM Account Expect Body Not to Throw', async ({ page }) => {
  const response = await page.goto(
    'http://localhost:3000/api/dashboard/gtm/accounts'
  );
  const body = await response?.json();
  expect(async () => {
    await body;
  }).not.toThrow();
});

test('GTM Account Expect correct data value types', async ({ page }) => {
  const response = await page.goto(
    'http://localhost:3000/api/dashboard/gtm/accounts'
  );
  const body = await response?.json();
  body.data.forEach((item) => {
    expect(typeof item.path).toBe('string');
    expect(typeof item.accountId).toBe('string');
    expect(typeof item.name).toBe('string');
    expect(typeof item.features).toBe('object');
    expect(typeof item.features.supportUserPermissions).toBe('boolean');
    expect(typeof item.features.supportMultipleContainers).toBe('boolean');
  });
});

test('GTM Account Expect correct meta value types', async ({ page }) => {
  const response = await page.goto(
    'http://localhost:3000/api/dashboard/gtm/accounts'
  );
  const body = await response?.json();
  expect(typeof body.meta.total).toBe('number');
  expect(typeof body.meta.pageNumber).toBe('number');
  expect(typeof body.meta.totalPages).toBe('number');
  expect(typeof body.meta.pageSize).toBe('number');
});

test('GTM Account Expect errors to be null or array', async ({ page }) => {
  const response = await page.goto(
    'http://localhost:3000/api/dashboard/gtm/accounts'
  );
  const body = await response?.json();
  if (body.errors !== null) {
    expect(Array.isArray(body.errors)).toBe(true);
  } else {
    expect(body.errors).toBeNull();
  }
});
