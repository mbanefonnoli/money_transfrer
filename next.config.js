/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['puppeteer-core', '@sparticuz/chromium', 'puppeteer'],
    // Next's file tracer only follows import/require, but @sparticuz/chromium's
    // Chromium binary lives in bin/ and is read from disk at runtime (never
    // imported) — without this, the tracer drops it from the deployed
    // function entirely, which is exactly why it worked locally but failed
    // on Vercel with "libnss3.so: cannot open shared object file" (the whole
    // bin/ directory, not just that one file, was simply missing).
    outputFileTracingIncludes: {
      '/api/rates': ['./node_modules/@sparticuz/chromium/bin/**/*'],
    },
  },
};

module.exports = nextConfig;
