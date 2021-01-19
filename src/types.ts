import conventionalChangelog from 'conventional-changelog'

export type ChangelogConfig = conventionalChangelog.Options['config']

export interface Options {
  repoType: 'github' | 'gitlab'
  repoUrl?: string
  latest?: boolean
  changelogPreset?: string
}
