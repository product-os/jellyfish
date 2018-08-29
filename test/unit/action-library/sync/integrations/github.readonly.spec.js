/*
Copyright 2018 Resin.io
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
   http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

const ava = require('ava')
const GitHubIntegration = require('../../../../../lib/action-library/dist/sync/integrations/github').default

const issuePayload = process.env.GITHUB_READ_TEST_ISSUE_PAYLOAD
	? JSON.parse(process.env.GITHUB_READ_TEST_ISSUE_PAYLOAD)
	: require('./issue')

const replyPayload = process.env.GITHUB_READ_TEST_REPLY_PAYLOAD
	? JSON.parse(process.env.GITHUB_READ_TEST_REPLY_PAYLOAD)
	: require('./issue-comment')

const issueUrl = issuePayload.payload.issue.html_url

const headIssueCard = {
	type: 'issue',
	data: issuePayload.payload.issue
}

const headMessageCard = {
	type: 'message',
	data: {
		data: {
			payload: {
				message: issuePayload.payload.issue.body
			}
		}
	}
}

const issueReplyCard = {
	type: 'message',
	data: {
		data: {
			payload: {
				message: replyPayload.payload.comment.body
			}
		}
	}
}

const issueTimeline = {
	head: headIssueCard,
	tail: [
		headMessageCard,
		issueReplyCard
	]
}

ava.beforeEach(async (test) => {
	test.context = new GitHubIntegration(process.env.GITHUB_READ_TEST_APP)
})

ava.test(
	[
		'GitHubIntegration authenticate()',
		'should resolve',
		'when given a good auth'
	].join(' '),
	async (test) => {
		await test.notThrows(test.context.authenticate(process.env.GITHUB_READ_TEST_KEY))
	}
)

ava.test(
	[
		'GitHubIntegration authenticate()',
		'should reject',
		'when given a syntactically invalid auth'
	].join(' '),
	async (test) => {
		await test.throws(test.context.authenticate('1234'))
	}
)

ava.test(
	[
		'GitHubIntegration authenticate()',
		'should reject',
		'when given a credentially invalid auth'
	].join(' '),
	async (test) => {
		const key = [
			'MIICXAIBAAKBgQCqGKukO1De7zhZj6+H0qtjTkVxwTCpvKe4eCZ0FPqri0cb2J',
			'ZfXJ/DgYSF6vUpwmJG8wVQZKjeGcjDOL5UlsuusFncCzWBQ7RKNUSesmQRMSGk',
			'Vb1/3j+skZ6UtW+5u09lHNsj6tQ51s1SPrCBkedbNf0Tp0GbMJDyR4e9T04ZZw',
			'IDAQABAoGAFijko56+qGyN8M0RVyaRAXz++xTqHBLh3tx4VgMtrQ+WEgCjhoTw',
			'o23KMBAuJGSYnRmoBZM3lMfTKevIkAidPExvYCdm5dYq3XToLkkLv5L2pIIVOF',
			'MDG+KESnAFV7l2c+cnzRMW0+b6f8mR1CJzZuxVLL6Q02fvLi55/mbSYxECQQDe',
			'Aw6fiIQXGukBI4eMZZt4nscy2o12KyYner3VpoeE+Np2q+Z3pvAMd/aNzQ/W9W',
			'aI+NRfcxUJrmfPwIGm63ilAkEAxCL5HQb2bQr4ByorcMWm/hEP2MZzROV73yF4',
			'1hPsRC9m66KrheO9HPTJuo3/9s5p+sqGxOlFL0NDt4SkosjgGwJAFklyR1uZ/w',
			'PJjj611cdBcztlPdqoxssQGnh85BzCj/u3WqBpE2vjvyyvyI5kX6zk7S0ljKtt',
			'2jny2+00VsBerQJBAJGC1Mg5Oydo5NwD6BiROrPxGo2bpTbu/fhrT8ebHkTz2e',
			'plU9VQQSQzY1oZMVX8i1m5WUTLPz2yLJIBQVdXqhMCQBGoiuSoSjafUhV7i1cE',
			'Gpb88h5NBYZzWXGZ37sJ5QsW+sJyoNde3xH8vdXhzU7eT82D6X/scw9RZz+/6r',
			'CJ4p0='
		].join()
		await test.throws(test.context.authenticate(key))
	}
)

ava.test(
	[
		'GitHubIntegration getHeadId()',
		'should extract issue id',
		'when given an issue payload'
	].join(' '),
	(test) => {
		const result = test.context.getHeadId(issuePayload)
		test.deepEqual(result, issueUrl)
	}
)

ava.test(
	[
		'GitHubIntegration getHeadId()',
		'should extract issue id',
		'when given a comment payload'
	].join(' '),
	(test) => {
		const result = test.context.getHeadId(replyPayload)
		test.deepEqual(result, issueUrl)
	}
)

ava.test(
	[
		'GitHubIntegration getTailCards()',
		'should calculate a list of entities to append to a time-line',
		'when given a comment payload'
	].join(' '),
	(test) => {
		const result = test.context.getTailCards(replyPayload)
		const expectation = [
			issueReplyCard
		]
		test.deepEqual(result, expectation)
	}
)

ava.test(
	[
		'GitHubIntegration getFullTimeLine()',
		'should retrieve a complete time-line',
		'when given an issue payload'
	].join(' '),
	async (test) => {
		const result = await test.context.getFullTimeLine(issuePayload)
		test.deepEqual(result, issueTimeline)
	}
)

ava.test(
	[
		'GitHubIntegration getFullTimeLine()',
		'should retrieve a complete time-line',
		'when given a comment payload'
	].join(' '),
	async (test) => {
		const result = await test.context.getFullTimeLine(replyPayload)
		test.deepEqual(result, issueTimeline)
	}

)
