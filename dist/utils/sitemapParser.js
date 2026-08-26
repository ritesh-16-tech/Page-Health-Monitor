import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
export class SitemapParser {
    parser;
    constructor() {
        this.parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_'
        });
    }
    static isSitemapUrl(url) {
        const lower = url.toLowerCase();
        return lower.endsWith('.xml') || lower.includes('sitemap');
    }
    async discoverSitemaps(baseUrl) {
        const urlObj = new URL(baseUrl);
        const domainOrigin = urlObj.origin;
        const commonCandidates = [
            baseUrl.endsWith('.xml') ? baseUrl : null,
            `${domainOrigin}/sitemap.xml`,
            `${domainOrigin}/sitemap_index.xml`,
            `${domainOrigin}/sitemap/sitemap.xml`
        ].filter(Boolean);
        // 1. Try checking robots.txt for Sitemap directives
        try {
            const robotsUrl = `${domainOrigin}/robots.txt`;
            const res = await axios.get(robotsUrl, {
                timeout: 8000,
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
            });
            const lines = res.data.split('\n');
            for (const line of lines) {
                const match = line.match(/^Sitemap:\s*(https?:\/\/[^\s]+)/i);
                if (match && match[1]) {
                    commonCandidates.unshift(match[1].trim());
                }
            }
        }
        catch {
            // Ignore robots.txt failure
        }
        // Deduplicate
        const uniqueCandidates = Array.from(new Set(commonCandidates));
        const validSitemaps = [];
        for (const candidate of uniqueCandidates) {
            try {
                const res = await axios.head(candidate, {
                    timeout: 8000,
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                    validateStatus: (s) => s >= 200 && s < 400
                });
                if (res.status === 200) {
                    validSitemaps.push(candidate);
                }
            }
            catch {
                // Continue checking other candidates
            }
        }
        return validSitemaps;
    }
    async parseSitemap(sitemapUrl, maxDepth = 2) {
        const urls = new Set();
        await this.fetchAndExtract(sitemapUrl, urls, 0, maxDepth);
        return Array.from(urls);
    }
    async fetchAndExtract(currentUrl, collectedUrls, currentDepth, maxDepth) {
        if (currentDepth > maxDepth)
            return;
        try {
            const response = await axios.get(currentUrl, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/xml,text/xml,*/*'
                }
            });
            const parsed = this.parser.parse(response.data);
            // Case 1: Sitemap Index (<sitemapindex><sitemap><loc>...</loc></sitemap></sitemapindex>)
            if (parsed.sitemapindex && parsed.sitemapindex.sitemap) {
                const sitemaps = Array.isArray(parsed.sitemapindex.sitemap)
                    ? parsed.sitemapindex.sitemap
                    : [parsed.sitemapindex.sitemap];
                for (const s of sitemaps) {
                    const loc = s.loc ? String(s.loc).trim() : '';
                    if (loc) {
                        await this.fetchAndExtract(loc, collectedUrls, currentDepth + 1, maxDepth);
                    }
                }
            }
            // Case 2: URL Set (<urlset><url><loc>...</loc></url></urlset>)
            if (parsed.urlset && parsed.urlset.url) {
                const urlEntries = Array.isArray(parsed.urlset.url)
                    ? parsed.urlset.url
                    : [parsed.urlset.url];
                for (const u of urlEntries) {
                    const loc = u.loc ? String(u.loc).trim() : '';
                    if (loc && (loc.startsWith('http://') || loc.startsWith('https://'))) {
                        collectedUrls.add(loc);
                    }
                }
            }
        }
        catch (err) {
            // Ignore single sub-sitemap network failure
        }
    }
}
