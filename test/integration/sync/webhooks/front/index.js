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
	'intercom-inbound-archive': {
		expected: require('./intercom-inbound-archive/expected.json'),
		steps: [
			require('./intercom-inbound-archive/01.json'),
			require('./intercom-inbound-archive/02.json'),
			require('./intercom-inbound-archive/03.json'),
			require('./intercom-inbound-archive/04.json')
		]
	},
	'intercom-unknown-inbound-message-archive': {
		expected: require('./intercom-unknown-inbound-message-archive/expected.json'),
		steps: [
			require('./intercom-unknown-inbound-message-archive/01.json'),
			require('./intercom-unknown-inbound-message-archive/02.json'),
			require('./intercom-unknown-inbound-message-archive/03.json')
		]
	},
	'inbound-inbound-inbound': {
		expected: require('./inbound-inbound-inbound/expected.json'),
		steps: [
			require('./inbound-inbound-inbound/01.json'),
			require('./inbound-inbound-inbound/02.json'),
			require('./inbound-inbound-inbound/03.json')
		]
	},
	'inbound-archive-unarchive': {
		expected: require('./inbound-archive-unarchive/expected.json'),
		steps: [
			require('./inbound-archive-unarchive/01.json'),
			require('./inbound-archive-unarchive/02.json'),
			require('./inbound-archive-unarchive/03.json')
		]
	},
	'inbound-archive': {
		expected: require('./inbound-archive/expected.json'),
		steps: [
			require('./inbound-archive/01.json'),
			require('./inbound-archive/02.json')
		]
	},
	'inbound-delay-message-cancel': {
		expected: require('./inbound-delay-message-cancel/expected.json'),
		steps: [
			require('./inbound-delay-message-cancel/01.json'),
			require('./inbound-delay-message-cancel/02.json')
		]
	},
	'inbound-delay-message': {
		expected: require('./inbound-delay-message/expected.json'),
		steps: [
			require('./inbound-delay-message/01.json'),
			require('./inbound-delay-message/02.json'),
			require('./inbound-delay-message/03.json')
		]
	},
	'inbound-delete-undelete': {
		expected: require('./inbound-delete-undelete/expected.json'),
		steps: [
			require('./inbound-delete-undelete/01.json'),
			require('./inbound-delete-undelete/02.json'),
			require('./inbound-delete-undelete/03.json')
		]
	},
	'inbound-delete': {
		expected: require('./inbound-delete/expected.json'),
		steps: [
			require('./inbound-delete/01.json'),
			require('./inbound-delete/02.json')
		]
	},
	'inbound-message': {
		expected: require('./inbound-message/expected.json'),
		steps: [
			require('./inbound-message/01.json'),
			require('./inbound-message/02.json'),
			require('./inbound-message/03.json')
		]
	},
	'inbound-no-body': {
		expected: require('./inbound-no-body/expected.json'),
		steps: [
			require('./inbound-no-body/01.json')
		]
	},
	'inbound-snooze-cancel': {
		expected: require('./inbound-snooze-cancel/expected.json'),
		steps: [
			require('./inbound-snooze-cancel/01.json'),
			require('./inbound-snooze-cancel/02.json'),
			require('./inbound-snooze-cancel/03.json')
		]
	},
	'inbound-snooze': {
		expected: require('./inbound-snooze/expected.json'),
		steps: [
			require('./inbound-snooze/01.json'),
			require('./inbound-snooze/02.json')
		]
	},
	'inbound-tag-tag': {
		expected: require('./inbound-tag-tag/expected.json'),
		steps: [
			require('./inbound-tag-tag/01.json'),
			require('./inbound-tag-tag/02.json'),
			require('./inbound-tag-tag/03.json')
		]
	},
	'inbound-tag-untag': {
		expected: require('./inbound-tag-untag/expected.json'),
		steps: [
			require('./inbound-tag-untag/01.json'),
			require('./inbound-tag-untag/02.json'),
			require('./inbound-tag-untag/03.json')
		]
	},
	outbound: {
		expected: require('./outbound/expected.json'),
		steps: [
			require('./outbound/01.json'),
			require('./outbound/02.json')
		]
	},
	'inbound-comment-comment': {
		expected: require('./inbound-comment-comment/expected.json'),
		steps: [
			require('./inbound-comment-comment/01.json'),
			require('./inbound-comment-comment/02.json'),
			require('./inbound-comment-comment/03.json')
		]
	},
	'inbound-archive-message': {
		expected: require('./inbound-archive-message/expected.json'),
		steps: [
			require('./inbound-archive-message/01.json'),
			require('./inbound-archive-message/02.json'),
			require('./inbound-archive-message/03.json'),
			require('./inbound-archive-message/04.json'),
			require('./inbound-archive-message/05.json')
		]
	},
	'inbound-delete-message': {
		expected: require('./inbound-delete-message/expected.json'),
		steps: [
			require('./inbound-delete-message/01.json'),
			require('./inbound-delete-message/02.json'),
			require('./inbound-delete-message/03.json'),
			require('./inbound-delete-message/04.json'),
			require('./inbound-delete-message/05.json')
		]
	},
	'discourse-topic-message': {
		expected: require('./discourse-topic-message/expected.json'),
		steps: [
			require('./discourse-topic-message/01.json'),
			require('./discourse-topic-message/02.json'),
			require('./discourse-topic-message/03.json'),
			require('./discourse-topic-message/04.json'),
			require('./discourse-topic-message/05.json')
		]
	},
	reminder: {
		expected: require('./reminder/expected.json'),
		steps: [
			require('./reminder/01.json'),
			require('./reminder/02.json')
		]
	},
	'intercom-rule-reopen': {
		expected: require('./intercom-rule-reopen/expected.json'),
		steps: [
			require('./intercom-rule-reopen/01.json')
		]
	},
	'intercom-no-author': {
		expected: require('./intercom-no-author/expected.json'),
		steps: [
			require('./intercom-no-author/01.json')
		]
	}
}
