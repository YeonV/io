import { useEffect, useState } from 'react'
import Wrapper from '@/components/utils/Wrapper'
import type { Row } from '@/store/mainStore'
import { Button, Typography, Grid } from '@mui/material'
import IoIcon from '@/components/IoIcon/IoIcon'

const Deck = () => {
  const [data, setData] = useState({} as Record<string, Row>)

  useEffect(() => {
    const getRows = async () => {
      const res = await fetch('/rows')
      const out = await res.json()
      return out
    }
    getRows().then((d: Record<string, Row>) => {
      console.log(d)
      setData(d)
    })
    console.info(
      // eslint-disable-next-line no-useless-concat
      '%c   IO  ' + '%c\n ReactApp by Blade ',
      'padding: 10px 40px; color: #ffffff; border-radius: 5px 5px 0 0; background-color: #123456;',
      'background: #fff; color: #123456; border-radius: 0 0 5px 5px;padding: 5px 0;'
    )
  }, [])

  return (
    <Wrapper>
      <div></div>
      <Grid
        container
        spacing={1}
        padding={1}
        alignItems={'center'}
        justifyContent={'center'}
      >
        {Object.keys(data).length > 0
          ? Object.keys(data).map((rk) => (
              <Grid item key={rk}>
                <Button
                  variant='outlined'
                  onClick={async (e) => await fetch(`/rows?id=${rk}`)}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      width: 90,
                      height: 90,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IoIcon
                      name={data[rk].output.icon}
                      style={{ fontSize: 50 }}
                    />
                    <Typography variant='caption' color={'#999'}>
                      {data[rk].output.data.text}
                    </Typography>
                  </div>
                </Button>
              </Grid>
            ))
          : 'What madness did setup the IO-Rows? Oh wait, maybe it was me and you'}
      </Grid>
      {/* </div> */}
    </Wrapper>
  )
}

export default Deck
