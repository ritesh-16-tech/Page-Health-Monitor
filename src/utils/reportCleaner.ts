import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { select, confirm } from '@inquirer/prompts';
import { getFunctionalReportDir } from './reportPathHelper.js';

export interface CleanReportResult {
  filesDeleted: number;
  bytesFreed: number;
  category: string;
  directoriesCleaned: string[];
}

export class ReportCleaner {
  static readonly SUBFOLDERS = [
    '404-status',
    'seo-metadata',
    'page-speed',
    'full-audit',
    'images',
    'links',
    'apis'
  ];

  /**
   * Format bytes to human readable string (KB, MB)
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Scans a directory and removes report files (.html, .xlsx, .csv, .json)
   */
  static async cleanDirectory(dirPath: string): Promise<{ count: number; bytes: number }> {
    let count = 0;
    let bytes = 0;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isFile()) {
          // Only clean report artifacts (.html, .xlsx, .csv, .json) or root reports
          const ext = path.extname(entry.name).toLowerCase();
          if (['.html', '.xlsx', '.csv', '.json'].includes(ext)) {
            const stat = await fs.stat(fullPath);
            bytes += stat.size;
            await fs.unlink(fullPath);
            count++;
          }
        } else if (entry.isDirectory()) {
          // Recursively clean subdirectories if any
          const subResult = await this.cleanDirectory(fullPath);
          count += subResult.count;
          bytes += subResult.bytes;
        }
      }
    } catch {
      // Directory may not exist yet, ignore
    }

    return { count, bytes };
  }

  /**
   * Programmatic method to clean reports folder
   */
  static async clean(outputDir = './reports', category: string = 'all'): Promise<CleanReportResult> {
    const normCategory = (category || 'all').toLowerCase();
    let totalDeleted = 0;
    let totalBytes = 0;
    const cleanedDirs: string[] = [];

    // Ensure base directory exists
    await fs.mkdir(outputDir, { recursive: true });

    if (normCategory === 'all' || normCategory === 'true' || normCategory === '') {
      // Clean root reports directory files
      const rootRes = await this.cleanDirectory(outputDir);
      totalDeleted += rootRes.count;
      totalBytes += rootRes.bytes;
      cleanedDirs.push(outputDir);

      // Re-create the clean functional subdirectories
      for (const sub of this.SUBFOLDERS) {
        const subPath = path.join(outputDir, sub);
        await fs.mkdir(subPath, { recursive: true });
      }
    } else {
      // Target a specific functional category
      const targetDir = getFunctionalReportDir(outputDir, normCategory);
      await fs.mkdir(targetDir, { recursive: true });

      const subRes = await this.cleanDirectory(targetDir);
      totalDeleted += subRes.count;
      totalBytes += subRes.bytes;
      cleanedDirs.push(targetDir);
    }

    return {
      filesDeleted: totalDeleted,
      bytesFreed: totalBytes,
      category: normCategory,
      directoriesCleaned: cleanedDirs
    };
  }

  /**
   * Interactive prompt workflow to clean reports
   */
  static async interactiveClean(outputDir = './reports'): Promise<void> {
    console.log(chalk.bold.cyan('\n======================================================================'));
    console.log(chalk.bold.cyan('             🧹  PAGE SENTINEL - REPORT DIRECTORY CLEANER'));
    console.log(chalk.bold.cyan('======================================================================'));

    try {
      const selectedScope = await select({
        message: 'What would you like to clear from the reports directory?',
        choices: [
          { name: '1. 🗑️  Clean ALL reports (entire reports/ folder and all subfolders)', value: 'all' },
          { name: '2. 🌐  Clean only 404 & Page Status reports (reports/404-status/)', value: 'status' },
          { name: '3. 🔍  Clean only SEO Metadata reports (reports/seo-metadata/)', value: 'seo' },
          { name: '4. ⚡  Clean only Page Speed & Web Vitals reports (reports/page-speed/)', value: 'speed' },
          { name: '5. 🌟  Clean only Full Unified Audit reports (reports/full-audit/)', value: 'full-audit' },
          { name: '6. 🖼️  Clean only Image reports (reports/images/)', value: 'images' },
          { name: '7. 🔗  Clean only Link reports (reports/links/)', value: 'links' },
          { name: '8. 📡  Clean only API & Network reports (reports/apis/)', value: 'apis' },
          { name: '9. ❌  Cancel', value: 'cancel' }
        ],
        default: 'all'
      });

      if (selectedScope === 'cancel') {
        console.log(chalk.yellow('Report clean operation cancelled.'));
        return;
      }

      const confirmed = await confirm({
        message: `Are you sure you want to delete reports for "${chalk.bold.yellow(selectedScope)}"?`,
        default: true
      });

      if (!confirmed) {
        console.log(chalk.yellow('Report clean operation cancelled.'));
        return;
      }

      const spinner = ora({ text: 'Cleaning report files...', color: 'cyan' }).start();
      const result = await this.clean(outputDir, selectedScope);

      if (result.filesDeleted === 0) {
        spinner.info(chalk.yellow('Reports directory is already clean (0 files found).'));
      } else {
        spinner.succeed(
          chalk.green(
            `Successfully cleaned ${chalk.bold.white(result.filesDeleted)} report file(s) — freed ${chalk.bold.white(
              this.formatBytes(result.bytesFreed)
            )} of disk space!`
          )
        );
      }
    } catch {
      console.log(chalk.yellow('\nReport clean operation cancelled.'));
    }
  }
}
