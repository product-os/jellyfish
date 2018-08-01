/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const ava = require('ava')
const GitHubIntegration = require('../../../lib/sync/integrations/github')

const exampleCard = {
	active: true,
	data: {
		payload: {
			action: 'created',
			comment: {
				author_association: 'OWNER',
				body: 'prod',
				created_at: '2018-08-01T12:31:43Z',
				html_url: 'https://github.com/sqweelygig/syncbot-sandbox/issues/56#issuecomment-409558451',
				id: 409558451,
				issue_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/issues/56',
				node_id: 'MDEyOklzc3VlQ29tbWVudDQwOTU1ODQ1MQ==',
				updated_at: '2018-08-01T12:31:43Z',
				url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/issues/comments/409558451',
				user: {
					avatar_url: 'https://avatars0.githubusercontent.com/u/20857369?v=4',
					events_url: 'https://api.github.com/users/sqweelygig/events{/privacy}',
					followers_url: 'https://api.github.com/users/sqweelygig/followers',
					following_url: 'https://api.github.com/users/sqweelygig/following{/other_user}',
					gists_url: 'https://api.github.com/users/sqweelygig/gists{/gist_id}',
					gravatar_id: '',
					html_url: 'https://github.com/sqweelygig',
					id: 20857369,
					login: 'sqweelygig',
					node_id: 'MDQ6VXNlcjIwODU3MzY5',
					organizations_url: 'https://api.github.com/users/sqweelygig/orgs',
					received_events_url: 'https://api.github.com/users/sqweelygig/received_events',
					repos_url: 'https://api.github.com/users/sqweelygig/repos',
					site_admin: false,
					starred_url: 'https://api.github.com/users/sqweelygig/starred{/owner}{/repo}',
					subscriptions_url: 'https://api.github.com/users/sqweelygig/subscriptions',
					type: 'User',
					url: 'https://api.github.com/users/sqweelygig'
				}
			},
			installation: {
				id: 81150
			},
			issue: {
				assignee: null,
				assignees: [],
				author_association: 'OWNER',
				body: 'Just a quick test to see if I\'ve got the infinite loop out',
				closed_at: null,
				comments: 6,
				comments_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/issues/56/comments',
				created_at: '2018-07-26T16:32:00Z',
				events_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/issues/56/events',
				html_url: 'https://github.com/sqweelygig/syncbot-sandbox/issues/56',
				id: 344917467,
				labels: [],
				labels_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/issues/56/labels{/name}',
				locked: false,
				milestone: null,
				node_id: 'MDU6SXNzdWUzNDQ5MTc0Njc=',
				number: 56,
				repository_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox',
				state: 'open',
				title: 'SB test',
				updated_at: '2018-08-01T12:31:44Z',
				url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/issues/56',
				user: {
					avatar_url: 'https://avatars0.githubusercontent.com/u/20857369?v=4',
					events_url: 'https://api.github.com/users/sqweelygig/events{/privacy}',
					followers_url: 'https://api.github.com/users/sqweelygig/followers',
					following_url: 'https://api.github.com/users/sqweelygig/following{/other_user}',
					gists_url: 'https://api.github.com/users/sqweelygig/gists{/gist_id}',
					gravatar_id: '',
					html_url: 'https://github.com/sqweelygig',
					id: 20857369,
					login: 'sqweelygig',
					node_id: 'MDQ6VXNlcjIwODU3MzY5',
					organizations_url: 'https://api.github.com/users/sqweelygig/orgs',
					received_events_url: 'https://api.github.com/users/sqweelygig/received_events',
					repos_url: 'https://api.github.com/users/sqweelygig/repos',
					site_admin: false,
					starred_url: 'https://api.github.com/users/sqweelygig/starred{/owner}{/repo}',
					subscriptions_url: 'https://api.github.com/users/sqweelygig/subscriptions',
					type: 'User',
					url: 'https://api.github.com/users/sqweelygig'
				}
			},
			repository: {
				archive_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/{archive_format}{/ref}',
				archived: false,
				assignees_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/assignees{/user}',
				blobs_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/git/blobs{/sha}',
				branches_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/branches{/branch}',
				clone_url: 'https://github.com/sqweelygig/syncbot-sandbox.git',
				collaborators_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/collaborators{/collaborator}',
				comments_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/comments{/number}',
				commits_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/commits{/sha}',
				compare_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/compare/{base}...{head}',
				contents_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/contents/{+path}',
				contributors_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/contributors',
				created_at: '2018-01-18T10:00:47Z',
				default_branch: 'master',
				deployments_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/deployments',
				description: null,
				downloads_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/downloads',
				events_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/events',
				fork: false,
				forks: 0,
				forks_count: 0,
				forks_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/forks',
				full_name: 'sqweelygig/syncbot-sandbox',
				git_commits_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/git/commits{/sha}',
				git_refs_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/git/refs{/sha}',
				git_tags_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/git/tags{/sha}',
				git_url: 'git://github.com/sqweelygig/syncbot-sandbox.git',
				has_downloads: true,
				has_issues: true,
				has_pages: false,
				has_projects: true,
				has_wiki: true,
				homepage: null,
				hooks_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/hooks',
				html_url: 'https://github.com/sqweelygig/syncbot-sandbox',
				id: 117965067,
				issue_comment_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/issues/comments{/number}',
				issue_events_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/issues/events{/number}',
				issues_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/issues{/number}',
				keys_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/keys{/key_id}',
				labels_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/labels{/name}',
				language: null,
				languages_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/languages',
				license: {
					key: 'apache-2.0',
					name: 'Apache License 2.0',
					node_id: 'MDc6TGljZW5zZTI=',
					spdx_id: 'Apache-2.0',
					url: 'https://api.github.com/licenses/apache-2.0'
				},
				merges_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/merges',
				milestones_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/milestones{/number}',
				mirror_url: null,
				name: 'syncbot-sandbox',
				node_id: 'MDEwOlJlcG9zaXRvcnkxMTc5NjUwNjc=',
				notifications_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/notifications{?since,all,participating}',
				open_issues: 7,
				open_issues_count: 7,
				owner: {
					avatar_url: 'https://avatars0.githubusercontent.com/u/20857369?v=4',
					events_url: 'https://api.github.com/users/sqweelygig/events{/privacy}',
					followers_url: 'https://api.github.com/users/sqweelygig/followers',
					following_url: 'https://api.github.com/users/sqweelygig/following{/other_user}',
					gists_url: 'https://api.github.com/users/sqweelygig/gists{/gist_id}',
					gravatar_id: '',
					html_url: 'https://github.com/sqweelygig',
					id: 20857369,
					login: 'sqweelygig',
					node_id: 'MDQ6VXNlcjIwODU3MzY5',
					organizations_url: 'https://api.github.com/users/sqweelygig/orgs',
					received_events_url: 'https://api.github.com/users/sqweelygig/received_events',
					repos_url: 'https://api.github.com/users/sqweelygig/repos',
					site_admin: false,
					starred_url: 'https://api.github.com/users/sqweelygig/starred{/owner}{/repo}',
					subscriptions_url: 'https://api.github.com/users/sqweelygig/subscriptions',
					type: 'User',
					url: 'https://api.github.com/users/sqweelygig'
				},
				private: true,
				pulls_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/pulls{/number}',
				pushed_at: '2018-07-10T15:40:02Z',
				releases_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/releases{/id}',
				size: 25,
				ssh_url: 'git@github.com:sqweelygig/syncbot-sandbox.git',
				stargazers_count: 0,
				stargazers_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/stargazers',
				statuses_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/statuses/{sha}',
				subscribers_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/subscribers',
				subscription_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/subscription',
				svn_url: 'https://github.com/sqweelygig/syncbot-sandbox',
				tags_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/tags',
				teams_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/teams',
				trees_url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox/git/trees{/sha}',
				updated_at: '2018-07-10T15:34:06Z',
				url: 'https://api.github.com/repos/sqweelygig/syncbot-sandbox',
				watchers: 0,
				watchers_count: 0
			},
			sender: {
				avatar_url: 'https://avatars0.githubusercontent.com/u/20857369?v=4',
				events_url: 'https://api.github.com/users/sqweelygig/events{/privacy}',
				followers_url: 'https://api.github.com/users/sqweelygig/followers',
				following_url: 'https://api.github.com/users/sqweelygig/following{/other_user}',
				gists_url: 'https://api.github.com/users/sqweelygig/gists{/gist_id}',
				gravatar_id: '',
				html_url: 'https://github.com/sqweelygig',
				id: 20857369,
				login: 'sqweelygig',
				node_id: 'MDQ6VXNlcjIwODU3MzY5',
				organizations_url: 'https://api.github.com/users/sqweelygig/orgs',
				received_events_url: 'https://api.github.com/users/sqweelygig/received_events',
				repos_url: 'https://api.github.com/users/sqweelygig/repos',
				site_admin: false,
				starred_url: 'https://api.github.com/users/sqweelygig/starred{/owner}{/repo}',
				subscriptions_url: 'https://api.github.com/users/sqweelygig/subscriptions',
				type: 'User',
				url: 'https://api.github.com/users/sqweelygig'
			}
		},
		source: 'github'
	},
	id: '1cafd3ca-4719-43fc-83c6-6179763ebba0',
	links: {},
	tags: [],
	type: 'external-event'
}

ava.test('.getEventUrl() should retrieve the comment\'s own url', async (test) => {
	const githubIntegration = new GitHubIntegration()
	const result = await githubIntegration.getEventUrl(exampleCard)
	test.is(result, 'https://github.com/sqweelygig/syncbot-sandbox/issues/56#issuecomment-409558451')
})

ava.test('.getHeadUrl() should retrieve the comment\'s issue\'s url', async (test) => {
	const githubIntegration = new GitHubIntegration()
	const result = await githubIntegration.getHeadUrl(exampleCard)
	test.is(result, 'https://github.com/sqweelygig/syncbot-sandbox/issues/56')
})
