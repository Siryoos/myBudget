import { UserService } from '@/lib/services/user-service';
import { userSchemas } from '@/lib/validation-schemas';
import { query } from '@/lib/database';

// Mock the database
jest.mock('@/lib/database', () => ({
  query: jest.fn(),
}));

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('UserService', () => {
  let userService: UserService;
  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    name: 'Test User',
    password_hash: '$2b$10$hashedpassword',
    currency: 'USD',
    language: 'en',
    monthly_income: 5000,
    risk_tolerance: 'moderate',
    savings_rate: 20,
    debt_to_income_ratio: 30,
    credit_score: 750,
    dependents: 2,
    created_at: new Date('2023-01-01T00:00:00Z'),
    updated_at: new Date('2023-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    userService = new UserService();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        name: 'New User',
        password: 'Password123!',
        dateOfBirth: '1990-01-01',
        monthlyIncome: 4000,
        currency: 'EUR' as const,
        language: 'de' as const,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockUser],
        rowCount: 1,
      });

      const result = await userService.create(userData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.any(Array)
      );
      expect(result.email).toBe(userData.email);
      expect(result.name).toBe(userData.name);
    });

    it('should throw error for duplicate email', async () => {
      const userData = {
        email: 'existing@example.com',
        name: 'Existing User',
        password: 'Password123!',
        dateOfBirth: '1990-01-01',
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockUser],
        rowCount: 1,
      });

      await expect(userService.create(userData)).rejects.toThrow('User with this email already exists');
    });

    it('should validate input data', async () => {
      const invalidUserData = {
        email: 'invalid-email',
        name: '',
        password: '123',
        dateOfBirth: '1990-01-01',
      };

      await expect(userService.create(invalidUserData)).rejects.toThrow();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [mockUser],
        rowCount: 1,
      });

      const result = await userService.findByEmail('test@example.com');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE lower(email) = lower($1)'),
        ['test@example.com']
      );
      expect(result?.email).toBe('test@example.com');
    });

    it('should return null for non-existent email', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const result = await userService.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [mockUser],
        rowCount: 1,
      });

      const result = await userService.findById(mockUser.id);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1',
        [mockUser.id]
      );
      expect(result?.id).toBe(mockUser.id);
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      const updateData = {
        name: 'Updated Name',
        monthlyIncome: 6000,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [{ ...mockUser, name: 'Updated Name', monthly_income: 6000 }],
        rowCount: 1,
      });

      const result = await userService.update(mockUser.id, updateData);

      expect(result.name).toBe('Updated Name');
      expect(result.monthlyIncome).toBe(6000);
    });

    it('should throw error for non-existent user', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await expect(userService.update('non-existent-id', { name: 'Test' })).rejects.toThrow('User not found');
    });
  });

  describe('authenticate', () => {
    it('should authenticate user with correct credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'correctpassword',
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockUser],
        rowCount: 1,
      });

      // Mock bcrypt.compare to return true
      const bcrypt = require('bcryptjs');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      const result = await userService.authenticate(loginData.email, loginData.password);

      expect(result?.email).toBe(loginData.email);
    });

    it('should return null for incorrect password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockUser],
        rowCount: 1,
      });

      // Mock bcrypt.compare to return false
      const bcrypt = require('bcryptjs');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      const result = await userService.authenticate(loginData.email, loginData.password);

      expect(result).toBeNull();
    });

    it('should return null for non-existent email', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const result = await userService.authenticate('nonexistent@example.com', 'password');

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [mockUser],
        rowCount: 1,
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: mockUser.id }],
        rowCount: 1,
      });

      const result = await userService.delete(mockUser.id);

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM users WHERE id = $1 RETURNING id',
        [mockUser.id]
      );
    });

    it('should throw error for non-existent user', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await expect(userService.delete('non-existent-id')).rejects.toThrow('User not found');
    });
  });
});
