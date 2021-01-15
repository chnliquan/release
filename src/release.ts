import path from 'path'
import chalk from 'chalk'
import open from 'open'
import newGithubReleaseUrl from 'new-github-release-url'

import { generateChangelog } from './changelog'
import { getNextVersion } from './getNextVersion'
import { isAlphaVersion, isBetaVersion, isPrerelease, isRcVersion } from './utils/version'
import { logger } from './utils/logger'
import { exec } from './utils/cp'
import { getStatus, getBranchName } from './utils/git'
import { Options } from './types'
import { URL } from 'url'

const pkgPath = path.join(__dirname, '../package.json')
const { name, repository, publishConfig } = require(pkgPath)

const defaultOptions = {
  config: path.join(__dirname, '../conventional-changelog-config'),
  repoUrl: repository ? repository.url : '',
  latest: true,
  type: 'github',
}

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

  const { config, latest, type, repoUrl } = Object.assign(defaultOptions, options)

  let registry = ''

  if (type === 'github') {
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

  logger.step(`bump version`)
  const nextVersion = await getNextVersion(pkgPath)

  logger.step(`generate changelog`)
  const changelog = await generateChangelog(config, latest)

  const commitMessage = `chore: bump version v${nextVersion}`

  logger.step(`git commit with ${commitMessage}`)
  await exec('git add .')
  await exec(`git commit -m '${commitMessage}'`)

  const tag = `v${nextVersion}`

  logger.step(`git tag ${tag}`)
  await exec(`git tag ${tag}`)

  const branch = await getBranchName()
  logger.step(`git push --set-upstream origin ${branch} --tags`)
  await exec(`git push --set-upstream origin ${branch} --tags`)

  logger.step(`publish package ${name}`)
  await publishToNpm(nextVersion)

  if (type === 'github') {
    await githubRelease(repoUrl, `${tag}`, changelog, isPrerelease(nextVersion))
  }

  logger.success(`${name}@${nextVersion} publish successfully`)
}

async function publishToNpm(nextVersion: string) {
  const cliArgs = isRcVersion(nextVersion)
    ? 'publish --tag next'
    : isAlphaVersion(nextVersion)
    ? 'publish --tag alpha'
    : isBetaVersion(nextVersion)
    ? 'publish --tag beta'
    : 'publish'
  await exec(`npm ${cliArgs}`)
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
