import { chromium } from 'playwright';
import { NetworkChecker } from './checkers/networkChecker.js';
import { ConsoleChecker } from './checkers/consoleChecker.js';
import { ApiChecker } from './checkers/apiChecker.js';
import { ImageChecker } from './checkers/imageChecker.js';
import { FontChecker } from './checkers/fontChecker.js';
import { LinkChecker } from './checkers/linkChecker.js';
import { StatusChecker } from './checkers/statusChecker.js';
import { SeoChecker } from './checkers/seoChecker.js';
import { SpeedChecker } from './checkers/speedChecker.js';
export class PageAuditor {
    options;
    constructor(options) {
        this.options = {
            timeout: 40000,
            headless: true,
            scroll: true,
            concurrency: 6,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            ...options
        };
    }
    async runAudit(onProgress) {
        const startTime = Date.now();
        const targetUrl = this.options.url;
        const focus = this.options.focus || 'all';
        const statusChecker = new StatusChecker(this.options.concurrency, this.options.timeout, this.options.userAgent);
        const seoChecker = new SeoChecker();
        const speedChecker = new SpeedChecker();
        const networkChecker = new NetworkChecker();
        const consoleChecker = new ConsoleChecker();
        const apiChecker = new ApiChecker();
        const imageChecker = new ImageChecker();
        const fontChecker = new FontChecker();
        const linkChecker = new LinkChecker(this.options.concurrency);
        // 1. If focus is 'status', we can run statusChecker directly or alongside browser
        let pageStatus;
        if (focus === 'all' || focus === 'status') {
            if (onProgress)
                onProgress('status', `Checking page HTTP status and redirect chain for ${targetUrl}...`);
            pageStatus = await statusChecker.checkSingleStatus(targetUrl);
        }
        let browser = null;
        let context = null;
        let page = null;
        try {
            if (onProgress)
                onProgress('launch', 'Launching browser engine...');
            browser = await chromium.launch({
                headless: this.options.headless !== false
            });
            context = await browser.newContext({
                viewport: { width: 1440, height: 900 },
                userAgent: this.options.userAgent,
                ignoreHTTPSErrors: true
            });
            page = await context.newPage();
            // Attach diagnostic listeners
            networkChecker.attach(page);
            consoleChecker.attach(page);
            apiChecker.attach(page);
            imageChecker.attach(page);
            fontChecker.attach(page);
            if (onProgress)
                onProgress('navigate', `Navigating to ${targetUrl}...`);
            let initialResponse;
            try {
                initialResponse = await page.goto(targetUrl, {
                    timeout: this.options.timeout,
                    waitUntil: 'domcontentloaded'
                });
            }
            catch (navErr) {
                initialResponse = await page.goto(targetUrl, {
                    timeout: this.options.timeout,
                    waitUntil: 'load'
                }).catch(() => null);
            }
            const httpStatus = initialResponse ? initialResponse.status() : (pageStatus ? pageStatus.httpStatus : 0);
            const finalPageUrl = page.url();
            const pageTitle = (await page.title().catch(() => '')) || (pageStatus?.pageTitle || '');
            await page.waitForTimeout(2000);
            // Auto scroll to trigger lazy loading if needed
            if (this.options.scroll) {
                if (onProgress)
                    onProgress('scroll', 'Auto-scrolling page to trigger lazy-loaded assets & dynamic APIs...');
                await this.autoScroll(page);
                await page.waitForTimeout(1500);
            }
            // 2. Check SEO Metadata
            let seoMetadata;
            if (focus === 'all' || focus === 'seo') {
                if (onProgress)
                    onProgress('seo', 'Inspecting SEO metadata, headings, Schema JSON-LD & social cards...');
                seoMetadata = await seoChecker.inspectPage(page);
            }
            // 3. Check Page Speed & Performance
            let pageSpeed;
            if (focus === 'all' || focus === 'speed') {
                if (onProgress)
                    onProgress('speed', 'Measuring Core Web Vitals, Navigation Timing & payload sizes...');
                pageSpeed = await speedChecker.inspectSpeed(page);
            }
            // 4. Check Images
            let images = [];
            if (focus === 'all' || focus === 'image') {
                if (onProgress)
                    onProgress('images', 'Analyzing DOM and network images...');
                images = await imageChecker.checkImages(page);
            }
            // 5. Check Fonts
            let fonts = [];
            if (focus === 'all') {
                if (onProgress)
                    onProgress('fonts', 'Inspecting WebFonts & font declarations...');
                fonts = await fontChecker.checkFonts(page);
            }
            // 6. Check Links
            let links = [];
            if (focus === 'all' || focus === 'link') {
                if (onProgress)
                    onProgress('links', 'Extracting and verifying hyperlinks & redirections...');
                links = await linkChecker.checkAllLinks(page, finalPageUrl, (checked, total, current) => {
                    if (onProgress)
                        onProgress('links_progress', `Checking links (${checked}/${total}): ${current.slice(0, 50)}...`);
                });
            }
            const allNetworkTraffic = networkChecker.getEntries();
            const allFailedNetwork = networkChecker.getFailedEntries();
            const apiCalls = apiChecker.getApiCalls();
            const consoleLogs = consoleChecker.getLogs();
            // Filter network traffic if focused
            let networkTraffic = allNetworkTraffic;
            let failedNetwork = allFailedNetwork;
            if (focus === 'image') {
                networkTraffic = allNetworkTraffic.filter((n) => n.resourceType === 'image');
                failedNetwork = allFailedNetwork.filter((n) => n.resourceType === 'image');
            }
            else if (focus === 'api') {
                networkTraffic = allNetworkTraffic.filter((n) => n.resourceType === 'fetch' || n.resourceType === 'xhr' || n.resourceType === 'other');
                failedNetwork = allFailedNetwork.filter((n) => n.resourceType === 'fetch' || n.resourceType === 'xhr' || n.resourceType === 'other');
            }
            // Aggregate Summary
            const brokenImages = images.filter((i) => i.isBroken).length;
            const missingAltImages = images.filter((i) => !i.hasAlt && i.elementTag === 'img').length;
            const brokenFonts = fonts.filter((f) => f.isBroken).length;
            const failedApis = apiCalls.filter((a) => a.isFailed).length;
            const brokenLinks = links.filter((l) => l.isBroken).length;
            const redirectedLinks = links.filter((l) => l.isRedirected).length;
            const externalLinks = links.filter((l) => l.isExternal).length;
            const consoleErrors = consoleChecker.getErrorCount();
            const consoleWarnings = consoleChecker.getWarningCount();
            const failedImages = networkTraffic.filter((n) => n.resourceType === 'image' && n.isFailed).length;
            const failedScripts = networkTraffic.filter((n) => n.resourceType === 'script' && n.isFailed).length;
            const networkApis = networkTraffic.filter((n) => n.resourceType === 'fetch' || n.resourceType === 'xhr').length;
            const failedNetworkApis = networkTraffic.filter((n) => (n.resourceType === 'fetch' || n.resourceType === 'xhr') && n.isFailed).length;
            let errorCount = 0;
            let warningCount = 0;
            if (focus === 'image') {
                errorCount = brokenImages + failedImages;
                warningCount = missingAltImages;
            }
            else if (focus === 'link') {
                errorCount = brokenLinks;
                warningCount = redirectedLinks;
            }
            else if (focus === 'api') {
                errorCount = failedApis + failedNetworkApis + (consoleErrors > 0 ? consoleErrors : 0);
                warningCount = consoleWarnings;
            }
            else if (focus === 'status') {
                errorCount = pageStatus?.is404 || (pageStatus && pageStatus.httpStatus >= 500) ? 1 : 0;
                warningCount = pageStatus?.isRedirect ? 1 : 0;
            }
            else if (focus === 'seo') {
                errorCount = (seoMetadata?.issues.length || 0);
                warningCount = 0;
            }
            else if (focus === 'speed') {
                errorCount = pageSpeed?.bottlenecks.filter((b) => b.severity === 'Critical').length || 0;
                warningCount = pageSpeed?.bottlenecks.filter((b) => b.severity === 'Warning').length || 0;
            }
            else {
                // 'all' includes ALL checks!
                const statusErr = pageStatus?.is404 || (pageStatus && pageStatus.httpStatus >= 500) ? 1 : 0;
                const seoErr = (seoMetadata?.issues.length || 0);
                const speedErr = pageSpeed?.bottlenecks.filter((b) => b.severity === 'Critical').length || 0;
                const speedWarn = pageSpeed?.bottlenecks.filter((b) => b.severity === 'Warning').length || 0;
                errorCount = brokenImages + brokenFonts + failedApis + brokenLinks + consoleErrors + failedNetwork.length + statusErr + seoErr + speedErr;
                warningCount = missingAltImages + redirectedLinks + consoleWarnings + (pageStatus?.isRedirect ? 1 : 0) + speedWarn;
            }
            const totalIssues = errorCount + warningCount;
            const summary = {
                totalIssues,
                errorCount,
                warningCount,
                network: {
                    total: networkTraffic.length,
                    failed: failedNetwork.length,
                    apis: networkApis,
                    failedApis: failedNetworkApis,
                    images: networkTraffic.filter((n) => n.resourceType === 'image').length,
                    failedImages,
                    scripts: networkTraffic.filter((n) => n.resourceType === 'script').length,
                    failedScripts
                },
                images: {
                    total: images.length,
                    broken: brokenImages,
                    missingAlt: missingAltImages
                },
                fonts: {
                    total: fonts.length,
                    broken: brokenFonts
                },
                apis: {
                    total: apiCalls.length,
                    failed: failedApis
                },
                links: {
                    total: links.length,
                    broken: brokenLinks,
                    redirected: redirectedLinks,
                    external: externalLinks
                },
                console: {
                    total: consoleLogs.length,
                    errors: consoleErrors,
                    warnings: consoleWarnings,
                    logs: consoleLogs.filter((l) => l.type === 'log' || l.type === 'info').length
                },
                status: pageStatus
                    ? {
                        httpStatus: pageStatus.httpStatus,
                        is404: pageStatus.is404,
                        isError: pageStatus.isError,
                        isRedirect: pageStatus.isRedirect,
                        responseTimeMs: pageStatus.responseTimeMs
                    }
                    : undefined,
                seo: seoMetadata
                    ? {
                        score: seoMetadata.score,
                        grade: seoMetadata.grade,
                        issuesCount: seoMetadata.issues.length,
                        hasTitle: seoMetadata.titleStatus !== 'missing',
                        hasDescription: seoMetadata.descriptionStatus !== 'missing',
                        hasH1: seoMetadata.headings.h1Status === 'optimal',
                        hasCanonical: seoMetadata.canonicalStatus === 'valid',
                        hasOg: seoMetadata.openGraph.hasOgImage
                    }
                    : undefined,
                speed: pageSpeed
                    ? {
                        score: pageSpeed.score,
                        rating: pageSpeed.rating,
                        loadCompleteMs: pageSpeed.metrics.loadCompleteMs,
                        ttfbMs: pageSpeed.metrics.ttfbMs,
                        fcpMs: pageSpeed.metrics.fcpMs,
                        totalTransferSizeKb: pageSpeed.resources.totalTransferSizeKb,
                        totalRequests: pageSpeed.resources.totalRequests
                    }
                    : undefined
            };
            // Compile Actionable Fixes list
            const actionableFixes = [];
            const seenFixes = new Set();
            // 1. Page Status Fixes
            if (pageStatus && (pageStatus.is404 || pageStatus.isError || pageStatus.isRedirect)) {
                actionableFixes.push({
                    category: 'Status',
                    severity: pageStatus.is404 || pageStatus.httpStatus >= 500 ? 'Critical' : 'Warning',
                    targetUrl: pageStatus.url,
                    errorCode: pageStatus.errorCode || `HTTP_${pageStatus.httpStatus}`,
                    reason: pageStatus.reason || `HTTP status ${pageStatus.httpStatus}`,
                    suggestedFix: pageStatus.suggestedFix || 'Review server routing and page availability.',
                    elementOrSource: `HTTP Response: ${pageStatus.httpStatus}`
                });
            }
            // 2. SEO Fixes
            if (seoMetadata && seoMetadata.issues.length > 0) {
                for (let idx = 0; idx < seoMetadata.issues.length; idx++) {
                    const issue = seoMetadata.issues[idx];
                    const rec = seoMetadata.recommendations[idx] || 'Follow SEO meta guidelines.';
                    actionableFixes.push({
                        category: 'SEO',
                        severity: issue.includes('Missing') ? 'Critical' : 'Warning',
                        targetUrl: finalPageUrl,
                        errorCode: 'SEO_ISSUE',
                        reason: issue,
                        suggestedFix: rec,
                        elementOrSource: 'HTML <head> / DOM Structure'
                    });
                }
            }
            // 3. Page Speed Bottlenecks
            if (pageSpeed && pageSpeed.bottlenecks.length > 0) {
                for (const b of pageSpeed.bottlenecks) {
                    actionableFixes.push({
                        category: 'Speed',
                        severity: b.severity,
                        targetUrl: finalPageUrl,
                        errorCode: 'PERF_BOTTLENECK',
                        reason: `${b.metric}: ${b.value}`,
                        suggestedFix: b.recommendation,
                        elementOrSource: 'Core Web Vitals / Asset Payload'
                    });
                }
            }
            // 4. Network failures
            if (focus === 'all' || focus === 'api' || focus === 'image') {
                for (const net of failedNetwork) {
                    const key = `net-${net.url}-${net.errorCode}`;
                    if (!seenFixes.has(key)) {
                        seenFixes.add(key);
                        actionableFixes.push({
                            category: net.resourceType === 'image' ? 'Image' : (net.resourceType === 'fetch' || net.resourceType === 'xhr' ? 'API' : 'Network'),
                            severity: 'Critical',
                            targetUrl: net.url,
                            errorCode: net.errorCode || 'NET_REQUEST_FAILED',
                            reason: net.reason || 'Network request failed',
                            suggestedFix: net.suggestedFix || 'Check server health and network routing.',
                            elementOrSource: `${net.method} ${net.resourceType.toUpperCase()}`
                        });
                    }
                }
            }
            // 5. Console & JS Errors
            if (focus === 'all' || focus === 'api') {
                for (const log of consoleLogs) {
                    if (log.type === 'error' || log.type === 'pageerror') {
                        const key = `console-${log.location || finalPageUrl}-${log.errorCode}`;
                        if (!seenFixes.has(key)) {
                            seenFixes.add(key);
                            actionableFixes.push({
                                category: 'Console',
                                severity: 'Critical',
                                targetUrl: log.location || finalPageUrl,
                                errorCode: log.errorCode || 'JS_RUNTIME_ERROR',
                                reason: log.reason || log.text,
                                suggestedFix: log.suggestedFix || 'Fix JavaScript runtime exception in code.',
                                elementOrSource: log.location
                            });
                        }
                    }
                }
            }
            // 6. Image fixes
            if (focus === 'all' || focus === 'image') {
                for (const img of images) {
                    if (img.isBroken) {
                        const key = `img-${img.url}`;
                        if (!seenFixes.has(key)) {
                            seenFixes.add(key);
                            actionableFixes.push({
                                category: 'Image',
                                severity: 'Critical',
                                targetUrl: img.url,
                                errorCode: img.errorCode || 'IMG_BROKEN',
                                reason: img.reason || 'Image failed to load or render',
                                suggestedFix: img.suggestedFix || 'Replace broken image source in HTML/CMS.',
                                elementOrSource: img.elementTag
                            });
                        }
                    }
                    else if (!img.hasAlt && img.elementTag === 'img') {
                        actionableFixes.push({
                            category: 'Image',
                            severity: 'Warning',
                            targetUrl: img.url,
                            errorCode: img.errorCode || 'WCAG_ALT_MISSING',
                            reason: img.reason || 'Missing alt attribute',
                            suggestedFix: img.suggestedFix || 'Add descriptive alt attribute to <img> tag.',
                            elementOrSource: '<img alt="..."> tag'
                        });
                    }
                }
            }
            // 7. Link fixes
            if (focus === 'all' || focus === 'link') {
                for (const link of links) {
                    if (link.isBroken) {
                        const key = `link-${link.targetUrl}`;
                        if (!seenFixes.has(key)) {
                            seenFixes.add(key);
                            actionableFixes.push({
                                category: 'Link',
                                severity: 'Critical',
                                targetUrl: link.targetUrl,
                                errorCode: link.errorCode || 'LINK_BROKEN',
                                reason: link.reason || link.errorMessage || 'Link returned error status or connection failure',
                                suggestedFix: link.suggestedFix || 'Update href to active destination or remove broken link.',
                                elementOrSource: `Anchor: "${link.anchorText}"`
                            });
                        }
                    }
                    else if (link.isRedirected) {
                        actionableFixes.push({
                            category: 'Link',
                            severity: 'Warning',
                            targetUrl: link.targetUrl,
                            errorCode: link.errorCode || 'LINK_REDIRECTED',
                            reason: link.reason || 'Link redirects to another destination',
                            suggestedFix: link.suggestedFix || `Update link href directly to "${link.finalUrl}".`,
                            elementOrSource: `Redirect -> ${link.finalUrl}`
                        });
                    }
                }
            }
            const durationMs = Date.now() - startTime;
            return {
                targetUrl,
                finalPageUrl,
                pageTitle,
                httpStatus,
                scanTimestamp: new Date().toISOString(),
                durationMs,
                focus,
                networkTraffic,
                images,
                fonts,
                apiCalls,
                links,
                consoleLogs,
                actionableFixes,
                pageStatus,
                seoMetadata,
                pageSpeed,
                summary
            };
        }
        finally {
            if (context)
                await context.close().catch(() => { });
            if (browser)
                await browser.close().catch(() => { });
        }
    }
    async autoScroll(page) {
        try {
            await page.evaluate(async () => {
                await new Promise((resolve) => {
                    let totalHeight = 0;
                    const distance = 350;
                    const timer = setInterval(() => {
                        const scrollHeight = document.body.scrollHeight;
                        window.scrollBy(0, distance);
                        totalHeight += distance;
                        if (totalHeight >= scrollHeight || totalHeight > 15000) {
                            clearInterval(timer);
                            window.scrollTo(0, 0);
                            resolve();
                        }
                    }, 150);
                });
            });
        }
        catch {
            // Ignore evaluation timeout
        }
    }
}
