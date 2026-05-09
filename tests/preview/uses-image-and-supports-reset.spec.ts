import { expect, test } from "../fixtures";

test.describe("Preview and reset", () => {
  test("uses-image-and-supports-reset", async ({ page }) => {
    // Initial state: preview image is an <img> element
    const preview = page.getByTestId("qr-preview-image");
    await expect(preview).toBeVisible();
    await expect(preview.evaluate(el => el.tagName)).resolves.toBe("IMG");

    // Clearing text shows error message
    await page.getByTestId("text-input").fill("");
    await expect(page.getByTestId("preview-error")).toContainText("エンコードする文字列を入力してください。");

    // Reset button restores defaults
    await page.getByTestId("reset-button").click();
    await expect(page.getByTestId("text-input")).toHaveValue("https://example.com");
    await expect(preview).toBeVisible();

    // Download link points to a data URL
    const href = await page.getByTestId("download-link").getAttribute("href");
    expect(href).toContain("data:image/svg+xml");
  });
});
