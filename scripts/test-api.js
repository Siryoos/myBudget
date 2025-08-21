#!/usr/bin/env node

/**
 * MyBudget API Test Script
 * 
 * This script helps you test the API endpoints after setup.
 * Make sure your development server is running (npm run dev)
 */

// API base URL - can be overridden with TEST_API_PORT environment variable
const BASE_URL = process.env.TEST_API_PORT 
  ? `http://localhost:${process.env.TEST_API_PORT}/api`
  : 'http://localhost:3001/api';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Test data
const testUser = {
  email: `test${Date.now()}@example.com`,
  password: 'TestPassword123!',
  name: 'Test User',
  currency: 'USD',
  language: 'en'
};

let authToken = null;
let userId = null;
let budgetId = null;
let categoryId = null;
let transactionId = null;
let goalId = null;

// Helper function to make HTTP requests
async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const defaultOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` })
    }
  };

  const finalOptions = { ...defaultOptions, ...options };
  
  if (options.body) {
    finalOptions.body = JSON.stringify(options.body);
  }

  // Create AbortController for timeout handling
  const controller = new AbortController();
  const timeout = options.timeout || 5000; // Default 5 seconds, allow override
  
  // Set timeout timer
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    // Add signal to fetch options
    const response = await fetch(url, { ...finalOptions, signal: controller.signal });
    const data = await response.json();
    
    // Clear timeout timer after successful fetch
    clearTimeout(timeoutId);
    
    return {
      status: response.status,
      data,
      success: response.ok
    };
  } catch (error) {
    // Clear timeout timer
    clearTimeout(timeoutId);
    
    // Check if it's an abort error (timeout)
    if (error.name === 'AbortError') {
      return {
        status: 0,
        data: { error: `Request timed out after ${timeout}ms` },
        success: false
      };
    }
    
    // Return other errors as before
    return {
      status: 0,
      data: { error: error.message },
      success: false
    };
  }
}

// Test functions
async function testRegistration() {
  logInfo('Testing user registration...');
  
  const result = await makeRequest('/auth/register', {
    method: 'POST',
    body: testUser
  });

  if (result.success) {
    logSuccess('User registered successfully');
    authToken = result.data.data.token;
    userId = result.data.data.user.id;
    return true;
  } else {
    logError(`Registration failed: ${result.data.error}`);
    return false;
  }
}

async function testLogin() {
  logInfo('Testing user login...');
  
  const result = await makeRequest('/auth/login', {
    method: 'POST',
    body: {
      email: testUser.email,
      password: testUser.password
    }
  });

  if (result.success) {
    logSuccess('User logged in successfully');
    authToken = result.data.data.token;
    return true;
  } else {
    logError(`Login failed: ${result.data.error}`);
    return false;
  }
}

async function testCreateBudget() {
  logInfo('Testing budget creation...');
  
  const budgetData = {
    name: 'Test Monthly Budget',
    method: '50-30-20',
    totalIncome: 5000,
    period: 'monthly',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    categories: [
      {
        name: 'Housing',
        allocated: 2500,
        color: '#3B82F6',
        isEssential: true
      },
      {
        name: 'Food',
        allocated: 750,
        color: '#10B981',
        isEssential: true
      },
      {
        name: 'Transportation',
        allocated: 500,
        color: '#F59E0B',
        isEssential: true
      },
      {
        name: 'Entertainment',
        allocated: 250,
        color: '#8B5CF6',
        isEssential: false
      },
      {
        name: 'Savings',
        allocated: 1000,
        color: '#EF4444',
        isEssential: false
      }
    ]
  };

  const result = await makeRequest('/budgets', {
    method: 'POST',
    body: budgetData
  });

  if (result.success) {
    logSuccess('Budget created successfully');
    budgetId = result.data.data.budgetId;
    return true;
  } else {
    logError(`Budget creation failed: ${result.data.error}`);
    return false;
  }
}

async function testGetBudgets() {
  logInfo('Testing budget retrieval...');
  
  const result = await makeRequest('/budgets');
  
  if (result.success) {
    logSuccess(`Retrieved ${result.data.data.length} budgets`);
    if (result.data.data.length > 0) {
      const budget = result.data.data[0];
      if (budget.categories && budget.categories.length > 0) {
        categoryId = budget.categories[0].id;
      }
    }
    return true;
  } else {
    logError(`Budget retrieval failed: ${result.data.error}`);
    return false;
  }
}

async function testCreateTransaction() {
  logInfo('Testing transaction creation...');
  
  // Guard against undefined categoryId
  if (!categoryId) {
    logWarning('Skipping transaction creation: no category ID available. Ensure budgets exist with categories first.');
    return false;
  }
  
  const transactionData = {
    amount: 50.00,
    description: 'Test grocery shopping',
    category: 'Food',
    date: new Date().toISOString().split('T')[0],
    type: 'expense',
    budgetCategoryId: categoryId
  };

  const result = await makeRequest('/transactions', {
    method: 'POST',
    body: transactionData
  });

  if (result.success) {
    logSuccess('Transaction created successfully');
    transactionId = result.data.data.id;
    return true;
  } else {
    logError(`Transaction creation failed: ${result.data.error}`);
    return false;
  }
}

async function testGetTransactions() {
  logInfo('Testing transaction retrieval...');
  
  const result = await makeRequest('/transactions');
  
  if (result.success) {
    logSuccess(`Retrieved ${result.data.data.transactions.length} transactions`);
    return true;
  } else {
    logError(`Transaction retrieval failed: ${result.data.error}`);
    return false;
  }
}

async function testCreateGoal() {
  logInfo('Testing goal creation...');
  
  const goalData = {
    name: 'Test Emergency Fund',
    description: 'Save 6 months of expenses',
    targetAmount: 15000,
    targetDate: '2024-12-31',
    category: 'emergency',
    priority: 'high'
  };

  const result = await makeRequest('/goals', {
    method: 'POST',
    body: goalData
  });

  if (result.success) {
    logSuccess('Goal created successfully');
    goalId = result.data.data.id;
    return true;
  } else {
    logError(`Goal creation failed: ${result.data.error}`);
    return false;
  }
}

async function testGetGoals() {
  logInfo('Testing goal retrieval...');
  
  const result = await makeRequest('/goals');
  
  if (result.success) {
    logSuccess(`Retrieved ${result.data.data.length} goals`);
    return true;
  } else {
    logError(`Goal retrieval failed: ${result.data.error}`);
    return false;
  }
}

async function testDashboard() {
  logInfo('Testing dashboard...');
  
  const result = await makeRequest('/dashboard');
  
  if (result.success) {
    logSuccess('Dashboard data retrieved successfully');
    return true;
  } else {
    logError(`Dashboard failed: ${result.data.error}`);
    return false;
  }
}

async function testUserProfile() {
  logInfo('Testing user profile...');
  
  const result = await makeRequest('/user/profile');
  
  if (result.success) {
    logSuccess('User profile retrieved successfully');
    return true;
  } else {
    logError(`User profile failed: ${result.data.error}`);
    return false;
  }
}

async function testReports() {
  logInfo('Testing reports...');
  
  const startDate = '2024-01-01';
  const endDate = new Date().toISOString().split('T')[0];
  
  const result = await makeRequest(`/reports?type=monthly&startDate=${startDate}&endDate=${endDate}`);
  
  if (result.success) {
    logSuccess('Monthly report generated successfully');
    return true;
  } else {
    logError(`Report generation failed: ${result.data.error}`);
    return false;
  }
}

// Main test runner
async function runTests() {
  log('🚀 Starting MyBudget API Tests', 'bright');
  log('================================', 'bright');
  
  let passedTests = 0;
  let totalTests = 0;

  const tests = [
    { name: 'User Registration', fn: testRegistration },
    { name: 'User Login', fn: testLogin },
    { name: 'Create Budget', fn: testCreateBudget },
    { name: 'Get Budgets', fn: testGetBudgets },
    { name: 'Create Transaction', fn: testCreateTransaction },
    { name: 'Get Transactions', fn: testGetTransactions },
    { name: 'Create Goal', fn: testCreateGoal },
    { name: 'Get Goals', fn: testGetGoals },
    { name: 'Dashboard', fn: testDashboard },
    { name: 'User Profile', fn: testUserProfile },
    { name: 'Reports', fn: testReports }
  ];

  for (const test of tests) {
    totalTests++;
    log(`\n${totalTests}. Testing: ${test.name}`, 'cyan');
    
    try {
      const success = await test.fn();
      if (success) {
        passedTests++;
      }
    } catch (error) {
      logError(`Test failed with error: ${error.message}`);
    }
  }

  // Summary
  log('\n' + '='.repeat(50), 'bright');
  log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`, 'bright');
  
  if (passedTests === totalTests) {
    logSuccess('🎉 All tests passed! Your backend is working correctly.');
  } else {
    logWarning(`⚠️  ${totalTests - passedTests} tests failed. Check the errors above.`);
  }
  
  log('\n💡 Tips:', 'cyan');
  log('• Make sure your development server is running (npm run dev)');
  log('• Check that PostgreSQL is running and accessible');
  log('• Verify your .env.local configuration');
  log('• Check the console for detailed error messages');
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  logError('❌ This script requires Node.js 18+ for fetch support');
  logInfo('Please upgrade Node.js or use a polyfill');
  process.exit(1);
}

// Run tests
runTests().catch(error => {
  logError(`❌ Test runner failed: ${error.message}`);
  process.exit(1);
});
