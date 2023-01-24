import { useEffect, useState } from 'react'
import Wrapper from '@/components/utils/Wrapper'
import type { Row } from '@/store/mainStore'
import { ClickAwayListener, Grid } from '@mui/material'
import DeckButton from '@/components/DeckButton'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { Rnd } from 'react-rnd'

const Deck = () => {
  const [data, setData] = useState({} as Record<string, Row>)
  const [showSettings, setShowSettings] = useState(false)
  const [disableDrag, setDisableDrag] = useState(false)
  useEffect(() => {
    const getRows = async () => {
      const res = await fetch('http://localhost:1337/rows')
      const out = await res.json()
      return out
    }
    getRows().then((d: Record<string, Row>) => {
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

      <ClickAwayListener onClickAway={() => setShowSettings(false)}>
        <Grid
          container
          spacing={1}
          padding={1}
          alignItems={'center'}
          justifyContent={'center'}
          sx={{
            'minHeight': 'calc(100vh - 200px)',
            'border': showSettings ? '2px dashed #9993' : '',
            '& .icon:nth-of-type(2n)': {
              animationDelay: '-.75s',
              animationDuration: '.25s',
              animationName: 'keyframes1',
              animationIterationCount: 'infinite',
              transformOrigin: '50% 10%',
            },
            '& .icon:nth-of-type(2n-1)': {
              animationDelay: '-.5s',
              animationDuration: '.3s',
              animationName: 'keyframes2',
              animationIterationCount: 'infinite',
              animationDirection: 'alternate',
              transformOrigin: '30% 5%',
            },
            '@keyframes keyframes1': {
              '0%': {
                transform: 'rotate(-1deg)',
                animationTimingFunction: 'ease-in',
              },
              '50%': {
                transform: 'rotate(1.5deg)',
                animationTimingFunction: 'ease-out',
              },
            },
            '@keyframes keyframes2': {
              '0%': {
                transform: 'rotate(1deg)',
                animationTimingFunction: 'ease-in',
              },
              '50%': {
                transform: 'rotate(-1.5deg)',
                animationTimingFunction: 'ease-out',
              },
            },
          }}
        >
          <>
            {Object.keys(data).length > 0 ? (
              Object.keys(data).map((rk, i) => (
                <Rnd
                  default={{
                    width: 120,
                    height: 120,
                    x: (i + 1) * 120,
                    y: 0,
                  }}
                  bounds={'parent'}
                  resizeGrid={[120, 120]}
                  dragGrid={[120, 120]}
                  disableDragging={!showSettings || disableDrag}
                  enableResizing={{
                    top: false,
                    right: false,
                    bottom: false,
                    left: false,
                    topRight: false,
                    bottomRight: true,
                    bottomLeft: false,
                    topLeft: false,
                  }}
                  key={rk}
                  style={{
                    padding: '10px',
                    border: showSettings ? '1px dashed #9999' : '',
                  }}
                >
                  <DeckButton
                    rowkey={rk}
                    data={data}
                    showSettings={showSettings}
                    setShowSettings={setShowSettings}
                    setDisableDrag={setDisableDrag}
                  />
                </Rnd>
              ))
            ) : (
              <div>
                What madness did setup the IO-Rows? Oh wait, maybe it was me and
                you
              </div>
            )}
          </>
        </Grid>
      </ClickAwayListener>
    </Wrapper>
  )
}

export default Deck
