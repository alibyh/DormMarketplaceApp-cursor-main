export default {
  addEventListener: jest.fn(),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  getConnectionInfo: jest.fn(() => Promise.resolve({ isConnected: true }))
};