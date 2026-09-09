import { handle } from 'hono/vercel'
import { Hono } from 'hono'
import apiApp from '@/lib/jiosaavn-api/src/server'

const app = new Hono()

app.all('*', (c) => {
  const url = new URL(c.req.url)
  url.pathname = url.pathname.replace('/api/saavn/', '/api/').replace('/api/saavn', '/api')
  return apiApp.fetch(new Request(url.toString(), c.req.raw))
})

export const GET = handle(app)
export const POST = handle(app)
