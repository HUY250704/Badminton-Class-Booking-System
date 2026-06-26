import request from 'supertest'
import app from '../src/app.js'
import { expect } from 'chai'

describe('CORS', () => {
  const previousCorsOrigins = process.env.CORS_ORIGINS

  afterEach(() => {
    if (previousCorsOrigins === undefined) {
      delete process.env.CORS_ORIGINS
      return
    }

    process.env.CORS_ORIGINS = previousCorsOrigins
  })

  it('allows configured production frontend preflight requests', async () => {
    process.env.CORS_ORIGINS = 'https://badminton-class-booking-system.vercel.app'

    const res = await request(app)
      .options('/api/auth/login')
      .set('Origin', 'https://badminton-class-booking-system.vercel.app')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type,authorization')

    expect(res.status).to.equal(204)
    expect(res.headers['access-control-allow-origin']).to.equal('https://badminton-class-booking-system.vercel.app')
  })
})
