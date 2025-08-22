#!/usr/bin/env ts-node

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const IGNORED_DIRS = ['node_modules', '.next', 'dist', 'build', '.git', 'logs'];
const SUPPORTED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

interface Replacement {
  pattern: RegExp;
  replacement: string;
}

const replacements: Replacement[] = [
  // console.error with error object
  {
    pattern: /console\.error\s*\(\s*(['"`])(.*?)\1\s*,\s*(.*?)\s*\)/g,
    replacement: "logger.error($1$2$1, $3)"
  },
  // console.error without error object
  {
    pattern: /console\.error\s*\(\s*(['"`])(.*?)\1\s*\)/g,
    replacement: "logger.error($1$2$1)"
  },
  // console.warn
  {
    pattern: /console\.warn\s*\(\s*(['"`])(.*?)\1/g,
    replacement: "logger.warn($1$2$1"
  },
  // console.log
  {
    pattern: /console\.log\s*\(\s*(['"`])(.*?)\1/g,
    replacement: "logger.info($1$2$1"
  },
  // console.debug
  {
    pattern: /console\.debug\s*\(\s*(['"`])(.*?)\1/g,
    replacement: "logger.debug($1$2$1"
  },
  // console.info
  {
    pattern: /console\.info\s*\(\s*(['"`])(.*?)\1/g,
    replacement: "logger.info($1$2$1"
  }
];

function shouldProcessFile(filePath: string): boolean {
  // Skip logger.ts itself
  if (filePath.endsWith('logger.ts')) return false;
  
  // Skip test files
  if (filePath.includes('.test.') || filePath.includes('.spec.')) return false;
  
  // Skip this script
  if (filePath.endsWith('replace-console-logs.ts')) return false;
  
  return SUPPORTED_EXTENSIONS.includes(extname(filePath));
}

function processFile(filePath: string): boolean {
  try {
    let content = readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Check if file already imports logger
    const hasLoggerImport = content.includes("from '@/lib/logger'") || 
                           content.includes('from "../lib/logger"') ||
                           content.includes('from "./logger"');
    
    // Apply replacements
    let hasConsoleUsage = false;
    for (const { pattern, replacement } of replacements) {
      if (pattern.test(content)) {
        hasConsoleUsage = true;
        content = content.replace(pattern, replacement);
      }
    }
    
    // Add logger import if needed
    if (hasConsoleUsage && !hasLoggerImport) {
      // Find the right place to add import
      const importMatch = content.match(/^(import .* from .*;\n)+/m);
      if (importMatch) {
        const lastImportEnd = importMatch.index! + importMatch[0].length;
        const importPath = filePath.includes('/app/') ? '@/lib/logger' : 
                          filePath.includes('/lib/') ? './logger' : 
                          '@/lib/logger';
        content = content.slice(0, lastImportEnd) + 
                 `import { logger } from '${importPath}';\n` + 
                 content.slice(lastImportEnd);
      } else {
        // No imports found, add at the beginning
        const importPath = filePath.includes('/app/') ? '@/lib/logger' : 
                          filePath.includes('/lib/') ? './logger' : 
                          '@/lib/logger';
        content = `import { logger } from '${importPath}';\n\n` + content;
      }
    }
    
    // Write back if changed
    if (content !== originalContent) {
      writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
    return false;
  }
}

function processDirectory(dir: string, stats: { total: number; updated: number } = { total: 0, updated: 0 }): void {
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!IGNORED_DIRS.includes(item)) {
        processDirectory(fullPath, stats);
      }
    } else if (stat.isFile() && shouldProcessFile(fullPath)) {
      stats.total++;
      if (processFile(fullPath)) {
        stats.updated++;
      }
    }
  }
  
  return stats;
}

// Main execution
console.log('🔍 Replacing console.log statements with structured logger...\n');

const projectRoot = join(__dirname, '..');
const stats = processDirectory(projectRoot);

console.log(`\n✨ Complete! Processed ${stats.total} files, updated ${stats.updated} files.`);

// Special cases that need manual review
console.log('\n⚠️  Please manually review the following files:');
console.log('- jest.setup.js (test configuration)');
console.log('- Scripts in /scripts directory');
console.log('- Any client-side only code that shouldn\'t use server logger');