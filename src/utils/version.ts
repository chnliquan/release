import semver from 'semver'
import chalk from 'chalk'
import { logger } from './logger'
import { exec } from './cp'

export function isPrerelease(version: string): boolean {
  return isAlphaVersion(version) || isBetaVersion(version) || isRcVersion(version)
}

export function isAlphaVersion(version: string): boolean {
  return version.includes('-alpha.')
}

export function isRcVersion(version: string): boolean {
  return version.includes('-rc.')
}

export function isBetaVersion(version: string): boolean {
  return version.includes('-beta.')
}

export async function getDistTag(pkgName: string) {
  let remoteLatestVersion = ''
  let remoteAlphaVersion = ''
  let remoteBetaVersion = ''
  let remoteNextVersion = ''

  try {
    const distTags = (await exec(`npm dist-tag ${pkgName}`)).split('\n')

    distTags.forEach(tag => {
      if (tag.startsWith('latest')) {
        remoteLatestVersion = tag.split(': ')[1]
      }

      if (tag.startsWith('alpha')) {
        remoteAlphaVersion = tag.split(': ')[1]
      }

      if (tag.startsWith('beta')) {
        remoteBetaVersion = tag.split(': ')[1]
      }

      if (tag.startsWith('next')) {
        remoteNextVersion = tag.split(': ')[1]
      }
    })
  } catch (err) {
    if (err.message.includes('command not found')) {
      logger.error(`Please make sure the ${chalk.cyanBright.bold('npm')} has been installed`)
      process.exit(1)
    } else {
      logger.info(
        `This package ${chalk.cyanBright.bold(
          pkgName
        )} has never been released, this is the first release.`
      )
      console.log()
    }
  }

  return {
    remoteLatestVersion,
    remoteAlphaVersion,
    remoteBetaVersion,
    remoteNextVersion,
  }
}

export function getReferenceVersion(remoteVersion: string, localVersion: string): string {
  if (!remoteVersion) {
    return localVersion
  }

  const baseRemoteVersion = remoteVersion.split('-')[0]
  const baseLocalVersion = localVersion.split('-')[0]

  if (
    (isAlphaVersion(remoteVersion) && isBetaVersion(localVersion)) ||
    ((isBetaVersion(remoteVersion) || isAlphaVersion(remoteVersion)) && isRcVersion(localVersion))
  ) {
    if (baseRemoteVersion === baseLocalVersion) {
      return remoteVersion
    }
  }

  return semver.gt(remoteVersion, localVersion) ? remoteVersion : localVersion
}
