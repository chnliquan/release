import fs from 'fs'
import path from 'path'
import { URL } from 'url'
import chalk from 'chalk'
import open from 'open'
import yaml from 'js-yaml'
import newGithubReleaseUrl from 'new-github-release-url'

import { generateChangelog } from './changelog'
import { getTargetVersion } from './version'
import {
  logger,
  exec,
  isAlphaVersion,
  isBetaVersion,
  isPrerelease,
  isRcVersion,
  updateVersions,
} from './utils'
import { getStatus, getBranchName } from './utils/git'
import { Options } from './types'
import { Package, Workspace } from '.'

const cwd = process.cwd()

const rootPkgJSONPath = path.join(cwd, 'package.json')

if (!fs.existsSync(rootPkgJSONPath)) {
  logger.printErrorAndExit(
    `Unable to find the ${rootPkgJSONPath} file, please make sure to execute the command in the root directory.`
  )
}

const workspace: Workspace = Object.create(null)

try {
  const doc = yaml.load(fs.readFileSync(path.resolve(cwd, './pnpm-workspace.yaml'), 'utf8')) as {
    packages: string[]
  }

  if (doc.packages?.length) {
    const reg = /(\w+)\/\*?/

    doc.packages.forEach(pkgGlob => {
      const rootDirName = pkgGlob.match(reg)![1]
      workspace[rootDirName] = fs
        .readdirSync(path.resolve(cwd, rootDirName))
        .filter(p => !path.extname(p))
    })
  }
} catch (err) {}

const isMonorepo = Object.keys(workspace).length > 0

/**
 * Workflow
 *
 * 1. Make changes
 * 2. Commit those changes
 * 3. Make sure Travis turns green
 * 4. Bump version in package.json
 * 5. conventionalChangelog
 * 6. Commit package.json and CHANGELOG.md files
 * 7. Tag
 * 8. Push
 */
export async function release(options: Options): Promise<void> {
  if (isMonorepo) {
    try {
      await exec('pnpm -v')
    } catch (err) {
      logger.printErrorAndExit('Release script depend on `pnpm`, please install `pnpm` first.')
    }
  }

  const { name, version, repository, publishConfig } = require(rootPkgJSONPath) as Package

  if (!version) {
    logger.printErrorAndExit(`package.json file ${rootPkgJSONPath} is not valid, please check.`)
  }

  const defaultOptions = {
    changelogPreset: '@eljs/changelog-preset',
    repoUrl: repository ? repository.url : '',
    latest: true,
    checkGitStatus: true,
  }

  const {
    changelogPreset,
    latest,
    repoType: specifiedRepoType,
    repoUrl,
    checkGitStatus,
    targetVersion: specifiedTargetVersion,
    beforeUpdateVersion,
    beforeChangelog,
  } = Object.assign(defaultOptions, options)
  const repoType = specifiedRepoType || repoUrl.includes('github') ? 'github' : 'gitlab'

  if (checkGitStatus) {
    const hasModified = await getStatus()

    if (hasModified) {
      logger.printErrorAndExit('Your git status is not clean. Aborting.')
    }
  }

  let registry = ''

  if (repoType === 'github') {
    if (repoUrl) {
      try {
        new URL(repoUrl)
      } catch {
        logger.printErrorAndExit(`GitHub repo url is invalid: ${repoUrl}, Aborting.`)
      }
    }

    registry = 'https://registry.npmjs.org/'
  } else if (publishConfig?.registry) {
    try {
      const url = new URL(publishConfig.registry)
      registry = url.origin
    } catch {}
  }

  if (registry) {
    const userRegistry = await exec('npm config get registry')

    if (!userRegistry.includes(registry)) {
      logger.printErrorAndExit(`Release failed, npm registry must be ${chalk.blue(registry)}.`)
    }
  }

  const targetVersion = await getTargetVersion(rootPkgJSONPath, isMonorepo, specifiedTargetVersion)

  if (typeof beforeUpdateVersion === 'function') {
    await beforeUpdateVersion(targetVersion)
  }

  // update all package versions and inter-dependencies
  logger.step('Updating versions ...')
  const pkgDirs = updateVersions(name, targetVersion, workspace)

  if (typeof beforeChangelog === 'function') {
    await beforeChangelog()
  }

  // generate changelog
  logger.step(`Generating changelog ...`)
  const changelog = await generateChangelog(changelogPreset, latest, name)

  if (isMonorepo) {
    // update pnpm-lock.yaml
    logger.step('Updating lockfile...')
    await exec('pnpm install --prefer-offline')
  }

  // commit git changes
  logger.step('Committing changes ...')
  await exec('git add -A')
  await exec(`git commit -m 'chore: bump version v${targetVersion}'`)

  // publish package
  if (isMonorepo) {
    logger.step(`Publishing packages ...`)
    for (const pkgDir of pkgDirs) {
      await publishPackage(pkgDir, targetVersion)
    }
  } else {
    logger.step(`Publishing package ${name} ...`)
    await publishPackage(cwd, targetVersion)
  }

  const tag = `v${targetVersion}`

  logger.step('Pushing to git remote ...')
  await exec(`git tag v${targetVersion}`)
  const branch = await getBranchName()
  await exec(`git push --set-upstream origin ${branch} --tags`)

  // github release
  if (repoType === 'github' && repoUrl) {
    await githubRelease(repoUrl, `${tag}`, changelog, isPrerelease(targetVersion))
  }
}

async function publishPackage(pkgDir: string, targetVersion: string) {
  const pkgJSONPath = path.resolve(pkgDir, 'package.json')
  const pkg: Package = JSON.parse(fs.readFileSync(pkgJSONPath, 'utf-8'))

  if (pkg.private) {
    return
  }

  let releaseTag = ''

  if (isRcVersion(targetVersion)) {
    releaseTag = 'next'
  } else if (isAlphaVersion(targetVersion)) {
    releaseTag = 'alpha'
  } else if (isBetaVersion(targetVersion)) {
    releaseTag = 'beta'
  }

  const cli = isMonorepo ? 'pnpm' : 'npm'
  const cliArgs = `publish${releaseTag ? ` --tag ${releaseTag}` : ''} --access public`

  await exec(`${cli} ${cliArgs}`, {
    cwd: pkgDir,
  })
  logger.done(`Published ${chalk.cyanBright.bold(`${pkg.name}@${targetVersion}`)} successfully.`)
}

async function githubRelease(repoUrl: string, tag: string, body: string, isPrerelease: boolean) {
  const url = newGithubReleaseUrl({
    repoUrl,
    tag,
    body,
    isPrerelease,
  })

  await open(url)
}
