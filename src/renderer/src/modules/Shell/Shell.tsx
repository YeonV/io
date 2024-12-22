import type { ModuleConfig, OutputData, Row } from '@/store/mainStore'
import type { FC } from 'react'
import { useEffect } from 'react'
import { log } from '@/utils'
import DisplayButtons from '@/components/Row/DisplayButtons'
import EditButtons from '@/components/Row/EditButtons'

const ipcRenderer = window.electron?.ipcRenderer || false

type ShellConfigExample = {}

export const id = 'shell-module'

export const moduleConfig: ModuleConfig<ShellConfigExample> = {
  menuLabel: 'Local',
  inputs: [],
  outputs: [
    {
      name: 'shell',
      icon: 'terminal'
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
  useEffect(() => {
    const listener = (e: any) => {
      if (e.detail === row.id) {
        log.success2('row output triggered', row, e.detail)
        ipcRenderer.sendSync('run-shell', row.output.data.command)
      }
    }
    ipcRenderer.on('run-shell-answer', (event: any, data: any) => {
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
