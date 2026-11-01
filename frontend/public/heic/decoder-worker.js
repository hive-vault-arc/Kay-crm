import { heicTo } from "./heic-to-1.6.7.js";

self.onmessage = async event => {
  try {
    const bitmap = await heicTo({ blob: event.data, type: "bitmap" });
    self.postMessage({ bitmap }, [bitmap]);
  } catch {
    self.postMessage({ failed: true });
  }
};
