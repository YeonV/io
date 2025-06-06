import type { ModuleConfig, OutputData, Row } from '@shared/types'
import type { FC } from 'react'
import { useEffect } from 'react'
import { log } from '@/utils'
import DisplayButtons from '@/components/Row/DisplayButtons'
import EditButtons from '@/components/Row/EditButtons'
import { useRowActivation } from '@/hooks/useRowActivation'
type SayConfigExample = {}

export const id = 'say-module'

export const moduleConfig: ModuleConfig<SayConfigExample> = {
  menuLabel: 'Local',
  description: "Speak text using the browser's speech synthesis capabilities.",
  inputs: [],
  outputs: [
    {
      name: 'say',
      icon: 'record_voice_over',
      editable: true,
      supportedContexts: ['electron', 'web']
    }
  ],
  config: {
    enabled: true
  }
}

export const OutputDisplay: FC<{
  output: OutputData
}> = ({ output }) => {
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
  return <EditButtons data={output} onChange={onChange} title="Spoken Text" speak />
}

export const useOutputActions = (row: Row) => {
  const { id: rowId, output, enabled: rowEnabled } = row
  const textFromOutputData = output.data.text || output.data.command
  const { isActive } = useRowActivation(row)

  useEffect(() => {
    if (!isActive) {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        log.info2(
          `Say.tsx: Row ${row.output.name} became inactive, calling speechSynthesis.cancel()`
        )
        window.speechSynthesis.cancel()
      }
      return // Do not attach listener or perform actions if not active
    }

    // log.info2(
    //   `Say.tsx: Attaching 'io_input' listener for row ${rowId} (Text: "${textFromOutputData}")`
    // )

    const listener = (event: Event) => {
      const triggerRowId = event instanceof CustomEvent && event.detail.rowId
      if (triggerRowId !== rowId) {
        return
      }

      log.success(`Say.tsx: Action for row ${rowId} TRIGGERED! Detail:`, event)
      window.speechSynthesis.cancel()

      const textToSpeak = textFromOutputData || 'Error: No text configured'

      log.info(`Say.tsx: Row ${rowId} speaking: "${textToSpeak}"`)
      const utterance = new SpeechSynthesisUtterance(textToSpeak)
      window.speechSynthesis.speak(utterance)
    }

    window.addEventListener('io_input', listener)

    return () => {
      log.info2(`Say.tsx: Removing 'io_input' listener for row ${rowId}. Also cancelling speech.`)
      window.removeEventListener('io_input', listener)
      window.speechSynthesis.cancel()
    }
  }, [rowId, textFromOutputData, rowEnabled])
}

export const useGlobalActions = () => {
  // log.info1('useGlobalActions:', 'say')
}
