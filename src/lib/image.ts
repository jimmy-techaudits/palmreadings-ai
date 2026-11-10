const MAX_SIDE = 1600;
const QUALITY = 0.85;

export class ImageLoadError extends Error {}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // Older Safari: fall back to an <img> element.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } catch {
      throw new ImageLoadError(
        "This photo format isn't supported by your browser. Please choose a JPEG or PNG, or take a new photo.",
      );
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

/** Resizes a photo to at most 1600px on its longest side and re-encodes it as JPEG. Returns a data URL. */
export async function prepareImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) {
    throw new ImageLoadError('Please choose a photo file.');
  }
  const img = await decode(file);
  const w = img.width;
  const h = img.height;
  if (Math.min(w, h) < 400) throw new ImageLoadError('This photo is too small. Please use a larger, closer photo.');

  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ImageLoadError('Could not process this photo.');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  if ('close' in img) img.close();
  return canvas.toDataURL('image/jpeg', QUALITY);
}

export const stripDataUrl = (dataUrl: string) => dataUrl.slice(dataUrl.indexOf(',') + 1);
