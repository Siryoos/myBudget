import { BudgetService } from '@/lib/services/budget-service';
import { budgetSchemas } from '@/lib/validation-schemas';
import { query } from '@/lib/database';

// Mock the database
jest.mock('@/lib/database', () => ({
  query: jest.fn(),
}));

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('BudgetService', () => {
  let budgetService: BudgetService;
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockBudget = {
    id: '456e7890-e89b-12d3-a456-426614174001',
    user_id: mockUserId,
    name: 'Test Budget',
    method: '50-30-20',
    total_income: 5000,
    period: 'monthly',
    start_date: new Date('2023-01-01'),
    end_date: new Date('2023-01-31'),
    created_at: new Date('2023-01-01T00:00:00Z'),
    updated_at: new Date('2023-01-01T00:00:00Z'),
  };

  const mockCategory = {
    id: '789e0123-e89b-12d3-a456-426614174002',
    budget_id: mockBudget.id,
    name: 'Housing',
    allocated: 1500,
    spent: 1200,
    color: '#FF0000',
    icon: 'home',
    is_essential: true,
    created_at: new Date('2023-01-01T00:00:00Z'),
    updated_at: new Date('2023-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    budgetService = new BudgetService();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a budget with categories successfully', async () => {
      const budgetData = {
        name: 'Test Budget',
        method: '50-30-20' as const,
        totalIncome: 5000,
        period: 'monthly' as const,
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
          {
            name: 'Food',
            allocated: 800,
            color: '#00FF00',
            icon: 'utensils',
            isEssential: true,
          },
        ],
      };

      // Mock budget creation
      mockQuery.mockResolvedValueOnce({
        rows: [mockBudget],
        rowCount: 1,
      });

      // Mock category creation
      mockQuery.mockResolvedValueOnce({
        rows: [mockCategory],
        rowCount: 1,
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{ ...mockCategory, name: 'Food', id: '890e1234-e89b-12d3-a456-426614174003' }],
        rowCount: 1,
      });

      const result = await budgetService.create(mockUserId, budgetData);

      expect(result.name).toBe(budgetData.name);
      expect(result.totalIncome).toBe(budgetData.totalIncome);
      expect(result.categories).toHaveLength(2);
    });

    it('should throw error for duplicate budget name', async () => {
      const budgetData = {
        name: 'Existing Budget',
        method: '50-30-20' as const,
        totalIncome: 5000,
        period: 'monthly' as const,
        startDate: '2023-01-01',
        endDate: '2023-01-31',
        categories: [],
      };

      // Mock existing budget check
      mockQuery.mockResolvedValueOnce({
        rows: [mockBudget],
        rowCount: 1,
      });

      await expect(budgetService.create(mockUserId, budgetData)).rejects.toThrow('Budget with this name already exists');
    });

    it('should validate budget allocation does not exceed total income', async () => {
      const budgetData = {
        name: 'Test Budget',
        method: '50-30-20' as const,
        totalIncome: 1000,
        period: 'monthly' as const,
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

      // Mock budget creation
      mockQuery.mockResolvedValueOnce({
        rows: [mockBudget],
        rowCount: 1,
      });

      // Mock allocation validation failure
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: 1 }],
        rowCount: 1,
      });

      await expect(budgetService.create(mockUserId, budgetData)).rejects.toThrow('Total category allocation');
    });
  });

  describe('findByUserId', () => {
    it('should find budgets by user ID', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [mockBudget],
        rowCount: 1,
      });

      mockQuery.mockResolvedValueOnce({
        rows: [mockCategory],
        rowCount: 1,
      });

      const result = await budgetService.findByUserId(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe(mockBudget.name);
      expect(result[0].categories).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('should update budget successfully', async () => {
      const updateData = {
        name: 'Updated Budget Name',
        totalIncome: 6000,
      };

      // Mock existing budget check
      mockQuery.mockResolvedValueOnce({
        rows: [mockBudget],
        rowCount: 1,
      });

      mockQuery.mockResolvedValueOnce({
        rows: [mockCategory],
        rowCount: 1,
      });

      // Mock update
      mockQuery.mockResolvedValueOnce({
        rows: [{ ...mockBudget, name: 'Updated Budget Name', total_income: 6000 }],
        rowCount: 1,
      });

      const result = await budgetService.update(mockBudget.id, updateData);

      expect(result.name).toBe('Updated Budget Name');
      expect(result.totalIncome).toBe(6000);
    });

    it('should throw error for non-existent budget', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await expect(budgetService.update('non-existent-id', { name: 'Test' })).rejects.toThrow('Budget not found');
    });
  });

  describe('delete', () => {
    it('should delete budget successfully', async () => {
      // Mock existing budget check
      mockQuery.mockResolvedValueOnce({
        rows: [mockBudget],
        rowCount: 1,
      });

      mockQuery.mockResolvedValueOnce({
        rows: [mockCategory],
        rowCount: 1,
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: mockBudget.id }],
        rowCount: 1,
      });

      const result = await budgetService.delete(mockBudget.id);

      expect(result).toBe(true);
    });
  });

  describe('createCategory', () => {
    it('should create budget category successfully', async () => {
      const categoryData = {
        budgetId: mockBudget.id,
        name: 'Transportation',
        allocated: 400,
        color: '#0000FF',
        icon: 'car',
        isEssential: false,
      };

      // Mock budget existence check
      mockQuery.mockResolvedValueOnce({
        rows: [mockBudget],
        rowCount: 1,
      });

      // Mock duplicate name check
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      // Mock category creation
      mockQuery.mockResolvedValueOnce({
        rows: [mockCategory],
        rowCount: 1,
      });

      const result = await budgetService.createCategory(categoryData);

      expect(result.name).toBe(categoryData.name);
      expect(result.allocated).toBe(categoryData.allocated);
    });

    it('should throw error for non-existent budget', async () => {
      const categoryData = {
        budgetId: 'non-existent-budget-id',
        name: 'Test Category',
        allocated: 100,
        color: '#FF0000',
      };

      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await expect(budgetService.createCategory(categoryData)).rejects.toThrow('Budget not found');
    });

    it('should throw error for duplicate category name in budget', async () => {
      const categoryData = {
        budgetId: mockBudget.id,
        name: 'Existing Category',
        allocated: 100,
        color: '#FF0000',
      };

      // Mock budget existence
      mockQuery.mockResolvedValueOnce({
        rows: [mockBudget],
        rowCount: 1,
      });

      // Mock duplicate name check
      mockQuery.mockResolvedValueOnce({
        rows: [mockCategory],
        rowCount: 1,
      });

      await expect(budgetService.createCategory(categoryData)).rejects.toThrow('Category with this name already exists');
    });
  });
});
