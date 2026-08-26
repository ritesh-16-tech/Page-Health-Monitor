# 🛡️ Page-Health-Monitor - Universal Web Health, 404 Finder, SEO & Speed Diagnostic Auditor

A full-stack diagnostic CLI tool powered by **Playwright (Chromium)**, **Axios**, and **TypeScript** to perform deep audits on **ANY website, single page, bulk URL list, or full XML sitemap**.

> 📖 **Looking for in-depth technical architecture and non-technical business guides?** See the full [Product & Technical Documentation Manual](DOCUMENTATION.md).

Works out-of-the-box for any domain (e.g. `https://example.com/`, `https://your-website.com/`, etc.).

---

## 🌐 Interactive Web UI & Direct GitHub Pages Hosting

Page-Health-Monitor includes a modern, high-performance **Web UI** matching a dark developer aesthetic that can be **hosted directly on GitHub Pages** or run locally with zero build dependencies!

### 🚀 Direct Use on GitHub Pages
1. Push this repository to GitHub:
   ```bash
   git add .
   git commit -m "Deploy Page-Health-Monitor Web UI"
   git push origin main
   ```
2. Enable **GitHub Pages**:
   - Go to your repo on GitHub → **Settings** → **Pages**
   - Under **Build and deployment** → **Source**, select **Deploy from a branch**
   - Branch: `main` / Folder: `/ (root)` → Click **Save**
3. Open your live hosted URL: `https://<your-username>.github.io/<repo-name>/`

### 💻 Run Web UI Locally
```bash
npm run ui
# or
npm run serve
```
Open **`http://localhost:8933/`** in your browser.

### 🌟 Web UI Features
- 🔍 **Live Client-Side Auditor**: Audits web pages in real time via DOM parser, Image dimension testing, anchor link verification, SEO analysis, and multi-proxy CORS bypass (`corsproxy.io`, `allorigins`).
- ⚡ **Interactive Diagnostic Dashboard**: Scorecards, Actionable Fixes (with 1-click copy), Google SERP preview, OpenGraph / Twitter previews, Web Vitals gauges, and Image dimension inspectors.
- 📊 **Instant Multi-Format Exports**: Client-side Excel (`.xlsx` via SheetJS), CSV, JSON, and self-contained offline HTML reports.
- 🎯 **Multi-Source Modes**: Audit single URLs, sitemap XMLs, bulk uploaded files (`.txt`, `.csv`, `.xlsx`, `.json`), or build custom multi-URL queues one by one.


---

## 📋 Features & Audit Diagnostics

| Category | Inspected Items | Error Codes & Reasons Reported | Actionable Fix Suggestions |
|---|---|---|---|
| 🔍 **404 Finder & Status** | HTTP 200, 3xx Redirect chains, 404 Not Found, 5xx Server Errors, Latency | `HTTP_404_NOT_FOUND`, `HTTP_500_ERROR`, `HTTP_REDIRECT`, `ERR_CONNECTION_TIMED_OUT` | Setup 301 permanent redirects, fix broken routing, inspect backend server logs |
| 📈 **SEO Metadata** | Title, Description, Canonical URL, Robots meta, Headings (`h1`-`h6`), OpenGraph & Twitter Cards, Schema.org JSON-LD | `MISSING_TITLE`, `MISSING_DESC`, `MULTIPLE_H1`, `CANONICAL_MISMATCH`, `NO_OG_IMAGE` | Optimize title/desc lengths (SERP preview), structure headings, add OpenGraph social tags |
| ⚡ **Page Speed & Web Vitals** | TTFB (Server response), FCP, LCP, CLS, TBT, Total Load Time, Payload breakdown (JS/CSS/Images/APIs) | `SLOW_TTFB`, `RENDER_BLOCKING_RESOURCES`, `HEAVY_JS_BUNDLE`, `HEAVY_IMAGES` | Enable CDN edge caching, compress Next-Gen images (WebP/AVIF), minify JS & defer scripts |
| 🗺️ **Sitemaps & Bulk Upload** | Automatic discovery of `/sitemap.xml`, nested indexes, CSV/TXT bulk URL upload | `SITEMAP_INDEX_PARSED`, `DISCOVERED_PAGES`, `BULK_URLS_PARSED` | Batch audits multiple pages from sitemap or uploaded list |
| 🖼️ **Images** | `<img>`, `<picture>`, CSS `background-image`, visual dimensions, alt text | `HTTP_404`, `HTTP_500`, `IMG_CORRUPT_OR_ZERO_DIM`, `WCAG_ALT_MISSING` | Upload missing asset, fix DAM path, add descriptive `alt="..."` tags |
| 🔤 **WebFonts** | `@font-face` network loads, `.woff2`, `.woff`, `.ttf`, `document.fonts` | `FONT_HTTP_404`, `CORS_POLICY_VIOLATION`, `CSS_FONT_FACE_ERROR` | Configure `Access-Control-Allow-Origin: *`, fix `@font-face` URL |
| ⚡ **Dynamic APIs** | Fetch, XHR, REST, GraphQL background calls | `API_HTTP_404`, `API_HTTP_500`, `NET_ERR_ABORTED`, `DNS_NOT_RESOLVED` | Check backend endpoint routing, handle telemetry lifecycle |
| 🔗 **Links & Redirection** | `<a href>` hyperlinks, multi-hop 301/302 redirects | `HTTP_404_LINK`, `HTTP_400_LINK`, `TIMEOUT_EXCEEDED`, `HTTP_301_302_REDIRECT` | Update `href` directly to final URL, repair broken routing |
| ⚠️ **Console & JS Engine** | Uncaught exceptions, runtime errors, console warnings | `JSON_PARSE_SYNTAX_ERROR`, `NULL_POINTER_TYPE_ERROR`, `UNCAUGHT_JS_EXCEPTION` | Add `try/catch` around `JSON.parse()`, use optional chaining `?.` |

