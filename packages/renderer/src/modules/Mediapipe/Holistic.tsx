import Shortkey from '@/modules/Keyboard/Shortkey'
import type { ModuleConfig, InputData, Row } from '@/store/mainStore'
import { camelToSnake } from '@/utils'
import { Button, Icon } from '@mui/material'
import { FC } from 'react'

type HolisticConfigExample = {}

export const id = 'holistic-module'

export const moduleConfig: ModuleConfig<HolisticConfigExample> = {
    menuLabel: 'A.I.',
    inputs: [
        {
            name: 'Holistic',
            icon: 'man2',
        },
    ],
    outputs: [],
    config: {
        enabled: false,
    },
}

export const InputEdit: FC<{
    input: InputData
    onChange: (data: Record<string, any>) => void
}> = ({ input, onChange }) => {
    return (
        <div style={{ textAlign: 'left', marginTop: '10px' }}>
            <Button variant='outlined'>
                {input?.data?.data?.value || ''}
            </Button>
        </div>
    )
}

export const InputDisplay: FC<{ input: InputData }> = ({ input }) => {
    console.log("HERE", input)
    return (
        <>
            {' '}
            <Icon>{camelToSnake(input.icon)}</Icon>
            <Shortkey
                value={input.data.data.value}
                trigger={() => {
                    console.log('SHORTKEY;')
                }}
            />
        </>
    )
}

export const useInputActions = (
    row: Row,
    // onChange: (data: Record<string, any>) => void
) => {

    console.log("Holistic", row)

}
