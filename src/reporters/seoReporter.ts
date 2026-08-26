import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import Table from 'cli-table3';
import ExcelJS from 'exceljs';
import { SeoMetadataResult } from '../types/audit.js';
import { getFunctionalReportDir } from '../utils/reportPathHelper.js';

export class SeoReporter {
  static async generateAll(
    results: SeoMetadataResult[],
    targetUrl: string,
    outputDir = './reports'
  ): Promise<{ htmlPath: string; excelPath: string; csvPath: string; jsonPath: string; summaryHtmlPath: string; summaryCsvPath: string }> {
    const targetDir = getFunctionalReportDir(outputDir, 'seo');
    await fs.mkdir(targetDir, { recursive: true });

    const safeUrl = targetUrl.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 35);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    const htmlPath = path.join(targetDir, `seo_report_${safeUrl}_${timestamp}.html`);
    const excelPath = path.join(targetDir, `seo_report_${safeUrl}_${timestamp}.xlsx`);
    const csvPath = path.join(targetDir, `seo_report_${safeUrl}_${timestamp}.csv`);
    const jsonPath = path.join(targetDir, `seo_report_${safeUrl}_${timestamp}.json`);
    const summaryCsvPath = path.join(targetDir, `summary_seo_report_${safeUrl}_${timestamp}.csv`);
    const summaryHtmlPath = path.join(targetDir, `summary_seo_report_${safeUrl}_${timestamp}.html`);

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
    results: SeoMetadataResult[],
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
    const missingTitleCount = results.filter((r) => r.titleStatus === 'missing').length;
    const missingDescCount = results.filter((r) => r.descriptionStatus === 'missing').length;
    const missingH1Count = results.filter((r) => r.headings.h1Status === 'missing').length;
    const missingCanonicalCount = results.filter((r) => r.canonicalStatus === 'missing').length;

    console.log('\n' + chalk.bold.cyan('='.repeat(95)));
    console.log(chalk.bold.cyan('        🔍 PAGE SENTINEL - SEO METADATA AUDIT REPORT'));
    console.log(chalk.bold.cyan('='.repeat(95)));

    console.log(`\n${chalk.bold('Target:')}        ${chalk.underline.blue(targetUrl)}`);
    console.log(`${chalk.bold('Pages Audited:')} ${chalk.white.bold(total)}`);
    console.log(
      `${chalk.bold('Average Score:')} ${this.formatScoreChalk(avgScore)} | Missing Title: ${chalk.red(missingTitleCount)} | Missing Desc: ${chalk.red(missingDescCount)} | Missing H1: ${chalk.red(missingH1Count)} | Missing Canonical: ${chalk.yellow(missingCanonicalCount)}`
    );

    // If single result, show rich SERP snippet
    if (results.length === 1) {
      const r = results[0];
      console.log('\n' + chalk.bold.yellow('📱 GOOGLE SERP PREVIEW:'));
      console.log(chalk.gray('------------------------------------------------------------'));
      console.log(chalk.blue.bold(r.title || '(No Title Set)'));
      console.log(chalk.green(r.url));
      console.log(chalk.white(r.description || '(No meta description configured for snippet)'));
      console.log(chalk.gray('------------------------------------------------------------'));
    }

    const table = new Table({
      head: [
        chalk.cyan.bold('Score'),
        chalk.cyan.bold('Page URL'),
        chalk.cyan.bold('Title Tag'),
        chalk.cyan.bold('Meta Description'),
        chalk.cyan.bold('H1 Tag'),
        chalk.cyan.bold('Canonical & OG')
      ],
      colWidths: [10, 24, 20, 22, 18, 16],
      wordWrap: true
    });

    for (const item of results.slice(0, 15)) {
      const titleSnippet = item.title ? `"${item.title.slice(0, 25)}..." (${item.titleLength} ch)` : chalk.red('MISSING');
      const descSnippet = item.description ? `"${item.description.slice(0, 25)}..." (${item.descriptionLength} ch)` : chalk.red('MISSING (0 ch)');
      const h1Snippet = item.headings.h1Count === 1 ? `✔ ${item.headings.h1[0]?.slice(0, 20)}` : (item.headings.h1Count === 0 ? chalk.red('MISSING') : chalk.yellow(`Multiple (${item.headings.h1Count})`));
      const canonSnippet = `Canon: ${item.canonicalStatus === 'valid' ? '✔' : (item.canonicalStatus === 'mismatch' ? '⚠' : '✖')}\nOG: ${item.openGraph.hasOgImage ? '✔' : '✖'}`;

      table.push([
        this.formatScoreChalk(item.score) + ` (${item.grade})`,
        chalk.white(item.url),
        titleSnippet,
        descSnippet,
        h1Snippet,
        canonSnippet
      ]);
    }

