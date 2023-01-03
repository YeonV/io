export interface IconProps {
  /**
   * flag indicator
   */
  colorIndicator?: boolean;
  /**
   * examples: `wled`, `Light`, `mdi:led-strip`
   */
  name?: string;
  /**
   * JSX className
   */
  className?: string;
  /**
   * JSX style
   */
  style?: Record<string, unknown>;
}

export const IconDefaultProps = {
  colorIndicator: false,
  name: 'MusicNote',
  className: '',
  style: {},
};
