# Issue #273: Hero video, image sizes and cache headers (mobile LCP 5.2 s)

As of 2026-09-10, branch `feature/273-performance-hero-media`.

## Measurement (Lighthouse 12 on pizzeria-lafattoria.de, 2026-09-10)

| | Mobile | Desktop |
| --- | --- | --- |
| Performance | 68 | 88 |
| LCP | 5.3 s (the `<video>`) | 1.9 s (the `<video>`) |
| Page weight | 5.1 MB | 5.1 MB |

- Hero video `4518950-hd_1920_1080_25fps.mp4`: 3.4 MB, 1920×1080, 5 s, 4.9 Mbit/s, `autoplay` + `fetchpriority="high"`, no poster.
- CTA background: the category header image (4928×1400, 756 KB) from `content/index.yml`, rendered through `NuxtImg` without effect (the domain is not configured for the image provider, so no `srcset`).
- Gallery: six unsized, eagerly loaded images (Lighthouse `unsized-images`, `offscreen-images`).
- 11 requests without `Cache-Control` from `nbg1.your-objectstorage.com` (Hetzner Object Storage); the ShopBite demo Shopware (`shopware.shopbite.de`) sends `public, max-age=2592000, immutable`.
- bf-cache: "Internal error", not actionable (Chrome-internal, no `unload` listener in our code).
- The ShopBite demo's own hero video is worse: 27.6 MB, 2560×1440, 18 s.

## Decisions

- **Poster instead of video as LCP.** `hero.poster` (content) is server-rendered as `<img fetchpriority="high">` with a `<link rel="preload">`; the `<video>` is added after hydration only when `(min-width: 768px)` matches, with `preload="metadata"`, `poster` and without `fetchpriority`. Phones never request the video.
- **Shopware thumbnails instead of an image proxy.** Category media and product covers come with thumbnails (400/800/1920 px); `mediaSrcSet()`/`mediaSize()` (`app/utils/media.ts`) turn them into `srcset`/`width`/`height`. No `@nuxt/image` domains config: ipx would resize on the storefront container per request.
- Content images (CTA, marquee, gallery) are plain `<img loading="lazy">`; the gallery gets a fixed `aspect-[4/3]` box. Their size is the shop owner's responsibility, documented.
- The logo gets a `height` matching its aspect ratio.
- Cache headers on the object storage are a bucket setting, documented (Hetzner: `aws s3 cp --metadata-directive REPLACE --cache-control` or `s3cmd modify --add-header`).

## Media generated with ffmpeg (static binary via `ffmpeg-static`)

```
ffmpeg -ss 1 -i hero.mp4 -frames:v 1 -vf "scale=1280:-2" -c:v libwebp -quality 70 hero-poster.webp
ffmpeg -i hero.mp4 -vf "scale=1280:-2" -r 25 -c:v libx264 -crf 28 -preset medium -an -movflags +faststart hero-720p.mp4
```

| Shop | Original | 720p | Poster 1280 |
| --- | --- | --- | --- |
| La Fattoria | 3.4 MB | 713 KB | 65 KB |
| ShopBite demo | 27.6 MB | 6.0 MB | 60 KB (`public/hero-poster.webp`) |

The 720p files are not in a repository; they need to be uploaded to the respective Shopware media (no admin credentials in the storefront `.env`).

## Not covered

- `Wishlist.vue`, `CardKitchen.vue`, `FilterGroup.vue`, `ShippingMethod.vue`, `PaymentMethod.vue` still use `NuxtImg` for small icons; harmless without a provider domain.
- La Fattoria's `Kalam-Regular.ttf` (154 KB, `font-display: optional`) is the shop's own font.
- bf-cache "Internal error".

## Measuring locally: pitfalls

Lighthouse against the bare `node .output/server/index.mjs` is not comparable with production:

- Nitro does not compress SSR HTML (`compressPublicAssets` only covers static files); the reverse proxy in front of production does. Lighthouse then flags 130–480 KB of uncompressed HTML.
- Over HTTP/1.1 the ~110 `modulepreload` links Nuxt emits queue behind six connections and delay the CSS; production is HTTP/2. `scratchpad/h2-proxy.cjs` (TLS + h2 + gzip in front of :3099) fixes both.
- TTFB is 450–680 ms here (SSR calls the Store API in another data centre) vs 190 ms live.
- The observed (unthrottled) first paint of the local headless Chrome is ~1.5 s although HTML, CSS and poster are loaded at 0.45 s, while the live site paints at 0.4 s; nothing in the HTML hides the page. Simulated mobile FCP therefore stays around 3.2 s locally regardless of media, and mobile LCP (poster loaded at 1.6 s) is reported as 5.6 s ("render delay" ~4 s). The mobile acceptance numbers need a run against the deployed shop.

Local results (h2 proxy, La Fattoria Store API, demo content): desktop `/` 98 (LCP 1.0 s, was 88/1.9 s live), `/c/Pizza/` 98 (LCP 1.0 s); mobile `/` 66 (LCP element is the 19 KB poster, page weight 1.07 MB instead of 5.1 MB, no video request), `/c/Pizza/` 65 (category header 37 KB thumbnail instead of 756 KB, CLS 0).

The `blur-sm` on the poster made no measurable difference in the simulation; it was still removed in favour of a pre-blurred file (19 KB instead of 60 KB), which also saves the filter on real phones.

## Follow-ups worth an issue

- Mobile main-thread cost: 1.0–1.6 s script evaluation (`Bk-QZtQM.js`, the entry) and ~110 preloaded chunks; the category page ships a 541 KB (uncompressed) payload with 100 products.
- `AnimatedSection` renders content invisible until hydration (#250) and shifts the hero USP row (CLS 0.028 on `/`).
