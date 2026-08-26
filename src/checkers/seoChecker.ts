import { Page } from 'playwright';
import { SeoMetadataResult } from '../types/audit.js';

export class SeoChecker {
  async inspectPage(page: Page): Promise<SeoMetadataResult> {
    const pageUrl = page.url();

    const data = await page.evaluate<any>(`(() => {
      const currentUrl = window.location.href;

      // 1. Title
      const titleTag = document.querySelector('title');
      const title = titleTag ? (titleTag.textContent || '').trim() : '';

      // 2. Meta tags helper
      const allMetas = Array.from(document.querySelectorAll('meta'));
      function findMeta(key) {
        const lower = key.toLowerCase();
        for (let i = 0; i < allMetas.length; i++) {
          const m = allMetas[i];
          const name = (m.getAttribute('name') || '').toLowerCase();
          const prop = (m.getAttribute('property') || '').toLowerCase();
          const equiv = (m.getAttribute('http-equiv') || '').toLowerCase();
          if (name === lower || prop === lower || equiv === lower) {
            return (m.getAttribute('content') || '').trim();
          }
        }
        return '';
      }

      // 3. Description & Keywords
      const description = findMeta('description');
      const keywords = findMeta('keywords');

      // 4. Canonical
      const canonicalEl = document.querySelector('link[rel="canonical" i]');
      let canonicalUrl = canonicalEl ? (canonicalEl.getAttribute('href') || '').trim() : '';
      if (canonicalUrl) {
        try {
          canonicalUrl = new URL(canonicalUrl, currentUrl).href;
        } catch(e) {}
      }

      // 5. Robots
      const robots = findMeta('robots') || findMeta('googlebot');
      const isIndexable = !robots.toLowerCase().includes('noindex');
      const isFollowable = !robots.toLowerCase().includes('nofollow');

      // 6. OpenGraph
      const ogTitle = findMeta('og:title');
      const ogDesc = findMeta('og:description');
      const ogImage = findMeta('og:image');
      const ogUrl = findMeta('og:url');
      const ogType = findMeta('og:type');
      const ogSiteName = findMeta('og:site_name');

      // 7. Twitter Card
      const twitterCard = findMeta('twitter:card');
      const twitterTitle = findMeta('twitter:title');
      const twitterDesc = findMeta('twitter:description');
      const twitterImage = findMeta('twitter:image');

      // 8. Headings
      const h1Nodes = Array.from(document.querySelectorAll('h1'));
      const h1List = [];
      for (let i = 0; i < h1Nodes.length; i++) {
        const txt = (h1Nodes[i].textContent || '').trim().replace(/\\s+/g, ' ');
        if (txt) h1List.push(txt);
      }
      const h2Count = document.querySelectorAll('h2').length;
      const h3Count = document.querySelectorAll('h3').length;
      const h4Count = document.querySelectorAll('h4').length;
      const h5Count = document.querySelectorAll('h5').length;
      const h6Count = document.querySelectorAll('h6').length;

      // 9. Structured Data (JSON-LD)
      const schemaScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      const rawSchemas = [];
      const types = [];

      for (let i = 0; i < schemaScripts.length; i++) {
        try {
          const parsed = JSON.parse(schemaScripts[i].textContent || '{}');
          rawSchemas.push(parsed);
          if (Array.isArray(parsed)) {
            for (let j = 0; j < parsed.length; j++) {
              if (parsed[j] && parsed[j]['@type']) types.push(String(parsed[j]['@type']));
            }
          } else if (parsed && parsed['@graph'] && Array.isArray(parsed['@graph'])) {
            for (let j = 0; j < parsed['@graph'].length; j++) {
              if (parsed['@graph'][j] && parsed['@graph'][j]['@type']) types.push(String(parsed['@graph'][j]['@type']));
            }
          } else if (parsed && parsed['@type']) {
            types.push(String(parsed['@type']));
          }
        } catch (e) {}
      }

      // 10. Technical Elements
      const charsetEl = document.querySelector('meta[charset]') || document.querySelector('meta[http-equiv="Content-Type" i]');
      const charset = charsetEl ? (charsetEl.getAttribute('charset') || charsetEl.getAttribute('content') || 'UTF-8') : '';
      const viewport = findMeta('viewport');
      const lang = document.documentElement.getAttribute('lang') || '';

      const faviconEl =
        document.querySelector('link[rel="icon" i]') ||
        document.querySelector('link[rel="shortcut icon" i]') ||
        document.querySelector('link[rel="apple-touch-icon" i]');
      const favicon = faviconEl ? (faviconEl.getAttribute('href') || '') : '';

      let wordCount = 0;
      if (document.body) {
        const bodyClone = document.body.cloneNode(true);
        const removeTags = ['script', 'style', 'noscript', 'svg'];
        for (let i = 0; i < removeTags.length; i++) {
          const els = Array.from(bodyClone.querySelectorAll(removeTags[i]));
          for (let j = 0; j < els.length; j++) {
            els[j].remove();
          }
        }
        const text = (bodyClone.innerText || bodyClone.textContent || '').trim();
        const words = text.split(/\\s+/).filter(Boolean);
        wordCount = words.length;
      }

      return {
        title,
        description,
        keywords,
        canonicalUrl,
        robots,
        isIndexable,
        isFollowable,
        openGraph: {
          title: ogTitle,
          description: ogDesc,
          image: ogImage,
          url: ogUrl,
          type: ogType,
          siteName: ogSiteName,
          hasOgTitle: !!ogTitle,
          hasOgDesc: !!ogDesc,
          hasOgImage: !!ogImage
        },
        twitterCard: {
          card: twitterCard,
          title: twitterTitle,
          description: twitterDesc,
          image: twitterImage,
          hasTwitterCard: !!(twitterCard || twitterTitle || twitterImage)
        },
        headings: {
          h1: h1List,
          h1Count: h1List.length,
          h2Count,
          h3Count,
          h4Count,
          h5Count,
          h6Count
        },
        structuredData: {
          hasSchema: schemaScripts.length > 0,
          schemaCount: schemaScripts.length,
          types: Array.from(new Set(types)),
          rawSchemas
        },
        technical: {
          charset,
          viewport,
          hasViewport: !!viewport,
          lang,
          hasLang: !!lang,
          favicon,
          wordCount
        }
      };
    })()`);

    // Analysis & Scoring
    const titleLength = data.title.length;
    let titleStatus: 'optimal' | 'too_short' | 'too_long' | 'missing' = 'optimal';
    if (titleLength === 0) titleStatus = 'missing';
    else if (titleLength < 30) titleStatus = 'too_short';
    else if (titleLength > 65) titleStatus = 'too_long';

    const descriptionLength = data.description.length;
    let descriptionStatus: 'optimal' | 'too_short' | 'too_long' | 'missing' = 'optimal';
    if (descriptionLength === 0) descriptionStatus = 'missing';
    else if (descriptionLength < 70) descriptionStatus = 'too_short';
    else if (descriptionLength > 160) descriptionStatus = 'too_long';

    let canonicalStatus: 'valid' | 'mismatch' | 'missing' = 'valid';
    if (!data.canonicalUrl) {
      canonicalStatus = 'missing';
    } else {
      try {
        const parsedCanonical = new URL(data.canonicalUrl);
        const parsedPage = new URL(pageUrl);
        const canonClean = parsedCanonical.origin + parsedCanonical.pathname.replace(/\/$/, '');
        const pageClean = parsedPage.origin + parsedPage.pathname.replace(/\/$/, '');
        if (canonClean !== pageClean) {
          canonicalStatus = 'mismatch';
        }
      } catch {
        canonicalStatus = 'mismatch';
      }
    }

    let h1Status: 'optimal' | 'missing' | 'multiple' = 'optimal';
    if (data.headings.h1Count === 0) h1Status = 'missing';
    else if (data.headings.h1Count > 1) h1Status = 'multiple';

    // Calculate SEO Score (0-100)
    let score = 0;
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Title (15 pts)
    if (titleStatus === 'optimal') {
      score += 15;
    } else if (titleStatus === 'too_short') {
      score += 8;
      issues.push(`Title tag is too short (${titleLength} chars, recommended 30-60 chars).`);
      recommendations.push('Expand title tag to 30-60 characters with primary keywords.');
    } else if (titleStatus === 'too_long') {
      score += 10;
      issues.push(`Title tag is too long (${titleLength} chars, recommended 30-60 chars).`);
      recommendations.push('Shorten title tag under 60 characters to avoid SERP truncation.');
    } else {
      issues.push('Missing <title> tag on page.');
      recommendations.push('Add a unique, descriptive <title> tag to the page head.');
    }

    // Description (15 pts)
    if (descriptionStatus === 'optimal') {
      score += 15;
    } else if (descriptionStatus === 'too_short') {
      score += 8;
      issues.push(`Meta description is too short (${descriptionLength} chars, recommended 70-160 chars).`);
      recommendations.push('Expand meta description to 70-160 characters to improve click-through rate (CTR).');
    } else if (descriptionStatus === 'too_long') {
      score += 10;
      issues.push(`Meta description is too long (${descriptionLength} chars, recommended 70-160 chars).`);
      recommendations.push('Shorten meta description under 160 characters.');
    } else {
      issues.push('Missing meta description tag.');
      recommendations.push('Add a compelling meta description tag for search engine snippets.');
    }

    // H1 Heading (15 pts)
    if (h1Status === 'optimal') {
      score += 15;
    } else if (h1Status === 'multiple') {
      score += 7;
      issues.push(`Multiple <h1> tags found (${data.headings.h1Count} tags).`);
      recommendations.push('Use exactly one primary <h1> tag per page and structure sub-topics using <h2> and <h3>.');
    } else {
      issues.push('Missing <h1> heading tag.');
      recommendations.push('Add a single <h1> heading tag conveying the primary topic of the page.');
    }

    // Canonical (10 pts)
    if (canonicalStatus === 'valid') {
      score += 10;
    } else if (canonicalStatus === 'mismatch') {
      score += 6;
      issues.push(`Canonical URL (${data.canonicalUrl}) differs from page URL (${pageUrl}).`);
      recommendations.push('Verify that the canonical URL points to the intended authoritative version.');
    } else {
      issues.push('Missing canonical link tag (<link rel="canonical">).');
      recommendations.push('Add a self-referencing canonical URL to prevent duplicate content issues.');
    }

    // OpenGraph (15 pts)
    let ogScore = 0;
    if (data.openGraph.hasOgTitle) ogScore += 5;
    else issues.push('Missing OpenGraph title (og:title).');

    if (data.openGraph.hasOgDesc) ogScore += 5;
    else issues.push('Missing OpenGraph description (og:description).');

    if (data.openGraph.hasOgImage) ogScore += 5;
    else issues.push('Missing OpenGraph preview image (og:image).');

    score += ogScore;
    if (ogScore < 15) {
      recommendations.push('Add OpenGraph meta tags (og:title, og:description, og:image) for rich social sharing.');
    }

    // Twitter Card (10 pts)
    if (data.twitterCard.hasTwitterCard) {
      score += 10;
    } else {
      issues.push('Missing Twitter Card tags (twitter:card / twitter:title / twitter:image).');
      recommendations.push('Add Twitter card meta tags (e.g. summary_large_image) for social optimization.');
    }

    // Viewport / Mobile (10 pts)
    if (data.technical.hasViewport) {
      score += 10;
    } else {
      issues.push('Missing viewport meta tag (<meta name="viewport">). Page may not be mobile responsive.');
      recommendations.push('Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> for mobile responsiveness.');
    }

    // Language attribute (5 pts)
    if (data.technical.hasLang) {
      score += 5;
    } else {
      issues.push('Missing HTML lang attribute (<html lang="en">).');
      recommendations.push('Declare language on the <html> element (e.g., <html lang="en">).');
    }

    // Structured Data (5 pts)
    if (data.structuredData.hasSchema) {
      score += 5;
    } else {
      recommendations.push('Consider adding Schema.org structured data (JSON-LD) for enhanced search results / rich snippets.');
    }

    // Calculate Grade
    let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
    if (score >= 95) grade = 'A+';
    else if (score >= 85) grade = 'A';
    else if (score >= 70) grade = 'B';
    else if (score >= 55) grade = 'C';
    else if (score >= 40) grade = 'D';

    return {
      url: pageUrl,
      title: data.title,
      titleLength,
      titleStatus,
      description: data.description,
      descriptionLength,
      descriptionStatus,
      keywords: data.keywords,
      canonicalUrl: data.canonicalUrl,
      canonicalStatus,
      robots: data.robots || 'index, follow',
      isIndexable: data.isIndexable,
      isFollowable: data.isFollowable,
      openGraph: data.openGraph,
      twitterCard: data.twitterCard,
      headings: {
        ...data.headings,
        h1Status
      },
      structuredData: data.structuredData,
      technical: data.technical,
      score,
      grade,
      issues,
      recommendations
    };
  }
}
