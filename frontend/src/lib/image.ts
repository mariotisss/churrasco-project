// Preparing a picked photo before it is uploaded. A phone picture is several megabytes
// of something that ends up 40px wide on screen, so the square the user frames is cut
// out and downscaled here: the upload stays small on the office wifi. The backend
// re-encodes regardless — this is for speed, not for trust.

/** Side of the uploaded square, in pixels. The server stores 256; this leaves margin. */
const SIDE = 512;

const QUALITY = 0.9;

/**
 * Decodes a picked file once, off the main thread and with the EXIF rotation phones
 * write already applied — so what the crop dialog shows is exactly what gets cut out.
 */
export function loadBitmap(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file, { imageOrientation: 'from-image' });
}

/**
 * Cuts a square out of the decoded image and encodes it as JPEG.
 *
 * @param sx    left edge of the square, in image pixels
 * @param sy    top edge of the square, in image pixels
 * @param side  length of the square, in image pixels
 */
export async function cropToSquareJpeg(
  bitmap: ImageBitmap,
  sx: number,
  sy: number,
  side: number,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = SIDE;
  canvas.height = SIDE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se ha podido preparar la imagen');
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, SIDE, SIDE);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', QUALITY),
  );
  if (!blob) throw new Error('No se ha podido preparar la imagen');
  return blob;
}
