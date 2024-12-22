import { InputData, OutputData } from '@/store/mainStore'
import { Button, useMediaQuery } from '@mui/material'
import IoIcon from '../IoIcon/IoIcon'

const DisplayButtons = ({ data }: { data: InputData | OutputData }) => {
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
        {desktop && data.name}
      </Button>
      {data.data.text && (
        <Button
          size="small"
          color="inherit"
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
          {data.data.text?.slice(-31)}
        </Button>
      )}
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
            marginRight: data.data.text || data.data.value ? '10px' : 0
          }}
        />
        {data.data.text?.slice(-31) || data.data.value?.slice(-31)}
      </Button>
    </>
  )
}

export default DisplayButtons
