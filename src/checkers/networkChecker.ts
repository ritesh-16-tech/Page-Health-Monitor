import { Page, Request, Response } from 'playwright';
import { NetworkEntry } from '../types/audit.js';

export class NetworkChecker {
  private inFlightRequests: Map<string, { startTime: number; request: Request }> = new Map();
  private entries: NetworkEntry[] = [];

  attach(page: Page) {
    page.on('request', (request: Request) => {
      const id = `${request.method()}-${request.url()}-${Date.now()}-${Math.random()}`;
      this.inFlightRequests.set(request.url(), {
        startTime: Date.now(),
        request
      });
    });

    page.on('response', async (response: Response) => {
      const request = response.request();
      const url = response.url();
      const method = request.method();
      const resourceType = this.normalizeResourceType(request.resourceType());
      const status = response.status();
      const statusText = response.statusText();
      const headers = response.headers();
      const contentType = headers['content-type'] || '';

      const tracker = this.inFlightRequests.get(url);
      const durationMs = tracker ? Date.now() - tracker.startTime : 0;

      const isFailed = status >= 400 || status === 0;
      let errorCode: string | undefined;
      let reason: string | undefined;
      let suggestedFix: string | undefined;
      let responseSnippet: string | undefined;

      if (isFailed) {
        errorCode = `HTTP_${status}_${resourceType.toUpperCase()}`;
        reason = `${resourceType.toUpperCase()} request failed with HTTP status ${status} (${statusText || 'Error'}).`;

        if (status === 404) {
          suggestedFix = `Resource not found on server. Verify path in CMS / build assets or configure redirect.`;
        } else if (status === 403 || status === 401) {
          suggestedFix = `Access denied. Check API credentials, CORS preflight headers, or token expiration.`;
        } else if (status >= 500) {
          suggestedFix = `Server error. Check backend application logs, database connectivity, and microservices.`;
        } else if (status === 429) {
          suggestedFix = `Rate limit exceeded. Adjust request frequency or increase API rate limits on server.`;
        }

        try {
          const body = await response.text();
          responseSnippet = body.slice(0, 250);
        } catch {
          responseSnippet = statusText;
        }
      }

      this.entries.push({
        id: `${method}-${url}-${Date.now()}`,
        url,
        method,
        resourceType,
        status,
        statusText: statusText || `HTTP ${status}`,
        durationMs,
        isFailed,
        errorCode,
        reason,
        suggestedFix,
        contentType,
        postData: request.postData() || undefined,
        responseSnippet,
        timestamp: new Date().toISOString()
      });
    });

    page.on('requestfailed', (request: Request) => {
      const url = request.url();
      const method = request.method();
      const resourceType = this.normalizeResourceType(request.resourceType());
      const failure = request.failure();
      const failureText = failure ? failure.errorText : 'Network failure';

      const tracker = this.inFlightRequests.get(url);
      const durationMs = tracker ? Date.now() - tracker.startTime : 0;

      let errorCode = `NET_ERR_${resourceType.toUpperCase()}`;
      let reason = `Network request failed: ${failureText}`;
      let suggestedFix = `Verify server connectivity and host resolution.`;

      if (failureText.includes('ERR_NAME_NOT_RESOLVED')) {
        errorCode = 'DNS_NAME_NOT_RESOLVED';
        reason = `DNS lookup failed for domain (${url}). Hostname does not exist or DNS record is missing.`;
        suggestedFix = `Check domain spelling and ensure DNS A/CNAME records are correctly configured on DNS provider.`;
      } else if (failureText.includes('ERR_CONNECTION_REFUSED')) {
        errorCode = 'CONNECTION_REFUSED';
        reason = `Target host refused TCP connection. Port may be closed or server process is down.`;
        suggestedFix = `Verify backend service is running and firewall allows inbound connections on target port.`;
      } else if (failureText.includes('ERR_ABORTED')) {
        errorCode = 'NET_ERR_ABORTED';
        reason = `Request was aborted before completion (common for beacon/telemetry calls or cancelled navigation).`;
        suggestedFix = `If this is analytics/tracking, use navigator.sendBeacon() or ensure hooks finish before page unload.`;
      } else if (failureText.includes('ERR_SSL') || failureText.includes('CERT')) {
        errorCode = 'SSL_CERTIFICATE_ERROR';
        reason = `SSL / TLS handshake failed due to an invalid or expired certificate.`;
        suggestedFix = `Renew or properly configure the SSL certificate for domain.`;
      }

      this.entries.push({
        id: `${method}-${url}-${Date.now()}`,
        url,
        method,
        resourceType,
        status: 0,
        statusText: 'Failed',
        durationMs,
        isFailed: true,
        errorCode,
        reason,
        suggestedFix,
        errorMessage: failureText,
        postData: request.postData() || undefined,
        timestamp: new Date().toISOString()
      });
    });
  }

  getEntries(): NetworkEntry[] {
    return [...this.entries];
  }

  getFailedEntries(): NetworkEntry[] {
    return this.entries.filter((e) => e.isFailed);
  }

  private normalizeResourceType(rawType: string): NetworkEntry['resourceType'] {
    const type = rawType.toLowerCase();
    if (type === 'fetch' || type === 'xhr') return type as 'fetch' | 'xhr';
    if (type === 'image' || type === 'images') return 'image';
    if (type === 'script') return 'script';
    if (type === 'stylesheet' || type === 'css') return 'stylesheet';
    if (type === 'font') return 'font';
    if (type === 'document') return 'document';
    if (type === 'media') return 'media';
    return 'other';
  }
}
