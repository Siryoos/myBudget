#!/usr/bin/env tsx

/**
 * Bundle Analysis and Optimization Script
 *
 * This script analyzes the application bundle to:
 * - Identify duplicate dependencies
 * - Find large packages
 * - Suggest optimizations
 * - Generate bundle reports
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface BundleAnalysis {
  totalSize: number;
  duplicatePackages: Array<{
    name: string;
    count: number;
    totalSize: number;
    versions: string[];
  }>;
  largePackages: Array<{
    name: string;
    size: number;
    percentage: number;
  }>;
  optimizationSuggestions: string[];
  recommendations: string[];
}

interface PackageInfo {
  name: string;
  version: string;
  size: number;
  dependencies: string[];
}

class BundleAnalyzer {
  private projectRoot: string;
  private nodeModulesPath: string;
  private packageLockPath: string;

  constructor() {
    this.projectRoot = process.cwd();
    this.nodeModulesPath = path.join(this.projectRoot, 'node_modules');
    this.packageLockPath = path.join(this.projectRoot, 'package-lock.json');
  }

  /**
   * Run complete bundle analysis
   */
  async analyzeBundle(): Promise<BundleAnalysis> {
    console.log('🔍 Starting bundle analysis...\n');

    const duplicatePackages = this.findDuplicatePackages();
    const largePackages = this.findLargePackages();
    const optimizationSuggestions = this.generateOptimizationSuggestions(duplicatePackages, largePackages);
    const recommendations = this.generateRecommendations(duplicatePackages, largePackages);

    const totalSize = this.calculateTotalSize();

    return {
      totalSize,
      duplicatePackages,
      largePackages,
      optimizationSuggestions,
      recommendations,
    };
  }

  /**
   * Find duplicate packages in node_modules
   */
  private findDuplicatePackages(): Array<{
    name: string;
    count: number;
    totalSize: number;
    versions: string[];
  }> {
    console.log('📦 Analyzing package duplicates...');

    const duplicates: Record<string, {
      count: number;
      totalSize: number;
      versions: string[];
      paths: string[];
    }> = {};

    // Read package-lock.json to get dependency tree
    const packageLock = JSON.parse(fs.readFileSync(this.packageLockPath, 'utf-8'));

    this.analyzeDependencyTree(packageLock.dependencies, duplicates);

    // Convert to array format
    return Object.entries(duplicates)
      .filter(([_, info]) => info.count > 1)
      .map(([name, info]) => ({
        name,
        count: info.count,
        totalSize: info.totalSize,
        versions: info.versions,
      }))
      .sort((a, b) => b.totalSize - a.totalSize);
  }

  /**
   * Recursively analyze dependency tree
   */
  private analyzeDependencyTree(
    dependencies: Record<string, any>,
    duplicates: Record<string, any>,
    parentPath: string = '',
  ): void {
    for (const [name, info] of Object.entries(dependencies)) {
      const packagePath = path.join(parentPath, 'node_modules', name);
      const packageJsonPath = path.join(this.nodeModulesPath, packagePath, 'package.json');

      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
          const version = packageJson.version;
          const size = this.getPackageSize(path.join(this.nodeModulesPath, packagePath));

          if (!duplicates[name]) {
            duplicates[name] = {
              count: 0,
              totalSize: 0,
              versions: [],
              paths: [],
            };
          }

          duplicates[name].count++;
          duplicates[name].totalSize += size;
          if (!duplicates[name].versions.includes(version)) {
            duplicates[name].versions.push(version);
          }
          duplicates[name].paths.push(packagePath);
        } catch (error) {
          // Skip packages that can't be read
        }
      }

      // Recursively analyze nested dependencies
      if (info.dependencies) {
        this.analyzeDependencyTree(info.dependencies, duplicates, packagePath);
      }
    }
  }

  /**
   * Find large packages
   */
  private findLargePackages(): Array<{
    name: string;
    size: number;
    percentage: number;
  }> {
    console.log('📊 Analyzing package sizes...');

    const packages: PackageInfo[] = [];
    const totalSize = this.calculateTotalSize();

    // Get direct dependencies from package.json
    const packageJson = JSON.parse(fs.readFileSync(path.join(this.projectRoot, 'package.json'), 'utf-8'));
    const allDependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    for (const [name, version] of Object.entries(allDependencies)) {
      const packagePath = path.join(this.nodeModulesPath, name);
      if (fs.existsSync(packagePath)) {
        const size = this.getPackageSize(packagePath);
        packages.push({
          name,
          version: version as string,
          size,
          dependencies: this.getPackageDependencies(packagePath),
        });
      }
    }

    return packages
      .sort((a, b) => b.size - a.size)
      .slice(0, 20) // Top 20 largest packages
      .map(pkg => ({
        name: pkg.name,
        size: pkg.size,
        percentage: (pkg.size / totalSize) * 100,
      }));
  }

  /**
   * Calculate total bundle size
   */
  private calculateTotalSize(): number {
    let totalSize = 0;

    const calculateDirSize = (dirPath: string): number => {
      let size = 0;
      try {
        const items = fs.readdirSync(dirPath);
        for (const item of items) {
          const itemPath = path.join(dirPath, item);
          const stat = fs.statSync(itemPath);

          if (stat.isDirectory()) {
            size += calculateDirSize(itemPath);
          } else {
            size += stat.size;
          }
        }
      } catch (error) {
        // Skip directories that can't be read
      }
      return size;
    };

    totalSize = calculateDirSize(this.nodeModulesPath);
    return totalSize;
  }

  /**
   * Get package size in bytes
   */
  private getPackageSize(packagePath: string): number {
    let size = 0;
    try {
      const calculateSize = (dirPath: string): number => {
        let dirSize = 0;
        const items = fs.readdirSync(dirPath);

        for (const item of items) {
          const itemPath = path.join(dirPath, item);
          const stat = fs.statSync(itemPath);

          if (stat.isDirectory()) {
            dirSize += calculateSize(itemPath);
          } else {
            dirSize += stat.size;
          }
        }
        return dirSize;
      };

      size = calculateSize(packagePath);
    } catch (error) {
      size = 0;
    }
    return size;
  }

  /**
   * Get package dependencies
   */
  private getPackageDependencies(packagePath: string): string[] {
    try {
      const packageJsonPath = path.join(packagePath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        return Object.keys(packageJson.dependencies || {});
      }
    } catch (error) {
      // Skip packages that can't be read
    }
    return [];
  }

  /**
   * Generate optimization suggestions
   */
  private generateOptimizationSuggestions(
    duplicates: Array<{ name: string; count: number; totalSize: number; versions: string[] }>,
    largePackages: Array<{ name: string; size: number; percentage: number }>,
  ): string[] {
    const suggestions: string[] = [];

    // Duplicate package suggestions
    duplicates.forEach(duplicate => {
      if (duplicate.count > 1) {
        suggestions.push(
          `Consolidate ${duplicate.name} (${duplicate.count} instances, ${this.formatBytes(duplicate.totalSize)})`,
        );
      }
    });

    // Large package suggestions
    largePackages.forEach(pkg => {
      if (pkg.percentage > 5) {
        suggestions.push(
          `Consider alternatives to ${pkg.name} (${this.formatBytes(pkg.size)}, ${pkg.percentage.toFixed(1)}% of bundle)`,
        );
      }
    });

    // Icon library specific suggestions
    if (this.hasMultipleIconLibraries()) {
      suggestions.push('Consolidate icon libraries: Consider using a single icon library instead of multiple');
    }

    return suggestions;
  }

  /**
   * Check if multiple icon libraries are used
   */
  private hasMultipleIconLibraries(): boolean {
    const iconLibraries = ['@heroicons', 'lucide-react', '@mui/icons-material', 'react-icons'];
    const packageJson = JSON.parse(fs.readFileSync(path.join(this.projectRoot, 'package.json'), 'utf-8'));
    const allDependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

    const usedIconLibraries = iconLibraries.filter(lib =>
      Object.keys(allDependencies).some(dep => dep.includes(lib)),
    );

    return usedIconLibraries.length > 1;
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(
    duplicates: Array<{ name: string; count: number; totalSize: number; versions: string[] }>,
    largePackages: Array<{ name: string; size: number; percentage: number }>,
  ): string[] {
    const recommendations: string[] = [];

    // General recommendations
    recommendations.push('Use npm dedupe to remove duplicate packages');
    recommendations.push('Consider using pnpm or yarn for better dependency management');
    recommendations.push('Implement tree shaking for unused code elimination');
    recommendations.push('Use dynamic imports for code splitting');

    // Specific recommendations based on analysis
    if (duplicates.length > 0) {
      recommendations.push('Review package.json for unnecessary dependencies');
      recommendations.push('Check for conflicting peer dependencies');
    }

    if (largePackages.some(pkg => pkg.percentage > 10)) {
      recommendations.push('Implement lazy loading for large components');
      recommendations.push('Consider using smaller alternatives for large packages');
    }

    return recommendations;
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) {return '0 Bytes';}

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Generate detailed report
   */
  generateReport(analysis: BundleAnalysis): string {
    let report = '# Bundle Analysis Report\n\n';

    report += '## Summary\n';
    report += `- **Total Bundle Size**: ${this.formatBytes(analysis.totalSize)}\n`;
    report += `- **Duplicate Packages**: ${analysis.duplicatePackages.length}\n`;
    report += `- **Large Packages**: ${analysis.largePackages.length}\n\n`;

    if (analysis.duplicatePackages.length > 0) {
      report += '## Duplicate Packages\n\n';
      report += '| Package | Count | Total Size | Versions |\n';
      report += '|---------|-------|------------|----------|\n';

      analysis.duplicatePackages.forEach(duplicate => {
        report += `| ${duplicate.name} | ${duplicate.count} | ${this.formatBytes(duplicate.totalSize)} | ${duplicate.versions.join(', ')} |\n`;
      });
      report += '\n';
    }

    if (analysis.largePackages.length > 0) {
      report += '## Largest Packages\n\n';
      report += '| Package | Size | Percentage |\n';
      report += '|---------|------|------------|\n';

      analysis.largePackages.forEach(pkg => {
        report += `| ${pkg.name} | ${this.formatBytes(pkg.size)} | ${pkg.percentage.toFixed(1)}% |\n`;
      });
      report += '\n';
    }

    if (analysis.optimizationSuggestions.length > 0) {
      report += '## Optimization Suggestions\n\n';
      analysis.optimizationSuggestions.forEach(suggestion => {
        report += `- ${suggestion}\n`;
      });
      report += '\n';
    }

    if (analysis.recommendations.length > 0) {
      report += '## Recommendations\n\n';
      analysis.recommendations.forEach(recommendation => {
        report += `- ${recommendation}\n`;
      });
      report += '\n';
    }

    return report;
  }

  /**
   * Run npm dedupe
   */
  async runDedupe(): Promise<void> {
    console.log('🧹 Running npm dedupe...');
    try {
      execSync('npm dedupe', { stdio: 'inherit' });
      console.log('✅ npm dedupe completed successfully');
    } catch (error) {
      console.error('❌ npm dedupe failed:', error);
    }
  }

  /**
   * Generate bundle visualization
   */
  async generateBundleVisualization(): Promise<void> {
    console.log('📊 Generating bundle visualization...');
    try {
      // Set environment variable for bundle analyzer
      process.env.ANALYZE = 'true';

      // Run build with bundle analyzer
      execSync('npm run build', { stdio: 'inherit' });

      console.log('✅ Bundle visualization generated');
      console.log('📁 Check the .next/analyze folder for detailed reports');
    } catch (error) {
      console.error('❌ Bundle visualization failed:', error);
    }
  }
}

