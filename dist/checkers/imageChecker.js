import axios from 'axios';
import pLimit from 'p-limit';
export class ImageChecker {
    networkImageStatuses = new Map();
    attach(page) {
        page.on('response', (response) => {
            const resourceType = response.request().resourceType();
            if (resourceType === 'image') {
                const url = response.url();
                this.networkImageStatuses.set(url, {
                    status: response.status(),
                    statusText: response.statusText()
                });
                // Also map without query parameters for matching
                const cleanUrl = url.split('?')[0];
                if (cleanUrl !== url) {
                    this.networkImageStatuses.set(cleanUrl, {
                        status: response.status(),
                        statusText: response.statusText()
                    });
                }
            }
        });
    }
    async checkImages(page) {
        const pageBaseUrl = page.url();
        const rawImages = await page.evaluate(() => {
            const results = [];
            // 1. Regular <img> tags
            const imgElements = Array.from(document.querySelectorAll('img'));
            for (const img of imgElements) {
                const src = img.currentSrc || img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '';
                if (!src || src.startsWith('data:'))
                    continue;
                const rect = img.getBoundingClientRect();
                results.push({
                    url: src,
                    elementTag: 'img',
                    renderedWidth: Math.round(rect.width),
                    renderedHeight: Math.round(rect.height),
                    naturalWidth: img.naturalWidth,
                    naturalHeight: img.naturalHeight,
                    hasAlt: img.hasAttribute('alt'),
                    altText: img.getAttribute('alt') || '',
                    isLazy: img.loading === 'lazy' || img.hasAttribute('data-src') || img.hasAttribute('data-lazy-src') || img.classList.contains('swiper-lazy'),
                    complete: img.complete,
                    currentSrc: img.currentSrc || img.src
                });
            }
            // 2. SVG images and CSS background-image
            const allElements = Array.from(document.querySelectorAll('*'));
            for (const el of allElements) {
                const bg = window.getComputedStyle(el).backgroundImage;
                if (bg && bg !== 'none' && bg.startsWith('url(')) {
                    const match = bg.match(/url\(['"]?(.*?)['"]?\)/);
                    if (match && match[1] && !match[1].startsWith('data:')) {
                        const rect = el.getBoundingClientRect();
                        if (el.tagName.toLowerCase() !== 'img') {
                            results.push({
                                url: match[1],
                                elementTag: `${el.tagName.toLowerCase()}[bg]`,
                                renderedWidth: Math.round(rect.width),
                                renderedHeight: Math.round(rect.height),
                                naturalWidth: rect.width > 0 ? 1 : 0,
                                naturalHeight: rect.height > 0 ? 1 : 0,
                                hasAlt: true,
                                altText: '',
                                isLazy: false,
                                complete: true,
                                currentSrc: match[1]
                            });
                        }
                    }
                }
            }
            return results;
        });
        const seen = new Set();
        const uniqueRaw = [];
        for (const raw of rawImages) {
            let resolvedUrl = raw.url;
            if (resolvedUrl.startsWith('//')) {
                resolvedUrl = `https:${resolvedUrl}`;
            }
            else if (resolvedUrl.startsWith('/')) {
                try {
                    resolvedUrl = new URL(resolvedUrl, pageBaseUrl).href;
                }
                catch { }
            }
            const key = `${resolvedUrl}-${raw.elementTag}`;
            if (seen.has(key))
                continue;
            seen.add(key);
            uniqueRaw.push({
                ...raw,
                url: resolvedUrl
            });
        }
        // Verify un-requested / lazy loaded images that weren't captured by Playwright's network listener
        const limit = pLimit(10);
        const issues = await Promise.all(uniqueRaw.map((raw) => limit(async () => {
            let netInfo = this.networkImageStatuses.get(raw.url) || this.networkImageStatuses.get(raw.url.split('?')[0]);
            let status = netInfo ? netInfo.status : null;
            let statusText = netInfo ? netInfo.statusText : (status ? `HTTP ${status}` : 'Unknown');
            // If status was not seen in browser network traffic (e.g. un-triggered lazy load or offscreen carousel)
            if (status === null && (raw.url.startsWith('http://') || raw.url.startsWith('https://'))) {
                try {
                    const res = await axios.head(raw.url, {
                        timeout: 8000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                        },
                        validateStatus: () => true
                    });
                    status = res.status;
                    statusText = `HTTP ${res.status}`;
                }
                catch {
                    try {
                        const res = await axios.get(raw.url, {
                            timeout: 8000,
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                                Range: 'bytes=0-1024'
                            },
                            validateStatus: () => true
                        });
                        status = res.status;
                        statusText = `HTTP ${res.status}`;
                    }
                    catch (fetchErr) {
                        status = 0;
                        statusText = fetchErr.code || 'NETWORK_ERROR';
                    }
                }
            }
            let isBroken = false;
            let errorCode;
            let reason;
            let suggestedFix;
            if (status !== null && (status >= 400 || status === 0)) {
                isBroken = true;
                errorCode = status === 0 ? 'IMG_FETCH_FAILED' : `HTTP_${status}`;
                reason = `Image file returned HTTP ${status} (${statusText}) from the asset server.`;
                suggestedFix = `Verify the image file path in your CMS / DAM repository, upload the missing asset, or update the <img src> attribute to a valid URL.`;
            }
            else if (raw.complete &&
                raw.naturalWidth === 0 &&
                raw.naturalHeight === 0 &&
                raw.elementTag === 'img' &&
                !raw.isLazy &&
                raw.renderedWidth > 0 &&
                raw.renderedHeight > 0) {
                // Only flag corrupt if it was an active on-screen rendered image that failed decode
                isBroken = true;
                errorCode = 'IMG_CORRUPT_OR_ZERO_DIM';
                reason = 'Image element rendered on page with 0x0 natural dimensions (corrupted asset or invalid image header).';
                suggestedFix = `Re-export or re-upload a valid image file (.png, .webp, .jpg, .svg) and check for format corruption.`;
            }
            else if (!raw.hasAlt && raw.elementTag === 'img') {
                errorCode = 'WCAG_ALT_MISSING';
                reason = 'Image tag is missing an alt attribute, violating WCAG 2.1 accessibility standards.';
                suggestedFix = `Add a descriptive alt="<image description>" attribute to the <img> element or alt="" if the image is purely decorative.`;
            }
            return {
                url: raw.url,
                elementTag: raw.elementTag,
                renderedWidth: raw.renderedWidth,
                renderedHeight: raw.renderedHeight,
                naturalWidth: raw.naturalWidth,
                naturalHeight: raw.naturalHeight,
                hasAlt: raw.hasAlt,
                altText: raw.altText,
                status,
                statusText: statusText || (status ? `HTTP ${status}` : 'Unknown'),
                isBroken,
                errorCode,
                reason,
                suggestedFix,
                isLazy: raw.isLazy
            };
        })));
        return issues;
    }
}
