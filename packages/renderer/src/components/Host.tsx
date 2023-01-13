import { Button, CircularProgress, InputAdornment, TextField } from "@mui/material"
import IoIcon from "./IoIcon/IoIcon"
import { useEffect, useState } from "react"
import { fetchFast } from "@/utils"
import { PlayArrow, Sync } from "@mui/icons-material"

type Props = {
    path: string
    defaultHost?: string
    onChange: (data: Record<string, any>) => void
    msgConnected?: (config?: Record<string, any>) => string
    msgDisconnected?: (config?: Record<string, any>) => string
}

const Host = ({
    path,
    defaultHost = 'http://192.168.1.1',
    onChange,
    msgConnected = () => 'Connected',
    msgDisconnected = () => 'Disconnected',
}: Props) => {
    const [innerHost, setInnerHost] = useState(defaultHost)
    const [config, setConfig] = useState({} as any)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(undefined as true | false | undefined)

    useEffect(() => {
        console.log(config)
        onChange({
            host: innerHost,
            config,
        })
    }, [config, innerHost])

    return (
        <>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <div style={{ width: '100%', marginRight: '10px' }}>
                    <TextField
                        fullWidth
                        disabled={loading}
                        error={success !== undefined ? !success : false}
                        label='Host:Port'
                        value={innerHost}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position='end'>
                                    {loading ? (
                                        <CircularProgress size='1rem' />
                                    ) : success === true ? (
                                        <IoIcon name='check_circle_outlined' />
                                    ) : success === false ? (
                                        <IoIcon name='highlight_off' />
                                    ) : (
                                        <></>
                                    )}
                                </InputAdornment>
                            ),
                        }}
                        onBlur={async (e) => {
                            try {
                                setLoading(true)
                                // const res = await waitFor(2000, fetch(e.target.value + path))
                                const res = await fetchFast(e.target.value + path)
                                const resp = await (res as any).json()
                                if (resp) {
                                    setConfig(resp)
                                    setLoading(false)
                                    setSuccess(true)
                                }
                            } catch (error) {
                                console.error(e.target.value + ' not found!')
                                setLoading(false)
                                setSuccess(false)
                            }
                        }}
                        onChange={(e) => {
                            setSuccess(undefined)
                            onChange({ host: e.target.value })
                            setInnerHost(e.target.value)
                        }}
                        onKeyDown={async (e: any) => {
                            if (e.code === 'Enter') {
                                try {
                                    setLoading(true)
                                    const res = await fetchFast(e.target.value + path)
                                    const resp = await (res as any).json()
                                    if (resp) {
                                        setConfig(resp)
                                        setLoading(false)
                                        setSuccess(true)
                                    }
                                } catch (error) {
                                    console.error(e.target.value + ' not found!')
                                    setLoading(false)
                                    setSuccess(false)
                                }
                            }
                        }}
                        sx={{ mt: 2 }}
                        inputProps={{
                            style: {
                                paddingLeft: '20px',
                            },
                        }}
                        variant='outlined'
                    />
                </div>
                <Button
                    size='small'
                    color='secondary'
                    sx={{
                        alignSelf: 'stretch',
                        fontSize: 16,
                        marginTop: '1rem',
                        pl: 2,
                        pr: 2,
                    }}
                    onClick={async () => {
                        try {
                            setLoading(true)
                            const res = await fetchFast(innerHost + path)
                            const resp = await (res as any).json()
                            if (resp) {
                                setConfig(resp)
                                setLoading(false)
                                setSuccess(true)
                            }
                        } catch (error) {
                            console.error(innerHost + ' not found!')
                            setLoading(false)
                            setSuccess(false)
                        }
                    }}
                >
                    {success ? <Sync /> : <PlayArrow />}
                </Button>
            </div >
            {Object.keys(config).length > 0 && success !== undefined ? (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    <Button
                        size='small'
                        color='inherit'
                        variant='outlined'
                        disabled
                        sx={{
                            fontSize: 16,
                            textTransform: 'unset',
                            flexGrow: 1,
                            mt: 1,
                        }}
                    >
                        <span style={{ marginRight: '10px', display: 'flex' }}>
                            {loading ? (
                                <CircularProgress size='1rem' />
                            ) : success === true ? (
                                <IoIcon name='check_circle_outlined' />
                            ) : success === false ? (
                                <IoIcon name='highlight_off' />
                            ) : (
                                <></>
                            )}
                        </span>
                        {success
                            //   ? 'Got state from ' + output.data.config?.info?.name
                            ? msgConnected(config)
                            : msgDisconnected(config)}
                    </Button>
                </div>
            ) : (
                <></>
            )}
        </>
    )
}
export default Host