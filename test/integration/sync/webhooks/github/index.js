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

module.exports = {
	'push-to-master': {
		expected: require('./push-to-master/expected.json'),
		steps: [
			require('./push-to-master/01.json')
		]
	},
	'push-to-open-pr': {
		expected: require('./push-to-open-pr/expected.json'),
		steps: [
			require('./push-to-open-pr/01.json'),
			require('./push-to-open-pr/02.json')
		]
	},
	'push-to-open-pr-from-fork': {
		expected: require('./push-to-open-pr-from-fork/expected.json'),
		steps: [
			require('./push-to-open-pr-from-fork/01.json'),
			require('./push-to-open-pr-from-fork/02.json')
		]
	},
	'open-pr-and-create-repos': {
		expected: require('./pr-open-close/expected-1.json'),
		headIndex: 1,
		steps: [
			require('./pr-open-close/01-pr-opened.json')
		]
	},
	'pr-open-from-fork': {
		expected: require('./pr-open-from-fork/expected.json'),
		steps: [
			require('./pr-open-from-fork/01.json'),
			require('./pr-open-from-fork/02.json')
		]
	},
	'pr-approve-merge': {
		expected: require('./pr-approve-merge/expected.json'),
		steps: [
			require('./pr-approve-merge/01-pr-opened.json'),
			require('./pr-approve-merge/02-pr-approve.json'),
			require('./pr-approve-merge/03-pr-merge.json')
		]
	},
	'pr-changes-requested': {
		expected: require('./pr-changes-requested/expected.json'),
		steps: [
			require('./pr-changes-requested/01-pr-opened.json'),
			require('./pr-changes-requested/02-pr-review.json')
		]
	},
	'pr-comment': {
		expected: require('./pr-comment/expected.json'),
		steps: [
			require('./pr-comment/01-pr-opened.json'),
			require('./pr-comment/02-pr-comment.json')
		]
	},
	'pr-inline-comment': {
		expected: require('./pr-inline-comment/expected.json'),
		steps: [
			require('./pr-inline-comment/01-pr-opened.json'),
			require('./pr-inline-comment/02-pr-comment.json')
		]
	},
	'pr-label': {
		expected: require('./pr-label/expected.json'),
		steps: [
			require('./pr-label/01-pr-opened.json'),
			require('./pr-label/02-pr-label.json'),
			require('./pr-label/03-pr-unlabel.json')
		]
	},
	'pr-open-close': {
		expected: require('./pr-open-close/expected.json'),
		steps: [
			require('./pr-open-close/01-pr-opened.json'),
			require('./pr-open-close/02-pr-closed.json')
		]
	},
	'pr-review-request': {
		expected: require('./pr-review-request/expected.json'),
		steps: [
			require('./pr-review-request/01-pr-opened.json'),
			require('./pr-review-request/02-pr-review-request.json')
		]
	},
	'issue-open-close-open': {
		expected: require('./issue-open-close-open/expected.json'),
		steps: [
			require('./issue-open-close-open/01-issue-opened.json'),
			require('./issue-open-close-open/02-issue-closed.json'),
			require('./issue-open-close-open/03-issue-opened.json')
		]
	},
	unknown: {
		expected: require('./unknown/expected.json'),
		steps: [
			require('./unknown/01-unknown.json')
		]
	},
	'issue-open-without-body-lowercase-headers': {
		expected: require('./issue-open-without-body-lowercase-headers/expected.json'),
		steps: [
			require('./issue-open-without-body-lowercase-headers/01-issue-opened.json')
		]
	},
	'issue-close-label-toggle': {
		expected: require('./issue-close-label-toggle/expected.json'),
		steps: [
			require('./issue-close-label-toggle/01-issue-opened.json'),
			require('./issue-close-label-toggle/02-issue-closed.json'),
			require('./issue-close-label-toggle/03-issue-label.json'),
			require('./issue-close-label-toggle/04-issue-unlabel.json')
		]
	},
	'issue-open-label-toggle': {
		expected: require('./issue-open-label-toggle/expected.json'),
		steps: [
			require('./issue-open-label-toggle/01-issue-opened.json'),
			require('./issue-open-label-toggle/02-issue-label.json'),
			require('./issue-open-label-toggle/03-issue-unlabel.json')
		]
	},
	'issue-close-comment': {
		expected: require('./issue-close-comment/expected.json'),
		steps: [
			require('./issue-close-comment/01-issue-opened.json'),
			require('./issue-close-comment/02-issue-closed.json'),
			require('./issue-close-comment/03-issue-comment.json')
		]
	},
	'issue-delete-comment-with-missing-ref-which-is-still-returned': {
		expected: require('./issue-delete-comment-with-missing-ref-which-is-still-returned/expected.json'),
		steps: [
			require('./issue-delete-comment-with-missing-ref-which-is-still-returned/01-issue-opened.json'),
			require('./issue-delete-comment-with-missing-ref-which-is-still-returned/02-issue-comment.json'),
			require('./issue-delete-comment-with-missing-ref-which-is-still-returned/03-issue-comment-delete.json')
		]
	},
	'issue-delete-second-comment-with-missing-ref': {
		expected: require('./issue-delete-second-comment-with-missing-ref/expected.json'),
		steps: [
			require('./issue-delete-second-comment-with-missing-ref/01-issue-opened.json'),
			require('./issue-delete-second-comment-with-missing-ref/02-issue-comment.json'),
			require('./issue-delete-second-comment-with-missing-ref/03-issue-comment-delete.json')
		]
	},
	'issue-delete-second-comment': {
		expected: require('./issue-delete-second-comment/expected.json'),
		steps: [
			require('./issue-delete-second-comment/01-issue-opened.json'),
			require('./issue-delete-second-comment/02-issue-comment.json'),
			require('./issue-delete-second-comment/03-issue-comment.json'),
			require('./issue-delete-second-comment/04-issue-comment-delete.json')
		]
	},
	'issue-edit-second-comment-with-missing-ref': {
		expected: require('./issue-edit-second-comment-with-missing-ref/expected.json'),
		steps: [
			require('./issue-edit-second-comment-with-missing-ref/01-issue-opened.json'),
			require('./issue-edit-second-comment-with-missing-ref/02-issue-comment.json'),
			require('./issue-edit-second-comment-with-missing-ref/03-issue-comment-edit.json')
		]
	},
	'issue-edit-second-comment': {
		expected: require('./issue-edit-second-comment/expected.json'),
		steps: [
			require('./issue-edit-second-comment/01-issue-opened.json'),
			require('./issue-edit-second-comment/02-issue-comment.json'),
			require('./issue-edit-second-comment/03-issue-comment.json'),
			require('./issue-edit-second-comment/04-issue-comment-edit.json')
		]
	},
	'issue-delete-comment-with-missing-ref': {
		expected: require('./issue-delete-comment-with-missing-ref/expected.json'),
		steps: [
			require('./issue-delete-comment-with-missing-ref/01-issue-opened.json'),
			require('./issue-delete-comment-with-missing-ref/02-issue-delete.json')
		]
	},
	'issue-comment-edit-with-missing-ref': {
		expected: require('./issue-comment-edit-with-missing-ref/expected.json'),
		steps: [
			require('./issue-comment-edit-with-missing-ref/01-issue-opened.json'),
			require('./issue-comment-edit-with-missing-ref/02-issue-comment-edit.json')
		]
	},
	'issue-closed-with-comment': {
		expected: require('./issue-closed-with-comment/expected.json'),
		steps: [
			require('./issue-closed-with-comment/01-issue-opened.json'),
			require('./issue-closed-with-comment/02-issue-comment.json'),
			require('./issue-closed-with-comment/03-issue-closed.json')
		]
	},
	'issue-comment-edit': {
		expected: require('./issue-comment-edit/expected.json'),
		steps: [
			require('./issue-comment-edit/01-issue-opened.json'),
			require('./issue-comment-edit/02-issue-comment.json'),
			require('./issue-comment-edit/03-issue-comment-edit.json')
		]
	},
	'issue-delete-comment': {
		expected: require('./issue-delete-comment/expected.json'),
		steps: [
			require('./issue-delete-comment/01-issue-opened.json'),
			require('./issue-delete-comment/02-issue-comment.json'),
			require('./issue-delete-comment/03-issue-delete.json')
		]
	},
	'issue-edit-body': {
		expected: require('./issue-edit-body/expected.json'),
		steps: [
			require('./issue-edit-body/01-issue-opened.json'),
			require('./issue-edit-body/02-issue-body-edit.json')
		]
	},
	'issue-edit-title': {
		expected: require('./issue-edit-title/expected.json'),
		steps: [
			require('./issue-edit-title/01-issue-opened.json'),
			require('./issue-edit-title/02-issue-title-edit.json')
		]
	},
	'issue-open-close': {
		expected: require('./issue-open-close/expected.json'),
		steps: [
			require('./issue-open-close/01-issue-opened.json'),
			require('./issue-open-close/02-issue-closed.json')
		]
	},
	'issue-open-with-assignee': {
		expected: require('./issue-open-with-assignee/expected.json'),
		steps: [
			require('./issue-open-with-assignee/01-issue-opened.json'),
			require('./issue-open-with-assignee/02-issue-assigned.json')
		]
	},
	'issue-open-with-comments': {
		expected: require('./issue-open-with-comments/expected.json'),
		steps: [
			require('./issue-open-with-comments/01-issue-opened.json'),
			require('./issue-open-with-comments/02-issue-comment.json'),
			require('./issue-open-with-comments/03-issue-comment.json')
		]
	},
	'issue-open-with-labels': {
		expected: require('./issue-open-with-labels/expected.json'),
		steps: [
			require('./issue-open-with-labels/01-issue-opened.json'),
			require('./issue-open-with-labels/02-issue-labeled.json'),
			require('./issue-open-with-labels/03-issue-labeled.json')
		]
	},
	'issue-open-without-body': {
		expected: require('./issue-open-without-body/expected.json'),
		steps: [
			require('./issue-open-without-body/01-issue-opened.json')
		]
	}
}
