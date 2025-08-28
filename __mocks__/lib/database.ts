// Mock database module for tests
export const query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });

export const pool = {
  query: query,
  connect: jest.fn().mockResolvedValue({
    query: query,
    release: jest.fn(),
  }),
  end: jest.fn(),
  on: jest.fn(),
};

export const transaction = jest.fn().mockImplementation(async (callback) => {
  const client = {
    query: query,
    release: jest.fn(),
  };
  try {
    return await callback(client);
  } finally {
    client.release();
  }
});

export const getDatabaseHealth = jest.fn().mockResolvedValue({
  status: 'healthy',
  latency: 5,
  connections: {
    active: 2,
    idle: 18,
    total: 20,
    waiting: 0,
  },
});