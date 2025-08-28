// Mock auth module for tests
export const requireAuth = jest.fn((handler) => handler);

export const hashPassword = jest.fn().mockResolvedValue('hashed-password');

export const comparePassword = jest.fn().mockResolvedValue(true);

export const generateToken = jest.fn().mockReturnValue('mock-jwt-token');

export const verifyToken = jest.fn().mockReturnValue({
  userId: 'test-user-id',
  email: 'test@example.com',
});

export const generateRefreshToken = jest.fn().mockReturnValue('mock-refresh-token');

export const verifyRefreshToken = jest.fn().mockReturnValue({
  userId: 'test-user-id',
});