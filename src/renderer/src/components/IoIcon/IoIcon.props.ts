export interface IoIconProps {
  /**
   * flag indicator
   */
  colorIndicator?: boolean
  /**
   * Icon is rendered in SceneList
   */
  scene?: boolean
  /**
   * Icon is rendered in SceneList
   */
  card?: boolean
  /**
   * examples: `wled`, `Light`, `mdi:led-strip`
   */
  name?: string
  /**
   * JSX className
   */
  className?: string
  /**
   * JSX style
   */
  style?: Record<string, unknown>
}

export const IoIconDefaultProps = {
  colorIndicator: false,
  name: '',
  className: '',
  style: {},
  scene: false,
  card: false
}
