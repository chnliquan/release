import conventionalChangelog from 'conventional-changelog'

export type ChangelogConfig = conventionalChangelog.Options['config']

export interface Options {
  repoType: 'github' | 'gitlab'
  repoUrl?: string
  accessPublic?: boolean
  latest?: boolean
  changelogPreset?: string
}
