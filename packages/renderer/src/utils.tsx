export const camelToSnake = (str: string) =>
  str[0].toLowerCase() +
  str
    .slice(1, str.length)
    .replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)

export const download = (
  content: any,
  fileName: string,
  contentType: string
) => {
  const a = document.createElement('a')
  const file = new Blob([JSON.stringify(content, null, 4)], {
    type: contentType,
  })
  a.href = URL.createObjectURL(file)
  a.download = fileName
  a.click()
}

export async function fetchFast(resource: any, options = {} as any) {
  const { timeout = 3000 } = options

  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  const response = await fetch(resource, {
    ...options,
    signal: controller.signal,
  })
  clearTimeout(id)
  return response
}
// export const log = (...props: any[]) => {
//   if (typeof props[0] === 'string') {
//     // eslint-disable-next-line no-console
//     console.log(
//       `%c ${props[0]
//         .replace('success', '')
//         .replace('warning', '')
//         .replace('info', '')} `,
//       `padding: 3px 5px; border-radius: 5px; background: #${
//         props[0].indexOf('success') !== -1
//           ? '1db954; color: #fff; font-weight: 700;'
//           : props[0].indexOf('info') !== -1
//           ? '0dbedc; color: #fff; font-weight: 700;'
//           : props[0].indexOf('warning') !== -1
//           ? 'FF7514; color: #fff; font-weight: 700;'
//           : typeof props[1] === 'string' && props[1].indexOf('#') === 0
//           ? props[1].replace('#', '') + '; color: #fff; font-weight: 700;'
//           : '800000; color: #fff;'
//       }`,
//       ...props.slice(2, props.length)
//     )
//   }
// }

export interface LogFn {
  (message?: any, ...optionalParams: any[]): void
}

/** Basic logger interface */
export interface Logger {
  log: LogFn
}
const randColor = () => {
  return (
    '#' +
    Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, '0')
      .toUpperCase()
  )
}
/** Logger which outputs to the browser console */
export class ConsoleLogger implements Logger {
  readonly log: LogFn
  readonly info: LogFn
  readonly info1: LogFn
  readonly info2: LogFn
  readonly info3: LogFn
  readonly success: LogFn
  readonly success1: LogFn
  readonly success2: LogFn
  readonly success3: LogFn

  constructor() {
    this.log = console.log.bind(
      console,
      '%c %s',
      `padding: 3px 5px; border-radius: 5px; background: ${randColor()};`
    )
    this.info = console.log.bind(
      console,
      '%c %s',
      `padding: 3px 5px; border-radius: 5px; background: #234567;`
    )
    this.info1 = console.log.bind(
      console,
      '%c %s',
      `padding: 3px 5px; border-radius: 5px; background: #012345;`
    )
    this.info2 = console.log.bind(
      console,
      '%c %s',
      `padding: 3px 5px; border-radius: 5px; background: #345678;`
    )
    this.info3 = console.log.bind(
      console,
      '%c %s',
      `padding: 3px 5px; border-radius: 5px; background: #456789;`
    )
    this.success = console.log.bind(
      console,
      '%c %s',
      `padding: 3px 5px; border-radius: 5px; background: #333d29;`
    )
    this.success1 = console.log.bind(
      console,
      '%c %s',
      `padding: 3px 5px; border-radius: 5px; background: #1e1e1e;`
    )
    this.success2 = console.log.bind(
      console,
      '%c %s',
      `padding: 3px 5px; border-radius: 5px; background: #5c6e49;`
    )
    this.success3 = console.log.bind(
      console,
      '%c %s',
      `padding: 3px 5px; border-radius: 5px; background: #70865a;`
    )
  }
}

/** Logger which outputs to the browser console
 * first string is used for label
 * available colors are `.log` `.info` `.info1` `.info2` `.info3`
 */
export const log = new ConsoleLogger()
