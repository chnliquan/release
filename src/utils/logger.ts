import chalk from 'chalk'
import signale from 'signale'

export class Logger {
  info(...args: string[]): void {
    signale.info(...args)
  }

  success(...args: string[]): void {
    signale.success(...args)
  }

  warn(...args: string[]): void {
    signale.warn(...args)
  }

  error(...args: string[]): void {
    signale.error(...args)
  }

  step(name: string): void {
    console.log(`${chalk.gray('>>> Release:')} ${chalk.magenta.bold(name)}`)
  }

  printErrorAndExit(message: string): void {
    this.error(message)
    process.exit(1)
  }

  scope(scope: string): signale.Signale {
    return signale.scope(scope)
  }
}

export const logger = new Logger()
