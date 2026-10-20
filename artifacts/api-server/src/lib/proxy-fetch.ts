import { lookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import { request as requestHttp, type IncomingMessage } from "node:http";
import { request as requestHttps } from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";
import { Duplex, Readable, Transform, Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { TextDecoder } from "node:util";
import {
  constants, createBrotliDecompress, createGunzip, createInflate, createInflateRaw,
  createZstdDecompress,
} from "node:zlib";

const TIMEOUT_MS = 10_000;
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const MAX_DNS_ANSWERS = 64;
// Preserve Fetch's non-HTTP-service port restriction when using Node's raw transport.
const blockedPorts = new Set([
  "0", "1", "7", "9", "11", "13", "15", "17", "19", "20", "21", "22", "23", "25",
  "37", "42", "43", "53", "69", "77", "79", "87", "95", "101", "102", "103", "104",
  "109", "110", "111", "113", "115", "117", "119", "123", "135", "137", "139", "143",
  "161", "179", "389", "427", "465", "512", "513", "514", "515", "526", "530", "531",
  "532", "540", "548", "554", "556", "563", "587", "601", "636", "989", "990", "993",
  "995", "1719", "1720", "1723", "2049", "3659", "4045", "4190", "5060", "5061",
  "6000", "6566", "6665", "6666", "6667", "6668", "6669", "6679", "6697", "10080",
]);

const ipv4 = new BlockList();
ipv4.addSubnet("0.0.0.0", 0, "ipv4");
const globalIpv6 = new BlockList();
globalIpv6.addSubnet("2000::", 3, "ipv6");
const blocked = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24],
  ["192.0.2.0", 24], ["192.88.99.0", 24], ["192.168.0.0", 16],
  ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 3],
] as const) blocked.addSubnet(address, prefix, "ipv4");
for (const [address, prefix] of [
  ["2001::", 32], ["2001:2::", 48], ["2001:db8::", 32],
  ["2001:10::", 28], ["2001:20::", 28], ["2002::", 16], ["3fff::", 20],
] as const) blocked.addSubnet(address, prefix, "ipv6");

/** Conservative public-unicast policy; BlockList also handles IPv4-mapped IPv6. */
export function isPublicProxyAddress(address: string): boolean {
  const version = isIP(address);
  if (!version || address.includes("%")) return false;
  const family = version === 4 ? "ipv4" : "ipv6";
  return !blocked.check(address, family) &&
    (ipv4.check(address, family) || globalIpv6.check(address, family));
}

class ProxyFetchError extends Error {}

function hostnameOf(url: URL): string {
  return url.hostname.replace(/^\[|\]$/g, "").toLowerCase().replace(/\.$/, "");
}

function parseTarget(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new ProxyFetchError("Invalid or blocked URL"); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || blockedPorts.has(url.port)) {
    throw new ProxyFetchError("Invalid or blocked URL");
  }
  const hostname = hostnameOf(url);
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") ||
      (isIP(hostname) && !isPublicProxyAddress(hostname))) {
    throw new ProxyFetchError("URL address is not public");
  }
  return url;
}

export function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    return parseTarget(/^https?:\/\//i.test(trimmed) ? trimmed : "https://" + trimmed).href;
  } catch { return null; }
}

async function publicAddresses(url: URL, signal: AbortSignal): Promise<LookupAddress[]> {
  signal.throwIfAborted();
  const hostname = hostnameOf(url);
  const literalFamily = isIP(hostname);
  let addresses: LookupAddress[];
  if (literalFamily) addresses = [{ address: hostname, family: literalFamily }];
  else {
    addresses = await new Promise<LookupAddress[]>((resolve, reject) => {
      const onAbort = () => reject(signal.reason);
      signal.addEventListener("abort", onAbort, { once: true });
      void Promise.resolve().then(() => lookup(hostname, { all: true, verbatim: true })).then(
        result => { signal.removeEventListener("abort", onAbort); resolve(result); },
        () => {
          signal.removeEventListener("abort", onAbort);
          reject(new ProxyFetchError("Unable to resolve a public address"));
        },
      );
    });
  }
  signal.throwIfAborted();
  if (!addresses.length || addresses.length > MAX_DNS_ANSWERS || addresses.some(entry =>
    entry.family !== isIP(entry.address) || !isPublicProxyAddress(entry.address))) {
    throw new ProxyFetchError("URL address is not public");
  }
  return addresses;
}

function byteLimit(): Transform {
  let bytes = 0;
  return new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      bytes += chunk.length;
      callback(bytes > MAX_BODY_BYTES ? new ProxyFetchError("Response too large") : null, chunk);
    },
  });
}

// Fetch accepts both zlib-wrapped and legacy raw deflate. Select after the first
// byte without buffering the encoded response or bypassing pipeline cancellation.
function deflateDecoder(): Duplex {
  return Duplex.from(async function* (source: AsyncIterable<Buffer>) {
    const iterator = source[Symbol.asyncIterator]();
    let first = await iterator.next();
    while (!first.done && !first.value.length) first = await iterator.next();
    if (first.done) return;
    const options = { flush: constants.Z_SYNC_FLUSH, finishFlush: constants.Z_SYNC_FLUSH };
    const decoder = (first.value[0]! & 15) === 8 ? createInflate(options) : createInflateRaw(options);
    const input = Readable.from((async function* () {
      yield first.value;
      for (let next = await iterator.next(); !next.done; next = await iterator.next()) yield next.value;
    })());
    const completion = pipeline(input, decoder);
    void completion.catch(() => {});
    try {
      for await (const chunk of decoder) yield chunk;
      await completion;
    } finally {
      input.destroy();
      decoder.destroy();
      await completion.catch(() => {});
    }
  });
}