// Main execution
async function main(): Promise<void> {
  const analyzer = new BundleAnalyzer();

  try {
    // Run analysis
    const analysis = await analyzer.analyzeBundle();

    // Generate report
    const report = analyzer.generateReport(analysis);

    // Save report to file
    const reportPath = path.join(process.cwd(), 'bundle-analysis-report.md');
    fs.writeFileSync(reportPath, report);

    console.log('\n📋 Analysis completed!');
    console.log(`📄 Report saved to: ${reportPath}`);

    // Display summary
    console.log('\n📊 Bundle Analysis Summary:');
    console.log(`   Total Size: ${analyzer.formatBytes(analysis.totalSize)}`);
    console.log(`   Duplicate Packages: ${analysis.duplicatePackages.length}`);
    console.log(`   Large Packages: ${analysis.largePackages.length}`);

    if (analysis.duplicatePackages.length > 0) {
      console.log('\n🚨 Duplicate packages found!');
      analysis.duplicatePackages.slice(0, 5).forEach(duplicate => {
        console.log(`   - ${duplicate.name}: ${duplicate.count} instances`);
      });
    }

    if (analysis.largePackages.length > 0) {
      console.log('\n⚠️  Large packages detected:');
      analysis.largePackages.slice(0, 5).forEach(pkg => {
        console.log(`   - ${pkg.name}: ${analyzer.formatBytes(pkg.size)} (${pkg.percentage.toFixed(1)}%)`);
      });
    }

    // Ask user if they want to run optimizations
    console.log('\n🔧 Would you like to run optimizations?');
    console.log('   Run: npm run bundle:optimize');

  } catch (error) {
    console.error('❌ Bundle analysis failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { BundleAnalyzer };
