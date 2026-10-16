import { test } from "../helpers/auth";
import { restoredJourney } from "../helpers/recovery";
test.use({ hasTouch: true });

test("SP21 visible restored-stack journey and preserved desktop/mobile states", async ({ page, baseURL }) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await restoredJourney(page, baseURL!, true);
});
