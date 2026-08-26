export type StatusLevel = 'success' | 'warning' | 'error' | 'info';

export type AuditFocus = 'all' | 'image' | 'link' | 'api' | 'status' | 'seo' | 'speed';

export interface AuditOptions {
  url: string;
  focus?: AuditFocus;
  timeout?: number;
  headless?: boolean;
  scroll?: boolean;
  concurrency?: number;
  outputDir?: string;
  userAgent?: string;
  maxPages?: number;
  sitemap?: boolean;
  bulkFile?: string;
}

export interface ActionableFix {
  category: 'Network' | 'Console' | 'Image' | 'Font' | 'API' | 'Link' | 'Status' | 'SEO' | 'Speed';
  severity: 'Critical' | 'Warning' | 'Info';
  targetUrl: string;
  errorCode: string;
  reason: string;
  suggestedFix: string;
  elementOrSource?: string;
  pageUrl?: string;
}

export interface NetworkEntry {
  id: string;
  url: string;
  method: string;
  resourceType: 'fetch' | 'xhr' | 'image' | 'script' | 'stylesheet' | 'font' | 'document' | 'media' | 'other';
  status: number | null;
  statusText: string;
  durationMs: number;
  isFailed: boolean;
  errorCode?: string;
  reason?: string;
  suggestedFix?: string;
  errorMessage?: string;
  contentType?: string;
  postData?: string;
  initiator?: string;
  responseSnippet?: string;
  timestamp: string;
}

export interface ImageIssue {
  url: string;
  elementTag: string;
  renderedWidth: number;
  renderedHeight: number;
  naturalWidth: number;
  naturalHeight: number;
  hasAlt: boolean;
  altText: string;
  status: number | null;
  statusText: string;
  isBroken: boolean;
  errorCode?: string;
  reason?: string;
  suggestedFix?: string;
  isLazy: boolean;
}

export interface FontIssue {
  family: string;
  url: string;
  status: number | null;
  statusText: string;
  isLoaded: boolean;
  isBroken: boolean;
  errorCode?: string;
  reason?: string;
  suggestedFix?: string;
}

export interface ApiCall {
  url: string;
  method: string;
  resourceType: string;
  status: number | null;
  statusText: string;
  durationMs: number;
  isFailed: boolean;
  errorCode?: string;
  reason?: string;
  suggestedFix?: string;
  errorMessage?: string;
  contentType?: string;
  postData?: string;
}

export interface RedirectionHop {
  url: string;
  status: number;
}

export interface LinkCheckResult {
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  status: number | null;
  statusText: string;
  isBroken: boolean;
  isRedirected: boolean;
  redirectHops: RedirectionHop[];
  finalUrl: string;
  isExternal: boolean;
  isSecure: boolean;
  errorCode?: string;
  reason?: string;
  suggestedFix?: string;
  errorMessage?: string;
  durationMs: number;
}

export interface ConsoleMessageEntry {
  type: 'error' | 'warning' | 'info' | 'log' | 'pageerror';
  text: string;
  location?: string;
  stack?: string;
  errorCode?: string;
  reason?: string;
  suggestedFix?: string;
  timestamp: string;
}

// -------------------------------------------------------------
// FEATURE 1: 404 Finder & Page Status Result Types
// -------------------------------------------------------------
export interface PageStatusResult {
  url: string;
  finalUrl: string;
  httpStatus: number;
  statusText: string;
  is404: boolean;
  isError: boolean;
  isRedirect: boolean;
  redirectHops: RedirectionHop[];
  responseTimeMs: number;
  contentType: string;
  contentLength: number;
  pageTitle?: string;
  server?: string;
  errorCode?: string;
  reason?: string;
  suggestedFix?: string;
}

// -------------------------------------------------------------
// FEATURE 2: SEO Metadata Result Types
// -------------------------------------------------------------
export interface SeoMetadataResult {
  url: string;
  title: string;
  titleLength: number;
  titleStatus: 'optimal' | 'too_short' | 'too_long' | 'missing';
  description: string;
  descriptionLength: number;
  descriptionStatus: 'optimal' | 'too_short' | 'too_long' | 'missing';
  keywords: string;
  canonicalUrl: string;
  canonicalStatus: 'valid' | 'mismatch' | 'missing';
  robots: string;
  isIndexable: boolean;
  isFollowable: boolean;
  openGraph: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
    siteName?: string;
    hasOgTitle: boolean;
    hasOgDesc: boolean;
    hasOgImage: boolean;
  };
  twitterCard: {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
    hasTwitterCard: boolean;
  };
  headings: {
    h1: string[];
    h1Count: number;
    h2Count: number;
    h3Count: number;
    h4Count: number;
    h5Count: number;
    h6Count: number;
    h1Status: 'optimal' | 'missing' | 'multiple';
  };
  structuredData: {
    hasSchema: boolean;
    schemaCount: number;
    types: string[];
    rawSchemas: any[];
  };
  technical: {
    charset: string;
    viewport: string;
    hasViewport: boolean;
    lang: string;
    hasLang: boolean;
    favicon: string;
    wordCount: number;
  };
  score: number; // 0 to 100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  issues: string[];
  recommendations: string[];
}

