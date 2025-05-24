// src/renderer/src/modules/REST/REST.main.ts
import { ipcMain } from 'electron'
import type { IOMainModulePart } from '../../../../shared/types'
import { MainModuleDeps } from '../../../../main/moduleLoader'
import { RestRequestArgs } from './Rest.types'

const REST_MODULE_ID = 'rest-module'

const restMainModule: IOMainModulePart = {
  moduleId: REST_MODULE_ID,

  initialize: (deps: MainModuleDeps) => {
    const { ipcMain } = deps
    console.log(`Main (${REST_MODULE_ID}): Initializing IPC handler for 'rest-request'.`)

    ipcMain.handle('rest-request', async (_event, args: RestRequestArgs) => {
      const { url, method = 'GET', headers, body } = args

      if (!url) {
        console.error(`Main (${REST_MODULE_ID}): 'rest-request' called without URL.`)
        return { success: false, error: 'URL is required for REST request.' }
      }

      console.log(
        `Main (${REST_MODULE_ID}): Received 'rest-request' for URL: ${url}, Method: ${method}`
      )
      // console.debug(`Main (${REST_MODULE_ID}): Headers:`, headers);
      // console.debug(`Main (${REST_MODULE_ID}): Body:`, body);

      const fetchOptions: RequestInit = {
        method: method.toUpperCase(),
        headers: headers || {}
      }

      if (body && ['POST', 'PUT', 'PATCH'].includes(fetchOptions.method!)) {
        fetchOptions.body = body
        // Content-Type should ideally be set in the renderer or RestEditor.
        // If it's commonly JSON and not set, we could default it here, but better if explicit.
        // if (!fetchOptions.headers['Content-Type'] && body.startsWith('{') && body.endsWith('}')) {
        //     fetchOptions.headers['Content-Type'] = 'application/json';
        // }
      }

      try {
        console.log(`Main (${REST_MODULE_ID}): Executing fetch to ${url}`, fetchOptions)
        const response = await fetch(url, fetchOptions)
        const responseBodyText = await response.text() // Get body as text first

        let responseBody: any = responseBodyText
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          try {
            responseBody = JSON.parse(responseBodyText)
          } catch (e) {
            console.warn(
              `Main (${REST_MODULE_ID}): Failed to parse JSON response from ${url}, returning as text. Error:`,
              e
            )
            // Keep responseBody as text
          }
        }

        console.log(
          `Main (${REST_MODULE_ID}): Fetch to ${url} completed. Status: ${response.status}`
        )
        return {
          success: response.ok,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()), // Convert Headers object to plain object
          body: responseBody
        }
      } catch (error: any) {
        console.error(
          `Main (${REST_MODULE_ID}): Fetch to ${url} failed:`,
          error.message,
          error.cause || error
        )
        return {
          success: false,
          error: error.message || 'Unknown fetch error',
          details: error.cause || error.toString()
        }
      }
    })
  },

  cleanup: () => {
    console.log(`Main (${REST_MODULE_ID}): Cleaning up 'rest-request' IPC handler.`)
    ipcMain.removeHandler('rest-request')
  }
}

export default restMainModule
