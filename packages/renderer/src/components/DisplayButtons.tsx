import { InputData, OutputData } from '@/store/mainStore'
import { camelToSnake } from '@/utils'
import Button from '@mui/material/Button'
import Icon from '@mui/material/Icon/Icon'
import IoIcon from './IoIcon/IoIcon'

const DisplayButtons = ({ data }: { data: InputData | OutputData }) => {
  return (
    <>
      <Button
        size='small'
        disabled
        variant='outlined'
        sx={{
          fontSize: 10,
          width: '130px',
          justifyContent: 'flex-start',
          mr: 2,
        }}
      >
        <IoIcon name={data.icon} style={{ marginRight: '10px' }} />
        {data.name}
      </Button>
      {data.data.text && (
        <Button
          size='small'
          color='inherit'
          variant='outlined'
          sx={{
            fontSize: 12,
            textTransform: 'unset',
            flexGrow: 1,
            justifyContent: 'flex-start',
            mr: 2,
            maxWidth: '210px',
            whiteSpace: 'nowrap',
          }}
        >
          {/* {data.data.text} */}
          {data.data.text.slice(-31)}
        </Button>
      )}
    </>
  )
}

export default DisplayButtons
