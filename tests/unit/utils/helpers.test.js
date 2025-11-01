const { retry, truncate, chunk } = require('../../../src/utils/helpers');

describe('Helpers', () => {
  describe('retry', () => {
    it('should retry function on failure', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts += 1;
        if (attempts < 3) throw new Error('Fail');
        return 'success';
      };

      const result = await retry(fn, 3);
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });
  });

  describe('truncate', () => {
    it('should truncate long strings', () => {
      const long = 'a'.repeat(200);
      const result = truncate(long, 100);
      expect(result.length).toBe(103); // 100 + '...'
    });
  });

  describe('chunk', () => {
    it('should split array into chunks', () => {
      const arr = [1, 2, 3, 4, 5, 6];
      const chunks = chunk(arr, 2);
      expect(chunks).toEqual([[1, 2], [3, 4], [5, 6]]);
    });
  });
});
