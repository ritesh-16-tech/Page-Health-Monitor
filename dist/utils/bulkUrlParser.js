import fs from 'fs/promises';
import path from 'path';
export class BulkUrlParser {
    /**
     * Parse URLs from a file path or raw string input.
     * Supports:
     * - .txt files (one URL per line)
     * - .csv files (looks for 'url' / 'link' / 'page' header or takes 1st column)
     * - .json files (array of strings or array of objects with url property)
     * - Comma-separated or whitespace-delimited URL strings
     */
    static async parseInput(input) {
        const trimmed = input.trim();
        if (!trimmed)
            return [];
        // Check if input is a local file path
        try {
            const stats = await fs.stat(trimmed);
            if (stats.isFile()) {
                return await this.parseFile(trimmed);
            }
        }
        catch {
            // Not a file or cannot be accessed directly, treat as string content / list
        }
        // Treat as raw text content / delimited string
        return this.parseTextContent(trimmed);
    }
    /**
     * Parse a file on disk
     */
    static async parseFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const content = await fs.readFile(filePath, 'utf-8');
        if (ext === '.csv') {
            return this.parseCsvContent(content);
        }
        else if (ext === '.json') {
            return this.parseJsonContent(content);
        }
        else {
            return this.parseTextContent(content);
        }
    }
    /**
     * Parse CSV content, identifying URL columns
     */
    static parseCsvContent(content) {
        const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        if (lines.length === 0)
            return [];
        // Check header row
        const firstLine = lines[0];
        const headers = firstLine.split(',').map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
        let urlColIndex = headers.findIndex((h) => h.includes('url') || h.includes('link') || h.includes('page') || h.includes('target') || h.includes('href'));
        const hasHeader = urlColIndex !== -1;
        if (!hasHeader) {
            urlColIndex = 0; // Default to first column
        }
        const startIndex = hasHeader ? 1 : 0;
        const urls = [];
        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i];
            if (!line)
                continue;
            // Handle simple CSV splitting with quotes
            const cols = this.splitCsvLine(line);
            const val = cols[urlColIndex] !== undefined ? cols[urlColIndex].trim() : cols[0]?.trim();
            if (val) {
                const cleaned = this.cleanUrlCandidate(val);
                if (cleaned)
                    urls.push(cleaned);
            }
        }
        return this.deduplicateUrls(urls);
    }
    /**
     * Parse JSON content
     */
    static parseJsonContent(content) {
        try {
            const data = JSON.parse(content);
            const urls = [];
            if (Array.isArray(data)) {
                for (const item of data) {
                    if (typeof item === 'string') {
                        const cleaned = this.cleanUrlCandidate(item);
                        if (cleaned)
                            urls.push(cleaned);
                    }
                    else if (item && typeof item === 'object') {
                        const urlVal = item.url || item.Url || item.link || item.page || item.href || item.targetUrl;
                        if (typeof urlVal === 'string') {
                            const cleaned = this.cleanUrlCandidate(urlVal);
                            if (cleaned)
                                urls.push(cleaned);
                        }
                    }
                }
            }
            else if (data && typeof data === 'object' && Array.isArray(data.urls)) {
                for (const u of data.urls) {
                    if (typeof u === 'string') {
                        const cleaned = this.cleanUrlCandidate(u);
                        if (cleaned)
                            urls.push(cleaned);
                    }
                }
            }
            return this.deduplicateUrls(urls);
        }
        catch {
            return this.parseTextContent(content);
        }
    }
    /**
     * Parse plain text / comma-separated / newline-separated string
     */
    static parseTextContent(content) {
        const rawTokens = content.split(/[\r\n,;\s]+/).map((t) => t.trim()).filter(Boolean);
        const urls = [];
        for (const token of rawTokens) {
            const cleaned = this.cleanUrlCandidate(token);
            if (cleaned)
                urls.push(cleaned);
        }
        return this.deduplicateUrls(urls);
    }
    static cleanUrlCandidate(val) {
        let clean = val.replace(/^["']|["']$/g, '').trim();
        if (!clean)
            return null;
        if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
            // Check if it looks like a domain / path (e.g. example.com or example.com/page)
            if (clean.includes('.') && !clean.startsWith('#') && !clean.startsWith('javascript:')) {
                clean = `https://${clean}`;
            }
            else {
                return null;
            }
        }
        try {
            const parsed = new URL(clean);
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
                return parsed.href;
            }
        }
        catch {
            return null;
        }
        return null;
    }
    static splitCsvLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"' || char === "'") {
                inQuotes = !inQuotes;
            }
            else if (char === ',' && !inQuotes) {
                result.push(current.replace(/^["']|["']$/g, ''));
                current = '';
            }
            else {
                current += char;
            }
        }
        result.push(current.replace(/^["']|["']$/g, ''));
        return result;
    }
    static deduplicateUrls(urls) {
        const seen = new Set();
        const unique = [];
        for (const u of urls) {
            if (!seen.has(u)) {
                seen.add(u);
                unique.push(u);
            }
        }
        return unique;
    }
}
