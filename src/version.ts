import fs from 'fs'
import inquirer from 'inquirer'
import chalk from 'chalk'
import semver from 'semver'
import { logger } from './utils/logger'
import { getDistTag, getReferenceVersion } from './utils/version'

const VERSION_MAJOR = 'Major'
const VERSION_MINOR = 'Minor'
const VERSION_PATCH = 'Patch'

const VERSION_PRE_RELEASE = 'Prerelease'
const VERSION_PRE_MAJOR = 'Premajor'
const VERSION_PRE_MINOR = 'Preminor'
const VERSION_PRE_PATCH = 'Prepatch'

export async function getTargetVersion(rootPkgPath: string, monorepo = false): Promise<string> {
  if (!rootPkgPath || !fs.existsSync(rootPkgPath)) {
    logger.printErrorAndExit(`package.json file ${rootPkgPath} is not exist.`)
  }

  const pkg = require(rootPkgPath)

  if (!pkg || !pkg.version) {
    logger.printErrorAndExit(`package.json file ${rootPkgPath} is not valid.`)
  }

  const localVersion = pkg.version
  let remoteLatestVersion: string | undefined
  let remoteAlphaVersion: string | undefined
  let remoteBetaVersion: string | undefined
  let remoteNextVersion: string | undefined

  if (!monorepo) {
    const distTag = await getDistTag(pkg.name)
    remoteLatestVersion = distTag.remoteLatestVersion
    remoteAlphaVersion = distTag.remoteAlphaVersion
    remoteBetaVersion = distTag.remoteBetaVersion
    remoteNextVersion = distTag.remoteNextVersion

    logger.info(`- Local version: ${chalk.cyanBright.bold(localVersion)}`)

    if (remoteLatestVersion) {
      logger.info(`- Remote latest version: ${chalk.cyanBright.bold(remoteLatestVersion)}`)
    }

    if (remoteAlphaVersion) {
      logger.info(`- Remote alpha version:  ${chalk.cyanBright.bold(remoteAlphaVersion)}`)
    }

    if (remoteBetaVersion) {
      logger.info(`- Remote beta version:   ${chalk.cyanBright.bold(remoteBetaVersion)}`)
    }

    if (remoteNextVersion) {
      logger.info(`- Remote next version:   ${chalk.cyanBright.bold(remoteNextVersion)}`)
    }

    console.log()
  }

  const latestReferenceVersion = getReferenceVersion(localVersion, remoteLatestVersion)
  const alphaReferenceVersion = getReferenceVersion(localVersion, remoteAlphaVersion)
  const betaReferenceVersion = getReferenceVersion(localVersion, remoteBetaVersion)
  const nextReferenceVersion = getReferenceVersion(localVersion, remoteNextVersion)

  const suggestions = {
    [VERSION_MAJOR]: semver.inc(
      latestReferenceVersion,
      VERSION_MAJOR.toLowerCase() as semver.ReleaseType
    ),
    [VERSION_MINOR]: semver.inc(
      latestReferenceVersion,
      VERSION_MINOR.toLowerCase() as semver.ReleaseType
    ),
    [VERSION_PATCH]: semver.inc(
      latestReferenceVersion,
      VERSION_PATCH.toLowerCase() as semver.ReleaseType
    ),
    Alpha: {
      [VERSION_PRE_MAJOR]: semver.inc(
        alphaReferenceVersion,
        VERSION_PRE_MAJOR.toLowerCase() as semver.ReleaseType,
        'alpha'
      ),
      [VERSION_PRE_MINOR]: semver.inc(
        alphaReferenceVersion,
        VERSION_PRE_MINOR.toLowerCase() as semver.ReleaseType,
        'alpha'
      ),
      [VERSION_PRE_PATCH]: semver.inc(
        alphaReferenceVersion,
        VERSION_PRE_PATCH.toLowerCase() as semver.ReleaseType,
        'alpha'
      ),
      [VERSION_PRE_RELEASE]: semver.inc(
        alphaReferenceVersion,
        VERSION_PRE_RELEASE.toLowerCase() as semver.ReleaseType,
        'alpha'
      ),
    },
    Beta: {
      [VERSION_PRE_MAJOR]: semver.inc(
        betaReferenceVersion,
        VERSION_PRE_MAJOR.toLowerCase() as semver.ReleaseType,
        'beta'
      ),
      [VERSION_PRE_MINOR]: semver.inc(
        betaReferenceVersion,
        VERSION_PRE_MINOR.toLowerCase() as semver.ReleaseType,
        'beta'
      ),
      [VERSION_PRE_PATCH]: semver.inc(
        betaReferenceVersion,
        VERSION_PRE_PATCH.toLowerCase() as semver.ReleaseType,
        'beta'
      ),
      [VERSION_PRE_RELEASE]: semver.inc(
        betaReferenceVersion,
        VERSION_PRE_RELEASE.toLowerCase() as semver.ReleaseType,
        'beta'
      ),
    },
    Rc: {
      [VERSION_PRE_MAJOR]: semver.inc(
        nextReferenceVersion,
        VERSION_PRE_MAJOR.toLowerCase() as semver.ReleaseType,
        'rc'
      ),
      [VERSION_PRE_MINOR]: semver.inc(
        nextReferenceVersion,
        VERSION_PRE_MINOR.toLowerCase() as semver.ReleaseType,
        'rc'
      ),
      [VERSION_PRE_PATCH]: semver.inc(
        nextReferenceVersion,
        VERSION_PRE_PATCH.toLowerCase() as semver.ReleaseType,
        'rc'
      ),
      [VERSION_PRE_RELEASE]: semver.inc(
        nextReferenceVersion,
        VERSION_PRE_RELEASE.toLowerCase() as semver.ReleaseType,
        'rc'
      ),
    },
  }

  const maxVersionName = Math.max(
    `${VERSION_PATCH} (${suggestions[VERSION_PATCH]})`.length,
    `${VERSION_MINOR} (${suggestions[VERSION_MINOR]})`.length,
    `${VERSION_MAJOR} (${suggestions[VERSION_MAJOR]})`.length
  )
  const choices = [
    {
      short: suggestions[VERSION_PATCH],
      name: `${`${VERSION_PATCH} (${suggestions[VERSION_PATCH]})`.padEnd(
        maxVersionName,
        ' '
      )} ${chalk.grey(`- Bug Fix`)}`,
      value: suggestions[VERSION_PATCH],
    },
    {
      short: suggestions[VERSION_MINOR],
      name: `${`${VERSION_MINOR} (${suggestions[VERSION_MINOR]})`.padEnd(
        maxVersionName,
        ' '
      )} ${chalk.grey(`- New Feature`)}`,
      value: suggestions[VERSION_MINOR],
    },
    {
      short: suggestions[VERSION_MAJOR],
      name: `${`${VERSION_MAJOR} (${suggestions[VERSION_MAJOR]})`.padEnd(
        maxVersionName,
        ' '
      )} ${chalk.grey(`- Breaking Change`)}`,
      value: suggestions[VERSION_MAJOR],
    },
    {
      name: `${'Beta'.padEnd(maxVersionName, ' ')} ${chalk.grey(`- External Test Version`)}`,
      value: 'Beta',
    },
    {
      name: `${'Alpha'.padEnd(maxVersionName, ' ')} ${chalk.grey(`- Internal Test Version`)}`,
      value: 'Alpha',
    },
    {
      name: `${'Rc'.padEnd(maxVersionName, ' ')} ${chalk.grey(`- Release candidate`)}`,
      value: 'Rc',
    },
  ]

  let targetVersion = await inquirer.prompt([
    {
      name: 'value',
      type: 'list',
      message: 'Please select the version number to be upgraded:',
      choices,
    },
  ])

  switch (targetVersion.value) {
    case 'Beta':
      targetVersion = await inquirer.prompt([
        {
          name: 'value',
          type: 'list',
          message: 'Please select the Beta version number to upgrade:',
          choices: [
            {
              short: suggestions.Beta[VERSION_PRE_RELEASE],
              name: `${VERSION_PRE_RELEASE} (${suggestions.Beta[VERSION_PRE_RELEASE]})`,
              value: suggestions.Beta[VERSION_PRE_RELEASE],
            },
            {
              short: suggestions.Beta[VERSION_PRE_PATCH],
              name: `${VERSION_PRE_PATCH}   (${suggestions.Beta[VERSION_PRE_PATCH]})`,
              value: suggestions.Beta[VERSION_PRE_PATCH],
            },
            {
              short: suggestions.Beta[VERSION_PRE_MINOR],
              name: `${VERSION_PRE_MINOR}   (${suggestions.Beta[VERSION_PRE_MINOR]})`,
              value: suggestions.Beta[VERSION_PRE_MINOR],
            },
            {
              short: suggestions.Beta[VERSION_PRE_MAJOR],
              name: `${VERSION_PRE_MAJOR}   (${suggestions.Beta[VERSION_PRE_MAJOR]})`,
              value: suggestions.Beta[VERSION_PRE_MAJOR],
            },
          ],
        },
      ])
      break
    case 'Alpha':
      targetVersion = await inquirer.prompt([
        {
          name: 'value',
          type: 'list',
          message: 'Please select the Alpha version number to upgrade',
          choices: [
            {
              short: suggestions.Alpha[VERSION_PRE_RELEASE],
              name: `${VERSION_PRE_RELEASE} (${suggestions.Alpha[VERSION_PRE_RELEASE]})`,
              value: suggestions.Alpha[VERSION_PRE_RELEASE],
            },
            {
              short: suggestions.Alpha[VERSION_PRE_PATCH],
              name: `${VERSION_PRE_PATCH}   (${suggestions.Alpha[VERSION_PRE_PATCH]})`,
              value: suggestions.Alpha[VERSION_PRE_PATCH],
            },
            {
              short: suggestions.Alpha[VERSION_PRE_MINOR],
              name: `${VERSION_PRE_MINOR}   (${suggestions.Alpha[VERSION_PRE_MINOR]})`,
              value: suggestions.Alpha[VERSION_PRE_MINOR],
            },
            {
              short: suggestions.Alpha[VERSION_PRE_MAJOR],
              name: `${VERSION_PRE_MAJOR}   (${suggestions.Alpha[VERSION_PRE_MAJOR]})`,
              value: suggestions.Alpha[VERSION_PRE_MAJOR],
            },
          ],
        },
      ])
      break
    case 'Rc':
      targetVersion = await inquirer.prompt([
        {
          name: 'value',
          type: 'list',
          message: 'Please select the Rc version number to upgrade',
          choices: [
            {
              short: suggestions.Rc[VERSION_PRE_RELEASE],
              name: `${VERSION_PRE_RELEASE} (${suggestions.Rc[VERSION_PRE_RELEASE]})`,
              value: suggestions.Rc[VERSION_PRE_RELEASE],
            },
            {
              short: suggestions.Rc[VERSION_PRE_PATCH],
              name: `${VERSION_PRE_PATCH}   (${suggestions.Rc[VERSION_PRE_PATCH]})`,
              value: suggestions.Rc[VERSION_PRE_PATCH],
            },
            {
              short: suggestions.Rc[VERSION_PRE_MINOR],
              name: `${VERSION_PRE_MINOR}   (${suggestions.Rc[VERSION_PRE_MINOR]})`,
              value: suggestions.Rc[VERSION_PRE_MINOR],
            },
            {
              short: suggestions.Rc[VERSION_PRE_MAJOR],
              name: `${VERSION_PRE_MAJOR}   (${suggestions.Rc[VERSION_PRE_MAJOR]})`,
              value: suggestions.Rc[VERSION_PRE_MAJOR],
            },
          ],
        },
      ])
      break
    default:
      break
  }

  return targetVersion.value
}
