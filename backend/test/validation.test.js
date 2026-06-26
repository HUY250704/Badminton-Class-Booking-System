import request from 'supertest'
import app from '../src/app.js'
import { expect } from 'chai'

describe('API validation', () => {
  it('rejects invalid class level query', async () => {
    const res = await request(app).get('/api/classes?level=expert')

    expect(res.status).to.equal(400)
    expect(res.body).to.include({
      message: 'Invalid class level',
      code: 'VALIDATION_ERROR'
    })
    expect(res.body.fields).to.include('level')
  })

  it('rejects invalid class id params before querying MongoDB', async () => {
    const res = await request(app).get('/api/classes/not-a-valid-id')

    expect(res.status).to.equal(400)
    expect(res.body).to.include({
      message: 'Invalid class id',
      code: 'INVALID_OBJECT_ID'
    })
  })

  it('rejects invalid register input consistently', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'A', email: 'bad-email', password: '123' })

    expect(res.status).to.equal(400)
    expect(res.body).to.have.property('code', 'VALIDATION_ERROR')
    expect(res.body).to.have.property('fields')
  })
})
