// Load Test Processor for SmartSave
// This script provides custom logic for load testing scenarios

const faker = require('faker');
const crypto = require('crypto');

// Store for maintaining state across requests
const testState = {
  users: new Map(),
  budgets: new Map(),
  goals: new Map(),
  transactions: new Map(),
};

// Generate random test data
function generateTestUser() {
  return {
    email: faker.internet.email(),
    name: faker.name.findName(),
    password: 'Password123!',
    dateOfBirth: faker.date.past(30, '2000-01-01').toISOString().split('T')[0],
    monthlyIncome: faker.datatype.number({ min: 3000, max: 15000 }),
    currency: faker.random.arrayElement(['USD', 'EUR', 'GBP', 'CAD']),
    language: faker.random.arrayElement(['en', 'es', 'fr', 'de']),
  };
}

function generateTestBudget() {
  const totalIncome = faker.datatype.number({ min: 3000, max: 10000 });
  const categories = [
    {
      name: 'Housing',
      allocated: Math.floor(totalIncome * 0.3),
      color: '#FF0000',
      icon: 'home',
      isEssential: true,
    },
    {
      name: 'Food',
      allocated: Math.floor(totalIncome * 0.15),
      color: '#00FF00',
      icon: 'utensils',
      isEssential: true,
    },
    {
      name: 'Transportation',
      allocated: Math.floor(totalIncome * 0.12),
      color: '#0000FF',
      icon: 'car',
      isEssential: true,
    },
    {
      name: 'Entertainment',
      allocated: Math.floor(totalIncome * 0.08),
      color: '#FF00FF',
      icon: 'film',
      isEssential: false,
    },
  ];

  return {
    name: faker.company.companyName() + ' Budget',
    method: faker.random.arrayElement(['50-30-20', 'pay-yourself-first', 'envelope']),
    totalIncome,
    period: 'monthly',
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    categories,
  };
}

function generateTestTransaction(budgetCategoryId) {
  return {
    type: faker.random.arrayElement(['income', 'expense']),
    amount: faker.datatype.number({ min: 10, max: 1000 }),
    category: faker.random.arrayElement(['Food', 'Transportation', 'Entertainment', 'Shopping', 'Bills']),
    description: faker.lorem.sentence(),
    date: faker.date.recent(30).toISOString().split('T')[0],
    budgetCategoryId: budgetCategoryId || '123e4567-e89b-12d3-a456-426614174000',
    account: faker.random.arrayElement(['Checking', 'Savings', 'Credit Card']),
    tags: faker.random.words(2).split(' '),
    isRecurring: faker.datatype.boolean(),
  };
}

function generateTestGoal() {
  return {
    name: faker.company.catchPhrase(),
    description: faker.lorem.paragraph(),
    targetAmount: faker.datatype.number({ min: 1000, max: 50000 }),
    targetDate: faker.date.future(1).toISOString().split('T')[0],
    category: faker.random.arrayElement(['emergency', 'vacation', 'home', 'car', 'education']),
    priority: faker.random.arrayElement(['low', 'medium', 'high']),
    icon: faker.random.arrayElement(['🎯', '💰', '🏠', '🚗', '📚']),
    color: faker.internet.color(),
  };
}

// Custom functions for Artillery
module.exports = {
  // Generate unique user data
  generateUser: function(context, events, done) {
    const userId = crypto.randomUUID();
    const userData = generateTestUser();

    testState.users.set(userId, userData);

    context.vars.userId = userId;
    context.vars.userData = userData;

    return done();
  },

  // Generate budget data
  generateBudget: function(context, events, done) {
    const budgetData = generateTestBudget();
    context.vars.budgetData = budgetData;
    return done();
  },

  // Generate transaction data
  generateTransaction: function(context, events, done) {
    const transactionData = generateTestTransaction(context.vars.budgetCategoryId);
    context.vars.transactionData = transactionData;
    return done();
  },

  // Generate goal data
  generateGoal: function(context, events, done) {
    const goalData = generateTestGoal();
    context.vars.goalData = goalData;
    return done();
  },

  // Store response data for later use
  storeResponse: function(requestParams, response, context, ee, next) {
    if (response.statusCode === 200 || response.statusCode === 201) {
      try {
        const responseData = JSON.parse(response.body);

        // Store IDs for subsequent requests
        if (responseData.data) {
          if (responseData.data.id) {
            context.vars.lastCreatedId = responseData.data.id;
          }
          if (responseData.data.user && responseData.data.user.id) {
            context.vars.userId = responseData.data.user.id;
          }
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    return next();
  },

  // Custom validation function
  validateResponse: function(requestParams, response, context, ee, next) {
    const errors = [];

    // Check response time
    if (response.timings.phases.total > 5000) {
      errors.push(`Slow response: ${response.timings.phases.total}ms`);
    }

    // Check status codes
    if (response.statusCode >= 400) {
      errors.push(`HTTP ${response.statusCode}: ${response.body}`);
    }

    // Log errors if any
    if (errors.length > 0) {
      ee.emit('error', errors.join('; '));
    }

    return next();
  },

  // Setup function - called once at the start
  setup: function(requestParams, context, ee, next) {
    // Initialize any global test state
    context.vars.testStartTime = Date.now();
    context.vars.requestCount = 0;

    return next();
  },

  // Teardown function - called once at the end
  teardown: function(requestParams, context, ee, next) {
    const duration = Date.now() - context.vars.testStartTime;
    const rps = context.vars.requestCount / (duration / 1000);

    console.log(`\nLoad Test Summary:`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Requests: ${context.vars.requestCount}`);
    console.log(`Requests/sec: ${rps.toFixed(2)}`);

    return next();
  },

  // Before request hook
  beforeRequest: function(requestParams, context, ee, next) {
    context.vars.requestCount = (context.vars.requestCount || 0) + 1;

    // Add custom headers
    requestParams.headers = requestParams.headers || {};
    requestParams.headers['X-Load-Test'] = 'true';
    requestParams.headers['X-Request-ID'] = crypto.randomUUID();

    return next();
  },

  // After response hook
  afterResponse: function(requestParams, response, context, ee, next) {
    // Custom response processing
    if (response.statusCode >= 200 && response.statusCode < 300) {
      ee.emit('counter', 'successful_requests', 1);
    } else {
      ee.emit('counter', 'failed_requests', 1);
    }

    return next();
  },
};
