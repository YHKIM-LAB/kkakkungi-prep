import { expect, test } from "@playwright/test";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function kstDateOnly(offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * DAY_IN_MS + 9 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

function compactDate(value: string) {
  return value.replaceAll("-", "");
}

test("mobile shopping card stays inside 320-430px viewports", async ({ page }) => {
  await page.goto("/shopping");
  await expect(page.getByRole("heading", { name: "준비물", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "아기침대", exact: true })).toBeVisible();

  for (const width of [320, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });

    const metrics = await page.locator(".shopping-board-list > li").evaluateAll((cards) => cards.map((card) => {
      const rectangle = card.getBoundingClientRect();
      return {
        left: rectangle.left,
        right: rectangle.right,
        width: rectangle.width,
      };
    }));
    const pageWidth = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));

    expect(metrics.length).toBeGreaterThan(0);
    expect(metrics.every((card) => card.left >= 0 && card.right <= width && card.width > 0)).toBe(true);
    expect(pageWidth.scrollWidth).toBeLessThanOrEqual(pageWidth.viewportWidth);
    await expect(page.getByLabel("아기침대 구매 상태", { exact: true })).toBeVisible();
  }
});

test("schedule CRUD stays in sync with the home page", async ({ page }) => {
  const runPrefix = `E2E-${compactDate(kstDateOnly())}-${process.pid}-${Date.now().toString(36)}`;
  const createdTitle = `${runPrefix} 진료 일정`;
  const updatedTitle = `${runPrefix} 수정 일정`;
  const createdDate = kstDateOnly(7);
  const updatedDate = kstDateOnly(14);

  try {
    await page.goto("/schedule");
    await page.getByRole("button", { name: "+ 일정 추가", exact: true }).click();

    const createForm = page.locator(".schedule-board > .schedule-form");
    await createForm.locator('input[name="title"]').fill(createdTitle);
    await createForm.locator('input[name="date"]').fill(createdDate);
    await createForm.locator('select[name="category"]').selectOption("진료");
    await createForm.locator('textarea[name="memo"]').fill(`${runPrefix} 생성`);
    await createForm.getByRole("button", { name: "저장", exact: true }).click();

    const createdEntry = page.locator(".schedule-entry").filter({ hasText: createdTitle });
    await expect(createdEntry).toBeVisible();
    await expect(createdEntry).toContainText("진료");
    const createdWeekLabel = await createdEntry.locator(".timeline__week").innerText();
    expect(createdWeekLabel).toMatch(/^\d+주$/);
    const createdWeek = Number.parseInt(createdWeekLabel, 10);

    await createdEntry.getByRole("button", { name: "수정", exact: true }).click();
    const editForm = page.locator(".schedule-editing .schedule-form");
    await editForm.locator('input[name="title"]').fill(updatedTitle);
    await editForm.locator('input[name="date"]').fill(updatedDate);
    await editForm.locator('select[name="category"]').selectOption("검사");
    await editForm.locator('textarea[name="memo"]').fill(`${runPrefix} 수정 완료`);
    await editForm.getByRole("button", { name: "저장", exact: true }).click();

    const updatedEntry = page.locator(".schedule-entry").filter({ hasText: updatedTitle });
    await expect(updatedEntry).toBeVisible();
    await expect(updatedEntry).toContainText("검사");
    await expect(updatedEntry).toContainText(`${runPrefix} 수정 완료`);
    await expect(updatedEntry.locator(".timeline__week")).toHaveText(`${Math.min(45, createdWeek + 1)}주`);

    await page.reload();
    await expect(page.locator(".schedule-entry").filter({ hasText: updatedTitle })).toBeVisible();

    await page.goto("/");
    const homeEntry = page.locator(".schedule-list li").filter({ hasText: updatedTitle });
    await expect(homeEntry).toBeVisible();
    await expect(homeEntry).toContainText(updatedDate.slice(5).replace("-", "."));
    await expect(homeEntry).toContainText("검사");
    await expect(homeEntry).toContainText(`${runPrefix} 수정 완료`);
  } finally {
    await page.goto("/schedule");
    const matches = page.locator(".schedule-entry").filter({ hasText: runPrefix });
    const matchCount = await matches.count();

    expect(matchCount, "정리 대상 E2E 일정은 최대 1건이어야 합니다.").toBeLessThanOrEqual(1);

    if (matchCount === 1) {
      page.once("dialog", (dialog) => dialog.accept());
      await matches.getByRole("button", { name: "삭제", exact: true }).click();
      await expect(matches).toHaveCount(0);
    }
  }
});
