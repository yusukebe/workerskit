import { Hono } from 'hono/tiny'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello from workers-routes!')
})

export default app
