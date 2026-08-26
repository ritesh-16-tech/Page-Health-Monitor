import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import Table from 'cli-table3';
import ExcelJS from 'exceljs';
import { PageSpeedResult } from '../types/audit.js';
import { getFunctionalReportDir } from '../utils/reportPathHelper.js';

export class SpeedReporter {
  static async generateAll(
    results: PageSpeedResult[],
    targetUrl: string,
    outputDir = './reports'
  ): Promise<{ htmlPath: string; excelPath: string; csvPath: string; jsonPath: string; summaryHtmlPath: string; summaryCsvPath: string }> {
    const targetDir = getFunctionalReportDir(outputDir, 'speed');
    await fs.mkdir(targetDir, { recursive: true });

    const safeUrl = targetUrl.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 35);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    const htmlPath = path.join(targetDir, `page_speed_${safeUrl}_${timestamp}.html`);
    const excelPath = path.join(targetDir, `page_speed_${safeUrl}_${timestamp}.xlsx`);
    const csvPath = path.join(targetDir, `page_speed_${safeUrl}_${timestamp}.csv`);
    const jsonPath = path.join(targetDir, `page_speed_${safeUrl}_${timestamp}.json`);
    const summaryCsvPath = path.join(targetDir, `summary_page_speed_${safeUrl}_${timestamp}.csv`);
    const summaryHtmlPath = path.join(targetDir, `summary_page_speed_${safeUrl}_${timestamp}.html`);

    await fs.writeFile(htmlPath, this.renderHtml(results, targetUrl), 'utf-8');
    await fs.writeFile(csvPath, this.renderCsv(results), 'utf-8');
    await fs.writeFile(summaryCsvPath, this.renderSummaryCsv(results, targetUrl), 'utf-8');
    await fs.writeFile(summaryHtmlPath, this.renderSummaryHtml(results, targetUrl), 'utf-8');
    await fs.writeFile(jsonPath, JSON.stringify({ targetUrl, timestamp: new Date().toISOString(), total: results.length, results }, null, 2), 'utf-8');
    await this.generateExcel(results, targetUrl, excelPath);

