import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import Table from 'cli-table3';
import { MultiPageAuditResult } from '../types/audit.js';
import { getFunctionalReportDir } from '../utils/reportPathHelper.js';

export class MultiPageReporter {
  static printTerminal(
    result: MultiPageAuditResult,
    htmlReportPath?: string,
    csvReportPath?: string,
    jsonReportPath?: string,
    excelReportPath?: string
  ): void {
    const { summary, consolidatedFixes, pages, focus = 'all' } = result;

    const focusLabels: Record<string, string> = {
      image: '🖼️  ONLY IMAGES',
      link: '🔗 ONLY HYPERLINKS / LINKS',
      api: '⚡ ONLY NETWORK & API CALLS',
      status: '🔍 404 FINDER & PAGE STATUS',
      seo: '📈 SEO METADATA & SOCIAL AUDIT',
      speed: '⚡ PAGE SPEED & WEB PERFORMANCE',
      all: '🛡️  ALL DIAGNOSTICS (Images + Links + APIs + Status + SEO + Speed + Fonts + Console)'
    };

    console.log('\n' + chalk.bold.cyan('='.repeat(95)));
    console.log(chalk.bold.cyan('        🌐 PAGE SENTINEL - SITE-WIDE MULTI-PAGE AUDIT SUMMARY'));
    console.log(chalk.bold.cyan('='.repeat(95)));

    console.log(`\n${chalk.bold('Target Site:')}   ${chalk.underline.blue(result.siteUrl)}`);
    if (result.sitemapUrl) {
      console.log(`${chalk.bold('Sitemap/Source:')} ${chalk.underline.blue(result.sitemapUrl)}`);
    }
    console.log(`${chalk.bold('Focus Mode:')}    ${chalk.bold.magenta(focusLabels[focus] || focus.toUpperCase())}`);
    console.log(`${chalk.bold('Pages Audited:')} ${chalk.white.bold(pages.length)}`);
    console.log(`${chalk.bold('Execution:')}     ${chalk.yellow((result.durationMs / 1000).toFixed(2) + 's')} | ${result.scanTimestamp}`);

    const summaryTable = new Table({
      head: [
        chalk.cyan.bold('Metric / Diagnostic Area'),
        chalk.cyan.bold('Total Tested'),
        chalk.red.bold('Errors / Failed'),
        chalk.yellow.bold('Warnings / Issues')
      ],
      colWidths: [32, 18, 22, 23]
    });

    summaryTable.push([
      'Total Audited Pages',
      pages.length,
      summary.errorCount > 0 ? chalk.red.bold(summary.errorCount) : chalk.green('0'),
      summary.warningCount > 0 ? chalk.yellow(summary.warningCount) : '0'
    ]);

    // Status / 404
    const total404 = pages.filter((p) => p.httpStatus === 404 || p.pageStatus?.is404).length;
    const totalRedirects = pages.filter((p) => p.pageStatus?.isRedirect).length;
    summaryTable.push([
      'Page Status & 404s',
      pages.length,
      total404 > 0 ? chalk.red.bold(`${total404} 404 Not Found`) : chalk.green('0'),
      totalRedirects > 0 ? chalk.yellow(`${totalRedirects} redirects`) : '0'
    ]);

    // SEO
    const pagesWithSeo = pages.filter((p) => p.seoMetadata);
    if (pagesWithSeo.length > 0) {
      const avgSeo = Math.round(pagesWithSeo.reduce((acc, p) => acc + p.seoMetadata!.score, 0) / pagesWithSeo.length);
      const totalSeoIssues = pagesWithSeo.reduce((acc, p) => acc + p.seoMetadata!.issues.length, 0);
      summaryTable.push([
        'SEO Metadata (Avg Score)',
        `${avgSeo}%`,
        totalSeoIssues > 0 ? chalk.yellow(`${totalSeoIssues} issues`) : chalk.green('0'),
        pagesWithSeo.filter((p) => p.seoMetadata!.titleStatus === 'missing').length > 0 ? chalk.red(`${pagesWithSeo.filter((p) => p.seoMetadata!.titleStatus === 'missing').length} missing title`) : '0'
      ]);
    }

    // Speed
    const pagesWithSpeed = pages.filter((p) => p.pageSpeed);
    if (pagesWithSpeed.length > 0) {
      const avgSpeed = Math.round(pagesWithSpeed.reduce((acc, p) => acc + p.pageSpeed!.score, 0) / pagesWithSpeed.length);
      const critBottlenecks = pagesWithSpeed.reduce((acc, p) => acc + p.pageSpeed!.bottlenecks.filter((b) => b.severity === 'Critical').length, 0);
      summaryTable.push([
        'Page Speed (Avg Score)',
        `${avgSpeed}%`,
        critBottlenecks > 0 ? chalk.red.bold(`${critBottlenecks} bottlenecks`) : chalk.green('0'),
        'Web Vitals'
      ]);
    }

    if (focus === 'all' || focus === 'api') {
      summaryTable.push([
        'Network Requests & APIs',
        summary.network?.total || 0,
        (summary.network?.failed || 0) > 0 ? chalk.red.bold(summary.network?.failed) : chalk.green('0'),
        '0'
      ]);
    }

    if (focus === 'all' || focus === 'image') {
      summaryTable.push([
        'Image Assets',
        summary.images.total,
        summary.images.broken > 0 ? chalk.red.bold(summary.images.broken) : chalk.green('0'),
        summary.images.missingAlt > 0 ? chalk.yellow(`${summary.images.missingAlt} missing alt`) : '0'
      ]);
    }

    if (focus === 'all' || focus === 'link') {
      summaryTable.push([
        'Hyperlinks & Routing',
        summary.links.total,
        summary.links.broken > 0 ? chalk.red.bold(summary.links.broken) : chalk.green('0'),
        summary.links.redirected > 0 ? chalk.yellow(`${summary.links.redirected} redirected`) : '0'
      ]);
    }

    console.log('\n' + summaryTable.toString());

    if (consolidatedFixes.length > 0) {
      console.log('\n' + chalk.bold.cyan('='.repeat(95)));
      console.log(chalk.bold.cyan(`🛠️  CONSOLIDATED FIX DIRECTORY (${consolidatedFixes.length} Total Issues Across All Pages)`));
      console.log(chalk.bold.cyan('='.repeat(95)));

      const fixTable = new Table({
        head: [
          chalk.cyan('Category'),
          chalk.cyan('Error Code'),
          chalk.cyan('Resource / URL'),
          chalk.cyan('Reason'),
          chalk.green.bold('Fix Action')
        ],
        colWidths: [12, 18, 26, 20, 24],
        wordWrap: true
      });

      const sortedFixes = [...consolidatedFixes].sort((a, b) => (a.severity === 'Critical' ? -1 : 1));
      for (const fix of sortedFixes.slice(0, 15)) {
        fixTable.push([
          fix.severity === 'Critical' ? chalk.red(fix.category) : chalk.yellow(fix.category),
          fix.errorCode,
          fix.targetUrl,
          fix.reason,
          chalk.green(fix.suggestedFix)
        ]);
      }
      console.log(fixTable.toString());

      if (consolidatedFixes.length > 15) {
        console.log(chalk.gray(`... and ${consolidatedFixes.length - 15} more issues in detailed reports below.`));
      }
    }

    console.log('\n' + chalk.bold.cyan('-'.repeat(95)));
    if (summary.errorCount === 0) {
      console.log(chalk.bold.green(`✔ SITE AUDIT PASSED: All ${pages.length} pages are healthy!`));
    } else {
      console.log(
        chalk.bold.red(
          `✖ SITE AUDIT FOUND ${summary.errorCount} CRITICAL ISSUE(S) ACROSS ${pages.length} PAGES`
        )
      );
    }

    if (htmlReportPath) console.log(`${chalk.bold('Site-Wide HTML Dashboard:')}   ${chalk.green.underline(htmlReportPath)}`);
    if (excelReportPath) console.log(`${chalk.bold('Site-Wide Excel (.xlsx):')}    ${chalk.green.underline(excelReportPath)}`);
    if (csvReportPath) console.log(`${chalk.bold('Site-Wide Issues CSV:')}       ${chalk.green.underline(csvReportPath)}`);
    if (jsonReportPath) console.log(`${chalk.bold('Structured JSON Data:')}        ${chalk.green.underline(jsonReportPath)}`);
    console.log(chalk.bold.cyan('='.repeat(95)) + '\n');
  }

