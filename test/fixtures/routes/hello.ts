import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.text('hello'))
app.get('/:name', (c) => c.text(`hi ${c.req.param('name')}`))

export default app
