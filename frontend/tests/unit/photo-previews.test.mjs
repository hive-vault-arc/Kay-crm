import assert from "node:assert/strict";
import test from "node:test";
import { loadServer } from "./load-server.mjs";

function harness() {
  const requests = [];
  const blob = new Blob(["synthetic private image"]);
  let fail = false;
  const { photoPreview } = loadServer("src/features/files/photo-previews.ts", { modules: {
    "./transfers": {
      requestFilePermit: async body => { requests.push(body); if (fail) throw new Error("SYNTHETIC_DENIED"); return {}; },
      downloadBytes: async () => blob,
    },
  } });
  return { photoPreview, requests, blob, fail: value => { fail = value; } };
}

test("gallery and viewer share one authorized immutable version, including concurrent reads", async () => {
  const h = harness(), cache = new Map(), photo = { id: "synthetic-photo", version: 3 };
  const result = await Promise.all([h.photoPreview(cache, photo, "clean-one"), h.photoPreview(cache, photo, "clean-one")]);
  assert(result.every(blob => blob === h.blob)); assert.equal(h.requests.length, 1);
  await h.photoPreview(cache, { ...photo, version: 4 }, "clean-one");
  assert.equal(h.requests.length, 1);
  await h.photoPreview(cache, { ...photo, version: 4 }, "clean-two");
  assert.equal(h.requests.length, 2); assert.equal(h.requests[1].expected_version, 4);
});

test("photo bytes never cross gallery lifetimes and clearing requires a new permit", async () => {
  const h = harness(), photo = { id: "synthetic-photo", version: 3 }, first = new Map();
  await h.photoPreview(first, photo, "clean-one");
  await h.photoPreview(new Map(), photo, "clean-one");
  first.clear(); await h.photoPreview(first, photo, "clean-one");
  assert.equal(h.requests.length, 3);
});

test("explicit preview retry obtains current authority and failed permits are not cached", async () => {
  const h = harness(), cache = new Map(), photo = { id: "synthetic-photo", version: 3 };
  await h.photoPreview(cache, photo, "clean-one"); h.fail(true);
  await assert.rejects(h.photoPreview(cache, photo, "clean-one", true), /SYNTHETIC_DENIED/);
  assert.equal(cache.size, 0); h.fail(false);
  await h.photoPreview(cache, photo, "clean-one"); assert.equal(h.requests.length, 3);
});
