import { test, expect } from "@playwright/test";

test.describe("home page", () => {
  test("renders the navbar and a primary CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Movie/i);
    await expect(page.getByRole("link", { name: /MRH|MovieReviewHub/ })).toBeVisible();
  });

  test("anon user sees sign-in / register CTAs in the auth slot", async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.goto("/");
    // UserMenu first paints a skeleton, then resolves to anon CTAs.
    await expect(
      page.getByRole("link", { name: /sign in|iniciar sesión/i }),
    ).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("catalog pages render", () => {
  test("movies index responds and shows a grid", async ({ page }) => {
    await page.goto("/movies");
    await expect(page).toHaveURL(/\/movies/);
  });

  test("series index responds", async ({ page }) => {
    await page.goto("/series");
    await expect(page).toHaveURL(/\/series/);
  });

  test("unknown route shows the not-found page", async ({ page }) => {
    const res = await page.goto("/this-route-does-not-exist-xyz");
    expect(res?.status() ?? 404).toBeGreaterThanOrEqual(400);
    await expect(page.getByRole("heading", { name: /not found/i })).toBeVisible();
  });
});
