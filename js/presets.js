/**
 * Page Sentinel - Pre-configured Audit Presets & Demo Datasets
 * Allows instant 1-click audit demonstrations and testing on GitHub Pages
 */

window.PAGE_SENTINEL_PRESETS = {
  'asian-paints': {
    name: 'Asian Paints E-Commerce',
    targetUrl: 'https://betabeautifulhomes.asianpaints.com/',
    crawlSitemap: true,
    pageCountLimit: 10,
    focus: 'all',
    summary: {
      totalIssues: 7,
      errorCount: 3,
      warningCount: 4,
      pagesAudited: 6,
      healthScore: 84,
      grade: 'B+',
      network: { total: 142, failed: 2, apis: 28, failedApis: 1, images: 64, failedImages: 1, scripts: 32, failedScripts: 0 },
      images: { total: 64, broken: 1, missingAlt: 3 },
      links: { total: 88, broken: 2, redirected: 4 },
      fonts: { total: 6, broken: 0 },
      apis: { total: 28, failed: 1 }
    },
    actionableFixes: [
      {
        category: 'Image',
        severity: 'Critical',
        targetUrl: 'https://betabeautifulhomes.asianpaints.com/dam/living-room-luxury-accent.webp',
        errorCode: 'HTTP_404_IMAGE',
        reason: 'Image asset returned HTTP 404 Not Found on CDN edge origin.',
        suggestedFix: 'Re-upload asset to AEM DAM /dam/living-room-luxury-accent.webp or correct image source URL.',
        elementOrSource: '<img class="hero-accent-img" src="/dam/living-room-luxury-accent.webp">'
      },
      {
        category: 'Link',
        severity: 'Critical',
        targetUrl: 'https://betabeautifulhomes.asianpaints.com/expert-consultation-booking',
        errorCode: 'HTTP_404_LINK',
        reason: 'Call-to-Action link points to an unmapped staging endpoint.',
        suggestedFix: 'Update hyperlink to active booking endpoint /book-interior-design-consultation',
        elementOrSource: '<a href="/expert-consultation-booking" class="btn-book">Book Now</a>'
      },
      {
        category: 'API',
        severity: 'Critical',
        targetUrl: 'https://betabeautifulhomes.asianpaints.com/bin/api/v2/pincode-serviceability?pin=400001',
        errorCode: 'API_HTTP_500',
        reason: 'Backend geo-service returned Internal Server Error on valid pincode lookup.',
        suggestedFix: 'Inspect AEM OSGi service log for NullPointerException in PincodeLookupServlet.',
        elementOrSource: 'fetch("/bin/api/v2/pincode-serviceability")'
      },
      {
        category: 'Image',
        severity: 'Warning',
        targetUrl: 'https://betabeautifulhomes.asianpaints.com/dam/textures/royale-play-metallics.jpg',
        errorCode: 'WCAG_ALT_MISSING',
        reason: 'Image is missing an alt attribute, failing WCAG 2.1 AA accessibility.',
        suggestedFix: 'Add descriptive alt="Royale Play Metallics wall texture swatch in gold"',
        elementOrSource: '<img src="/dam/textures/royale-play-metallics.jpg">'
      },
      {
        category: 'Speed',
        severity: 'Warning',
        targetUrl: 'https://betabeautifulhomes.asianpaints.com/etc.clientlibs/core.min.js',
        errorCode: 'HEAVY_JS_BUNDLE',
        reason: 'JavaScript bundle is 1.8MB uncompressed, blocking First Contentful Paint.',
        suggestedFix: 'Enable Brotli compression and split vendor bundles using dynamic imports.',
        elementOrSource: '<script src="/etc.clientlibs/core.min.js">'
      },
      {
        category: 'SEO',
        severity: 'Warning',
        targetUrl: 'https://betabeautifulhomes.asianpaints.com/interior-designs',
        errorCode: 'MULTIPLE_H1_HEADINGS',
        reason: 'Page contains 3 separate <h1> tags, diluting keyword relevance for search spiders.',
        suggestedFix: 'Keep single main <h1> and convert secondary titles to <h2>.',
        elementOrSource: '<h1>Living Room Designs</h1>, <h1>Kitchen Modular</h1>'
      },
      {
        category: 'Link',
        severity: 'Warning',
        targetUrl: 'https://betabeautifulhomes.asianpaints.com/contact',
        errorCode: 'HTTP_301_REDIRECT_HOP',
        reason: 'Link triggers 301 Permanent Redirect to https://betabeautifulhomes.asianpaints.com/contact-us/',
        suggestedFix: 'Update target anchor URL directly to /contact-us/ to eliminate 120ms redirect latency.',
        elementOrSource: '<a href="/contact">Contact</a>'
      }
    ],
    images: [
      { url: 'https://betabeautifulhomes.asianpaints.com/dam/living-room-luxury-accent.webp', renderedWidth: 600, renderedHeight: 400, naturalWidth: 0, naturalHeight: 0, hasAlt: true, altText: 'Luxury Living Room', status: 404, statusText: 'Not Found', isBroken: true, isLazy: true },
      { url: 'https://betabeautifulhomes.asianpaints.com/dam/textures/royale-play-metallics.jpg', renderedWidth: 320, renderedHeight: 240, naturalWidth: 1200, naturalHeight: 900, hasAlt: false, altText: '', status: 200, statusText: 'OK', isBroken: false, isLazy: true },
      { url: 'https://betabeautifulhomes.asianpaints.com/assets/logo.svg', renderedWidth: 160, renderedHeight: 40, naturalWidth: 160, naturalHeight: 40, hasAlt: true, altText: 'Asian Paints Beautiful Homes', status: 200, statusText: 'OK', isBroken: false, isLazy: false },
      { url: 'https://betabeautifulhomes.asianpaints.com/dam/modular-kitchen-hero.webp', renderedWidth: 800, renderedHeight: 500, naturalWidth: 800, naturalHeight: 500, hasAlt: true, altText: 'Modern Modular Kitchen Designs', status: 200, statusText: 'OK', isBroken: false, isLazy: true }
    ],
    links: [
      { anchorText: 'Book Consultation', targetUrl: 'https://betabeautifulhomes.asianpaints.com/expert-consultation-booking', status: 404, statusText: 'Not Found', isBroken: true, isExternal: false, isRedirected: false, redirectHops: [], finalUrl: 'https://betabeautifulhomes.asianpaints.com/expert-consultation-booking' },
      { anchorText: 'Contact', targetUrl: 'https://betabeautifulhomes.asianpaints.com/contact', status: 301, statusText: 'Moved Permanently', isBroken: false, isExternal: false, isRedirected: true, redirectHops: [{ url: 'https://betabeautifulhomes.asianpaints.com/contact-us/', status: 200 }], finalUrl: 'https://betabeautifulhomes.asianpaints.com/contact-us/' },
      { anchorText: 'Colour Catalogue', targetUrl: 'https://betabeautifulhomes.asianpaints.com/catalogue.pdf', status: 200, statusText: 'OK', isBroken: false, isExternal: false, isRedirected: false, redirectHops: [], finalUrl: 'https://betabeautifulhomes.asianpaints.com/catalogue.pdf' },
      { anchorText: 'Asian Paints Corporate', targetUrl: 'https://www.asianpaints.com/', status: 200, statusText: 'OK', isBroken: false, isExternal: true, isRedirected: false, redirectHops: [], finalUrl: 'https://www.asianpaints.com/' }
    ],
    networkTraffic: [
      { method: 'GET', url: 'https://betabeautifulhomes.asianpaints.com/bin/api/v2/pincode-serviceability?pin=400001', resourceType: 'fetch', status: 500, durationMs: 420, isFailed: true, contentType: 'application/json' },
      { method: 'GET', url: 'https://betabeautifulhomes.asianpaints.com/dam/living-room-luxury-accent.webp', resourceType: 'image', status: 404, durationMs: 95, isFailed: true, contentType: 'text/html' },
      { method: 'GET', url: 'https://betabeautifulhomes.asianpaints.com/api/v1/recommendations', resourceType: 'fetch', status: 200, durationMs: 140, isFailed: false, contentType: 'application/json' },
      { method: 'GET', url: 'https://betabeautifulhomes.asianpaints.com/etc.clientlibs/core.min.js', resourceType: 'script', status: 200, durationMs: 280, isFailed: false, contentType: 'application/javascript' }
    ],
    pageStatus: [
      { url: 'https://betabeautifulhomes.asianpaints.com/', finalUrl: 'https://betabeautifulhomes.asianpaints.com/', httpStatus: 200, statusText: 'OK', is404: false, isError: false, isRedirect: false, responseTimeMs: 185, contentType: 'text/html; charset=utf-8' },
      { url: 'https://betabeautifulhomes.asianpaints.com/contact', finalUrl: 'https://betabeautifulhomes.asianpaints.com/contact-us/', httpStatus: 301, statusText: 'Moved Permanently', is404: false, isError: false, isRedirect: true, responseTimeMs: 110, contentType: 'text/html' },
      { url: 'https://betabeautifulhomes.asianpaints.com/expert-consultation-booking', finalUrl: 'https://betabeautifulhomes.asianpaints.com/expert-consultation-booking', httpStatus: 404, statusText: 'Not Found', is404: true, isError: true, isRedirect: false, responseTimeMs: 92, contentType: 'text/html' }
    ],
    seoMetadata: {
      url: 'https://betabeautifulhomes.asianpaints.com/',
      title: 'Beautiful Homes - Luxury Interior Design & Home Decor Solutions | Asian Paints',
      titleLength: 76,
      titleStatus: 'too_long',
      description: 'Transform your home with Asian Paints Beautiful Homes interior design services. Expert designers, 3D visualization, and modular kitchens tailored for you.',
      descriptionLength: 154,
      descriptionStatus: 'optimal',
      canonicalUrl: 'https://betabeautifulhomes.asianpaints.com/',
      canonicalStatus: 'valid',
      robots: 'index, follow',
      isIndexable: true,
      openGraph: {
        title: 'Beautiful Homes - Interior Design by Asian Paints',
        description: 'Complete home interior design services with personalized 3D consultation.',
        image: 'https://betabeautifulhomes.asianpaints.com/dam/social-og-banner.jpg',
        url: 'https://betabeautifulhomes.asianpaints.com/',
        hasOgTitle: true,
        hasOgDesc: true,
        hasOgImage: true
      },
      twitterCard: {
        card: 'summary_large_image',
        title: 'Asian Paints Beautiful Homes Interior Design',
        description: 'Luxury home interiors tailored to your space.',
        image: 'https://betabeautifulhomes.asianpaints.com/dam/social-og-banner.jpg',
        hasTwitterCard: true
      },
      headings: {
        h1: ['Luxury Interior Designs for Modern Living', 'Modular Kitchen Solutions', 'Book Your Free Consultation'],
        h1Count: 3,
        h2Count: 8,
        h3Count: 14,
        h1Status: 'multiple'
      },
      structuredData: {
        hasSchema: true,
        schemaCount: 2,
        types: ['Organization', 'LocalBusiness']
      },
      score: 88,
      grade: 'B+'
    },
    pageSpeed: {
      score: 76,
      rating: 'Needs Improvement',
      metrics: {
        ttfbMs: 240,
        fcpMs: 1200,
        lcpMs: 2800,
        cls: 0.08,
        tbtMs: 310,
        loadCompleteMs: 3400
      },
      resources: {
        totalRequests: 142,
        totalTransferSizeKb: 3450,
        jsCount: 32,
        jsSizeKb: 1850,
        cssCount: 12,
        cssSizeKb: 320,
        imageCount: 64,
        imageSizeKb: 980,
        fontCount: 6,
        fontSizeKb: 140,
        htmlSizeKb: 65,
        apiCount: 28,
        apiSizeKb: 95
      },
      bottlenecks: [
        { severity: 'Critical', metric: 'LCP (Largest Contentful Paint)', value: '2.8s (Poor)', recommendation: 'Preload hero image <link rel="preload" as="image"> and compress with WebP.' },
        { severity: 'Warning', metric: 'JavaScript Execution (TBT)', value: '310ms', recommendation: 'Defer non-critical third-party analytics scripts.' }
      ]
    },
    consoleLogs: [
      { type: 'error', text: 'Uncaught TypeError: Cannot read properties of undefined (reading "pincode")', location: 'checkout.js:142', timestamp: '14:22:01' },
      { type: 'warning', text: 'Third-party cookie will be blocked in future Chrome versions', location: 'gtm.js:1', timestamp: '14:22:02' }
    ],
    crawledPages: [
      { url: 'https://betabeautifulhomes.asianpaints.com/', status: 200, issuesCount: 2 },
      { url: 'https://betabeautifulhomes.asianpaints.com/interior-designs', status: 200, issuesCount: 1 },
      { url: 'https://betabeautifulhomes.asianpaints.com/expert-consultation-booking', status: 404, issuesCount: 2 },
      { url: 'https://betabeautifulhomes.asianpaints.com/contact', status: 301, issuesCount: 1 },
      { url: 'https://betabeautifulhomes.asianpaints.com/contact-us/', status: 200, issuesCount: 0 },
      { url: 'https://betabeautifulhomes.asianpaints.com/catalogue.pdf', status: 200, issuesCount: 1 }
    ]
  },

  'localhost': {
    name: 'Local Dev Server',
    targetUrl: 'http://localhost:8933/',
    crawlSitemap: true,
    pageCountLimit: 10,
    focus: 'image',
    summary: {
      totalIssues: 2,
      errorCount: 1,
      warningCount: 1,
      pagesAudited: 3,
      healthScore: 85,
      grade: 'B',
      network: { total: 18, failed: 1, apis: 4, failedApis: 0, images: 8, failedImages: 1, scripts: 4, failedScripts: 0 },
      images: { total: 8, broken: 1, missingAlt: 1 },
      links: { total: 12, broken: 0, redirected: 0 },
      fonts: { total: 2, broken: 0 },
      apis: { total: 4, failed: 0 }
    },
    actionableFixes: [
      {
        category: 'Image',
        severity: 'Critical',
        targetUrl: 'http://localhost:8933/images/hero-banner-broken.png',
        errorCode: 'HTTP_404_IMAGE',
        reason: 'Image file does not exist on local public directory.',
        suggestedFix: 'Place hero-banner-broken.png in /public/images/ directory.',
        elementOrSource: '<img src="/images/hero-banner-broken.png">'
      },
      {
        category: 'Image',
        severity: 'Warning',
        targetUrl: 'http://localhost:8933/images/profile-avatar.jpg',
        errorCode: 'WCAG_ALT_MISSING',
        reason: 'Missing alt attribute for user profile thumbnail.',
        suggestedFix: 'Add alt="User Profile Avatar" to img tag.',
        elementOrSource: '<img src="/images/profile-avatar.jpg">'
      }
    ],
    images: [
      { url: 'http://localhost:8933/images/hero-banner-broken.png', renderedWidth: 400, renderedHeight: 200, naturalWidth: 0, naturalHeight: 0, hasAlt: false, altText: '', status: 404, statusText: 'Not Found', isBroken: true, isLazy: false },
      { url: 'http://localhost:8933/images/profile-avatar.jpg', renderedWidth: 80, renderedHeight: 80, naturalWidth: 200, naturalHeight: 200, hasAlt: false, altText: '', status: 200, statusText: 'OK', isBroken: false, isLazy: false },
      { url: 'http://localhost:8933/images/logo.png', renderedWidth: 120, renderedHeight: 40, naturalWidth: 120, naturalHeight: 40, hasAlt: true, altText: 'Company Logo', status: 200, statusText: 'OK', isBroken: false, isLazy: false }
    ],
    links: [
      { anchorText: 'Home', targetUrl: 'http://localhost:8933/', status: 200, statusText: 'OK', isBroken: false, isExternal: false, isRedirected: false, redirectHops: [], finalUrl: 'http://localhost:8933/' },
      { anchorText: 'Page 2', targetUrl: 'http://localhost:8933/page2', status: 200, statusText: 'OK', isBroken: false, isExternal: false, isRedirected: false, redirectHops: [], finalUrl: 'http://localhost:8933/page2' },
      { anchorText: 'Page 3', targetUrl: 'http://localhost:8933/page3', status: 200, statusText: 'OK', isBroken: false, isExternal: false, isRedirected: false, redirectHops: [], finalUrl: 'http://localhost:8933/page3' }
    ],
    networkTraffic: [
      { method: 'GET', url: 'http://localhost:8933/images/hero-banner-broken.png', resourceType: 'image', status: 404, durationMs: 12, isFailed: true, contentType: 'text/html' },
      { method: 'GET', url: 'http://localhost:8933/app.js', resourceType: 'script', status: 200, durationMs: 8, isFailed: false, contentType: 'application/javascript' }
    ],
    pageStatus: [
      { url: 'http://localhost:8933/', finalUrl: 'http://localhost:8933/', httpStatus: 200, statusText: 'OK', is404: false, isError: false, isRedirect: false, responseTimeMs: 15, contentType: 'text/html' },
      { url: 'http://localhost:8933/page2', finalUrl: 'http://localhost:8933/page2', httpStatus: 200, statusText: 'OK', is404: false, isError: false, isRedirect: false, responseTimeMs: 18, contentType: 'text/html' },
      { url: 'http://localhost:8933/page3', finalUrl: 'http://localhost:8933/page3', httpStatus: 200, statusText: 'OK', is404: false, isError: false, isRedirect: false, responseTimeMs: 14, contentType: 'text/html' }
    ],
    seoMetadata: {
      url: 'http://localhost:8933/',
      title: 'Localhost Application Test Suite',
      titleLength: 32,
      titleStatus: 'optimal',
      description: 'Dev server test harness for testing broken links, missing alt tags, and dynamic API responses.',
      descriptionLength: 95,
      descriptionStatus: 'optimal',
      canonicalUrl: 'http://localhost:8933/',
      canonicalStatus: 'valid',
      robots: 'noindex, nofollow',
      isIndexable: false,
      openGraph: { title: 'Localhost App', description: 'Testing environment', hasOgTitle: true, hasOgDesc: true, hasOgImage: false },
      twitterCard: { hasTwitterCard: false },
      headings: { h1: ['Page Sentinel Local Test Suite'], h1Count: 1, h2Count: 3, h3Count: 0, h1Status: 'optimal' },
      structuredData: { hasSchema: false, schemaCount: 0, types: [] },
      score: 78,
      grade: 'C+'
    },
    pageSpeed: {
      score: 98,
      rating: 'Good',
      metrics: { ttfbMs: 15, fcpMs: 120, lcpMs: 340, cls: 0.01, tbtMs: 10, loadCompleteMs: 450 },
      resources: { totalRequests: 18, totalTransferSizeKb: 120, jsCount: 4, jsSizeKb: 45, cssCount: 2, cssSizeKb: 15, imageCount: 8, imageSizeKb: 50, fontCount: 2, fontSizeKb: 8, htmlSizeKb: 2, apiCount: 4, apiSizeKb: 5 },
      bottlenecks: []
    },
    consoleLogs: [],
    crawledPages: [
      { url: 'http://localhost:8933/', status: 200, issuesCount: 1 },
      { url: 'http://localhost:8933/page2', status: 200, issuesCount: 1 },
      { url: 'http://localhost:8933/page3', status: 200, issuesCount: 0 }
    ]
  },

  'demo-broken': {
    name: 'Broken Demo Site (Errors Test)',
    targetUrl: 'https://broken-workshop-demo.test/',
    crawlSitemap: false,
    pageCountLimit: 1,
    focus: 'all',
    summary: {
      totalIssues: 12,
      errorCount: 7,
      warningCount: 5,
      pagesAudited: 1,
      healthScore: 42,
      grade: 'F',
      network: { total: 45, failed: 6, apis: 12, failedApis: 4, images: 18, failedImages: 3, scripts: 10, failedScripts: 1 },
      images: { total: 18, broken: 3, missingAlt: 6 },
      links: { total: 24, broken: 5, redirected: 3 },
      fonts: { total: 4, broken: 1 },
      apis: { total: 12, failed: 4 }
    },
    actionableFixes: [
      { category: '404 Finder', severity: 'Critical', targetUrl: 'https://broken-workshop-demo.test/cart/checkout', errorCode: 'HTTP_404_PAGE', reason: 'Checkout path returns 404 Not Found, breaking conversion funnel.', suggestedFix: 'Fix route definition in web router or configure URL rewrite.', elementOrSource: '<a href="/cart/checkout">' },
      { category: 'API', severity: 'Critical', targetUrl: 'https://broken-workshop-demo.test/api/auth/token', errorCode: 'API_HTTP_401', reason: 'Missing Authorization header causes immediate 401 Unauthorized rejection.', suggestedFix: 'Ensure Bearer token is appended in API interceptor.', elementOrSource: 'fetch("/api/auth/token")' },
      { category: 'Font', severity: 'Critical', targetUrl: 'https://broken-workshop-demo.test/fonts/CustomBrand-Bold.woff2', errorCode: 'FONT_CORS_ERROR', reason: 'WebFont blocked due to missing Access-Control-Allow-Origin header.', suggestedFix: 'Add "Access-Control-Allow-Origin: *" to font server response.', elementOrSource: '@font-face { src: url("/fonts/CustomBrand-Bold.woff2"); }' },
      { category: 'Image', severity: 'Critical', targetUrl: 'https://broken-workshop-demo.test/img/product-01.jpg', errorCode: 'HTTP_404_IMAGE', reason: 'Image asset does not exist on CDN origin.', suggestedFix: 'Upload missing image or update image asset reference.', elementOrSource: '<img src="/img/product-01.jpg">' },
      { category: 'Speed', severity: 'Critical', targetUrl: 'https://broken-workshop-demo.test/', errorCode: 'SLOW_TTFB', reason: 'Server took 1,840ms to return the first byte.', suggestedFix: 'Enable Redis page caching and optimize database queries.', elementOrSource: 'Server response TTFB' }
    ],
    images: [
      { url: 'https://broken-workshop-demo.test/img/product-01.jpg', renderedWidth: 300, renderedHeight: 300, naturalWidth: 0, naturalHeight: 0, hasAlt: false, altText: '', status: 404, statusText: 'Not Found', isBroken: true, isLazy: false },
      { url: 'https://broken-workshop-demo.test/img/product-02.jpg', renderedWidth: 300, renderedHeight: 300, naturalWidth: 0, naturalHeight: 0, hasAlt: false, altText: '', status: 500, statusText: 'Internal Error', isBroken: true, isLazy: false },
      { url: 'https://broken-workshop-demo.test/img/banner.png', renderedWidth: 1200, renderedHeight: 400, naturalWidth: 4000, naturalHeight: 1333, hasAlt: false, altText: '', status: 200, statusText: 'OK', isBroken: false, isLazy: false }
    ],
    links: [
      { anchorText: 'Checkout Now', targetUrl: 'https://broken-workshop-demo.test/cart/checkout', status: 404, statusText: 'Not Found', isBroken: true, isExternal: false, isRedirected: false, redirectHops: [], finalUrl: 'https://broken-workshop-demo.test/cart/checkout' },
      { anchorText: 'Privacy Policy', targetUrl: 'https://broken-workshop-demo.test/legal/privacy-v1', status: 410, statusText: 'Gone', isBroken: true, isExternal: false, isRedirected: false, redirectHops: [], finalUrl: 'https://broken-workshop-demo.test/legal/privacy-v1' }
    ],
    networkTraffic: [
      { method: 'POST', url: 'https://broken-workshop-demo.test/api/auth/token', resourceType: 'xhr', status: 401, durationMs: 310, isFailed: true, contentType: 'application/json' },
      { method: 'GET', url: 'https://broken-workshop-demo.test/fonts/CustomBrand-Bold.woff2', resourceType: 'font', status: 0, durationMs: 50, isFailed: true, contentType: 'font/woff2' }
    ],
    pageStatus: [
      { url: 'https://broken-workshop-demo.test/', finalUrl: 'https://broken-workshop-demo.test/', httpStatus: 200, statusText: 'OK', is404: false, isError: false, isRedirect: false, responseTimeMs: 1840, contentType: 'text/html' }
    ],
    seoMetadata: {
      url: 'https://broken-workshop-demo.test/',
      title: '',
      titleLength: 0,
      titleStatus: 'missing',
      description: '',
      descriptionLength: 0,
      descriptionStatus: 'missing',
      canonicalUrl: '',
      canonicalStatus: 'missing',
      robots: 'noindex',
      isIndexable: false,
      openGraph: { hasOgTitle: false, hasOgDesc: false, hasOgImage: false },
      twitterCard: { hasTwitterCard: false },
      headings: { h1: [], h1Count: 0, h2Count: 0, h3Count: 4, h1Status: 'missing' },
      structuredData: { hasSchema: false, schemaCount: 0, types: [] },
      score: 25,
      grade: 'F'
    },
    pageSpeed: {
      score: 38,
      rating: 'Poor',
      metrics: { ttfbMs: 1840, fcpMs: 3400, lcpMs: 5800, cls: 0.42, tbtMs: 1200, loadCompleteMs: 7800 },
      resources: { totalRequests: 45, totalTransferSizeKb: 8900, jsCount: 10, jsSizeKb: 4200, cssCount: 4, cssSizeKb: 800, imageCount: 18, imageSizeKb: 3500, fontCount: 4, fontSizeKb: 200, htmlSizeKb: 120, apiCount: 12, apiSizeKb: 80 },
      bottlenecks: [
        { severity: 'Critical', metric: 'TTFB (Time to First Byte)', value: '1,840ms (Extremely Slow)', recommendation: 'Audit server backend response time.' },
        { severity: 'Critical', metric: 'CLS (Cumulative Layout Shift)', value: '0.42 (Fails Core Web Vitals)', recommendation: 'Add explicit width and height attributes to all images.' }
      ]
    },
    consoleLogs: [
      { type: 'error', text: 'Uncaught SyntaxError: Unexpected token < in JSON at position 0', location: 'bundle.js:12', timestamp: '10:14:02' },
      { type: 'error', text: 'Failed to load resource: net::ERR_CONNECTION_REFUSED', location: 'api.js:84', timestamp: '10:14:03' }
    ],
    crawledPages: [
      { url: 'https://broken-workshop-demo.test/', status: 200, issuesCount: 12 }
    ]
  },

  'nutrien': {
    name: 'Nutrien Ag Solutions',
    targetUrl: 'https://nutrienagsolutions.ca/',
    crawlSitemap: true,
    pageCountLimit: 10,
    focus: 'all',
    summary: {
      totalIssues: 4,
      errorCount: 1,
      warningCount: 3,
      pagesAudited: 5,
      healthScore: 91,
      grade: 'A',
      network: { total: 98, failed: 1, apis: 16, failedApis: 0, images: 42, failedImages: 1, scripts: 24, failedScripts: 0 },
      images: { total: 42, broken: 1, missingAlt: 2 },
      links: { total: 64, broken: 0, redirected: 2 },
      fonts: { total: 4, broken: 0 },
      apis: { total: 16, failed: 0 }
    },
    actionableFixes: [
      { category: 'Image', severity: 'Critical', targetUrl: 'https://nutrienagsolutions.ca/assets/img/crop-protection-hero.jpg', errorCode: 'HTTP_404_IMAGE', reason: 'Hero crop protection image asset 404 not found on CDN.', suggestedFix: 'Re-sync image asset from DAM storage.', elementOrSource: '<img src="/assets/img/crop-protection-hero.jpg">' },
      { category: 'SEO', severity: 'Warning', targetUrl: 'https://nutrienagsolutions.ca/', errorCode: 'TITLE_TOO_LONG', reason: 'Page title is 82 characters, which will get truncated in Google SERP results.', suggestedFix: 'Trim title to under 60 characters for optimal click-through rate.', elementOrSource: '<title>Nutrien Ag Solutions Canada - Leading Agricultural Products, Agronomy & Seed Solutions</title>' }
    ],
    images: [
      { url: 'https://nutrienagsolutions.ca/assets/img/crop-protection-hero.jpg', renderedWidth: 800, renderedHeight: 400, naturalWidth: 0, naturalHeight: 0, hasAlt: true, altText: 'Nutrien Crop Protection Agronomy', status: 404, statusText: 'Not Found', isBroken: true, isLazy: false },
      { url: 'https://nutrienagsolutions.ca/assets/img/logo.svg', renderedWidth: 180, renderedHeight: 50, naturalWidth: 180, naturalHeight: 50, hasAlt: true, altText: 'Nutrien Ag Solutions', status: 200, statusText: 'OK', isBroken: false, isLazy: false }
    ],
    links: [
      { anchorText: 'Agronomy Services', targetUrl: 'https://nutrienagsolutions.ca/agronomy', status: 200, statusText: 'OK', isBroken: false, isExternal: false, isRedirected: false, redirectHops: [], finalUrl: 'https://nutrienagsolutions.ca/agronomy' }
    ],
    networkTraffic: [
      { method: 'GET', url: 'https://nutrienagsolutions.ca/assets/img/crop-protection-hero.jpg', resourceType: 'image', status: 404, durationMs: 140, isFailed: true, contentType: 'text/html' }
    ],
    pageStatus: [
      { url: 'https://nutrienagsolutions.ca/', finalUrl: 'https://nutrienagsolutions.ca/', httpStatus: 200, statusText: 'OK', is404: false, isError: false, isRedirect: false, responseTimeMs: 210, contentType: 'text/html' }
    ],
    seoMetadata: {
      url: 'https://nutrienagsolutions.ca/',
      title: 'Nutrien Ag Solutions Canada - Leading Agricultural Products, Agronomy & Seed Solutions',
      titleLength: 82,
      titleStatus: 'too_long',
      description: 'Discover agricultural products, crop nutrition, agronomy services, and seed solutions across Canada with Nutrien Ag Solutions.',
      descriptionLength: 126,
      descriptionStatus: 'optimal',
      canonicalUrl: 'https://nutrienagsolutions.ca/',
      canonicalStatus: 'valid',
      robots: 'index, follow',
      isIndexable: true,
      openGraph: { title: 'Nutrien Ag Solutions Canada', description: 'Agronomy & Agriculture Products', image: 'https://nutrienagsolutions.ca/og.jpg', hasOgTitle: true, hasOgDesc: true, hasOgImage: true },
      twitterCard: { hasTwitterCard: true },
      headings: { h1: ['Leading Ag Solutions in Canada'], h1Count: 1, h2Count: 5, h3Count: 8, h1Status: 'optimal' },
      structuredData: { hasSchema: true, schemaCount: 1, types: ['Organization'] },
      score: 94,
      grade: 'A'
    },
    pageSpeed: {
      score: 88,
      rating: 'Good',
      metrics: { ttfbMs: 210, fcpMs: 950, lcpMs: 1800, cls: 0.02, tbtMs: 140, loadCompleteMs: 2100 },
      resources: { totalRequests: 98, totalTransferSizeKb: 1800, jsCount: 24, jsSizeKb: 720, cssCount: 8, cssSizeKb: 140, imageCount: 42, imageSizeKb: 850, fontCount: 4, fontSizeKb: 60, htmlSizeKb: 30, apiCount: 16, apiSizeKb: 40 },
      bottlenecks: []
    },
    consoleLogs: [],
    crawledPages: [
      { url: 'https://nutrienagsolutions.ca/', status: 200, issuesCount: 2 },
      { url: 'https://nutrienagsolutions.ca/agronomy', status: 200, issuesCount: 0 }
    ]
  },

  'clean-fast': {
    name: 'High-Speed Clean Page',
    targetUrl: 'https://clean-performance-template.dev/',
    crawlSitemap: false,
    pageCountLimit: 1,
    focus: 'all',
    summary: {
      totalIssues: 0,
      errorCount: 0,
      warningCount: 0,
      pagesAudited: 1,
      healthScore: 100,
      grade: 'A+',
      network: { total: 14, failed: 0, apis: 2, failedApis: 0, images: 4, failedImages: 0, scripts: 2, failedScripts: 0 },
      images: { total: 4, broken: 0, missingAlt: 0 },
      links: { total: 10, broken: 0, redirected: 0 },
      fonts: { total: 2, broken: 0 },
      apis: { total: 2, failed: 0 }
    },
    actionableFixes: [],
    images: [
      { url: 'https://clean-performance-template.dev/img/hero.webp', renderedWidth: 800, renderedHeight: 400, naturalWidth: 800, naturalHeight: 400, hasAlt: true, altText: 'Clean Performance Architecture Diagram', status: 200, statusText: 'OK', isBroken: false, isLazy: true }
    ],
    links: [
      { anchorText: 'Documentation', targetUrl: 'https://clean-performance-template.dev/docs', status: 200, statusText: 'OK', isBroken: false, isExternal: false, isRedirected: false, redirectHops: [], finalUrl: 'https://clean-performance-template.dev/docs' }
    ],
    networkTraffic: [
      { method: 'GET', url: 'https://clean-performance-template.dev/app.js', resourceType: 'script', status: 200, durationMs: 25, isFailed: false, contentType: 'application/javascript' }
    ],
    pageStatus: [
      { url: 'https://clean-performance-template.dev/', finalUrl: 'https://clean-performance-template.dev/', httpStatus: 200, statusText: 'OK', is404: false, isError: false, isRedirect: false, responseTimeMs: 45, contentType: 'text/html' }
    ],
    seoMetadata: {
      url: 'https://clean-performance-template.dev/',
      title: 'Ultra-Fast Performance & Clean SEO Template',
      titleLength: 44,
      titleStatus: 'optimal',
      description: 'Zero-bloat web architecture designed for 100 PageSpeed scores, perfect accessibility, and rich semantic metadata.',
      descriptionLength: 114,
      descriptionStatus: 'optimal',
      canonicalUrl: 'https://clean-performance-template.dev/',
      canonicalStatus: 'valid',
      robots: 'index, follow',
      isIndexable: true,
      openGraph: { title: 'Clean Performance Template', description: 'Ultra-fast web template', image: 'https://clean-performance-template.dev/og.png', hasOgTitle: true, hasOgDesc: true, hasOgImage: true },
      twitterCard: { card: 'summary_large_image', hasTwitterCard: true },
      headings: { h1: ['Ultra-Fast Clean Architecture'], h1Count: 1, h2Count: 4, h3Count: 6, h1Status: 'optimal' },
      structuredData: { hasSchema: true, schemaCount: 1, types: ['WebSite'] },
      score: 100,
      grade: 'A+'
    },
    pageSpeed: {
      score: 100,
      rating: 'Good',
      metrics: { ttfbMs: 45, fcpMs: 320, lcpMs: 640, cls: 0.00, tbtMs: 0, loadCompleteMs: 780 },
      resources: { totalRequests: 14, totalTransferSizeKb: 180, jsCount: 2, jsSizeKb: 40, cssCount: 1, cssSizeKb: 12, imageCount: 4, imageSizeKb: 90, fontCount: 2, fontSizeKb: 25, htmlSizeKb: 8, apiCount: 2, apiSizeKb: 5 },
      bottlenecks: []
    },
    consoleLogs: [],
    crawledPages: [
      { url: 'https://clean-performance-template.dev/', status: 200, issuesCount: 0 }
    ]
  }
};
