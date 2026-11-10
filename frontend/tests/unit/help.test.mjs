import assert from "node:assert/strict";
import test from "node:test";
import { loadServer } from "./load-server.mjs";
import { createElement } from "react";
import * as react from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";

const base = "src/features/help/";
const modules = Object.fromEntries(["crm", "inventory", "work"].map(name => [`./guides-${name}`, loadServer(`${base}guides-${name}.ts`)]));
const { helpArticles, helpCategories, articlesForRole, helpArticleForRole } = loadServer(`${base}catalog.ts`, { modules });
const { searchHelp } = loadServer(`${base}search.ts`);
const { safeReturnPath } = loadServer("src/lib/auth/contracts.ts");
const navigation = loadServer(`${base}navigation.ts`);
const helpViewModules = {
  react, "react/jsx-runtime": jsxRuntime,
  "next/link": { default: props => { const safe = { ...props }; delete safe.prefetch; return createElement("a", safe); } },
  "next/navigation": { useRouter: () => ({ push() {} }) }, "@/components/icons": { SearchIcon: () => null, ForwardIcon: () => null, AlertIcon: () => null, FileIcon: () => null },
  "@/components/ui/button": { Button: ({ asChild, children, disabled, type }) => asChild ? children : createElement("button", { type, disabled }, children) },
  "@/components/ui/input": { Input: "input" }, "@/components/ui/label": { Label: "label" },
  "@/components/shared/page-header": { PageHeader: ({ title }) => createElement("h1", null, title) },
  "@/features/contacts/numbered-pages": { NumberedPages: () => null }, "./search": { searchHelp }, "./navigation": navigation,
  "./category-icon": { helpCategoryIcons: Object.fromEntries(helpCategories.map(category => [category.id, () => null])) },
};

test("help home/catalog render scoped card links and reader retains every section, instruction and note", () => {
  const { HelpDirectory } = loadServer(`${base}help-directory.tsx`, { modules: helpViewModules });
  const { HelpArticle } = loadServer(`${base}help-article.tsx`, { modules: helpViewModules });
  const articles = articlesForRole("agent"), categories = helpCategories.filter(category => articles.some(article => article.category === category.id));
  const home = renderToStaticMarkup(createElement(HelpDirectory, { articles, categories, navigation: { topic: "all", query: "", page: 1 } }));
  assert.match(home, /Centre d’aide/); assert.match(home, /kay-help-topic-grid/); assert.match(home, /href="\/help\?topic=start"/);
  assert.doesNotMatch(home, /comptes-utilisateurs|imports-exports|Les réponses essentielles/);
  const searched = renderToStaticMarkup(createElement(HelpDirectory, { articles, categories, navigation: { topic: "all", query: "<script>alert(1)</script>", page: 1 } }));
  assert.doesNotMatch(searched, /<script>/); assert.match(searched, /&lt;script&gt;/);
  const catalog = renderToStaticMarkup(createElement(HelpDirectory, { articles, categories, navigation: { topic: "start", query: "", page: 1 } }));
  assert.match(catalog, /kay-help-guide-grid/);
  for (const article of articles.filter(article => article.category === "start")) assert.ok(catalog.includes(`href="/help/${article.slug}"`));
  const article = helpArticleForRole("creer-prospect", "agent");
  const html = renderToStaticMarkup(createElement(HelpArticle, { article, related: [] }));
  const escaped = value => renderToStaticMarkup(createElement("span", null, value)).slice(6, -7);
  assert.match(html, /kay-help-reader-columns/); assert.match(html, /href="\/help\?topic=crm"/);
  for (const section of article.sections) {
    assert.ok(html.includes(escaped(section.title)));
    for (const text of [...(section.steps ?? []), ...(section.paragraphs ?? []), ...(section.note ? [section.note] : [])]) assert.ok(html.includes(escaped(text)));
  }
});

test("help navigation bounds untrusted category/query/page input and keeps static numbered pages accurate", () => {
  const state = navigation.parseHelpNavigation({ topic: "manage", q: "  photos & visites  ", page: "2" }, ["start", "work"]);
  assert.deepEqual(JSON.parse(JSON.stringify(state)), { topic: "all", query: "photos & visites", page: 2 });
  for (const page of ["0", "-1", "2.5", "1000000", ["1", "2"], "garbage"]) assert.equal(navigation.parseHelpNavigation({ page }, []).page, 1);
  assert.equal(navigation.parseHelpNavigation({ q: "x".repeat(200), topic: ["start", "manage"] }, ["start"]).query.length, 160);
  const url = new URL(navigation.helpDirectoryPath({ ...state, topic: "work" }), "https://synthetic.invalid");
  assert.equal(url.pathname, "/help"); assert.equal(url.searchParams.get("q"), state.query); assert.equal(url.searchParams.get("topic"), "work"); assert.equal(url.searchParams.get("page"), "2");
  assert.equal(navigation.helpDirectoryPath({ topic: "all", query: "", page: 1 }), "/help");
  const articles = Array.from({ length: 23 }, (_, index) => ({ slug: String(index) }));
  assert.equal(navigation.helpGuidePage(articles, 99).page, 2);
  assert.equal(navigation.helpGuidePage(articles, 99).items.length, 3);
  assert.equal(navigation.helpGuidePage([], 3).page, 1); assert.equal(navigation.helpGuidePage([], 3).total, 0);
});

