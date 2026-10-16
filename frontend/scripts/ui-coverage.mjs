import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory()
    ? walk(path.join(directory, entry.name))
    : path.join(directory, entry.name)))).flat();
}

function family(file) {
  if (file.startsWith("src/app/")) {
    if (/login|change-password/.test(file)) return "01-login";
    if (/\[section\]|ui-checks|app\/page/.test(file)) return "02-dashboard";
    if (/settings/.test(file)) return "09-all-users";
    if (/visits/.test(file)) return /new|\[id\]/.test(file) ? "04-create-or-edit-lead" : "06-visits-calendar";
    if (/new|edit|website-simulator/.test(file)) return "04-create-or-edit-lead";
    if (/projects/.test(file)) return /\[id\]/.test(file) ? "08-project-details" : "07-projects";
    if (/\[id\]/.test(file)) return "05-lead-details";
    return "03-leads-and-deals-list";
  }
  if (/auth|login|change-password/.test(file)) return "01-login";
  if (/reports|work-dashboard|notification-panel/.test(file)) return "02-dashboard";
  if (/schedule/.test(file) && !/working-hours/.test(file)) return "06-visits-calendar";
  if (/users|working-hours|settings/.test(file)) return "09-all-users";
  if (/development-directory|property-directory|inventory-card|inventory-thumbnail/.test(file)) return "07-projects";
  if (/inventory/.test(file) && !/editor/.test(file)) return "08-project-details";
  if (/form|editor|create|contact-fields|website-form/.test(file)) return "04-create-or-edit-lead";
  if (/list|directory|columns|column-chooser|imports|discovery/.test(file)) return "03-leads-and-deals-list";
  return "05-lead-details";
}

const files = (await walk(path.join(root, "src"))).filter(file => file.endsWith(".tsx")).sort();
const routes = [], surfaces = [], regions = [];
for (const absolute of files) {
  const file = path.relative(root, absolute).replaceAll(path.sep, "/");
  if (file.startsWith("src/app/") && file.endsWith("/page.tsx")) {
    routes.push({ file, route: "/" + file.slice(8, -9).split("/").filter(part => !part.startsWith("(")).join("/"), family: family(file) });
  }
  if (!file.startsWith("src/features/") && !file.startsWith("src/components/shared/")) continue;
  const source = ts.createSourceFile(file, await readFile(absolute, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(source);
      const namedRegion = node.attributes.properties.some(attribute => ts.isJsxAttribute(attribute)
        && attribute.name.getText(source) === "role" && attribute.initializer
        && ts.isStringLiteral(attribute.initializer) && /^(region|dialog|alertdialog)$/.test(attribute.initializer.text));
      if (/^(form|fieldset|TabsTrigger|TabsContent|SheetContent|DialogContent|AlertDialogContent|ConfirmAction|section|aside|details)$/.test(tag) || /Panel$/.test(tag) || namedRegion) {
        const attributes = {};
        for (const attribute of node.attributes.properties) {
          if (!ts.isJsxAttribute(attribute) || !["aria-label", "aria-labelledby", "title", "value", "name"].includes(attribute.name.getText(source))) continue;
          const initializer = attribute.initializer;
          if (initializer) attributes[attribute.name.getText(source)] = ts.isStringLiteral(initializer)
            ? initializer.text : initializer.getText(source).slice(0, 180);
        }
        const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
        const entry = { file, line, kind: tag, labels: attributes, family: family(file) };
        if (/^(section|aside|details)$/.test(tag) || namedRegion) regions.push(entry);
        else surfaces.push(entry);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
console.info(JSON.stringify({ routes, surfaces, regions }, null, 2));
