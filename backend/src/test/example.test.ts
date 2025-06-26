describe('Jest Setup', () => {
  it('should run basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should support async tests', async () => {
    const promise = Promise.resolve('test');
    await expect(promise).resolves.toBe('test');
  });

  it('should have access to environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});