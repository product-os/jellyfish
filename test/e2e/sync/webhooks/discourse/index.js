/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	'inbound-preview': {
		expected: require('./inbound-preview/expected.json'),
		steps: [
			require('./inbound-preview/01.json'),
			require('./inbound-preview/02.json'),
			require('./inbound-preview/03.json')
		]
	},
	'inbound-emoji': {
		expected: require('./inbound-emoji/expected.json'),
		steps: [
			require('./inbound-emoji/01.json'),
			require('./inbound-emoji/02.json')
		]
	},
	'inbound-whisper-emoji': {
		expected: require('./inbound-whisper-emoji/expected.json'),
		steps: [
			require('./inbound-whisper-emoji/01.json'),
			require('./inbound-whisper-emoji/02.json'),
			require('./inbound-whisper-emoji/03.json')
		]
	},
	'inbound-delete-topic': {
		expected: require('./inbound-delete-topic/expected.json'),
		steps: [
			require('./inbound-delete-topic/01.json'),
			require('./inbound-delete-topic/02.json'),
			require('./inbound-delete-topic/03.json')
		]
	},
	'external-inbound-message': {
		expected: require('./external-inbound-message/expected.json'),
		steps: [
			require('./external-inbound-message/01.json'),
			require('./external-inbound-message/02.json'),
			require('./external-inbound-message/03.json')
		]
	},
	'external-inbound-whisper-eventual-post-stream': {
		expected: require('./external-inbound-whisper-eventual-post-stream/expected.json'),
		steps: [
			require('./external-inbound-whisper-eventual-post-stream/01.json'),
			require('./external-inbound-whisper-eventual-post-stream/02.json'),
			require('./external-inbound-whisper-eventual-post-stream/03.json')
		]
	},
	'external-inbound-whisper': {
		expected: require('./external-inbound-whisper/expected.json'),
		steps: [
			require('./external-inbound-whisper/01.json'),
			require('./external-inbound-whisper/02.json'),
			require('./external-inbound-whisper/03.json')
		]
	},
	'inbound-attachment-file': {
		expected: require('./inbound-attachment-file/expected.json'),
		steps: [
			require('./inbound-attachment-file/01.json'),
			require('./inbound-attachment-file/02.json')
		]
	},
	'inbound-attachment-image': {
		expected: require('./inbound-attachment-image/expected.json'),
		steps: [
			require('./inbound-attachment-image/01.json'),
			require('./inbound-attachment-image/02.json')
		]
	},
	'inbound-edit-description': {
		expected: require('./inbound-edit-description/expected.json'),
		steps: [
			require('./inbound-edit-description/01.json'),
			require('./inbound-edit-description/02.json'),
			require('./inbound-edit-description/03.json'),
			require('./inbound-edit-description/04.json'),
			require('./inbound-edit-description/05.json')
		]
	},
	'inbound-edit-title': {
		expected: require('./inbound-edit-title/expected.json'),
		steps: [
			require('./inbound-edit-title/01.json'),
			require('./inbound-edit-title/02.json'),
			require('./inbound-edit-title/03.json'),
			require('./inbound-edit-title/04.json')
		]
	},
	'inbound-message-attachment-file': {
		expected: require('./inbound-message-attachment-file/expected.json'),
		steps: [
			require('./inbound-message-attachment-file/01.json'),
			require('./inbound-message-attachment-file/02.json'),
			require('./inbound-message-attachment-file/03.json')
		]
	},
	'inbound-message-attachment-image': {
		expected: require('./inbound-message-attachment-image/expected.json'),
		steps: [
			require('./inbound-message-attachment-image/01.json'),
			require('./inbound-message-attachment-image/02.json'),
			require('./inbound-message-attachment-image/03.json')
		]
	},
	'inbound-message-delete-undo': {
		expected: require('./inbound-message-delete-undo/expected.json'),
		steps: [
			require('./inbound-message-delete-undo/01.json'),
			require('./inbound-message-delete-undo/02.json'),
			require('./inbound-message-delete-undo/03.json'),
			require('./inbound-message-delete-undo/04.json'),
			require('./inbound-message-delete-undo/05.json')
		]
	},
	'inbound-message-delete': {
		expected: require('./inbound-message-delete/expected.json'),
		steps: [
			require('./inbound-message-delete/01.json'),
			require('./inbound-message-delete/02.json'),
			require('./inbound-message-delete/03.json'),
			require('./inbound-message-delete/04.json')
		]
	},
	'inbound-message-edit': {
		expected: require('./inbound-message-edit/expected.json'),
		steps: [
			require('./inbound-message-edit/01.json'),
			require('./inbound-message-edit/02.json'),
			require('./inbound-message-edit/03.json'),
			require('./inbound-message-edit/04.json')
		]
	},
	'inbound-tag-tag': {
		expected: require('./inbound-tag-tag/expected.json'),
		steps: [
			require('./inbound-tag-tag/01.json'),
			require('./inbound-tag-tag/02.json'),
			require('./inbound-tag-tag/03.json'),
			require('./inbound-tag-tag/04.json'),
			require('./inbound-tag-tag/05.json')
		]
	},
	'inbound-tag-untag': {
		expected: require('./inbound-tag-untag/expected.json'),
		steps: [
			require('./inbound-tag-untag/01.json'),
			require('./inbound-tag-untag/02.json'),
			require('./inbound-tag-untag/03.json'),
			require('./inbound-tag-untag/04.json'),
			require('./inbound-tag-untag/05.json')
		]
	},
	'inbound-whisper-delete': {
		expected: require('./inbound-whisper-delete/expected.json'),
		steps: [
			require('./inbound-whisper-delete/01.json'),
			require('./inbound-whisper-delete/02.json'),
			require('./inbound-whisper-delete/03.json'),
			require('./inbound-whisper-delete/04.json')
		]
	},
	'inbound-whisper-edit': {
		expected: require('./inbound-whisper-edit/expected.json'),
		steps: [
			require('./inbound-whisper-edit/01.json'),
			require('./inbound-whisper-edit/02.json'),
			require('./inbound-whisper-edit/03.json'),
			require('./inbound-whisper-edit/04.json')
		]
	},
	'inbound-with-tag': {
		expected: require('./inbound-with-tag/expected.json'),
		steps: [
			require('./inbound-with-tag/01.json'),
			require('./inbound-with-tag/02.json')
		]
	},
	'inbound-with-tags': {
		expected: require('./inbound-with-tags/expected.json'),
		steps: [
			require('./inbound-with-tags/01.json'),
			require('./inbound-with-tags/02.json')
		]
	},
	'internal-inbound-message-whisper': {
		expected: require('./internal-inbound-message-whisper/expected.json'),
		steps: [
			require('./internal-inbound-message-whisper/01.json'),
			require('./internal-inbound-message-whisper/02.json'),
			require('./internal-inbound-message-whisper/03.json'),
			require('./internal-inbound-message-whisper/04.json')
		]
	}
}
