import { InputData, OutputData } from '@shared/types'
import { Button, Typography, useMediaQuery } from '@mui/material'
import IoIcon from '../IoIcon/IoIcon'

const DisplayButtons = ({ data, variant }: { data: InputData | OutputData; variant?: string }) => {
  const desktop = useMediaQuery('(min-width:980px)')
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
          mr: 2
        }}
      >
        <IoIcon name={data.icon} style={{ marginRight: '10px' }} />
        {desktop ? data.name : (data as OutputData).label || data.name || data.data.text}
      </Button>
      {(data.data.text || (data as OutputData).label) &&
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
              mr: 2,
              maxWidth: '210px',
              whiteSpace: 'nowrap'
            }}
          >
            {(data as OutputData).label || data.data.text?.slice(-31)}
          </Button>
        ))}
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
          mr: 1
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
