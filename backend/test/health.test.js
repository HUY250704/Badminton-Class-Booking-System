import request from 'supertest'
import app from '../src/app.js'
import { expect } from 'chai'

describe('GET /api/health', () => {
  it('returns status ok', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).to.equal(200)
    expect(res.body).to.have.property('status', 'ok')
  })
})
