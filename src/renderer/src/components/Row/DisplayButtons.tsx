import { InputData, OutputData } from '@shared/types'
import { Button, SxProps, Theme, Typography, useMediaQuery } from '@mui/material'
import IoIcon from '../IoIcon/IoIcon'

const DisplayButtons = ({
  data,
  variant,
  sxDesktop,
  sxMobile
}: {
  data: InputData | OutputData
  variant?: string
  sxDesktop?: SxProps<Theme> | undefined
  sxMobile?: SxProps<Theme> | undefined
}) => {
  const desktop = useMediaQuery('(min-width:980px)')
  const parts =
    typeof data?.data?.text === 'string'
      ? [data?.data?.text]
      : typeof data?.data?.text === 'object'
        ? data?.data?.text
        : []

  // console.log('yz2', parts)
  return desktop ? (
    <>
      <Button
        size="small"
        disabled
        variant="outlined"
        sx={{
          fontSize: 10,
          width: '130px',
          minWidth: '45px',
          justifyContent: 'flex-start',
          mr: 2,
          ...sxDesktop
        }}
      >
        <IoIcon name={data.icon} style={{ marginRight: '10px' }} />
        {desktop ? data.name : (data as OutputData).label || data.name || data.data.text}
      </Button>
      {(data.data.text || (data as OutputData).label) && parts.length > 1
        ? parts.map((part, index) =>
            variant === 'text' ? (
              <Typography
                key={index}
                noWrap
                variant="body2"
                title={data.data.text?.slice(-31) || 'No Profile Selected'}
                sx={{ ml: 1 }}
              >
                {part?.slice(-31) || 'Not Set'}
              </Typography>
            ) : (
              <span key={index} style={{ color: '#666' }}>
                <Button
                  size="small"
                  color="inherit"
                  variant="outlined"
                  sx={{
                    fontSize: 12,
                    textTransform: 'unset',
                    flexGrow: parts.length > 1 ? 0 : 1,
                    justifyContent: 'flex-start',
                    mr: 0,
                    ml: 1,
                    maxWidth: '210px',
                    whiteSpace: 'nowrap',
                    ...sxDesktop
                  }}
                >
                  {part?.slice(-31)}
                </Button>
              </span>
            )
          )
        : (data.data.text || (data as OutputData).label) &&
          (variant === 'text' ? (
            <Typography
              noWrap
              variant="body2"
              title={data.data.text?.slice(-31) || 'No Profile Selected'}
              sx={{ ml: 1 }}
            >
              {(data as OutputData).label || data.data.text?.slice(-31) || 'Not Set'}
            </Typography>
          ) : (
            <Button
              size="small"
              color="primary"
              variant="outlined"
              sx={{
                fontSize: 12,
                textTransform: 'unset',
                flexGrow: 1,
                justifyContent: 'flex-start',
                mr: 1,
                ml: 1,
                maxWidth: '210px',
                whiteSpace: 'nowrap',
                ...sxDesktop
              }}
            >
              {(data as OutputData).label || data.data.text?.slice(-31)}
            </Button>
          ))}
      {}
    </>
  ) : (
    <>
      <Button
        size="small"
        disabled
        variant="outlined"
        sx={{
          fontSize: 10,
          width: '100%',
          minWidth: '45px',
          justifyContent: 'flex-start',
          mr: 1,
          ...sxMobile
        }}
      >
        <IoIcon
          name={data.icon}
          style={{
            marginRight: data.data.text || data.data.value || data.label ? '10px' : 0
          }}
        />
        {(data as OutputData).label || data.data.text?.slice(-31) || data.data.value?.slice(-31)}
      </Button>
    </>
  )
}

export default DisplayButtons
