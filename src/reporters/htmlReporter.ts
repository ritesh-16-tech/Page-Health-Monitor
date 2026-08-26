import fs from 'fs/promises';
import path from 'path';
import { AuditResult } from '../types/audit.js';
import { getFunctionalReportDir } from '../utils/reportPathHelper.js';

export class HtmlReporter {
  static async generate(result: AuditResult, outputDir = './reports'): Promise<{ htmlPath: string; summaryHtmlPath: string }> {
    const targetDir = getFunctionalReportDir(outputDir, result.focus || 'all');
    await fs.mkdir(targetDir, { recursive: true });

    const safeUrl = result.targetUrl.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `audit_${safeUrl}_${timestamp}.html`;
    const summaryFileName = `audit_summary_${safeUrl}_${timestamp}.html`;
    const filePath = path.join(targetDir, fileName);
    const summaryFilePath = path.join(targetDir, summaryFileName);

    const htmlContent = this.renderHtml(result);
    const summaryHtmlContent = this.renderSummaryHtml(result);

    await fs.writeFile(filePath, htmlContent, 'utf-8');
    await fs.writeFile(summaryFilePath, summaryHtmlContent, 'utf-8');

    return {
      htmlPath: path.resolve(filePath),
      summaryHtmlPath: path.resolve(summaryFilePath)
    };
  }

  private static renderHtml(result: AuditResult): string {
    const { summary, actionableFixes, networkTraffic, consoleLogs, pageStatus, seoMetadata, pageSpeed } = result;

    const failedNetwork = networkTraffic.filter((n) => n.isFailed);
    const errorLogs = consoleLogs.filter((l) => l.type === 'error' || l.type === 'pageerror');

    const focus = result.focus || 'all';

    const focusBadgeLabels: Record<string, string> = {
      image: 'PAGE-HEALTH-MONITOR - IMAGE ASSET AUDIT',
      link: 'PAGE-HEALTH-MONITOR - HYPERLINK AUDIT',
      api: 'PAGE-HEALTH-MONITOR - NETWORK & API AUDIT',
      status: 'PAGE-HEALTH-MONITOR - 404 FINDER & PAGE STATUS',
      seo: 'PAGE-HEALTH-MONITOR - SEO METADATA & SOCIAL AUDIT',
      speed: 'PAGE-HEALTH-MONITOR - PAGE SPEED & WEB PERFORMANCE',
      all: 'PAGE-HEALTH-MONITOR - COMPREHENSIVE WEB HEALTH AUDIT'
    };

    let defaultTab = 'tab-fixes';
    if (focus === 'image') defaultTab = 'tab-images';
    else if (focus === 'link') defaultTab = 'tab-links';
    else if (focus === 'api') defaultTab = 'tab-network';
    else if (focus === 'status') defaultTab = 'tab-status';
    else if (focus === 'seo') defaultTab = 'tab-seo';
    else if (focus === 'speed') defaultTab = 'tab-speed';
    else if (actionableFixes.length === 0) defaultTab = 'tab-network';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Diagnostic Audit: ${this.escapeHtml(result.targetUrl)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-primary: #0b0f19;
      --bg-secondary: #111827;
      --bg-card: #1f2937;
      --bg-hover: #374151;
      --text-main: #f3f4f6;
      --text-muted: #9ca3af;
      --text-dim: #6b7280;
      --border: #374151;
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --success: #10b981;
      --success-bg: rgba(16, 185, 129, 0.12);
      --danger: #ef4444;
      --danger-bg: rgba(239, 68, 68, 0.15);
      --warning: #f59e0b;
      --warning-bg: rgba(245, 158, 11, 0.15);
      --info: #06b6d4;
      --info-bg: rgba(6, 182, 212, 0.12);
      --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background-color: var(--bg-primary);
      color: var(--text-main);
      font-family: var(--font-sans);
      line-height: 1.5;
      padding: 2rem 1.5rem;
    }

    .container { max-width: 1440px; margin: 0 auto; }

    /* Header */
    .header {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .badge-brand {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.75rem;
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.3);
      color: #60a5fa;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      margin-bottom: 0.75rem;
    }

    .page-title { font-size: 1.8rem; font-weight: 800; color: #fff; margin-bottom: 0.25rem; }
    .page-url { font-family: var(--font-mono); color: var(--text-muted); font-size: 0.9rem; word-break: break-all; }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      background: rgba(0, 0, 0, 0.25);
      padding: 1.25rem;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .meta-item { display: flex; flex-direction: column; gap: 0.25rem; }
    .meta-label { font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; font-weight: 600; }
    .meta-value { font-size: 0.95rem; font-weight: 600; color: var(--text-main); }

    /* Stat Cards */
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .stat-title { font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; }
    .stat-number { font-size: 1.8rem; font-weight: 800; font-family: var(--font-mono); margin: 0.5rem 0; }
    .stat-sub { font-size: 0.75rem; color: var(--text-dim); }

    .c-danger { color: var(--danger); }
    .c-warning { color: var(--warning); }
    .c-success { color: var(--success); }
    .c-info { color: var(--info); }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 0.5rem;
      border-bottom: 1px solid var(--border);
      margin-bottom: 1.5rem;
      overflow-x: auto;
    }

    .tab-btn {
      background: none;
      border: none;
      padding: 0.75rem 1.25rem;
      color: var(--text-muted);
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      white-space: nowrap;
    }

    .tab-btn:hover { color: var(--text-main); background: rgba(255,255,255,0.03); border-radius: 8px 8px 0 0; }
    .tab-btn.active { color: #60a5fa; border-bottom-color: #3b82f6; }

    .tab-count {
      background: var(--bg-hover);
      color: var(--text-main);
      padding: 0.15rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      font-family: var(--font-mono);
    }

    .tab-count.has-error { background: var(--danger); color: #fff; }

    .tab-pane { display: none; }
    .tab-pane.active { display: block; }

    /* Table Styles */
    .table-wrapper {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow-x: auto;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    }

    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85rem; }
    th {
      background: rgba(255,255,255,0.03);
      padding: 0.85rem 1rem;
      color: var(--text-dim);
      font-weight: 700;
      text-transform: uppercase;
      font-size: 0.7rem;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--border);
    }

    td { padding: 0.85rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(255,255,255,0.02); }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.2rem 0.6rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      font-family: var(--font-mono);
      white-space: nowrap;
    }

