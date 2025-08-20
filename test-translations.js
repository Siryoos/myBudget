#!/usr/bin/env node

/**
 * Translation System Test Script
 * 
 * This script tests the translation system to ensure:
 * 1. All translation files exist
 * 2. JSON files are valid
 * 3. Required keys are present
 * 4. No missing translations
 */

const fs = require('fs');
const path = require('path');

const LOCALES = ['en', 'ar', 'fa'];
const NAMESPACES = [
  'common',
  'dashboard', 
  'budget',
  'goals',
  'transactions',
  'education',
  'settings',
  'auth',
  'errors'
];

const REQUIRED_KEYS = {
  common: ['app.name', 'app.greeting.morning', 'actions.save', 'actions.cancel'],
  dashboard: ['insights.title', 'quickSave.title', 'welcome.morning'],
  budget: ['overview.title', 'categories.housing'],
  goals: ['title', 'create.title'],
  transactions: ['title', 'filters.all'],
  education: ['title', 'courses.title'],
  settings: ['title', 'profile.title'],
  auth: ['login.title', 'register.title'],
  errors: ['notFound.title', 'serverError.title']
};

function testTranslationFiles() {
  console.log('🧪 Testing Translation System...\n');
  
  let allTestsPassed = true;
  let totalFiles = 0;
  let validFiles = 0;
  
  for (const locale of LOCALES) {
    console.log(`📍 Testing locale: ${locale}`);
    
    for (const namespace of NAMESPACES) {
      const filePath = path.join(process.cwd(), 'public', 'locales', locale, `${namespace}.json`);
      totalFiles++;
      
      try {
        // Check if file exists
        if (!fs.existsSync(filePath)) {
          console.log(`  ❌ Missing: ${namespace}.json`);
          allTestsPassed = false;
          continue;
        }
        
        // Read and parse JSON
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const translations = JSON.parse(fileContent);
        
        // Check required keys
        const missingKeys = checkRequiredKeys(translations, REQUIRED_KEYS[namespace] || []);
        
        if (missingKeys.length > 0) {
          console.log(`  ⚠️  ${namespace}.json - Missing keys: ${missingKeys.join(', ')}`);
          allTestsPassed = false;
        } else {
          console.log(`  ✅ ${namespace}.json - Valid`);
          validFiles++;
        }
        
      } catch (error) {
        console.log(`  ❌ ${namespace}.json - Invalid JSON: ${error.message}`);
        allTestsPassed = false;
      }
    }
    
    console.log('');
  }
  
  // Summary
  console.log('📊 Test Summary:');
  console.log(`  Total files: ${totalFiles}`);
  console.log(`  Valid files: ${validFiles}`);
  console.log(`  Missing/Invalid: ${totalFiles - validFiles}`);
  console.log(`  Status: ${allTestsPassed ? '✅ All tests passed' : '❌ Some tests failed'}`);
  
  return allTestsPassed;
}

function checkRequiredKeys(translations, requiredKeys) {
  const missingKeys = [];
  
  for (const key of requiredKeys) {
    if (!hasNestedKey(translations, key)) {
      missingKeys.push(key);
    }
  }
  
  return missingKeys;
}

function hasNestedKey(obj, keyPath) {
  const keys = keyPath.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return false;
    }
  }
  
  return true;
}

function testTranslationAPI() {
  console.log('🌐 Testing Translation API...\n');
  
  // This would test the actual API endpoint
  // For now, just check if the route file exists
  const routePath = path.join(process.cwd(), 'app', 'locales', '[lng]', '[ns]', 'route.ts');
  
  if (fs.existsSync(routePath)) {
    console.log('✅ Translation API route exists');
    return true;
  } else {
    console.log('❌ Translation API route missing');
    return false;
  }
}

function testComponentFiles() {
  console.log('🧩 Testing Component Files...\n');
  
  const componentFiles = [
    'components/dashboard/InsightsPanel.tsx',
    'components/layout/LanguageSwitcher.tsx',
    'lib/i18n-provider.tsx',
    'lib/useTranslation.ts'
  ];
  
  let allComponentsExist = true;
  
  for (const file of componentFiles) {
    const filePath = path.join(process.cwd(), file);
    
    if (fs.existsSync(filePath)) {
      console.log(`  ✅ ${file}`);
    } else {
      console.log(`  ❌ ${file} - Missing`);
      allComponentsExist = false;
    }
  }
  
  console.log('');
  return allComponentsExist;
}

// Run all tests
function runAllTests() {
  console.log('🚀 SmartSave Translation System Test Suite\n');
  console.log('=' .repeat(50) + '\n');
  
  const tests = [
    { name: 'Translation Files', fn: testTranslationFiles },
    { name: 'Translation API', fn: testTranslationAPI },
    { name: 'Component Files', fn: testComponentFiles }
  ];
  
  let allPassed = true;
  
  for (const test of tests) {
    console.log(`\n${test.name}:`);
    console.log('-'.repeat(test.name.length + 1));
    
    try {
      const result = test.fn();
      if (!result) {
        allPassed = false;
      }
    } catch (error) {
      console.log(`❌ Test failed with error: ${error.message}`);
      allPassed = false;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`🎯 Overall Result: ${allPassed ? '✅ All tests passed' : '❌ Some tests failed'}`);
  
  if (!allPassed) {
    console.log('\n💡 Recommendations:');
    console.log('1. Check missing translation files');
    console.log('2. Verify JSON syntax in translation files');
    console.log('3. Ensure all required keys are present');
    console.log('4. Test the language switching functionality');
  }
  
  process.exit(allPassed ? 0 : 1);
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testTranslationFiles,
  testTranslationAPI,
  testComponentFiles,
  runAllTests
};
