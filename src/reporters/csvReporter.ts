import fs from 'fs/promises';
import path from 'path';
import { AuditResult } from '../types/audit.js';
import { getFunctionalReportDir } from '../utils/reportPathHelper.js';

export class CsvReporter {
  static async generate(result: AuditResult, outputDir = './reports'): Promise<{ csvPath: string; summaryCsvPath: string }> {
    const targetDir = getFunctionalReportDir(outputDir, result.focus || 'all');
    await fs.mkdir(targetDir, { recursive: true });

    const safeUrl = result.targetUrl.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `audit_${safeUrl}_${timestamp}.csv`;
    const summaryFileName = `audit_summary_${safeUrl}_${timestamp}.csv`;
    const filePath = path.join(targetDir, fileName);
    const summaryFilePath = path.join(targetDir, summaryFileName);

    const pageTitle = result.pageTitle || '(No title)';
    const pagePath = result.finalPageUrl || result.targetUrl;
    const focus = result.focus || 'all';

    // ==========================================
    // 1. DETAILED CSV REPORT
    // ==========================================
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

    if (focus === 'image') {
      for (const img of result.images) {
        const severity = img.isBroken ? 'Critical' : (!img.hasAlt && img.elementTag === 'img' ? 'Warning' : 'Healthy');
        const status = img.status ? String(img.status) : (img.isBroken ? 'Failed' : '200');
        const errorCode = img.errorCode || (img.isBroken ? 'IMG_BROKEN' : (!img.hasAlt && img.elementTag === 'img' ? 'WCAG_ALT_MISSING' : 'OK'));
        const reason = img.reason || (img.isBroken ? 'Image failed to load or render' : (!img.hasAlt && img.elementTag === 'img' ? 'Missing alt attribute' : 'Image loaded OK'));
        const suggestedFix = img.suggestedFix || (!img.hasAlt && img.elementTag === 'img' ? 'Add descriptive alt attribute to <img> tag.' : 'None needed');
        const diagnostics = `Rendered: ${img.renderedWidth}x${img.renderedHeight}, Natural: ${img.naturalWidth}x${img.naturalHeight}, Alt: "${img.altText}"`;

        rows.push([
          pageTitle,
          pagePath,
          'Image',
          severity,
          status,
          errorCode,
          img.url,
          img.elementTag,
          reason,
          suggestedFix,
          diagnostics
        ].map(this.escapeCsv).join(','));
      }
    } else if (focus === 'link') {
      for (const link of result.links) {
        const hops = link.redirectHops.map((h) => `${h.status}`).join(' -> ');
        const severity = link.isBroken ? 'Critical' : (link.isRedirected ? 'Warning' : 'Healthy');
        const status = link.status ? String(link.status) : 'Failed';
        const errorCode = link.errorCode || (link.isBroken ? 'LINK_BROKEN' : (link.isRedirected ? 'LINK_REDIRECT' : 'OK'));
        const reason = link.reason || link.errorMessage || (link.isRedirected ? `Redirected to ${link.finalUrl}` : 'Link OK');
        const suggestedFix = link.suggestedFix || (link.isRedirected ? `Update link href directly to "${link.finalUrl}".` : (link.isBroken ? 'Update href to active destination or remove broken link.' : 'None needed'));
        const diagnostics = `Type: ${link.isExternal ? 'External' : 'Internal'}, Final: ${link.finalUrl}, Hops: ${hops || 'Direct'}, Latency: ${link.durationMs}ms`;

        rows.push([
          pageTitle,
          pagePath,
          'Hyperlink',
          severity,
          status,
          errorCode,
          link.targetUrl,
          `Anchor: "${link.anchorText}"`,
          reason,
          suggestedFix,
          diagnostics
        ].map(this.escapeCsv).join(','));
      }
    } else if (focus === 'status') {
      if (result.pageStatus) {
        const ps = result.pageStatus;
        rows.push([
          pageTitle,
          pagePath,
          'Status',
          ps.is404 || ps.httpStatus >= 500 ? 'Critical' : (ps.isRedirect ? 'Warning' : 'Healthy'),
          String(ps.httpStatus),
          ps.errorCode || `HTTP_${ps.httpStatus}`,
          ps.url,
          `Latency: ${ps.responseTimeMs}ms`,
          ps.reason || ps.statusText,
          ps.suggestedFix || 'None needed',
          `Hops: ${ps.redirectHops.length}, Final: ${ps.finalUrl}`
        ].map(this.escapeCsv).join(','));
      }
    } else if (focus === 'seo') {
      if (result.seoMetadata) {
        const seo = result.seoMetadata;
        for (let i = 0; i < seo.issues.length; i++) {
          rows.push([
            pageTitle,
            pagePath,
            'SEO',
            'Warning',
            `${seo.score}%`,
            'SEO_ISSUE',
            pagePath,
            'HTML Head / DOM',
            seo.issues[i],
            seo.recommendations[i] || 'Optimize SEO tag',
            `Title: "${seo.title}", H1: "${seo.headings.h1.join(', ')}"`
          ].map(this.escapeCsv).join(','));
        }
      }
    } else if (focus === 'speed') {
      if (result.pageSpeed) {
        const sp = result.pageSpeed;
        for (const b of sp.bottlenecks) {
          rows.push([
            pageTitle,
            pagePath,
            'Speed',
            b.severity,
            `${sp.score}%`,
            'SPEED_BOTTLENECK',
            pagePath,
            b.metric,
            b.value,
            b.recommendation,
            `Total Load: ${(sp.metrics.loadCompleteMs / 1000).toFixed(2)}s, TTFB: ${sp.metrics.ttfbMs}ms`
          ].map(this.escapeCsv).join(','));
        }
      }
    } else {
      // Full Diagnostic mode ('all')
      for (const fix of result.actionableFixes) {
        rows.push([
          pageTitle,
          pagePath,
          fix.category,
          fix.severity,
          fix.errorCode,
          fix.errorCode,
          fix.targetUrl,
          fix.elementOrSource || '',
          fix.reason,
          fix.suggestedFix,
          `Page: ${pagePath}`
        ].map(this.escapeCsv).join(','));
      }

      for (const net of result.networkTraffic) {
        rows.push([
          pageTitle,
          pagePath,
          'Network',
          net.isFailed ? 'Critical' : 'Healthy',
          net.status ? String(net.status) : 'Failed',
          net.errorCode || (net.isFailed ? 'NET_ERROR' : 'OK'),
          net.url,
          `${net.method} (${net.resourceType})`,
          net.reason || net.errorMessage || 'Request succeeded',
          net.suggestedFix || 'None needed',
          `Duration: ${net.durationMs}ms, ContentType: ${net.contentType || 'N/A'}`
        ].map(this.escapeCsv).join(','));
      }

      for (const log of result.consoleLogs) {
        rows.push([
          pageTitle,
          pagePath,
          'Console / JS',
          log.type === 'error' || log.type === 'pageerror' ? 'Critical' : (log.type === 'warning' ? 'Warning' : 'Info'),
          log.type.toUpperCase(),
          log.errorCode || log.type.toUpperCase(),
          log.location || pagePath,
          `Type: ${log.type}`,
          log.reason || log.text,
          log.suggestedFix || 'Review code',
          `Timestamp: ${log.timestamp}`
        ].map(this.escapeCsv).join(','));
      }

      for (const img of result.images) {
        rows.push([
          pageTitle,
          pagePath,
          'Image',
          img.isBroken ? 'Critical' : (!img.hasAlt && img.elementTag === 'img' ? 'Warning' : 'Healthy'),
          img.status ? String(img.status) : (img.isBroken ? 'Failed' : '200'),
          img.errorCode || (img.isBroken ? 'IMG_BROKEN' : 'OK'),
          img.url,
          img.elementTag,
          img.reason || (img.isBroken ? 'Image failed to load' : 'Image loaded OK'),
          img.suggestedFix || 'None needed',
          `Rendered: ${img.renderedWidth}x${img.renderedHeight}, Natural: ${img.naturalWidth}x${img.naturalHeight}, Alt: "${img.altText}"`
        ].map(this.escapeCsv).join(','));
      }

      for (const link of result.links) {
        const hops = link.redirectHops.map((h) => `${h.status}`).join(' -> ');
        rows.push([
          pageTitle,
          pagePath,
          'Hyperlink',
          link.isBroken ? 'Critical' : (link.isRedirected ? 'Warning' : 'Healthy'),
          link.status ? String(link.status) : 'Failed',
          link.errorCode || (link.isBroken ? 'LINK_BROKEN' : 'OK'),
          link.targetUrl,
          `Anchor: "${link.anchorText}"`,
          link.reason || (link.isRedirected ? `Redirected to ${link.finalUrl}` : 'Link OK'),
          link.suggestedFix || 'None needed',
          `Type: ${link.isExternal ? 'External' : 'Internal'}, Final: ${link.finalUrl}, Hops: ${hops || 'Direct'}`
        ].map(this.escapeCsv).join(','));
      }
    }

    await fs.writeFile(filePath, rows.join('\r\n'), 'utf-8');

    // ==========================================
    // 2. SUMMARY TABLE CSV REPORT
    // ==========================================
    const sRows: string[] = [];
    sRows.push(['Diagnostic Area', 'Total Tested', 'Errors / Failed', 'Warnings / Redirects', 'Healthy / OK'].map(this.escapeCsv).join(','));

    const s = result.summary;
    sRows.push([
      'HTTP Status & 404',
      '1',
      result.pageStatus?.is404 ? '1 (404 Not Found)' : (result.httpStatus >= 400 ? `1 (HTTP ${result.httpStatus})` : '0'),
      result.pageStatus?.isRedirect ? '1 (Redirect)' : '0',
      result.httpStatus === 200 ? '200 OK' : 'Non-200'
    ].map(this.escapeCsv).join(','));

    if (result.seoMetadata) {
      sRows.push([
        'SEO Metadata',
        '1 Page',
        String(result.seoMetadata.issues.length),
        '0',
        `${result.seoMetadata.score}% (${result.seoMetadata.grade})`
      ].map(this.escapeCsv).join(','));
    }

    if (result.pageSpeed) {
      sRows.push([
        'Page Speed & Performance',
        '1 Page',
        String(result.pageSpeed.bottlenecks.filter((b) => b.severity === 'Critical').length),
        String(result.pageSpeed.bottlenecks.filter((b) => b.severity === 'Warning').length),
        `${result.pageSpeed.score}% (${result.pageSpeed.rating})`
      ].map(this.escapeCsv).join(','));
    }

    sRows.push(['Network Traffic', String(s.network.total), String(s.network.failed), '0', String(s.network.total - s.network.failed)].map(this.escapeCsv).join(','));
    sRows.push(['Image Assets', String(s.images.total), String(s.images.broken), `${s.images.missingAlt} missing alt`, String(s.images.total - s.images.broken)].map(this.escapeCsv).join(','));
    sRows.push(['Hyperlinks & Nav', String(s.links.total), String(s.links.broken), `${s.links.redirected} redirected`, String(s.links.total - s.links.broken)].map(this.escapeCsv).join(','));

    await fs.writeFile(summaryFilePath, sRows.join('\r\n'), 'utf-8');

    return {
      csvPath: path.resolve(filePath),
      summaryCsvPath: path.resolve(summaryFilePath)
    };
  }

  private static escapeCsv(str: string): string {
    if (str === null || str === undefined) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  }
}
