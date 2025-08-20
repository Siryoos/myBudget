// Test script to verify i18n functionality
const fs = require('fs');
const path = require('path');

console.log('🌍 Testing SmartSave i18n Implementation\n');

// Test 1: Check if all locale directories exist
console.log('1️⃣  Checking locale directories...');
const locales = ['en', 'fa', 'ar'];
const localeDir = path.join(__dirname, 'public', 'locales');

locales.forEach(locale => {
  const localePath = path.join(localeDir, locale);
  if (fs.existsSync(localePath)) {
    console.log(`✅ ${locale} directory exists`);
  } else {
    console.log(`❌ ${locale} directory missing`);
  }
});

// Test 2: Check if all translation files exist
console.log('\n2️⃣  Checking translation files...');
const namespaces = ['common', 'dashboard', 'budget', 'goals', 'transactions', 'education', 'settings', 'auth', 'errors'];

locales.forEach(locale => {
  console.log(`\n  Locale: ${locale}`);
  namespaces.forEach(ns => {
    const filePath = path.join(localeDir, locale, `${ns}.json`);
    if (fs.existsSync(filePath)) {
      try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const keyCount = Object.keys(content).length;
        console.log(`  ✅ ${ns}.json exists (${keyCount} top-level keys)`);
      } catch (e) {
        console.log(`  ❌ ${ns}.json exists but has invalid JSON`);
      }
    } else {
      console.log(`  ❌ ${ns}.json missing`);
    }
  });
});

// Test 3: Check configuration files
console.log('\n3️⃣  Checking configuration files...');
const configFiles = [
  'next-i18next.config.js',
  'middleware.ts',
  'lib/i18n.ts',
  'lib/i18n-provider.tsx'
];

configFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, file))) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
  }
});

// Test 4: Check component updates
console.log('\n4️⃣  Checking i18n component integration...');
const componentsToCheck = [
  'components/layout/LanguageSwitcher.tsx',
  'components/layout/Navigation.tsx',
  'components/layout/Header.tsx',
  'components/dashboard/WelcomeHeader.tsx'
];

componentsToCheck.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('useTranslation') || content.includes('LanguageSwitcher')) {
      console.log(`✅ ${file} has i18n integration`);
    } else {
      console.log(`⚠️  ${file} exists but may need i18n updates`);
    }
  } else {
    console.log(`❌ ${file} missing`);
  }
});

// Test 5: Check RTL support
console.log('\n5️⃣  Checking RTL support...');
const globalsCss = path.join(__dirname, 'app', 'globals.css');
if (fs.existsSync(globalsCss)) {
  const content = fs.readFileSync(globalsCss, 'utf8');
  if (content.includes('[dir="rtl"]') && content.includes('Vazirmatn')) {
    console.log('✅ RTL styles and fonts configured');
  } else {
    console.log('⚠️  RTL support may be incomplete');
  }
}

console.log('\n✨ i18n testing complete!');
console.log('\n📝 Summary:');
console.log('- Locales supported: en, fa, ar');
console.log('- RTL languages: fa (Farsi), ar (Arabic)');
console.log('- Translation namespaces: 9');
console.log('- Language switcher: Available in header');
console.log('- Locale routing: Handled by middleware');

console.log('\n🚀 To test the app:');
console.log('1. Run: npm run dev');
console.log('2. Visit: http://localhost:3000');
console.log('3. Try language switcher in header');
console.log('4. Check URL changes to /fa/* or /ar/*');
console.log('5. Verify RTL layout for Farsi/Arabic');
