import conventionalChangelog from 'conventional-changelog'

export type ChangelogConfig = conventionalChangelog.Options['config']

export interface Options {
  type?: 'github' | 'gitlab'
  latest?: boolean
  config?: string
  repoUrl?: string
}
