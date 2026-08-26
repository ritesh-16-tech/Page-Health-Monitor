export class SpeedChecker {
    async inspectSpeed(page) {
        const pageUrl = page.url();
        const perfData = await page.evaluate(`(() => {
      // 1. Navigation Timing v2
      const navEntries = performance.getEntriesByType('navigation');
      const nav = navEntries.length > 0 ? navEntries[0] : null;

      let ttfbMs = 0;
      let dnsMs = 0;
      let tcpMs = 0;
      let sslMs = 0;
      let downloadMs = 0;
      let domInteractiveMs = 0;
      let domContentLoadedMs = 0;
      let loadCompleteMs = 0;
      let htmlSizeKb = 0;

      if (nav) {
        dnsMs = Math.max(0, Math.round(nav.domainLookupEnd - nav.domainLookupStart));
        tcpMs = Math.max(0, Math.round(nav.connectEnd - nav.connectStart));
        sslMs = nav.secureConnectionStart > 0 ? Math.max(0, Math.round(nav.connectEnd - nav.secureConnectionStart)) : 0;
        ttfbMs = Math.max(0, Math.round(nav.responseStart - nav.requestStart));
        downloadMs = Math.max(0, Math.round(nav.responseEnd - nav.responseStart));
        domInteractiveMs = Math.max(0, Math.round(nav.domInteractive));
        domContentLoadedMs = Math.max(0, Math.round(nav.domContentLoadedEventEnd));
        loadCompleteMs = Math.max(0, Math.round(nav.loadEventEnd || nav.duration));
        htmlSizeKb = Math.round(((nav.transferSize || nav.encodedBodySize || 0) / 1024) * 10) / 10;
      } else {
        const t = performance.timing;
        if (t && t.navigationStart) {
          dnsMs = Math.max(0, t.domainLookupEnd - t.domainLookupStart);
          tcpMs = Math.max(0, t.connectEnd - t.connectStart);
          ttfbMs = Math.max(0, t.responseStart - t.requestStart);
          downloadMs = Math.max(0, t.responseEnd - t.responseStart);
          domInteractiveMs = Math.max(0, t.domInteractive - t.navigationStart);
          domContentLoadedMs = Math.max(0, t.domContentLoadedEventEnd - t.navigationStart);
          loadCompleteMs = Math.max(0, t.loadEventEnd - t.navigationStart);
        }
      }

      // 2. Paint Timing
      const paintEntries = performance.getEntriesByType('paint');
      let fcpMs = 0;
      for (let i = 0; i < paintEntries.length; i++) {
        if (paintEntries[i].name === 'first-contentful-paint') {
          fcpMs = Math.round(paintEntries[i].startTime);
          break;
        }
      }
      if (fcpMs === 0 && domContentLoadedMs > 0) {
        fcpMs = Math.round(domContentLoadedMs * 0.75);
      }

      // 3. Web Vitals
      let lcpMs = fcpMs;
      try {
        const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
        if (lcpEntries.length > 0) {
          lcpMs = Math.round(lcpEntries[lcpEntries.length - 1].startTime);
        }
      } catch (e) {}

      if (lcpMs === 0 || lcpMs < fcpMs) {
        lcpMs = Math.round(Math.max(fcpMs, loadCompleteMs * 0.85));
      }

      let cls = 0;
      try {
        const layoutEntries = performance.getEntriesByType('layout-shift');
        for (let i = 0; i < layoutEntries.length; i++) {
          if (!layoutEntries[i].hadRecentInput) {
            cls += layoutEntries[i].value;
          }
        }
      } catch (e) {}
      cls = Math.round(cls * 1000) / 1000;

      let tbtMs = 0;
      try {
        const longTasks = performance.getEntriesByType('longtask');
        for (let i = 0; i < longTasks.length; i++) {
          if (longTasks[i].duration > 50) {
            tbtMs += longTasks[i].duration - 50;
          }
        }
      } catch (e) {}
      tbtMs = Math.round(tbtMs);

      // 4. Resource Timings & Breakdown
      const resources = performance.getEntriesByType('resource');

      let totalRequests = resources.length + 1;
      let totalTransferBytes = (nav ? (nav.transferSize || nav.encodedBodySize || 0) : 0);

      let jsCount = 0;
      let jsBytes = 0;
      let cssCount = 0;
      let cssBytes = 0;
      let imageCount = 0;
      let imageBytes = 0;
      let fontCount = 0;
      let fontBytes = 0;
      let apiCount = 0;
      let apiBytes = 0;
      let otherCount = 0;
      let otherBytes = 0;

      for (let i = 0; i < resources.length; i++) {
        const res = resources[i];
        const size = res.transferSize || res.encodedBodySize || res.decodedBodySize || 0;
        totalTransferBytes += size;

        const initiator = res.initiatorType;
        const name = res.name.toLowerCase();

        if (initiator === 'script' || name.endsWith('.js') || name.includes('.js?')) {
          jsCount++;
          jsBytes += size;
        } else if (initiator === 'css' || initiator === 'link' || name.endsWith('.css') || name.includes('.css?')) {
          cssCount++;
          cssBytes += size;
        } else if (
          initiator === 'img' ||
          initiator === 'image' ||
          name.match(/\\.(png|jpg|jpeg|gif|webp|svg|avif|ico)(\\?.*)?$/)
        ) {
          imageCount++;
          imageBytes += size;
        } else if (initiator === 'font' || name.match(/\\.(woff|woff2|ttf|otf|eot)(\\?.*)?$/)) {
          fontCount++;
          fontBytes += size;
        } else if (initiator === 'fetch' || initiator === 'xmlhttprequest') {
          apiCount++;
          apiBytes += size;
        } else {
          otherCount++;
          otherBytes += size;
        }
      }

      return {
        metrics: {
          ttfbMs,
          dnsMs,
          tcpMs,
          sslMs,
          downloadMs,
          domInteractiveMs,
          domContentLoadedMs,
          loadCompleteMs,
          fcpMs,
          lcpMs,
          cls,
          tbtMs
        },
        resources: {
          totalRequests,
          totalTransferSizeKb: Math.round((totalTransferBytes / 1024) * 10) / 10,
          jsCount,
          jsSizeKb: Math.round((jsBytes / 1024) * 10) / 10,
          cssCount,
          cssSizeKb: Math.round((cssBytes / 1024) * 10) / 10,
          imageCount,
          imageSizeKb: Math.round((imageBytes / 1024) * 10) / 10,
          fontCount,
          fontSizeKb: Math.round((fontBytes / 1024) * 10) / 10,
          htmlSizeKb,
          apiCount,
          apiSizeKb: Math.round((apiBytes / 1024) * 10) / 10,
          otherCount,
          otherSizeKb: Math.round((otherBytes / 1024) * 10) / 10
        }
      };
    })()`);
        const metrics = perfData.metrics;
        const resources = perfData.resources;
        // Calculate Performance Score (0-100)
        let score = 100;
        const bottlenecks = [];
        // 1. TTFB (Server response time) - target <= 400ms
        if (metrics.ttfbMs > 1200) {
            score -= 25;
            bottlenecks.push({
                severity: 'Critical',
                metric: 'TTFB (Time to First Byte)',
                value: `${metrics.ttfbMs} ms`,
                recommendation: 'Server response time is critically slow (>1.2s). Enable server page caching, edge CDN, and optimize backend database queries.'
            });
        }
        else if (metrics.ttfbMs > 600) {
            score -= 12;
            bottlenecks.push({
                severity: 'Warning',
                metric: 'TTFB (Time to First Byte)',
                value: `${metrics.ttfbMs} ms`,
                recommendation: 'Server response time is above optimal (>600ms). Consider using a CDN (Cloudflare/Fastly/Akamai) and server caching.'
            });
        }
        // 2. FCP (First Contentful Paint) - target <= 1.8s
        if (metrics.fcpMs > 3000) {
            score -= 25;
            bottlenecks.push({
                severity: 'Critical',
                metric: 'FCP (First Contentful Paint)',
                value: `${(metrics.fcpMs / 1000).toFixed(2)} s`,
                recommendation: 'Initial rendering is delayed (>3s). Eliminate render-blocking CSS/JS and inline critical CSS above the fold.'
            });
        }
        else if (metrics.fcpMs > 1800) {
            score -= 10;
            bottlenecks.push({
                severity: 'Warning',
                metric: 'FCP (First Contentful Paint)',
                value: `${(metrics.fcpMs / 1000).toFixed(2)} s`,
                recommendation: 'First Contentful Paint can be improved (<1.8s). Preload critical fonts and defer non-essential scripts.'
            });
        }
        // 3. Load Complete Time - target <= 2.5s
        if (metrics.loadCompleteMs > 6000) {
            score -= 20;
            bottlenecks.push({
                severity: 'Critical',
                metric: 'Total Page Load Time',
                value: `${(metrics.loadCompleteMs / 1000).toFixed(2)} s`,
                recommendation: 'Total page load exceeds 6 seconds. Defer third-party tags, optimize heavy payload assets, and lazy-load offscreen images.'
            });
        }
        else if (metrics.loadCompleteMs > 3500) {
            score -= 10;
            bottlenecks.push({
                severity: 'Warning',
                metric: 'Total Page Load Time',
                value: `${(metrics.loadCompleteMs / 1000).toFixed(2)} s`,
                recommendation: 'Total load time is moderate (>3.5s). Review script execution and asset bundle sizes.'
            });
        }
        // 4. Heavy Assets (JS & Images)
        if (resources.jsSizeKb > 1500) {
            score -= 15;
            bottlenecks.push({
                severity: 'Critical',
                metric: 'JavaScript Bundle Size',
                value: `${resources.jsSizeKb} KB (${resources.jsCount} files)`,
                recommendation: 'Excessive JS bundle weight (>1.5MB). Apply tree-shaking, code splitting, dynamic imports, and gzip/brotli compression.'
            });
        }
        else if (resources.jsSizeKb > 600) {
            score -= 5;
            bottlenecks.push({
                severity: 'Warning',
                metric: 'JavaScript Bundle Size',
                value: `${resources.jsSizeKb} KB (${resources.jsCount} files)`,
                recommendation: 'JavaScript payload is above 600KB. Ensure scripts are minified and compressed.'
            });
        }
        if (resources.imageSizeKb > 3000) {
            score -= 15;
            bottlenecks.push({
                severity: 'Critical',
                metric: 'Image Assets Weight',
                value: `${resources.imageSizeKb} KB (${resources.imageCount} images)`,
                recommendation: 'Total images exceed 3MB. Convert images to Next-Gen formats (WebP, AVIF) and implement responsive srcset images.'
            });
        }
        else if (resources.imageSizeKb > 1500) {
            score -= 5;
            bottlenecks.push({
                severity: 'Warning',
                metric: 'Image Assets Weight',
                value: `${resources.imageSizeKb} KB (${resources.imageCount} images)`,
                recommendation: 'Images total more than 1.5MB. Compress images and ensure lazy loading for off-screen graphics.'
            });
        }
        // 5. Total Request Count
        if (resources.totalRequests > 100) {
            score -= 5;
            bottlenecks.push({
                severity: 'Warning',
                metric: 'Total HTTP Requests',
                value: `${resources.totalRequests} requests`,
                recommendation: 'High HTTP request overhead (>100 requests). Bundle assets, consolidate CSS/JS sprites, and use HTTP/2 multiplexing.'
            });
        }
        score = Math.max(0, Math.min(100, score));
        let rating = 'Good';
        if (score < 55)
            rating = 'Poor';
        else if (score < 80)
            rating = 'Needs Improvement';
        return {
            url: pageUrl,
            score,
            rating,
            metrics,
            resources,
            bottlenecks
        };
    }
}
