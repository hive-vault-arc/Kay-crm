import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
async function walk(directory) {
  return (await Promise.all((await readdir(directory, { withFileTypes: true })).map(entry =>
    entry.isDirectory() ? walk(path.join(directory, entry.name)) : path.join(directory, entry.name)))).flat();
}
const files = (await walk(path.join(root, "src"))).filter(file => /\.[cm]?[jt]sx?$/.test(file)).sort();
const manifest = JSON.parse(await readFile(path.join(root, "../docs/reference/iconsax/assets.json"), "utf8"));
const known = new Set(manifest.icons.map(icon => icon.export));
const consumers = [], chartSvg = [], violations = [];
for (const file of files) {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  const source = await readFile(file, "utf8");
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const imports = [], sites = [], svg = [];
  function visit(node) {
    if (ts.isImportDeclaration(node)) {
      const importPath = node.moduleSpecifier.text;
      if (/lucide|iconsax|react-icons|heroicons|tabler|phosphor|iconify/.test(importPath))
        violations.push({ file: relative, reason: "Direct or unapproved icon-package import" });
      if (importPath === "@/components/icons" && node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
        for (const specifier of node.importClause.namedBindings.elements) {
          const imported = (specifier.propertyName ?? specifier.name).text;
          if (known.has(imported)) imports.push({ imported, local: specifier.name.text });
          else assert(["KayIconProps", "KayIconComponent"].includes(imported), `Unknown semantic export: ${imported}`);
        }
      }
    }
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const name = node.tagName.getText(ast);
      const line = ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1;
      if (name === "svg") svg.push(line);
      if (known.has(name) || name === "Icon") sites.push({ component: name, line });
    }
    if ((ts.isJsxAttribute(node) && node.name.getText(ast) === "icon") ||
        (ts.isPropertyAssignment(node) && node.name.getText(ast) === "icon")) {
      const expression = ts.isJsxAttribute(node) && node.initializer && ts.isJsxExpression(node.initializer)
        ? node.initializer.expression : ts.isPropertyAssignment(node) ? node.initializer : undefined;
      if (expression && ts.isIdentifier(expression) && known.has(expression.text))
        sites.push({ component: expression.text, line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1, kind: "composed-icon" });
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  if (imports.length || sites.length) consumers.push({ file: relative, imports, sites });
  if (svg.length && relative.startsWith("src/components/charts/")) chartSvg.push({ file: relative, lines: svg });
  else if (svg.length && relative !== "src/components/icons/index.tsx")
    violations.push({ file: relative, reason: "Interface SVG outside the semantic icon layer", lines: svg });
}
assert.equal(violations.length, 0, JSON.stringify(violations));
const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
assert(!pkg.dependencies["lucide-react"], "Unused Lucide dependency remains");
console.log(JSON.stringify(process.argv.includes("--check")
  ? { semanticIcons: known.size, consumers: consumers.length, sites: consumers.reduce((count, consumer) => count + consumer.sites.length, 0), chartRootsExcluded: chartSvg.reduce((count, chart) => count + chart.lines.length, 0), violations: violations.length }
  : { semanticIcons: known.size, consumers, chartGeometryExcluded: chartSvg, violations }, null, 2));
