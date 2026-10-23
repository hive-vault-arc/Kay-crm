import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
const manifest = JSON.parse(await readFile(path.join(root, "../docs/reference/iconsax/assets.json"), "utf8"));
const icons = new Set(manifest.icons.map(icon => icon.export));
// This wrapper renders the existing NotificationIcon together with its live unread count.
icons.add("LiveNotificationIcon");
const dataControls = new Map([
  ["src/features/schedule/calendar-sidebar.tsx", "Mini-month week buttons show actual date values; month arrows use shared directional actions."],
  ["src/features/contacts/numbered-pages.tsx", "Numbered page identity; previous/next carry directional icons."],
  ["src/features/reports/kpi-summary.tsx", "Exact KPI value; its metric label already has a semantic icon."],
  ["src/features/reports/metric-chart.tsx", "Contributor label with chart series marker, not an extra action glyph."],
  ["src/features/reports/report-dashboard.tsx", "Exact tabular metric drill-down value."],
]);
async function walk(directory) {
  return (await Promise.all((await readdir(directory, { withFileTypes: true })).map(entry =>
    entry.isDirectory() ? walk(path.join(directory, entry.name)) : path.join(directory, entry.name)))).flat();
}
const sites = [], violations = [];
for (const file of (await walk(path.join(root, "src"))).filter(file => file.endsWith(".tsx")).sort()) {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  const source = await readFile(file, "utf8"), ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(node) {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const opening = ts.isJsxElement(node) ? node.openingElement : node, name = opening.tagName.getText(ast);
      const attribute = key => opening.attributes.properties.find(item => ts.isJsxAttribute(item) && item.name.getText(ast) === key);
      const line = ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1;
      if (name === "AlertDialogCancel" && !attribute("asChild")) violations.push({ file: relative, line, reason: "Unstyled dialog action must compose Button." });
      if (name === "button") violations.push({ file: relative, line, reason: "Application action bypasses the shared Button." });
      if (name === "Button") {
        const action = attribute("action")?.initializer?.getText(ast);
        let existingIcon = false;
        function inspect(child) {
          if ((ts.isJsxOpeningElement(child) || ts.isJsxSelfClosingElement(child)) && icons.has(child.tagName.getText(ast))) existingIcon = true;
          ts.forEachChild(child, inspect);
        }
        if (ts.isJsxElement(node)) node.children.forEach(inspect);
        const body = ts.isJsxElement(node) ? node.children.map(child => child.getText(ast)).join("").trim() : "";
        const numericPage = relative.endsWith("contacts/numbered-pages.tsx") && body === "{value}" && attribute("aria-current");
        const metricValue = ["src/features/reports/kpi-summary.tsx", "src/features/reports/report-dashboard.tsx"].includes(relative) && body.startsWith("{metric.unit ===") && attribute("variant")?.initializer?.getText(ast) === '"link"';
        const seriesMarker = relative.endsWith("reports/metric-chart.tsx") && body.startsWith('<span aria-hidden="true" className="size-3');
        const calendarWeek = relative === "src/features/schedule/calendar-sidebar.tsx" && attribute("aria-pressed") && attribute("className")?.initializer?.getText(ast).includes("calendar-month-choice");
        const exception = !action && !existingIcon && (numericPage || metricValue || seriesMarker || calendarWeek) && dataControls.get(relative);
        if (!action && !existingIcon && !exception) violations.push({ file: relative, line, reason: "Action needs an explicit semantic icon mapping." });
        sites.push({ file: relative, line, action: action ?? null, existingIcon, exception: exception || null });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
}
assert.equal(violations.length, 0, JSON.stringify(violations));
const summary = { buttons: sites.length, files: new Set(sites.map(site => site.file)).size, semanticActions: sites.filter(site => site.action).length, existingIconButtons: sites.filter(site => site.existingIcon).length, dataControlExceptions: sites.filter(site => site.exception).length, violations: violations.length };
console.log(JSON.stringify(process.argv.includes("--json") ? { summary, sites, violations } : summary, null, 2));