    return {
      htmlPath: path.resolve(htmlPath),
      excelPath: path.resolve(excelPath),
      csvPath: path.resolve(csvPath),
      summaryCsvPath: path.resolve(summaryCsvPath),
      summaryHtmlPath: path.resolve(summaryHtmlPath),
      jsonPath: path.resolve(jsonPath)
    };
  }

  static printTerminal(
    results: PageSpeedResult[],
    targetUrl: string,
    htmlPath?: string,
    excelPath?: string,
    csvPath?: string,
    jsonPath?: string,
    summaryHtmlPath?: string,
    summaryCsvPath?: string
  ): void {
    const total = results.length;
    const avgScore = total > 0 ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / total) : 0;
    const avgLoadTime = total > 0 ? (results.reduce((acc, r) => acc + r.metrics.loadCompleteMs, 0) / total / 1000).toFixed(2) : '0';
    const avgTtfb = total > 0 ? Math.round(results.reduce((acc, r) => acc + r.metrics.ttfbMs, 0) / total) : 0;
    const avgSize = total > 0 ? Math.round(results.reduce((acc, r) => acc + r.resources.totalTransferSizeKb, 0) / total) : 0;

    console.log('\n' + chalk.bold.cyan('='.repeat(95)));
    console.log(chalk.bold.cyan('        ⚡ PAGE-HEALTH-MONITOR - PAGE SPEED & WEB PERFORMANCE AUDIT'));
    console.log(chalk.bold.cyan('='.repeat(95)));

    console.log(`\n${chalk.bold('Target:')}        ${chalk.underline.blue(targetUrl)}`);
    console.log(`${chalk.bold('Pages Audited:')} ${chalk.white.bold(total)}`);
    console.log(
      `${chalk.bold('Speed Stats:')}   Avg Score: ${this.formatScoreChalk(avgScore)} | Avg Load: ${chalk.yellow(avgLoadTime + 's')} | Avg TTFB: ${chalk.cyan(avgTtfb + 'ms')} | Avg Payload: ${chalk.magenta(avgSize + ' KB')}`
    );

    const table = new Table({
      head: [
        chalk.cyan.bold('Score'),
        chalk.cyan.bold('Page URL'),
        chalk.cyan.bold('TTFB'),
        chalk.cyan.bold('FCP'),
        chalk.cyan.bold('Total Load'),
        chalk.cyan.bold('Payload (KB)'),
        chalk.cyan.bold('Requests')
      ],
      colWidths: [10, 30, 10, 10, 12, 14, 10],
      wordWrap: true
    });

    for (const r of results.slice(0, 15)) {
      table.push([
        this.formatScoreChalk(r.score),
        r.url,
        `${r.metrics.ttfbMs}ms`,
        `${(r.metrics.fcpMs / 1000).toFixed(2)}s`,
        `${(r.metrics.loadCompleteMs / 1000).toFixed(2)}s`,
        `${r.resources.totalTransferSizeKb} KB`,
        `${r.resources.totalRequests}`
      ]);
    }

    console.log('\n' + table.toString());

    // Show bottlenecks if single page
    if (results.length === 1 && results[0].bottlenecks.length > 0) {
      console.log('\n' + chalk.bold.yellow('⚠️  PERFORMANCE BOTTLENECKS & ACTION PLAN:'));
      for (const b of results[0].bottlenecks) {
        const sevColor = b.severity === 'Critical' ? chalk.red.bold : chalk.yellow.bold;
        console.log(`  ${sevColor(`[${b.severity}]`)} ${chalk.bold(b.metric)}: ${b.value}`);
        console.log(`    └ ${chalk.green(b.recommendation)}`);
      }
    }

    if (htmlPath) console.log(`\n${chalk.bold('Interactive HTML Dashboard:')} ${chalk.green.underline(htmlPath)}`);
    if (summaryHtmlPath) console.log(`${chalk.bold('Executive Summary HTML:')}     ${chalk.green.underline(summaryHtmlPath)}`);
    if (excelPath) console.log(`${chalk.bold('Excel (.xlsx) Report:')}        ${chalk.green.underline(excelPath)}`);
    if (csvPath) console.log(`${chalk.bold('CSV Detailed Report:')}          ${chalk.green.underline(csvPath)}`);
    if (summaryCsvPath) console.log(`${chalk.bold('Summary Table CSV Report:')}   ${chalk.green.underline(summaryCsvPath)}`);
    if (jsonPath) console.log(`${chalk.bold('JSON Data Export:')}          ${chalk.green.underline(jsonPath)}`);
    console.log(chalk.bold.cyan('='.repeat(95)) + '\n');
  }

  private static formatScoreChalk(score: number): string {
    if (score >= 80) return chalk.green.bold(`${score}%`);
    if (score >= 55) return chalk.yellow.bold(`${score}%`);
    return chalk.red.bold(`${score}%`);
  }

  private static renderCsv(results: PageSpeedResult[]): string {
    const rows: string[] = [];
    rows.push([
      'Page URL',
      'Performance Score',
      'Rating',
      'TTFB (ms)',
      'DNS Lookup (ms)',
      'TCP Connect (ms)',
      'SSL Handshake (ms)',
      'Download Duration (ms)',
      'DOM Interactive (ms)',
      'DOM Content Loaded (ms)',
      'Load Complete (ms)',
      'First Contentful Paint FCP (ms)',
      'Largest Contentful Paint LCP (ms)',
      'Cumulative Layout Shift CLS',
      'Total Blocking Time TBT (ms)',
      'Total Requests',
      'Total Transfer Size (KB)',
      'JS Count',
      'JS Size (KB)',
      'CSS Count',
      'CSS Size (KB)',
      'Image Count',
      'Image Size (KB)',
      'Font Count',
      'Font Size (KB)',
      'HTML Size (KB)',
      'API Count',
      'API Size (KB)',
      'Bottlenecks List'
    ].map(this.escapeCsv).join(','));

    for (const r of results) {
      const bnList = r.bottlenecks.map((b) => `[${b.severity}] ${b.metric}: ${b.value} -> ${b.recommendation}`).join('; ');
      rows.push([
        r.url,
        String(r.score),
        r.rating,
        String(r.metrics.ttfbMs),
        String(r.metrics.dnsMs),
        String(r.metrics.tcpMs),
        String(r.metrics.sslMs),
        String(r.metrics.downloadMs),
        String(r.metrics.domInteractiveMs),
        String(r.metrics.domContentLoadedMs),
        String(r.metrics.loadCompleteMs),
        String(r.metrics.fcpMs),
        String(r.metrics.lcpMs),
        String(r.metrics.cls),
        String(r.metrics.tbtMs),
        String(r.resources.totalRequests),
        String(r.resources.totalTransferSizeKb),
        String(r.resources.jsCount),
        String(r.resources.jsSizeKb),
        String(r.resources.cssCount),
        String(r.resources.cssSizeKb),
        String(r.resources.imageCount),
        String(r.resources.imageSizeKb),
        String(r.resources.fontCount),
        String(r.resources.fontSizeKb),
        String(r.resources.htmlSizeKb),
        String(r.resources.apiCount),
        String(r.resources.apiSizeKb),
        bnList
      ].map(this.escapeCsv).join(','));
    }

    return rows.join('\r\n');
  }

  private static async generateExcel(results: PageSpeedResult[], targetUrl: string, filePath: string): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Page-Health-Monitor Auditor';
    workbook.created = new Date();

    // Tab 1: Web Vitals & Load Times
    const sheet1 = workbook.addWorksheet('Web Vitals & Performance', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    sheet1.columns = [
      { header: 'Page URL', key: 'url', width: 40 },
      { header: 'Score', key: 'score', width: 10 },
      { header: 'Rating', key: 'rating', width: 16 },
      { header: 'Load Time (s)', key: 'loadSec', width: 14 },
      { header: 'TTFB (ms)', key: 'ttfb', width: 12 },
      { header: 'FCP (s)', key: 'fcp', width: 12 },
      { header: 'LCP (s)', key: 'lcp', width: 12 },
      { header: 'CLS', key: 'cls', width: 10 },
      { header: 'TBT (ms)', key: 'tbt', width: 12 },
      { header: 'Total Size (KB)', key: 'totalKb', width: 15 },
      { header: 'Total Requests', key: 'requests', width: 14 },
      { header: 'Identified Bottlenecks & Fixes', key: 'bottlenecks', width: 50 }
    ];

    const headerRow1 = sheet1.getRow(1);
    headerRow1.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

    for (const r of results) {
      const bnText = r.bottlenecks.map((b) => `[${b.severity}] ${b.metric}: ${b.value} -> ${b.recommendation}`).join('\n');
      const row = sheet1.addRow({
        url: r.url,
        score: `${r.score}%`,
        rating: r.rating,
        loadSec: (r.metrics.loadCompleteMs / 1000).toFixed(2),
        ttfb: r.metrics.ttfbMs,
        fcp: (r.metrics.fcpMs / 1000).toFixed(2),
        lcp: (r.metrics.lcpMs / 1000).toFixed(2),
        cls: r.metrics.cls,
        tbt: r.metrics.tbtMs,
        totalKb: r.resources.totalTransferSizeKb,
        requests: r.resources.totalRequests,
        bottlenecks: bnText
      });

      if (r.score >= 80) {
        row.getCell('score').font = { color: { argb: 'FF10B981' }, bold: true };
      } else if (r.score >= 55) {
        row.getCell('score').font = { color: { argb: 'FFD97706' }, bold: true };
      } else {
        row.getCell('score').font = { color: { argb: 'FFFF0000' }, bold: true };
      }
    }

    // Tab 2: Resource Payload Breakdown
    const sheet2 = workbook.addWorksheet('Asset Payload Breakdown', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    sheet2.columns = [
      { header: 'Page URL', key: 'url', width: 40 },
      { header: 'JS Files', key: 'jsCount', width: 12 },
      { header: 'JS Size (KB)', key: 'jsKb', width: 14 },
      { header: 'CSS Files', key: 'cssCount', width: 12 },
      { header: 'CSS Size (KB)', key: 'cssKb', width: 14 },
      { header: 'Images Count', key: 'imgCount', width: 14 },
      { header: 'Images Size (KB)', key: 'imgKb', width: 16 },
      { header: 'Fonts Count', key: 'fontCount', width: 12 },
      { header: 'Fonts Size (KB)', key: 'fontKb', width: 14 },
      { header: 'HTML Size (KB)', key: 'htmlKb', width: 14 },
      { header: 'APIs Count', key: 'apiCount', width: 12 },
      { header: 'APIs Size (KB)', key: 'apiKb', width: 14 }
    ];

    const headerRow2 = sheet2.getRow(1);
    headerRow2.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

    for (const r of results) {
      sheet2.addRow({
        url: r.url,
        jsCount: r.resources.jsCount,
        jsKb: r.resources.jsSizeKb,
        cssCount: r.resources.cssCount,
        cssKb: r.resources.cssSizeKb,
        imgCount: r.resources.imageCount,
        imgKb: r.resources.imageSizeKb,
        fontCount: r.resources.fontCount,
        fontKb: r.resources.fontSizeKb,
        htmlKb: r.resources.htmlSizeKb,
        apiCount: r.resources.apiCount,
        apiKb: r.resources.apiSizeKb
      });
    }

    await workbook.xlsx.writeFile(filePath);
  }

  private static renderHtml(results: PageSpeedResult[], targetUrl: string): string {
    const total = results.length;
    const avgScore = total > 0 ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / total) : 0;
    const avgLoadTime = total > 0 ? (results.reduce((acc, r) => acc + r.metrics.loadCompleteMs, 0) / total / 1000).toFixed(2) : '0';
    const avgTtfb = total > 0 ? Math.round(results.reduce((acc, r) => acc + r.metrics.ttfbMs, 0) / total) : 0;
    const avgSize = total > 0 ? Math.round(results.reduce((acc, r) => acc + r.resources.totalTransferSizeKb, 0) / total) : 0;

    const cardsHtml = results
      .map((r, i) => {
        let scoreColor = '#10b981';
        if (r.score < 55) scoreColor = '#ef4444';
        else if (r.score < 80) scoreColor = '#f59e0b';

        const bnList = r.bottlenecks
          .map(
            (b) =>
              `<div style="background:#0f172a; padding:0.75rem 1rem; border-radius:8px; border:1px solid #334155; margin-bottom:8px;">
                <div style="font-weight:700; font-size:0.85rem; color:${b.severity === 'Critical' ? '#f87171' : '#fbbf24'};">${b.metric}: ${this.escapeHtml(b.value)}</div>
                <div style="font-size:0.8rem; color:#34d399; margin-top:3px;">💡 ${this.escapeHtml(b.recommendation)}</div>
              </div>`
          )
          .join('');

        return `<div class="speed-card">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem;">
            <div>
              <span style="font-size:0.8rem; color:#9ca3af;">#${i + 1} PAGE</span>
              <h3 style="font-size:1.15rem; word-break:break-all;"><a href="${this.escapeHtml(r.url)}" target="_blank" style="color:#60a5fa; text-decoration:none;">${this.escapeHtml(r.url)}</a></h3>
            </div>
            <div style="text-align:right;">
              <span class="score-badge" style="background:${scoreColor}22; color:${scoreColor}; border:1px solid ${scoreColor}; font-size:1.1rem;">${r.score}% (${r.rating})</span>
            </div>
          </div>

          <!-- Web Vitals Grid -->
          <div class="metrics-grid">
            <div class="metric-box">
              <div class="metric-lbl">TIME TO FIRST BYTE (TTFB)</div>
              <div class="metric-val" style="color:${r.metrics.ttfbMs > 600 ? '#f87171' : '#34d399'};">${r.metrics.ttfbMs} ms</div>
              <div class="metric-target">Target &lt; 400ms</div>
            </div>
            <div class="metric-box">
              <div class="metric-lbl">FIRST CONTENTFUL PAINT</div>
              <div class="metric-val" style="color:${r.metrics.fcpMs > 1800 ? '#fbbf24' : '#34d399'};">${(r.metrics.fcpMs / 1000).toFixed(2)} s</div>
              <div class="metric-target">Target &lt; 1.8s</div>
            </div>
            <div class="metric-box">
              <div class="metric-lbl">LARGEST CONTENTFUL PAINT</div>
              <div class="metric-val" style="color:${r.metrics.lcpMs > 2500 ? '#f87171' : '#34d399'};">${(r.metrics.lcpMs / 1000).toFixed(2)} s</div>
              <div class="metric-target">Target &lt; 2.5s</div>
            </div>
            <div class="metric-box">
              <div class="metric-lbl">TOTAL LOAD TIME</div>
              <div class="metric-val" style="color:${r.metrics.loadCompleteMs > 3500 ? '#f87171' : '#34d399'};">${(r.metrics.loadCompleteMs / 1000).toFixed(2)} s</div>
              <div class="metric-target">Target &lt; 2.5s</div>
            </div>
          </div>

          <!-- Asset Payload Breakdown Bars -->
          <div style="background:#0f172a; padding:1.25rem; border-radius:12px; border:1px solid #334155; margin: 1.5rem 0;">
            <div style="font-size:0.8rem; font-weight:700; color:#94a3b8; text-transform:uppercase; margin-bottom:1rem;">Page Weight & Payload Breakdown: ${r.resources.totalTransferSizeKb} KB (${r.resources.totalRequests} Requests)</div>
            <div class="asset-grid">
              <div class="asset-item">
                <span class="asset-type">JavaScript</span>
                <span class="asset-val">${r.resources.jsSizeKb} KB (${r.resources.jsCount} files)</span>
              </div>
              <div class="asset-item">
                <span class="asset-type">Images</span>
                <span class="asset-val">${r.resources.imageSizeKb} KB (${r.resources.imageCount} imgs)</span>
              </div>
              <div class="asset-item">
                <span class="asset-type">CSS Styles</span>
                <span class="asset-val">${r.resources.cssSizeKb} KB (${r.resources.cssCount} files)</span>
              </div>
              <div class="asset-item">
                <span class="asset-type">WebFonts</span>
                <span class="asset-val">${r.resources.fontSizeKb} KB (${r.resources.fontCount} fonts)</span>
              </div>
              <div class="asset-item">
                <span class="asset-type">HTML Document</span>
                <span class="asset-val">${r.resources.htmlSizeKb} KB</span>
              </div>
              <div class="asset-item">
                <span class="asset-type">APIs / Fetch</span>
                <span class="asset-val">${r.resources.apiSizeKb} KB (${r.resources.apiCount} calls)</span>
              </div>
            </div>
          </div>

          ${
            r.bottlenecks.length > 0
              ? `<div>
              <div style="font-size:0.8rem; font-weight:700; color:#fbbf24; text-transform:uppercase; margin-bottom:0.5rem;">Optimization Recommendations (${r.bottlenecks.length})</div>
              ${bnList}
            </div>`
              : '<div style="color:#34d399; font-size:0.9rem;">✔ High performance page! No critical speed bottlenecks detected.</div>'
          }
        </div>`;
      })
      .join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Page Speed & Performance Audit Dashboard - ${this.escapeHtml(targetUrl)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0b0f19;
      --card-bg: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #3b82f6;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background-color: var(--bg); color: var(--text); font-family: 'Plus Jakarta Sans', sans-serif; padding: 2rem; }
    .container { max-width: 1440px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid var(--border); border-radius: 16px; padding: 2rem; margin-bottom: 2rem; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .kpi-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 1.25rem; text-align: center; }
    .kpi-val { font-size: 2rem; font-weight: 800; margin-top: 0.5rem; }
    .speed-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; padding: 1.75rem; margin-bottom: 1.5rem; }
    .score-badge { padding: 0.4rem 0.8rem; border-radius: 8px; font-weight: 800; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1rem 0; }
    .metric-box { background: #0f172a; padding: 1rem; border-radius: 10px; border: 1px solid var(--border); text-align: center; }
    .metric-lbl { font-size: 0.7rem; font-weight: 700; color: var(--text-muted); letter-spacing: 0.05em; margin-bottom: 4px; }
    .metric-val { font-size: 1.6rem; font-weight: 800; }
    .metric-target { font-size: 0.75rem; color: #64748b; margin-top: 4px; }
    .asset-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; }
    .asset-item { background: #1e293b; padding: 0.75rem 1rem; border-radius: 8px; }
    .asset-type { display: block; font-size: 0.75rem; font-weight: 700; color: var(--text-muted); }
    .asset-val { font-size: 0.95rem; font-weight: 700; color: #60a5fa; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="font-size: 1.8rem; margin-bottom: 0.5rem;">⚡ Page Speed & Web Performance Dashboard</h1>
      <p style="color: var(--text-muted);">Target: <a href="${this.escapeHtml(targetUrl)}" target="_blank" style="color: #60a5fa;">${this.escapeHtml(targetUrl)}</a> | Generated on ${new Date().toLocaleString()}</p>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div style="color: var(--text-muted); font-size: 0.85rem;">TOTAL PAGES TESTED</div>
        <div class="kpi-val" style="color: #60a5fa;">${total}</div>
      </div>
      <div class="kpi-card">
        <div style="color: var(--text-muted); font-size: 0.85rem;">AVG SPEED SCORE</div>
        <div class="kpi-val" style="color: ${avgScore >= 80 ? 'var(--success)' : avgScore >= 55 ? 'var(--warning)' : 'var(--danger)'};">${avgScore}%</div>
      </div>
      <div class="kpi-card">
        <div style="color: var(--text-muted); font-size: 0.85rem;">AVG LOAD TIME</div>
        <div class="kpi-val" style="color: #f59e0b;">${avgLoadTime}s</div>
      </div>
      <div class="kpi-card">
        <div style="color: var(--text-muted); font-size: 0.85rem;">AVG SERVER TTFB</div>
        <div class="kpi-val" style="color: ${avgTtfb > 600 ? 'var(--danger)' : 'var(--success)'};">${avgTtfb}ms</div>
      </div>
      <div class="kpi-card">
        <div style="color: var(--text-muted); font-size: 0.85rem;">AVG PAGE PAYLOAD</div>
        <div class="kpi-val" style="color: #a855f7;">${avgSize} KB</div>
      </div>
    </div>

    <div class="card-container">
      ${cardsHtml}
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

  private static renderSummaryCsv(results: PageSpeedResult[], targetUrl: string): string {
    const total = results.length;
    const avgScore = total > 0 ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / total) : 0;
    const avgLoadTime = total > 0 ? (results.reduce((acc, r) => acc + r.metrics.loadCompleteMs, 0) / total / 1000).toFixed(2) : '0';
    const avgTtfb = total > 0 ? Math.round(results.reduce((acc, r) => acc + r.metrics.ttfbMs, 0) / total) : 0;
    const avgFcp = total > 0 ? (results.reduce((acc, r) => acc + r.metrics.fcpMs, 0) / total / 1000).toFixed(2) : '0';
    const avgPayload = total > 0 ? Math.round(results.reduce((acc, r) => acc + r.resources.totalTransferSizeKb, 0) / total) : 0;
    const totalBottlenecks = results.reduce((acc, r) => acc + r.bottlenecks.length, 0);

    let overallRating: 'Good' | 'Needs Improvement' | 'Poor' = 'Good';
    if (avgScore < 55) overallRating = 'Poor';
    else if (avgScore < 80) overallRating = 'Needs Improvement';

    const rows = [
      ['Metric / KPI', 'Value', 'Status / Benchmark'].map(this.escapeCsv).join(','),
      ['Target Domain / Input', targetUrl, ''].map(this.escapeCsv).join(','),
      ['Audit Timestamp', new Date().toISOString(), ''].map(this.escapeCsv).join(','),
      ['Total Pages Audited', String(total), ''].map(this.escapeCsv).join(','),
      ['Average Speed Score', `${avgScore}% (${overallRating})`, avgScore >= 80 ? 'Good Web Performance' : 'Needs Optimization'].map(this.escapeCsv).join(','),
      ['Average TTFB (Server Response)', `${avgTtfb} ms`, avgTtfb <= 400 ? 'Fast (<= 400ms)' : 'Slow (> 600ms)'].map(this.escapeCsv).join(','),
      ['Average First Contentful Paint (FCP)', `${avgFcp} s`, parseFloat(avgFcp) <= 1.8 ? 'Fast (<= 1.8s)' : 'Slow (> 1.8s)'].map(this.escapeCsv).join(','),
      ['Average Total Page Load Time', `${avgLoadTime} s`, parseFloat(avgLoadTime) <= 3.0 ? 'Optimal (<= 3.0s)' : 'Delayed (> 3.5s)'].map(this.escapeCsv).join(','),
      ['Average Total Page Weight', `${avgPayload} KB`, avgPayload <= 1500 ? 'Lightweight (<= 1.5MB)' : 'Heavy (> 1.5MB)'].map(this.escapeCsv).join(','),
      ['Total Bottlenecks Detected', String(totalBottlenecks), totalBottlenecks > 0 ? 'Review performance fixes' : 'Zero bottlenecks'].map(this.escapeCsv).join(',')
    ];

    return rows.join('\r\n');
  }

  private static renderSummaryHtml(results: PageSpeedResult[], targetUrl: string): string {
    const total = results.length;
    const avgScore = total > 0 ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / total) : 0;
    const avgLoadTime = total > 0 ? (results.reduce((acc, r) => acc + r.metrics.loadCompleteMs, 0) / total / 1000).toFixed(2) : '0';
    const avgTtfb = total > 0 ? Math.round(results.reduce((acc, r) => acc + r.metrics.ttfbMs, 0) / total) : 0;
    const avgFcp = total > 0 ? (results.reduce((acc, r) => acc + r.metrics.fcpMs, 0) / total / 1000).toFixed(2) : '0';
    const avgPayload = total > 0 ? Math.round(results.reduce((acc, r) => acc + r.resources.totalTransferSizeKb, 0) / total) : 0;
    const totalBottlenecks = results.reduce((acc, r) => acc + r.bottlenecks.length, 0);

    let overallRating: 'Good' | 'Needs Improvement' | 'Poor' = 'Good';
    let ratingColor = 'var(--success)';
    if (avgScore < 55) { overallRating = 'Poor'; ratingColor = 'var(--danger)'; }
    else if (avgScore < 80) { overallRating = 'Needs Improvement'; ratingColor = 'var(--warning)'; }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Speed Executive Summary - ${this.escapeHtml(targetUrl)}</title>
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
      <h1>⚡ Page Speed & Web Vitals Summary</h1>
      <div class="url">${this.escapeHtml(targetUrl)}</div>
    </div>

    <div class="grid">
      <div class="kpi-card">
        <div class="kpi-val" style="color: ${ratingColor};">${avgScore}%</div>
        <div class="kpi-label">Speed Score (${overallRating})</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" style="color: var(--primary);">${avgLoadTime}s</div>
        <div class="kpi-label">Avg Load Time</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" style="color: ${avgTtfb <= 400 ? 'var(--success)' : 'var(--warning)'};">${avgTtfb}ms</div>
        <div class="kpi-label">Avg TTFB</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" style="color: var(--text);">${avgPayload} KB</div>
        <div class="kpi-label">Avg Total Weight</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" style="color: ${totalBottlenecks > 0 ? 'var(--warning)' : 'var(--success)'};">${totalBottlenecks}</div>
        <div class="kpi-label">Bottlenecks</div>
      </div>
    </div>

    <div class="table-box">
      <table>
        <thead>
          <tr>
            <th>Web Vital / Metric</th>
            <th>Measured Average</th>
            <th>Target Standard</th>
            <th>Assessment</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Time to First Byte (TTFB)</strong></td>
            <td>${avgTtfb} ms</td>
            <td>&le; 400 ms</td>
            <td><span style="color: ${avgTtfb <= 400 ? 'var(--success)' : 'var(--warning)'};">${avgTtfb <= 400 ? '✔ Fast' : '⚠ Optimize server / CDN'}</span></td>
          </tr>
          <tr>
            <td><strong>First Contentful Paint (FCP)</strong></td>
            <td>${avgFcp} s</td>
            <td>&le; 1.8 s</td>
            <td><span style="color: ${parseFloat(avgFcp) <= 1.8 ? 'var(--success)' : 'var(--warning)'};">${parseFloat(avgFcp) <= 1.8 ? '✔ Good' : '⚠ Defer non-critical CSS/JS'}</span></td>
          </tr>
          <tr>
            <td><strong>Total Page Load Time</strong></td>
            <td>${avgLoadTime} s</td>
            <td>&le; 3.0 s</td>
            <td><span style="color: ${parseFloat(avgLoadTime) <= 3.0 ? 'var(--success)' : 'var(--warning)'};">${parseFloat(avgLoadTime) <= 3.0 ? '✔ Fast' : '⚠ Reduce heavy scripts'}</span></td>
          </tr>
          <tr>
            <td><strong>Total Page Weight</strong></td>
            <td>${avgPayload} KB</td>
            <td>&le; 1500 KB (1.5MB)</td>
            <td><span style="color: ${avgPayload <= 1500 ? 'var(--success)' : 'var(--warning)'};">${avgPayload <= 1500 ? '✔ Optimal' : '⚠ Compress images & assets'}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
  }

  private static escapeCsv(str: string): string {
    if (str === null || str === undefined) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  }
}

