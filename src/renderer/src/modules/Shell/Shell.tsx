import type { ModuleConfig, OutputData, Row } from '@shared/types'
import type { FC } from 'react'
import { useEffect } from 'react'
import { log } from '@/utils'
import DisplayButtons from '@/components/Row/DisplayButtons'
import EditButtons from '@/components/Row/EditButtons'
import { useRowActivation } from '@/hooks/useRowActivation'

const ipcRenderer = window.electron?.ipcRenderer || false

type ShellConfigExample = {}

export const id = 'shell-module'

export const moduleConfig: ModuleConfig<ShellConfigExample> = {
  menuLabel: 'Local',
  description: 'Run shell commands and scripts directly from the app.',
  inputs: [],
  outputs: [
    {
      name: 'shell',
      icon: 'terminal',
      editable: true
    }
  ],
  config: {
    enabled: !!ipcRenderer
  }
}

export const OutputDisplay: FC<{
  output: OutputData
}> = ({ output }) => {
  //   const updateRowInputValue = useMainStore(store.updateRowInputValue);
  return (
    <>
      <DisplayButtons data={output} />
    </>
  )
}

export const OutputEdit: FC<{
  output: OutputData
  onChange: (data: Record<string, any>) => void
}> = ({ output, onChange }) => {
  //   const updateRowInputValue = useMainStore(store.updateRowInputValue);
  return (
    <>
      <EditButtons data={output} onChange={onChange} />
    </>
  )
}

export const useOutputActions = (row: Row) => {
  const { isActive } = useRowActivation(row)

  useEffect(() => {
    if (!isActive) {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        log.info2(
          `Shell.tsx: Row ${row.output.name} became inactive, calling speechSynthesis.cancel()`
        )
        window.speechSynthesis.cancel()
      }
      return // Do not attach listener or perform actions if not active
    }
    const listener = (e: any) => {
      if (e.detail.rowId === row.id) {
        log.success2('row output triggered', row, e.detail)
        ipcRenderer.sendSync('run-shell', row.output.data.command)
      }
    }
    ipcRenderer.on('run-shell-answer', (_event: any, data: any) => {
      log.info2(JSON.stringify(data.result))
    })
    window.addEventListener('io_input', listener)
    return () => {
      ipcRenderer.removeAllListeners('run-shell-answer')
      window.removeEventListener('io_input', listener)
    }
  }, [row.output.data.command])
}

export const useGlobalActions = () => {
  log.info1('useGlobalActions:', 'shell')
}
