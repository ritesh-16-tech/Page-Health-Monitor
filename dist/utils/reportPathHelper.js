import path from 'path';
/**
 * Returns the categorized functional report directory path based on audit category/focus.
 * Examples:
 * - 'status' / '404' -> reports/404-status/
 * - 'seo' / 'meta'   -> reports/seo-metadata/
 * - 'speed' / 'perf' -> reports/page-speed/
 * - 'image'          -> reports/images/
 * - 'link'           -> reports/links/
 * - 'api'            -> reports/apis/
 * - 'all' / default  -> reports/full-audit/
 */
export function getFunctionalReportDir(baseDir = './reports', focus = 'all') {
    const normalized = (focus || 'all').toLowerCase();
    const folderMap = {
        'status': '404-status',
        '404': '404-status',
        'page_status': '404-status',
        'seo': 'seo-metadata',
        'meta': 'seo-metadata',
        'speed': 'page-speed',
        'perf': 'page-speed',
        'image': 'images',
        'images': 'images',
        'link': 'links',
        'links': 'links',
        'api': 'apis',
        'apis': 'apis',
        'all': 'full-audit',
        'full': 'full-audit'
    };
    const subFolder = folderMap[normalized] || (normalized.includes('status') ? '404-status' : normalized.includes('seo') ? 'seo-metadata' : normalized.includes('speed') ? 'page-speed' : 'full-audit');
    // If baseDir already ends with the subFolder, don't duplicate
    if (baseDir.endsWith(subFolder) || baseDir.endsWith(`${subFolder}\\`) || baseDir.endsWith(`${subFolder}/`)) {
        return baseDir;
    }
    return path.join(baseDir, subFolder);
}
