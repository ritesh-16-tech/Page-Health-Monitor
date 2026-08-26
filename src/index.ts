import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { input, select } from '@inquirer/prompts';
import { PageAuditor } from './auditor.js';
import { StatusChecker } from './checkers/statusChecker.js';
import { SeoChecker } from './checkers/seoChecker.js';
import { SpeedChecker } from './checkers/speedChecker.js';
import { TerminalReporter } from './reporters/terminalReporter.js';
import { HtmlReporter } from './reporters/htmlReporter.js';
import { JsonReporter } from './reporters/jsonReporter.js';
import { CsvReporter } from './reporters/csvReporter.js';
import { ExcelReporter } from './reporters/excelReporter.js';
import { MultiPageReporter } from './reporters/multiPageReporter.js';
import { StatusReporter } from './reporters/statusReporter.js';
import { SeoReporter } from './reporters/seoReporter.js';
import { SpeedReporter } from './reporters/speedReporter.js';
import { SitemapParser } from './utils/sitemapParser.js';
import { BulkUrlParser } from './utils/bulkUrlParser.js';
import { ReportCleaner } from './utils/reportCleaner.js';
import { ActionableFix, AuditFocus, AuditResult, MultiPageAuditResult, PageSpeedResult, PageStatusResult, SeoMetadataResult, SiteAuditSummary } from './types/audit.js';

function normalizeUrl(inputUrl: string): string {
  let url = inputUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  return url;
}

