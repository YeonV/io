// src/main/sseManager.ts
import type { Request, Response } from 'express'

// Store connected SSE clients (Express Response objects)
const sseClients: Response[] = []

let sseInitialized = false

export function initializeSseEndpoint(app: any): void {
  // app is Express instance
  if (sseInitialized) {
    // sseLog.info("SSE endpoint already initialized.");
    console.log('Main (SSEManager): SSE endpoint already initialized.')
    return
  }

  app.get('/api/events', (req: Request, res: Response) => {
    // sseLog.info('New SSE client connected.');
    console.log('Main (SSEManager): New SSE client connected.')

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('Access-Control-Allow-Origin', '*') // Important for cross-origin Deck access
    res.flushHeaders() // Flush the headers to establish the connection

    // Send a simple connected message
    res.write('event: connected\ndata: {"message": "SSE connection established"}\n\n')

    sseClients.push(res)

    req.on('close', () => {
      const index = sseClients.indexOf(res)
      if (index !== -1) {
        sseClients.splice(index, 1)
        // sseLog.info('SSE client disconnected.');
        console.log('Main (SSEManager): SSE client disconnected.')
      }
      res.end() // Ensure response is ended
    })
  })

  sseInitialized = true
  // sseLog.info('SSE endpoint (/api/events) initialized.');
  console.log('Main (SSEManager): SSE endpoint (/api/events) initialized.')
}

export function broadcastSseUpdateSignal(updateType: string = 'genericStateUpdate'): void {
  if (sseClients.length === 0) return

  // sseLog.info(`Broadcasting SSE signal: '${updateType}' to ${sseClients.length} clients.`);
  console.log(
    `Main (SSEManager): Broadcasting SSE signal: '${updateType}' to ${sseClients.length} clients.`
  )
  const message = `event: io-state-updated\ndata: ${JSON.stringify({ type: updateType, timestamp: Date.now() })}\n\n`

  sseClients.forEach((client) => {
    try {
      client.write(message)
    } catch (error) {
      // sseLog.error('Error writing to SSE client, removing:', error);
      console.error('Main (SSEManager): Error writing to SSE client, removing:', error)
      const index = sseClients.indexOf(client)
      if (index !== -1) sseClients.splice(index, 1)
      client.end() // End response for broken client
    }
  })
}
