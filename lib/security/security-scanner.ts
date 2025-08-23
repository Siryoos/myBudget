import { exec } from 'child_process';
import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { promisify } from 'util';

import { logSystemEvent, AuditEventType, AuditSeverity } from '../audit-logging';

const execAsync = promisify(exec);

// Security scan types
export enum SecurityScanType {
  DEPENDENCY_VULNERABILITIES = 'dependency_vulnerabilities',
  CODE_SECURITY = 'code_security',
  SECRETS_DETECTION = 'secrets_detection',
  CONTAINER_SECURITY = 'container_security',
  INFRASTRUCTURE_SECURITY = 'infrastructure_security',
  API_SECURITY = 'api_security'
}

// Security vulnerability
export interface SecurityVulnerability {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  cve?: string;
  cvss?: number;
  affectedComponent: string;
  location?: string;
  lineNumber?: number;
  recommendation: string;
  references?: string[];
  discoveredAt: string;
}

// Security scan result
export interface SecurityScanResult {
  id: string;
  scanType: SecurityScanType;
  timestamp: string;
  status: 'success' | 'failed' | 'warning';
  vulnerabilities: SecurityVulnerability[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  scanDuration: number;
  recommendations: string[];
  metadata: {
    tool: string;
    version: string;
    target: string;
    [key: string]: unknown;
  };
}

// Security scanner configuration
export interface SecurityScannerConfig {
  enabled: boolean;
  scanInterval: number; // minutes
  tools: {
    npm: boolean;
    snyk: boolean;
    trivy: boolean;
    sonarqube: boolean;
    custom: boolean;
  };
  thresholds: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  autoFix: boolean;
  reportPath: string;
  excludePatterns: string[];
}

// Default configuration
const DEFAULT_CONFIG: SecurityScannerConfig = {
  enabled: process.env.SECURITY_SCANNING_ENABLED !== 'false',
  scanInterval: parseInt(process.env.SECURITY_SCAN_INTERVAL || '60', 10), // 1 hour
  tools: {
    npm: true,
    snyk: process.env.SNYK_TOKEN !== undefined,
    trivy: true,
    sonarqube: process.env.SONAR_TOKEN !== undefined,
    custom: true,
  },
  thresholds: {
    critical: 0,
    high: 2,
    medium: 5,
    low: 10,
  },
  autoFix: process.env.SECURITY_AUTO_FIX === 'true',
  reportPath: process.env.SECURITY_REPORT_PATH || './security-reports',
  excludePatterns: [
    'node_modules/**',
    '.git/**',
    '.next/**',
    'dist/**',
    'build/**',
    'coverage/**',
  ],
};

// Security scanner service
export class SecurityScanner {
  private config: SecurityScannerConfig;
  private scanTimer: ReturnType<typeof setInterval> | null = null;
  private isScanning: boolean = false;
  private lastScanResults: Map<SecurityScanType, SecurityScanResult> = new Map();

  constructor() {
    this.config = DEFAULT_CONFIG;
    this.startPeriodicScanning();
  }

  // Run comprehensive security scan
  async runSecurityScan(scanTypes?: SecurityScanType[]): Promise<SecurityScanResult[]> {
    if (this.isScanning) {
      throw new Error('Security scan already in progress');
    }

    this.isScanning = true;
    const startTime = Date.now();
    const results: SecurityScanResult[] = [];

    try {
      const typesToScan = scanTypes || Object.values(SecurityScanType);

      for (const scanType of typesToScan) {
        try {
          console.log(`Running ${scanType} security scan...`);
          const result = await this.runScanByType(scanType);
          results.push(result);
          this.lastScanResults.set(scanType, result);
        } catch (error) {
          console.error(`Failed to run ${scanType} scan:`, error);
          const errorResult = this.createErrorResult(scanType, error);
          results.push(errorResult);
        }
      }

      // Generate combined report
      await this.generateCombinedReport(results);

      // Check thresholds and alert if needed
      await this.checkThresholdsAndAlert(results);

      // Log scan completion
      await logSystemEvent({
        eventType: AuditEventType.CONFIGURATION_CHANGE,
        severity: AuditSeverity.MEDIUM,
        details: {
          action: 'security_scan_completed',
          scanTypes: typesToScan,
          totalVulnerabilities: results.reduce((sum, r) => sum + r.summary.total, 0),
          scanDuration: Date.now() - startTime,
        },
      });

    } finally {
      this.isScanning = false;
    }

    return results;
  }