    console.log('\n' + table.toString());

    if (results.length > 15) {
      console.log(chalk.gray(`... and ${results.length - 15} more pages in full reports below.`));
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
    if (score >= 85) return chalk.green.bold(`${score}%`);
    if (score >= 70) return chalk.yellow.bold(`${score}%`);
    return chalk.red.bold(`${score}%`);
  }

  private static renderCsv(results: SeoMetadataResult[]): string {
    const rows: string[] = [];
    rows.push([
      'Page URL',
      'SEO Score',
      'SEO Grade',
      'Title Tag',
      'Title Length',
      'Title Status',
      'Meta Description',
      'Description Length',
      'Description Status',
      'Meta Keywords',
      'Canonical URL',
      'Canonical Status',
      'Robots Tag',
      'Is Indexable',
      'Is Followable',
      'H1 Tag Count',
      'H1 Text',
      'H2 Count',
      'H3 Count',
      'OpenGraph Title',
      'OpenGraph Description',
      'OpenGraph Image URL',
      'Twitter Card Type',
      'Structured Data Count',
      'Structured Data Types',
      'Word Count',
      'Charset',
      'Viewport Present',
      'HTML Lang',
      'Issues List',
      'Recommendations'
    ].map(this.escapeCsv).join(','));

    for (const r of results) {
      rows.push([
        r.url,
        String(r.score),
        r.grade,
        r.title,
        String(r.titleLength),
        r.titleStatus,
        r.description,
        String(r.descriptionLength),
        r.descriptionStatus,
        r.keywords || '',
        r.canonicalUrl || '',
        r.canonicalStatus,
        r.robots || '',
        r.isIndexable ? 'YES' : 'NO',
        r.isFollowable ? 'YES' : 'NO',
        String(r.headings.h1Count),
        r.headings.h1.join(' | '),
        String(r.headings.h2Count),
        String(r.headings.h3Count),
        r.openGraph.title || '',
        r.openGraph.description || '',
        r.openGraph.image || '',
        r.twitterCard.card || '',
        String(r.structuredData.schemaCount),
        r.structuredData.types.join(', '),
        String(r.technical.wordCount),
        r.technical.charset,
        r.technical.hasViewport ? 'YES' : 'NO',
        r.technical.lang,
        r.issues.join('; '),
        r.recommendations.join('; ')
      ].map(this.escapeCsv).join(','));
    }

    return rows.join('\r\n');
  }

  private static async generateExcel(results: SeoMetadataResult[], targetUrl: string, filePath: string): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Page Sentinel Auditor';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('SEO Metadata Audit', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    sheet.columns = [
      { header: 'Page URL', key: 'url', width: 40 },
      { header: 'Score', key: 'score', width: 10 },
      { header: 'Grade', key: 'grade', width: 10 },
      { header: 'Title Tag', key: 'title', width: 35 },
      { header: 'Title Chars', key: 'titleLen', width: 14 },
      { header: 'Title Status', key: 'titleStatus', width: 14 },
      { header: 'Meta Description', key: 'desc', width: 45 },
      { header: 'Desc Chars', key: 'descLen', width: 14 },
      { header: 'Desc Status', key: 'descStatus', width: 14 },
      { header: 'Canonical URL', key: 'canonical', width: 40 },
      { header: 'Canonical Status', key: 'canonStatus', width: 16 },
      { header: 'Robots Tag', key: 'robots', width: 20 },
      { header: 'H1 Count', key: 'h1Count', width: 12 },
      { header: 'H1 Content', key: 'h1Text', width: 30 },
      { header: 'OG Title', key: 'ogTitle', width: 25 },
      { header: 'OG Image', key: 'ogImage', width: 35 },
      { header: 'Twitter Card', key: 'twitterCard', width: 18 },
      { header: 'Schema Types', key: 'schemaTypes', width: 25 },
      { header: 'Word Count', key: 'wordCount', width: 14 },
      { header: 'Viewport?', key: 'viewport', width: 12 },
      { header: 'Lang', key: 'lang', width: 10 },
      { header: 'Identified Issues', key: 'issues', width: 40 },
      { header: 'SEO Action Plan / Recommendations', key: 'recommendations', width: 45 }
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

