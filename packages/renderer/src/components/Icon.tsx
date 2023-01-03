import { Icon as MIcon } from '@mui/material';
import { IconDefaultProps, IconProps } from './Icon.interface';
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
function Icon({
  colorIndicator = false,
  name = 'MusicNote',
  className = '',
  style,
}: IconProps): JSX.Element {
  return (
    <MIcon
      className={className}
      color={colorIndicator ? 'primary' : 'inherit'}
      style={style}
    >
      {name}
    </MIcon>
  );
}

Icon.defaultProps = IconDefaultProps;

export default Icon;
