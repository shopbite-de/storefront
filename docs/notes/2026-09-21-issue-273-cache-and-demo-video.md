# Issue #273 follow-up: cache headers, demo video, acceptance

Follow-up to `2026-09-10-issue-273-performance-media.md` (PR #308).

## State on 2026-09-21

- Object storage media (demo and La Fattoria) send
  `public, max-age=31536000, immutable`: done on the buckets.
- Homepage docs cover poster, video size, thumbnails and the bucket header.
- Remaining requests without a useful cache lifetime on demo.shopbite.de:
  - files from `public/` (`/hero-poster.webp`, `/favicon.ico`, `/light/Logo.png`):
    no `Cache-Control` at all. Nitro only adds one for public asset dirs with
    their own `baseURL`; `public/` is mounted at `/` with `fallthrough`, and
    the static handler never sets the header.
  - `/_ipx/*` (resized logo): IPX default `max-age=60`.
  - `analytics.shopbite.de/matomo.js`: TTL 0, Matomo server config, not
    in this repository.
- The demo hero video was still the 27.6 MB original (2560×1440, 18 s, with
  audio); Lighthouse desktop runs that loaded it weighed 27.7 MB.

## Changes

- `modules/public-cache.ts`: route rule with
  `public, max-age=2592000, stale-while-revalidate=86400` per file in the
  `public/` folder of every layer (checked with an app extending the layer:
  its own files get the rule, `/` does not). 30 days, not immutable, because
  the names are not fingerprinted.
- `image.ipx.maxAge: 2592000`. A route rule does not reach IPX: it runs as its
  own node handler and only checks its own response headers.
- Demo video: first 8 s, 960×540, 24 fps, no audio, CRF 32, faststart:
  0.98 MB, uploaded as a new Shopware media `hero-demo-540p` (the original
  `background.mp4` stays in the media folder); `content/index.yml` points to it.

```
ffmpeg -ss 0 -t 8 -i background.mp4 -vf "scale=960:-2" -r 24 -c:v libx264 -crf 32 \
  -preset slow -pix_fmt yuv420p -an -movflags +faststart hero-demo-540p.mp4
```

## Lighthouse (demo.shopbite.de, before this change)

Local Lighthouse 13.4, simulated throttling, 8 mobile runs: median score 75
(64–90), LCP 5.2 s, TBT 160 ms, CLS 0. Desktop 89–99. PageSpeed Insights was not
available (anonymous daily quota).

The LCP element is the 19 KB poster. Observed (unthrottled) FCP and LCP are the
same paint at 0.7–1.5 s; the poster is loaded at 0.6–0.9 s. The simulated LCP
is high because the first paint happens after the ~42 script requests, which
the simulation replays on slow 4G. The mobile score is therefore limited by
the number of JS chunks before the first paint, not by media.