  static async generateHtml(result: MultiPageAuditResult, outputDir = './reports'): Promise<{ htmlPath: string; summaryHtmlPath: string }> {
    const targetDir = getFunctionalReportDir(outputDir, result.focus || 'all');
    await fs.mkdir(targetDir, { recursive: true });

    const safeUrl = result.siteUrl.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `site_audit_${safeUrl}_${timestamp}.html`;
    const summaryFileName = `site_audit_summary_${safeUrl}_${timestamp}.html`;
    const filePath = path.join(targetDir, fileName);
    const summaryFilePath = path.join(targetDir, summaryFileName);

    const htmlContent = this.renderMultiPageHtml(result);
    const summaryHtmlContent = this.renderMultiPageSummaryHtml(result);

    await fs.writeFile(filePath, htmlContent, 'utf-8');
    await fs.writeFile(summaryFilePath, summaryHtmlContent, 'utf-8');

    return {
      htmlPath: path.resolve(filePath),
      summaryHtmlPath: path.resolve(summaryFilePath)
    };
  }

  static async generateCsv(result: MultiPageAuditResult, outputDir = './reports'): Promise<{ csvPath: string; summaryCsvPath: string }> {
    const targetDir = getFunctionalReportDir(outputDir, result.focus || 'all');
    await fs.mkdir(targetDir, { recursive: true });

    const safeUrl = result.siteUrl.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `site_audit_${safeUrl}_${timestamp}.csv`;
    const summaryFileName = `site_audit_summary_${safeUrl}_${timestamp}.csv`;
    const filePath = path.join(targetDir, fileName);
    const summaryFilePath = path.join(targetDir, summaryFileName);

    const rows: string[] = [];
    rows.push([
      'Page Title',
      'Page Path / URL',
      'Category',
      'Severity',
      'Status / Code',
      'Error Code',
      'Impacted Link / Resource URL',
      'Element / Source Context',
      'Reason / Description',
      'Suggested Fix Action',
      'Extra Diagnostics'
    ].map(this.escapeCsv).join(','));

    for (const fix of result.consolidatedFixes) {
      rows.push([
        '',
        fix.pageUrl || result.siteUrl,
        fix.category,
        fix.severity,
        fix.errorCode,
        fix.errorCode,
        fix.targetUrl,
        fix.elementOrSource || '',
        fix.reason,
        fix.suggestedFix,
        ''
      ].map(this.escapeCsv).join(','));
    }

    await fs.writeFile(filePath, rows.join('\r\n'), 'utf-8');

    // Generate Summary CSV
    const sRows: string[] = [];
    sRows.push(['Diagnostic Area', 'Total Tested', 'Errors / Failed', 'Warnings / Redirects', 'Healthy / OK'].map(this.escapeCsv).join(','));
    const s = result.summary;
    sRows.push(['Pages Audited', String(s.totalPages), `${s.errorCount} Critical Errors`, `${s.warningCount} Warnings`, `${s.totalPages - s.errorCount} Healthy Pages`].map(this.escapeCsv).join(','));
    sRows.push(['Image Assets', String(s.images.total), String(s.images.broken), `${s.images.missingAlt} missing alt`, String(s.images.total - s.images.broken)].map(this.escapeCsv).join(','));
    sRows.push(['Hyperlinks & Routing', String(s.links.total), String(s.links.broken), `${s.links.redirected} redirected`, String(s.links.total - s.links.broken)].map(this.escapeCsv).join(','));
    sRows.push(['Network Traffic', String(s.network.total), String(s.network.failed), '0', String(s.network.total - s.network.failed)].map(this.escapeCsv).join(','));
    sRows.push(['Console Exceptions', String(s.console.errors + s.console.warnings), String(s.console.errors), String(s.console.warnings), '0'].map(this.escapeCsv).join(','));

    if (s.statusSummary) {
      sRows.push(['HTTP Status & 404', String(s.totalPages), String(s.statusSummary.total404), String(s.statusSummary.total3xx), String(s.statusSummary.total200)].map(this.escapeCsv).join(','));
    }
    if (s.seoSummary) {
      sRows.push(['SEO Metadata', `${s.totalPages} Pages`, `${s.seoSummary.pagesMissingTitle} Missing Title`, `${s.seoSummary.pagesMissingDesc} Missing Desc`, `${s.seoSummary.avgScore}% Avg Score`].map(this.escapeCsv).join(','));
    }
    if (s.speedSummary) {
      sRows.push(['Page Speed', `${s.totalPages} Pages`, `${(s.speedSummary.avgLoadTimeMs / 1000).toFixed(2)}s Avg Load`, `${s.speedSummary.avgTtfbMs}ms Avg TTFB`, `${s.speedSummary.avgScore}% Avg Score`].map(this.escapeCsv).join(','));
    }

    await fs.writeFile(summaryFilePath, sRows.join('\r\n'), 'utf-8');

    return {
      csvPath: path.resolve(filePath),
      summaryCsvPath: path.resolve(summaryFilePath)
    };
  }