    for (const r of results) {
      const row = sheet.addRow({
        url: r.url,
        score: `${r.score}%`,
        grade: r.grade,
        title: r.title || '(Missing)',
        titleLen: r.titleLength,
        titleStatus: r.titleStatus,
        desc: r.description || '(Missing)',
        descLen: r.descriptionLength,
        descStatus: r.descriptionStatus,
        canonical: r.canonicalUrl || '(Missing)',
        canonStatus: r.canonicalStatus,
        robots: r.robots,
        h1Count: r.headings.h1Count,
        h1Text: r.headings.h1.join(' | '),
        ogTitle: r.openGraph.title || '',
        ogImage: r.openGraph.image || '',
        twitterCard: r.twitterCard.card || '',
        schemaTypes: r.structuredData.types.join(', ') || 'None',
        wordCount: r.technical.wordCount,
        viewport: r.technical.hasViewport ? 'YES' : 'NO',
        lang: r.technical.lang,
        issues: r.issues.join('\n'),
        recommendations: r.recommendations.join('\n')
      });

      if (r.score >= 85) {
        row.getCell('score').font = { color: { argb: 'FF10B981' }, bold: true };
      } else if (r.score >= 70) {
        row.getCell('score').font = { color: { argb: 'FFD97706' }, bold: true };
      } else {
        row.getCell('score').font = { color: { argb: 'FFFF0000' }, bold: true };
      }
    }

