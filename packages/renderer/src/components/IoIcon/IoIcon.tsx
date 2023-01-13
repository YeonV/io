import { Icon } from '@mui/material'
import Wled from './Wled'
import RazerMouse from './RzrMouse'
import RazerLogo from './RzrLogo'
import LedFxLogo from './LedFxLogo'
import {
  YZLogo2,
  YZLogo2Bottom,
  YZLogo2Top,
  YZLogo2Y,
  YZLogo2Z,
} from './YZ-Logo2'
import '../../assets/materialdesignicons.css'
import { IoIconDefaultProps, IoIconProps } from './IoIcon.props'
import HomeAssistantLogo from './HomeAssistant'
import { camelToSnake } from '@/utils'

/**
 * Icon component supporting 2 libraries
 *
 *  ### [mui](https://mui.com/components/material-icons/)
 *  syntax: `MusicNote`
 *
 *  ### [mdi](https://materialdesignicons.com/)
 *  syntax: `mdi:led-strip` (compatible with home-assistant)
 */
function IoIcon({
  colorIndicator = false,
  name = '',
  className = '',
  style,
}: IoIconProps): JSX.Element {
  return (
    <Icon
      className={className}
      color={colorIndicator ? 'primary' : 'inherit'}
      style={{ position: 'relative', ...style }}
    >
      {name.startsWith('yz:logo2y') ? (
        <YZLogo2Y
          style={{
            transform: 'scale(1)',
            marginTop: '3px',
          }}
        />
      ) : name.startsWith('yz:logo2z') ? (
        <YZLogo2Z
          style={{
            transform: 'scale(1)',
            marginTop: '3px',
          }}
        />
      ) : name.startsWith('yz:logo2top') ? (
        <YZLogo2Top
          style={{
            transform: 'scale(1)',
            marginTop: '3px',
          }}
        />
      ) : name.startsWith('yz:logo2bot') ? (
        <YZLogo2Bottom
          style={{
            transform: 'scale(1)',
            marginTop: '3px',
          }}
        />
      ) : name.startsWith('yz:logo2') ? (
        <YZLogo2
          style={{
            transform: 'scale(0.012)',
            marginTop: '3px',
          }}
        />
      ) : name.startsWith('wled') ? (
        <Wled />
      ) : name.startsWith('razer:mouse') ? (
        <RazerMouse />
      ) : name.startsWith('razer:logo') ? (
        <RazerLogo />
      ) : name.startsWith('homeAssistant') ? (
        <HomeAssistantLogo />
      ) : name.startsWith('ledfx') ? (
        <LedFxLogo />
      ) : name.startsWith('mdi:') ? (
        <span
          style={{ position: 'relative', display: 'flex' }}
          className={`mdi mdi-${name.split('mdi:')[1]}`}
        />
      ) : (
        name && camelToSnake(name)
      )}
      {/* {name.startsWith('yz:logo2y') ? (
        <YZLogo2Y
          style={{
            transform: 'scale(1)',
            marginTop: '3px',
          }}
        />
      ) : name.startsWith('yz:logo2z') ? (
        <YZLogo2Z
          style={{
            transform: 'scale(1)',
            marginTop: '3px',
          }}
        />
      ) : name.startsWith('yz:logo2top') ? (
        <YZLogo2Top
          style={{
            transform: 'scale(1)',
            marginTop: '3px',
          }}
        />
      ) : name.startsWith('yz:logo2bot') ? (
        <YZLogo2Bottom
          style={{
            transform: 'scale(1)',
            marginTop: '3px',
          }}
        />
      ) : name.startsWith('yz:logo2') ? (
        <YZLogo2
          style={{
            transform: 'scale(1)',
            marginTop: '3px',
          }}
        />
      ) : name.startsWith('wled') ? (
        <Wled />
      ) : name.startsWith('razer:mouse') ? (
        <RazerMouse />
      ) : name.startsWith('razer:logo') ? (
        <RazerLogo />
      ) : name.startsWith('mdi:') ? (
        <span
          style={{ position: 'relative', display: 'flex' }}
          className={`mdi mdi-${name.split('mdi:')[1]}`}
        />
      ) : (
        name && camelToSnake(name)
      )} */}
    </Icon>
  )
}

IoIcon.defaultProps = IoIconDefaultProps

export default IoIcon
