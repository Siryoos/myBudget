// Mock UserService for tests
export class UserService {
  constructor() {}

  async create(data: any) {
    return {
      id: 'mock-user-id',
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
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async findByEmail(email: string) {
    if (email === 'existing@example.com') {
      return {
        id: 'existing-user-id',
        email,
        name: 'Existing User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    return null;
  }

  async update(id: string, data: any) {
    const user = await this.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return { ...user, ...data, updatedAt: new Date().toISOString() };
  }

  async updatePassword(id: string, newPassword: string) {
    const user = await this.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return true;
  }

  async delete(id: string) {
    const user = await this.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return true;
  }

  validateData(schema: any, data: any) {
    // Mock validation - just return the data
    return data;
  }
}