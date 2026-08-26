export class ConsoleChecker {
    logs = [];
    attach(page) {
        page.on('console', (msg) => {
            const type = msg.type();
            const text = msg.text();
            const location = msg.location();
            const locStr = location.url ? `${location.url}:${location.lineNumber}:${location.columnNumber}` : undefined;
            if (type === 'error') {
                let errorCode = 'JS_CONSOLE_ERROR';
                let reason = text;
                let suggestedFix = 'Inspect the reported file and line number in frontend source code to resolve the runtime exception.';
                if (text.includes('SyntaxError') && text.includes('JSON')) {
                    errorCode = 'JSON_PARSE_SYNTAX_ERROR';
                    reason = 'Client attempted to parse an invalid JSON string (e.g. backend returned HTML error page or empty string).';
                    suggestedFix = 'Ensure the endpoint returns valid JSON with header "Content-Type: application/json", and wrap JSON.parse in a try-catch block with a fallback.';
                }
                else if (text.includes('CORS') || text.includes('Access-Control-Allow-Origin')) {
                    errorCode = 'CORS_POLICY_VIOLATION';
                    reason = 'Cross-Origin Resource Sharing (CORS) restriction blocked client-side request.';
                    suggestedFix = 'Configure Access-Control-Allow-Origin headers on the target server to allow requests from this origin.';
                }
                else if (text.includes('TypeError') || text.includes('Cannot read properties of undefined') || text.includes('null')) {
                    errorCode = 'NULL_POINTER_TYPE_ERROR';
                    reason = 'JavaScript attempted to access a property or method on null/undefined.';
                    suggestedFix = 'Use optional chaining (e.g. object?.property) or add null/undefined guard checks before accessing properties.';
                }
                else if (text.includes('net::ERR_NAME_NOT_RESOLVED')) {
                    errorCode = 'DNS_NAME_NOT_RESOLVED';
                    reason = 'Browser failed to resolve DNS hostname for resource.';
                    suggestedFix = 'Verify DNS records and ensure the target service domain is active.';
                }
                else if (text.includes('Failed to load resource')) {
                    errorCode = 'RESOURCE_LOAD_FAIL';
                    reason = text;
                    suggestedFix = 'Verify asset URL path, hosting status, and CORS permissions.';
                }
                this.logs.push({
                    type: 'error',
                    text,
                    location: locStr,
                    errorCode,
                    reason,
                    suggestedFix,
                    timestamp: new Date().toISOString()
                });
            }
            else if (type === 'warning') {
                let errorCode = 'CONSOLE_WARN';
                let suggestedFix = 'Review browser warning to ensure compatibility and deprecation standards.';
                if (text.includes('sandbox')) {
                    errorCode = 'IFRAME_SANDBOX_WARN';
                    suggestedFix = 'Ensure iframe sandbox attributes do not combine allow-scripts with allow-same-origin insecurely.';
                }
                this.logs.push({
                    type: 'warning',
                    text,
                    location: locStr,
                    errorCode,
                    reason: text,
                    suggestedFix,
                    timestamp: new Date().toISOString()
                });
            }
            else if (type === 'info' || type === 'log') {
                this.logs.push({
                    type: type === 'info' ? 'info' : 'log',
                    text,
                    location: locStr,
                    timestamp: new Date().toISOString()
                });
            }
        });
        page.on('pageerror', (err) => {
            let errorCode = 'UNCAUGHT_JS_EXCEPTION';
            let reason = `${err.name}: ${err.message}`;
            let suggestedFix = 'Add global error boundaries or try-catch handlers to catch uncaught runtime exceptions.';
            if (err.name === 'SyntaxError') {
                errorCode = 'JS_SYNTAX_ERROR';
                suggestedFix = 'Check for JavaScript syntax errors in bundles or dynamic eval() invocations.';
            }
            else if (err.name === 'TypeError') {
                errorCode = 'TYPE_ERROR';
                suggestedFix = 'Verify variable types and guard against undefined values.';
            }
            this.logs.push({
                type: 'pageerror',
                text: `${err.name}: ${err.message}`,
                stack: err.stack,
                location: this.extractLocationFromStack(err.stack),
                errorCode,
                reason,
                suggestedFix,
                timestamp: new Date().toISOString()
            });
        });
    }
    getLogs() {
        return [...this.logs];
    }
    getErrorCount() {
        return this.logs.filter((l) => l.type === 'error' || l.type === 'pageerror').length;
    }
    getWarningCount() {
        return this.logs.filter((l) => l.type === 'warning').length;
    }
    extractLocationFromStack(stack) {
        if (!stack)
            return undefined;
        const match = stack.match(/https?:\/\/[^\s)]+/);
        return match ? match[0] : undefined;
    }
}
