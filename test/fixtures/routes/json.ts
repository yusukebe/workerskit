import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.json({ ok: true }))

export default app
