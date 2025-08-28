#!/usr/bin/env node

/**
 * Security Check Script
 * Validates environment configuration and security settings
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load environment variables from .env.local first (if present), then fallback to .env
const dotenvLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(dotenvLocalPath)) {
  require('dotenv').config({ path: dotenvLocalPath });
} else {
  require('dotenv').config();
}

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Security checks
const securityChecks = [
  {
    name: 'Environment Files',
    check: () => {
      // Check if environment files are tracked by git
      const { execSync } = require('child_process');
      
      try {
        const trackedEnvFiles = execSync('git ls-files | grep -E "\\.(env|config)$"', { encoding: 'utf8' }).trim();
        
        if (trackedEnvFiles) {
          return { 
            passed: false, 
            message: `Environment files tracked by git: ${trackedEnvFiles.split('\n').join(', ')}. These should not be committed.`,
            severity: 'CRITICAL'
          };
        }
        
        return { passed: true, message: 'No environment files tracked by git' };
      } catch (error) {
        // If grep returns no results, it means no env files are tracked
        return { passed: true, message: 'No environment files tracked by git' };
      }
    }
  },
  
  {
    name: 'JWT Secret Length',
    check: () => {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        return { passed: false, message: 'JWT_SECRET not set', severity: 'CRITICAL' };
      }
      
      if (jwtSecret.length < 32) {
        return { 
          passed: false, 
          message: `JWT_SECRET too short (${jwtSecret.length} chars, minimum 32)`, 
          severity: 'HIGH' 
        };
      }
      
      if (jwtSecret.includes('your_') || jwtSecret.includes('placeholder')) {
        return { 
          passed: false, 
          message: 'JWT_SECRET appears to be a placeholder', 
          severity: 'CRITICAL' 
        };
      }
      
      return { passed: true, message: 'JWT_SECRET is properly configured' };
    }
  },
  
  {
    name: 'Database Password',
    check: () => {
      const dbPassword = process.env.DB_PASSWORD;
      if (!dbPassword) {
        return { passed: false, message: 'DB_PASSWORD not set', severity: 'CRITICAL' };
      }
      
      if (dbPassword.includes('MyBudget') || dbPassword.includes('test_')) {
        return { 
          passed: false, 
          message: 'DB_PASSWORD appears to be default or test password', 
          severity: 'CRITICAL' 
        };
      }
      
      if (dbPassword.length < 8) {
        return { 
          passed: false, 
          message: `DB_PASSWORD too short (${dbPassword.length} chars, minimum 8)`, 
          severity: 'HIGH' 
        };
      }
      
      return { passed: true, message: 'DB_PASSWORD is properly configured' };
    }
  },
  
  {
    name: 'Redis Password',
    check: () => {
      const redisPassword = process.env.REDIS_PASSWORD;
      if (!redisPassword) {
        return { passed: false, message: 'REDIS_PASSWORD not set', severity: 'CRITICAL' };
      }
      
      if (redisPassword.includes('your_') || redisPassword.includes('test_')) {
        return { 
          passed: false, 
          message: 'REDIS_PASSWORD appears to be a placeholder', 
          severity: 'CRITICAL' 
        };
      }
      
      return { passed: true, message: 'REDIS_PASSWORD is properly configured' };
    }
  },
  
  {
    name: 'CORS Configuration',
    check: () => {
      const allowedOrigins = process.env.ALLOWED_ORIGINS;
      if (!allowedOrigins) {
        return { passed: false, message: 'ALLOWED_ORIGINS not set', severity: 'HIGH' };
      }
      
      const origins = allowedOrigins.split(',').map(o => o.trim());
      const hasWildcard = origins.some(o => o === '*' || o === 'http://*' || o === 'https://*');
      
      if (hasWildcard) {
        return { 
          passed: false, 
          message: 'ALLOWED_ORIGINS contains wildcard (*) which is insecure', 
          severity: 'HIGH' 
        };
      }
      
      return { passed: true, message: 'CORS is properly configured' };
    }
  },
  
  {
    name: 'Node Environment',
    check: () => {
      const nodeEnv = process.env.NODE_ENV;
      if (!nodeEnv) {
        return { passed: false, message: 'NODE_ENV not set', severity: 'MEDIUM' };
      }
      
      if (nodeEnv === 'production' && process.env.JWT_SECRET?.includes('your_')) {
        return { 
          passed: false, 
          message: 'Production environment with placeholder JWT_SECRET', 
          severity: 'CRITICAL' 
        };
      }
      
      return { passed: true, message: `NODE_ENV is set to ${nodeEnv}` };
    }
  }
];

// Run security checks
function runSecurityChecks() {
  console.log(`${colors.bold}${colors.blue}🔒 Security Check Report${colors.reset}\n`);
  
  let passed = 0;
  let failed = 0;
  let critical = 0;
  
  securityChecks.forEach(check => {
    try {
      const result = check.check();
      
      if (result.passed) {
        console.log(`${colors.green}✅ ${check.name}: ${result.message}${colors.reset}`);
        passed++;
      } else {
        const severity = result.severity || 'MEDIUM';
        const color = severity === 'CRITICAL' ? colors.red : 
                     severity === 'HIGH' ? colors.yellow : colors.blue;
        
        console.log(`${color}❌ ${check.name}: ${result.message}${colors.reset}`);
        failed++;
        
        if (severity === 'CRITICAL') critical++;
      }
    } catch (error) {
      console.log(`${colors.red}❌ ${check.name}: Check failed with error: ${error.message}${colors.reset}`);
      failed++;
    }
  });
  
  console.log(`\n${colors.bold}📊 Summary:${colors.reset}`);
  console.log(`${colors.green}✅ Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${failed}${colors.reset}`);
  
  if (critical > 0) {
    console.log(`\n${colors.red}${colors.bold}🚨 CRITICAL ISSUES FOUND: ${critical}${colors.reset}`);
    console.log(`${colors.red}Please fix these issues before deploying to production!${colors.reset}`);
    process.exit(1);
  } else if (failed > 0) {
    console.log(`\n${colors.yellow}⚠️  Issues found. Please review and fix them.${colors.reset}`);
  } else {
    console.log(`\n${colors.green}🎉 All security checks passed!${colors.reset}`);
  }
}

// Run checks if this script is executed directly
if (require.main === module) {
  runSecurityChecks();
}

module.exports = { runSecurityChecks, securityChecks };
