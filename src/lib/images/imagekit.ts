import ImageKit from "imagekit";
import type {
  ImageStorageProvider,
  ImageUrlOptions,
  UploadedImage,
} from "./types";

let client: ImageKit | null = null;

function getClient(): ImageKit | null {
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;
  if (!publicKey || !privateKey || !urlEndpoint) return null;
  if (!client) {
    client = new ImageKit({ publicKey, privateKey, urlEndpoint });
  }
  return client;
}

function endpointHost(): string {
  try {
    return new URL(process.env.IMAGEKIT_URL_ENDPOINT || "").host;
  } catch {
    return "";
  }
}

export const imagekitProvider: ImageStorageProvider = {
  name: "imagekit",

  configured() {
    return getClient() !== null;
  },

  async upload(input): Promise<UploadedImage> {
    const sdk = getClient();
    if (!sdk) {
      throw new Error(
        "ImageKit is not configured. Set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY and IMAGEKIT_URL_ENDPOINT."
      );
    }
    const result = await sdk.upload({
      file: input.buffer,
      fileName: input.fileName,
      folder: input.folder ?? "/deshicart/products",
      useUniqueFileName: true,
    });
    return {
      url: result.url,
      fileId: result.fileId,
      width: (result.width as number | undefined) ?? null,
      height: (result.height as number | undefined) ?? null,
    };
  },

  async delete(fileId: string): Promise<void> {
    const sdk = getClient();
    if (!sdk) throw new Error("ImageKit is not configured.");
    await sdk.deleteFile(fileId);
  },

  getUrl(url: string, options?: ImageUrlOptions): string {
    const host = endpointHost();
    if (!host || !url.includes(host)) return url;
    const tr: string[] = [];
    if (options?.width) tr.push(`w-${options.width}`);
    if (options?.height) tr.push(`h-${options.height}`);
    tr.push("f-auto");
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}tr=${tr.join(",")}`;
  },
};