async function readBody(response: IncomingMessage, signal: AbortSignal): Promise<string> {
  const declared = response.headers["content-length"];
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > MAX_BODY_BYTES)) {
    throw new ProxyFetchError("Response too large");
  }
  const encodings = (response.headers["content-encoding"] || "identity")
    .split(",").map(value => value.trim().toLowerCase());
  if (encodings.length > 5) throw new ProxyFetchError("Too many response encodings");
  // Native Fetch leaves the whole representation encoded if any coding is unknown.
  if (encodings.some(value => !["gzip", "x-gzip", "deflate", "br", "zstd"].includes(value))) encodings.length = 0;
  const transforms: Duplex[] = [byteLimit()];
  for (const encoding of encodings.reverse()) {
    transforms.push(encoding === "br" ? createBrotliDecompress({
      flush: constants.BROTLI_OPERATION_FLUSH, finishFlush: constants.BROTLI_OPERATION_FLUSH,
    }) : encoding === "zstd" ? createZstdDecompress({
      flush: constants.ZSTD_e_continue, finishFlush: constants.ZSTD_e_end,
    }) : encoding === "deflate" ? deflateDecoder() : createGunzip({
      flush: constants.Z_SYNC_FLUSH, finishFlush: constants.Z_SYNC_FLUSH,
    }));
    // Bound every expanded representation, including stacked encodings.
    transforms.push(byteLimit());
  }
  const chunks: Buffer[] = [];
  const sink = new Writable({
    write(chunk: Buffer, _encoding, callback) { chunks.push(chunk); callback(); },
  });
  await pipeline(response, ...transforms, sink, { signal });
  return new TextDecoder().decode(Buffer.concat(chunks));
}

type FetchResult = { ok: boolean; text?: string; status?: number; error?: string };
type HopResult = { status: number; text?: string; redirect?: string };

function requestResource(url: URL, addresses: LookupAddress[], signal: AbortSignal): Promise<HopResult> {
  const hostname = hostnameOf(url);
  const pinnedLookup: LookupFunction = (host, options, callback) => {
    if (signal.aborted || host.toLowerCase().replace(/\.$/, "") !== hostname) {
      callback(new ProxyFetchError("URL lookup was not approved"), "", 0);
    } else if (typeof options === "object" && options.all) callback(null, addresses);
    else callback(null, addresses[0]!.address, addresses[0]!.family);
  };
  return new Promise((resolve, reject) => {
    let receivedResponse = false;
    let activeResponse: IncomingMessage | undefined;
    const fail = (error: unknown) => { activeResponse?.destroy(); request.destroy(); reject(error); };
    const request = (url.protocol === "https:" ? requestHttps : requestHttp)(url, {
      method: "GET", agent: false, lookup: pinnedLookup, signal,
      ...(url.protocol === "https:" ? { rejectUnauthorized: true } : {}),
      headers: {
        "User-Agent": "Mozilla/5.0 (PlayPackPilot Analyzer; +https://playpackpilot.app)",
        Accept: "text/html,application/json,*/*",
        "Accept-Encoding": "gzip, deflate, br",
      },
    }, response => {
      activeResponse = response;
      receivedResponse = true;
      const status = response.statusCode ?? 502;
      if ([301, 302, 303, 307, 308].includes(status)) {
        const redirect = response.headers.location;
        response.destroy();
        if (!redirect) reject(new ProxyFetchError("Redirect with no location"));
        else resolve({ status, redirect });
        return;
      }
      if ([204, 205, 304].includes(status)) {
        response.destroy();
        resolve({ status, text: "" });
        return;
      }
      void readBody(response, signal).then(
        text => resolve({ status, text }),
        fail,
      );
    });
    request.once("upgrade", (_response, socket) => {
      receivedResponse = true;
      socket.destroy();
      request.destroy();
      reject(new ProxyFetchError("Unsupported protocol upgrade"));
    });
    request.once("error", fail);
    request.once("close", () => {
      if (!receivedResponse) reject(new ProxyFetchError("Connection closed before response"));
    });
    request.end();
  });
}

/** One deadline for both resources in a scan, including DNS, redirects and decoded bodies. */
export function createProxyFetch(): (value: string) => Promise<FetchResult> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  return async value => {
    try {
      let url = parseTarget(value);
      for (let redirects = 0; ; redirects++) {
        signal.throwIfAborted();
        const addresses = await publicAddresses(url, signal);
        signal.throwIfAborted();
        const result = await requestResource(url, addresses, signal);
        signal.throwIfAborted();
        if (result.redirect !== undefined) {
          if (redirects >= MAX_REDIRECTS) throw new ProxyFetchError("Too many redirects");
          url = parseTarget(new URL(result.redirect, url).href);
          continue;
        }
        return { ok: result.status >= 200 && result.status < 300, text: result.text, status: result.status };
      }
    } catch (error) {
      return { ok: false, error: signal.aborted ? "Proxy request timed out" :
        error instanceof ProxyFetchError ? error.message : "Failed to fetch URL" };
    }
  };
}
