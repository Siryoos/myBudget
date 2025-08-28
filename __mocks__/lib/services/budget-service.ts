// Mock BudgetService for tests
export class BudgetService {
  constructor() {}

  async create(userId: string, data: any) {
    return {
      id: 'mock-budget-id',
      userId,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async findById(id: string) {
    if (id === 'non-existent') {
      return null;
    }
    return {
      id,
      userId: 'test-user-id',
      name: 'Test Budget',
      method: '50-30-20',
      totalIncome: 5000,
      period: 'monthly',
      startDate: '2023-01-01',
      endDate: '2023-12-31',
      categories: [],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async findByUserId(userId: string) {
    return [{
      id: 'budget-1',
      userId,
      name: 'Test Budget',
      method: '50-30-20',
      totalIncome: 5000,
      period: 'monthly',
      startDate: '2023-01-01',
      endDate: '2023-12-31',
      categories: [],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }];
  }

  async update(id: string, data: any) {
    const budget = await this.findById(id);
    if (!budget) {
      throw new Error('Budget not found');
    }
    return { ...budget, ...data, updatedAt: new Date().toISOString() };
  }

  async delete(id: string) {
    const budget = await this.findById(id);
    if (!budget) {
      throw new Error('Budget not found');
    }
    return true;
  }

  validateData(schema: any, data: any) {
    // Mock validation - just return the data
    return data;
  }
}