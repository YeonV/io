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
  return (
    <>
      <DisplayButtons data={output} variant="text" />
    </>
  )
}

export const OutputEdit: FC<{
  output: OutputData
  onChange: (data: Record<string, any>) => void
}> = ({ output, onChange }) => {
  return <EditButtons data={output} onChange={onChange} title="Spoken Text" />
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

    log.info2(
      `Say.tsx: Attaching 'io_input' listener for row ${rowId} (Text: "${textFromOutputData}")`
    )

    const listener = (event: CustomEvent) => {
      const eventDetail = event.detail
      let triggerRowId: string | undefined
      // let receivedPayload: any = undefined

      if (typeof eventDetail === 'string') {
        triggerRowId = eventDetail
      } else if (
        typeof eventDetail === 'object' &&
        eventDetail !== null &&
        Object.prototype.hasOwnProperty.call(eventDetail, 'rowId')
      ) {
        triggerRowId = eventDetail.rowId
        // receivedPayload = eventDetail.payload
      } else {
        return
      }

      if (triggerRowId === rowId) {
        log.success(`Say.tsx: Action for row ${rowId} TRIGGERED! Detail:`, eventDetail)
        window.speechSynthesis.cancel()

        const textToSpeak = textFromOutputData || 'Error: No text configured'

        log.info(`Say.tsx: Row ${rowId} speaking: "${textToSpeak}"`)
        const utterance = new SpeechSynthesisUtterance(textToSpeak)
        window.speechSynthesis.speak(utterance)
      }
    }

    window.addEventListener('io_input', listener as EventListener)

    return () => {
      log.info2(`Say.tsx: Removing 'io_input' listener for row ${rowId}. Also cancelling speech.`)
      window.removeEventListener('io_input', listener as EventListener)
      window.speechSynthesis.cancel()
    }
  }, [rowId, textFromOutputData, rowEnabled])
}

export const useGlobalActions = () => {
  log.info1('useGlobalActions:', 'say')
}
