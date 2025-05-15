// src/renderer/src/modules/Dummy/Dummy.tsx
import type { ModuleConfig } from '@shared/types'
import type { FC } from 'react'
import { Button } from '@mui/material'

const ipcRenderer = window.electron?.ipcRenderer

export const id = 'dummy-module'

export const moduleConfig: ModuleConfig = {
  menuLabel: 'Testing',
  inputs: [{ name: 'Dummy Input', icon: 'bug_report' }],
  outputs: [],
  config: { enabled: true }
}

export const InputEdit: FC<any> = () => {
  const handlePingMain = () => {
    const response = ipcRenderer?.sendSync('dummy-ping', 'Hello from Dummy Renderer')
    console.log('Dummy Renderer received sync response:', response)
  }
  const handleAsyncPingMain = () => {
    ipcRenderer
      ?.invoke('dummy-async-ping', 'Async hello from Dummy Renderer')
      .then((response) => console.log('Dummy Renderer received async response:', response))
      .catch((err) => console.error('Dummy Renderer async error:', err))
  }

  return (
    <div>
      <Button onClick={handlePingMain} sx={{ mr: 1 }}>
        Ping Main (Sync)
      </Button>
      <Button onClick={handleAsyncPingMain}>Ping Main (Async/Invoke)</Button>
    </div>
  )
}

// No useInputActions, useGlobalActions needed for this simple test