    .badge-success { background: var(--success-bg); color: var(--success); }
    .badge-danger { background: var(--danger-bg); color: var(--danger); }
    .badge-warning { background: var(--warning-bg); color: var(--warning); }
    .badge-info { background: var(--info-bg); color: var(--info); }

    .url-cell { font-family: var(--font-mono); word-break: break-all; max-width: 380px; }
    .url-link { color: #93c5fd; text-decoration: none; }
    .url-link:hover { text-decoration: underline; }

    .fix-box {
      background: rgba(16, 185, 129, 0.08);
      border-left: 3px solid var(--success);
      padding: 0.5rem 0.75rem;
      border-radius: 4px;
      margin-top: 0.35rem;
      font-size: 0.8rem;
      color: #a7f3d0;
    }

    .serp-box {
      background: #0f172a;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.25rem;
      font-family: Arial, sans-serif;
      margin-bottom: 1.5rem;
    }

    .speed-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .speed-box {
      background: #0f172a;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.25rem;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header class="header">
      <div class="header-top">
        <div>
          <span class="badge-brand">${focusBadgeLabels[focus] || 'PAGE-HEALTH-MONITOR AUDIT'}</span>
          <h1 class="page-title">${this.escapeHtml(result.pageTitle || 'Web Page Audit')}</h1>
          <div class="page-url">${this.escapeHtml(result.targetUrl)}</div>
        </div>
        <div>
          <span class="badge ${result.httpStatus === 200 ? 'badge-success' : 'badge-danger'}" style="font-size: 0.9rem; padding: 0.4rem 0.9rem;">
            HTTP ${result.httpStatus || 'N/A'}
          </span>
        </div>
      </div>
      <div class="meta-grid">
        <div class="meta-item">
          <div class="meta-label">Final Destination URL</div>
          <div class="meta-value" style="font-size: 0.75rem; word-break: break-all;">${this.escapeHtml(result.finalPageUrl)}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Scan Timestamp</div>
          <div class="meta-value">${result.scanTimestamp}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Execution Time</div>
          <div class="meta-value">${(result.durationMs / 1000).toFixed(2)}s</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Overall Health Status</div>
          <div class="meta-value" style="color: ${summary.errorCount === 0 ? 'var(--success)' : 'var(--danger)'}">
            ${summary.errorCount === 0 ? 'ALL SYSTEMS HEALTHY' : `${summary.errorCount} ERRORS FOUND`}
          </div>
        </div>
      </div>
    </header>

    <!-- Stat Cards Grid -->
    <div class="cards-grid">
      <div class="stat-card">
        <div class="stat-title">🌐 HTTP Status & Latency</div>
        <div class="stat-number ${result.httpStatus === 200 ? 'c-success' : 'c-danger'}">
          ${result.httpStatus || 'FAIL'}
        </div>
        <div class="stat-sub">${pageStatus ? `${pageStatus.responseTimeMs}ms response time` : `${(result.durationMs / 1000).toFixed(2)}s audit time`}</div>
      </div>
      <div class="stat-card">
        <div class="stat-title">🔍 SEO Health Score</div>
        <div class="stat-number ${seoMetadata && seoMetadata.score >= 80 ? 'c-success' : (seoMetadata && seoMetadata.score >= 60 ? 'c-warning' : 'c-danger')}">
          ${seoMetadata ? `${seoMetadata.score}%` : 'N/A'}
        </div>
        <div class="stat-sub">${seoMetadata ? `Grade: ${seoMetadata.grade} (${seoMetadata.issues.length} issues)` : 'Run SEO check'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-title">⚡ Page Speed Score</div>
        <div class="stat-number ${pageSpeed && pageSpeed.score >= 80 ? 'c-success' : (pageSpeed && pageSpeed.score >= 55 ? 'c-warning' : 'c-danger')}">
          ${pageSpeed ? `${pageSpeed.score}%` : 'N/A'}
        </div>
        <div class="stat-sub">${pageSpeed ? `Load: ${(pageSpeed.metrics.loadCompleteMs / 1000).toFixed(2)}s | TTFB: ${pageSpeed.metrics.ttfbMs}ms` : 'Run speed check'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-title">🖼️ Images & Links</div>
        <div class="stat-number ${(summary.images.broken + summary.links.broken) > 0 ? 'c-danger' : 'c-success'}">
          ${summary.images.broken + summary.links.broken} <span style="font-size: 1rem; color: var(--text-dim);">broken</span>
        </div>
        <div class="stat-sub">${summary.images.total} images, ${summary.links.total} hyperlinks</div>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="tabs">
      <button class="tab-btn ${defaultTab === 'tab-fixes' ? 'active' : ''}" onclick="switchTab('tab-fixes')">
        🛠️ Remediation Plan
        <span class="tab-count ${actionableFixes.length > 0 ? 'has-error' : ''}">${actionableFixes.length}</span>
      </button>
      <button class="tab-btn ${defaultTab === 'tab-status' ? 'active' : ''}" onclick="switchTab('tab-status')">
        🔍 404 & Status
        <span class="tab-count">${pageStatus ? `HTTP ${pageStatus.httpStatus}` : 'OK'}</span>
      </button>
      <button class="tab-btn ${defaultTab === 'tab-seo' ? 'active' : ''}" onclick="switchTab('tab-seo')">
        📈 SEO Metadata
        <span class="tab-count">${seoMetadata ? `${seoMetadata.score}%` : 'SEO'}</span>
      </button>
      <button class="tab-btn ${defaultTab === 'tab-speed' ? 'active' : ''}" onclick="switchTab('tab-speed')">
        ⚡ Page Speed
        <span class="tab-count">${pageSpeed ? `${pageSpeed.score}%` : 'Speed'}</span>
      </button>
      <button class="tab-btn ${defaultTab === 'tab-network' ? 'active' : ''}" onclick="switchTab('tab-network')">
        🌐 Network
        <span class="tab-count ${summary.network.failed > 0 ? 'has-error' : ''}">${networkTraffic.length}</span>
      </button>
      <button class="tab-btn ${defaultTab === 'tab-images' ? 'active' : ''}" onclick="switchTab('tab-images')">
        🖼️ Images
        <span class="tab-count ${summary.images.broken > 0 ? 'has-error' : ''}">${result.images.length}</span>
      </button>
      <button class="tab-btn ${defaultTab === 'tab-links' ? 'active' : ''}" onclick="switchTab('tab-links')">
        🔗 Links
        <span class="tab-count ${summary.links.broken > 0 ? 'has-error' : ''}">${result.links.length}</span>
      </button>
      <button class="tab-btn ${defaultTab === 'tab-console' ? 'active' : ''}" onclick="switchTab('tab-console')">
        🖥️ Console
        <span class="tab-count ${summary.console.errors > 0 ? 'has-error' : ''}">${consoleLogs.length}</span>
      </button>
    </div>

    <!-- TAB 1: ACTIONABLE FIXES -->
    <div id="tab-fixes" class="tab-pane ${defaultTab === 'tab-fixes' ? 'active' : ''}">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Severity</th>
              <th>Category</th>
              <th>Impacted Resource / Target</th>
              <th>Failure Reason / Code</th>
              <th>Suggested Fix Action</th>
            </tr>
          </thead>
          <tbody>
            ${
              actionableFixes.length === 0
                ? '<tr><td colspan="5" style="text-align:center; padding:2rem; color:#34d399;">✔ No issues detected on this page! Everything looks healthy.</td></tr>'
                : actionableFixes
                    .map(
                      (f) => `<tr>
              <td><span class="badge ${f.severity === 'Critical' ? 'badge-danger' : 'badge-warning'}">${f.severity}</span></td>
              <td><strong>${f.category}</strong></td>
              <td class="url-cell">${this.escapeHtml(f.targetUrl)}</td>
              <td>
                <div style="font-weight:700; color:#f87171;">${this.escapeHtml(f.errorCode)}</div>
                <div class="reason-text">${this.escapeHtml(f.reason)}</div>
              </td>
              <td><div class="fix-box">${this.escapeHtml(f.suggestedFix)}</div></td>
            </tr>`
                    )
                    .join('')
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 2: PAGE STATUS & 404 -->
    <div id="tab-status" class="tab-pane ${defaultTab === 'tab-status' ? 'active' : ''}">
      <div style="background:var(--bg-secondary); border:1px solid var(--border); border-radius:12px; padding:1.5rem; margin-bottom:1.5rem;">
        <h3 style="margin-bottom:1rem;">HTTP Response & Status Details</h3>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:1rem;">
          <div style="background:#0f172a; padding:1rem; border-radius:8px;">
            <div style="font-size:0.75rem; color:var(--text-dim);">HTTP STATUS</div>
            <div style="font-size:1.5rem; font-weight:800; color:${result.httpStatus === 200 ? 'var(--success)' : 'var(--danger)'};">${result.httpStatus || 'N/A'} ${pageStatus?.statusText || ''}</div>
          </div>
          <div style="background:#0f172a; padding:1rem; border-radius:8px;">
            <div style="font-size:0.75rem; color:var(--text-dim);">RESPONSE LATENCY</div>
            <div style="font-size:1.5rem; font-weight:800; color:#60a5fa;">${pageStatus?.responseTimeMs || result.durationMs} ms</div>
          </div>
          <div style="background:#0f172a; padding:1rem; border-radius:8px;">
            <div style="font-size:0.75rem; color:var(--text-dim);">CONTENT TYPE</div>
            <div style="font-size:1rem; font-weight:700;">${this.escapeHtml(pageStatus?.contentType || 'text/html')}</div>
          </div>
          <div style="background:#0f172a; padding:1rem; border-radius:8px;">
            <div style="font-size:0.75rem; color:var(--text-dim);">REDIRECT HOPS</div>
            <div style="font-size:1.5rem; font-weight:800; color:#f59e0b;">${pageStatus?.redirectHops.length || 0}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: SEO METADATA -->
    <div id="tab-seo" class="tab-pane ${defaultTab === 'tab-seo' ? 'active' : ''}">
      ${
        seoMetadata
          ? `
        <div class="serp-box">
          <div style="font-size:0.7rem; font-weight:700; color:#94a3b8; margin-bottom:4px;">GOOGLE SERP PREVIEW</div>
          <div style="color:#8ab4f8; font-size:1.15rem; margin-bottom:2px;">${this.escapeHtml(seoMetadata.title || 'No Title')}</div>
          <div style="color:#bdc1c6; font-size:0.8rem; margin-bottom:4px;">${this.escapeHtml(seoMetadata.url)}</div>
          <div style="color:#d1d5db; font-size:0.85rem;">${this.escapeHtml(seoMetadata.description || 'No description configured.')}</div>
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>SEO Element</th>
                <th>Current Value</th>
                <th>Status / Length</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Title Tag</strong></td>
                <td>${this.escapeHtml(seoMetadata.title || '(Missing)')}</td>
                <td><span class="badge ${seoMetadata.titleStatus === 'optimal' ? 'badge-success' : 'badge-warning'}">${seoMetadata.titleLength} chars (${seoMetadata.titleStatus})</span></td>
              </tr>
              <tr>
                <td><strong>Meta Description</strong></td>
                <td>${this.escapeHtml(seoMetadata.description || '(Missing)')}</td>
                <td><span class="badge ${seoMetadata.descriptionStatus === 'optimal' ? 'badge-success' : 'badge-warning'}">${seoMetadata.descriptionLength} chars (${seoMetadata.descriptionStatus})</span></td>
              </tr>
              <tr>
                <td><strong>H1 Headings</strong></td>
                <td>${this.escapeHtml(seoMetadata.headings.h1.join(', ') || '(Missing)')}</td>
                <td><span class="badge ${seoMetadata.headings.h1Status === 'optimal' ? 'badge-success' : 'badge-warning'}">${seoMetadata.headings.h1Count} tags</span></td>
              </tr>
              <tr>
                <td><strong>Canonical URL</strong></td>
                <td>${this.escapeHtml(seoMetadata.canonicalUrl || '(Missing)')}</td>
                <td><span class="badge ${seoMetadata.canonicalStatus === 'valid' ? 'badge-success' : 'badge-warning'}">${seoMetadata.canonicalStatus}</span></td>
              </tr>
              <tr>
                <td><strong>Robots Tag</strong></td>
                <td>${this.escapeHtml(seoMetadata.robots)}</td>
                <td><span class="badge ${seoMetadata.isIndexable ? 'badge-success' : 'badge-danger'}">${seoMetadata.isIndexable ? 'Indexable' : 'Noindex'}</span></td>
              </tr>
              <tr>
                <td><strong>OpenGraph Social Image</strong></td>
                <td>${this.escapeHtml(seoMetadata.openGraph.image || '(Missing)')}</td>
                <td><span class="badge ${seoMetadata.openGraph.hasOgImage ? 'badge-success' : 'badge-warning'}">${seoMetadata.openGraph.hasOgImage ? 'Configured' : 'Missing'}</span></td>
              </tr>
            </tbody>
          </table>
        </div>`
          : '<p style="color:var(--text-muted);">SEO metadata inspection was not enabled for this run.</p>'
      }
    </div>

    <!-- TAB 4: PAGE SPEED -->
    <div id="tab-speed" class="tab-pane ${defaultTab === 'tab-speed' ? 'active' : ''}">
      ${
        pageSpeed
          ? `
        <div class="speed-grid">
          <div class="speed-box">
            <div style="font-size:0.75rem; color:var(--text-dim);">TIME TO FIRST BYTE (TTFB)</div>
            <div style="font-size:1.6rem; font-weight:800; color:${pageSpeed.metrics.ttfbMs > 600 ? '#f87171' : '#34d399'};">${pageSpeed.metrics.ttfbMs} ms</div>
          </div>
          <div class="speed-box">
            <div style="font-size:0.75rem; color:var(--text-dim);">FIRST CONTENTFUL PAINT</div>
            <div style="font-size:1.6rem; font-weight:800; color:#fbbf24;">${(pageSpeed.metrics.fcpMs / 1000).toFixed(2)} s</div>
          </div>
          <div class="speed-box">
            <div style="font-size:0.75rem; color:var(--text-dim);">TOTAL LOAD TIME</div>
            <div style="font-size:1.6rem; font-weight:800; color:${pageSpeed.metrics.loadCompleteMs > 3500 ? '#f87171' : '#34d399'};">${(pageSpeed.metrics.loadCompleteMs / 1000).toFixed(2)} s</div>
          </div>
          <div class="speed-box">
            <div style="font-size:0.75rem; color:var(--text-dim);">TOTAL PAGE WEIGHT</div>
            <div style="font-size:1.6rem; font-weight:800; color:#a855f7;">${pageSpeed.resources.totalTransferSizeKb} KB</div>
          </div>
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Resource Type</th>
                <th>Request Count</th>
                <th>Transfer Size</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>JavaScript Files</strong></td><td>${pageSpeed.resources.jsCount}</td><td>${pageSpeed.resources.jsSizeKb} KB</td></tr>
              <tr><td><strong>Images</strong></td><td>${pageSpeed.resources.imageCount}</td><td>${pageSpeed.resources.imageSizeKb} KB</td></tr>
              <tr><td><strong>CSS Stylesheets</strong></td><td>${pageSpeed.resources.cssCount}</td><td>${pageSpeed.resources.cssSizeKb} KB</td></tr>
              <tr><td><strong>WebFonts</strong></td><td>${pageSpeed.resources.fontCount}</td><td>${pageSpeed.resources.fontSizeKb} KB</td></tr>
              <tr><td><strong>APIs / Dynamic Fetch</strong></td><td>${pageSpeed.resources.apiCount}</td><td>${pageSpeed.resources.apiSizeKb} KB</td></tr>
            </tbody>
          </table>
        </div>`
          : '<p style="color:var(--text-muted);">Page speed audit was not enabled for this run.</p>'
      }
    </div>

    <!-- TAB 5: NETWORK -->
    <div id="tab-network" class="tab-pane ${defaultTab === 'tab-network' ? 'active' : ''}">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Method</th>
              <th>Type</th>
              <th>URL</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            ${networkTraffic
              .map(
                (n) => `<tr>
              <td><span class="badge ${n.isFailed ? 'badge-danger' : 'badge-success'}">${n.status || 'FAIL'}</span></td>
              <td><strong>${n.method}</strong></td>
              <td>${n.resourceType}</td>
              <td class="url-cell"><a href="${this.escapeHtml(n.url)}" target="_blank" class="url-link">${this.escapeHtml(n.url)}</a></td>
              <td>${n.durationMs}ms</td>
            </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 6: IMAGES -->
    <div id="tab-images" class="tab-pane ${defaultTab === 'tab-images' ? 'active' : ''}">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Image URL</th>
              <th>Dimensions</th>
              <th>Alt Text</th>
            </tr>
          </thead>
          <tbody>
            ${result.images
              .map(
                (img) => `<tr>
              <td><span class="badge ${img.isBroken ? 'badge-danger' : 'badge-success'}">${img.isBroken ? 'BROKEN' : 'OK'}</span></td>
              <td class="url-cell"><a href="${this.escapeHtml(img.url)}" target="_blank" class="url-link">${this.escapeHtml(img.url)}</a></td>
              <td>${img.renderedWidth}x${img.renderedHeight} (Nat: ${img.naturalWidth}x${img.naturalHeight})</td>
              <td>${img.hasAlt ? this.escapeHtml(img.altText) : '<span style="color:#f87171;">MISSING ALT</span>'}</td>
            </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 7: LINKS -->
    <div id="tab-links" class="tab-pane ${defaultTab === 'tab-links' ? 'active' : ''}">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Anchor Text</th>
              <th>Destination URL</th>
              <th>Redirect Hops</th>
            </tr>
          </thead>
          <tbody>
            ${result.links
              .map(
                (l) => `<tr>
              <td><span class="badge ${l.isBroken ? 'badge-danger' : (l.isRedirected ? 'badge-warning' : 'badge-success')}">${l.status || 'FAIL'}</span></td>
              <td><strong>${this.escapeHtml(l.anchorText)}</strong></td>
              <td class="url-cell"><a href="${this.escapeHtml(l.targetUrl)}" target="_blank" class="url-link">${this.escapeHtml(l.targetUrl)}</a></td>
              <td>${l.redirectHops.length > 0 ? l.redirectHops.map(h => h.status).join(' &rarr; ') + ' &rarr; ' + this.escapeHtml(l.finalUrl) : 'Direct'}</td>
            </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 8: CONSOLE -->
    <div id="tab-console" class="tab-pane ${defaultTab === 'tab-console' ? 'active' : ''}">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Message / Reason</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            ${
              consoleLogs.length === 0
                ? '<tr><td colspan="3" style="text-align:center; padding:2rem; color:#34d399;">✔ Clean console log! No errors or warnings detected.</td></tr>'
                : consoleLogs
                    .map(
                      (l) => `<tr>
              <td><span class="badge ${l.type === 'error' || l.type === 'pageerror' ? 'badge-danger' : (l.type === 'warning' ? 'badge-warning' : 'badge-neutral')}">${l.type}</span></td>
              <td style="font-family:var(--font-mono); font-size:0.8rem; word-break:break-all;">${this.escapeHtml(l.text)}</td>
              <td style="font-size:0.75rem; color:var(--text-dim);">${this.escapeHtml(l.location || 'Inline')}</td>
            </tr>`
                    )
                    .join('')
            }
          </tbody>
        </table>
      </div>
    </div>

  </div>

  <script>
    function switchTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
      
      const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick').includes(tabId));
      if (activeBtn) activeBtn.classList.add('active');

      const activePane = document.getElementById(tabId);
      if (activePane) activePane.classList.add('active');
    }
  </script>
</body>
</html>`;
  }

  private static renderSummaryHtml(result: AuditResult): string {
    const { summary, actionableFixes, pageStatus, seoMetadata, pageSpeed, targetUrl } = result;
    const criticalCount = actionableFixes.filter((f) => f.severity === 'Critical').length;
    const warningCount = actionableFixes.filter((f) => f.severity === 'Warning').length;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Audit Executive Summary - ${this.escapeHtml(targetUrl)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0b0f19; --card: #111827; --card-border: #1f2937;
      --text: #f9fafb; --muted: #9ca3af; --primary: #3b82f6;
      --success: #10b981; --warning: #f59e0b; --danger: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
    body { background: var(--bg); color: var(--text); padding: 40px 20px; line-height: 1.6; }
    .container { max-width: 900px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 35px; }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; background: rgba(59,130,246,0.15); color: var(--primary); font-size: 13px; font-weight: 600; margin-bottom: 12px; }
    h1 { font-size: 28px; font-weight: 800; margin-bottom: 8px; }
    .url { color: var(--muted); font-family: 'JetBrains Mono', monospace; font-size: 14px; word-break: break-all; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 30px; }
    .kpi-card { background: var(--card); border: 1px solid var(--card-border); border-radius: 12px; padding: 20px; text-align: center; }
    .kpi-val { font-size: 32px; font-weight: 800; margin-bottom: 4px; }
    .kpi-label { font-size: 13px; color: var(--muted); text-transform: uppercase; font-weight: 600; }
    .table-box { background: var(--card); border: 1px solid var(--card-border); border-radius: 12px; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th, td { padding: 14px 18px; border-bottom: 1px solid var(--card-border); font-size: 14px; }
    th { background: #1f2937; color: var(--muted); font-weight: 600; font-size: 12px; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">EXECUTIVE SUMMARY REPORT</div>
      <h1>🛡️ Comprehensive Health Audit Summary</h1>
      <div class="url">${this.escapeHtml(targetUrl)}</div>
    </div>

    <div class="grid">
      <div class="kpi-card">
        <div class="kpi-val" style="color: ${criticalCount > 0 ? 'var(--danger)' : 'var(--success)'};">${criticalCount}</div>
        <div class="kpi-label">Critical Issues</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" style="color: ${warningCount > 0 ? 'var(--warning)' : 'var(--success)'};">${warningCount}</div>
        <div class="kpi-label">Warnings</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" style="color: var(--primary);">${summary.images.total}</div>
        <div class="kpi-label">Images Checked</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" style="color: var(--primary);">${summary.links.total}</div>
        <div class="kpi-label">Links Checked</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" style="color: ${seoMetadata ? (seoMetadata.score >= 80 ? 'var(--success)' : 'var(--warning)') : 'var(--muted)'};">${seoMetadata ? `${seoMetadata.score}%` : 'N/A'}</div>
        <div class="kpi-label">SEO Health</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" style="color: ${pageSpeed ? (pageSpeed.score >= 80 ? 'var(--success)' : 'var(--warning)') : 'var(--muted)'};">${pageSpeed ? `${pageSpeed.score}%` : 'N/A'}</div>
        <div class="kpi-label">Speed Score</div>
      </div>
    </div>

    <div class="table-box">
      <table>
        <thead>
          <tr>
            <th>Diagnostic Area</th>
            <th>Total Inspected</th>
            <th>Errors / Broken</th>
            <th>Warnings / Redirects</th>
            <th>Health Assessment</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>HTTP Status & 404</strong></td>
            <td>1 Page</td>
            <td>${pageStatus?.is404 ? '1 (404)' : (result.httpStatus >= 400 ? `1 (${result.httpStatus})` : '0')}</td>
            <td>${pageStatus?.isRedirect ? '1 (Redirect)' : '0'}</td>
            <td><span style="color: ${result.httpStatus === 200 ? 'var(--success)' : 'var(--danger)'};">${result.httpStatus === 200 ? '✔ 200 OK' : '✖ Issue'}</span></td>
          </tr>
          <tr>
            <td><strong>Image Assets</strong></td>
            <td>${summary.images.total} images</td>
            <td>${summary.images.broken} broken</td>
            <td>${summary.images.missingAlt} missing alt</td>
            <td><span style="color: ${summary.images.broken === 0 ? 'var(--success)' : 'var(--danger)'};">${summary.images.broken === 0 ? '✔ Healthy' : '✖ Broken assets found'}</span></td>
          </tr>
          <tr>
            <td><strong>Hyperlinks & Routing</strong></td>
            <td>${summary.links.total} links</td>
            <td>${summary.links.broken} broken</td>
            <td>${summary.links.redirected} redirected</td>
            <td><span style="color: ${summary.links.broken === 0 ? 'var(--success)' : 'var(--danger)'};">${summary.links.broken === 0 ? '✔ Healthy' : '✖ Dead links found'}</span></td>
          </tr>
          <tr>
            <td><strong>Network Traffic & APIs</strong></td>
            <td>${summary.network.total} requests</td>
            <td>${summary.network.failed} failed</td>
            <td>0</td>
            <td><span style="color: ${summary.network.failed === 0 ? 'var(--success)' : 'var(--danger)'};">${summary.network.failed === 0 ? '✔ All succeeded' : '✖ Network failures'}</span></td>
          </tr>
          ${seoMetadata ? `
          <tr>
            <td><strong>SEO Metadata</strong></td>
            <td>1 Page</td>
            <td>${seoMetadata.issues.length} issues</td>
            <td>0</td>
            <td><span style="color: ${seoMetadata.score >= 80 ? 'var(--success)' : 'var(--warning)'};">${seoMetadata.score}% (${seoMetadata.grade})</span></td>
          </tr>` : ''}
          ${pageSpeed ? `
          <tr>
            <td><strong>Page Speed & Performance</strong></td>
            <td>1 Page</td>
            <td>${pageSpeed.bottlenecks.filter(b => b.severity === 'Critical').length} critical</td>
            <td>${pageSpeed.bottlenecks.filter(b => b.severity === 'Warning').length} warnings</td>
            <td><span style="color: ${pageSpeed.score >= 80 ? 'var(--success)' : 'var(--warning)'};">${pageSpeed.score}% (${pageSpeed.rating})</span></td>
          </tr>` : ''}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
  }

  private static escapeHtml(str: string): string {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

