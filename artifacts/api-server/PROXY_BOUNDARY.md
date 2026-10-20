# Public diagnostic proxy contract

`POST /api/proxy-scan` is intentionally a public diagnostic endpoint. The router is
mounted by `src/app.ts` and `src/routes/index.ts`; this change adds no identity,
billing, authorization or customer scanning feature. Its two network inputs are
the submitted URL and the HTML page's manifest link. Redirect locations from
either resource are also untrusted. Icon URLs are reported, not fetched here.

The supported repository runtime is Node 24 (`.replit`). The transport uses Node
built-ins and adds no dependencies. Initial input is trimmed, defaults to HTTPS
and follows WHATWG URL canonicalization. HTTP and HTTPS, public IPv4/IPv6 hosts,
ordinary explicit web ports, paths and queries remain supported. User information
is rejected, preserving Fetch's refusal to turn URL credentials into Basic auth.
Fetch's blocked service ports remain blocked. Relative redirects and cross-origin
public manifest URLs remain supported.

Each hop resolves all addresses once. DNS failures, empty answers, malformed
families, more than 64 answers or any nonpublic answer fail closed. Only those
vetted addresses are supplied to the actual socket lookup; no second resolver or
pooled socket can substitute another address. The original URL supplies Host and
HTTPS server identity. Certificate verification remains enabled with Node's
default identity check. Literal addresses use the same public-address policy.

The address policy is deliberately conservative. It excludes private, loopback,
link-local, unspecified, shared, documentation, multicast and reserved IPv4
ranges; IPv6 must be global unicast or an IPv4-mapped public address, excluding
listed special-purpose/tunneling ranges. It rejects scope identifiers and catches
canonical numeric IPv4 and mapped IPv6 spellings. It is not a complete dynamic
IANA reachability registry: some globally reachable special-purpose addresses
within the excluded ranges are also rejected. No private-network opt-in exists.

One ten-second deadline covers the entire scan's DNS, connections, redirects and
HTML/manifest bodies. At most five redirects are followed per resource. Redirect
and null-body status responses are destroyed without reading their bodies. An OS
DNS lookup cannot be cancelled, but a late result cannot start a request after the
deadline. Abort/error paths destroy active streams and sockets.

Each resource is limited to 2 MiB of streamed wire bytes and 2 MiB after every
decoding stage, before text materialization. Declared oversized responses fail
early. Native Fetch coding behavior is retained for gzip/x-gzip, wrapped or raw
deflate, Brotli, Zstandard, empty/truncated compressed responses, unknown coding
fallback and the maximum of five coding layers. Unknown coding leaves the whole
representation encoded and byte-limited. UTF-8 decoding retains BOM behavior.

The JSON response shape is unchanged: missing/invalid initial URLs produce 400;
fetch failures produce the existing diagnostic result; manifest failure does not
erase successful HTML diagnostics. `finalUrl`, relative asset bases and analysis
continue to use the initially normalized URL, as before. This patch does not
claim that a discovered manifest, service-worker hint or score proves production
installability or offline operation.

Run `pnpm test:proxy-boundary` with the repository's installed dependency graph.
The focused suite transpiles the actual source, substitutes synthetic DNS/time
and transport fixtures, and uses real built-in address checks, streams and
codecs. Owned loopback HTTP fixtures verify actual socket lookup/Host behavior
and native Fetch coding compatibility. Only the test harness maps a previously
vetted synthetic public address to the owned loopback server. There is no
production bypass. Express/Cheerio selector doubles test route plumbing, not
full parser integration. TLS defaults are asserted without creating certificates
or contacting a real host.

Full workspace typecheck/build, real Cheerio integration, TLS handshake and
deployed acceptance remain release gates when the exact dependency graph and
appropriate environment are available. The focused suite and strict helper
typecheck do not replace those gates. Per-request bounds do not provide fleet
concurrency/rate controls; deployment policy remains a separate operational gate.

Implementation references: [Node 24 HTTP lookup and request options](https://nodejs.org/download/release/v24.16.0/docs/api/http.html),
[HTTPS defaults](https://nodejs.org/download/release/v24.16.0/docs/api/https.html),
[BlockList](https://nodejs.org/download/release/v24.16.0/docs/api/net.html),
[stream cancellation](https://nodejs.org/download/release/v24.16.0/docs/api/stream.html),
[compression streams](https://nodejs.org/download/release/v24.16.0/docs/api/zlib.html),
[Fetch port policy](https://fetch.spec.whatwg.org/#port-blocking), and the
[IPv4](https://www.iana.org/assignments/iana-ipv4-special-registry/iana-ipv4-special-registry.xhtml)
and [IPv6 special-purpose registries](https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xhtml).
