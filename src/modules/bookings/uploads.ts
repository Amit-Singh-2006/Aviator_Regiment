import "server-only";
import { MAX_PASSPORT_PHOTO_BYTES } from "@/src/modules/bookings/validation";

type ImageUpload = { bytes: Uint8Array; contentType: string; extension: string };

// Identifies JPEG, PNG and WebP files by their content rather than trusting the
// browser-supplied name or type.
function sniffImage(bytes: Uint8Array) {
  const starts = (signature: number[], offset = 0) => signature.every((byte, index) => bytes[offset + index] === byte);
  if (starts([0xff, 0xd8, 0xff])) return { contentType: "image/jpeg", extension: "jpg" };
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { contentType: "image/png", extension: "png" };
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) return { contentType: "image/webp", extension: "webp" };
  return null;
}

export async function readImageUpload(value: FormDataEntryValue | null, missingMessage: string): Promise<ImageUpload | { error: string }> {
  if (!(value instanceof File) || value.size === 0) return { error: missingMessage };
  if (value.size > MAX_PASSPORT_PHOTO_BYTES) return { error: "The image must be 5 MB or smaller." };
  const bytes = new Uint8Array(await value.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) return { error: "Upload the image as a JPG, PNG or WebP file." };
  return { bytes, ...kind };
}
