import { expect, test } from "../fixtures";

test.describe("Query parameter sync", () => {
  test("updates-url-and-preview", async ({ page }) => {
    await page.getByTestId("text-input").fill("https://github.com/");

    await page.getByTestId("margin-input").fill("8");
    await page.getByTestId("margin-input").press("Tab");

    // Switch to jpeg first so quality-input becomes enabled
    await page.getByTestId("format-select").click();
    await page.getByRole("option", { name: "jpeg" }).click();

    await page.getByTestId("quality-input").fill("0.65");
    await page.getByTestId("quality-input").press("Tab");

    await expect(page).toHaveURL(/text=https%3A%2F%2Fgithub\.com%2F/);
    await expect(page).toHaveURL(/margin=8/);
    await expect(page).toHaveURL(/format=jpeg/);
    await expect(page).toHaveURL(/quality=0\.65/);

    const preview = page.getByTestId("qr-preview-image");
    await expect(preview).toBeVisible();
    await expect(preview).toHaveAttribute("src", /data:image\/jpeg/);
  });
});
