import assert from "node:assert/strict";
import test from "node:test";
import { loadServer } from "./load-server.mjs";

const base = "src/features/help/";
const modules = Object.fromEntries(["crm", "inventory", "work"].map(name => [`./guides-${name}`, loadServer(`${base}guides-${name}.ts`)]));
const { helpArticles, helpCategories, articlesForRole, helpArticleForRole } = loadServer(`${base}catalog.ts`, { modules });
const { searchHelp } = loadServer(`${base}search.ts`);
const { safeReturnPath } = loadServer("src/lib/auth/contracts.ts");

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