  // Run scan by type
  private async runScanByType(scanType: SecurityScanType): Promise<SecurityScanResult> {
    const startTime = Date.now();

    switch (scanType) {
      case SecurityScanType.DEPENDENCY_VULNERABILITIES:
        return await this.scanDependencies();
      case SecurityScanType.CODE_SECURITY:
        return await this.scanCodeSecurity();
      case SecurityScanType.SECRETS_DETECTION:
        return await this.scanForSecrets();
      case SecurityScanType.CONTAINER_SECURITY:
        return await this.scanContainerSecurity();
      case SecurityScanType.INFRASTRUCTURE_SECURITY:
        return await this.scanInfrastructureSecurity();
      case SecurityScanType.API_SECURITY:
        return await this.scanAPISecurity();
      default:
        throw new Error(`Unknown scan type: ${scanType}`);
    }
  }

  // Scan npm dependencies for vulnerabilities
  private async scanDependencies(): Promise<SecurityScanResult> {
    const startTime = Date.now();
    const vulnerabilities: SecurityVulnerability[] = [];

    try {
      if (this.config.tools.npm) {
        const { stdout } = await execAsync('npm audit --json');
        const auditResult = JSON.parse(stdout);

        if (auditResult.vulnerabilities) {
          for (const [packageName, vulnData] of Object.entries(auditResult.vulnerabilities)) {
            const vuln = vulnData as any;
            vulnerabilities.push({
              id: vuln.id || crypto.randomUUID(),
              title: vuln.title || `Vulnerability in ${packageName}`,
              description: vuln.description || 'Security vulnerability detected',
              severity: this.mapNpmSeverity(vuln.severity),
              cve: vuln.cve,
              cvss: vuln.cvss,
              affectedComponent: packageName,
              recommendation: vuln.recommendation || 'Update to latest version',
              references: vuln.references,
              discoveredAt: new Date().toISOString(),
            });
          }
        }
      }

      if (this.config.tools.snyk) {
        try {
          const { stdout } = await execAsync('npx snyk test --json');
          const snykResult = JSON.parse(stdout);

          if (snykResult.vulnerabilities) {
            for (const vuln of snykResult.vulnerabilities) {
              vulnerabilities.push({
                id: vuln.id || crypto.randomUUID(),
                title: vuln.title || 'Snyk vulnerability detected',
                description: vuln.description || 'Security vulnerability detected by Snyk',
                severity: this.mapSnykSeverity(vuln.severity),
                cve: vuln.identifiers?.CVE?.[0],
                cvss: vuln.cvssScore,
                affectedComponent: vuln.packageName || 'unknown',
                location: vuln.from?.join(' > '),
                recommendation: vuln.fix || 'Review and fix vulnerability',
                references: vuln.references,
                discoveredAt: new Date().toISOString(),
              });
            }
          }
        } catch (error) {
          console.warn('Snyk scan failed:', error);
        }
      }

    } catch (error) {
      console.error('Dependency scan failed:', error);
    }

    return this.createScanResult(
      SecurityScanType.DEPENDENCY_VULNERABILITIES,
      vulnerabilities,
      Date.now() - startTime,
    );
  }

  // Scan code for security issues
  private async scanCodeSecurity(): Promise<SecurityScanResult> {
    const startTime = Date.now();
    const vulnerabilities: SecurityVulnerability[] = [];

    try {
      // ESLint security rules
      if (existsSync('.eslintrc.js') || existsSync('.eslintrc.json')) {
        try {
          const { stdout } = await execAsync('npx eslint . --ext .ts,.tsx,.js,.jsx --format json');
          const eslintResults = JSON.parse(stdout);

          for (const result of eslintResults) {
            for (const message of result.messages) {
              if (message.ruleId && message.ruleId.startsWith('security/')) {
                vulnerabilities.push({
                  id: crypto.randomUUID(),
                  title: `Security issue: ${message.ruleId}`,
                  description: message.message,
                  severity: this.mapESLintSeverity(message.severity),
                  affectedComponent: result.filePath,
                  lineNumber: message.line,
                  recommendation: 'Fix security issue according to ESLint rule',
                  discoveredAt: new Date().toISOString(),
                });
              }
            }
          }
        } catch (error) {
          console.warn('ESLint security scan failed:', error);
        }
      }

      // SonarQube analysis
      if (this.config.tools.sonarqube) {
        try {
          const { stdout } = await execAsync('npx sonarqube-scanner --sonar.host.url=${process.env.SONAR_HOST_URL} --sonar.login=${process.env.SONAR_TOKEN}');
          // Parse SonarQube results
          console.log('SonarQube scan completed:', stdout);
        } catch (error) {
          console.warn('SonarQube scan failed:', error);
        }
      }

    } catch (error) {
      console.error('Code security scan failed:', error);
    }

    return this.createScanResult(
      SecurityScanType.CODE_SECURITY,
      vulnerabilities,
      Date.now() - startTime,
    );
  }

