import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import Table from 'cli-table3';
import { getFunctionalReportDir } from '../utils/reportPathHelper.js';
export class MultiPageReporter {
    static printTerminal(result, htmlReportPath, csvReportPath, jsonReportPath, excelReportPath) {
        const { summary, consolidatedFixes, pages, focus = 'all' } = result;
        const focusLabels = {
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
            const avgSeo = Math.round(pagesWithSeo.reduce((acc, p) => acc + p.seoMetadata.score, 0) / pagesWithSeo.length);
            const totalSeoIssues = pagesWithSeo.reduce((acc, p) => acc + p.seoMetadata.issues.length, 0);
            summaryTable.push([
                'SEO Metadata (Avg Score)',
                `${avgSeo}%`,
                totalSeoIssues > 0 ? chalk.yellow(`${totalSeoIssues} issues`) : chalk.green('0'),
                pagesWithSeo.filter((p) => p.seoMetadata.titleStatus === 'missing').length > 0 ? chalk.red(`${pagesWithSeo.filter((p) => p.seoMetadata.titleStatus === 'missing').length} missing title`) : '0'
            ]);
        }
        // Speed
        const pagesWithSpeed = pages.filter((p) => p.pageSpeed);
        if (pagesWithSpeed.length > 0) {
            const avgSpeed = Math.round(pagesWithSpeed.reduce((acc, p) => acc + p.pageSpeed.score, 0) / pagesWithSpeed.length);
            const critBottlenecks = pagesWithSpeed.reduce((acc, p) => acc + p.pageSpeed.bottlenecks.filter((b) => b.severity === 'Critical').length, 0);
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
        }
        else {
            console.log(chalk.bold.red(`✖ SITE AUDIT FOUND ${summary.errorCount} CRITICAL ISSUE(S) ACROSS ${pages.length} PAGES`));
        }
        if (htmlReportPath)
            console.log(`${chalk.bold('Site-Wide HTML Dashboard:')}   ${chalk.green.underline(htmlReportPath)}`);
        if (excelReportPath)
            console.log(`${chalk.bold('Site-Wide Excel (.xlsx):')}    ${chalk.green.underline(excelReportPath)}`);
        if (csvReportPath)
            console.log(`${chalk.bold('Site-Wide Issues CSV:')}       ${chalk.green.underline(csvReportPath)}`);
        if (jsonReportPath)
            console.log(`${chalk.bold('Structured JSON Data:')}        ${chalk.green.underline(jsonReportPath)}`);
        console.log(chalk.bold.cyan('='.repeat(95)) + '\n');
    }
    static async generateHtml(result, outputDir = './reports') {
        const targetDir = getFunctionalReportDir(outputDir, result.focus || 'all');
        await fs.mkdir(targetDir, { recursive: true });
        const safeUrl = result.siteUrl.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `site_audit_${safeUrl}_${timestamp}.html`;
        const filePath = path.join(targetDir, fileName);
        const htmlContent = this.renderMultiPageHtml(result);
        await fs.writeFile(filePath, htmlContent, 'utf-8');
        return path.resolve(filePath);
    }
    static async generateCsv(result, outputDir = './reports') {
        const targetDir = getFunctionalReportDir(outputDir, result.focus || 'all');
        await fs.mkdir(targetDir, { recursive: true });
        const safeUrl = result.siteUrl.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `site_audit_${safeUrl}_${timestamp}.csv`;
        const filePath = path.join(targetDir, fileName);
        const rows = [];
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
        return path.resolve(filePath);
    }
    static async generateJson(result, outputDir = './reports') {
        const targetDir = getFunctionalReportDir(outputDir, result.focus || 'all');
        await fs.mkdir(targetDir, { recursive: true });
        const safeUrl = result.siteUrl.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `site_audit_${safeUrl}_${timestamp}.json`;
        const filePath = path.join(targetDir, fileName);
        await fs.writeFile(filePath, JSON.stringify(result, null, 2), 'utf-8');
        return path.resolve(filePath);
    }
    static renderMultiPageHtml(result) {
        const { summary, pages, consolidatedFixes, focus = 'all' } = result;
        const pagesHtml = pages
            .map((p, i) => `<tr>
        <td>${i + 1}</td>
        <td><span class="badge ${p.httpStatus === 200 ? 'badge-success' : 'badge-danger'}">HTTP ${p.httpStatus}</span></td>
        <td style="max-width:350px; word-break:break-all;"><a href="${this.escapeHtml(p.finalPageUrl)}" target="_blank" style="color:#60a5fa;">${this.escapeHtml(p.finalPageUrl)}</a></td>
        <td><strong>${this.escapeHtml(p.pageTitle || '(No title)')}</strong></td>
        <td>${p.seoMetadata ? `<span class="badge badge-success">${p.seoMetadata.score}% (${p.seoMetadata.grade})</span>` : '-'}</td>
        <td>${p.pageSpeed ? `<span class="badge badge-info">${p.pageSpeed.score}% (${(p.pageSpeed.metrics.loadCompleteMs / 1000).toFixed(2)}s)</span>` : '-'}</td>
        <td><span class="badge ${p.summary.errorCount > 0 ? 'badge-danger' : 'badge-success'}">${p.summary.errorCount} errors</span></td>
        <td>${(p.durationMs / 1000).toFixed(2)}s</td>
      </tr>`)
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

    ${consolidatedFixes.length > 0
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
                .map((f) => `<tr>
              <td><span class="badge ${f.severity === 'Critical' ? 'badge-danger' : 'badge-warning'}">${f.severity}</span></td>
              <td><strong>${f.category}</strong></td>
              <td style="max-width:250px; word-break:break-all;">${this.escapeHtml(f.pageUrl || '')}</td>
              <td style="max-width:250px; word-break:break-all;">${this.escapeHtml(f.targetUrl)}</td>
              <td style="color:#f87171;">${this.escapeHtml(f.reason)}</td>
              <td style="color:#34d399;">${this.escapeHtml(f.suggestedFix)}</td>
            </tr>`)
                .join('\n')}
          </tbody>
        </table>
      </div>`
            : ''}
  </div>
</body>
</html>`;
    }
    static escapeHtml(str) {
        return (str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    static escapeCsv(str) {
        if (str === null || str === undefined)
            return '""';
        const s = String(str).replace(/"/g, '""');
        return `"${s}"`;
    }
}
