export class FontChecker {
    networkFontStatuses = new Map();
    attach(page) {
        page.on('response', (response) => {
            const resourceType = response.request().resourceType();
            const url = response.url();
            const isFontUrl = /\.(woff2?|ttf|otf|eot)(\?.*)?$/i.test(url) || resourceType === 'font';
            if (isFontUrl) {
                this.networkFontStatuses.set(url, {
                    status: response.status(),
                    statusText: response.statusText()
                });
            }
        });
    }
    async checkFonts(page) {
        const fontFaces = await page.evaluate(async () => {
            const results = [];
            try {
                await document.fonts.ready;
                document.fonts.forEach((fontFace) => {
                    results.push({
                        family: fontFace.family,
                        status: fontFace.status,
                        loaded: fontFace.status === 'loaded'
                    });
                });
            }
            catch (e) {
                // Fallback
            }
            return results;
        });
        const issues = [];
        const seen = new Set();
        // 1. Network fonts
        for (const [url, netInfo] of this.networkFontStatuses.entries()) {
            seen.add(url);
            const isBroken = netInfo.status >= 400 || netInfo.status === 0;
            let errorCode;
            let reason;
            let suggestedFix;
            if (isBroken) {
                errorCode = `FONT_HTTP_${netInfo.status || 'FAIL'}`;
                reason = `WebFont resource returned HTTP ${netInfo.status} (${netInfo.statusText}).`;
                suggestedFix = `Ensure the font file (.woff2/.woff) is published to the web server or CDN and CORS header 'Access-Control-Allow-Origin: *' is configured.`;
            }
            const urlObj = new URL(url);
            const familyName = urlObj.pathname.split('/').pop() || 'WebFont';
            issues.push({
                family: familyName,
                url,
                status: netInfo.status,
                statusText: netInfo.statusText,
                isLoaded: !isBroken,
                isBroken,
                errorCode,
                reason,
                suggestedFix
            });
        }
        // 2. document.fonts failures
        for (const face of fontFaces) {
            if (face.status === 'error') {
                issues.push({
                    family: face.family,
                    url: 'document.fonts',
                    status: 0,
                    statusText: 'FontFace Error',
                    isLoaded: false,
                    isBroken: true,
                    errorCode: 'CSS_FONT_FACE_ERROR',
                    reason: `CSS FontFace '${face.family}' failed during browser font parsing or network fetch.`,
                    suggestedFix: `Check @font-face declaration in CSS stylesheets for invalid src url() or format() declarations.`
                });
            }
        }
        return issues;
    }
}
