import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

const isWebBuild = process.env.BUILD_TARGET === 'web'
// const isGhPagesBuild = process.env.GHPAGES === 'TRUE'

export default defineConfig({
  main: isWebBuild
    ? undefined
    : {
        plugins: [externalizeDepsPlugin()]
      },
  preload: isWebBuild
    ? undefined
    : {
        plugins: [externalizeDepsPlugin()]
      },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer/src'),
        '@shared': resolve('src/shared')
      }
    },
    plugins: [react()],
    server: {
      host: '0.0.0.0', // Listen on all available network interfaces
      port: 5173 // Your Vite dev port
    }
  }
})
