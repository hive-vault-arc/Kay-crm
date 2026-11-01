import factory from "./libheif-1.23.7-de265-1.1.3.js";

self.onmessage = async event => {
  let library;
  let decoder;
  let images = [];
  try {
    if (!(event.data instanceof Blob) || event.data.size > 20 * 1024 * 1024) throw new Error("INVALID_IMAGE");
    library = await factory({ print: () => {}, printErr: () => {} });
    if (library.heif_get_version_number() !== 0x01170700
      || library.UTF8ToString(library._de265_get_version()) !== "1.1.3") throw new Error("CODEC_VERSION_MISMATCH");
    decoder = new library.HeifDecoder();
    images = decoder.decode(new Uint8Array(await event.data.arrayBuffer()));
    const image = images.find(candidate => candidate.is_primary()) ?? images[0];
    if (!image) throw new Error("INVALID_IMAGE");
    const width = image.get_width();
    const height = image.get_height();
    // Inspect the container's primary-image dimensions before native HEVC decode.
    if (width <= 0 || height <= 0 || width * height > 25_000_000) throw new Error("INVALID_IMAGE_DIMENSIONS");
    const pixels = await new Promise((resolve, reject) => image.display(new ImageData(width, height), result => {
      if (result) resolve(result);
      else reject(new Error("DECODING_FAILED"));
    }));
    const bitmap = await createImageBitmap(pixels);
    self.postMessage({ bitmap }, [bitmap]);
  } catch {
    self.postMessage({ failed: true });
  } finally {
    for (const image of images) image.free();
    if (decoder?.decoder) library.heif_context_free(decoder.decoder);
  }
};
