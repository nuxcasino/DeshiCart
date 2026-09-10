import { neonConfig } from "@neondatabase/serverless";

// Resilient transport for Neon's HTTPS SQL API.
//
// Background: in some locked-down runtimes the process-level TCP path used by
// undici/Node fetch to the Neon gateway intermittently fails (ETIMEDOUT)
// while the system `curl` binary on the same host connects fine. This module
// tries native fetch first and transparently falls back to curl, remembering
// whichever transport works.

let preferCurl = false;

const STATUS_SEP = "\n__neon_status__:";

function toHeaderArgs(headers: Headers): string[] {
  const args: string[] = [];
  headers.forEach((value, key) => {
    args.push("-H", `${key}: ${value}`);
  });
  return args;
}

async function curlFetch(
  url: string,
  init: RequestInit | undefined
): Promise<Response> {
  const { spawn } = await import("node:child_process");
  const headers = new Headers(init?.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const args = [
    "-sS",
    "--max-time",
    "30",
    "-X",
    "POST",
    url,
    ...toHeaderArgs(headers),
    "-w",
    STATUS_SEP + "%{http_code}",
    "--data-binary",
    "@-",
  ];
  const body =
    typeof init?.body === "string"
      ? init.body
      : init?.body
        ? String(init.body)
        : "";

  return new Promise((resolve, reject) => {
    const child = spawn("curl", args);
    let out = "";
    let err = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (d: string) => {
      out += d;
    });
    child.stderr.on("data", (d: string) => {
      err += d;
    });
    child.on("error", (e) => {
      reject(new Error(`curl transport unavailable: ${e.message}`));
    });
    child.on("close", (code) => {
      const sepIdx = out.lastIndexOf(STATUS_SEP);
      if (code !== 0 || sepIdx === -1) {
        reject(
          new Error(`curl transport failed (exit ${code}): ${err || out}`.trim())
        );
        return;
      }
      const status = parseInt(out.slice(sepIdx + STATUS_SEP.length).trim(), 10);
      const payload = out.slice(0, sepIdx);
      resolve(
        new Response(payload, {
          status: Number.isFinite(status) ? status : 0,
          headers: { "content-type": "application/json" },
        })
      );
    });
    child.stdin.on("error", () => {
      // stdin closed early (e.g. curl exited); handled via close event
    });
    child.stdin.write(body);
    child.stdin.end();
  });
}

function isNetworkFailure(error: unknown): boolean {
  if (error instanceof TypeError) return true; // undici "fetch failed"
  const code = (error as { code?: unknown })?.code;
  return (
    code === "ETIMEDOUT" ||
    code === "ENETUNREACH" ||
    code === "ECONNREFUSED" ||
    code === "EAI_AGAIN"
  );
}

async function attemptNative(
  url: string,
  init: RequestInit | undefined
): Promise<Response> {
  return fetch(url, init);
}

/** Drop-in fetch replacement wired into `neonConfig.fetchFunction`. */
export async function resilientNeonFetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const order: Array<"native" | "curl"> = preferCurl
    ? ["curl", "native"]
    : ["native", "curl"];
  let lastError: unknown = new Error("neon fetch failed");
  for (const transport of order) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res =
          transport === "native"
            ? await attemptNative(url, init)
            : await curlFetch(url, init);
        preferCurl = transport === "curl";
        return res;
      } catch (error) {
        lastError = error;
        if (!isNetworkFailure(error)) throw error;
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

/** Call once (Neon URLs only) before creating the client. */
export function setupResilientNeonFetch() {
  neonConfig.fetchFunction = resilientNeonFetch as typeof fetch;
}
