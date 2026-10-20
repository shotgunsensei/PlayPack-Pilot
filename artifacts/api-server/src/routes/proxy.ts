import { Router, type Request, type Response } from "express";
import * as cheerio from "cheerio";
import { createProxyFetch, normalizeUrl } from "../lib/proxy-fetch";

const router = Router();

interface ManifestData {
  name?: string;
  short_name?: string;
  start_url?: string;
  scope?: string;
  display?: string;
  theme_color?: string;
  background_color?: string;
  icons?: Array<{ src: string; sizes?: string; type?: string }>;
  orientation?: string;
  description?: string;
  lang?: string;
  dir?: string;
  categories?: string[];
  [key: string]: unknown;
}

interface ScanResult {
  url: string;
  finalUrl: string;
  success: boolean;
  error?: string;
  html: {
    title?: string;
    description?: string;
    themeColor?: string;
    manifestLink?: string;
    icons: Array<{ href: string; rel: string; sizes?: string }>;
    appleTouchIcons: Array<{ href: string; sizes?: string }>;
    hasServiceWorkerHint: boolean;
    serviceWorkerHints: string[];
    ogImage?: string;
    viewport?: string;
    lang?: string;
  };
  manifest: {
    found: boolean;
    url?: string;
    data?: ManifestData;
    error?: string;
  };
  analysis: {
    isHttps: boolean;
    domain: string;
    baseUrl: string;
    probableAppName?: string;
    probableShortName?: string;
    installabilityScore: number;
    installabilityNotes: string[];
  };
}

function resolveUrl(base: string, relative: string): string {
  try {
    return new URL(relative, base).href;
  } catch {
    return relative;
  }
}

router.post("/proxy-scan", async (req: Request, res: Response) => {
  const rawUrl: unknown = req.body?.url;
  if (!rawUrl || typeof rawUrl !== "string") {
    res.status(400).json({ error: "URL is required" });
    return;
  }

  const url = normalizeUrl(rawUrl);
  if (!url) {
    res.status(400).json({ error: "Invalid or blocked URL" });
    return;
  }

  const safeFetch = createProxyFetch();
  const result: ScanResult = {
    url: rawUrl,
    finalUrl: url,
    success: false,
    html: {
      icons: [],
      appleTouchIcons: [],
      hasServiceWorkerHint: false,
      serviceWorkerHints: [],
    },
    manifest: { found: false },
    analysis: {
      isHttps: url.startsWith("https://"),
      domain: new URL(url).hostname,
      baseUrl: new URL(url).origin + "/",
      installabilityScore: 0,
      installabilityNotes: [],
    },
  };

  const htmlResult = await safeFetch(url);
  if (!htmlResult.ok || !htmlResult.text) {
    result.error =
      htmlResult.error || `HTTP ${htmlResult.status || "unknown"}`;
    res.json(result);
    return;
  }

  result.success = true;
  const $ = cheerio.load(htmlResult.text);

  result.html.title = $("title").first().text().trim() || undefined;
  result.html.description =
    $('meta[name="description"]').attr("content") || undefined;
  result.html.themeColor =
    $('meta[name="theme-color"]').attr("content") || undefined;
  result.html.viewport =
    $('meta[name="viewport"]').attr("content") || undefined;
  result.html.lang = $("html").attr("lang") || undefined;
  result.html.ogImage =
    $('meta[property="og:image"]').attr("content") || undefined;

  const manifestLink = $('link[rel="manifest"]').attr("href");
  if (manifestLink) {
    result.html.manifestLink = manifestLink;
  }

  $('link[rel*="icon"]').each((_i, el) => {
    const href = $(el).attr("href");
    const rel = $(el).attr("rel") || "icon";
    const sizes = $(el).attr("sizes");
    if (href) {
      result.html.icons.push({
        href: resolveUrl(url, href),
        rel,
        sizes: sizes || undefined,
      });
    }
  });

  $('link[rel="apple-touch-icon"]').each((_i, el) => {
    const href = $(el).attr("href");
    const sizes = $(el).attr("sizes");
    if (href) {
      result.html.appleTouchIcons.push({
        href: resolveUrl(url, href),
        sizes: sizes || undefined,
      });
    }
  });

  const fullHtml = htmlResult.text;
  const swPatterns = [
    /navigator\.serviceWorker\.register/,
    /serviceWorkerRegistration/,
    /service-worker\.js/,
    /sw\.js/,
    /workbox/i,
  ];
  for (const pattern of swPatterns) {
    if (pattern.test(fullHtml)) {
      result.html.hasServiceWorkerHint = true;
      result.html.serviceWorkerHints.push(pattern.source);
    }
  }

  if (manifestLink) {
    const manifestUrl = resolveUrl(url, manifestLink);
    result.manifest.url = manifestUrl;
    const manifestResult = await safeFetch(manifestUrl);
    if (manifestResult.ok && manifestResult.text) {
      try {
        const manifestData = JSON.parse(manifestResult.text) as ManifestData;
        result.manifest.found = true;
        result.manifest.data = manifestData;
      } catch {
        result.manifest.error = "Failed to parse manifest JSON";
      }
    } else {
      result.manifest.error =
        manifestResult.error || "Failed to fetch manifest";
    }
  }

  const analysis = result.analysis;
  analysis.probableAppName =
    result.manifest.data?.name || result.html.title || undefined;
  analysis.probableShortName =
    result.manifest.data?.short_name || undefined;

  let score = 0;
  const notes: string[] = [];

  if (result.manifest.found) {
    score += 20;
  } else {
    notes.push("No web app manifest found");
  }

  if (result.manifest.data?.name) {
    score += 10;
  } else {
    notes.push("Manifest missing 'name' field");
  }

  if (result.manifest.data?.short_name) {
    score += 5;
  } else {
    notes.push("Manifest missing 'short_name'");
  }

  if (result.manifest.data?.start_url) {
    score += 10;
  } else {
    notes.push("Manifest missing 'start_url'");
  }

  if (
    result.manifest.data?.display &&
    ["standalone", "fullscreen", "minimal-ui"].includes(
      result.manifest.data.display,
    )
  ) {
    score += 10;
  } else {
    notes.push("Manifest display mode not set to standalone/fullscreen");
  }

  if (result.manifest.data?.icons && result.manifest.data.icons.length > 0) {
    score += 15;
    const has512 = result.manifest.data.icons.some((i) =>
      i.sizes?.includes("512x512"),
    );
    if (has512) {
      score += 5;
    } else {
      notes.push("No 512x512 icon found in manifest");
    }
  } else if (result.html.icons.length > 0) {
    score += 5;
    notes.push("Icons found in HTML but not in manifest");
  } else {
    notes.push("No icons detected");
  }

  if (
    result.manifest.data?.theme_color ||
    result.html.themeColor
  ) {
    score += 5;
  } else {
    notes.push("No theme color detected");
  }

  if (result.manifest.data?.background_color) {
    score += 5;
  } else {
    notes.push("No background color in manifest");
  }

  if (result.html.hasServiceWorkerHint) {
    score += 10;
  } else {
    notes.push("No service worker registration detected");
  }

  if (analysis.isHttps) {
    score += 5;
  } else {
    notes.push("Site not served over HTTPS");
  }

  analysis.installabilityScore = score;
  analysis.installabilityNotes = notes;

  res.json(result);
});

export default router;