    await workbook.xlsx.writeFile(filePath);
  }

  private static renderHtml(results: SeoMetadataResult[], targetUrl: string): string {
    const total = results.length;
    const avgScore = total > 0 ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / total) : 0;
    const missingTitleCount = results.filter((r) => r.titleStatus === 'missing').length;
    const missingDescCount = results.filter((r) => r.descriptionStatus === 'missing').length;
    const missingH1Count = results.filter((r) => r.headings.h1Status === 'missing').length;

    const cardsHtml = results
      .map((r, i) => {
        const issuesList = r.issues.map((iss) => `<li style="color:#f87171; margin-bottom:4px;">✖ ${this.escapeHtml(iss)}</li>`).join('');
        const recList = r.recommendations.map((rec) => `<li style="color:#34d399; margin-bottom:4px;">💡 ${this.escapeHtml(rec)}</li>`).join('');

        let scoreColor = '#10b981';
        if (r.score < 55) scoreColor = '#ef4444';
        else if (r.score < 80) scoreColor = '#f59e0b';

        return `<div class="seo-card">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem;">
            <div>
              <span style="font-size:0.8rem; color:#9ca3af;">#${i + 1} PAGE</span>
              <h3 style="font-size:1.1rem; word-break:break-all;"><a href="${this.escapeHtml(r.url)}" target="_blank" style="color:#60a5fa; text-decoration:none;">${this.escapeHtml(r.url)}</a></h3>
            </div>
            <div style="text-align:right;">
              <span class="score-badge" style="background:${scoreColor}22; color:${scoreColor}; border:1px solid ${scoreColor};">${r.score}% (${r.grade})</span>
            </div>
          </div>

          <!-- SERP Snippet Preview -->
          <div class="serp-preview">
            <div class="serp-tag">GOOGLE SEARCH PREVIEW</div>
            <div class="serp-title">${this.escapeHtml(r.title || 'Untitled Page')}</div>
            <div class="serp-url">${this.escapeHtml(r.url)}</div>
            <div class="serp-desc">${this.escapeHtml(r.description || 'No description available for search engines. Add a meta description tag.')}</div>
          </div>

          <!-- Meta Key Info Grid -->
          <div class="meta-grid">
            <div class="meta-item">
              <div class="meta-label">TITLE TAG (${r.titleLength} chars)</div>
              <div class="meta-val">${this.escapeHtml(r.title || 'Missing')}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">META DESCRIPTION (${r.descriptionLength} chars)</div>
              <div class="meta-val">${this.escapeHtml(r.description || 'Missing')}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">H1 HEADINGS (${r.headings.h1Count})</div>
              <div class="meta-val">${this.escapeHtml(r.headings.h1.join(', ') || 'Missing')}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">CANONICAL & ROBOTS</div>
              <div class="meta-val">${this.escapeHtml(r.canonicalUrl || 'None')} (${this.escapeHtml(r.robots)})</div>
            </div>
          </div>

          <!-- OpenGraph Social Card Preview if present -->
          ${
            r.openGraph.hasOgTitle || r.openGraph.hasOgImage
              ? `<div class="social-preview">
              <div class="serp-tag">OPEN GRAPH SOCIAL PREVIEW</div>
              ${r.openGraph.image ? `<img src="${this.escapeHtml(r.openGraph.image)}" alt="OG Image Preview" style="max-height:140px; border-radius:6px; object-fit:cover; margin-bottom:8px; display:block;" onerror="this.style.display='none'">` : ''}
              <div style="font-weight:700; color:#f3f4f6;">${this.escapeHtml(r.openGraph.title || r.title)}</div>
              <div style="font-size:0.8rem; color:#9ca3af;">${this.escapeHtml(r.openGraph.description || r.description)}</div>
            </div>`
              : ''
          }

          <!-- Issues & Recommendations -->
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top:1rem;">
            <div style="background:#0f172a; padding:1rem; border-radius:8px; border:1px solid #334155;">
              <div style="font-size:0.75rem; font-weight:700; color:#f87171; text-transform:uppercase; margin-bottom:6px;">Issues Found (${r.issues.length})</div>
              <ul style="padding-left:1.2rem; font-size:0.82rem;">${issuesList || '<li style="color:#9ca3af;">No critical issues detected.</li>'}</ul>
            </div>
            <div style="background:#0f172a; padding:1rem; border-radius:8px; border:1px solid #334155;">
              <div style="font-size:0.75rem; font-weight:700; color:#34d399; text-transform:uppercase; margin-bottom:6px;">Actionable Fix Recommendations (${r.recommendations.length})</div>
              <ul style="padding-left:1.2rem; font-size:0.82rem;">${recList || '<li style="color:#9ca3af;">Page adheres to SEO best practices!</li>'}</ul>
            </div>
          </div>
        </div>`;
      })
      .join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SEO Metadata & Audit Dashboard - ${this.escapeHtml(targetUrl)}</title>
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
    .seo-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem; }
    .score-badge { padding: 0.4rem 0.8rem; border-radius: 8px; font-weight: 800; font-size: 1rem; }
    .serp-preview { background: #0f172a; border: 1px solid var(--border); border-radius: 10px; padding: 1rem; margin: 1rem 0; font-family: Arial, sans-serif; }
    .serp-tag { font-size: 0.7rem; font-weight: 700; color: #94a3b8; margin-bottom: 0.4rem; letter-spacing: 0.05em; }
    .serp-title { color: #8ab4f8; font-size: 1.15rem; line-height: 1.3; font-weight: 400; margin-bottom: 2px; }
    .serp-url { color: #bdc1c6; font-size: 0.8rem; margin-bottom: 4px; }
    .serp-desc { color: #d1d5db; font-size: 0.85rem; line-height: 1.4; }
    .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 0.75rem; margin: 1rem 0; }
    .meta-item { background: #0f172a; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid var(--border); }
    .meta-label { font-size: 0.7rem; font-weight: 700; color: var(--text-muted); margin-bottom: 4px; }
    .meta-val { font-size: 0.85rem; word-break: break-all; }
    .social-preview { background: #0f172a; border: 1px solid var(--border); border-radius: 10px; padding: 1rem; margin: 1rem 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="font-size: 1.8rem; margin-bottom: 0.5rem;">🔍 SEO Meta Data & Snippet Audit Dashboard</h1>
      <p style="color: var(--text-muted);">Target: <a href="${this.escapeHtml(targetUrl)}" target="_blank" style="color: #60a5fa;">${this.escapeHtml(targetUrl)}</a> | Generated on ${new Date().toLocaleString()}</p>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div style="color: var(--text-muted); font-size: 0.85rem;">TOTAL PAGES AUDITED</div>
        <div class="kpi-val" style="color: #60a5fa;">${total}</div>
      </div>
      <div class="kpi-card">
        <div style="color: var(--text-muted); font-size: 0.85rem;">AVG SEO HEALTH SCORE</div>
        <div class="kpi-val" style="color: ${avgScore >= 80 ? 'var(--success)' : avgScore >= 60 ? 'var(--warning)' : 'var(--danger)'};">${avgScore}%</div>
      </div>
      <div class="kpi-card">
        <div style="color: var(--text-muted); font-size: 0.85rem;">PAGES MISSING TITLE</div>
        <div class="kpi-val" style="color: ${missingTitleCount > 0 ? 'var(--danger)' : 'var(--success)'};">${missingTitleCount}</div>
      </div>
      <div class="kpi-card">
        <div style="color: var(--text-muted); font-size: 0.85rem;">PAGES MISSING DESC</div>
        <div class="kpi-val" style="color: ${missingDescCount > 0 ? 'var(--danger)' : 'var(--success)'};">${missingDescCount}</div>
      </div>
      <div class="kpi-card">
        <div style="color: var(--text-muted); font-size: 0.85rem;">PAGES MISSING H1</div>
        <div class="kpi-val" style="color: ${missingH1Count > 0 ? 'var(--danger)' : 'var(--success)'};">${missingH1Count}</div>
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

  private static renderSummaryCsv(results: SeoMetadataResult[], targetUrl: string): string {
    const total = results.length;
    const avgScore = total > 0 ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / total) : 0;
    const missingTitleCount = results.filter((r) => r.titleStatus === 'missing').length;
    const missingDescCount = results.filter((r) => r.descriptionStatus === 'missing').length;
    const missingH1Count = results.filter((r) => r.headings.h1Count === 0).length;
    const missingCanonCount = results.filter((r) => r.canonicalStatus === 'missing').length;
    const missingOgImageCount = results.filter((r) => !r.openGraph.hasOgImage).length;

    let overallGrade = 'F';
    if (avgScore >= 95) overallGrade = 'A+';
    else if (avgScore >= 85) overallGrade = 'A';
    else if (avgScore >= 70) overallGrade = 'B';
    else if (avgScore >= 55) overallGrade = 'C';
    else if (avgScore >= 40) overallGrade = 'D';

    const rows = [
      ['Metric / KPI', 'Value', 'Status / Recommendation'].map(this.escapeCsv).join(','),
      ['Target Domain / Input', targetUrl, ''].map(this.escapeCsv).join(','),
      ['Audit Timestamp', new Date().toISOString(), ''].map(this.escapeCsv).join(','),
      ['Total Pages Audited', String(total), ''].map(this.escapeCsv).join(','),
      ['Average SEO Score', `${avgScore}% (Grade ${overallGrade})`, avgScore >= 85 ? 'Good SEO Health' : 'Needs Optimization'].map(this.escapeCsv).join(','),
      ['Missing <title> Tags', String(missingTitleCount), missingTitleCount > 0 ? 'Fix: Add unique title tags' : 'Optimal'].map(this.escapeCsv).join(','),
      ['Missing Meta Descriptions', String(missingDescCount), missingDescCount > 0 ? 'Fix: Add meta description snippets' : 'Optimal'].map(this.escapeCsv).join(','),
      ['Missing <h1> Headings', String(missingH1Count), missingH1Count > 0 ? 'Fix: Add primary <h1> heading' : 'Optimal'].map(this.escapeCsv).join(','),
      ['Missing Canonical Tags', String(missingCanonCount), missingCanonCount > 0 ? 'Fix: Add self-referencing canonicals' : 'Optimal'].map(this.escapeCsv).join(','),
      ['Missing OpenGraph Images', String(missingOgImageCount), missingOgImageCount > 0 ? 'Fix: Add og:image for social cards' : 'Optimal'].map(this.escapeCsv).join(',')
    ];

    return rows.join('\r\n');
  }

  private static renderSummaryHtml(results: SeoMetadataResult[], targetUrl: string): string {
    const total = results.length;
    const avgScore = total > 0 ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / total) : 0;
    const missingTitleCount = results.filter((r) => r.titleStatus === 'missing').length;
    const missingDescCount = results.filter((r) => r.descriptionStatus === 'missing').length;
    const missingH1Count = results.filter((r) => r.headings.h1Count === 0).length;
    const missingCanonCount = results.filter((r) => r.canonicalStatus === 'missing').length;
    const missingOgImageCount = results.filter((r) => !r.openGraph.hasOgImage).length;

    let overallGrade = 'F';
    let gradeColor = 'var(--danger)';
    if (avgScore >= 95) { overallGrade = 'A+'; gradeColor = 'var(--success)'; }
    else if (avgScore >= 85) { overallGrade = 'A'; gradeColor = 'var(--success)'; }
    else if (avgScore >= 70) { overallGrade = 'B'; gradeColor = 'var(--warning)'; }
    else if (avgScore >= 55) { overallGrade = 'C'; gradeColor = '#f97316'; }
    else if (avgScore >= 40) { overallGrade = 'D'; gradeColor = 'var(--danger)'; }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SEO Metadata Executive Summary - ${this.escapeHtml(targetUrl)}</title>
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
      <h1>📈 SEO Metadata & Social Optimization Summary</h1>
      <div class="url">${this.escapeHtml(targetUrl)}</div>
    </div>

    <div class="grid">
      <div class="kpi-card">
        <div class="kpi-val" style="color: ${gradeColor};">${avgScore}%</div>
        <div class="kpi-label">SEO Score (${overallGrade})</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" style="color: var(--primary);">${total}</div>
        <div class="kpi-label">Pages Audited</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" style="color: ${missingTitleCount > 0 ? 'var(--danger)' : 'var(--success)'};">${missingTitleCount}</div>
        <div class="kpi-label">Missing Title</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" style="color: ${missingDescCount > 0 ? 'var(--danger)' : 'var(--success)'};">${missingDescCount}</div>
        <div class="kpi-label">Missing Description</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" style="color: ${missingH1Count > 0 ? 'var(--warning)' : 'var(--success)'};">${missingH1Count}</div>
        <div class="kpi-label">Missing H1</div>
      </div>
    </div>

    <div class="table-box">
      <table>
        <thead>
          <tr>
            <th>SEO Dimension</th>
            <th>Pages Missing / Issue Count</th>
            <th>Impact Level</th>
            <th>Recommendation</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Page Title (<title>)</strong></td>
            <td>${missingTitleCount} / ${total} pages</td>
            <td><span style="color: ${missingTitleCount > 0 ? 'var(--danger)' : 'var(--success)'};">${missingTitleCount > 0 ? 'High' : 'Optimal'}</span></td>
            <td>${missingTitleCount > 0 ? 'Add unique titles between 30-60 characters.' : 'All titles present and optimal.'}</td>
          </tr>
          <tr>
            <td><strong>Meta Description</strong></td>
            <td>${missingDescCount} / ${total} pages</td>
            <td><span style="color: ${missingDescCount > 0 ? 'var(--danger)' : 'var(--success)'};">${missingDescCount > 0 ? 'High' : 'Optimal'}</span></td>
            <td>${missingDescCount > 0 ? 'Add compelling descriptions between 70-160 characters.' : 'All descriptions present.'}</td>
          </tr>
          <tr>
            <td><strong>Heading 1 (<h1>)</strong></td>
            <td>${missingH1Count} / ${total} pages</td>
            <td><span style="color: ${missingH1Count > 0 ? 'var(--warning)' : 'var(--success)'};">${missingH1Count > 0 ? 'Medium' : 'Optimal'}</span></td>
            <td>${missingH1Count > 0 ? 'Ensure exactly one <h1> tag exists per page.' : 'Heading structure valid.'}</td>
          </tr>
          <tr>
            <td><strong>Canonical Link</strong></td>
            <td>${missingCanonCount} / ${total} pages</td>
            <td><span style="color: ${missingCanonCount > 0 ? 'var(--warning)' : 'var(--success)'};">${missingCanonCount > 0 ? 'Medium' : 'Optimal'}</span></td>
            <td>${missingCanonCount > 0 ? 'Add self-referencing canonical URL tag.' : 'Canonical tags configured.'}</td>
          </tr>
          <tr>
            <td><strong>OpenGraph Social Preview</strong></td>
            <td>${missingOgImageCount} / ${total} pages</td>
            <td><span style="color: ${missingOgImageCount > 0 ? 'var(--warning)' : 'var(--success)'};">${missingOgImageCount > 0 ? 'Low-Medium' : 'Optimal'}</span></td>
            <td>${missingOgImageCount > 0 ? 'Add og:image for rich social sharing cards.' : 'OpenGraph images configured.'}</td>
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