async function main() {
  const program = new Command();

  program
    .name('page-sentinel')
    .description('Universal Web Health, 404 Finder, SEO Metadata, Page Speed, Asset & API Auditor')
    .argument('[url]', 'Target URL, Domain, Sitemap XML, or File Path to audit')
    .option('-f, --focus <type>', 'Audit focus dimension (all, status, seo, speed, image, link, api)')
    .option('-i, --image', 'Focus audit exclusively on image assets (DOM, picture, dimensions, alt text)')
    .option('--link', 'Focus audit exclusively on hyperlinks, internal/external links & redirect hops')
    .option('--api', 'Focus audit exclusively on dynamic network traffic, XHR, fetch & REST/GraphQL APIs')
    .option('--status, --404', '404 Finder & Page HTTP Status checker')
    .option('--seo, --meta', 'SEO Metadata inspector (Title, Description, Canonical, Robots, OG, Schema)')
    .option('--speed, --perf', 'Page Speed & Web Vitals performance auditor')
    .option('--bulk <file_or_urls>', 'Bulk URL list (.txt, .csv, or comma-separated list of URLs)')
    .option('--clean [category]', 'Clean report files from reports directory (all, status, seo, speed, etc.)')
    .option('--clear-reports [category]', 'Alias for --clean')
    .option('-s, --sitemap [url]', 'Audit pages discovered from sitemap.xml')
    .option('-a, --all', 'Audit all pages in the sitemap without any limit')
    .option('-l, --limit <number>', 'Maximum number of pages to audit (e.g. 10, 20, or "all")')
    .option('-t, --timeout <ms>', 'Navigation timeout in milliseconds', '40000')
    .option('--headless <boolean>', 'Run in headless browser mode', 'true')
    .option('--no-scroll', 'Disable smooth auto-scroll to trigger lazy loading')
    .option('-c, --concurrency <number>', 'Concurrent checking limit', '6')
    .option('-o, --output-dir <path>', 'Directory to save HTML, CSV, Excel, and JSON reports', './reports')
    .parse(process.argv);

  const options = program.opts();
  let targetUrl = program.args[0];

  // Handle explicit --clean or --clear-reports flag
  if (options.clean !== undefined || options.clearReports !== undefined) {
    const cleanCategory = typeof options.clean === 'string' ? options.clean : typeof options.clearReports === 'string' ? options.clearReports : '';
    if (!cleanCategory && process.stdin.isTTY && !targetUrl) {
      await ReportCleaner.interactiveClean(options.outputDir);
    } else {
      const res = await ReportCleaner.clean(options.outputDir, cleanCategory || 'all');
      console.log(chalk.green(`✔ Cleaned ${res.filesDeleted} report file(s) from ${options.outputDir} (${ReportCleaner.formatBytes(res.bytesFreed)} freed).`));
    }
    process.exit(0);
  }

  let focus: AuditFocus = 'all';
  if (options.focus) focus = options.focus.toLowerCase() as AuditFocus;
  else if (options.image) focus = 'image';
  else if (options.link) focus = 'link';
  else if (options.api) focus = 'api';
  else if (options.status || options['404']) focus = 'status';
  else if (options.seo || options.meta) focus = 'seo';
  else if (options.speed || options.perf) focus = 'speed';

  let isBulkMode = !!options.bulk;
  let bulkInput = options.bulk || '';
  let crawlSitemap = options.sitemap !== undefined || options.all !== undefined || (options.limit !== undefined && !isBulkMode);

  const hasExplicitModeFlags =
    options.focus ||
    options.image ||
    options.link ||
    options.api ||
    options.status ||
    options['404'] ||
    options.seo ||
    options.meta ||
    options.speed ||
    options.perf ||
    options.bulk !== undefined ||
    options.sitemap !== undefined ||
    options.all !== undefined ||
    options.limit !== undefined;

  // Interactive Prompt Flow if URL missing or no mode flags provided in interactive TTY
  if (!targetUrl && !hasExplicitModeFlags) {
    console.log(chalk.bold.cyan('\n======================================================================'));
    console.log(chalk.bold.cyan('     🛡️  PAGE SENTINEL - UNIVERSAL WEB HEALTH & DIAGNOSTIC AUDITOR'));
    console.log(chalk.bold.cyan('======================================================================'));

    try {
      targetUrl = await input({
        message: 'Enter Webpage URL, Domain, Sitemap XML, or File Path to audit (or type "clean" to clear reports):'
      });
    } catch {
      process.exit(0);
    }

    if (targetUrl.trim().toLowerCase() === 'clean' || targetUrl.trim().toLowerCase() === 'clear') {
      await ReportCleaner.interactiveClean(options.outputDir);
      process.exit(0);
    }
  } else if (!targetUrl && options.sitemap && typeof options.sitemap === 'string') {
    targetUrl = options.sitemap;
  }

  // Check if input is a bulk file directly passed as URL argument
  if (targetUrl && (targetUrl.endsWith('.txt') || targetUrl.endsWith('.csv') || targetUrl.endsWith('.json'))) {
    isBulkMode = true;
    bulkInput = targetUrl;
  }

  // Interactive menu if no explicit flags
  if (!hasExplicitModeFlags && process.stdin.isTTY && !isBulkMode) {
    const isDirectSitemap = SitemapParser.isSitemapUrl(targetUrl);
    if (!isDirectSitemap) {
      try {
        const selectedMode = await select({
          message: `Select audit diagnostic for ${chalk.bold.cyan(targetUrl)}:`,
          choices: [
            { name: '1. Only Images — this one page', value: 'image-single' },
            { name: '2. Only Images — crawl the entire website', value: 'image-crawl' },
            { name: '3. Only Hyperlinks / Links — this one page', value: 'link-single' },
            { name: '4. Only Hyperlinks / Links — crawl the entire website', value: 'link-crawl' },
            { name: '5. Only Network / API calls — this one page', value: 'api-single' },
            { name: '6. Only Network / API calls — crawl the entire website', value: 'api-crawl' },
            { name: '7. 404 Finder & Page Status — this one page', value: 'status-single' },
            { name: '8. 404 Finder & Page Status — crawl the entire website', value: 'status-crawl' },
            { name: '9. SEO Metadata Audit — this one page', value: 'seo-single' },
            { name: '10. SEO Metadata Audit — crawl the entire website', value: 'seo-crawl' },
            { name: '11. SEO Metadata Audit — bulk upload (file / list of URLs)', value: 'seo-bulk' },
            { name: '12. Page Speed & Performance — this one page', value: 'speed-single' },
            { name: '13. Page Speed & Performance — crawl the entire website', value: 'speed-crawl' },
            { name: '14. 🌟 All diagnostics — Images + Links + API + Status + SEO + Speed (full audit)', value: 'all-full' },
            { name: '15. 🧹 Clear / Clean reports folder', value: 'clean-reports' }
          ],
          default: 'all-full'
        });

        if (selectedMode === 'clean-reports') {
          await ReportCleaner.interactiveClean(options.outputDir);
          process.exit(0);
        }

        switch (selectedMode) {
          case 'image-single':
            focus = 'image';
            crawlSitemap = false;
            break;
          case 'image-crawl':
            focus = 'image';
            crawlSitemap = true;
            break;
          case 'link-single':
            focus = 'link';
            crawlSitemap = false;
            break;
          case 'link-crawl':
            focus = 'link';
            crawlSitemap = true;
            break;
          case 'api-single':
            focus = 'api';
            crawlSitemap = false;
            break;
          case 'api-crawl':
            focus = 'api';
            crawlSitemap = true;
            break;
          case 'status-single':
            focus = 'status';
            crawlSitemap = false;
            break;
          case 'status-crawl':
            focus = 'status';
            crawlSitemap = true;
            break;
          case 'seo-single':
            focus = 'seo';
            crawlSitemap = false;
            break;
          case 'seo-crawl':
            focus = 'seo';
            crawlSitemap = true;
            break;
          case 'seo-bulk':
            focus = 'seo';
            isBulkMode = true;
            try {
              bulkInput = await input({
                message: 'Enter file path (.txt / .csv) or comma-separated list of URLs:'
              });
            } catch {
              process.exit(0);
            }
            break;
          case 'speed-single':
            focus = 'speed';
            crawlSitemap = false;
            break;
          case 'speed-crawl':
            focus = 'speed';
            crawlSitemap = true;
            break;
          case 'all-full':
          default:
            focus = 'all';
            crawlSitemap = false;
            break;
        }
      } catch {
        process.exit(0);
      }
    }
  }

  // =========================================================================
  // BULK URL AUDIT MODE (CSV / TXT / List of URLs)
  // =========================================================================
  if (isBulkMode && bulkInput) {
    const parseSpinner = ora({ text: 'Parsing bulk URLs...', color: 'cyan' }).start();
    const bulkUrls = await BulkUrlParser.parseInput(bulkInput);

    if (bulkUrls.length === 0) {
      parseSpinner.fail('No valid URLs discovered in bulk input.');
      process.exit(1);
    }

    parseSpinner.succeed(`Discovered ${chalk.bold.white(bulkUrls.length)} URLs for bulk audit [Focus: ${focus.toUpperCase()}]`);

    let pageLimit = bulkUrls.length;
    if (options.limit && options.limit !== 'all' && options.limit !== '0') {
      pageLimit = Math.min(parseInt(options.limit, 10), bulkUrls.length);
    }
    const urlsToAudit = bulkUrls.slice(0, pageLimit);

    // 1. FAST PATH: If Focus is STATUS / 404 Finder
    if (focus === 'status') {
      console.log(chalk.bold.yellow(`\n🚀 Running 404 Finder on ${urlsToAudit.length} URLs with concurrency ${options.concurrency}...`));
      const statusChecker = new StatusChecker(parseInt(options.concurrency, 10), parseInt(options.timeout, 10));
      const statusSpinner = ora({ text: 'Checking page HTTP status codes...', color: 'cyan' }).start();

      const statusResults = await statusChecker.checkMultipleStatuses(urlsToAudit, (checked, total, currentUrl, res) => {
        statusSpinner.text = `[${checked}/${total}] HTTP ${res.httpStatus || 'FAIL'} - ${currentUrl.slice(0, 45)}...`;
      });

      statusSpinner.succeed(`Completed status check on ${statusResults.length} URLs!`);
      const { htmlPath, excelPath, csvPath, jsonPath, summaryHtmlPath, summaryCsvPath } = await StatusReporter.generateAll(statusResults, 'bulk_status_audit', options.outputDir);
      StatusReporter.printTerminal(statusResults, 'Bulk URL List', htmlPath, excelPath, csvPath, jsonPath, summaryHtmlPath, summaryCsvPath);
      return;
    }

    // 2. Specialized SEO Bulk Auditor
    if (focus === 'seo') {
      console.log(chalk.bold.yellow(`\n🚀 Running SEO Metadata Audit on ${urlsToAudit.length} URLs...`));
      const seoResults: SeoMetadataResult[] = [];
      const siteStartTime = Date.now();

      for (let i = 0; i < urlsToAudit.length; i++) {
        const u = urlsToAudit[i];
        const pageSpinner = ora({ text: `[${i + 1}/${urlsToAudit.length}] Inspecting SEO metadata for ${u}...`, color: 'cyan' }).start();

        const auditor = new PageAuditor({
          url: u,
          focus: 'seo',
          timeout: parseInt(options.timeout, 10),
          headless: options.headless !== 'false' && options.headless !== false,
          scroll: false,
          outputDir: options.outputDir
        });

        try {
          const res = await auditor.runAudit();
          if (res.seoMetadata) seoResults.push(res.seoMetadata);
          pageSpinner.succeed(`[${i + 1}/${urlsToAudit.length}] SEO Score: ${res.seoMetadata?.score || 0}% (${res.seoMetadata?.grade || 'F'}) - ${res.pageTitle || u}`);
        } catch (err: any) {
          pageSpinner.fail(`Failed to audit ${u}: ${err.message}`);
        }
      }

      const { htmlPath, excelPath, csvPath, jsonPath, summaryHtmlPath, summaryCsvPath } = await SeoReporter.generateAll(seoResults, 'bulk_seo_audit', options.outputDir);
      SeoReporter.printTerminal(seoResults, 'Bulk SEO Audit', htmlPath, excelPath, csvPath, jsonPath, summaryHtmlPath, summaryCsvPath);
      return;
    }

    // 3. Specialized Page Speed Bulk Auditor
    if (focus === 'speed') {
      console.log(chalk.bold.yellow(`\n🚀 Running Page Speed Audit on ${urlsToAudit.length} URLs...`));
      const speedResults: PageSpeedResult[] = [];

      for (let i = 0; i < urlsToAudit.length; i++) {
        const u = urlsToAudit[i];
        const pageSpinner = ora({ text: `[${i + 1}/${urlsToAudit.length}] Testing speed for ${u}...`, color: 'cyan' }).start();

        const auditor = new PageAuditor({
          url: u,
          focus: 'speed',
          timeout: parseInt(options.timeout, 10),
          headless: options.headless !== 'false' && options.headless !== false,
          scroll: false,
          outputDir: options.outputDir
        });

        try {
          const res = await auditor.runAudit();
          if (res.pageSpeed) speedResults.push(res.pageSpeed);
          pageSpinner.succeed(`[${i + 1}/${urlsToAudit.length}] Speed: ${res.pageSpeed?.score || 0}% (${(res.pageSpeed?.metrics.loadCompleteMs || 0) / 1000}s) - ${u}`);
        } catch (err: any) {
          pageSpinner.fail(`Failed to audit ${u}: ${err.message}`);
        }
      }

      const { htmlPath, excelPath, csvPath, jsonPath, summaryHtmlPath, summaryCsvPath } = await SpeedReporter.generateAll(speedResults, 'bulk_speed_audit', options.outputDir);
      SpeedReporter.printTerminal(speedResults, 'Bulk Speed Audit', htmlPath, excelPath, csvPath, jsonPath, summaryHtmlPath, summaryCsvPath);
      return;
    }

    // 4. General Bulk Audit
    await runMultiPageAudit(urlsToAudit, 'Bulk URLs', undefined, focus, options);
    return;
  }

  if (!targetUrl) {
    console.log(chalk.red('\n✖ Error: No URL provided. Exiting.'));
    process.exit(1);
  }

  targetUrl = normalizeUrl(targetUrl);

  try {
    new URL(targetUrl);
  } catch {
    console.log(chalk.red(`\n✖ Error: Invalid URL format: "${targetUrl}"`));
    process.exit(1);
  }

  // =========================================================================
  // SITEMAP & CRAWLING DISCOVERY
  // =========================================================================
  const sitemapParser = new SitemapParser();
  const isDirectSitemap = SitemapParser.isSitemapUrl(targetUrl);
  const shouldCheckSitemap = isDirectSitemap || crawlSitemap;

  let sitemapPages: string[] = [];
  let sitemapSourceUrl: string | undefined;

  if (shouldCheckSitemap) {
    const sitemapSpinner = ora({
      text: 'Scanning & parsing sitemap.xml...',
      color: 'cyan'
    }).start();

    try {
      if (isDirectSitemap) {
        sitemapSourceUrl = targetUrl;
        sitemapPages = await sitemapParser.parseSitemap(targetUrl);
      } else if (typeof options.sitemap === 'string') {
        sitemapSourceUrl = normalizeUrl(options.sitemap);
        sitemapPages = await sitemapParser.parseSitemap(sitemapSourceUrl);
      } else {
        const discovered = await sitemapParser.discoverSitemaps(targetUrl);
        if (discovered.length > 0) {
          sitemapSourceUrl = discovered[0];
          sitemapPages = await sitemapParser.parseSitemap(discovered[0]);
        }
      }

      if (sitemapPages.length > 0) {
        sitemapSpinner.succeed(`Discovered ${sitemapPages.length} pages in sitemap (${sitemapSourceUrl})`);
      } else {
        sitemapSpinner.warn('No sitemap entries found. Proceeding with single URL audit.');
      }
    } catch (sitemapErr: any) {
      sitemapSpinner.warn(`Sitemap parsing skipped: ${sitemapErr.message}. Proceeding with single URL.`);
    }
  }

  // =========================================================================
  // MULTI-PAGE AUDIT MODE
  // =========================================================================
  if (sitemapPages.length > 0) {
    let pageLimit = sitemapPages.length;

    if (options.limit && options.limit !== 'all' && options.limit !== '0') {
      pageLimit = Math.min(parseInt(options.limit, 10), sitemapPages.length);
    } else if (!options.all && !isDirectSitemap && !options.limit) {
      // Default cap of 10 pages when crawling domain
      pageLimit = Math.min(10, sitemapPages.length);
    }

    const pagesToAudit = sitemapPages.slice(0, pageLimit);

    // 1. Fast Path for 404 Status Crawl
    if (focus === 'status') {
      console.log(chalk.bold.yellow(`\n🚀 Checking 404 status codes across ${pagesToAudit.length} pages from sitemap...`));
      const statusChecker = new StatusChecker(parseInt(options.concurrency, 10), parseInt(options.timeout, 10));
      const statusSpinner = ora({ text: 'Checking status codes...', color: 'cyan' }).start();

      const statusResults = await statusChecker.checkMultipleStatuses(pagesToAudit, (checked, total, currentUrl, res) => {
        statusSpinner.text = `[${checked}/${total}] HTTP ${res.httpStatus || 'FAIL'} - ${currentUrl.slice(0, 45)}...`;
      });

      statusSpinner.succeed(`Completed status check on ${statusResults.length} pages!`);
      const { htmlPath, excelPath, csvPath, jsonPath, summaryHtmlPath, summaryCsvPath } = await StatusReporter.generateAll(statusResults, targetUrl, options.outputDir);
      StatusReporter.printTerminal(statusResults, targetUrl, htmlPath, excelPath, csvPath, jsonPath, summaryHtmlPath, summaryCsvPath);
      return;
    }

    // 2. Fast Path for SEO Crawl
    if (focus === 'seo') {
      console.log(chalk.bold.yellow(`\n🚀 Auditing SEO Metadata across ${pagesToAudit.length} pages from sitemap...`));
      const seoResults: SeoMetadataResult[] = [];

      for (let i = 0; i < pagesToAudit.length; i++) {
        const u = pagesToAudit[i];
        const pageSpinner = ora({ text: `[${i + 1}/${pagesToAudit.length}] SEO Check: ${u}...`, color: 'cyan' }).start();

        const auditor = new PageAuditor({
          url: u,
          focus: 'seo',
          timeout: parseInt(options.timeout, 10),
          headless: options.headless !== 'false' && options.headless !== false,
          scroll: false,
          outputDir: options.outputDir
        });

        try {
          const res = await auditor.runAudit();
          if (res.seoMetadata) seoResults.push(res.seoMetadata);
          pageSpinner.succeed(`[${i + 1}/${pagesToAudit.length}] SEO Score: ${res.seoMetadata?.score || 0}% - ${res.pageTitle || u}`);
        } catch (err: any) {
          pageSpinner.fail(`Failed to audit ${u}: ${err.message}`);
        }
      }

      const { htmlPath, excelPath, csvPath, jsonPath, summaryHtmlPath, summaryCsvPath } = await SeoReporter.generateAll(seoResults, targetUrl, options.outputDir);
      SeoReporter.printTerminal(seoResults, targetUrl, htmlPath, excelPath, csvPath, jsonPath, summaryHtmlPath, summaryCsvPath);
      return;
    }

    // 3. Fast Path for Page Speed Crawl
    if (focus === 'speed') {
      console.log(chalk.bold.yellow(`\n🚀 Auditing Page Speed across ${pagesToAudit.length} pages from sitemap...`));
      const speedResults: PageSpeedResult[] = [];

      for (let i = 0; i < pagesToAudit.length; i++) {
        const u = pagesToAudit[i];
        const pageSpinner = ora({ text: `[${i + 1}/${pagesToAudit.length}] Speed Check: ${u}...`, color: 'cyan' }).start();

        const auditor = new PageAuditor({
          url: u,
          focus: 'speed',
          timeout: parseInt(options.timeout, 10),
          headless: options.headless !== 'false' && options.headless !== false,
          scroll: false,
          outputDir: options.outputDir
        });

        try {
          const res = await auditor.runAudit();
          if (res.pageSpeed) speedResults.push(res.pageSpeed);
          pageSpinner.succeed(`[${i + 1}/${pagesToAudit.length}] Speed: ${res.pageSpeed?.score || 0}% (${(res.pageSpeed?.metrics.loadCompleteMs || 0) / 1000}s) - ${u}`);
        } catch (err: any) {
          pageSpinner.fail(`Failed to audit ${u}: ${err.message}`);
        }
      }

      const { htmlPath, excelPath, csvPath, jsonPath, summaryHtmlPath, summaryCsvPath } = await SpeedReporter.generateAll(speedResults, targetUrl, options.outputDir);
      SpeedReporter.printTerminal(speedResults, targetUrl, htmlPath, excelPath, csvPath, jsonPath, summaryHtmlPath, summaryCsvPath);
      return;
    }

    // 4. Comprehensive Site Audit (All Diagnostics)
    await runMultiPageAudit(pagesToAudit, targetUrl, sitemapSourceUrl, focus, options);
    return;
  }

  // =========================================================================
  // SINGLE PAGE AUDIT MODE
  // =========================================================================
  console.log(chalk.gray(`\nStarting [${focus.toUpperCase()}] audit on: ${chalk.bold.white(targetUrl)}`));

  // Specialized Single Page Runners
  if (focus === 'status') {
    const statusSpinner = ora({ text: `Checking HTTP status for ${targetUrl}...`, color: 'cyan' }).start();
    const statusChecker = new StatusChecker(1, parseInt(options.timeout, 10));
    const statusResult = await statusChecker.checkSingleStatus(targetUrl);
    statusSpinner.succeed(`Checked ${targetUrl} (HTTP ${statusResult.httpStatus})`);

    const { htmlPath, excelPath, csvPath, jsonPath, summaryHtmlPath, summaryCsvPath } = await StatusReporter.generateAll([statusResult], targetUrl, options.outputDir);
    StatusReporter.printTerminal([statusResult], targetUrl, htmlPath, excelPath, csvPath, jsonPath, summaryHtmlPath, summaryCsvPath);
    return;
  }

  const spinner = ora({
    text: 'Initializing browser audit engine...',
    color: 'cyan'
  }).start();

  const auditor = new PageAuditor({
    url: targetUrl,
    focus,
    timeout: parseInt(options.timeout, 10),
    headless: options.headless !== 'false' && options.headless !== false,
    scroll: options.scroll !== false,
    concurrency: parseInt(options.concurrency, 10),
    outputDir: options.outputDir
  });

  try {
    const result = await auditor.runAudit((stage, detail) => {
      switch (stage) {
        case 'launch':
          spinner.text = 'Launching Chromium headless engine...';
          break;
        case 'navigate':
          spinner.text = `Navigating to ${targetUrl}...`;
          break;
        case 'scroll':
          spinner.text = 'Auto-scrolling page to trigger lazy-loaded assets & dynamic APIs...';
          break;
        case 'status':
          spinner.text = 'Inspecting HTTP response headers, 404s & redirect chains...';
          break;
        case 'seo':
          spinner.text = 'Analyzing SEO metadata, heading hierarchy, and structured data...';
          break;
        case 'speed':
          spinner.text = 'Measuring Core Web Vitals, Navigation Timing & payload sizes...';
          break;
        case 'images':
          spinner.text = 'Analyzing DOM images and visual dimensions...';
          break;
        case 'fonts':
          spinner.text = 'Inspecting WebFonts and font faces...';
          break;
        case 'links':
          spinner.text = 'Discovering and verifying hyperlinks & redirections...';
          break;
        case 'links_progress':
          spinner.text = detail || 'Verifying hyperlinks...';
          break;
        default:
          spinner.text = detail || 'Running diagnostics...';
          break;
      }
    });

    spinner.succeed('Audit complete! Generating reports...');

    // If focus was specifically SEO, generate dedicated SEO report as well
    if (focus === 'seo' && result.seoMetadata) {
      const { htmlPath, excelPath, csvPath, jsonPath, summaryHtmlPath, summaryCsvPath } = await SeoReporter.generateAll([result.seoMetadata], targetUrl, options.outputDir);
      SeoReporter.printTerminal([result.seoMetadata], targetUrl, htmlPath, excelPath, csvPath, jsonPath, summaryHtmlPath, summaryCsvPath);
      return;
    }

    // If focus was specifically Speed, generate dedicated Speed report as well
    if (focus === 'speed' && result.pageSpeed) {
      const { htmlPath, excelPath, csvPath, jsonPath, summaryHtmlPath, summaryCsvPath } = await SpeedReporter.generateAll([result.pageSpeed], targetUrl, options.outputDir);
      SpeedReporter.printTerminal([result.pageSpeed], targetUrl, htmlPath, excelPath, csvPath, jsonPath, summaryHtmlPath, summaryCsvPath);
      return;
    }

    // Generate full unified HTML, Excel (.xlsx), CSV, and JSON reports
    const { htmlPath: htmlReportPath, summaryHtmlPath } = await HtmlReporter.generate(result, options.outputDir);
    const excelReportPath = await ExcelReporter.generate(result, options.outputDir);
    const { csvPath, summaryCsvPath } = await CsvReporter.generate(result, options.outputDir);
    const jsonReportPath = await JsonReporter.generate(result, options.outputDir);

    // Print Rich Terminal Output
    TerminalReporter.print(result, htmlReportPath, jsonReportPath, csvPath, excelReportPath, summaryCsvPath, summaryHtmlPath);

  } catch (err: any) {
    spinner.fail(`Audit encountered an error: ${err.message}`);
    console.error(chalk.red(err.stack || err));
    process.exit(1);
  }
}

