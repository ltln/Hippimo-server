export const MAX_RECEIPT_IMAGES_PER_TRANSACTION = 5;
export const MAX_RECEIPT_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

export const RECEIPT_IMAGE_UPLOAD_LIMITS = {
  fileSize: MAX_RECEIPT_IMAGE_SIZE_BYTES,
};

export const ALLOWED_RECEIPT_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
