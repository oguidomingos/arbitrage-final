describe('Example Tests', () => {
  const mockExecuteArbitrageFunction = jest.fn();
  const mockWaitFunction = jest.fn();
  const mockTx = {
    hash: '0xMockTransactionHash',
    wait: mockWaitFunction
  };

  beforeEach(() => {
    jest.useFakeTimers();
    mockExecuteArbitrageFunction.mockClear();
    mockWaitFunction.mockClear();
    mockExecuteArbitrageFunction.mockResolvedValue(mockTx);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should handle transaction failure correctly', async () => {
    const error = new Error('Transaction failed');
    mockExecuteArbitrageFunction.mockImplementationOnce(() => Promise.reject(error));

    const promise = someFunction();
    await expect(promise).rejects.toThrowError('Transaction failed');
  });

  it('should handle timeout correctly', async () => {
    const timeoutError = new Error('Transaction timeout');
    mockWaitFunction.mockImplementationOnce(() =>
      new Promise((_, reject) => {
        setTimeout(() => reject(timeoutError), 10);
      })
    );

    mockExecuteArbitrageFunction.mockResolvedValueOnce({
      ...mockTx,
      wait: mockWaitFunction
    });

    const promise = someFunction();
    await jest.runAllTimersAsync();
    await expect(promise).rejects.toThrowError('Transaction timeout');
  }, 1000);
});