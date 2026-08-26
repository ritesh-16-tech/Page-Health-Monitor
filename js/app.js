/**
 * Page Sentinel - Main Application Controller
 * Handles user interactions, multi-source modes (Single URL, Sitemap XML, Bulk File Upload, Manual Queue),
 * real-time terminal output, report exporting, and dashboard visualization.
 */

document.addEventListener('DOMContentLoaded', () => {
  // State variables
  let currentAuditResult = null;
  let isAuditing = false;
  let loadedFileUrls = [];
  let manualQueuedUrls = [];

  // Initialize Dashboard Controller
  window.PageSentinelDashboard.init();

  // Mode Selection Elements
  const auditSourceMode = document.getElementById('auditSourceMode');
  const panelModeUrl = document.getElementById('panelModeUrl');
  const panelModeSitemap = document.getElementById('panelModeSitemap');
  const panelModeFile = document.getElementById('panelModeFile');
  const panelModeManual = document.getElementById('panelModeManual');

  // Single URL Elements
  const auditUrlInput = document.getElementById('auditUrl');
  const clearUrlBtn = document.getElementById('clearUrlBtn');
  const crawlSitemapCheckbox = document.getElementById('crawlSitemap');
  const crawlOptionsSection = document.getElementById('crawlOptionsSection');
  const limitCountRadio = document.getElementById('limitCountRadio');
  const allPagesRadio = document.getElementById('allPagesRadio');
  const pageCountLimitInput = document.getElementById('pageCountLimit');

  // Sitemap Elements
  const sitemapUrlInput = document.getElementById('sitemapUrlInput');
  const clearSitemapUrlBtn = document.getElementById('clearSitemapUrlBtn');
  const sitemapPageLimit = document.getElementById('sitemapPageLimit');

  // File Upload Elements
  const fileDropZone = document.getElementById('fileDropZone');
  const bulkFileInput = document.getElementById('bulkFileInput');
  const fileQueueStatus = document.getElementById('fileQueueStatus');
  const loadedFileName = document.getElementById('loadedFileName');
  const loadedFileCount = document.getElementById('loadedFileCount');
  const clearFileQueueBtn = document.getElementById('clearFileQueueBtn');
  const fileUrlChips = document.getElementById('fileUrlChips');

  // Manual List Elements
  const manualUrlInput = document.getElementById('manualUrlInput');
  const addSingleUrlBtn = document.getElementById('addSingleUrlBtn');
  const manualQueueLabel = document.getElementById('manualQueueLabel');
  const clearManualQueueBtn = document.getElementById('clearManualQueueBtn');
  const manualUrlChips = document.getElementById('manualUrlChips');

  // Diagnostics & Action Elements
  const diagCards = document.querySelectorAll('.diag-card');
  const runAuditBtn = document.getElementById('runAuditBtn');
  const cancelAuditBtn = document.getElementById('cancelAuditBtn');
  const auditSpinner = document.getElementById('auditSpinner');

  const terminalOutput = document.getElementById('terminalOutput');
  const copyLogsBtn = document.getElementById('copyLogsBtn');
  const clearLogsBtn = document.getElementById('clearLogsBtn');

  const metricPages = document.getElementById('metricPages');
  const metricCritical = document.getElementById('metricCritical');
  const metricWarnings = document.getElementById('metricWarnings');
  const metricTotal = document.getElementById('metricTotal');

  const openDashboardBtn = document.getElementById('openDashboardBtn');
  const downloadExcelBtn = document.getElementById('downloadExcelBtn');
  const downloadCsvBtn = document.getElementById('downloadCsvBtn');
  const downloadJsonBtn = document.getElementById('downloadJsonBtn');
  const downloadHtmlBtn = document.getElementById('downloadHtmlBtn');
  const printReportBtn = document.getElementById('printReportBtn');

  const moreExportsBtn = document.getElementById('moreExportsBtn');
  const moreExportsMenu = document.getElementById('moreExportsMenu');

  const toggleAdvancedBtn = document.getElementById('toggleAdvancedBtn');
  const advancedDrawerContent = document.getElementById('advancedDrawerContent');

  // 1. Audit Source Mode Switcher
  auditSourceMode.addEventListener('change', () => {
    const mode = auditSourceMode.value;
    panelModeUrl.classList.add('hidden');
    panelModeSitemap.classList.add('hidden');
    panelModeFile.classList.add('hidden');
    panelModeManual.classList.add('hidden');

    if (mode === 'url') panelModeUrl.classList.remove('hidden');
    else if (mode === 'sitemap') panelModeSitemap.classList.remove('hidden');
    else if (mode === 'file') panelModeFile.classList.remove('hidden');
    else if (mode === 'manual') panelModeManual.classList.remove('hidden');
  });

  // 2. Single URL Input & Clear Button
  function updateClearBtn() {
    if (auditUrlInput.value.trim().length > 0) {
      clearUrlBtn.classList.remove('hidden');
    } else {
      clearUrlBtn.classList.add('hidden');
    }
  }
  auditUrlInput.addEventListener('input', updateClearBtn);
  clearUrlBtn.addEventListener('click', () => {
    auditUrlInput.value = '';
    auditUrlInput.focus();
    updateClearBtn();
  });

  // Sitemap Auto-Crawl Toggle
  crawlSitemapCheckbox.addEventListener('change', () => {
    crawlOptionsSection.style.display = crawlSitemapCheckbox.checked ? 'block' : 'none';
  });

  // Sitemap XML URL input clear button
  sitemapUrlInput.addEventListener('input', () => {
    if (sitemapUrlInput.value.trim().length > 0) clearSitemapUrlBtn.classList.remove('hidden');
    else clearSitemapUrlBtn.classList.add('hidden');
  });
  clearSitemapUrlBtn.addEventListener('click', () => {
    sitemapUrlInput.value = '';
    sitemapUrlInput.focus();
    clearSitemapUrlBtn.classList.add('hidden');
  });

  // 3. Bulk File Upload (.txt, .csv, .xlsx, .xls, .json)
  fileDropZone.addEventListener('click', () => bulkFileInput.click());

  fileDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileDropZone.classList.add('dragover');
  });

  fileDropZone.addEventListener('dragleave', () => {
    fileDropZone.classList.remove('dragover');
  });

  fileDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    fileDropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleBulkFile(e.dataTransfer.files[0]);
    }
  });

  bulkFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleBulkFile(e.target.files[0]);
    }
  });

  async function handleBulkFile(file) {
    const fileName = file.name;
    const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
    let urls = [];

    try {
      if (ext === '.txt') {
        const text = await file.text();
        urls = extractUrlsFromText(text);
      } else if (ext === '.csv') {
        const text = await file.text();
        urls = extractUrlsFromCsv(text);
      } else if (ext === '.json') {
        const text = await file.text();
        urls = extractUrlsFromJson(text);
      } else if (ext === '.xlsx' || ext === '.xls') {
        if (!window.XLSX) {
          showToast('SheetJS parser loading. Please retry in a second.', 'warning');
          return;
        }
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        urls = extractUrlsFromWorkbook(workbook);
      } else {
        showToast('Unsupported format. Please upload .txt, .csv, .xlsx, or .json', 'error');
        return;
      }

      // Deduplicate and filter valid URLs
      urls = [...new Set(urls)].filter(u => isValidUrl(u));

      if (urls.length === 0) {
        showToast(`No valid URLs found in ${fileName}`, 'error');
        return;
      }

      loadedFileUrls = urls;
      loadedFileName.textContent = fileName;
      loadedFileCount.textContent = `${urls.length} URLs Loaded`;
      fileQueueStatus.classList.remove('hidden');

      renderFileUrlChips(urls);
      showToast(`Loaded ${urls.length} URLs from ${fileName}`);
    } catch (err) {
      showToast(`Failed to parse file: ${err.message}`, 'error');
    }
  }

  function renderFileUrlChips(urls) {
    fileUrlChips.innerHTML = urls.map((u, i) => `
      <div class="url-chip">
        <span>${escapeHtml(u)}</span>
        <button type="button" class="btn-remove-chip" onclick="PageSentinelApp.removeFileUrl(${i})" title="Remove URL">&times;</button>
      </div>
    `).join('');
  }

  clearFileQueueBtn.addEventListener('click', () => {
    loadedFileUrls = [];
    fileQueueStatus.classList.add('hidden');
    bulkFileInput.value = '';
    showToast('File queue cleared.');
  });

  // 4. Manual One-by-One URL List Builder
  function addManualUrl() {
    let urlVal = manualUrlInput.value.trim();
    if (!urlVal) return;

    if (!urlVal.startsWith('http://') && !urlVal.startsWith('https://')) {
      urlVal = 'https://' + urlVal;
    }

    if (!isValidUrl(urlVal)) {
      showToast('Please enter a valid URL.', 'error');
      return;
    }

    if (manualQueuedUrls.includes(urlVal)) {
      showToast('URL is already in the queue.', 'warning');
      return;
    }

    manualQueuedUrls.push(urlVal);
    manualUrlInput.value = '';
    manualUrlInput.focus();
    renderManualUrlChips();
    showToast(`Added: ${urlVal}`);
  }

  addSingleUrlBtn.addEventListener('click', addManualUrl);
  manualUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addManualUrl();
    }
  });

  function renderManualUrlChips() {
    manualQueueLabel.textContent = `QUEUED URLS (${manualQueuedUrls.length})`;
    if (manualQueuedUrls.length === 0) {
      manualUrlChips.innerHTML = `<div class="empty-queue-hint">No URLs added yet. Enter a URL above and click "+ Add URL".</div>`;
      return;
    }

    manualUrlChips.innerHTML = manualQueuedUrls.map((u, i) => `
      <div class="url-chip">
        <span>${escapeHtml(u)}</span>
        <button type="button" class="btn-remove-chip" onclick="PageSentinelApp.removeManualUrl(${i})" title="Remove URL">&times;</button>
      </div>
    `).join('');
  }

  clearManualQueueBtn.addEventListener('click', () => {
    manualQueuedUrls = [];
    renderManualUrlChips();
    showToast('Cleared queued URLs.');
  });

  // Global app helpers for chip removal
  window.PageSentinelApp = {
    removeFileUrl(index) {
      loadedFileUrls.splice(index, 1);
      loadedFileCount.textContent = `${loadedFileUrls.length} URLs Loaded`;
      if (loadedFileUrls.length === 0) {
        fileQueueStatus.classList.add('hidden');
      } else {
        renderFileUrlChips(loadedFileUrls);
      }
    },
    removeManualUrl(index) {
      manualQueuedUrls.splice(index, 1);
      renderManualUrlChips();
    }
  };

  // URL Parsing Helpers
  function extractUrlsFromText(text) {
    return text.split(/[\r\n]+/)
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#'));
  }

  function extractUrlsFromCsv(csvText) {
    const urls = [];
    const lines = csvText.split(/[\r\n]+/);
    for (const line of lines) {
      const cells = line.split(/[,\t;]/).map(c => c.replace(/^["']|["']$/g, '').trim());
      for (const cell of cells) {
        if (cell.startsWith('http://') || cell.startsWith('https://') || cell.includes('.')) {
          urls.push(cell);
        }
      }
    }
    return urls;
  }

  function extractUrlsFromJson(jsonText) {
    const parsed = JSON.parse(jsonText);
    const urls = [];
    function traverse(obj) {
      if (!obj) return;
      if (typeof obj === 'string' && (obj.startsWith('http://') || obj.startsWith('https://'))) {
        urls.push(obj);
      } else if (Array.isArray(obj)) {
        obj.forEach(traverse);
      } else if (typeof obj === 'object') {
        for (const [key, val] of Object.entries(obj)) {
          if (['url', 'link', 'loc', 'targetUrl', 'page'].includes(key.toLowerCase()) && typeof val === 'string') {
            urls.push(val);
          } else {
            traverse(val);
          }
        }
      }
    }
    traverse(parsed);
    return urls;
  }

  function extractUrlsFromWorkbook(workbook) {
    const urls = [];
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const jsonRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      jsonRows.forEach(row => {
        if (Array.isArray(row)) {
          row.forEach(cell => {
            const str = String(cell || '').trim();
            if (str.startsWith('http://') || str.startsWith('https://')) {
              urls.push(str);
            }
          });
        }
      });
    });
    return urls;
  }

  function isValidUrl(str) {
    try {
      const u = new URL(str);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // 5. Diagnostics Focus Selection Grid
  diagCards.forEach(card => {
    card.addEventListener('click', () => {
      diagCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
    });
  });

  // 6. Advanced Drawer Toggle
  toggleAdvancedBtn.addEventListener('click', () => {
    toggleAdvancedBtn.classList.toggle('open');
    advancedDrawerContent.classList.toggle('show');
  });

  // 7. More Exports Dropdown
  moreExportsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    moreExportsMenu.classList.toggle('show');
  });

  document.addEventListener('click', () => {
    moreExportsMenu.classList.remove('show');
  });

  // 8. Terminal Logging Helpers
  function logTerminal(message, type = 'info') {
    const line = document.createElement('div');
    line.className = `terminal-line log-${type}`;
    line.textContent = message;
    terminalOutput.appendChild(line);
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
  }

  function clearTerminal() {
    terminalOutput.innerHTML = '';
  }

  clearLogsBtn.addEventListener('click', clearTerminal);
  copyLogsBtn.addEventListener('click', () => {
    const text = terminalOutput.innerText;
    navigator.clipboard.writeText(text);
    showToast('Terminal logs copied to clipboard!');
  });

  // 9. Run Audit Execution
  runAuditBtn.addEventListener('click', async () => {
    if (isAuditing) return;

    const sourceMode = auditSourceMode.value;
    const selectedFocusEl = document.querySelector('input[name="auditFocus"]:checked');
    const focus = selectedFocusEl ? selectedFocusEl.value : 'all';

    const auditOptions = {
      sourceMode: sourceMode,
      focus: focus,
      timeout: parseInt(document.getElementById('timeoutInput')?.value, 10) || 30000,
      userAgent: document.getElementById('userAgentSelect')?.value || 'desktop',
      corsProxy: document.getElementById('corsProxySelect')?.value || 'auto',
      concurrency: parseInt(document.getElementById('concurrencyInput')?.value, 10) || 5
    };

    if (sourceMode === 'url') {
      let targetUrl = auditUrlInput.value.trim();
      if (!targetUrl) {
        showToast('Please enter a target URL to audit.', 'error');
        auditUrlInput.focus();
        return;
      }
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
        auditUrlInput.value = targetUrl;
        updateClearBtn();
      }
      auditOptions.url = targetUrl;
      auditOptions.crawlSitemap = crawlSitemapCheckbox.checked;
      auditOptions.limitType = document.querySelector('input[name="crawlLimitType"]:checked')?.value || 'limit';
      auditOptions.pageCountLimit = parseInt(pageCountLimitInput.value, 10) || 10;
    } else if (sourceMode === 'sitemap') {
      let sitemapVal = sitemapUrlInput.value.trim();
      if (!sitemapVal) {
        showToast('Please enter a sitemap XML URL to audit.', 'error');
        sitemapUrlInput.focus();
        return;
      }
      if (!sitemapVal.startsWith('http://') && !sitemapVal.startsWith('https://')) {
        sitemapVal = 'https://' + sitemapVal;
        sitemapUrlInput.value = sitemapVal;
      }
      auditOptions.sitemapUrl = sitemapVal;
      auditOptions.url = sitemapVal;
      auditOptions.sitemapPageLimit = parseInt(sitemapPageLimit.value, 10) || 20;
    } else if (sourceMode === 'file') {
      if (loadedFileUrls.length === 0) {
        showToast('Please upload a file containing URLs first.', 'error');
        bulkFileInput.click();
        return;
      }
      auditOptions.urls = loadedFileUrls;
      auditOptions.url = loadedFileUrls[0];
    } else if (sourceMode === 'manual') {
      if (manualQueuedUrls.length === 0) {
        showToast('Please add at least one URL to the queue.', 'error');
        manualUrlInput.focus();
        return;
      }
      auditOptions.urls = manualQueuedUrls;
      auditOptions.url = manualQueuedUrls[0];
    }

    // UI state: Running
    isAuditing = true;
    runAuditBtn.classList.add('running');
    runAuditBtn.querySelector('.btn-text').textContent = 'Auditing...';
    cancelAuditBtn.classList.remove('hidden');
    clearTerminal();

    try {
      currentAuditResult = await window.PageSentinelAuditEngine.runAudit(
        auditOptions,
        (msg, type) => logTerminal(msg, type),
        (current, total) => {}
      );

      updateMetricsSummary(currentAuditResult);
      showToast('Diagnostic audit completed successfully!');
    } catch (err) {
      logTerminal(`Audit failed: ${err.message}`, 'error');
      showToast('Audit failed. See terminal output for details.', 'error');
    } finally {
      isAuditing = false;
      runAuditBtn.classList.remove('running');
      runAuditBtn.querySelector('.btn-text').textContent = 'Run Audit';
      cancelAuditBtn.classList.add('hidden');
    }
  });

  // Cancel Audit
  cancelAuditBtn.addEventListener('click', () => {
    if (isAuditing) {
      window.PageSentinelAuditEngine.cancel();
      logTerminal('Cancelling audit operation...', 'warning');
    }
  });

  // 10. Update Summary Metric Cards
  function updateMetricsSummary(result) {
    if (!result || !result.summary) return;
    const summary = result.summary;

    metricPages.textContent = summary.pagesAudited || 1;
    metricCritical.textContent = summary.errorCount || 0;
    metricWarnings.textContent = summary.warningCount || 0;
    metricTotal.textContent = summary.totalIssues || 0;
  }

  // 11. Open Dashboard Modal
  openDashboardBtn.addEventListener('click', () => {
    if (!currentAuditResult) {
      showToast('Please run an audit first.', 'warning');
      return;
    }
    window.PageSentinelDashboard.open(currentAuditResult);
  });

  // 12. Export Report Handlers
  downloadExcelBtn.addEventListener('click', () => {
    if (!currentAuditResult) {
      showToast('Please run an audit first to export Excel.', 'warning');
      return;
    }
    window.PageSentinelExport.downloadExcel(currentAuditResult);
    showToast('Downloading Excel report (.xlsx)...');
  });

  downloadCsvBtn.addEventListener('click', () => {
    if (!currentAuditResult) {
      showToast('Please run an audit first to export CSV.', 'warning');
      return;
    }
    window.PageSentinelExport.downloadCSV(currentAuditResult);
    showToast('Downloading CSV report (.csv)...');
  });

  downloadJsonBtn.addEventListener('click', () => {
    if (!currentAuditResult) {
      showToast('Please run an audit first to export JSON.', 'warning');
      return;
    }
    window.PageSentinelExport.downloadJSON(currentAuditResult);
    showToast('Downloading JSON report (.json)...');
  });

  downloadHtmlBtn.addEventListener('click', () => {
    if (!currentAuditResult) {
      showToast('Please run an audit first to export HTML report.', 'warning');
      return;
    }
    window.PageSentinelExport.downloadHTMLReport(currentAuditResult);
    showToast('Downloading HTML report...');
  });

  printReportBtn.addEventListener('click', () => {
    if (!currentAuditResult) {
      showToast('Please run an audit first to print.', 'warning');
      return;
    }
    window.PageSentinelDashboard.open(currentAuditResult);
    setTimeout(() => {
      window.print();
    }, 500);
  });

  // Toast Notification System
  function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✓' : '⚠️'}</span>
      <span>${escapeHtml(message)}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3500);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Initial Reference State: Clean Ready State
  function setInitialReferenceState() {
    metricPages.textContent = '0';
    metricCritical.textContent = '0';
    metricWarnings.textContent = '0';
    metricTotal.textContent = '0';

    clearTerminal();
    logTerminal('Page Sentinel v1.0 diagnostic auditor ready.', 'info');
    logTerminal('Select an audit source above (Single URL, Sitemap XML, Bulk File, or Add URLs) and click "Run Audit".', 'muted');
  }

  setInitialReferenceState();
});
