import { logger } from './utils'

export { release } from './release'
export { generateChangelog } from './changelog'
export * from './types'

export function step(message: string) {
  return logger.step(message)
}
