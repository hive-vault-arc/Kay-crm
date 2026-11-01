import factory from "./libwebp-1.6.0.js";

self.onmessage = async event => {
  try {
    const image = event.data;
    if (!(image instanceof ImageData) || image.width > 2560 || image.height > 2560) throw new Error("INVALID_IMAGE");
    const encoder = await factory({ locateFile: () => new URL("./libwebp-1.6.0.wasm", import.meta.url).href, print: () => {}, printErr: () => {} });
    if (encoder._WebPGetEncoderVersion() !== 0x010600) throw new Error("CODEC_VERSION_MISMATCH");
    const input = encoder._malloc(image.data.byteLength);
    const output = encoder._malloc(4);
    let encoded = 0;
    try {
      if (!input || !output) throw new Error("ENCODING_FAILED");
      encoder.kayHeap().set(image.data, input);
      const length = encoder._WebPEncodeRGBA(input, image.width, image.height, image.width * 4, 82, output);
      if (!length) throw new Error("ENCODING_FAILED");
      encoded = encoder.getValue(output, "*");
      if (!encoded || length > 20 * 1024 * 1024) throw new Error("ENCODING_FAILED");
      const buffer = encoder.kayHeap().slice(encoded, encoded + length).buffer;
      self.postMessage({ buffer }, [buffer]);
    } finally {
      if (encoded) encoder._WebPFree(encoded);
      if (input) encoder._free(input);
      if (output) encoder._free(output);
    }
  } catch {
    self.postMessage({ failed: true });
  }
};
