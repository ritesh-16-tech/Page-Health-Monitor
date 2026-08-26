import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import Table from 'cli-table3';
import ExcelJS from 'exceljs';
import { getFunctionalReportDir } from '../utils/reportPathHelper.js';
export class StatusReporter {
    static async generateAll(results, targetUrl, outputDir = './reports') {
        const targetDir = getFunctionalReportDir(outputDir, 'status');
        await fs.mkdir(targetDir, { recursive: true });
        const safeUrl = targetUrl.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 35);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const htmlPath = path.join(targetDir, `page_status_${safeUrl}_${timestamp}.html`);
        const excelPath = path.join(targetDir, `page_status_${safeUrl}_${timestamp}.xlsx`);
        const csvPath = path.join(targetDir, `page_status_${safeUrl}_${timestamp}.csv`);
        const jsonPath = path.join(targetDir, `page_status_${safeUrl}_${timestamp}.json`);
        await fs.writeFile(htmlPath, this.renderHtml(results, targetUrl), 'utf-8');
        await fs.writeFile(csvPath, this.renderCsv(results), 'utf-8');
        await fs.writeFile(jsonPath, JSON.stringify({ targetUrl, timestamp: new Date().toISOString(), total: results.length, results }, null, 2), 'utf-8');
        await this.generateExcel(results, targetUrl, excelPath);
        return {
            htmlPath: path.resolve(htmlPath),
            excelPath: path.resolve(excelPath),
            csvPath: path.resolve(csvPath),
            jsonPath: path.resolve(jsonPath)
        };
    }
    static printTerminal(results, targetUrl, htmlPath, excelPath, csvPath, jsonPath) {
        const total = results.length;
        const count200 = results.filter((r) => r.httpStatus === 200).length;
        const count3xx = results.filter((r) => r.isRedirect).length;
        const count404 = results.filter((r) => r.is404).length;
        const count5xx = results.filter((r) => r.httpStatus >= 500).length;
        const countOther = results.filter((r) => r.isError && !r.is404 && r.httpStatus < 500).length;
        console.log('\n' + chalk.bold.cyan('='.repeat(95)));
        console.log(chalk.bold.cyan('        🌐 PAGE SENTINEL - 404 FINDER & PAGE STATUS AUDIT REPORT'));
        console.log(chalk.bold.cyan('='.repeat(95)));
        console.log(`\n${chalk.bold('Target:')}        ${chalk.underline.blue(targetUrl)}`);
        console.log(`${chalk.bold('Total Checked:')} ${chalk.white.bold(total)} pages`);
        console.log(`${chalk.bold('Status Stats:')}  ${chalk.green.bold(`200 OK: ${count200}`)} | ${chalk.yellow.bold(`3xx Redirects: ${count3xx}`)} | ${chalk.red.bold(`404 Not Found: ${count404}`)} | ${chalk.red.bold(`5xx Errors: ${count5xx}`)} | ${chalk.magenta.bold(`Other Errors: ${countOther}`)}`);
        // Summary Table
        const table = new Table({
            head: [
                chalk.cyan.bold('Status Code'),
                chalk.cyan.bold('Page URL'),
                chalk.cyan.bold('Latency'),
                chalk.cyan.bold('Redirect / Final URL'),
                chalk.cyan.bold('Reason & Suggested Fix')
            ],
            colWidths: [14, 30, 10, 24, 26],
            wordWrap: true
        });
        const notable = results.filter((r) => r.is404 || r.isError || r.isRedirect);
        const displayList = notable.length > 0 ? notable : results.slice(0, 20);
        for (const item of displayList.slice(0, 25)) {
            let statusColor = chalk.green;
            if (item.is404 || item.httpStatus >= 500 || item.httpStatus === 0)
                statusColor = chalk.red.bold;
            else if (item.isRedirect)
                statusColor = chalk.yellow.bold;
            const hops = item.redirectHops.length > 0 ? `Redirect (${item.redirectHops.length} hops)\n-> ${item.finalUrl}` : 'Direct';
            table.push([
                statusColor(`${item.httpStatus || 'FAIL'} ${item.statusText}`),
                item.url,
                `${item.responseTimeMs}ms`,
                hops,
                item.suggestedFix || item.reason || 'Status Normal (200 OK)'
            ]);
        }
        console.log('\n' + table.toString());
        if (count404 > 0) {
            console.log(chalk.red.bold(`\n✖ CRITICAL: Found ${count404} broken / 404 page(s)! Review report for fixes.`));
        }
        else {
            console.log(chalk.green.bold('\n✔ No 404 broken pages detected!'));
        }
        if (htmlPath)
            console.log(`${chalk.bold('Interactive HTML Dashboard:')} ${chalk.green.underline(htmlPath)}`);
        if (excelPath)
            console.log(`${chalk.bold('Excel (.xlsx) Report:')}        ${chalk.green.underline(excelPath)}`);
        if (csvPath)
            console.log(`${chalk.bold('CSV Report:')}                 ${chalk.green.underline(csvPath)}`);
        if (jsonPath)
            console.log(`${chalk.bold('JSON Data Export:')}          ${chalk.green.underline(jsonPath)}`);
        console.log(chalk.bold.cyan('='.repeat(95)) + '\n');
    }
    static renderCsv(results) {
        const rows = [];
        rows.push([
            'Page URL',
            'HTTP Status',
            'Status Text',
            'Is 404',
            'Is Redirect',
            'Redirect Hops Count',
            'Final Destination URL',
            'Response Latency (ms)',
            'Content Type',
            'Content Length (Bytes)',
            'Page Title',
            'Error Code',
            'Failure Reason',
            'Suggested Fix'
        ].map(this.escapeCsv).join(','));
        for (const r of results) {
            rows.push([
                r.url,
                String(r.httpStatus),
                r.statusText,
                r.is404 ? 'YES' : 'NO',
                r.isRedirect ? 'YES' : 'NO',
                String(r.redirectHops.length),
                r.finalUrl,
                String(r.responseTimeMs),
                r.contentType,
                String(r.contentLength),
                r.pageTitle || '',
                r.errorCode || '',
                r.reason || '',
                r.suggestedFix || ''
            ].map(this.escapeCsv).join(','));
        }
        return rows.join('\r\n');
    }
    static async generateExcel(results, targetUrl, filePath) {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Page Sentinel Auditor';
        workbook.created = new Date();
        const sheet = workbook.addWorksheet('Page Status & 404 Report', {
            views: [{ state: 'frozen', ySplit: 1 }]
        });
        sheet.columns = [
            { header: 'Page URL', key: 'url', width: 45 },
            { header: 'Status Code', key: 'httpStatus', width: 14 },
            { header: 'Status Text', key: 'statusText', width: 20 },
            { header: 'Is 404?', key: 'is404', width: 12 },
            { header: 'Is Redirect?', key: 'isRedirect', width: 14 },
            { header: 'Latency (ms)', key: 'responseTimeMs', width: 14 },
            { header: 'Final Destination URL', key: 'finalUrl', width: 45 },
            { header: 'Redirect Hops', key: 'hops', width: 18 },
            { header: 'Content Type', key: 'contentType', width: 25 },
            { header: 'Page Title', key: 'pageTitle', width: 35 },
            { header: 'Error Code', key: 'errorCode', width: 20 },
            { header: 'Failure Reason', key: 'reason', width: 35 },
            { header: 'Suggested Fix Action', key: 'suggestedFix', width: 40 }
        ];
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
        for (const r of results) {
            const row = sheet.addRow({
                url: r.url,
                httpStatus: r.httpStatus,
                statusText: r.statusText,
                is404: r.is404 ? 'YES' : 'NO',
                isRedirect: r.isRedirect ? 'YES' : 'NO',
                responseTimeMs: r.responseTimeMs,
                finalUrl: r.finalUrl,
                hops: r.redirectHops.map((h) => `${h.status}`).join(' -> ') || 'Direct',
                contentType: r.contentType,
                pageTitle: r.pageTitle || '',
                errorCode: r.errorCode || (r.httpStatus === 200 ? 'OK' : ''),
                reason: r.reason || '',
                suggestedFix: r.suggestedFix || ''
            });
            if (r.is404 || r.httpStatus >= 500 || r.httpStatus === 0) {
                row.getCell('httpStatus').font = { color: { argb: 'FFFF0000' }, bold: true };
                row.getCell('is404').font = { color: { argb: 'FFFF0000' }, bold: true };
            }
            else if (r.isRedirect) {
                row.getCell('httpStatus').font = { color: { argb: 'FFD97706' }, bold: true };
            }
            else if (r.httpStatus === 200) {
                row.getCell('httpStatus').font = { color: { argb: 'FF10B981' }, bold: true };
            }
        }
        await workbook.xlsx.writeFile(filePath);
    }
    static renderHtml(results, targetUrl) {
        const total = results.length;
        const count200 = results.filter((r) => r.httpStatus === 200).length;
        const count3xx = results.filter((r) => r.isRedirect).length;
        const count404 = results.filter((r) => r.is404).length;
        const count5xx = results.filter((r) => r.httpStatus >= 500).length;
        const countOther = results.filter((r) => r.isError && !r.is404 && r.httpStatus < 500).length;
        const rowsHtml = results
            .map((r, i) => {
            let badgeClass = 'badge-success';
            let filterCategory = '200';
            if (r.is404) {
                badgeClass = 'badge-danger';
                filterCategory = '404';
            }
            else if (r.httpStatus >= 500 || r.httpStatus === 0) {
                badgeClass = 'badge-danger';
                filterCategory = '5xx';
            }
            else if (r.isRedirect) {
                badgeClass = 'badge-warning';
                filterCategory = '3xx';
            }
            else if (r.httpStatus >= 400) {
                badgeClass = 'badge-danger';
                filterCategory = 'other';
            }
            const hopsText = r.redirectHops.length > 0 ? `<div style="font-size:0.75rem; color:#9ca3af;">${r.redirectHops.map(h => `${h.status}`).join(' &rarr; ')}</div><div style="font-size:0.75rem; color:#60a5fa; word-break:break-all;">&rarr; ${this.escapeHtml(r.finalUrl)}</div>` : '<span style="color:#6b7280;">Direct</span>';
            return `<tr data-category="${filterCategory}">
          <td>${i + 1}</td>
          <td><span class="badge ${badgeClass}">${r.httpStatus || 'FAIL'} ${this.escapeHtml(r.statusText)}</span></td>
          <td style="max-width:320px; word-break:break-all;"><a href="${this.escapeHtml(r.url)}" target="_blank" style="color:#60a5fa;">${this.escapeHtml(r.url)}</a></td>
          <td><strong>${r.responseTimeMs}ms</strong></td>
          <td>${hopsText}</td>
          <td style="font-size:0.8rem; color:#d1d5db;">${this.escapeHtml(r.contentType.split(';')[0] || '-')}</td>
          <td style="font-size:0.8rem; color:#9ca3af;">${this.escapeHtml(r.pageTitle || '-')}</td>
          <td style="font-size:0.8rem; color:#f87171;">${this.escapeHtml(r.reason || '-')}</td>
          <td style="font-size:0.8rem; color:#34d399;">${this.escapeHtml(r.suggestedFix || 'None needed')}</td>
        </tr>`;
        })
            .join('\n');
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Page Status & 404 Audit Report - ${this.escapeHtml(targetUrl)}</title>
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
    .container { max-width: 1500px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid var(--border); border-radius: 16px; padding: 2rem; margin-bottom: 2rem; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .kpi-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 1.25rem; text-align: center; }
    .kpi-val { font-size: 2rem; font-weight: 800; margin-top: 0.5rem; }
    .table-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; padding: 1.5rem; overflow-x: auto; }
    .filter-bar { display: flex; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap; align-items: center; }
    .filter-btn { background: #334155; border: none; color: white; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.85rem; }
    .filter-btn.active { background: var(--primary); }
    .search-input { background: #0f172a; border: 1px solid var(--border); color: white; padding: 0.5rem 1rem; border-radius: 8px; flex: 1; min-width: 250px; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { background: #0f172a; padding: 0.75rem 1rem; font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted); border-bottom: 1px solid var(--border); }
    td { padding: 0.85rem 1rem; border-bottom: 1px solid var(--border); font-size: 0.85rem; }
    tr:hover td { background: rgba(255,255,255,0.02); }
    .badge { display: inline-block; padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; }
    .badge-success { background: rgba(16,185,129,0.2); color: #34d399; }
    .badge-warning { background: rgba(245,158,11,0.2); color: #fbbf24; }
    .badge-danger { background: rgba(239,68,68,0.2); color: #f87171; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="font-size: 1.8rem; margin-bottom: 0.5rem;">🔍 404 Finder & Page Status Audit Dashboard</h1>
      <p style="color: var(--text-muted);">Target: <a href="${this.escapeHtml(targetUrl)}" target="_blank" style="color: #60a5fa;">${this.escapeHtml(targetUrl)}</a> | Generated on ${new Date().toLocaleString()}</p>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div style="color: var(--text-muted); font-size: 0.85rem;">TOTAL PAGES TESTED</div>
        <div class="kpi-val" style="color: #60a5fa;">${total}</div>
      </div>
      <div class="kpi-card">
        <div style="color: var(--text-muted); font-size: 0.85rem;">200 OK (HEALTHY)</div>
        <div class="kpi-val" style="color: var(--success);">${count200}</div>
      </div>
      <div class="kpi-card">
        <div style="color: var(--text-muted); font-size: 0.85rem;">3xx REDIRECTS</div>
        <div class="kpi-val" style="color: var(--warning);">${count3xx}</div>
      </div>
      <div class="kpi-card">
        <div style="color: var(--text-muted); font-size: 0.85rem;">404 NOT FOUND</div>
        <div class="kpi-val" style="color: var(--danger);">${count404}</div>
      </div>
      <div class="kpi-card">
        <div style="color: var(--text-muted); font-size: 0.85rem;">5xx SERVER ERRORS</div>
        <div class="kpi-val" style="color: var(--danger);">${count5xx}</div>
      </div>
    </div>

    <div class="table-card">
      <div class="filter-bar">
        <button class="filter-btn active" onclick="filterCategory('all', this)">All Pages (${total})</button>
        <button class="filter-btn" onclick="filterCategory('404', this)">404 Not Found (${count404})</button>
        <button class="filter-btn" onclick="filterCategory('3xx', this)">Redirects (${count3xx})</button>
        <button class="filter-btn" onclick="filterCategory('5xx', this)">5xx Errors (${count5xx})</button>
        <button class="filter-btn" onclick="filterCategory('200', this)">200 OK (${count200})</button>
        <input type="text" class="search-input" id="search" placeholder="Search page URLs, status, or issues..." onkeyup="filterSearch()">
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Status</th>
            <th>Page URL</th>
            <th>Latency</th>
            <th>Redirection / Hops</th>
            <th>Content-Type</th>
            <th>Page Title</th>
            <th>Reason</th>
            <th>Suggested Fix</th>
          </tr>
        </thead>
        <tbody id="tableBody">
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  </div>

  <script>
    let currentCat = 'all';
    function filterCategory(cat, btn) {
      currentCat = cat;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterSearch();
    }

    function filterSearch() {
      const q = document.getElementById('search').value.toLowerCase();
      const rows = document.querySelectorAll('#tableBody tr');
      rows.forEach(r => {
        const cat = r.getAttribute('data-category');
        const text = r.innerText.toLowerCase();
        const matchesCat = currentCat === 'all' || cat === currentCat;
        const matchesQuery = text.includes(q);
        r.style.display = (matchesCat && matchesQuery) ? '' : 'none';
      });
    }
  </script>
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
