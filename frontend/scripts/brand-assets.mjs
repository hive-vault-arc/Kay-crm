import { writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

// Use the image processor already required by the pinned Next.js installation.
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
const root = path.resolve(import.meta.dirname, "../..");
const asset = (name) => path.join(root, "frontend/public", name);
const black = path.join(root, "branding/kay-logo-reference-textured.png");
const transparent = path.join(root, "branding/kay-logo-reference-flat.png");

await sharp(black).extract({ left: 225, top: 335, width: 805, height: 555 })
  .png().toFile(asset("images/kay-luxury-gold.png"));
await sharp(transparent).extract({ left: 125, top: 300, width: 1030, height: 680 })
  .png().toFile(asset("images/kay-champagne-gold.png"));

// The supplied lettermark, without the small wordmark, stays readable in a tab.
const mark = await sharp(black).extract({ left: 240, top: 350, width: 770, height: 420 }).png().toBuffer();
const sizes = [16, 32, 48, 180];
const images = await Promise.all(sizes.map(size => sharp(mark)
  .resize(size, size, { fit: "contain", background: "#000000" }).png().toBuffer()));
await writeFile(asset("favicon.svg"), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><image width="48" height="48" href="data:image/png;base64,${images[2].toString("base64")}"/></svg>\n`);
await writeFile(asset("images/kay-apple-icon.png"), images[3]);

const header = Buffer.alloc(6 + 3 * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(3, 4);
let offset = header.length;
for (let i = 0; i < 3; i++) {
  const entry = 6 + i * 16;
  header[entry] = sizes[i];
  header[entry + 1] = sizes[i];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(images[i].length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += images[i].length;
}
await writeFile(asset("favicon.ico"), Buffer.concat([header, ...images.slice(0, 3)]));
console.log("Generated KAY logos, 16/32/48px favicon and 180px touch icon from supplied artwork.");
