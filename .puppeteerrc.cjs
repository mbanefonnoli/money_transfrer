const { join } = require('path');

// Puppeteer defaults to caching its downloaded Chromium under
// %LOCALAPPDATA% on Windows, which lives on the C: drive. This machine's C:
// drive is nearly full, so pin the cache directory onto E: (inside the
// project, gitignored) instead.
module.exports = {
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
