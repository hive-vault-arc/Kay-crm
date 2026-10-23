import { expect, signedInTest as test, removeInputSnapshots } from "../helpers/auth";
import { mkdir } from "node:fs/promises";
import { inspectIcons } from "../helpers/icons";
import {
  formatBusinessDate,
  formatInstant,
  formatMAD,
  formatPhone,
} from "../../src/lib/format";
import { parseColumnPreference } from "../../src/lib/table/column-preferences";
import { safeReturnPath } from "../../src/lib/auth/contracts";
import type { TestInfoError } from "@playwright/test";
import { omitInputBearingSteps } from "../../scripts/private-reporter";

test("AT-23: live shadcn/RHF/Zod/table loading, empty, invalid and recovery", async ({
  page,
}) => {
  await page.goto("/ui-checks");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Vérification des composants",
  );
  await expect(page.getByRole("status")).toContainText(
    "Chargement des lignes…",
  );
  await expect(
    page.getByRole("cell", { name: "Aucune ligne synthétique." }),
  ).toBeVisible();
  await expect(page.locator('svg[data-kay-icon="alert"]')).toBeVisible();
  await inspectIcons(page);
  await mkdir("output/playwright/iconsax", { recursive: true });
  await page.screenshot({ path: "output/playwright/iconsax/56-development-loading-error.png", fullPage: true });
  await page.getByRole("button", { name: "Vérifier le libellé" }).click();
  await expect(page.getByText("Saisissez un libellé.")).toBeVisible();
  await expect(page.getByLabel("Libellé de colonne")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page
    .getByLabel("Libellé de colonne")
    .fill("État de la demande synthétique");
  await page.getByRole("button", { name: "Vérifier le libellé" }).click();
  await expect(page.getByText("Préférence validée localement.")).toBeVisible();
  await page
    .getByRole("button", { name: "Déclencher l’erreur de test" })
    .click();
  await expect(
    page.getByText("Impossible d’afficher cette page"),
  ).toBeVisible();
  await inspectIcons(page);
  await page.screenshot({ path: "output/playwright/iconsax/57-development-error-boundary.png", fullPage: true });
  await page.getByRole("button", { name: "Réessayer" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Vérification des composants",
  );
});

test("exact display helpers and preference metadata reject invalid data", () => {
  const report = { steps: [{ title: "non-secret input probe" }] };
  omitInputBearingSteps(report);
  expect(report.steps).toHaveLength(0);
  const errors: TestInfoError[] = [{ message: "Safe diagnostic", errorContext: "non-secret probe", cause: { errorContext: "nested probe" } }];
  removeInputSnapshots(errors);
  expect(errors[0].errorContext).toBeUndefined();
  expect(errors[0].cause?.errorContext).toBeUndefined();
  for (const unsafe of ["//foreign.example", "https://foreign.example", "/%2f%2fforeign", "/api/v1/auth/me", "/login", "/change-password", "/\\foreign", "/projects?private=value", ["/projects"]])
    expect(safeReturnPath(unsafe)).toBe("/dashboard");
  expect(safeReturnPath("/projects")).toBe("/projects");
  expect(formatMAD("9007199254740993.99")).toBe("9 007 199 254 740 993,99 MAD");
  expect(formatMAD("0")).toBe("0,00 MAD");
  expect(formatMAD(null)).toBe("Non renseigné");
  expect(() => formatMAD("12.123")).toThrow("INVALID_MONEY");
  expect(formatBusinessDate("2026-10-14")).toBe("14 oct. 2026");
  expect(() => formatBusinessDate("2026-02-30")).toThrow("INVALID_DATE");
  expect(formatInstant("2026-09-19T09:00:00Z")).toContain("10:00");
  expect(formatInstant("2026-10-14T09:00:00Z")).toContain("09:00");
  expect(() => formatInstant("2026-10-14T09:00:00")).toThrow("INVALID_INSTANT");
  expect(formatPhone("+212600000001")).toBe("+212600000001");
  expect(
    parseColumnPreference({
      version: 1,
      list: "deals",
      visibleColumns: ["status"],
    }),
  ).not.toBeNull();
  expect(
    parseColumnPreference({
      version: 1,
      list: "deals",
      visibleColumns: ["privateNotes"],
    }),
  ).toBeNull();
  expect(
    parseColumnPreference({
      version: 1,
      list: "deals",
      visibleColumns: ["status"],
      contact: "synthetic",
    }),
  ).toBeNull();
});
