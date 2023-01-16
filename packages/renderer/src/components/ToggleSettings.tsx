import { useStore } from "@/store/OLD/useStore"
import { Videocam, VideocamOff } from "@mui/icons-material"
import { ToggleButton, Typography } from "@mui/material"
import type { FC } from "react"

export type SettingsProps = {
    name: string
    textTurnOn?: string
    textTurnOff?: string
    iconTurnOn?: JSX.Element
    iconTurnOff?: JSX.Element
}

const ToggleSettings: FC<SettingsProps> = ({
    name = 'cam',
    textTurnOn = 'Turn On',
    textTurnOff = 'Turn Off',
    iconTurnOn = <Videocam />,
    iconTurnOff = <VideocamOff color='disabled' />
}: SettingsProps) => {
    const inputs = useStore((state) => state.inputs)
    const toggleInput = useStore((state) => state.toggleInput)
    return (
        <ToggleButton
            key={name}
            size='large'
            value="camera"
            sx={{ '& .MuiSvgIcon-root': { fontSize: 50 } }}
            selected={inputs[name as keyof typeof inputs]}
            onChange={
                () => toggleInput(name)
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 90, alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant='caption' color={'#999'} >
                    {name}
                </Typography>
                {inputs[name as keyof typeof inputs]
                    ? iconTurnOn
                    : iconTurnOff}
                <Typography variant='caption' color={'#999'}>
                    {inputs[name as keyof typeof inputs]
                        ? textTurnOn
                        : textTurnOff}
                </Typography>
            </div>
        </ToggleButton>
    )
}

export default ToggleSettings