// -------------------------------------------------------------
// FEATURE 3: Page Speed & Performance Result Types
// -------------------------------------------------------------
export interface SpeedBottleneck {
  severity: 'Critical' | 'Warning' | 'Info';
  metric: string;
  value: string;
  recommendation: string;
}

export interface PageSpeedResult {
  url: string;
  score: number; // 0 to 100
  rating: 'Good' | 'Needs Improvement' | 'Poor';
  metrics: {
    ttfbMs: number;
    dnsMs: number;
    tcpMs: number;
    sslMs: number;
    downloadMs: number;
    domInteractiveMs: number;
    domContentLoadedMs: number;
    loadCompleteMs: number;
    fcpMs: number;
    lcpMs: number;
    cls: number;
    tbtMs: number;
  };
  resources: {
    totalRequests: number;
    totalTransferSizeKb: number;
    jsCount: number;
    jsSizeKb: number;
    cssCount: number;
    cssSizeKb: number;
    imageCount: number;
    imageSizeKb: number;
    fontCount: number;
    fontSizeKb: number;
    htmlSizeKb: number;
    apiCount: number;
    apiSizeKb: number;
    otherCount: number;
    otherSizeKb: number;
  };
  bottlenecks: SpeedBottleneck[];
}

// -------------------------------------------------------------
// AUDIT SUMMARY & RESULTS
// -------------------------------------------------------------
export interface AuditSummary {
  totalIssues: number;
  errorCount: number;
  warningCount: number;
  network: {
    total: number;
    failed: number;
    apis: number;
    failedApis: number;
    images: number;
    failedImages: number;
    scripts: number;
    failedScripts: number;
  };
  images: {
    total: number;
    broken: number;
    missingAlt: number;
  };
  fonts: {
    total: number;
    broken: number;
  };
  apis: {
    total: number;
    failed: number;
  };
  links: {
    total: number;
    broken: number;
    redirected: number;
    external: number;
  };
  console: {
    total: number;
    errors: number;
    warnings: number;
    logs: number;
  };
  status?: {
    httpStatus: number;
    is404: boolean;
    isError: boolean;
    isRedirect: boolean;
    responseTimeMs: number;
  };
  seo?: {
    score: number;
    grade: string;
    issuesCount: number;
    hasTitle: boolean;
    hasDescription: boolean;
    hasH1: boolean;
    hasCanonical: boolean;
    hasOg: boolean;
  };
  speed?: {
    score: number;
    rating: string;
    loadCompleteMs: number;
    ttfbMs: number;
    fcpMs: number;
    totalTransferSizeKb: number;
    totalRequests: number;
  };
}

export interface AuditResult {
  targetUrl: string;
  finalPageUrl: string;
  pageTitle: string;
  httpStatus: number;
  scanTimestamp: string;
  durationMs: number;
  focus?: AuditFocus;
  networkTraffic: NetworkEntry[];
  images: ImageIssue[];
  fonts: FontIssue[];
  apiCalls: ApiCall[];
  links: LinkCheckResult[];
  consoleLogs: ConsoleMessageEntry[];
  actionableFixes: ActionableFix[];
  pageStatus?: PageStatusResult;
  seoMetadata?: SeoMetadataResult;
  pageSpeed?: PageSpeedResult;
  summary: AuditSummary;
}

export interface SiteAuditSummary {
  totalPages: number;
  totalIssues: number;
  errorCount: number;
  warningCount: number;
  network: {
    total: number;
    failed: number;
  };
  images: {
    total: number;
    broken: number;
    missingAlt: number;
  };
  fonts: {
    total: number;
    broken: number;
  };
  apis: {
    total: number;
    failed: number;
  };
  links: {
    total: number;
    broken: number;
    redirected: number;
  };
  console: {
    errors: number;
    warnings: number;
  };
  statusSummary?: {
    total200: number;
    total3xx: number;
    total404: number;
    total5xx: number;
    totalOtherErrors: number;
    avgResponseTimeMs: number;
  };
  seoSummary?: {
    avgScore: number;
    pagesMissingTitle: number;
    pagesMissingDesc: number;
    pagesMissingH1: number;
    pagesMissingCanonical: number;
    pagesMissingOg: number;
  };
  speedSummary?: {
    avgScore: number;
    avgLoadTimeMs: number;
    avgTtfbMs: number;
    avgFcpMs: number;
    avgPageSizeKb: number;
  };
}

export interface MultiPageAuditResult {
  siteUrl: string;
  sitemapUrl?: string;
  scanTimestamp: string;
  durationMs: number;
  focus?: AuditFocus;
  pages: AuditResult[];
  consolidatedFixes: ActionableFix[];
  summary: SiteAuditSummary;
}
