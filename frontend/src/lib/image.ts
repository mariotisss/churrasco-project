// Preparing a picked photo before it is uploaded. A phone picture is several megabytes
// of something that ends up 40px wide on screen, so it is center-cropped and downscaled
// here: the upload stays small on the office wifi and the server only has to re-encode
// what it is already given. The backend re-encodes regardless — this is for speed, not
// for trust.

/** Side of the uploaded square, in pixels. The server stores 256; this leaves margin. */
const SIDE = 512;

const QUALITY = 0.9;

export async function toSquareJpeg(file: File): Promise<Blob> {
  // decodes off the main thread and honours the EXIF rotation phones write
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });

  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = SIDE;
  canvas.height = SIDE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se ha podido preparar la imagen');
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, SIDE, SIDE);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', QUALITY),
  );
  if (!blob) throw new Error('No se ha podido preparar la imagen');
  return blob;
}
