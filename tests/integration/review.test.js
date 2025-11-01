const request = require('supertest');
const app = require('../../src/app');

describe('Review API', () => {
  describe('POST /api/review', () => {
    it('should trigger review with valid credentials', async () => {
      const response = await request(app)
        .post('/api/review')
        .send({
          projectId: 123,
          mrIid: 1,
        })
        .expect('Content-Type', /json/);

      // Assertions would go here
    });

    it('should reject invalid payload', async () => {
      const response = await request(app)
        .post('/api/review')
        .send({})
        .expect(400);
    });
  });
});