  // Scan for secrets in code
  private async scanForSecrets(): Promise<SecurityScanResult> {
    const startTime = Date.now();
    const vulnerabilities: SecurityVulnerability[] = [];

    try {
      // Check for common secret patterns
      const secretPatterns = [
        /password\s*=\s*['"][^'"]+['"]/gi,
        /secret\s*=\s*['"][^'"]+['"]/gi,
        /api_key\s*=\s*['"][^'"]+['"]/gi,
        /token\s*=\s*['"][^'"]+['"]/gi,
        /key\s*=\s*['"][^'"]+['"]/gi,
      ];

      const filesToScan = [
        '.env',
        '.env.local',
        '.env.production',
        'config.js',
        'config.ts',
        '*.config.js',
        '*.config.ts',
      ];

      for (const filePattern of filesToScan) {
        try {
          const { stdout } = await execAsync(`find . -name "${filePattern}" -type f`);
          const files = stdout.trim().split('\n').filter(Boolean);

          for (const file of files) {
            try {
              const content = await readFile(file, 'utf-8');

              for (const pattern of secretPatterns) {
                const matches = content.match(pattern);
                if (matches) {
                  vulnerabilities.push({
                    id: crypto.randomUUID(),
                    title: 'Potential secret exposure detected',
                    description: `Secret pattern found in ${file}`,
                    severity: 'high',
                    affectedComponent: file,
                    recommendation: 'Remove hardcoded secrets and use environment variables',
                    discoveredAt: new Date().toISOString(),
                  });
                  break;
                }
              }
            } catch (error) {
              console.warn(`Failed to read file ${file}:`, error);
            }
          }
        } catch (error) {
          console.warn(`Failed to find files matching ${filePattern}:`, error);
        }
      }

    } catch (error) {
      console.error('Secrets scan failed:', error);
    }

    return this.createScanResult(
      SecurityScanType.SECRETS_DETECTION,
      vulnerabilities,
      Date.now() - startTime,
    );
  }

  // Scan container security
  private async scanContainerSecurity(): Promise<SecurityScanResult> {
    const vulnerabilities: SecurityVulnerability[] = [];

    try {
      if (this.config.tools.trivy && existsSync('Dockerfile')) {
        try {
          const { stdout } = await execAsync('trivy fs --format json .');
          const trivyResult = JSON.parse(stdout);

          if (trivyResult.Results) {
            for (const result of trivyResult.Results) {
              for (const vuln of result.Vulnerabilities || []) {
                vulnerabilities.push({
                  id: vuln.VulnerabilityID || crypto.randomUUID(),
                  title: vuln.Title || 'Container vulnerability detected',
                  description: vuln.Description || 'Security vulnerability in container',
                  severity: this.mapTrivySeverity(vuln.Severity),
                  cve: vuln.VulnerabilityID,
                  cvss: vuln.CVSS?.nvd?.V3Score,
                  affectedComponent: vuln.PkgName || 'unknown',
                  recommendation: vuln.FixedVersion ? `Update to ${vuln.FixedVersion}` : 'Review vulnerability',
                  references: vuln.References,
                  discoveredAt: new Date().toISOString(),
                });
              }
            }
          }
        } catch (error) {
          console.warn('Trivy container scan failed:', error);
        }
      }

    } catch (error) {
      console.error('Container security scan failed:', error);
    }

    return this.createScanResult(
      SecurityScanType.CONTAINER_SECURITY,
      vulnerabilities,
      Date.now() - Date.now(),
    );
  }

