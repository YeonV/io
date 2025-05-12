import Shortkey from '@/modules/Keyboard/Shortkey'
import type { ModuleConfig, InputData, Row } from '@shared/types'
import { camelToSnake } from '@/utils'
import { Button, Icon } from '@mui/material'
import { FC } from 'react'

type FaceDetectConfigExample = {}

export const id = 'facedetect-module'

export const moduleConfig: ModuleConfig<FaceDetectConfigExample> = {
  menuLabel: 'A.I.',
  inputs: [
    {
      name: 'Face Detect',
      icon: 'person_search'
    }
  ],
  outputs: [],
  config: {
    enabled: false
  }
}

export const InputEdit: FC<{
  input: InputData
  onChange: (data: Record<string, any>) => void
}> = ({ input, onChange }) => {
  return (
    <div style={{ textAlign: 'left', marginTop: '10px' }}>
      <Button variant="outlined">{input?.data?.data?.value || ''}</Button>
    </div>
  )
}

export const InputDisplay: FC<{ input: InputData }> = ({ input }) => {
  // console.log("HERE", input)
  return (
    <>
      {' '}
      <Icon>{camelToSnake(input.icon)}</Icon>
      <Shortkey value={input.data.data.value} />
    </>
  )
}

export const useInputActions = (
  _row: Row
  // onChange: (data: Record<string, any>) => void
) => {
  // console.log("FaceDetect", row)
}
