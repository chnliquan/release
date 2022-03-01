import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import open from 'open'
import newGithubReleaseUrl from 'new-github-release-url'

import { generateChangelog } from './changelog'
import { gettargetVersion } from './gettargetVersion'
import { isAlphaVersion, isBetaVersion, isPrerelease, isRcVersion } from './utils/version'
import { logger } from './utils/logger'
import { exec } from './utils/cp'
import { getStatus, getBranchName } from './utils/git'
import { Options } from './types'
import { URL } from 'url'

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
  const hasModified = await getStatus()

  if (hasModified) {
    logger.printErrorAndExit('Your git status is not clean. Aborting.')
  }

  const pkgPath = path.join(process.cwd(), './package.json')

  if (!fs.existsSync(pkgPath)) {
    logger.printErrorAndExit(
      `Unable to find the ${pkgPath} file, please make sure to execute the command in the root directory.`
    )
  }

  const { name, version, repository, publishConfig } = require(pkgPath)

  if (!name || !version) {
    logger.printErrorAndExit(`package.json file ${pkgPath} is not valid, please check.`)
  }

  const defaultOptions = {
    changelogPreset: '@eljs/changelog-preset',
    repoUrl: repository ? repository.url : '',
    latest: true,
  }

  const { changelogPreset, latest, repoType, repoUrl } = Object.assign(defaultOptions, options)

  let registry = ''

  if (repoType === 'github') {
    try {
      new URL(repoUrl)
    } catch {
      logger.printErrorAndExit(`GitHub repo url is invalid: ${repoUrl}, Aborting.`)
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

  logger.step(`Bump version`)
  const targetVersion = await gettargetVersion(pkgPath)

  // generate changelog
  logger.step(`Generate changelog`)
  const changelog = await generateChangelog(changelogPreset, latest, name)

  // committing changes
  logger.step('Committing changes')
  await exec('git add -A')
  await exec(`chore: bump version v${targetVersion}`)

  // publish package
  logger.step(`Publishing package ${name}`)
  await publishToNpm(name, targetVersion)

  const tag = `v${targetVersion}`

  logger.step('Pushing to Git Remote')
  await exec(`git tag v${targetVersion}`)

  const branch = await getBranchName()
  logger.step(`git push --set-upstream origin ${branch} --tags`)
  await exec(`git push --set-upstream origin ${branch} --tags`)

  // github release
  if (repoType === 'github') {
    await githubRelease(repoUrl, `${tag}`, changelog, isPrerelease(targetVersion))
  }
}

async function publishToNpm(name: string, targetVersion: string) {
  let releaseTag = ''

  if (isRcVersion(targetVersion)) {
    releaseTag = 'next'
  } else if (isAlphaVersion(targetVersion)) {
    releaseTag = 'alpha'
  } else if (isBetaVersion(targetVersion)) {
    releaseTag = 'beta'
  }

  const cliArgs = `publish ${releaseTag ? `--tag ${releaseTag}` : ''} --access public`

  await exec(`npm ${cliArgs}`)
  logger.success(`Successfully published ${chalk.cyanBright.bold(`${name}@${targetVersion}`)}.`)
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
