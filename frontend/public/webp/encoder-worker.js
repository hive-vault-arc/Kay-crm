import factory from "./webp_enc-1.5.0.js";
import { defaultOptions } from "./meta-1.5.0.js";

self.onmessage = async event => {
  try {
    const image = event.data;
    const encoder = await factory({ locateFile: () => new URL("./webp-1.5.0.wasm", import.meta.url).href });
    const encoded = encoder.encode(image.data, image.width, image.height, { ...defaultOptions, quality: 82 });
    if (!encoded?.length) throw new Error("ENCODING_FAILED");
    const buffer = encoded.slice().buffer;
    self.postMessage({ buffer }, [buffer]);
  } catch {
    self.postMessage({ failed: true });
  }
};
