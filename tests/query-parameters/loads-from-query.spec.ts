import { expect, test } from "../fixtures";

test.describe("Query parameter hydration", () => {
  test("loads-from-query", async ({ page, baseURL }) => {
    await page.goto(
      `${baseURL}/?text=hello%20world&ecl=H&margin=2&scale=6&width=420&mask=3&dark=%23001122&light=%23ffeecc&quality=0.75`,
    );

    await expect(page.getByTestId("text-input")).toHaveValue("hello world");
    await expect(page.getByTestId("width-input")).toHaveValue("420");
    await expect(page.getByTestId("mask-input")).toHaveValue("3");

    const preview = page.getByTestId("qr-preview-image");
    await expect(preview).toBeVisible();
    await expect(preview).toHaveAttribute("src", /data:image\/svg\+xml/);
  });
});
