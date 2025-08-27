module.exports = {
  runtimeCaching: [
    {
      // Cache images only for repodash.pages.dev with Cache First (30 days)
      urlPattern: new RegExp('^https?://repodash\\.pages\\.dev/.*\\.(?:png|jpe?g|gif|webp|svg|ico)$', 'i'),
      handler: 'CacheFirst',
      options: {
        cacheName: 'images-cache',
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 Days
        },
      },
    },
    {
      // Cache HTML, CSS, JS only for repodash.pages.dev with Stale While Revalidate (1 day)
      urlPattern: new RegExp('^https?://repodash\\.pages\\.dev/.*\\.(?:js|css|html)$', 'i'),
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-resources',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24, // 1 Day
        },
      },
    },
  ],
  swDest: "dist/sw.js",
  sourcemap: false
};