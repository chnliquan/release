import path from 'path'
import fs from 'fs-extra'
import os from 'os'
import conventionalChangelog from 'conventional-changelog'
import { logger } from './utils/logger'

const cwd = process.cwd()
const CHANGELOG = path.join(cwd, 'CHANGELOG.md')
const LATEST_LOG = path.join(cwd, 'LATESTLOG.md')

export async function generateChangelog(configPath: string, latest: boolean): Promise<string> {
  let hasError = false

  return new Promise((resolve, reject) => {
    const stream = conventionalChangelog({
      config: require(configPath),
    })

    let changelog = ''
    let latestLog = ''

    stream.on('data', chunk => {
      try {
        const data = chunk.toString()

        if (fs.existsSync(CHANGELOG)) {
          const remain = fs.readFileSync(CHANGELOG, 'utf8').trim()
          changelog = remain.length
            ? remain.replace(/# Change Log/, '# Change Log \n\n' + data)
            : '# Change Log \n\n' + data
        } else {
          changelog = '# Change Log \n\n' + data
        }

        fs.writeFileSync(CHANGELOG, changelog)

        if (!latest) {
          return
        }

        const lines = data.split(os.EOL)
        let firstIndex = -1

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]

          if (/^#{1,3}/.test(line)) {
            firstIndex = i
            break
          }
        }

        if (firstIndex > -1) {
          latestLog = data.replace(/##* \[([\d\.]+)\]/, '## [Changes]')

          fs.writeFileSync(LATEST_LOG, latestLog)
          logger.success(`LATESTLOG generated successfully`)
        }
      } catch (err) {
        hasError = true
        reject(err.stack)
      }
    })

    stream.on('error', err => {
      if (hasError) {
        return
      }

      hasError = true
      reject(err.stack)
    })

    stream.on('end', () => {
      if (hasError) {
        return
      }

      logger.success(`CHANGELOG generated successfully`)
      resolve(latestLog)
    })
  })
}
