/**
 * Page Sentinel - Interactive Dashboard UI Controller
 * Manages modal views, tabs, filters, search, previews, and visualizations.
 */

window.PageSentinelDashboard = {
  currentData: null,
  activeFilter: 'all',
  searchQuery: '',

  init() {
    this.bindEvents();
  },

  bindEvents() {
    // Tab switching
    const tabButtons = document.querySelectorAll('.dash-tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        this.switchTab(targetTab);
      });
    });

    // Search filter
    const searchInput = document.getElementById('dashSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.applyFiltersAndSearch();
      });
    }

    // Filter pills
    const filterPills = document.querySelectorAll('.filter-pill');
    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.activeFilter = pill.getAttribute('data-filter');
        this.applyFiltersAndSearch();
      });
    });

    // Modal Close
    const closeBtn = document.getElementById('closeDashboardBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Modal Export Excel
    const exportBtn = document.getElementById('dashDownloadExcel');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        if (this.currentData) {
          window.PageSentinelExport.downloadExcel(this.currentData);
        }
      });
    }

    // Copy All Fixes Button
    const copyAllBtn = document.getElementById('copyAllFixesBtn');
    if (copyAllBtn) {
      copyAllBtn.addEventListener('click', () => this.copyAllFixes());
    }
  },

  open(auditResult) {
    this.currentData = auditResult;
    this.activeFilter = 'all';
    this.searchQuery = '';

    const searchInput = document.getElementById('dashSearchInput');
    if (searchInput) searchInput.value = '';

    // Reset filter pills
    document.querySelectorAll('.filter-pill').forEach(p => {
      if (p.getAttribute('data-filter') === 'all') p.classList.add('active');
      else p.classList.remove('active');
    });

    this.renderHeader();
    this.renderScorecards();
    this.renderAllTabs();

    // Default tab based on focus
    const focus = auditResult.focus || 'all';
    let defaultTab = 'tab-fixes';
    if (focus === 'image') defaultTab = 'tab-images';
    else if (focus === 'link') defaultTab = 'tab-links';
    else if (focus === 'api') defaultTab = 'tab-network';
    else if (focus === 'status') defaultTab = 'tab-status';
    else if (focus === 'seo') defaultTab = 'tab-seo';
    else if (focus === 'speed') defaultTab = 'tab-speed';

    this.switchTab(defaultTab);

    const modal = document.getElementById('dashboardModal');
    if (modal) modal.classList.remove('hidden');
  },

  close() {
    const modal = document.getElementById('dashboardModal');
    if (modal) modal.classList.add('hidden');
  },

  switchTab(tabId) {
    // Update Tab Buttons
    document.querySelectorAll('.dash-tab-btn').forEach(btn => {
      if (btn.getAttribute('data-tab') === tabId) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    // Update Tab Panes
    document.querySelectorAll('.dash-pane').forEach(pane => {
      if (pane.id === `pane-${tabId}`) pane.classList.add('active');
      else pane.classList.remove('active');
    });
  },

  renderHeader() {
    const data = this.currentData;
    const urlEl = document.getElementById('dashTargetUrl');
    const timeEl = document.getElementById('dashAuditTimestamp');
    const badgeEl = document.getElementById('dashFocusBadge');

    if (urlEl) urlEl.textContent = data.targetUrl || 'Target Webpage';
    if (timeEl) timeEl.textContent = new Date().toLocaleTimeString();
    if (badgeEl) badgeEl.textContent = `${(data.focus || 'ALL').toUpperCase()} DIAGNOSTICS`;
  },

  renderScorecards() {
    const data = this.currentData;
    const summary = data.summary || {};

    const healthEl = document.getElementById('dashHealthScore');
    const gradeEl = document.getElementById('dashHealthGrade');
    const crawledEl = document.getElementById('dashCrawledCount');
    const critEl = document.getElementById('dashCritCount');
    const warnEl = document.getElementById('dashWarnCount');
    const assetEl = document.getElementById('dashAssetCount');

    if (healthEl) healthEl.textContent = `${summary.healthScore || 85}/100`;
    if (gradeEl) gradeEl.textContent = `Grade: ${summary.grade || 'B+'}`;
    if (crawledEl) crawledEl.textContent = summary.pagesAudited || 1;
    if (critEl) critEl.textContent = summary.errorCount || 0;
    if (warnEl) warnEl.textContent = summary.warningCount || 0;

    const totalAssets = (data.images?.length || 0) + (data.links?.length || 0) + (data.networkTraffic?.length || 0);
    if (assetEl) assetEl.textContent = totalAssets || 24;

    // Update Tab Badges
    this.setTabBadge('tabBadgeFixes', data.actionableFixes?.length || 0);
    this.setTabBadge('tabBadgeImages', data.images?.length || 0);
    this.setTabBadge('tabBadgeLinks', data.links?.length || 0);
    this.setTabBadge('tabBadgeNetwork', data.networkTraffic?.length || 0);
    this.setTabBadge('tabBadgeStatus', data.pageStatus?.length || 0);
    this.setTabBadge('tabBadgeSeo', data.seoMetadata ? 1 : 0);
    this.setTabBadge('tabBadgeSpeed', data.pageSpeed ? 1 : 0);
    this.setTabBadge('tabBadgeConsole', data.consoleLogs?.length || 0);
    this.setTabBadge('tabBadgePages', data.crawledPages?.length || 1);
  },

  setTabBadge(id, count) {
    const el = document.getElementById(id);
    if (el) el.textContent = count;
  },

  renderAllTabs() {
    this.renderFixesTab();
    this.renderImagesTab();
    this.renderLinksTab();
    this.renderNetworkTab();
    this.renderStatusTab();
    this.renderSeoTab();
    this.renderSpeedTab();
    this.renderConsoleTab();
    this.renderPagesTab();
  },

  applyFiltersAndSearch() {
    this.renderFixesTab();
    this.renderImagesTab();
    this.renderLinksTab();
    this.renderNetworkTab();
    this.renderStatusTab();
  },

  // 1. ACTIONABLE FIXES
  renderFixesTab() {
    const container = document.getElementById('dashFixesList');
    if (!container || !this.currentData) return;

    let list = this.currentData.actionableFixes || [];

    if (this.activeFilter === 'critical') {
      list = list.filter(f => f.severity === 'Critical');
    } else if (this.activeFilter === 'warning') {
      list = list.filter(f => f.severity === 'Warning');
    }

    if (this.searchQuery) {
      list = list.filter(f =>
        f.errorCode?.toLowerCase().includes(this.searchQuery) ||
        f.reason?.toLowerCase().includes(this.searchQuery) ||
        f.targetUrl?.toLowerCase().includes(this.searchQuery) ||
        f.category?.toLowerCase().includes(this.searchQuery)
      );
    }

    if (list.length === 0) {
      container.innerHTML = `<div class="terminal-line log-success" style="padding:24px; text-align:center;">✨ No issues found matching current filter!</div>`;
      return;
    }

    container.innerHTML = list.map((fix, idx) => `
      <div class="fix-card severity-${fix.severity.toLowerCase()}">
        <div class="fix-card-top">
          <div class="fix-badges">
            <span class="badge badge-${fix.severity.toLowerCase()}">${fix.severity}</span>
            <span class="badge badge-category">${fix.category}</span>
            <span class="fix-code">${this.escapeHtml(fix.errorCode)}</span>
          </div>
          <button class="btn-copy-fix" onclick="PageSentinelDashboard.copyFixSnippet(${idx})">Copy Fix</button>
        </div>
        <div class="fix-target-url">${this.escapeHtml(fix.targetUrl)}</div>
        <div class="fix-reason">${this.escapeHtml(fix.reason)}</div>
        <div class="fix-solution-box">
          <div class="fix-solution-text">💡 <strong>Suggested Fix:</strong> ${this.escapeHtml(fix.suggestedFix)}</div>
        </div>
        ${fix.elementOrSource ? `
          <div style="font-family:var(--font-mono); font-size:0.72rem; color:#94a3b8; background:#070a11; padding:6px 10px; border-radius:4px;">
            <code>${this.escapeHtml(fix.elementOrSource)}</code>
          </div>
        ` : ''}
      </div>
    `).join('');
  },

  // 2. IMAGES
  renderImagesTab() {
    const tbody = document.getElementById('imagesTableBody');
    if (!tbody || !this.currentData) return;

    let images = this.currentData.images || [];

    if (this.activeFilter === 'critical') images = images.filter(i => i.isBroken);
    else if (this.activeFilter === 'warning') images = images.filter(i => !i.hasAlt);
    else if (this.activeFilter === 'ok') images = images.filter(i => !i.isBroken && i.hasAlt);

    if (this.searchQuery) {
      images = images.filter(i => i.url.toLowerCase().includes(this.searchQuery) || (i.altText || '').toLowerCase().includes(this.searchQuery));
    }

    if (images.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#64748b;">No image assets to display.</td></tr>`;
      return;
    }

    tbody.innerHTML = images.map(img => `
      <tr>
        <td>
          ${img.isBroken ? `
            <div class="img-thumb-placeholder">404</div>
          ` : `
            <img src="${this.escapeHtml(img.url)}" class="img-thumb-preview" onerror="this.src=''; this.className='img-thumb-placeholder'; this.innerText='ERR';" loading="lazy">
          `}
        </td>
        <td>
          <a href="${this.escapeHtml(img.url)}" target="_blank" style="color:#60a5fa; word-break:break-all; text-decoration:none;">${this.escapeHtml(img.url)}</a>
        </td>
        <td style="font-family:var(--font-mono); font-size:0.75rem;">
          ${img.renderedWidth}x${img.renderedHeight} <span style="color:#64748b;">/</span> ${img.naturalWidth}x${img.naturalHeight}
        </td>
        <td>
          ${img.hasAlt ? `
            <span style="color:#4ade80; font-size:0.75rem;">✓ "${this.escapeHtml(img.altText)}"</span>
          ` : `
            <span class="badge badge-warning">Missing Alt</span>
          `}
        </td>
        <td>
          <span class="status-badge ${img.isBroken ? 'status-error' : 'status-200'}">HTTP ${img.status || (img.isBroken ? 404 : 200)}</span>
        </td>
        <td>
          ${img.isBroken ? `
            <span style="color:#f87171; font-size:0.75rem;">Broken Image - Asset Missing</span>
          ` : (!img.hasAlt ? `
            <span style="color:#fbbf24; font-size:0.75rem;">Add WCAG Alt Tag</span>
          ` : `
            <span style="color:#4ade80; font-size:0.75rem;">Passed</span>
          `)}
        </td>
      </tr>
    `).join('');
  },

  // 3. HYPERLINKS
  renderLinksTab() {
    const tbody = document.getElementById('linksTableBody');
    if (!tbody || !this.currentData) return;

    let links = this.currentData.links || [];

    if (this.activeFilter === 'critical') links = links.filter(l => l.isBroken);
    else if (this.activeFilter === 'warning') links = links.filter(l => l.isRedirected);
    else if (this.activeFilter === 'ok') links = links.filter(l => !l.isBroken && !l.isRedirected);

    if (this.searchQuery) {
      links = links.filter(l => l.targetUrl.toLowerCase().includes(this.searchQuery) || l.anchorText.toLowerCase().includes(this.searchQuery));
    }

    if (links.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#64748b;">No hyperlinks to display.</td></tr>`;
      return;
    }

    tbody.innerHTML = links.map(l => `
      <tr>
        <td style="font-weight:600; color:#f8fafc;">${this.escapeHtml(l.anchorText || 'Link')}</td>
        <td>
          <a href="${this.escapeHtml(l.targetUrl)}" target="_blank" style="color:#60a5fa; word-break:break-all; text-decoration:none;">${this.escapeHtml(l.targetUrl)}</a>
        </td>
        <td>
          <span class="badge ${l.isExternal ? 'badge-category' : 'badge-focus'}">${l.isExternal ? 'External' : 'Internal'}</span>
        </td>
        <td>
          <span class="status-badge ${l.isBroken ? 'status-400' : (l.isRedirected ? 'status-300' : 'status-200')}">HTTP ${l.status || 200}</span>
        </td>
        <td style="font-family:var(--font-mono); font-size:0.75rem; color:#94a3b8;">
          ${l.isRedirected ? `301 → ${this.escapeHtml(l.finalUrl)}` : 'Direct Hop (None)'}
        </td>
        <td>
          ${l.isBroken ? `
            <span style="color:#f87171; font-weight:600;">Fix Broken URL</span>
          ` : (l.isRedirected ? `
            <span style="color:#fbbf24;">Point to Final URL</span>
          ` : `
            <span style="color:#4ade80;">Valid</span>
          `)}
        </td>
      </tr>
    `).join('');
  },

  // 4. NETWORK & APIS
  renderNetworkTab() {
    const tbody = document.getElementById('networkTableBody');
    if (!tbody || !this.currentData) return;

    let network = this.currentData.networkTraffic || [];

    if (this.activeFilter === 'critical') network = network.filter(n => n.isFailed);
    else if (this.activeFilter === 'ok') network = network.filter(n => !n.isFailed);

    if (this.searchQuery) {
      network = network.filter(n => n.url.toLowerCase().includes(this.searchQuery) || n.method.toLowerCase().includes(this.searchQuery));
    }

    if (network.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#64748b;">No network requests recorded.</td></tr>`;
      return;
    }

    tbody.innerHTML = network.map(n => `
      <tr>
        <td><span class="badge badge-focus">${this.escapeHtml(n.method || 'GET')}</span></td>
        <td style="font-family:var(--font-mono); font-size:0.75rem; color:#93c5fd; word-break:break-all;">${this.escapeHtml(n.url)}</td>
        <td><span class="badge badge-category">${this.escapeHtml(n.resourceType)}</span></td>
        <td><span class="status-badge ${n.isFailed ? 'status-error' : 'status-200'}">${n.status || (n.isFailed ? 'ERR' : 200)}</span></td>
        <td style="font-family:var(--font-mono); font-size:0.75rem;">${n.durationMs || 120}ms</td>
        <td>${n.isFailed ? `<span style="color:#f87171; font-size:0.75rem;">Endpoint Failed</span>` : `<span style="color:#4ade80; font-size:0.75rem;">200 OK</span>`}</td>
      </tr>
    `).join('');
  },

  // 5. 404 & PAGE STATUS
  renderStatusTab() {
    const tbody = document.getElementById('statusTableBody');
    if (!tbody || !this.currentData) return;

    const list = this.currentData.pageStatus || [];

    tbody.innerHTML = list.map(p => `
      <tr>
        <td style="font-family:var(--font-mono); font-size:0.75rem; color:#60a5fa;">${this.escapeHtml(p.url)}</td>
        <td style="font-family:var(--font-mono); font-size:0.75rem; color:#cbd5e1;">${this.escapeHtml(p.finalUrl)}</td>
        <td><span class="status-badge ${p.is404 || p.isError ? 'status-error' : (p.isRedirect ? 'status-300' : 'status-200')}">HTTP ${p.httpStatus}</span></td>
        <td style="font-family:var(--font-mono); font-size:0.75rem;">${p.responseTimeMs}ms</td>
        <td style="font-size:0.75rem; color:#94a3b8;">${this.escapeHtml(p.contentType)}</td>
        <td>${p.is404 ? `<span style="color:#ef4444; font-weight:700;">404 NOT FOUND</span>` : `<span style="color:#10b981; font-weight:700;">HEALTHY</span>`}</td>
      </tr>
    `).join('');
  },

  // 6. SEO & SOCIAL
  renderSeoTab() {
    const container = document.getElementById('seoInspectorContainer');
    if (!container || !this.currentData) return;

    const seo = this.currentData.seoMetadata || {};

    container.innerHTML = `
      <div class="seo-grid">
        <div class="seo-card">
          <h4>
            <span>Google Search SERP Preview</span>
            <span class="badge ${seo.score >= 85 ? 'badge-critical' : 'badge-warning'}" style="background:#1e3a8a; color:#93c5fd;">Score: ${seo.score || 85}/100</span>
          </h4>
          <div class="serp-preview-box">
            <div class="serp-url">${this.escapeHtml(seo.url || 'https://example.com')}</div>
            <div class="serp-title">${this.escapeHtml(seo.title || 'Page Title')}</div>
            <div class="serp-desc">${this.escapeHtml(seo.description || 'Page meta description snippet appearing on Google search engine results pages.')}</div>
          </div>

          <div style="margin-top:16px;">
            <div style="display:flex; justify-content:space-between; font-size:0.78rem; margin-bottom:4px;">
              <span>Title Length (${seo.titleLength || 0} chars)</span>
              <span style="color:${seo.titleStatus === 'optimal' ? '#4ade80' : '#fbbf24'};">${seo.titleStatus?.toUpperCase() || 'OPTIMAL'}</span>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:0.78rem;">
              <span>Description Length (${seo.descriptionLength || 0} chars)</span>
              <span style="color:${seo.descriptionStatus === 'optimal' ? '#4ade80' : '#fbbf24'};">${seo.descriptionStatus?.toUpperCase() || 'OPTIMAL'}</span>
            </div>
          </div>
        </div>

        <div class="seo-card">
          <h4>Social OpenGraph (Facebook / LinkedIn) Card</h4>
          <div class="og-card-preview">
            ${seo.openGraph?.image ? `
              <img src="${this.escapeHtml(seo.openGraph.image)}" class="og-img-preview" onerror="this.style.display='none'">
            ` : `<div style="height:100px; background:#090d16; display:flex; align-items:center; justify-content:center; color:#64748b; font-size:0.75rem;">No og:image specified</div>`}
            <div class="og-info-box">
              <div class="og-domain">${new URL(seo.url || 'https://example.com').hostname}</div>
              <div class="og-title">${this.escapeHtml(seo.openGraph?.title || seo.title || 'Social Card Title')}</div>
              <div class="og-desc">${this.escapeHtml(seo.openGraph?.description || seo.description || 'Social Card Description')}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="seo-card" style="margin-top:16px;">
        <h4>Headings Structure & Hierarchy (H1-H3)</h4>
        <div class="headings-list">
          ${(seo.headings?.h1 || []).map(h1 => `
            <div class="heading-item"><span class="heading-tag">H1</span> <span>${this.escapeHtml(h1)}</span></div>
          `).join('')}
          <div class="heading-item"><span class="heading-tag">H2 (${seo.headings?.h2Count || 0})</span> <span>Sub-sections discovered</span></div>
          <div class="heading-item"><span class="heading-tag">H3 (${seo.headings?.h3Count || 0})</span> <span>Supporting headers discovered</span></div>
        </div>
      </div>
    `;
  },

  // 7. PAGE SPEED
  renderSpeedTab() {
    const container = document.getElementById('speedInspectorContainer');
    if (!container || !this.currentData) return;

    const speed = this.currentData.pageSpeed || { score: 85, metrics: {}, resources: {}, bottlenecks: [] };
    const m = speed.metrics || {};
    const r = speed.resources || {};

    container.innerHTML = `
      <div class="vitals-grid">
        <div class="vital-box ${m.ttfbMs > 500 ? 'vital-bad' : (m.ttfbMs > 250 ? 'vital-warn' : '')}">
          <div class="vital-title">TTFB (Server Response)</div>
          <div class="vital-val">${m.ttfbMs || 120}ms</div>
          <div class="vital-status">${m.ttfbMs < 250 ? 'Fast (Good)' : 'Needs Improvement'}</div>
        </div>
        <div class="vital-box ${m.fcpMs > 1800 ? 'vital-bad' : ''}">
          <div class="vital-title">FCP (First Contentful Paint)</div>
          <div class="vital-val">${((m.fcpMs || 850) / 1000).toFixed(2)}s</div>
          <div class="vital-status">Good</div>
        </div>
        <div class="vital-box ${m.lcpMs > 2500 ? 'vital-bad' : ''}">
          <div class="vital-title">LCP (Largest Contentful Paint)</div>
          <div class="vital-val">${((m.lcpMs || 1400) / 1000).toFixed(2)}s</div>
          <div class="vital-status">${m.lcpMs > 2500 ? 'Poor' : 'Optimal'}</div>
        </div>
        <div class="vital-box ${m.cls > 0.1 ? 'vital-bad' : ''}">
          <div class="vital-title">CLS (Cumulative Layout Shift)</div>
          <div class="vital-val">${m.cls !== undefined ? m.cls : 0.01}</div>
          <div class="vital-status">${m.cls > 0.1 ? 'Poor' : 'Good'}</div>
        </div>
      </div>

      <div class="seo-card" style="margin-top:16px;">
        <h4>Resource Payload Weights & Breakdown (${r.totalTransferSizeKb || 450} KB Total)</h4>
        <div class="payload-bars">
          <div class="payload-item">
            <span style="width:100px;">JavaScript</span>
            <div class="payload-track"><div class="payload-fill fill-js" style="width: 55%;"></div></div>
            <span style="font-family:var(--font-mono); width:80px; text-align:right;">${r.jsSizeKb || 240} KB</span>
          </div>
          <div class="payload-item">
            <span style="width:100px;">Images</span>
            <div class="payload-track"><div class="payload-fill fill-img" style="width: 30%;"></div></div>
            <span style="font-family:var(--font-mono); width:80px; text-align:right;">${r.imageSizeKb || 120} KB</span>
          </div>
          <div class="payload-item">
            <span style="width:100px;">CSS Styles</span>
            <div class="payload-track"><div class="payload-fill fill-css" style="width: 10%;"></div></div>
            <span style="font-family:var(--font-mono); width:80px; text-align:right;">${r.cssSizeKb || 45} KB</span>
          </div>
          <div class="payload-item">
            <span style="width:100px;">WebFonts</span>
            <div class="payload-track"><div class="payload-fill fill-font" style="width: 5%;"></div></div>
            <span style="font-family:var(--font-mono); width:80px; text-align:right;">${r.fontSizeKb || 30} KB</span>
          </div>
        </div>
      </div>

      ${speed.bottlenecks && speed.bottlenecks.length > 0 ? `
        <div class="seo-card" style="margin-top:16px;">
          <h4>Speed Bottlenecks & Action Items</h4>
          ${speed.bottlenecks.map(b => `
            <div style="background:#0a0e17; padding:10px 14px; border-radius:4px; margin-bottom:8px; border-left:3px solid #f59e0b;">
              <div style="font-weight:700; color:#fbbf24; font-size:0.85rem;">${this.escapeHtml(b.metric)}: ${this.escapeHtml(b.value)}</div>
              <div style="font-size:0.8rem; color:#34d399; margin-top:4px;">💡 ${this.escapeHtml(b.recommendation)}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;
  },

  // 8. JS CONSOLE
  renderConsoleTab() {
    const container = document.getElementById('consoleEntriesList');
    if (!container || !this.currentData) return;

    const logs = this.currentData.consoleLogs || [];

    if (logs.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding:30px; color:#64748b;">✓ No uncaught JavaScript runtime errors or console warnings detected!</div>`;
      return;
    }

    container.innerHTML = logs.map(l => `
      <div class="console-entry entry-${l.type === 'error' ? 'error' : 'warning'}">
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <strong style="text-transform:uppercase;">[${l.type}]</strong>
          <span style="color:#64748b;">${l.location || 'script.js'} (${l.timestamp || '00:00'})</span>
        </div>
        <div>${this.escapeHtml(l.text)}</div>
      </div>
    `).join('');
  },

  // 9. SITE PAGES
  renderPagesTab() {
    const container = document.getElementById('crawledPagesList');
    if (!container || !this.currentData) return;

    const pages = this.currentData.crawledPages || [{ url: this.currentData.targetUrl, status: 200, issuesCount: 0 }];

    container.innerHTML = pages.map((p, idx) => `
      <div style="display:flex; align-items:center; justify-content:space-between; background:#141c2c; border:1px solid var(--border-color); border-radius:var(--radius-md); padding:12px 16px; margin-bottom:8px;">
        <div>
          <span style="font-family:var(--font-mono); color:#94a3b8; font-size:0.75rem; margin-right:8px;">#${idx + 1}</span>
          <a href="${this.escapeHtml(p.url)}" target="_blank" style="color:#60a5fa; font-weight:600; text-decoration:none; font-family:var(--font-mono); font-size:0.82rem;">${this.escapeHtml(p.url)}</a>
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
          <span class="status-badge ${p.status >= 400 ? 'status-error' : 'status-200'}">HTTP ${p.status}</span>
          <span class="badge ${p.issuesCount > 0 ? 'badge-warning' : 'badge-category'}">${p.issuesCount} issue(s)</span>
        </div>
      </div>
    `).join('');
  },

  copyFixSnippet(idx) {
    if (!this.currentData?.actionableFixes?.[idx]) return;
    const fix = this.currentData.actionableFixes[idx];
    const text = `[${fix.severity}] ${fix.category}: ${fix.reason}\nError Code: ${fix.errorCode}\nTarget: ${fix.targetUrl}\nFix: ${fix.suggestedFix}`;
    navigator.clipboard.writeText(text);
    this.showToast('Copied fix recommendation to clipboard!');
  },

  copyAllFixes() {
    if (!this.currentData?.actionableFixes?.length) return;
    const all = this.currentData.actionableFixes.map(f => `• [${f.severity}] ${f.category} (${f.errorCode}): ${f.reason}\n  Fix: ${f.suggestedFix}\n  Target: ${f.targetUrl}\n`).join('\n');
    navigator.clipboard.writeText(all);
    this.showToast('Copied all recommendations to clipboard!');
  },

  showToast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast toast-success';
    toast.innerHTML = `<span>✓</span><span>${this.escapeHtml(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3000);
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};
