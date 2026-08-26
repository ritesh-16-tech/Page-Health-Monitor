import fs from 'fs/promises';
import path from 'path';
import { AuditResult } from '../types/audit.js';
import { getFunctionalReportDir } from '../utils/reportPathHelper.js';

export class JsonReporter {
  static async generate(result: AuditResult, outputDir = './reports'): Promise<string> {
    const targetDir = getFunctionalReportDir(outputDir, result.focus || 'all');
    await fs.mkdir(targetDir, { recursive: true });

    const safeUrl = result.targetUrl.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `audit_${safeUrl}_${timestamp}.json`;
    const filePath = path.join(targetDir, fileName);

    await fs.writeFile(filePath, JSON.stringify(result, null, 2), 'utf-8');

    return path.resolve(filePath);
  }
}
