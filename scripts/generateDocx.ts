import fs from 'fs/promises';
import path from 'path';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
  convertInchesToTwip
} from 'docx';

async function generateDocx() {
  const primaryColor = '1E3A8A'; // Deep Navy Blue
  const secondaryColor = '2563EB'; // Bright Blue
  const darkBg = '1E293B'; // Slate Dark
  const lightBg = 'F8FAFC'; // Very light gray
  const borderColor = 'CBD5E1'; // Light slate border

  const tableBorder = {
    top: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
    left: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
    right: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
    insideVertical: { style: BorderStyle.SINGLE, size: 4, color: borderColor }
  };

  const createHeading1 = (text: string) => {
    return new Paragraph({
      text,
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 360, after: 180 },
      run: {
        font: 'Segoe UI',
        size: 32, // 16pt
        bold: true,
        color: primaryColor
      }
    });
  };

  const createHeading2 = (text: string) => {
    return new Paragraph({
      text,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 280, after: 140 },
      run: {
        font: 'Segoe UI',
        size: 26, // 13pt
        bold: true,
        color: secondaryColor
      }
    });
  };

  const createHeading3 = (text: string) => {
    return new Paragraph({
      text,
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 200, after: 100 },
      run: {
        font: 'Segoe UI',
        size: 22, // 11pt
        bold: true,
        color: '334155'
      }
    });
  };

  const createPara = (text: string, options: { bold?: boolean; italic?: boolean; spacingAfter?: number } = {}) => {
    return new Paragraph({
      spacing: { after: options.spacingAfter ?? 120, line: 276 }, // 1.15 line spacing
      children: [
        new TextRun({
          text,
          font: 'Segoe UI',
          size: 20, // 10pt
          bold: options.bold,
          italics: options.italic,
          color: '1E293B'
        })
      ]
    });
  };

  const createBullet = (boldText: string, normalText: string) => {
    return new Paragraph({
      bullet: { level: 0 },
      spacing: { after: 80, line: 260 },
      children: [
        new TextRun({
          text: boldText + ' ',
          font: 'Segoe UI',
          size: 20,
          bold: true,
          color: '0F172A'
        }),
        new TextRun({
          text: normalText,
          font: 'Segoe UI',
          size: 20,
          color: '334155'
        })
      ]
    });
  };

  const createCallout = (title: string, text: string) => {
    return new Paragraph({
      spacing: { before: 140, after: 140, line: 260 },
      border: {
        left: { style: BorderStyle.SINGLE, size: 24, color: secondaryColor, space: 10 }
      },
      shading: {
        type: ShadingType.CLEAR,
        fill: 'F1F5F9'
      },
      children: [
        new TextRun({
          text: `💡 ${title}: `,
          font: 'Segoe UI',
          size: 20,
          bold: true,
          color: primaryColor
        }),
        new TextRun({
          text,
          font: 'Segoe UI',
          size: 20,
          color: '334155'
        })
      ]
    });
  };

  const createCodeBlock = (code: string) => {
    const lines = code.split('\n');
    return lines.map(
      (line) =>
        new Paragraph({
          spacing: { before: 20, after: 20, line: 240 },
          shading: { type: ShadingType.CLEAR, fill: '0F172A' },
          children: [
            new TextRun({
              text: line || ' ',
              font: 'Consolas',
              size: 18, // 9pt
              color: '38BDF8'
            })
          ]
        })
    );
  };

  const createTable = (headers: string[], rows: string[][], colWidthsPercent: number[]) => {
    const tableRows: TableRow[] = [];

    // Header Row
    const headerCells = headers.map((h, i) => {
      return new TableCell({
        width: { size: colWidthsPercent[i], type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, fill: darkBg },
        margins: { top: convertInchesToTwip(0.08), bottom: convertInchesToTwip(0.08), left: convertInchesToTwip(0.1), right: convertInchesToTwip(0.1) },
        children: [
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                text: h,
                font: 'Segoe UI',
                size: 19,
                bold: true,
                color: 'FFFFFF'
              })
            ]
          })
        ]
      });
    });

    tableRows.push(new TableRow({ children: headerCells, tableHeader: true }));

    // Data Rows
    rows.forEach((r, rowIdx) => {
      const bg = rowIdx % 2 === 0 ? 'FFFFFF' : lightBg;
      const cells = r.map((c, colIdx) => {
        return new TableCell({
          width: { size: colWidthsPercent[colIdx], type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: bg },
          margins: { top: convertInchesToTwip(0.06), bottom: convertInchesToTwip(0.06), left: convertInchesToTwip(0.1), right: convertInchesToTwip(0.1) },
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [
                new TextRun({
                  text: c,
                  font: 'Segoe UI',
                  size: 18,
                  color: '1E293B'
                })
              ]
            })
          ]
        });
      });
      tableRows.push(new TableRow({ children: cells }));
    });

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: tableBorder,
      rows: tableRows
    });
  };

  // Build Document Children
  const docChildren: any[] = [];

  // TITLE & COVER BLOCK
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 80 },
      children: [
        new TextRun({
          text: '🛡️ PAGE-HEALTH-MONITOR AUDITOR',
          font: 'Segoe UI',
          size: 40, // 20pt
          bold: true,
          color: primaryColor
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'Universal Web Health, 404 Finder, SEO Metadata, Page Speed & Asset Diagnostic Auditor',
          font: 'Segoe UI',
          size: 24, // 12pt
          color: secondaryColor
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 },
      children: [
        new TextRun({
          text: 'Comprehensive Technical & Product Manual | Version 1.0.0 | Date: ' + new Date().toLocaleDateString(),
          font: 'Segoe UI',
          size: 18,
          italics: true,
          color: '64748B'
        })
      ]
    })
  );

  // SECTION 1: EXECUTIVE SUMMARY
  docChildren.push(
    createHeading1('1. Executive Summary (Non-Technical)'),
    createPara(
      'Page-Health-Monitor is an automated web quality assurance auditor. Just as a vehicle undergoes multi-point inspections, Page-Health-Monitor tests any single webpage, bulk list of URLs, or entire website XML sitemap across 8 core diagnostic dimensions.'
    ),
    createCallout(
      'Key Business Goal',
      'Ensure zero broken 404 pages, high Google search rankings via complete SEO metadata, lightning-fast loading speeds, and defect-free digital assets.'
    )
  );

  // Business Value Table
  docChildren.push(
    createHeading2('Business Value & Key Stakeholder Benefits'),
    createTable(
      ['Stakeholder Group', 'How Page-Health-Monitor Helps', 'Key Metrics & Outcomes'],
      [
        ['Marketing & SEO Teams', 'Validates title/description lengths, social share cards (OpenGraph/Twitter), heading structure, and Schema markup.', 'SEO Health Score (0-100%), SERP Snippet Preview, Social Share Previews.'],
        ['Product & Business Managers', 'Protects conversion funnels by uncovering broken navigation, missing product images, and slow pages.', 'Page Pass/Fail Rates, Latency Benchmarks, Critical Error Flags.'],
        ['Content Editors & CMS Authors', 'Detects missing alt text for accessibility compliance (WCAG) and dead links in rich text editors.', 'Broken Asset List with Direct Fix Instructions.'],
        ['Engineering & QA Teams', 'Automated headless browser auditing with multi-tab Excel, CSV, and JSON outputs for CI/CD integration.', 'Exact Error Codes, Stack Traces, Network Timing Breakdowns.']
      ],
      [25, 45, 30]
    )
  );

  // SECTION 2: 8 DIAGNOSTIC FEATURES
  docChildren.push(
    createHeading1('2. Feature-by-Feature Diagnostic Breakdown'),
    
    // Feature 1: 404 Finder
    createHeading2('2.1. 404 Finder & Page Status Checker'),
    createPara('When customers click an ad or navigation link and hit a 404 Not Found error, bounce rates skyrocket. This engine audits HTTP response codes and traces redirect paths.'),
    createBullet('HTTP Response Codes:', 'Validates 200 OK, 301/302 Redirects, 403 Forbidden, 404 Not Found, and 500/502/503 Server Errors.'),
    createBullet('Redirect Chains:', 'Traces multi-hop redirects (e.g. http:// ➔ https:// ➔ /new-page) to eliminate unnecessary round-trip latency.'),
    createBullet('Response Latency:', 'Measures server response time in milliseconds and identifies sluggish endpoints.'),
    createBullet('Dedicated Reports:', 'Generates HTML dashboards with 404 filter buttons, multi-tab Excel, CSV, and JSON under reports/404-status/.'),

    // Feature 2: SEO Metadata
    createHeading2('2.2. SEO Metadata & Social Sharing Inspector'),
    createPara('Search engines and social platforms rely on structured metadata to display snippets and preview cards.'),
    createBullet('Title & Description:', 'Measures exact character length against Google desktop/mobile truncation limits (30-60 chars for title, 70-160 chars for description).'),
    createBullet('Heading Structure:', 'Ensures exactly one <h1> tag is present with logical <h2>-<h6> subheadings.'),
    createBullet('Canonical Tags:', 'Validates self-referencing canonical URLs to prevent duplicate content indexing penalties.'),
    createBullet('OpenGraph & Twitter Cards:', 'Inspects og:title, og:description, og:image, and twitter:card tags.'),
    createBullet('Schema.org JSON-LD:', 'Extracts structured data scripts (Organization, BreadcrumbList, Product, Article, FAQPage).'),
    createBullet('SEO Health Score:', 'Calculates an overall 0-100% score with letter grades (A+ to F).'),
    createBullet('Dedicated Reports:', 'Includes live Google SERP Snippet Preview and Social Card previews under reports/seo-metadata/.'),

    // Feature 3: Page Speed
    createHeading2('2.3. Page Speed & Core Web Vitals Auditor'),
    createPara('Measures browser performance using native W3C Navigation Timing and Paint Timing APIs:'),
    createBullet('Time to First Byte (TTFB):', 'Server backend response speed (Target: < 400ms).'),
    createBullet('First Contentful Paint (FCP):', 'Time until initial visual content renders (Target: < 1.8s).'),
    createBullet('Largest Contentful Paint (LCP):', 'Time until main hero content renders (Target: < 2.5s).'),
    createBullet('Cumulative Layout Shift (CLS):', 'Visual layout stability score during page loading.'),
    createBullet('Payload Breakdown:', 'Measures transfer size in KB and request count for JavaScript, CSS, Images, Fonts, APIs, and HTML.'),
    createBullet('Optimization Plan:', 'Detects bottlenecks (>600ms TTFB, >1.5MB JS, >3MB images) with actionable fixes.'),

    // Feature 4: Images
    createHeading2('2.4. Image Asset & Accessibility Diagnostic'),
    createBullet('Broken Images:', 'Detects missing or 404 image URLs across <img>, <picture>, and CSS background-image.'),
    createBullet('WCAG Accessibility:', 'Flags missing alt="..." attributes required for screen readers and SEO.'),
    createBullet('Dimension Distortion:', 'Compares rendered visual dimensions against natural dimensions to spot distortion.'),

    // Feature 5: Links
    createHeading2('2.5. Hyperlink & Redirection Chain Tracer'),
    createBullet('Internal & External Links:', 'Crawls every anchor tag <a href="..."> and verifies target status.'),
    createBullet('Protocol Security:', 'Flags insecure HTTP links referenced from secure HTTPS pages.'),

    // Feature 6: Dynamic APIs
    createHeading2('2.6. Dynamic Network Traffic & API Monitor'),
    createBullet('XHR & Fetch Calls:', 'Captures dynamic REST/GraphQL asynchronous network requests.'),
    createBullet('CORS & Failures:', 'Identifies Cross-Origin Resource Sharing rejections and failed backend calls.'),

    // Feature 7: WebFonts
    createHeading2('2.7. WebFont & Typography Validator'),
    createBullet('Font Declarations:', 'Audits @font-face rules (.woff2, .woff, .ttf) and document.fonts rendering state.'),

    // Feature 8: Console Errors
    createHeading2('2.8. JavaScript Console & Runtime Exception Catcher'),
    createBullet('Uncaught Exceptions:', 'Catches JavaScript errors crashing user interactions with exact script file and line number.'),

    // Feature 9: Report Cleaner
    createHeading2('2.9. Automated Report Directory Cleaner & Lifecycle Manager'),
    createBullet('One-Click Cleaning:', 'Quickly cleans stale report files (.html, .xlsx, .csv, .json) while preserving clean folder structures.'),
    createBullet('Targeted Purging:', 'Clean all folders or target specific functional areas (404-status, seo-metadata, page-speed, full-audit, etc.).'),
    createBullet('Disk Space Recovery:', 'Reports exact number of deleted files and total recovered disk space.')
  );

  // SECTION 3: NON-TECHNICAL USER GUIDE
  docChildren.push(
    createHeading1('3. Non-Technical User Guide: How to Run Audits'),
    createPara('Running an audit is straightforward with the interactive menu or bulk file upload:'),
    createHeading2('3.1. Interactive Terminal Prompt'),
    createPara('Run "npm start" without any arguments to open the arrow-key menu:'),
    ...createCodeBlock(
      '? Enter Webpage URL, Domain, Sitemap XML, or File Path: https://example.com/\n' +
      '? Select audit diagnostic:\n' +
      '  1. Only Images — this one page\n' +
      '  2. Only Images — crawl the entire website\n' +
      '  3. Only Hyperlinks / Links — this one page\n' +
      '  4. Only Hyperlinks / Links — crawl the entire website\n' +
      '  5. Only Network / API calls — this one page\n' +
      '  6. Only Network / API calls — crawl the entire website\n' +
      '  7. 404 Finder & Page Status — this one page\n' +
      '  8. 404 Finder & Page Status — crawl the entire website\n' +
      '  9. SEO Metadata Audit — this one page\n' +
      '  10. SEO Metadata Audit — crawl the entire website\n' +
      '  11. SEO Metadata Audit — bulk upload (file / list of URLs)\n' +
      '  12. Page Speed & Performance — this one page\n' +
      '  13. Page Speed & Performance — crawl the entire website\n' +
      '  14. 🌟 All diagnostics — Images + Links + API + Status + SEO + Speed (full audit)\n' +
      '  15. 🧹 Clear / Clean reports folder'
    ),
    createHeading2('3.2. Cleaning & Resetting Reports'),
    createPara('To clean old reports and reclaim disk space:'),
    ...createCodeBlock(
      'npm run clean:reports\n' +
      'npm start -- --clean\n' +
      'npm start -- --clean status\n' +
      'npm start -- --clean seo'
    ),
    createHeading2('3.3. Bulk URL Upload via CSV or TXT'),
    createPara('Create a file (e.g. urls.csv) with a column of URLs and run:'),
    ...createCodeBlock(
      'npm start -- --bulk urls.csv --status\n' +
      'npm start -- --bulk urls.csv --seo\n' +
      'npm start -- --bulk urls.csv --speed'
    ),
    createHeading2('3.4. Score & Grade Interpretation Matrix'),
    createTable(
      ['Score Range', 'Grade', 'Color', 'Status Meaning', 'Recommended Action'],
      [
        ['95% - 100%', 'A+', 'Green', 'Optimal / Excellent', 'Meets all standards. No immediate action required.'],
        ['85% - 94%', 'A', 'Green', 'Good', 'Solid setup with minor enhancement opportunities.'],
        ['70% - 84%', 'B', 'Yellow', 'Moderate / Warning', 'Noticeable gaps (e.g. missing OG image). Review fixes.'],
        ['55% - 69%', 'C', 'Orange', 'Needs Improvement', 'Multiple SEO or speed bottlenecks. Prioritize fixes.'],
        ['40% - 54%', 'D', 'Red', 'Poor / At Risk', 'Critical tags missing or slow loading. Fix immediately.'],
        ['Below 40%', 'F', 'Red', 'Critical Failure', 'Broken pages, 404 errors, or missing metadata. Urgent fix.']
      ],
      [15, 10, 15, 25, 35]
    )
  );

  // SECTION 4: TECHNICAL ARCHITECTURE
  docChildren.push(
    createHeading1('4. Technical Architecture & Algorithms'),
    createHeading2('4.1. Core Engines & Data Flow'),
    createBullet('Browser Engine:', 'Playwright Chromium (headless execution, DOM evaluation, auto-scroll, CDP listeners).'),
    createBullet('HTTP Engine:', 'Axios with redirect hop interception (beforeRedirect) for low-overhead status verification.'),
    createBullet('Concurrency Limiter:', 'p-limit for controlled parallel testing without overloading host web servers.'),
    createBullet('Reporting Engines:', 'ExcelJS for multi-tab workbooks, custom HTML dashboard renderer, CSV and JSON serializers.'),
    
    createHeading2('4.2. SEO Scoring Weight Matrix (Max 100 Points)'),
    createTable(
      ['SEO Audit Item', 'Optimal Condition', 'Full Points', 'Penalty / Partial Points'],
      [
        ['Title Tag', 'Present & between 30 and 65 characters', '15 pts', '+8 pts if short; +10 pts if long; 0 pts if missing'],
        ['Meta Description', 'Present & between 70 and 160 characters', '15 pts', '+8 pts if short; +10 pts if long; 0 pts if missing'],
        ['H1 Headings', 'Exactly one <h1> tag on page', '15 pts', '+7 pts if multiple <h1> tags; 0 pts if missing'],
        ['OpenGraph Tags', 'og:title, og:description, og:image present', '15 pts', '+5 pts per tag present'],
        ['Canonical URL', 'Present & matching authoritative domain', '10 pts', '+6 pts if domain mismatch; 0 pts if missing'],
        ['Twitter Card', 'twitter:card or twitter:image present', '10 pts', '0 pts if missing'],
        ['Mobile Viewport', '<meta name="viewport"> configured', '10 pts', '0 pts if missing'],
        ['Language Tag', '<html lang="..."> declared', '5 pts', '0 pts if missing'],
        ['Structured Data', 'Schema.org JSON-LD scripts present', '5 pts', '0 pts if missing']
      ],
      [22, 38, 15, 25]
    ),

    createHeading2('4.3. Page Speed Penalty Matrix (Base 100 Points)'),
    createBullet('TTFB Penalty:', '-25 pts if > 1200ms; -12 pts if > 600ms.'),
    createBullet('FCP Penalty:', '-25 pts if > 3.0s; -10 pts if > 1.8s.'),
    createBullet('Total Load Penalty:', '-20 pts if > 6.0s; -10 pts if > 3.5s.'),
    createBullet('JS Bundle Penalty:', '-15 pts if > 1.5MB; -5 pts if > 600KB.'),
    createBullet('Image Payload Penalty:', '-15 pts if > 3.0MB; -5 pts if > 1.5MB.'),
    createBullet('Request Count Penalty:', '-5 pts if > 100 HTTP requests.')
  );

  // SECTION 5: ORGANIZED REPORTS STRUCTURE
  docChildren.push(
    createHeading1('5. Organized Reports Folder Structure'),
    createPara('All generated reports are automatically sorted into functional subfolders:'),
    ...createCodeBlock(
      'reports/\n' +
      '├── 404-status/     # 404 Finder & Page Status reports (*.html, *.xlsx, *.csv, *.json)\n' +
      '├── seo-metadata/   # SEO Metadata & Social Card reports (*.html, *.xlsx, *.csv, *.json)\n' +
      '├── page-speed/     # Page Speed & Web Vitals reports (*.html, *.xlsx, *.csv, *.json)\n' +
      '├── full-audit/     # Full unified audits containing all diagnostics combined\n' +
      '├── images/         # Image asset focus reports\n' +
      '├── links/          # Hyperlink & redirection focus reports\n' +
      '└── apis/           # Network & dynamic API traffic focus reports'
    ),
    createHeading2('Report File Types'),
    createTable(
      ['Format', 'File Pattern', 'Key Features'],
      [
        ['Interactive HTML', '*_report_*.html', 'Dark-themed dashboard, live search filter, KPI cards, Web Vitals gauges, SERP & Social card previews, Remediation Plan.'],
        ['Excel Spreadsheet', '*_report_*.xlsx', 'Tab 1: Detailed Diagnostics, Tab 2: SEO Inspector, Tab 3: Speed Metrics, Tab 4: Summary Table with styled KPI rows.'],
        ['Detailed CSV', '*_report_*.csv', 'Comma-delimited file formatted for Google Sheets, Excel, Tableau, PowerBI, and data pipelines.'],
        ['Structured JSON', '*_report_*.json', 'Full nested JSON payload for custom webhook integrations and logging databases.']
      ],
      [22, 28, 50]
    )
  );

  // SECTION 6: ERROR CODE CATALOG
  docChildren.push(
    createHeading1('6. Error Code & Remediation Catalog'),
    createTable(
      ['Category', 'Error Code', 'Root Cause', 'Actionable Fix Action'],
      [
        ['Status', 'HTTP_404_NOT_FOUND', 'Page or resource was deleted or moved.', 'Configure 301 Moved Permanently redirect in server config.'],
        ['Status', 'HTTP_500_ERROR', 'Server crash or database connectivity failure.', 'Inspect backend application logs and database connection pool.'],
        ['Status', 'HTTP_REDIRECT', 'URL redirects across one or more hops.', 'Update links to point directly to the destination URL.'],
        ['SEO', 'MISSING_TITLE', '<title> tag is missing from <head>.', 'Add a unique, keyword-rich <title> tag (30-60 chars).'],
        ['SEO', 'MISSING_DESC', '<meta name="description"> is missing.', 'Add a descriptive meta description (70-160 chars) to boost CTR.'],
        ['SEO', 'MULTIPLE_H1', 'Page contains more than one <h1> tag.', 'Use exactly one <h1> tag; structure subtopics with <h2>-<h6>.'],
        ['SEO', 'NO_OG_IMAGE', 'og:image meta tag is missing.', 'Add an OpenGraph preview image (1200x630px) for social sharing.'],
        ['Speed', 'SLOW_TTFB', 'Server latency exceeds 600ms.', 'Enable CDN caching (Cloudflare/Fastly) and query caching.'],
        ['Speed', 'HEAVY_JS_BUNDLE', 'JS payload exceeds 1.5MB.', 'Apply code-splitting, dynamic imports, minification, and gzip/brotli.'],
        ['Speed', 'HEAVY_IMAGES', 'Images exceed 3.0MB total.', 'Convert graphics to Next-Gen WebP/AVIF and add loading="lazy".'],
        ['Image', 'IMG_BROKEN', 'Image src returned 404 or failed.', 'Replace broken image source in CMS / Digital Asset Management.'],
        ['Image', 'WCAG_ALT_MISSING', '<img> tag has no alt attribute.', 'Add descriptive alt="Description" attribute for accessibility.'],
        ['Link', 'LINK_BROKEN', 'Anchor link targets a non-existent URL.', 'Update href attribute to valid destination or remove dead link.'],
        ['API', 'NET_REQUEST_FAILED', 'Background Fetch/XHR call failed.', 'Check API gateway health, endpoint routing, and auth tokens.'],
        ['Console', 'JS_RUNTIME_ERROR', 'Uncaught JavaScript exception.', 'Review script stack trace, use optional chaining ?., add try/catch.']
      ],
      [12, 23, 30, 35]
    )
  );

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Segoe UI',
            size: 20,
            color: '1E293B'
          }
        }
      }
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.8),
              bottom: convertInchesToTwip(0.8),
              left: convertInchesToTwip(0.8),
              right: convertInchesToTwip(0.8)
            }
          }
        },
        children: docChildren
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath1 = path.join(process.cwd(), 'DOCUMENTATION.docx');
  const outPath2 = path.join(process.cwd(), 'Page_Sentinel_Complete_Product_Technical_Manual.docx');

  await fs.writeFile(outPath1, buffer);
  await fs.writeFile(outPath2, buffer);

  console.log(`✔ Successfully generated Word document (.docx):`);
  console.log(`  1. ${outPath1}`);
  console.log(`  2. ${outPath2}`);
}

generateDocx().catch((err) => {
  console.error('Error generating docx:', err);
  process.exit(1);
});
