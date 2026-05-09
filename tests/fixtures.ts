import { expect, test as base } from "@playwright/test";

export { expect };

export const test = base.extend({
  page: async ({ page, baseURL }, use) => {
    await page.goto(baseURL ?? "/");
    await use(page);
  },
});
