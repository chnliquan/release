import path from 'path'
import fs from 'fs'
import semver from 'semver'
import chalk from 'chalk'
import { logger } from './logger'
import { exec } from './cp'
import { getPkgRoot } from './path'
import { Package, Workspace } from '..'

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

export function updateVersions(version: string, workspace: Workspace): string[] {
  // 1. update root package.json
  updatePackage(process.cwd(), version)
  // 2. update all packages with monorepo
  if (Object.keys(workspace).length > 0) {
    // TODO：duplicate pkg name
    const allPackages = Object.keys(workspace).reduce((prev, rootDir) => {
      const packages = workspace[rootDir]
      return prev.concat(packages)
    }, [] as string[])

    const packageRoots: string[] = []

    Object.keys(workspace).forEach(rootDir => {
      const packages = workspace[rootDir]
      packages.forEach(pkg => {
        const packageRoot = path.resolve(process.cwd(), rootDir, pkg)
        packageRoots.push(packageRoot)
        updatePackage(packageRoot, version, allPackages)
      })
    })

    return packageRoots
  }

  return []
}

export function updatePackage(pkgRoot: string, version: string, packages?: string[]) {
  const pkgPath = path.resolve(pkgRoot, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  pkg.version = version

  if (packages) {
    updateDeps(packages, pkg, 'dependencies', version)
    updateDeps(packages, pkg, 'peerDependencies', version)
  }

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
}

export function updateDeps(
  packages: string[],
  pkg: Package,
  depType: 'dependencies' | 'peerDependencies',
  version: string
) {
  const deps = pkg[depType]

  if (!deps) {
    return
  }

  const reg = /\^?(\d+\.\d+\.\d+)(-(alpha|beta|next)\.\d+)?/

  Object.keys(deps).forEach(dep => {
    if (dep.startsWith('@test') && packages.includes(dep.replace(/^@test\//, ''))) {
      logger.info(`${pkg.name} -> ${depType} -> ${dep}@${version}`)
      deps[dep] = deps[dep].replace(reg, version)
    }
  })
}