async function runMultiPageAudit(
  pagesToAudit: string[],
  targetUrl: string,
  sitemapSourceUrl: string | undefined,
  focus: AuditFocus,
  options: any
) {
  console.log(
    chalk.bold.yellow(
      `\n🚀 Auditing ${pagesToAudit.length} page(s) [Focus: ${focus.toUpperCase()}]`
    )
  );

  const siteStartTime = Date.now();
  const pageResults: AuditResult[] = [];
  const allFixes: ActionableFix[] = [];

  for (let i = 0; i < pagesToAudit.length; i++) {
    const pageUrl = pagesToAudit[i];
    console.log(chalk.cyan(`\n[Page ${i + 1}/${pagesToAudit.length}] Auditing: ${chalk.bold.white(pageUrl)}`));

    const pageSpinner = ora({
      text: `Auditing ${pageUrl}...`,
      color: 'cyan'
    }).start();

    const auditor = new PageAuditor({
      url: pageUrl,
      focus,
      timeout: parseInt(options.timeout, 10),
      headless: options.headless !== 'false' && options.headless !== false,
      scroll: options.scroll !== false,
      concurrency: parseInt(options.concurrency, 10),
      outputDir: options.outputDir
    });

    try {
      const pageResult = await auditor.runAudit((stage, detail) => {
        pageSpinner.text = `[${i + 1}/${pagesToAudit.length}] ${detail || stage}`;
      });

      pageSpinner.succeed(
        `[${i + 1}/${pagesToAudit.length}] Checked: ${pageResult.pageTitle || pageUrl} (${pageResult.summary.errorCount} errors, ${pageResult.summary.warningCount} warnings)`
      );

      for (const fix of pageResult.actionableFixes) {
        allFixes.push({
          ...fix,
          pageUrl
        });
      }

      pageResults.push(pageResult);
    } catch (err: any) {
      pageSpinner.fail(`Failed to audit ${pageUrl}: ${err.message}`);
    }
  }

  // Compile Aggregate Summary
  const siteSummary: SiteAuditSummary = {
    totalPages: pageResults.length,
    totalIssues: pageResults.reduce((acc, p) => acc + p.summary.totalIssues, 0),
    errorCount: pageResults.reduce((acc, p) => acc + p.summary.errorCount, 0),
    warningCount: pageResults.reduce((acc, p) => acc + p.summary.warningCount, 0),
    network: {
      total: pageResults.reduce((acc, p) => acc + p.summary.network.total, 0),
      failed: pageResults.reduce((acc, p) => acc + p.summary.network.failed, 0)
    },
    images: {
      total: pageResults.reduce((acc, p) => acc + p.summary.images.total, 0),
      broken: pageResults.reduce((acc, p) => acc + p.summary.images.broken, 0),
      missingAlt: pageResults.reduce((acc, p) => acc + p.summary.images.missingAlt, 0)
    },
    fonts: {
      total: pageResults.reduce((acc, p) => acc + p.summary.fonts.total, 0),
      broken: pageResults.reduce((acc, p) => acc + p.summary.fonts.broken, 0)
    },
    apis: {
      total: pageResults.reduce((acc, p) => acc + p.summary.apis.total, 0),
      failed: pageResults.reduce((acc, p) => acc + p.summary.apis.failed, 0)
    },
    links: {
      total: pageResults.reduce((acc, p) => acc + p.summary.links.total, 0),
      broken: pageResults.reduce((acc, p) => acc + p.summary.links.broken, 0),
      redirected: pageResults.reduce((acc, p) => acc + p.summary.links.redirected, 0)
    },
    console: {
      errors: pageResults.reduce((acc, p) => acc + p.summary.console.errors, 0),
      warnings: pageResults.reduce((acc, p) => acc + p.summary.console.warnings, 0)
    }
  };

  const multiPageResult: MultiPageAuditResult = {
    siteUrl: targetUrl,
    sitemapUrl: sitemapSourceUrl,
    scanTimestamp: new Date().toISOString(),
    durationMs: Date.now() - siteStartTime,
    focus,
    pages: pageResults,
    consolidatedFixes: allFixes,
    summary: siteSummary
  };

  // Generate Multi-Page HTML, Excel (.xlsx), CSV, and JSON Reports
  const { htmlPath: htmlReportPath, summaryHtmlPath } = await MultiPageReporter.generateHtml(multiPageResult, options.outputDir);
  const excelReportPath = await ExcelReporter.generateMultiPage(multiPageResult, options.outputDir);
  const { csvPath: csvReportPath, summaryCsvPath } = await MultiPageReporter.generateCsv(multiPageResult, options.outputDir);
  const jsonReportPath = await MultiPageReporter.generateJson(multiPageResult, options.outputDir);

  MultiPageReporter.printTerminal(multiPageResult, htmlReportPath, csvReportPath, jsonReportPath, excelReportPath);
}

main();
