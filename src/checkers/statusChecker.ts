import axios, { AxiosResponse } from 'axios';
import pLimit from 'p-limit';
import { PageStatusResult, RedirectionHop } from '../types/audit.js';

export class StatusChecker {
  private concurrency: number;
  private timeoutMs: number;
  private userAgent: string;

  constructor(concurrency = 6, timeoutMs = 15000, userAgent?: string) {
    this.concurrency = concurrency;
    this.timeoutMs = timeoutMs;
    this.userAgent =
      userAgent ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
  }

  async checkSingleStatus(url: string): Promise<PageStatusResult> {
    const redirectHops: RedirectionHop[] = [];
    const startTime = Date.now();

    try {
      new URL(url);
    } catch {
      return {
        url,
        finalUrl: url,
        httpStatus: 0,
        statusText: 'Malformed URL',
        is404: false,
        isError: true,
        isRedirect: false,
        redirectHops: [],
        responseTimeMs: 0,
        contentType: '',
        contentLength: 0,
        errorCode: 'ERR_MALFORMED_URL',
        reason: `Invalid URL format: "${url}"`,
        suggestedFix: 'Correct URL syntax with proper protocol (https://) and domain name.'
      };
    }

    try {
      let finalUrl = url;
      const response = await axios.get(url, {
        timeout: this.timeoutMs,
        maxRedirects: 10,
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        },
        validateStatus: () => true,
        beforeRedirect: (options, responseDetails) => {
          redirectHops.push({
            url: responseDetails.headers.location || 'redirect',
            status: responseDetails.statusCode || 302
          });
          if (responseDetails.headers.location) {
            try {
              finalUrl = new URL(responseDetails.headers.location, url).href;
            } catch {
              finalUrl = responseDetails.headers.location;
            }
          }
        }
      });

      const responseTimeMs = Date.now() - startTime;
      const httpStatus = response.status;
      const statusText = response.statusText || this.getDefaultStatusText(httpStatus);
      const is404 = httpStatus === 404;
      const isRedirect = redirectHops.length > 0 || (httpStatus >= 300 && httpStatus < 400);
      const isError = httpStatus >= 400 || httpStatus === 0;

      const headers = response.headers || {};
      const contentType = String(headers['content-type'] || '');
      const contentLength = parseInt(String(headers['content-length'] || '0'), 10) || (typeof response.data === 'string' ? response.data.length : 0);
      const server = String(headers['server'] || '');

      let pageTitle = '';
      if (typeof response.data === 'string' && contentType.includes('html')) {
        const match = response.data.match(/<title[^>]*>([^<]*)<\/title>/i);
        if (match && match[1]) {
          pageTitle = match[1].trim().replace(/\s+/g, ' ');
        }
      }

      let errorCode = is404 ? 'HTTP_404_NOT_FOUND' : isError ? `HTTP_${httpStatus}_ERROR` : isRedirect ? 'HTTP_REDIRECT' : undefined;
      let reason = undefined;
      let suggestedFix = undefined;

      if (is404) {
        reason = `Page returned 404 Not Found at ${url}`;
        suggestedFix = 'Verify if URL path was moved or deleted. Setup 301 permanent redirect if page was relocated, or update internal links.';
      } else if (httpStatus >= 500) {
        reason = `Server error ${httpStatus} (${statusText}) encountered at ${url}`;
        suggestedFix = 'Inspect web server application logs, backend error trace, API gateways, and database connection pools.';
      } else if (httpStatus === 403) {
        reason = `HTTP 403 Forbidden: Access denied to ${url}`;
        suggestedFix = 'Check web server ACLs, IP whitelist/firewall (WAF) rules, and directory permissions.';
      } else if (httpStatus === 401) {
        reason = `HTTP 401 Unauthorized: Authentication required for ${url}`;
        suggestedFix = 'Ensure valid authentication headers or cookies are supplied for protected endpoints.';
      } else if (isRedirect) {
        reason = `URL redirects across ${redirectHops.length} hop(s) to ${finalUrl}`;
        suggestedFix = `Update referencing links to point directly to final destination "${finalUrl}".`;
      }

      return {
        url,
        finalUrl,
        httpStatus,
        statusText,
        is404,
        isError,
        isRedirect,
        redirectHops,
        responseTimeMs,
        contentType,
        contentLength,
        pageTitle,
        server,
        errorCode,
        reason,
        suggestedFix
      };
    } catch (err: any) {
      const responseTimeMs = Date.now() - startTime;
      const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout');
      const errorCode = isTimeout ? 'ERR_CONNECTION_TIMED_OUT' : err.code || 'ERR_NETWORK_FAILURE';
      const reason = isTimeout ? `Connection timed out after ${this.timeoutMs}ms` : (err.message || 'Network request failed');

      return {
        url,
        finalUrl: url,
        httpStatus: 0,
        statusText: isTimeout ? 'Timed Out' : 'Network Error',
        is404: false,
        isError: true,
        isRedirect: false,
        redirectHops,
        responseTimeMs,
        contentType: '',
        contentLength: 0,
        errorCode,
        reason,
        suggestedFix: 'Check DNS configuration, host firewall, SSL certificates, and server responsiveness.'
      };
    }
  }

  async checkMultipleStatuses(
    urls: string[],
    onProgress?: (checked: number, total: number, currentUrl: string, status: PageStatusResult) => void
  ): Promise<PageStatusResult[]> {
    const limit = pLimit(this.concurrency);
    let checkedCount = 0;
    const total = urls.length;
    const results: PageStatusResult[] = [];

    const tasks = urls.map((url) =>
      limit(async () => {
        const result = await this.checkSingleStatus(url);
        checkedCount++;
        if (onProgress) {
          onProgress(checkedCount, total, url, result);
        }
        results.push(result);
        return result;
      })
    );

    await Promise.all(tasks);
    return results;
  }

  private getDefaultStatusText(status: number): string {
    const map: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      301: 'Moved Permanently',
      302: 'Found / Temporary Redirect',
      304: 'Not Modified',
      307: 'Temporary Redirect',
      308: 'Permanent Redirect',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      408: 'Request Timeout',
      410: 'Gone',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout'
    };
    return map[status] || 'HTTP ' + status;
  }
}
