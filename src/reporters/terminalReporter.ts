import chalk from 'chalk';
import Table from 'cli-table3';
import { AuditResult } from '../types/audit.js';

export class TerminalReporter {
  static print(
    result: AuditResult,
    htmlReportPath?: string,
    jsonReportPath?: string,
    csvReportPath?: string,
    excelReportPath?: string,
    summaryCsvPath?: string,
    summaryHtmlPath?: string
  ): void {
    const { summary, actionableFixes, networkTraffic, focus = 'all', pageStatus, seoMetadata, pageSpeed } = result;

    const focusLabels: Record<string, string> = {
      image: '🖼️  ONLY IMAGES',
      link: '🔗 ONLY HYPERLINKS / LINKS',
      api: '⚡ ONLY NETWORK & API CALLS',
      status: '🔍 404 FINDER & PAGE STATUS',
      seo: '📈 SEO META DATA & SOCIAL AUDIT',
      speed: '⚡ PAGE SPEED & WEB PERFORMANCE',
      all: '🛡️  ALL DIAGNOSTICS (Images + Links + APIs + Status + SEO + Speed + Fonts + Console)'
    };

    console.log('\n' + chalk.bold.cyan('='.repeat(95)));
    console.log(chalk.bold.cyan('        🌐 PAGE SENTINEL - UNIVERSAL WEB HEALTH & DIAGNOSTIC AUDIT'));
    console.log(chalk.bold.cyan('='.repeat(95)));

    console.log(`\n${chalk.bold('Target URL:')}    ${chalk.underline.blue(result.targetUrl)}`);
    console.log(`${chalk.bold('Final URL:')}     ${chalk.underline.blue(result.finalPageUrl)}`);
    console.log(`${chalk.bold('Page Title:')}    ${chalk.white(result.pageTitle || '(No title)')}`);
    console.log(`${chalk.bold('Status Code:')}   ${result.httpStatus === 200 ? chalk.green.bold('200 OK') : (result.httpStatus === 404 ? chalk.red.bold('404 NOT FOUND') : chalk.yellow.bold(`HTTP ${result.httpStatus}`))}`);
    console.log(`${chalk.bold('Focus Mode:')}    ${chalk.bold.magenta(focusLabels[focus] || focus.toUpperCase())}`);
    console.log(`${chalk.bold('Scan Time:')}     ${chalk.yellow((result.durationMs / 1000).toFixed(2) + 's')} | ${result.scanTimestamp}`);

    // Summary Card Table
    const summaryTable = new Table({
      head: [
        chalk.cyan.bold('Diagnostic Area'),
        chalk.cyan.bold('Tested / Value'),
        chalk.red.bold('Errors / Issues'),
        chalk.yellow.bold('Warnings'),
        chalk.green.bold('Healthy / Score')
      ],
      colWidths: [24, 20, 18, 16, 17]
    });

    // 1. Status Check
    if (pageStatus && (focus === 'all' || focus === 'status')) {
      const statusHealthy = pageStatus.httpStatus === 200 ? '200 OK' : 'Non-200';
      summaryTable.push([
        'Page HTTP Status & 404',
        `${pageStatus.httpStatus} ${pageStatus.statusText}`,
        pageStatus.is404 || pageStatus.httpStatus >= 500 ? chalk.red.bold('CRITICAL') : chalk.green('0'),
        pageStatus.isRedirect ? chalk.yellow('Redirect') : '0',
        pageStatus.httpStatus === 200 ? chalk.green(statusHealthy) : chalk.red(statusHealthy)
      ]);
    }

    // 2. SEO Metadata
    if (seoMetadata && (focus === 'all' || focus === 'seo')) {
      summaryTable.push([
        'SEO Metadata Health',
        `Score: ${seoMetadata.score}% (${seoMetadata.grade})`,
        seoMetadata.issues.length > 0 ? chalk.yellow(`${seoMetadata.issues.length} issues`) : chalk.green('0'),
        seoMetadata.titleStatus !== 'optimal' || seoMetadata.descriptionStatus !== 'optimal' ? chalk.yellow('Needs review') : '0',
        seoMetadata.score >= 80 ? chalk.green(`${seoMetadata.score}%`) : (seoMetadata.score >= 60 ? chalk.yellow(`${seoMetadata.score}%`) : chalk.red(`${seoMetadata.score}%`))
      ]);
    }

    // 3. Page Speed & Performance
    if (pageSpeed && (focus === 'all' || focus === 'speed')) {
      summaryTable.push([
        'Page Speed / Web Vitals',
        `Load: ${(pageSpeed.metrics.loadCompleteMs / 1000).toFixed(2)}s | TTFB: ${pageSpeed.metrics.ttfbMs}ms`,
        pageSpeed.bottlenecks.filter((b) => b.severity === 'Critical').length > 0 ? chalk.red.bold(pageSpeed.bottlenecks.filter((b) => b.severity === 'Critical').length) : chalk.green('0'),
        pageSpeed.bottlenecks.filter((b) => b.severity === 'Warning').length > 0 ? chalk.yellow(pageSpeed.bottlenecks.filter((b) => b.severity === 'Warning').length) : '0',
        pageSpeed.score >= 80 ? chalk.green(`${pageSpeed.score}% (${pageSpeed.rating})`) : chalk.yellow(`${pageSpeed.score}% (${pageSpeed.rating})`)
      ]);
    }

    // 4. Network Traffic
    if (focus === 'all' || focus === 'api') {
      summaryTable.push(
        [
          'Network Traffic',
          `${summary.network.total} requests`,
          summary.network.failed > 0 ? chalk.red.bold(summary.network.failed) : chalk.green('0'),
          '0',
          chalk.green(summary.network.total - summary.network.failed)
        ],
        [
          '  └ Dynamic APIs',
          `${summary.network.apis} calls`,
          summary.network.failedApis > 0 ? chalk.red.bold(summary.network.failedApis) : chalk.green('0'),
          '0',
          chalk.green(summary.network.apis - summary.network.failedApis)
        ]
      );
    }

    // 5. Images
    if (focus === 'all' || focus === 'image') {
      summaryTable.push([
        'Image Assets',
        `${summary.images.total} images`,
        summary.images.broken > 0 ? chalk.red.bold(summary.images.broken) : chalk.green('0'),
        summary.images.missingAlt > 0 ? chalk.yellow(`${summary.images.missingAlt} no-alt`) : '0',
        chalk.green(summary.images.total - summary.images.broken)
      ]);
    }

    // 6. Links
    if (focus === 'all' || focus === 'link') {
      summaryTable.push([
        'Hyperlinks & Nav',
        `${summary.links.total} links`,
        summary.links.broken > 0 ? chalk.red.bold(summary.links.broken) : chalk.green('0'),
        summary.links.redirected > 0 ? chalk.yellow(`${summary.links.redirected} redirect`) : '0',
        chalk.green(summary.links.total - summary.links.broken)
      ]);
    }

    // 7. Console
    if (focus === 'all') {
      summaryTable.push([
        'Console / JS Engine',
        `${summary.console.total} logs`,
        summary.console.errors > 0 ? chalk.red.bold(summary.console.errors) : chalk.green('0'),
        summary.console.warnings > 0 ? chalk.yellow(`${summary.console.warnings} warnings`) : '0',
        summary.console.errors === 0 ? chalk.green('Clean') : chalk.red('Errors')
      ]);
    }

    console.log('\n' + summaryTable.toString());

    // Deep-dive sections
    // 1. SEO Summary Section
    if (seoMetadata && (focus === 'all' || focus === 'seo')) {
      console.log('\n' + chalk.bold.cyan(`🔍 SEO METADATA INSPECTOR (Score: ${seoMetadata.score}% - Grade ${seoMetadata.grade})`));
      console.log(chalk.gray('-----------------------------------------------------------------------------------------------'));
      console.log(`  ${chalk.bold('Title Tag:')}      ${seoMetadata.title ? chalk.white(seoMetadata.title) : chalk.red('MISSING')} (${seoMetadata.titleLength} chars - ${seoMetadata.titleStatus})`);
      console.log(`  ${chalk.bold('Description:')}    ${seoMetadata.description ? chalk.white(seoMetadata.description) : chalk.red('MISSING')} (${seoMetadata.descriptionLength} chars - ${seoMetadata.descriptionStatus})`);
      console.log(`  ${chalk.bold('H1 Headings:')}    ${seoMetadata.headings.h1Count === 1 ? chalk.green(`✔ ${seoMetadata.headings.h1[0]}`) : (seoMetadata.headings.h1Count === 0 ? chalk.red('✖ Missing <h1>') : chalk.yellow(`⚠ ${seoMetadata.headings.h1Count} tags`))}`);
      console.log(`  ${chalk.bold('Canonical:')}      ${seoMetadata.canonicalUrl ? chalk.green(seoMetadata.canonicalUrl) : chalk.yellow('Missing')} | Robots: ${chalk.white(seoMetadata.robots)}`);
      console.log(`  ${chalk.bold('Social Tags:')}    OG Title: ${seoMetadata.openGraph.hasOgTitle ? chalk.green('✔') : chalk.red('✖')} | OG Image: ${seoMetadata.openGraph.hasOgImage ? chalk.green('✔') : chalk.red('✖')} | Twitter: ${seoMetadata.twitterCard.hasTwitterCard ? chalk.green('✔') : chalk.red('✖')}`);
      console.log(chalk.gray('-----------------------------------------------------------------------------------------------'));
    }

    // 2. Page Speed Section
    if (pageSpeed && (focus === 'all' || focus === 'speed')) {
      console.log('\n' + chalk.bold.cyan(`⚡ PAGE SPEED & WEB VITALS (Score: ${pageSpeed.score}% - Rating: ${pageSpeed.rating})`));
      const speedTable = new Table({
        head: [
          chalk.cyan('TTFB (Server)'),
          chalk.cyan('FCP (First Paint)'),
          chalk.cyan('LCP (Largest)'),
          chalk.cyan('Total Load'),
          chalk.cyan('Page Weight'),
          chalk.cyan('Requests')
        ],
        colWidths: [16, 18, 16, 14, 16, 12]
      });
      speedTable.push([
        `${pageSpeed.metrics.ttfbMs} ms`,
        `${(pageSpeed.metrics.fcpMs / 1000).toFixed(2)} s`,
        `${(pageSpeed.metrics.lcpMs / 1000).toFixed(2)} s`,
        `${(pageSpeed.metrics.loadCompleteMs / 1000).toFixed(2)} s`,
        `${pageSpeed.resources.totalTransferSizeKb} KB`,
        `${pageSpeed.resources.totalRequests}`
      ]);
      console.log(speedTable.toString());
    }

    // 3. Failed Network Requests
    const failedNetwork = networkTraffic.filter((n) => n.isFailed);
    if (failedNetwork.length > 0 && (focus === 'all' || focus === 'api')) {
      console.log('\n' + chalk.bold.red(`🌐 FAILED NETWORK REQUESTS (Count: ${failedNetwork.length})`));
      const netTable = new Table({
        head: [
          chalk.red('Type & Code'),
          chalk.red('Network Request URL'),
          chalk.red('Failure Reason'),
          chalk.green('Suggested Fix')
        ],
        colWidths: [18, 32, 22, 24],
        wordWrap: true
      });
      for (const net of failedNetwork.slice(0, 10)) {
        netTable.push([
          `${net.method} ${net.resourceType.toUpperCase()}\n${chalk.bold(net.errorCode || (net.status ? `HTTP_${net.status}` : 'FAIL'))}`,
          net.url,
          net.reason || net.errorMessage || 'Request Failed',
          net.suggestedFix || 'Check server health'
        ]);
      }
      console.log(netTable.toString());
    }

    // 4. Broken Images
    const brokenImages = result.images.filter((i) => i.isBroken);
    if (brokenImages.length > 0 && (focus === 'all' || focus === 'image')) {
      console.log('\n' + chalk.bold.red(`🖼️  BROKEN IMAGES (Count: ${brokenImages.length})`));
      const imgTable = new Table({
        head: [chalk.red('Code'), chalk.red('Image Link / URL'), chalk.red('Reason'), chalk.green('Suggested Fix')],
        colWidths: [18, 32, 22, 24],
        wordWrap: true
      });
      for (const img of brokenImages.slice(0, 8)) {
        imgTable.push([
          img.errorCode || 'IMG_BROKEN',
          img.url,
          img.reason || 'Failed to render',
          img.suggestedFix || 'Replace image path'
        ]);
      }
      console.log(imgTable.toString());
    }

    // 5. Broken Hyperlinks / 404s
    const brokenLinks = result.links.filter((l) => l.isBroken);
    if (brokenLinks.length > 0 && (focus === 'all' || focus === 'link')) {
      console.log('\n' + chalk.bold.red(`🔗 BROKEN LINKS / 404s (Count: ${brokenLinks.length})`));
      const linkTable = new Table({
        head: [chalk.red('Error Code'), chalk.red('Broken Link / URL'), chalk.red('Reason'), chalk.green('Suggested Fix')],
        colWidths: [18, 32, 22, 24],
        wordWrap: true
      });
      for (const link of brokenLinks.slice(0, 8)) {
        linkTable.push([
          link.errorCode || 'LINK_FAIL',
          link.targetUrl,
          link.reason || link.errorMessage || 'Link failed',
          link.suggestedFix || 'Update href'
        ]);
      }
      console.log(linkTable.toString());
    }

    // 6. Actionable Fix Directory
    if (actionableFixes.length > 0) {
      console.log('\n' + chalk.bold.cyan('='.repeat(95)));
      console.log(chalk.bold.cyan(`🛠️  ACTIONABLE FIX DIRECTORY & REMEDIATION PLAN (${actionableFixes.length} Issues Flagged)`));
      console.log(chalk.bold.cyan('='.repeat(95)));

      const fixTable = new Table({
        head: [
          chalk.cyan('Category'),
          chalk.cyan('Error / Issue'),
          chalk.cyan('Impacted Target'),
          chalk.cyan('Reason / Metric'),
          chalk.green.bold('Fix Action')
        ],
        colWidths: [10, 18, 26, 22, 22],
        wordWrap: true
      });

      const sortedFixes = [...actionableFixes].sort((a, b) => (a.severity === 'Critical' ? -1 : 1));
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
      if (actionableFixes.length > 15) {
        console.log(chalk.gray(`... and ${actionableFixes.length - 15} more issues detailed in reports.`));
      }
    }

    console.log('\n' + chalk.bold.cyan('-'.repeat(95)));
    if (summary.errorCount === 0) {
      console.log(chalk.bold.green('✔ AUDIT PASSED: No critical errors found!'));
    } else {
      console.log(
        chalk.bold.red(`✖ AUDIT FOUND ${summary.errorCount} CRITICAL ISSUE(S) AND ${summary.warningCount} WARNING(S)`)
      );
    }

    if (htmlReportPath) {
      console.log(`${chalk.bold('Interactive HTML Dashboard:')} ${chalk.green.underline(htmlReportPath)}`);
    }
    if (summaryHtmlPath) {
      console.log(`${chalk.bold('Executive Summary HTML:')}     ${chalk.green.underline(summaryHtmlPath)}`);
    }
    if (excelReportPath) {
      console.log(`${chalk.bold('Multi-Tab Excel (.xlsx):')}   ${chalk.green.underline(excelReportPath)}`);
    }
    if (csvReportPath) {
      console.log(`${chalk.bold('Detailed CSV Report:')}       ${chalk.green.underline(csvReportPath)}`);
    }
    if (summaryCsvPath) {
      console.log(`${chalk.bold('Summary Table CSV Report:')}   ${chalk.green.underline(summaryCsvPath)}`);
    }
    if (jsonReportPath) {
      console.log(`${chalk.bold('Structured JSON Report:')}     ${chalk.green.underline(jsonReportPath)}`);
    }
    console.log(chalk.bold.cyan('='.repeat(95)) + '\n');
  }
}
