import Shortkey from '@/modules/Keyboard/Shortkey'
import type { ModuleConfig, InputData, Row } from '@shared/types'
import { camelToSnake } from '@/utils'
import { Button, Icon } from '@mui/material'
import { FC } from 'react'

type ObjectronConfigExample = {}

export const id = 'mpobjectron-module'

export const moduleConfig: ModuleConfig<ObjectronConfigExample> = {
  menuLabel: 'A.I.',
  inputs: [
    {
      name: 'Objectron',
      icon: 'view_in_ar'
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
  if (typeof onChange === 'function') {
    console.log('onChange')
  }
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
      
      <Icon>{camelToSnake(input.icon)}</Icon>
      <Shortkey value={input.data.data.value} />
    </>
  )
}

export const useInputActions = (
  row: Row
  // onChange: (data: Record<string, any>) => void
) => {
  console.log('Objectron', row)
}
