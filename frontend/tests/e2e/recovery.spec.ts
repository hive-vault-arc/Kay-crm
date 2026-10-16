import { test } from "../helpers/auth";
import { restoredJourney } from "../helpers/recovery";

test("SP21 AT25: real restored stack, revoked cookie/permit and current scoped data", async ({ page, baseURL }) => {
  test.setTimeout(150000);
  await restoredJourney(page, baseURL!);
});