---

## 💡 Interactive Arrow-Key Menu

Run `npm start` (with no arguments) to launch the interactive prompt:

```text
? Enter Webpage URL, Domain, Sitemap XML, or File Path to audit (or type "clean" to clear reports): https://example.com/
? Select audit diagnostic for https://example.com/: (Use arrow keys)
  1. Only Images — this one page
  2. Only Images — crawl the entire website
  3. Only Hyperlinks / Links — this one page
  4. Only Hyperlinks / Links — crawl the entire website
  5. Only Network / API calls — this one page
  6. Only Network / API calls — crawl the entire website
  7. 404 Finder & Page Status — this one page
  8. 404 Finder & Page Status — crawl the entire website
  9. SEO Metadata Audit — this one page
  10. SEO Metadata Audit — crawl the entire website
  11. SEO Metadata Audit — bulk upload (file / list of URLs)
  12. Page Speed & Performance — this one page
  13. Page Speed & Performance — crawl the entire website
  14. 🌟 All diagnostics — Images + Links + API + Status + SEO + Speed (full audit)
❯ 15. 🧹 Clear / Clean reports folder
```

---

## 🧹 Cleaning the Reports Directory

You can clean stale report files at any time:

```bash
# Clean all report files across all categories
npm run clean:reports
# or
npm start -- --clean

# Clean only a specific category
npm start -- --clean status       # Clean only 404 & Page Status reports
npm start -- --clean seo          # Clean only SEO Metadata reports
npm start -- --clean speed        # Clean only Page Speed reports
npm start -- --clean full-audit   # Clean only Full Audit reports
```

---

## 🚀 CLI Usage & Commands

> [!WARNING]
> ⚠️ **Always put `--` right after `npm start`.** Without it, npm intercepts any `--flag` for itself (silently, no error) and never forwards it to the script. Alternatively, run `npm run build` and use `node dist/index.js <target> [flags]`.

### 1. Single Page Audits
```bash
# Full unified audit on a single page (All checks in one run)
npm start -- https://example.com/page

# 404 Finder & HTTP status check
npm start -- https://example.com/page --status

# SEO Metadata inspection (Title, Meta Description, Headings, OpenGraph, SERP preview)
npm start -- https://example.com/page --seo

# Page Speed & Core Web Vitals (TTFB, FCP, LCP, CLS, TBT, payload weights)
npm start -- https://example.com/page --speed

# Image assets only
npm start -- https://example.com/page --image

# Hyperlinks & redirection hops only
npm start -- https://example.com/page --link

# Network & dynamic API traffic only
npm start -- https://example.com/page --api
```

### 2. Bulk URL Upload Audits (CSV / TXT)
Audit a custom list of URLs from a `.csv` or `.txt` file:
```bash
# Bulk 404 status check from CSV
npm start -- --bulk urls.csv --status

# Bulk SEO metadata audit from text file
npm start -- --bulk urls.txt --seo

# Bulk Page Speed audit from file
npm start -- --bulk urls.txt --speed
```

### 3. Website Crawl via Sitemap
```bash
# Domain root: auto-discover sitemap.xml, audit first 10 pages (default cap)
npm start -- https://example.com/ --sitemap

# 404 Finder across entire sitemap
npm start -- https://example.com/sitemap.xml --all --status

# SEO Metadata audit across entire sitemap
npm start -- https://example.com/sitemap.xml --all --seo

# Page Speed audit across entire sitemap
npm start -- https://example.com/sitemap.xml --all --speed

# Full unified diagnostics across entire sitemap
npm start -- https://example.com/sitemap.xml --all
```

---

## 📊 Organized Reports Structure in `./reports/`

Reports are automatically categorized into dedicated subfolders based on functionality:

```text
reports/
├── 404-status/     # 404 Finder & Page Status reports (HTML, Excel, CSV, JSON)
├── seo-metadata/   # SEO Metadata & Social card reports (HTML, Excel, CSV, JSON)
├── page-speed/     # Page Speed & Web Vitals performance reports (HTML, Excel, CSV, JSON)
├── full-audit/     # Full unified audits containing all diagnostics
├── images/         # Image asset focus reports
├── links/          # Hyperlinks & redirection focus reports
└── apis/           # Dynamic API & network focus reports
```

### Report Types & Formats
1. **Interactive HTML Dashboards (`*.html`)**:
   - Modern dark UI with live search, filtering tabs, Web Vitals gauges, Google SERP Snippet preview, and Social Share cards.
   - Dedicated **Actionable Fix Directory & Remediation Plan**.
2. **Multi-Tab Excel Spreadsheets (`*.xlsx`)**:
   - Tab 1: Detailed Diagnostics & Actionable Fixes.
   - Tab 2: SEO Metadata Inspector.
   - Tab 3: Page Speed & Asset Payload Breakdown.
   - Tab 4: Executive Summary Table with styled KPI cards.
3. **Structured CSV & JSON Reports (`*.csv`, `*.json`)**:
   - Machine-readable files for automated CI/CD pipelines and reporting dashboards.
