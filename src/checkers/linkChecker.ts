import { Page } from 'playwright';
import axios, { AxiosResponse } from 'axios';
import pLimit from 'p-limit';
import { LinkCheckResult, RedirectionHop } from '../types/audit.js';

export class LinkChecker {
  private concurrency: number;

  constructor(concurrency = 6) {
    this.concurrency = concurrency;
  }

  async extractLinks(page: Page, sourceUrl: string): Promise<{ url: string; anchorText: string }[]> {
    const rawLinks = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href]'));
      return anchors.map((a) => {
        const href = a.getAttribute('href') || '';
        const text = (a.textContent || '').trim().replace(/\s+/g, ' ');
        return {
          href,
          text: text.slice(0, 80)
        };
      });
    });

    const validLinks: { url: string; anchorText: string }[] = [];
    const seen = new Set<string>();

    for (const item of rawLinks) {
      const href = item.href.trim();
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        continue;
      }

      try {
        const resolved = new URL(href, sourceUrl).href;
        if (!seen.has(resolved)) {
          seen.add(resolved);
          validLinks.push({
            url: resolved,
            anchorText: item.text || '(No text / Image link)'
          });
        }
      } catch {
        // Invalid URL format
      }
    }

    return validLinks;
  }

  async checkSingleLink(linkUrl: string, anchorText: string, sourceUrl: string): Promise<LinkCheckResult> {
    const sourceParsed = new URL(sourceUrl);
    let targetParsed: URL;
    try {
      targetParsed = new URL(linkUrl);
    } catch {
      return {
        sourceUrl,
        targetUrl: linkUrl,
        anchorText,
        status: 0,
        statusText: 'Malformed URL',
        isBroken: true,
        isRedirected: false,
        redirectHops: [],
        finalUrl: linkUrl,
        isExternal: false,
        isSecure: false,
        errorCode: 'ERR_MALFORMED_URL',
        reason: `The link contains an invalid URL syntax: "${linkUrl}"`,
        suggestedFix: `Correct the href attribute format in your HTML anchor tag.`,
        errorMessage: 'Invalid URL format',
        durationMs: 0
      };
    }

    const isExternal = sourceParsed.hostname !== targetParsed.hostname;
    const isSecure = targetParsed.protocol === 'https:' || sourceParsed.protocol === 'http:';
    const redirectHops: RedirectionHop[] = [];
    const startTime = Date.now();

    try {
      let res: AxiosResponse | null = null;
      let finalUrl = linkUrl;

      try {
        res = await axios.get(linkUrl, {
          timeout: 10000,
          maxRedirects: 8,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
          },
          validateStatus: () => true,
          beforeRedirect: (options, responseDetails) => {
            redirectHops.push({
              url: responseDetails.headers.location || 'redirect',
              status: responseDetails.statusCode || 302
            });
          }
        });
      } catch (err: any) {
        const isTimeout = err.code === 'ECONNABORTED' || (err.message && err.message.includes('timeout'));
        const errCode = isTimeout ? 'TIMEOUT_EXCEEDED' : (err.code || 'HTTP_CONN_FAIL');
        const reason = isTimeout
          ? `Target server failed to respond within 10,000ms (Connection timed out).`
          : `Network connection failed: ${err.message}`;
        const suggestedFix = isTimeout
          ? `Verify if the destination server or regional portal is operational and accessible without geoblocking.`
          : `Check domain DNS settings, SSL certificates, and firewall rules on destination host.`;

        return {
          sourceUrl,
          targetUrl: linkUrl,
          anchorText,
          status: err.response?.status || 0,
          statusText: err.code || err.message || 'Network Failure',
          isBroken: true,
          isRedirected: redirectHops.length > 0,
          redirectHops,
          finalUrl: linkUrl,
          isExternal,
          isSecure,
          errorCode: errCode,
          reason,
          suggestedFix,
          errorMessage: err.message || 'Request Failed',
          durationMs: Date.now() - startTime
        };
      }

      if (!res) {
        return {
          sourceUrl,
          targetUrl: linkUrl,
          anchorText,
          status: 0,
          statusText: 'No Response',
          isBroken: true,
          isRedirected: redirectHops.length > 0,
          redirectHops,
          finalUrl: linkUrl,
          isExternal,
          isSecure,
          errorCode: 'NO_RESPONSE',
          reason: 'No response received from the target server.',
          suggestedFix: 'Verify the destination server health and availability.',
          errorMessage: 'No HTTP response received',
          durationMs: Date.now() - startTime
        };
      }

      if (res.request?.res?.responseUrl) {
        finalUrl = res.request.res.responseUrl;
      }

      const isRedirected = redirectHops.length > 0 || (finalUrl !== linkUrl && !linkUrl.endsWith('/') && finalUrl !== `${linkUrl}/`);
      const status = res.status;
      const isBroken = status >= 400;

      let errorCode: string | undefined;
      let reason: string | undefined;
      let suggestedFix: string | undefined;

      if (isBroken) {
        errorCode = `HTTP_${status}_LINK`;
        reason = `Link destination returned HTTP error status ${status} (${res.statusText || 'Error'}).`;
        if (status === 404) {
          suggestedFix = `Update the link URL to an active page, or implement a 301 redirect from the deleted URL to the new destination.`;
        } else if (status === 400) {
          suggestedFix = `Check URL query parameters or encoding characters. Ensure the destination endpoint supports direct web browser GET requests.`;
        } else {
          suggestedFix = `Verify destination server configuration and fix broken routing.`;
        }
      } else if (isRedirected) {
        errorCode = 'HTTP_301_302_REDIRECT';
        const hopSummary = redirectHops.map(h => `${h.status}`).join(' ➔ ') || 'Redirect';
        reason = `Link triggers ${hopSummary} redirection chain to "${finalUrl}".`;
        suggestedFix = `Update the href attribute directly to the final URL ("${finalUrl}") to eliminate unnecessary redirect round-trips and optimize SEO.`;
      }

      return {
        sourceUrl,
        targetUrl: linkUrl,
        anchorText,
        status,
        statusText: res.statusText || `HTTP ${status}`,
        isBroken,
        isRedirected,
        redirectHops,
        finalUrl,
        isExternal,
        isSecure,
        errorCode,
        reason,
        suggestedFix,
        errorMessage: isBroken ? `HTTP ${status} (${res.statusText || 'Error'})` : undefined,
        durationMs: Date.now() - startTime
      };
    } catch (error: any) {
      return {
        sourceUrl,
        targetUrl: linkUrl,
        anchorText,
        status: 0,
        statusText: error.message || 'Unknown Error',
        isBroken: true,
        isRedirected: redirectHops.length > 0,
        redirectHops,
        finalUrl: linkUrl,
        isExternal,
        isSecure,
        errorCode: 'UNEXPECTED_ERROR',
        reason: `Link verification encountered an unexpected error: ${error.message}`,
        suggestedFix: `Check URL validity and network accessibility.`,
        errorMessage: error.message,
        durationMs: Date.now() - startTime
      };
    }
  }

  async checkAllLinks(
    page: Page,
    sourceUrl: string,
    onProgress?: (checked: number, total: number, current: string) => void
  ): Promise<LinkCheckResult[]> {
    const rawLinks = await this.extractLinks(page, sourceUrl);
    const limit = pLimit(this.concurrency);
    let checkedCount = 0;
    const total = rawLinks.length;

    const tasks = rawLinks.map((link) =>
      limit(async () => {
        const res = await this.checkSingleLink(link.url, link.anchorText, sourceUrl);
        checkedCount++;
        if (onProgress) {
          onProgress(checkedCount, total, link.url);
        }
        return res;
      })
    );

    return Promise.all(tasks);
  }
}
