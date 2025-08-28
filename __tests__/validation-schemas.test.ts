import { userSchemas, budgetSchemas, transactionSchemas, savingsGoalSchemas } from '@/lib/validation-schemas';

describe('Validation Schemas', () => {
  describe('User Schemas', () => {
    describe('create', () => {
      it('should validate valid user data', () => {
        const validUser = {
          email: 'test@example.com',
          name: 'John Doe',
          password: 'Password123!',
          dateOfBirth: '1990-01-01',
          monthlyIncome: 5000,
          currency: 'USD',
          language: 'en',
        };

        expect(() => userSchemas.create.parse(validUser)).not.toThrow();
      });

      it('should reject invalid email', () => {
        const invalidUser = {
          email: 'invalid-email',
          name: 'John Doe',
          password: 'password123',
        };

        expect(() => userSchemas.create.parse(invalidUser)).toThrow();
      });

      it('should reject weak password', () => {
        const invalidUser = {
          email: 'test@example.com',
          name: 'John Doe',
          password: '123',
        };

        expect(() => userSchemas.create.parse(invalidUser)).toThrow();
      });

      it('should reject invalid currency', () => {
        const invalidUser = {
          email: 'test@example.com',
          name: 'John Doe',
          password: 'password123',
          currency: 'INVALID',
        };

        expect(() => userSchemas.create.parse(invalidUser)).toThrow();
      });
    });

    describe('update', () => {
      it('should validate partial user data', () => {
        const partialUser = {
          name: 'Updated Name',
          monthlyIncome: 6000,
        };

        expect(() => userSchemas.update.parse(partialUser)).not.toThrow();
      });

      it('should reject negative monthly income', () => {
        const invalidUser = {
          monthlyIncome: -1000,
        };

        expect(() => userSchemas.update.parse(invalidUser)).toThrow();
      });
    });

    describe('changePassword', () => {
      it('should validate password change data', () => {
        const passwordChange = {
          currentPassword: 'oldpassword',
          newPassword: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
        };

        expect(() => userSchemas.changePassword.parse(passwordChange)).not.toThrow();
      });

      it('should reject mismatched passwords', () => {
        const passwordChange = {
          currentPassword: 'oldpassword',
          newPassword: 'newpassword123',
          confirmPassword: 'differentpassword',
        };

        expect(() => userSchemas.changePassword.parse(passwordChange)).toThrow();
      });
    });
  });

  describe('Budget Schemas', () => {
    describe('create', () => {
      it('should validate valid budget data', () => {
        const validBudget = {
          name: 'Monthly Budget',
          method: '50-30-20',
          totalIncome: 5000,
          period: 'monthly',
          startDate: '2023-01-01',
          endDate: '2023-01-31',
          categories: [
            {
              name: 'Housing',
              allocated: 1500,
              color: '#FF0000',
              icon: 'home',
              isEssential: true,
            },
          ],
        };

        expect(() => budgetSchemas.create.parse(validBudget)).not.toThrow();
      });

      it('should reject budget with end date before start date', () => {
        const invalidBudget = {
          name: 'Invalid Budget',
          method: '50-30-20',
          totalIncome: 5000,
          period: 'monthly',
          startDate: '2023-01-31',
          endDate: '2023-01-01',
          categories: [],
        };

        expect(() => budgetSchemas.create.parse(invalidBudget)).toThrow();
      });

      it('should accept budget data (allocation validation happens at service layer)', () => {
        const budgetData = {
          name: 'Budget Data',
          method: '50-30-20',
          totalIncome: 1000,
          period: 'monthly',
          startDate: '2023-01-01',
          endDate: '2023-01-31',
          categories: [
            {
              name: 'Housing',
              allocated: 800,
              color: '#FF0000',
            },
            {
              name: 'Food',
              allocated: 300,
              color: '#00FF00',
            },
          ],
        };

        // Schema validation passes - business logic validation happens in service
        expect(() => budgetSchemas.create.parse(budgetData)).not.toThrow();
      });

      it('should reject category with invalid color', () => {
        const invalidBudget = {
          name: 'Invalid Budget',
          method: '50-30-20',
          totalIncome: 1000,
          period: 'monthly',
          startDate: '2023-01-01',
          endDate: '2023-01-31',
          categories: [
            {
              name: 'Housing',
              allocated: 500,
              color: 'invalid-color',
            },
          ],
        };

        expect(() => budgetSchemas.create.parse(invalidBudget)).toThrow();
      });
    });
  });

  describe('Transaction Schemas', () => {
    describe('create', () => {
      it('should validate valid transaction data', () => {
        const validTransaction = {
          type: 'expense',
          amount: 50.00,
          category: 'Food',
          description: 'Lunch at restaurant',
          date: '2023-01-15',
          budgetCategoryId: '123e4567-e89b-12d3-a456-426614174000',
          account: 'Credit Card',
          tags: ['restaurant', 'lunch'],
          isRecurring: false,
        };

        expect(() => transactionSchemas.create.parse(validTransaction)).not.toThrow();
      });

      it('should reject zero amount', () => {
        const invalidTransaction = {
          type: 'expense',
          amount: 0,
          category: 'Food',
          description: 'Test transaction',
          date: '2023-01-15',
        };

        expect(() => transactionSchemas.create.parse(invalidTransaction)).toThrow();
      });

      it('should reject future date beyond allowed limit', () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 2); // 2 days in future

        const invalidTransaction = {
          type: 'expense',
          amount: 50,
          category: 'Food',
          description: 'Future transaction',
          date: futureDate.toISOString().split('T')[0],
        };

        expect(() => transactionSchemas.create.parse(invalidTransaction)).toThrow();
      });

      it('should reject invalid transaction type', () => {
        const invalidTransaction = {
          type: 'invalid_type',
          amount: 50,
          category: 'Food',
          description: 'Test transaction',
          date: '2023-01-15',
        };

        expect(() => transactionSchemas.create.parse(invalidTransaction)).toThrow();
      });
    });

    describe('filter', () => {
      it('should validate transaction filter data', () => {
        const validFilter = {
          page: 1,
          limit: 20,
          category: 'Food',
          type: 'expense',
          startDate: '2023-01-01',
          endDate: '2023-01-31',
          search: 'lunch',
          minAmount: 10,
          maxAmount: 100,
        };

        expect(() => transactionSchemas.filter.parse(validFilter)).not.toThrow();
      });

      it('should reject invalid page number', () => {
        const invalidFilter = {
          page: 0,
        };

        expect(() => transactionSchemas.filter.parse(invalidFilter)).toThrow();
      });

      it('should reject invalid limit', () => {
        const invalidFilter = {
          limit: 150, // Exceeds maximum
        };

        expect(() => transactionSchemas.filter.parse(invalidFilter)).toThrow();
      });

      it('should accept date range (validation happens at query level)', () => {
        const filterWithDates = {
          startDate: '2023-01-31',
          endDate: '2023-01-01', // End before start - this would be handled by database query
        };

        // Schema doesn't validate date range logic - that's handled at the query level
        expect(() => transactionSchemas.filter.parse(filterWithDates)).not.toThrow();
      });
    });
  });

  describe('Savings Goal Schemas', () => {
    describe('create', () => {
      it('should validate valid savings goal data', () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1); // 1 year in the future

        const validGoal = {
          name: 'Emergency Fund',
          description: '6 months of expenses',
          targetAmount: 10000,
          targetDate: futureDate.toISOString().split('T')[0],
          priority: 'high',
          category: 'emergency',
          icon: 'shield',
          color: '#FF0000',
          framingType: 'gain',
          lossAvoidanceDescription: 'Avoid debt',
          achievementDescription: 'Financial security',
        };

        expect(() => savingsGoalSchemas.create.parse(validGoal)).not.toThrow();
      });

      it('should reject past target date', () => {
        const invalidGoal = {
          name: 'Past Goal',
          targetAmount: 1000,
          targetDate: '2020-01-01', // Past date
          category: 'savings',
        };

        expect(() => savingsGoalSchemas.create.parse(invalidGoal)).toThrow();
      });

      it('should reject zero target amount', () => {
        const invalidGoal = {
          name: 'Zero Goal',
          targetAmount: 0,
          targetDate: '2024-01-01',
          category: 'savings',
        };

        expect(() => savingsGoalSchemas.create.parse(invalidGoal)).toThrow();
      });
    });
  });
});
