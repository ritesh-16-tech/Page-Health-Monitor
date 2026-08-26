export class ApiChecker {
    apiCalls = new Map();
    finishedCalls = [];
    attach(page) {
        page.on('request', (request) => {
            const resourceType = request.resourceType();
            if (resourceType === 'fetch' || resourceType === 'xhr') {
                const id = `${request.method()}-${request.url()}-${Date.now()}`;
                this.apiCalls.set(id, {
                    url: request.url(),
                    method: request.method(),
                    resourceType,
                    startTime: Date.now(),
                    postData: request.postData() || undefined
                });
            }
        });
        page.on('response', async (response) => {
            const request = response.request();
            const resourceType = request.resourceType();
            if (resourceType === 'fetch' || resourceType === 'xhr') {
                const status = response.status();
                const statusText = response.statusText();
                const headers = response.headers();
                const isFailed = status >= 400 || status === 0;
                let errorMessage;
                let errorCode;
                let reason;
                let suggestedFix;
                if (isFailed) {
                    try {
                        const body = await response.text();
                        errorMessage = body.slice(0, 300);
                    }
                    catch {
                        errorMessage = statusText || `HTTP Error ${status}`;
                    }
                    errorCode = `API_HTTP_${status}`;
                    reason = `Dynamic ${request.method()} API request returned status code ${status} (${statusText}).`;
                    if (status === 404) {
                        suggestedFix = `Verify the API route path. Check if backend endpoint is deployed and matches frontend API service configuration.`;
                    }
                    else if (status === 401 || status === 403) {
                        suggestedFix = `Check authentication headers, API keys, bearer tokens, or CORS preflight credentials.`;
                    }
                    else if (status >= 500) {
                        suggestedFix = `Check backend server logs and database connections for unhandled server-side exceptions.`;
                    }
                    else {
                        suggestedFix = `Inspect request payload, query parameters, and API documentation for validation errors.`;
                    }
                }
                this.finishedCalls.push({
                    url: response.url(),
                    method: request.method(),
                    resourceType,
                    status,
                    statusText,
                    durationMs: 0,
                    isFailed,
                    errorCode,
                    reason,
                    suggestedFix,
                    errorMessage,
                    contentType: headers['content-type']
                });
            }
        });
        page.on('requestfailed', (request) => {
            const resourceType = request.resourceType();
            if (resourceType === 'fetch' || resourceType === 'xhr') {
                const failure = request.failure();
                const errorText = failure ? failure.errorText : 'Network request failed';
                let errorCode = 'NET_REQUEST_FAILED';
                let reason = `API request failed with network error: ${errorText}`;
                let suggestedFix = 'Check network connectivity, CORS headers on target server, or SSL certificate validity.';
                if (errorText.includes('ERR_ABORTED')) {
                    errorCode = 'NET_ERR_ABORTED';
                    reason = 'Network request was aborted before completion (common for cancelled analytics/beacons or navigation interrupts).';
                    suggestedFix = 'If this is a beacon or telemetry call, verify navigator.sendBeacon usage or ensure lifecycle hooks complete before page unloads.';
                }
                else if (errorText.includes('ERR_NAME_NOT_RESOLVED')) {
                    errorCode = 'DNS_NOT_RESOLVED';
                    reason = 'Domain name could not be resolved (DNS failure).';
                    suggestedFix = 'Verify the domain name spelling and ensure DNS records are active.';
                }
                this.finishedCalls.push({
                    url: request.url(),
                    method: request.method(),
                    resourceType,
                    status: 0,
                    statusText: 'Failed',
                    durationMs: 0,
                    isFailed: true,
                    errorCode,
                    reason,
                    suggestedFix,
                    errorMessage: errorText
                });
            }
        });
    }
    getApiCalls() {
        return [...this.finishedCalls];
    }
    getFailedCount() {
        return this.finishedCalls.filter(c => c.isFailed).length;
    }
}
