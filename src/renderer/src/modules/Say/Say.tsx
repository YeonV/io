import type { ModuleConfig, OutputData, Row  } from '@shared/types'
import type { FC } from 'react'
import { useEffect } from 'react'
import { log } from '@/utils'
import DisplayButtons from '@/components/Row/DisplayButtons'
import EditButtons from '@/components/Row/EditButtons'

// const ipcRenderer = window.electron?.ipcRenderer || false

type SayConfigExample = {}

export const id = 'say-module'

export const moduleConfig: ModuleConfig<SayConfigExample> = {
  menuLabel: 'Local',
  inputs: [],
  outputs: [
    {
      name: 'say',
      icon: 'record_voice_over'
    }
  ],
  config: {
    enabled: true
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
    <EditButtons data={output} onChange={onChange} title="Spoken Text" />
    // <TextField
    //   fullWidth
    //   value={output.data.text ?? ''}
    //   onChange={(e) => {
    //     onChange({ text: e.target.value })
    //   }}
    //   sx={{ mt: 2 }}
    //   inputProps={{
    //     style: {
    //       height: '50px',
    //       paddingLeft: '10px',
    //     },
    //   }}
    //   variant='standard'
    // />
  )
}

export const useOutputActions = (row: Row) => {
  useEffect(() => {
    const listener = (e: any) => {
      log.success2('row output triggered', row, e.detail)
      if (e.detail === row.id) {
        const spk = new SpeechSynthesisUtterance()
        spk.text = row.output.data.command || row.output.data.text
        window.speechSynthesis.speak(spk)
      }
    }
    window.addEventListener('io_input', listener)
    return () => {
      window.removeEventListener('io_input', listener)
    }
  }, [row.output.data.text])
}

export const useGlobalActions = () => {
  log.info1('useGlobalActions:', 'say')
}
