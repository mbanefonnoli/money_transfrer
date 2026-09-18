const { join } = require('path');

// See ../.puppeteerrc.cjs (Rate Board) for why: Puppeteer's default cache
// directory lives on the C: drive, which this machine keeps nearly full.
// Pin it onto E: instead.
module.exports = {
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
