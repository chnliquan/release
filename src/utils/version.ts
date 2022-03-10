import path from 'path'
import fs from 'fs'
import semver from 'semver'
import chalk from 'chalk'

import { logger } from './logger'
import { exec } from './cp'
import { Package, Workspace } from '../types'

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
  } catch (err: any) {
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

export function getReferenceVersion(localVersion: string, remoteVersion?: string): string {
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

export interface Packages {
  [key: string]: string[]
}

export function updateVersions(rootName: string, version: string, workspace: Workspace): string[] {
  // 1. update root package.json
  updatePackage({
    rootName,
    pkgDir: process.cwd(),
    version,
  })

  // 2. update all packages with monorepo
  if (Object.keys(workspace).length > 0) {
    // TODO：duplicate pkg name
    const allPackages = Object.keys(workspace).reduce((prev, dir) => {
      const packages = workspace[dir]
      return prev.concat(packages)
    }, [] as string[])

    const pkgDirs: string[] = []

    Object.keys(workspace).forEach(dir => {
      const packages = workspace[dir]
      packages.forEach(pkg => {
        const pkgDir = path.resolve(process.cwd(), dir, pkg)

        pkgDirs.push(pkgDir)
        updatePackage({
          rootName,
          pkgDir,
          version,
          packages: allPackages,
        })
      })
    })

    return pkgDirs
  }

  return []
}

interface UpdatePackageParams {
  rootName: string
  pkgDir: string
  version: string
  packages?: string[]
}

export function updatePackage({ rootName, pkgDir, version, packages }: UpdatePackageParams) {
  const pkgJSONPath = path.resolve(pkgDir, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgJSONPath, 'utf-8'))
  pkg.version = version

  if (packages) {
    updateDeps({
      rootName,
      pkg,
      version,
      depType: 'dependencies',
      packages,
    })
    updateDeps({
      rootName,
      pkg,
      version,
      depType: 'peerDependencies',
      packages,
    })
  }

  fs.writeFileSync(pkgJSONPath, JSON.stringify(pkg, null, 2) + '\n')
}

interface UpdateDepsParams {
  rootName: string
  pkg: Package
  version: string
  depType: 'dependencies' | 'peerDependencies'
  packages: string[]
}

export function updateDeps({ rootName, pkg, version, depType, packages }: UpdateDepsParams) {
  const deps = pkg[depType]

  if (!deps) {
    return
  }

  const reg = /\^?(\d+\.\d+\.\d+)(-(alpha|beta|next)\.\d+)?/

  Object.keys(deps).forEach(dep => {
    if (
      dep.startsWith(`@${rootName}`) &&
      packages.includes(dep.replace(new RegExp(`\^@${rootName}\\/`, 'g'), ''))
    ) {
      logger.info(`${pkg.name} -> ${depType} -> ${dep}@${version}`)
      deps[dep] = deps[dep].replace(reg, version)
    }
  })
}
