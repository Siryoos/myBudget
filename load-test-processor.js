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

/**
 * Generate a realistic test user payload for load tests.
 *
 * @return {{email: string, name: string, password: string, dateOfBirth: string, monthlyIncome: number, currency: string, language: string}}
 * An object containing:
 * - `email`: synthetic email address
 * - `name`: synthetic full name
 * - `password`: fixed test password (`Password123!`)
 * - `dateOfBirth`: ISO date string (YYYY-MM-DD)
 * - `monthlyIncome`: integer monthly income between 3000 and 15000
 * - `currency`: currency code (one of 'USD', 'EUR', 'GBP', 'CAD')
 * - `language`: language code (one of 'en', 'es', 'fr', 'de')
 */
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

/**
 * Generate a realistic test budget payload with predefined categories and allocations.
 *
 * Returns a budget object suitable for use in load tests: it contains a generated
 * name, a randomly selected budgeting method, a monthly totalIncome, a fixed
 * monthly period with start/end dates, and an array of category objects (Housing,
 * Food, Transportation, Entertainment) each including allocation, color, icon,
 * and an isEssential flag.
 *
 * @return {{name: string, method: string, totalIncome: number, period: string, startDate: string, endDate: string, categories: Array<{name: string, allocated: number, color: string, icon: string, isEssential: boolean}>}} The generated budget payload.
 */
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

/**
 * Create a synthetic transaction object for tests.
 *
 * @param {string} [budgetCategoryId] - Optional budget category UUID to assign; defaults to a fixed test UUID when omitted.
 * @return {{type:('income'|'expense'), amount:number, category:string, description:string, date:string, budgetCategoryId:string, account:string, tags:string[], isRecurring:boolean}} A transaction payload with realistic test values (date in `YYYY-MM-DD` format).
 */
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

/**
 * Generate a realistic synthetic financial goal object for testing.
 *
 * The returned object represents a user goal with metadata useful for load or integration tests.
 *
 * @return {{name: string, description: string, targetAmount: number, targetDate: string, category: string, priority: string, icon: string, color: string}}
 *   Object properties:
 *   - name: Human-readable goal title.
 *   - description: Longer textual description.
 *   - targetAmount: Numeric target amount in the account's currency.
 *   - targetDate: ISO date string (YYYY-MM-DD) by which the goal should be reached.
 *   - category: One of 'emergency', 'vacation', 'home', 'car', 'education'.
 *   - priority: One of 'low', 'medium', 'high'.
 *   - icon: Short emoji representing the goal.
 *   - color: Hex or named color string for UI display.
 */
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
