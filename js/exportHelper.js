/**
 * Page Sentinel - Client-Side Report Export Helper
 * Generates Excel (.xlsx via SheetJS), CSV, JSON, and Self-Contained HTML reports.
 */

window.PageSentinelExport = {
  /**
   * Generates and downloads a multi-sheet formatted Excel workbook
   */
  downloadExcel(auditResult) {
    if (!window.XLSX) {
      alert('SheetJS (XLSX) library is loading. Please try again in a moment.');
      return;
    }

    const wb = XLSX.utils.book_new();
    const safeName = (auditResult.targetUrl || 'audit').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
    const dateStr = new Date().toISOString().slice(0, 10);

    // 1. SUMMARY SHEET
    const summaryData = [
      ['PAGE SENTINEL AUDIT REPORT', ''],
      ['Target URL', auditResult.targetUrl || ''],
      ['Audit Focus', auditResult.focus || 'all'],
      ['Generated On', new Date().toLocaleString()],
      ['Health Score', `${auditResult.summary?.healthScore || 85}/100`],
      ['Total Issues Found', auditResult.summary?.totalIssues || 0],
      ['Critical Errors', auditResult.summary?.errorCount || 0],
      ['Warnings', auditResult.summary?.warningCount || 0],
      ['Pages Audited', auditResult.summary?.pagesAudited || 1],
      ['', ''],
      ['CATEGORY BREAKDOWN', ''],
      ['Images (Broken / Missing Alt)', `${auditResult.summary?.images?.broken || 0} / ${auditResult.summary?.images?.missingAlt || 0}`],
      ['Links (Broken / Redirects)', `${auditResult.summary?.links?.broken || 0} / ${auditResult.summary?.links?.redirected || 0}`],
      ['Dynamic APIs (Failed)', `${auditResult.summary?.apis?.failed || 0} / ${auditResult.summary?.apis?.total || 0}`]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // 2. ACTIONABLE FIXES SHEET
    if (auditResult.actionableFixes && auditResult.actionableFixes.length > 0) {
      const fixesData = auditResult.actionableFixes.map(f => ({
        'Severity': f.severity,
        'Category': f.category,
        'Error Code': f.errorCode,
        'Target URL / Asset': f.targetUrl,
        'Reason / Diagnosis': f.reason,
        'Suggested Technical Fix': f.suggestedFix,
        'Code / Element Snippet': f.elementOrSource || ''
      }));
      const wsFixes = XLSX.utils.json_to_sheet(fixesData);
      XLSX.utils.book_append_sheet(wb, wsFixes, 'Actionable Fixes');
    }

    // 3. IMAGES SHEET
    if (auditResult.images && auditResult.images.length > 0) {
      const imagesData = auditResult.images.map(img => ({
        'Image URL': img.url,
        'Status Code': img.status || 'N/A',
        'Is Broken': img.isBroken ? 'YES' : 'NO',
        'Has Alt Text': img.hasAlt ? 'YES' : 'NO',
        'Alt Text': img.altText || '',
        'Rendered Dimensions': `${img.renderedWidth}x${img.renderedHeight}`,
        'Natural Dimensions': `${img.naturalWidth}x${img.naturalHeight}`,
        'Lazy Loaded': img.isLazy ? 'YES' : 'NO'
      }));
      const wsImages = XLSX.utils.json_to_sheet(imagesData);
      XLSX.utils.book_append_sheet(wb, wsImages, 'Images');
    }

    // 4. LINKS SHEET
    if (auditResult.links && auditResult.links.length > 0) {
      const linksData = auditResult.links.map(l => ({
        'Anchor Text': l.anchorText,
        'Target URL': l.targetUrl,
        'Status Code': l.status || 'N/A',
        'Is Broken': l.isBroken ? 'YES' : 'NO',
        'Is Redirected': l.isRedirected ? 'YES' : 'NO',
        'Final URL': l.finalUrl || l.targetUrl,
        'External Link': l.isExternal ? 'YES' : 'NO'
      }));
      const wsLinks = XLSX.utils.json_to_sheet(linksData);
      XLSX.utils.book_append_sheet(wb, wsLinks, 'Links');
    }

    // 5. 404 & PAGE STATUS SHEET
    if (auditResult.pageStatus && auditResult.pageStatus.length > 0) {
      const statusData = auditResult.pageStatus.map(p => ({
        'Original URL': p.url,
        'Final URL': p.finalUrl,
        'HTTP Status': p.httpStatus,
        'Status Text': p.statusText,
        'Is 404': p.is404 ? 'YES' : 'NO',
        'Is Redirect': p.isRedirect ? 'YES' : 'NO',
        'Response Time (ms)': p.responseTimeMs,
        'Content Type': p.contentType || ''
      }));
      const wsStatus = XLSX.utils.json_to_sheet(statusData);
      XLSX.utils.book_append_sheet(wb, wsStatus, 'Page Status');
    }

    // 6. NETWORK & APIS SHEET
    if (auditResult.networkTraffic && auditResult.networkTraffic.length > 0) {
      const networkData = auditResult.networkTraffic.map(n => ({
        'Method': n.method,
        'URL': n.url,
        'Type': n.resourceType,
        'Status': n.status,
        'Duration (ms)': n.durationMs,
        'Failed': n.isFailed ? 'YES' : 'NO',
        'Content Type': n.contentType || ''
      }));
      const wsNetwork = XLSX.utils.json_to_sheet(networkData);
      XLSX.utils.book_append_sheet(wb, wsNetwork, 'Network Traffic');
    }

    // Save File
    XLSX.writeFile(wb, `page_sentinel_audit_${safeName}_${dateStr}.xlsx`);
  },

  /**
   * Generates and downloads a unified CSV report
   */
  downloadCSV(auditResult) {
    const safeName = (auditResult.targetUrl || 'audit').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
    const dateStr = new Date().toISOString().slice(0, 10);

    const rows = [
      ['Category', 'Severity', 'Error Code', 'Target URL', 'Reason', 'Suggested Fix', 'Snippet']
    ];

    if (auditResult.actionableFixes && auditResult.actionableFixes.length > 0) {
      auditResult.actionableFixes.forEach(f => {
        rows.push([
          f.category,
          f.severity,
          f.errorCode,
          f.targetUrl,
          f.reason,
          f.suggestedFix,
          f.elementOrSource || ''
        ]);
      });
    } else {
      rows.push(['All', 'Info', 'NO_ISSUES', auditResult.targetUrl, 'No critical issues found.', 'N/A', 'N/A']);
    }

    const csvContent = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    this.downloadFile(`page_sentinel_report_${safeName}_${dateStr}.csv`, 'text/csv;charset=utf-8;', csvContent);
  },

  /**
   * Generates and downloads raw JSON audit file
   */
  downloadJSON(auditResult) {
    const safeName = (auditResult.targetUrl || 'audit').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
    const dateStr = new Date().toISOString().slice(0, 10);
    const jsonStr = JSON.stringify(auditResult, null, 2);
    this.downloadFile(`page_sentinel_audit_${safeName}_${dateStr}.json`, 'application/json;charset=utf-8;', jsonStr);
  },

  /**
   * Generates and downloads a self-contained offline HTML report
   */
  downloadHTMLReport(auditResult) {
    const safeName = (auditResult.targetUrl || 'audit').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
    const dateStr = new Date().toISOString().slice(0, 10);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Page Sentinel Audit Report - ${auditResult.targetUrl}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b0f19; color: #f8fafc; padding: 24px; }
    .header { border-bottom: 1px solid #232e48; padding-bottom: 16px; margin-bottom: 24px; }
    h1 { color: #ffffff; font-size: 24px; margin: 0 0 6px 0; }
    .meta { color: #94a3b8; font-size: 14px; }
    .metrics { display: flex; gap: 16px; margin-bottom: 24px; }
    .metric { background: #151c2c; border: 1px solid #232e48; border-radius: 8px; padding: 16px; flex: 1; text-align: center; }
    .metric-val { font-size: 28px; font-weight: 800; }
    .metric-label { font-size: 12px; color: #94a3b8; text-transform: uppercase; margin-top: 4px; }
    .critical { color: #ef4444; } .warning { color: #f59e0b; }
    .card { background: #151c2c; border: 1px solid #232e48; border-radius: 8px; padding: 18px; margin-bottom: 16px; }
    .fix-item { border-left: 3px solid #3b82f6; background: #111827; padding: 12px; margin-bottom: 10px; border-radius: 4px; }
    .fix-item.Critical { border-left-color: #ef4444; }
    .fix-item.Warning { border-left-color: #f59e0b; }
    .fix-title { font-weight: bold; margin-bottom: 4px; }
    .fix-code { font-family: monospace; font-size: 12px; color: #38bdf8; }
    .fix-sol { background: #070a11; padding: 8px; border-radius: 4px; font-family: monospace; font-size: 12px; color: #34d399; margin-top: 6px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🛡️ Page Sentinel Diagnostic Report</h1>
    <div class="meta">Target: <strong>${auditResult.targetUrl}</strong> | Generated: ${new Date().toLocaleString()} | Focus: ${auditResult.focus || 'all'}</div>
  </div>
  <div class="metrics">
    <div class="metric"><div class="metric-val">${auditResult.summary?.pagesAudited || 1}</div><div class="metric-label">Pages Audited</div></div>
    <div class="metric"><div class="metric-val critical">${auditResult.summary?.errorCount || 0}</div><div class="metric-label">Critical Issues</div></div>
    <div class="metric"><div class="metric-val warning">${auditResult.summary?.warningCount || 0}</div><div class="metric-label">Warnings</div></div>
    <div class="metric"><div class="metric-val">${auditResult.summary?.totalIssues || 0}</div><div class="metric-label">Total Issues</div></div>
  </div>
  <div class="card">
    <h2>🛠️ Actionable Recommendations</h2>
    ${(auditResult.actionableFixes || []).map(f => `
      <div class="fix-item ${f.severity}">
        <div class="fix-title">[${f.severity}] ${f.category}: ${f.reason}</div>
        <div class="fix-code">Error: ${f.errorCode} | Target: ${f.targetUrl}</div>
        <div class="fix-sol">💡 ${f.suggestedFix}</div>
      </div>
    `).join('')}
  </div>
</body>
</html>`;

    this.downloadFile(`page_sentinel_report_${safeName}_${dateStr}.html`, 'text/html;charset=utf-8;', html);
  },

  /**
   * Utility helper to trigger browser file download
   */
  downloadFile(filename, mimeType, content) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