test("help hub receives only current-role guides even when a restricted category URL is copied", async () => {
  const jsx = (type, props) => ({ type, props }), calls = [];
  const route = loadServer("src/app/(workspace)/help/page.tsx", { modules: {
    "react/jsx-runtime": { jsx, jsxs: jsx }, "@/features/auth/auth-frame": { AuthUnavailable: "Unavailable" },
    "@/features/help/catalog": { articlesForRole, helpCategories }, "@/features/help/help-directory": { HelpDirectory: "Hub" }, "@/features/help/navigation": navigation,
    "@/lib/auth/server": { requireIdentity: async path => { calls.push(path); return { state: "authenticated", profile: { user: { role: "agent" } } }; } },
  } });
  const result = await route.default({ searchParams: Promise.resolve({ topic: "manage" }) });
  assert.equal(calls[0], "/help"); assert.equal(result.type, "Hub");
  assert.equal(result.props.articles.some(article => article.slug === "comptes-utilisateurs" || article.slug === "imports-exports"), false);
  if (!result.props.categories.some(category => category.id === "manage")) assert.equal(result.props.navigation.topic, "all");
  assert.ok(result.props.articles.every(article => !article.roles || article.roles.includes("agent")));
});

test("help catalog has unique complete articles, valid categories, related guides and internal actions", () => {
  assert(helpArticles.length >= 28);
  assert.equal(new Set(helpArticles.map(article => article.slug)).size, helpArticles.length);
  const categories = new Set(helpCategories.map(category => category.id));
  const routes = new Set(["/dashboard", "/leads", "/leads/new", "/deals", "/projects", "/projects/properties/new", "/visits", "/notifications", "/owners", "/settings/users"]);
  for (const article of helpArticles) {
    assert.match(article.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert(categories.has(article.category));
    assert(article.title && article.summary && article.keywords.length && article.sections.length >= 2);
    for (const section of article.sections) assert(section.title && (section.steps?.length || section.paragraphs?.length || section.note));
    for (const slug of article.related) assert(slug !== article.slug && helpArticles.some(item => item.slug === slug), `Invalid related guide in ${article.slug}`);
    if (article.action) assert(routes.has(article.action.href));
  }
});

test("help roles hide staff and manager guides from agents and reject copied article slugs", () => {
  assert.equal(helpArticleForRole("comptes-utilisateurs", "agent"), undefined);
  assert.equal(helpArticleForRole("comptes-utilisateurs", "manager"), undefined);
  assert.equal(helpArticleForRole("imports-exports", "agent"), undefined);
  assert.equal(helpArticleForRole("not-a-guide", "administrator"), undefined);
  assert(helpArticleForRole("comptes-utilisateurs", "administrator"));
  assert(helpArticleForRole("imports-exports", "manager"));
  for (const role of ["agent", "manager", "administrator"]) for (const slug of ["creer-prospect", "photos-biens", "proprietaires", "notifications", "planifier-visite"]) assert(helpArticleForRole(slug, role));
});

test("help searches accented titles, body instructions and multiple keywords without changing the catalog", () => {
  const articles = articlesForRole("agent");
  const original = JSON.stringify(articles);
  assert.equal(searchHelp(articles, "   ").length, articles.length);
  assert(searchHelp(articles, "PROPRIETAIRE").some(article => article.slug === "proprietaires"));
  assert(searchHelp(articles, "notifications 24").some(article => article.slug === "notifications"));
  assert(searchHelp(articles, "webp").some(article => article.slug === "photos-biens"));
  assert.equal(searchHelp(articles, "xyz-no-result-987").length, 0);
  assert.equal(JSON.stringify(articles), original);
});

test("help login returns allow only bounded internal guide paths", () => {
  for (const article of helpArticles) assert.equal(safeReturnPath(`/help/${article.slug}`), `/help/${article.slug}`);
  assert.equal(safeReturnPath("/help"), "/help");
  for (const path of ["//evil.invalid/help", "https://evil.invalid/help", "/help/../settings", "/help/%2f%2fevil.invalid", "/help/good?next=https://evil.invalid", "/help/" + "a".repeat(81)]) assert.equal(safeReturnPath(path), "/dashboard");
});

test("current notifications help does not ask agents for VAPID, SMTP or external delivery", () => {
  const guide = helpArticleForRole("notifications", "agent");
  const text = JSON.stringify(guide);
  assert.match(text, /24 heures et 1 heure/);
  assert.match(text, /deux heures après sa fin/);
  assert.match(text, /Aucun e-mail, SMS ou notification système/);
  assert.match(text, /pas de clé VAPID/);
});