  static async generateJson(result: MultiPageAuditResult, outputDir = './reports'): Promise<string> {
    const targetDir = getFunctionalReportDir(outputDir, result.focus || 'all');
    await fs.mkdir(targetDir, { recursive: true });

    const safeUrl = result.siteUrl.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `site_audit_${safeUrl}_${timestamp}.json`;
    const filePath = path.join(targetDir, fileName);

    await fs.writeFile(filePath, JSON.stringify(result, null, 2), 'utf-8');
    return path.resolve(filePath);
  }

  private static renderMultiPageHtml(result: MultiPageAuditResult): string {
    const { summary, pages, consolidatedFixes, focus = 'all' } = result;

    const pagesHtml = pages
      .map(
        (p, i) => `<tr>
        <td>${i + 1}</td>
        <td><span class="badge ${p.httpStatus === 200 ? 'badge-success' : 'badge-danger'}">HTTP ${p.httpStatus}</span></td>
        <td style="max-width:350px; word-break:break-all;"><a href="${this.escapeHtml(p.finalPageUrl)}" target="_blank" style="color:#60a5fa;">${this.escapeHtml(p.finalPageUrl)}</a></td>
        <td><strong>${this.escapeHtml(p.pageTitle || '(No title)')}</strong></td>
        <td>${p.seoMetadata ? `<span class="badge badge-success">${p.seoMetadata.score}% (${p.seoMetadata.grade})</span>` : '-'}</td>
        <td>${p.pageSpeed ? `<span class="badge badge-info">${p.pageSpeed.score}% (${(p.pageSpeed.metrics.loadCompleteMs / 1000).toFixed(2)}s)</span>` : '-'}</td>
        <td><span class="badge ${p.summary.errorCount > 0 ? 'badge-danger' : 'badge-success'}">${p.summary.errorCount} errors</span></td>
        <td>${(p.durationMs / 1000).toFixed(2)}s</td>
      </tr>`
      )
      .join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Site-Wide Multi-Page Audit: ${this.escapeHtml(result.siteUrl)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-primary: #0b0f19;
      --bg-secondary: #111827;
      --bg-card: #1f2937;
      --border: #374151;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --primary: #3b82f6;
      --success: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
      --info: #06b6d4;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: var(--bg-primary); color: var(--text); font-family: 'Plus Jakarta Sans', sans-serif; padding: 2rem; }
    .container { max-width: 1500px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid var(--border); border-radius: 16px; padding: 2rem; margin-bottom: 2rem; }
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 1.25rem; text-align: center; }
    .card-val { font-size: 2rem; font-weight: 800; margin-top: 0.5rem; }
    .table-wrapper { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 1.5rem; overflow-x: auto; margin-bottom: 2rem; }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85rem; }
    th { background: #0f172a; padding: 0.85rem 1rem; font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); border-bottom: 1px solid var(--border); }
    td { padding: 0.85rem 1rem; border-bottom: 1px solid var(--border); }
    .badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; }
    .badge-success { background: rgba(16,185,129,0.2); color: #34d399; }
    .badge-danger { background: rgba(239,68,68,0.2); color: #f87171; }
    .badge-warning { background: rgba(245,158,11,0.2); color: #fbbf24; }
    .badge-info { background: rgba(6,182,212,0.2); color: #22d3ee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="font-size: 1.8rem; margin-bottom: 0.5rem;">🌐 Multi-Page Site Audit Dashboard</h1>
      <p style="color: var(--text-muted);">Site: <a href="${this.escapeHtml(result.siteUrl)}" target="_blank" style="color: #60a5fa;">${this.escapeHtml(result.siteUrl)}</a> | Audited ${pages.length} pages in ${(result.durationMs / 1000).toFixed(2)}s</p>
    </div>

    <div class="cards-grid">
      <div class="card">
        <div style="font-size:0.75rem; color:var(--text-muted);">TOTAL PAGES</div>
        <div class="card-val" style="color:#60a5fa;">${pages.length}</div>
      </div>
      <div class="card">
        <div style="font-size:0.75rem; color:var(--text-muted);">TOTAL ISSUES FLAGGED</div>
        <div class="card-val" style="color:${summary.errorCount > 0 ? 'var(--danger)' : 'var(--success)'};">${summary.totalIssues}</div>
      </div>
      <div class="card">
        <div style="font-size:0.75rem; color:var(--text-muted);">CRITICAL ERRORS</div>
        <div class="card-val" style="color:${summary.errorCount > 0 ? 'var(--danger)' : 'var(--success)'};">${summary.errorCount}</div>
      </div>
      <div class="card">
        <div style="font-size:0.75rem; color:var(--text-muted);">WARNINGS / REDIRECTS</div>
        <div class="card-val" style="color:var(--warning);">${summary.warningCount}</div>
      </div>
    </div>

    <div class="table-wrapper">
      <h3 style="margin-bottom: 1rem;">Audited Pages List (${pages.length})</h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Status</th>
            <th>Page URL</th>
            <th>Title</th>
            <th>SEO Score</th>
            <th>Speed Score</th>
            <th>Issues</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          ${pagesHtml}
        </tbody>
      </table>
    </div>

    ${
      consolidatedFixes.length > 0
        ? `<div class="table-wrapper">
        <h3 style="margin-bottom: 1rem; color:#f87171;">Consolidated Actionable Fix Directory (${consolidatedFixes.length})</h3>
        <table>
          <thead>
            <tr>
              <th>Severity</th>
              <th>Category</th>
              <th>Page URL</th>
              <th>Impacted Target</th>
              <th>Reason</th>
              <th>Suggested Fix</th>
            </tr>
          </thead>
          <tbody>
            ${consolidatedFixes
              .map(
                (f) => `<tr>
              <td><span class="badge ${f.severity === 'Critical' ? 'badge-danger' : 'badge-warning'}">${f.severity}</span></td>
              <td><strong>${f.category}</strong></td>
              <td style="max-width:250px; word-break:break-all;">${this.escapeHtml(f.pageUrl || '')}</td>
              <td style="max-width:250px; word-break:break-all;">${this.escapeHtml(f.targetUrl)}</td>
              <td style="color:#f87171;">${this.escapeHtml(f.reason)}</td>
              <td style="color:#34d399;">${this.escapeHtml(f.suggestedFix)}</td>
            </tr>`
              )
              .join('\n')}
          </tbody>
        </table>
      </div>`
        : ''
    }
  </div>
</body>
</html>`;
  }

  private static renderMultiPageSummaryHtml(result: MultiPageAuditResult): string {
    const { summary: s, siteUrl } = result;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Site-Wide Audit Summary - ${this.escapeHtml(siteUrl)}</title>
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
      <div class="badge">SITE-WIDE EXECUTIVE SUMMARY</div>
      <h1>🌐 Multi-Page Health Audit Summary</h1>
      <div class="url">${this.escapeHtml(siteUrl)}</div>
    </div>

    <div class="grid">
      <div class="kpi-card">
        <div class="kpi-val" style="color: var(--primary);">${s.totalPages}</div>
        <div class="kpi-label">Pages Audited</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" style="color: var(--success);">${s.totalPages - s.errorCount}</div>
        <div class="kpi-label">Healthy Pages</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" style="color: ${s.errorCount > 0 ? 'var(--danger)' : 'var(--success)'};">${s.errorCount}</div>
        <div class="kpi-label">Critical Errors</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" style="color: ${s.warningCount > 0 ? 'var(--warning)' : 'var(--success)'};">${s.warningCount}</div>
        <div class="kpi-label">Total Warnings</div>
      </div>
      ${s.seoSummary ? `
      <div class="kpi-card">
        <div class="kpi-val" style="color: ${s.seoSummary.avgScore >= 80 ? 'var(--success)' : 'var(--warning)'};">${s.seoSummary.avgScore}%</div>
        <div class="kpi-label">Avg SEO Score</div>
      </div>` : ''}
      ${s.speedSummary ? `
      <div class="kpi-card">
        <div class="kpi-val" style="color: ${s.speedSummary.avgScore >= 80 ? 'var(--success)' : 'var(--warning)'};">${s.speedSummary.avgScore}%</div>
        <div class="kpi-label">Avg Speed Score</div>
      </div>` : ''}
    </div>

    <div class="table-box">
      <table>
        <thead>
          <tr>
            <th>Diagnostic Area</th>
            <th>Total Inspected</th>
            <th>Critical Failures</th>
            <th>Warnings / Notices</th>
            <th>Site Status</th>
          </tr>
        </thead>
        <tbody>
          ${s.statusSummary ? `
          <tr>
            <td><strong>404 & HTTP Status</strong></td>
            <td>${s.totalPages} pages</td>
            <td>${s.statusSummary.total404} broken (404)</td>
            <td>${s.statusSummary.total3xx} redirects</td>
            <td><span style="color: ${s.statusSummary.total404 === 0 ? 'var(--success)' : 'var(--danger)'};">${s.statusSummary.total404 === 0 ? '✔ 0 Broken 404s' : '✖ Broken URLs found'}</span></td>
          </tr>` : ''}
          <tr>
            <td><strong>Image Assets</strong></td>
            <td>${s.images.total} images</td>
            <td>${s.images.broken} broken</td>
            <td>${s.images.missingAlt} missing alt</td>
            <td><span style="color: ${s.images.broken === 0 ? 'var(--success)' : 'var(--danger)'};">${s.images.broken === 0 ? '✔ All Healthy' : '✖ Broken images found'}</span></td>
          </tr>
          <tr>
            <td><strong>Hyperlinks & Nav</strong></td>
            <td>${s.links.total} links</td>
            <td>${s.links.broken} broken</td>
            <td>${s.links.redirected} redirects</td>
            <td><span style="color: ${s.links.broken === 0 ? 'var(--success)' : 'var(--danger)'};">${s.links.broken === 0 ? '✔ All Healthy' : '✖ Dead links found'}</span></td>
          </tr>
          <tr>
            <td><strong>Network Traffic & APIs</strong></td>
            <td>${s.network.total} calls</td>
            <td>${s.network.failed} failed</td>
            <td>0</td>
            <td><span style="color: ${s.network.failed === 0 ? 'var(--success)' : 'var(--danger)'};">${s.network.failed === 0 ? '✔ All succeeded' : '✖ Failed calls'}</span></td>
          </tr>
          ${s.seoSummary ? `
          <tr>
            <td><strong>SEO Metadata</strong></td>
            <td>${s.totalPages} pages</td>
            <td>${s.seoSummary.pagesMissingTitle} missing title</td>
            <td>${s.seoSummary.pagesMissingDesc} missing desc</td>
            <td><span style="color: ${s.seoSummary.avgScore >= 80 ? 'var(--success)' : 'var(--warning)'};">${s.seoSummary.avgScore}% Avg Score</span></td>
          </tr>` : ''}
          ${s.speedSummary ? `
          <tr>
            <td><strong>Page Speed & Performance</strong></td>
            <td>${s.totalPages} pages</td>
            <td>${(s.speedSummary.avgLoadTimeMs / 1000).toFixed(2)}s avg load</td>
            <td>${s.speedSummary.avgTtfbMs}ms avg TTFB</td>
            <td><span style="color: ${s.speedSummary.avgScore >= 80 ? 'var(--success)' : 'var(--warning)'};">${s.speedSummary.avgScore}% Avg Score</span></td>
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

  private static escapeCsv(str: string): string {
    if (str === null || str === undefined) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  }
}

