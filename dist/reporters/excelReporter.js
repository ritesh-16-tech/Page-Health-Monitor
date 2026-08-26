import fs from 'fs/promises';
import path from 'path';
import ExcelJS from 'exceljs';
import { getFunctionalReportDir } from '../utils/reportPathHelper.js';
export class ExcelReporter {
    static async generate(result, outputDir = './reports') {
        const targetDir = getFunctionalReportDir(outputDir, result.focus || 'all');
        await fs.mkdir(targetDir, { recursive: true });
        const safeUrl = result.targetUrl.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `audit_${safeUrl}_${timestamp}.xlsx`;
        const filePath = path.join(targetDir, fileName);
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Page-Health-Monitor Auditor';
        workbook.created = new Date();
        const pageTitle = result.pageTitle || '(No title)';
        const pagePath = result.finalPageUrl || result.targetUrl;
        const focus = result.focus || 'all';
        // ==========================================
        // TAB 1: DETAILED ISSUES & DIAGNOSTICS
        // ==========================================
        const sheet1 = workbook.addWorksheet('Detailed Issues & Diagnostics', {
            views: [{ state: 'frozen', ySplit: 1 }]
        });
        sheet1.columns = [
            { header: 'Page Title', key: 'pageTitle', width: 30 },
            { header: 'Page Path / URL', key: 'pagePath', width: 38 },
            { header: 'Category', key: 'category', width: 16 },
            { header: 'Severity', key: 'severity', width: 14 },
            { header: 'Status / Code', key: 'status', width: 16 },
            { header: 'Error Code', key: 'errorCode', width: 22 },
            { header: 'Impacted Link / Resource URL', key: 'targetUrl', width: 45 },
            { header: 'Element / Source Context', key: 'element', width: 24 },
            { header: 'Reason / Description', key: 'reason', width: 35 },
            { header: 'Suggested Fix Action', key: 'suggestedFix', width: 40 },
            { header: 'Extra Diagnostics', key: 'diagnostics', width: 35 }
        ];
        this.styleHeaderRow(sheet1.getRow(1));
        // Add actionable fixes to Tab 1
        for (const fix of result.actionableFixes) {
            const row = sheet1.addRow({
                pageTitle,
                pagePath,
                category: fix.category,
                severity: fix.severity,
                status: fix.errorCode,
                errorCode: fix.errorCode,
                targetUrl: fix.targetUrl,
                element: fix.elementOrSource || fix.category,
                reason: fix.reason,
                suggestedFix: fix.suggestedFix,
                diagnostics: ''
            });
            if (fix.severity === 'Critical') {
                row.getCell('severity').font = { color: { argb: 'FFFF0000' }, bold: true };
            }
            else {
                row.getCell('severity').font = { color: { argb: 'FFD97706' }, bold: true };
            }
        }
        // Add image items if focus === 'image'
        if (focus === 'image') {
            for (const img of result.images) {
                const severity = img.isBroken ? 'Critical' : (!img.hasAlt && img.elementTag === 'img' ? 'Warning' : 'Healthy');
                const status = img.status ? String(img.status) : (img.isBroken ? 'Failed' : '200');
                const errorCode = img.errorCode || (img.isBroken ? 'IMG_BROKEN' : (!img.hasAlt && img.elementTag === 'img' ? 'WCAG_ALT_MISSING' : 'OK'));
                const reason = img.reason || (img.isBroken ? 'Image failed to load' : (!img.hasAlt && img.elementTag === 'img' ? 'Missing alt attribute' : 'Image loaded OK'));
                const suggestedFix = img.suggestedFix || (!img.hasAlt && img.elementTag === 'img' ? 'Add descriptive alt attribute to <img> tag.' : 'None needed');
                const row = sheet1.addRow({
                    pageTitle,
                    pagePath,
                    category: 'Image',
                    severity,
                    status,
                    errorCode,
                    targetUrl: img.url,
                    element: img.elementTag,
                    reason,
                    suggestedFix,
                    diagnostics: `Rendered: ${img.renderedWidth}x${img.renderedHeight}, Natural: ${img.naturalWidth}x${img.naturalHeight}, Alt: "${img.altText}"`
                });
                if (img.isBroken) {
                    row.getCell('severity').font = { color: { argb: 'FFFF0000' }, bold: true };
                }
                else if (!img.hasAlt && img.elementTag === 'img') {
                    row.getCell('severity').font = { color: { argb: 'FFD97706' }, bold: true };
                }
            }
        }
        else if (focus === 'link') {
            for (const link of result.links) {
                const hops = link.redirectHops.map((h) => `${h.status}`).join(' -> ');
                const severity = link.isBroken ? 'Critical' : (link.isRedirected ? 'Warning' : 'Healthy');
                const status = link.status ? String(link.status) : 'Failed';
                const errorCode = link.errorCode || (link.isBroken ? 'LINK_BROKEN' : (link.isRedirected ? 'LINK_REDIRECT' : 'OK'));
                const reason = link.reason || link.errorMessage || (link.isRedirected ? `Redirected to ${link.finalUrl}` : 'Link OK');
                const suggestedFix = link.suggestedFix || (link.isRedirected ? `Update link href directly to "${link.finalUrl}".` : (link.isBroken ? 'Update href or remove link' : 'None needed'));
                const row = sheet1.addRow({
                    pageTitle,
                    pagePath,
                    category: 'Hyperlink',
                    severity,
                    status,
                    errorCode,
                    targetUrl: link.targetUrl,
                    element: `Anchor: "${link.anchorText}"`,
                    reason,
                    suggestedFix,
                    diagnostics: `Type: ${link.isExternal ? 'External' : 'Internal'}, Final: ${link.finalUrl}, Hops: ${hops || 'Direct'}, Latency: ${link.durationMs}ms`
                });
                if (link.isBroken) {
                    row.getCell('severity').font = { color: { argb: 'FFFF0000' }, bold: true };
                }
                else if (link.isRedirected) {
                    row.getCell('severity').font = { color: { argb: 'FFD97706' }, bold: true };
                }
            }
        }
        // ==========================================
        // TAB 2: SEO METADATA (If available)
        // ==========================================
        if (result.seoMetadata) {
            const seo = result.seoMetadata;
            const sheetSeo = workbook.addWorksheet('SEO Metadata Inspector', {
                views: [{ state: 'frozen', ySplit: 1 }]
            });
            sheetSeo.columns = [
                { header: 'Attribute / Area', key: 'attr', width: 28 },
                { header: 'Value / Status', key: 'value', width: 45 },
                { header: 'Evaluation / Issues', key: 'eval', width: 40 }
            ];
            this.styleHeaderRow(sheetSeo.getRow(1));
            sheetSeo.addRow({ attr: 'Overall SEO Score', value: `${seo.score}% (${seo.grade})`, eval: seo.score >= 80 ? 'Good' : 'Needs Optimization' });
            sheetSeo.addRow({ attr: 'Title Tag', value: seo.title || '(Missing)', eval: `${seo.titleLength} chars (${seo.titleStatus})` });
            sheetSeo.addRow({ attr: 'Meta Description', value: seo.description || '(Missing)', eval: `${seo.descriptionLength} chars (${seo.descriptionStatus})` });
            sheetSeo.addRow({ attr: 'Canonical URL', value: seo.canonicalUrl || '(Missing)', eval: seo.canonicalStatus });
            sheetSeo.addRow({ attr: 'Robots Meta', value: seo.robots, eval: seo.isIndexable ? 'Indexable' : 'Noindex' });
            sheetSeo.addRow({ attr: 'H1 Headings', value: seo.headings.h1.join(' | ') || '(Missing)', eval: `${seo.headings.h1Count} tag(s)` });
            sheetSeo.addRow({ attr: 'OpenGraph Title', value: seo.openGraph.title || '(Missing)', eval: seo.openGraph.hasOgTitle ? 'Present' : 'Missing' });
            sheetSeo.addRow({ attr: 'OpenGraph Image', value: seo.openGraph.image || '(Missing)', eval: seo.openGraph.hasOgImage ? 'Present' : 'Missing' });
            sheetSeo.addRow({ attr: 'Twitter Card', value: seo.twitterCard.card || '(Missing)', eval: seo.twitterCard.hasTwitterCard ? 'Present' : 'Missing' });
            sheetSeo.addRow({ attr: 'Structured Data', value: seo.structuredData.types.join(', ') || '(None)', eval: `${seo.structuredData.schemaCount} Schema(s)` });
            sheetSeo.addRow({ attr: 'Word Count', value: `${seo.technical.wordCount} words`, eval: 'Content Length' });
            sheetSeo.addRow({ attr: 'Mobile Viewport', value: seo.technical.viewport || '(Missing)', eval: seo.technical.hasViewport ? 'Mobile Ready' : 'Missing' });
        }
        // ==========================================
        // TAB 3: PAGE SPEED & PERFORMANCE (If available)
        // ==========================================
        if (result.pageSpeed) {
            const speed = result.pageSpeed;
            const sheetSpeed = workbook.addWorksheet('Speed & Performance', {
                views: [{ state: 'frozen', ySplit: 1 }]
            });
            sheetSpeed.columns = [
                { header: 'Performance Metric', key: 'metric', width: 32 },
                { header: 'Measured Value', key: 'value', width: 25 },
                { header: 'Target / Evaluation', key: 'target', width: 30 }
            ];
            this.styleHeaderRow(sheetSpeed.getRow(1));
            sheetSpeed.addRow({ metric: 'Performance Score', value: `${speed.score}% (${speed.rating})`, target: 'Target > 80%' });
            sheetSpeed.addRow({ metric: 'Time to First Byte (TTFB)', value: `${speed.metrics.ttfbMs} ms`, target: 'Target < 400 ms' });
            sheetSpeed.addRow({ metric: 'First Contentful Paint (FCP)', value: `${(speed.metrics.fcpMs / 1000).toFixed(2)} s`, target: 'Target < 1.8 s' });
            sheetSpeed.addRow({ metric: 'Largest Contentful Paint (LCP)', value: `${(speed.metrics.lcpMs / 1000).toFixed(2)} s`, target: 'Target < 2.5 s' });
            sheetSpeed.addRow({ metric: 'Total Page Load Time', value: `${(speed.metrics.loadCompleteMs / 1000).toFixed(2)} s`, target: 'Target < 2.5 s' });
            sheetSpeed.addRow({ metric: 'Total Page Weight', value: `${speed.resources.totalTransferSizeKb} KB`, target: 'Asset Payload' });
            sheetSpeed.addRow({ metric: 'Total HTTP Requests', value: `${speed.resources.totalRequests} requests`, target: 'Network Overhead' });
            sheetSpeed.addRow({ metric: 'JavaScript Files / Size', value: `${speed.resources.jsCount} files (${speed.resources.jsSizeKb} KB)`, target: 'Script Payload' });
            sheetSpeed.addRow({ metric: 'Image Files / Size', value: `${speed.resources.imageCount} imgs (${speed.resources.imageSizeKb} KB)`, target: 'Image Payload' });
            sheetSpeed.addRow({ metric: 'CSS Files / Size', value: `${speed.resources.cssCount} files (${speed.resources.cssSizeKb} KB)`, target: 'Stylesheet Payload' });
        }
        // ==========================================
        // TAB 4: SUMMARY TABLE
        // ==========================================
        const sheetSummary = workbook.addWorksheet('Summary Table', {
            views: [{ state: 'frozen', ySplit: 1 }]
        });
        sheetSummary.columns = [
            { header: 'Diagnostic Area', key: 'area', width: 28 },
            { header: 'Total Tested', key: 'total', width: 18 },
            { header: 'Errors / Issues', key: 'failed', width: 20 },
            { header: 'Warnings', key: 'warnings', width: 22 },
            { header: 'Status / Score', key: 'healthy', width: 20 }
        ];
        this.styleHeaderRow(sheetSummary.getRow(1));
        const s = result.summary;
        sheetSummary.addRow({
            area: 'HTTP Status & 404',
            total: '1 Page',
            failed: result.pageStatus?.is404 ? '404 NOT FOUND' : (result.httpStatus >= 400 ? `HTTP ${result.httpStatus}` : '0'),
            warnings: result.pageStatus?.isRedirect ? 'Redirect' : '0',
            healthy: result.httpStatus === 200 ? '200 OK' : 'Non-200'
        });
        if (result.seoMetadata) {
            sheetSummary.addRow({
                area: 'SEO Metadata Score',
                total: '1 Page',
                failed: result.seoMetadata.issues.length,
                warnings: 0,
                healthy: `${result.seoMetadata.score}% (${result.seoMetadata.grade})`
            });
        }
        if (result.pageSpeed) {
            sheetSummary.addRow({
                area: 'Page Speed & Performance',
                total: '1 Page',
                failed: result.pageSpeed.bottlenecks.filter((b) => b.severity === 'Critical').length,
                warnings: result.pageSpeed.bottlenecks.filter((b) => b.severity === 'Warning').length,
                healthy: `${result.pageSpeed.score}% (${result.pageSpeed.rating})`
            });
        }
        sheetSummary.addRow({
            area: 'Network Traffic',
            total: s.network.total,
            failed: s.network.failed,
            warnings: 0,
            healthy: s.network.total - s.network.failed
        });
        sheetSummary.addRow({
            area: 'Image Assets',
            total: s.images.total,
            failed: s.images.broken,
            warnings: `${s.images.missingAlt} missing alt`,
            healthy: s.images.total - s.images.broken
        });
        sheetSummary.addRow({
            area: 'Hyperlinks & Nav',
            total: s.links.total,
            failed: s.links.broken,
            warnings: `${s.links.redirected} redirected`,
            healthy: s.links.total - s.links.broken
        });
        await workbook.xlsx.writeFile(filePath);
        return path.resolve(filePath);
    }
    static async generateMultiPage(result, outputDir = './reports') {
        const targetDir = getFunctionalReportDir(outputDir, result.focus || 'all');
        await fs.mkdir(targetDir, { recursive: true });
        const safeUrl = result.siteUrl.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `site_audit_${safeUrl}_${timestamp}.xlsx`;
        const filePath = path.join(targetDir, fileName);
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Page-Health-Monitor Auditor';
        workbook.created = new Date();
        // TAB 1: ALL ACTIONABLE FIXES
        const sheet1 = workbook.addWorksheet('Consolidated Issues & Fixes', {
            views: [{ state: 'frozen', ySplit: 1 }]
        });
        sheet1.columns = [
            { header: 'Page URL', key: 'pageUrl', width: 45 },
            { header: 'Category', key: 'category', width: 16 },
            { header: 'Severity', key: 'severity', width: 14 },
            { header: 'Error Code', key: 'errorCode', width: 22 },
            { header: 'Impacted Target / Resource', key: 'targetUrl', width: 45 },
            { header: 'Element / Context', key: 'element', width: 24 },
            { header: 'Reason / Description', key: 'reason', width: 35 },
            { header: 'Suggested Fix Action', key: 'suggestedFix', width: 45 }
        ];
        this.styleHeaderRow(sheet1.getRow(1));
        for (const fix of result.consolidatedFixes) {
            const row = sheet1.addRow({
                pageUrl: fix.pageUrl || result.siteUrl,
                category: fix.category,
                severity: fix.severity,
                errorCode: fix.errorCode,
                targetUrl: fix.targetUrl,
                element: fix.elementOrSource || '',
                reason: fix.reason,
                suggestedFix: fix.suggestedFix
            });
            if (fix.severity === 'Critical') {
                row.getCell('severity').font = { color: { argb: 'FFFF0000' }, bold: true };
            }
            else {
                row.getCell('severity').font = { color: { argb: 'FFD97706' }, bold: true };
            }
        }
        // TAB 2: PAGE STATUS & 404 OVERVIEW
        const sheetStatus = workbook.addWorksheet('Page Status & 404 Overview', {
            views: [{ state: 'frozen', ySplit: 1 }]
        });
        sheetStatus.columns = [
            { header: 'Page URL', key: 'url', width: 45 },
            { header: 'Status Code', key: 'status', width: 14 },
            { header: 'Status Text', key: 'statusText', width: 18 },
            { header: 'Is 404?', key: 'is404', width: 12 },
            { header: 'Latency (ms)', key: 'latency', width: 14 },
            { header: 'Final URL', key: 'finalUrl', width: 45 },
            { header: 'Page Title', key: 'title', width: 35 }
        ];
        this.styleHeaderRow(sheetStatus.getRow(1));
        for (const p of result.pages) {
            const row = sheetStatus.addRow({
                url: p.targetUrl,
                status: p.httpStatus,
                statusText: p.pageStatus?.statusText || (p.httpStatus === 200 ? 'OK' : 'HTTP ' + p.httpStatus),
                is404: p.httpStatus === 404 || p.pageStatus?.is404 ? 'YES' : 'NO',
                latency: p.pageStatus?.responseTimeMs || p.durationMs,
                finalUrl: p.finalPageUrl,
                title: p.pageTitle || ''
            });
            if (p.httpStatus === 404 || p.pageStatus?.is404) {
                row.getCell('status').font = { color: { argb: 'FFFF0000' }, bold: true };
                row.getCell('is404').font = { color: { argb: 'FFFF0000' }, bold: true };
            }
            else if (p.httpStatus === 200) {
                row.getCell('status').font = { color: { argb: 'FF10B981' }, bold: true };
            }
        }
        // TAB 3: SEO METADATA OVERVIEW
        const pagesWithSeo = result.pages.filter((p) => p.seoMetadata);
        if (pagesWithSeo.length > 0) {
            const sheetSeo = workbook.addWorksheet('SEO Metadata Overview', {
                views: [{ state: 'frozen', ySplit: 1 }]
            });
            sheetSeo.columns = [
                { header: 'Page URL', key: 'url', width: 40 },
                { header: 'SEO Score', key: 'score', width: 12 },
                { header: 'Grade', key: 'grade', width: 10 },
                { header: 'Title Tag', key: 'title', width: 35 },
                { header: 'Title Length', key: 'titleLen', width: 14 },
                { header: 'Meta Description', key: 'desc', width: 40 },
                { header: 'Desc Length', key: 'descLen', width: 14 },
                { header: 'H1 Headings', key: 'h1', width: 30 },
                { header: 'Canonical URL', key: 'canonical', width: 35 },
                { header: 'OG Image', key: 'ogImage', width: 35 }
            ];
            this.styleHeaderRow(sheetSeo.getRow(1));
            for (const p of pagesWithSeo) {
                const seo = p.seoMetadata;
                sheetSeo.addRow({
                    url: p.finalPageUrl,
                    score: `${seo.score}%`,
                    grade: seo.grade,
                    title: seo.title || '(Missing)',
                    titleLen: seo.titleLength,
                    desc: seo.description || '(Missing)',
                    descLen: seo.descriptionLength,
                    h1: seo.headings.h1.join(' | ') || '(Missing)',
                    canonical: seo.canonicalUrl || '(Missing)',
                    ogImage: seo.openGraph.image || '(Missing)'
                });
            }
        }
        // TAB 4: PAGE SPEED OVERVIEW
        const pagesWithSpeed = result.pages.filter((p) => p.pageSpeed);
        if (pagesWithSpeed.length > 0) {
            const sheetSpeed = workbook.addWorksheet('Page Speed Overview', {
                views: [{ state: 'frozen', ySplit: 1 }]
            });
            sheetSpeed.columns = [
                { header: 'Page URL', key: 'url', width: 40 },
                { header: 'Speed Score', key: 'score', width: 12 },
                { header: 'Rating', key: 'rating', width: 16 },
                { header: 'Total Load (s)', key: 'load', width: 14 },
                { header: 'TTFB (ms)', key: 'ttfb', width: 12 },
                { header: 'FCP (s)', key: 'fcp', width: 12 },
                { header: 'Payload (KB)', key: 'size', width: 14 },
                { header: 'Requests', key: 'requests', width: 12 }
            ];
            this.styleHeaderRow(sheetSpeed.getRow(1));
            for (const p of pagesWithSpeed) {
                const sp = p.pageSpeed;
                sheetSpeed.addRow({
                    url: p.finalPageUrl,
                    score: `${sp.score}%`,
                    rating: sp.rating,
                    load: (sp.metrics.loadCompleteMs / 1000).toFixed(2),
                    ttfb: sp.metrics.ttfbMs,
                    fcp: (sp.metrics.fcpMs / 1000).toFixed(2),
                    size: sp.resources.totalTransferSizeKb,
                    requests: sp.resources.totalRequests
                });
            }
        }
        // TAB 5: SITE SUMMARY TABLE
        const sheetSummary = workbook.addWorksheet('Site Summary Table', {
            views: [{ state: 'frozen', ySplit: 1 }]
        });
        sheetSummary.columns = [
            { header: 'Metric / Diagnostic Area', key: 'area', width: 32 },
            { header: 'Total Audited', key: 'total', width: 18 },
            { header: 'Errors / Failed', key: 'failed', width: 18 },
            { header: 'Warnings', key: 'warnings', width: 22 }
        ];
        this.styleHeaderRow(sheetSummary.getRow(1));
        const s = result.summary;
        sheetSummary.addRow({
            area: 'Total Audited Pages',
            total: result.pages.length,
            failed: s.errorCount,
            warnings: s.warningCount
        });
        sheetSummary.addRow({
            area: 'Network Requests Across Pages',
            total: s.network?.total || 0,
            failed: s.network?.failed || 0,
            warnings: 0
        });
        sheetSummary.addRow({
            area: 'Image Assets',
            total: s.images.total,
            failed: s.images.broken,
            warnings: `${s.images.missingAlt} missing alt`
        });
        sheetSummary.addRow({
            area: 'Hyperlinks & Navigation',
            total: s.links.total,
            failed: s.links.broken,
            warnings: `${s.links.redirected} redirected`
        });
        await workbook.xlsx.writeFile(filePath);
        return path.resolve(filePath);
    }
    static styleHeaderRow(row) {
        row.height = 26;
        row.eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF1E293B' }
            };
            cell.font = {
                name: 'Segoe UI',
                size: 11,
                bold: true,
                color: { argb: 'FFFFFFFF' }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FF334155' } },
                bottom: { style: 'medium', color: { argb: 'FF3B82F6' } }
            };
        });
    }
}
