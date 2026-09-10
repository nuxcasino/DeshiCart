// Image storage abstraction (§21). The app depends on this interface only —
// swapping providers means a new implementation, not a rewrite.

export type UploadedImage = {
  url: string;
  fileId: string;
  width: number | null;
  height: number | null;
};

export type ImageUrlOptions = {
  width?: number;
  height?: number;
};

export interface ImageStorageProvider {
  readonly name: string;
  configured(): boolean;
  upload(input: {
    buffer: Buffer;
    fileName: string;
    folder?: string;
  }): Promise<UploadedImage>;
  delete(fileId: string): Promise<void>;
  getUrl(url: string, options?: ImageUrlOptions): string;
}