  // Scan infrastructure security
  private async scanInfrastructureSecurity(): Promise<SecurityScanResult> {
    const vulnerabilities: SecurityVulnerability[] = [];

    try {
      // Check Docker configuration
      if (existsSync('docker-compose.yml')) {
        try {
          const content = await readFile('docker-compose.yml', 'utf-8');

          // Check for exposed ports
          if (content.includes('ports:')) {
            const portMatches = content.match(/ports:\s*\n\s*-\s*['"]?(\d+):\d+['"]?/g);
            if (portMatches) {
              vulnerabilities.push({
                id: crypto.randomUUID(),
                title: 'Exposed ports detected',
                description: 'Docker ports are exposed to host',
                severity: 'medium',
                affectedComponent: 'docker-compose.yml',
                recommendation: 'Review exposed ports and restrict access where possible',
                discoveredAt: new Date().toISOString(),
              });
            }
          }

          // Check for root user
          if (content.includes('user: root') || content.includes('USER root')) {
            vulnerabilities.push({
              id: crypto.randomUUID(),
              title: 'Root user in container',
              description: 'Container runs as root user',
              severity: 'high',
              affectedComponent: 'docker-compose.yml',
              recommendation: 'Use non-root user for containers',
              discoveredAt: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.warn('Failed to read docker-compose.yml:', error);
        }
      }

      // Check environment files
      const envFiles = ['.env', '.env.local', '.env.production'];
      for (const envFile of envFiles) {
        if (existsSync(envFile)) {
          vulnerabilities.push({
            id: crypto.randomUUID(),
            title: 'Environment file detected',
            description: `${envFile} file found in repository`,
            severity: 'medium',
            affectedComponent: envFile,
            recommendation: 'Ensure environment files are in .gitignore and not committed',
            discoveredAt: new Date().toISOString(),
          });
        }
      }

    } catch (error) {
      console.error('Infrastructure security scan failed:', error);
    }

    return this.createScanResult(
      SecurityScanType.INFRASTRUCTURE_SECURITY,
      vulnerabilities,
      Date.now() - Date.now(),
    );
  }

  // Scan API security
  private async scanAPISecurity(): Promise<SecurityScanResult> {
    const vulnerabilities: SecurityVulnerability[] = [];

    try {
      // Check for common API security issues
      const apiFiles = ['app/api/**/*.ts', 'pages/api/**/*.ts', 'api/**/*.ts'];

      for (const pattern of apiFiles) {
        try {
          const { stdout } = await execAsync(`find . -path "${pattern}" -type f`);
          const files = stdout.trim().split('\n').filter(Boolean);

          for (const file of files) {
            try {
              const content = await readFile(file, 'utf-8');

              // Check for missing authentication
              if (content.includes('export async function') && !content.includes('requireAuth')) {
                vulnerabilities.push({
                  id: crypto.randomUUID(),
                  title: 'Missing authentication',
                  description: `API endpoint ${file} may be missing authentication`,
                  severity: 'high',
                  affectedComponent: file,
                  recommendation: 'Add authentication middleware to protect API endpoints',
                  discoveredAt: new Date().toISOString(),
                });
              }

              // Check for missing input validation
              if (content.includes('request.json()') && !content.includes('z.parse') && !content.includes('validate')) {
                vulnerabilities.push({
                  id: crypto.randomUUID(),
                  title: 'Missing input validation',
                  description: `API endpoint ${file} may be missing input validation`,
                  severity: 'medium',
                  affectedComponent: file,
                  recommendation: 'Add input validation using Zod or similar library',
                  discoveredAt: new Date().toISOString(),
                });
              }
            } catch (error) {
              console.warn(`Failed to read file ${file}:`, error);
            }
          }
        } catch (error) {
          console.warn(`Failed to find files matching ${pattern}:`, error);
        }
      }

    } catch (error) {
      console.error('API security scan failed:', error);
    }

    return this.createScanResult(
      SecurityScanType.API_SECURITY,
      vulnerabilities,
      Date.now() - Date.now(),
    );
  }

  // Create scan result
  private createScanResult(
    scanType: SecurityScanType,
    vulnerabilities: SecurityVulnerability[],
    duration: number,
  ): SecurityScanResult {
    const summary = {
      total: vulnerabilities.length,
      critical: vulnerabilities.filter(v => v.severity === 'critical').length,
      high: vulnerabilities.filter(v => v.severity === 'high').length,
      medium: vulnerabilities.filter(v => v.severity === 'medium').length,
      low: vulnerabilities.filter(v => v.severity === 'low').length,
      info: vulnerabilities.filter(v => v.severity === 'info').length,
    };

    return {
      id: crypto.randomUUID(),
      scanType,
      timestamp: new Date().toISOString(),
      status: this.determineScanStatus(summary),
      vulnerabilities,
      summary,
      scanDuration: duration,
      recommendations: this.generateRecommendations(vulnerabilities),
      metadata: {
        tool: 'SecurityScanner',
        version: '1.0.0',
        target: process.cwd(),
        timestamp: new Date().toISOString(),
      },
    };
  }

  // Create error result
  private createErrorResult(scanType: SecurityScanType, error: any): SecurityScanResult {
    return {
      id: crypto.randomUUID(),
      scanType,
      timestamp: new Date().toISOString(),
      status: 'failed',
      vulnerabilities: [],
      summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      scanDuration: 0,
      recommendations: [`Fix scan error: ${error.message || error}`],
      metadata: {
        tool: 'SecurityScanner',
        version: '1.0.0',
        target: process.cwd(),
        error: error.message || String(error),
      },
    };
  }

  // Determine scan status
  private determineScanStatus(summary: any): 'success' | 'failed' | 'warning' {
    if (summary.critical > this.config.thresholds.critical) {return 'failed';}
    if (summary.high > this.config.thresholds.high) {return 'warning';}
    if (summary.medium > this.config.thresholds.medium) {return 'warning';}
    return 'success';
  }

  // Generate recommendations
  private generateRecommendations(vulnerabilities: SecurityVulnerability[]): string[] {
    const recommendations = new Set<string>();

    for (const vuln of vulnerabilities) {
      if (vuln.recommendation) {
        recommendations.add(vuln.recommendation);
      }
    }

    return Array.from(recommendations);
  }

  // Check thresholds and alert
  private async checkThresholdsAndAlert(results: SecurityScanResult[]): Promise<void> {
    for (const result of results) {
      if (result.status === 'failed' || result.status === 'warning') {
        await logSystemEvent({
          eventType: AuditEventType.SUSPICIOUS_ACTIVITY,
          severity: AuditSeverity.HIGH,
          details: {
            action: 'security_scan_threshold_exceeded',
            scanType: result.scanType,
            status: result.status,
            vulnerabilities: result.summary,
            recommendations: result.recommendations,
          },
        });
      }
    }
  }

  // Generate combined report
  private async generateCombinedReport(results: SecurityScanResult[]): Promise<void> {
    try {
      const report = {
        timestamp: new Date().toISOString(),
        summary: {
          totalScans: results.length,
          successfulScans: results.filter(r => r.status === 'success').length,
          failedScans: results.filter(r => r.status === 'failed').length,
          warningScans: results.filter(r => r.status === 'warning').length,
          totalVulnerabilities: results.reduce((sum, r) => sum + r.summary.total, 0),
        },
        results,
      };

      const reportPath = path.join(this.config.reportPath, `security-scan-${Date.now()}.json`);
      await writeFile(reportPath, JSON.stringify(report, null, 2));

      console.log(`Security scan report saved to: ${reportPath}`);
    } catch (error) {
      console.error('Failed to generate combined report:', error);
    }
  }

  // Start periodic scanning
  private startPeriodicScanning(): void {
    if (this.config.enabled && this.config.scanInterval > 0) {
      this.scanTimer = setInterval(async () => {
        try {
          await this.runSecurityScan();
        } catch (error) {
          console.error('Periodic security scan failed:', error);
        }
      }, this.config.scanInterval * 60 * 1000);
    }
  }

  // Utility methods for severity mapping
  private mapNpmSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' | 'info' {
    const mapping: Record<string, 'critical' | 'high' | 'medium' | 'low' | 'info'> = {
      'critical': 'critical',
      'high': 'high',
      'moderate': 'medium',
      'low': 'low',
      'info': 'info',
    };
    return mapping[severity.toLowerCase()] || 'medium';
  }

  private mapSnykSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' | 'info' {
    return this.mapNpmSeverity(severity);
  }

  private mapESLintSeverity(severity: number): 'critical' | 'high' | 'medium' | 'low' | 'info' {
    return severity === 2 ? 'high' : severity === 1 ? 'medium' : 'low';
  }

  private mapTrivySeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' | 'info' {
    return this.mapNpmSeverity(severity);
  }

  // Configuration methods
  updateConfig(newConfig: Partial<SecurityScannerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): SecurityScannerConfig {
    return { ...this.config };
  }

  // Get last scan results
  getLastScanResults(): Map<SecurityScanType, SecurityScanResult> {
    return new Map(this.lastScanResults);
  }

  // Cleanup
  destroy(): void {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
    }
  }
}

// Singleton instance
export const securityScanner = new SecurityScanner();

// Convenience functions
export const runSecurityScan = (scanTypes?: SecurityScanType[]): Promise<SecurityScanResult[]> => securityScanner.runSecurityScan(scanTypes);

export const getSecurityScanResults = () => securityScanner.getLastScanResults();

// Cleanup on process exit
process.on('exit', () => {
  securityScanner.destroy();
});

process.on('SIGINT', () => {
  securityScanner.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  securityScanner.destroy();
  process.exit(0);
});
