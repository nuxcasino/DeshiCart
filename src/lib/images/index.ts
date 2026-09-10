import { imagekitProvider } from "./imagekit";
import type { ImageStorageProvider } from "./types";

/** Active provider (ImageKit today; swap here to migrate providers). */
export function getImageProvider(): ImageStorageProvider {
  return imagekitProvider;
}

export type { ImageStorageProvider, ImageUrlOptions, UploadedImage } from "./types";
