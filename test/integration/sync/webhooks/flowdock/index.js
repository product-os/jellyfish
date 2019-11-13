/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	'new-message-containing-emoji': {
		expected: require('./new-message-containing-emoji/expected.json'),
		steps: [
			require('./new-message-containing-emoji/01.json')
		]
	},
	'new-message-containing-markdown': {
		expected: require('./new-message-containing-markdown/expected.json'),
		steps: [
			require('./new-message-containing-markdown/01.json')
		]
	},
	'new-message-containing-triple-backticks': {
		expected: require('./new-message-containing-triple-backticks/expected.json'),
		steps: [
			require('./new-message-containing-triple-backticks/01.json')
		]
	},
	'new-message-no-ping-edit-to-ping': {
		expected: require('./new-message-no-ping-edit-to-ping/expected.json'),
		steps: [
			require('./new-message-no-ping-edit-to-ping/01.json'),
			require('./new-message-no-ping-edit-to-ping/02.json'),
			require('./new-message-no-ping-edit-to-ping/03.json')
		]
	},
	'new-message-pinging-non-existent-user': {
		expected: require('./new-message-pinging-non-existent-user/expected.json'),
		steps: [
			require('./new-message-pinging-non-existent-user/01.json')
		]
	},
	'new-message-pinging-user-and-sees-the-message': {
		expected: require('./new-message-pinging-user-and-sees-the-message/expected.json'),
		steps: [
			require('./new-message-pinging-user-and-sees-the-message/01.json'),
			require('./new-message-pinging-user-and-sees-the-message/02.json')
		]
	},
	'new-message-with-2-emoji-reactions': {
		expected: require('./new-message-with-2-emoji-reactions/expected.json'),
		steps: [
			require('./new-message-with-2-emoji-reactions/01.json'),
			require('./new-message-with-2-emoji-reactions/02.json'),
			require('./new-message-with-2-emoji-reactions/03.json')
		]
	},
	'new-message-with-big-body': {
		expected: require('./new-message-with-big-body/expected.json'),
		steps: [
			require('./new-message-with-big-body/01.json')
		]
	},
	'new-message-with-emoji-reaction': {
		expected: require('./new-message-with-emoji-reaction/expected.json'),
		steps: [
			require('./new-message-with-emoji-reaction/01.json'),
			require('./new-message-with-emoji-reaction/02.json')
		]
	},
	'new-message-with-file-attachment': {
		expected: require('./new-message-with-file-attachment/expected.json'),
		steps: [
			require('./new-message-with-file-attachment/01.json')
		]
	},
	'new-message-with-image-attachment': {
		expected: require('./new-message-with-image-attachment/expected.json'),
		steps: [
			require('./new-message-with-image-attachment/01.json')
		]
	},
	'new-message-with-one-tag': {
		expected: require('./new-message-with-one-tag/expected.json'),
		steps: [
			require('./new-message-with-one-tag/01.json')
		]
	},
	'new-message-with-reaction-from-another-user': {
		expected: require('./new-message-with-reaction-from-another-user/expected.json'),
		steps: [
			require('./new-message-with-reaction-from-another-user/01.json'),
			require('./new-message-with-reaction-from-another-user/02.json')
		]
	},
	'new-message-with-reaction-from-another-user-and-undo': {
		expected: require('./new-message-with-reaction-from-another-user-and-undo/expected.json'),
		steps: [
			require('./new-message-with-reaction-from-another-user-and-undo/01.json'),
			require('./new-message-with-reaction-from-another-user-and-undo/02.json'),
			require('./new-message-with-reaction-from-another-user-and-undo/03.json')
		]
	},
	'new-message-with-reply-and-delete-reply': {
		expected: require('./new-message-with-reply-and-delete-reply/expected.json'),
		steps: [
			require('./new-message-with-reply-and-delete-reply/01.json'),
			require('./new-message-with-reply-and-delete-reply/02.json'),
			require('./new-message-with-reply-and-delete-reply/03.json')
		]
	},
	'new-message-with-reply-and-edit-reply': {
		expected: require('./new-message-with-reply-and-edit-reply/expected.json'),
		steps: [
			require('./new-message-with-reply-and-edit-reply/01.json'),
			require('./new-message-with-reply-and-edit-reply/02.json'),
			require('./new-message-with-reply-and-edit-reply/03.json')
		]
	},
	'new-message-with-tag-and-edit-to-remove-tag': {
		expected: require('./new-message-with-tag-and-edit-to-remove-tag/expected.json'),
		steps: [
			require('./new-message-with-tag-and-edit-to-remove-tag/01.json'),
			require('./new-message-with-tag-and-edit-to-remove-tag/02.json'),
			require('./new-message-with-tag-and-edit-to-remove-tag/03.json')
		]
	},
	'new-message-with-two-tags': {
		expected: require('./new-message-with-two-tags/expected.json'),
		steps: [
			require('./new-message-with-two-tags/01.json')
		]
	},
	'new-message-without-whispers': {
		expected: require('./new-message-without-whispers/expected.json'),
		steps: [
			require('./new-message-without-whispers/01.json'),
			require('./new-message-without-whispers/02.json')
		]
	},
	'new-thread-non-whisper-and-whisper': {
		expected: require('./new-thread-non-whisper-and-whisper/expected.json'),
		steps: [
			require('./new-thread-non-whisper-and-whisper/01.json'),
			require('./new-thread-non-whisper-and-whisper/02.json')
		]
	},
	'new-thread-starting-with-double-percentage': {
		expected: require('./new-thread-starting-with-double-percentage/expected.json'),
		steps: [
			require('./new-thread-starting-with-double-percentage/01.json')
		]
	},
	'new-thread-starting-with-space-percentage': {
		expected: require('./new-thread-starting-with-space-percentage/expected.json'),
		steps: [
			require('./new-thread-starting-with-space-percentage/01.json')
		]
	},
	'new-thread-with-message': {
		expected: require('./new-thread-with-message/expected.json'),
		steps: [
			require('./new-thread-with-message/01.json')
		]
	},
	'new-thread-with-message-and-delete': {
		expected: require('./new-thread-with-message-and-delete/expected.json'),
		steps: [
			require('./new-thread-with-message-and-delete/01.json'),
			require('./new-thread-with-message-and-delete/02.json')
		]
	},
	'new-thread-with-message-and-edit': {
		expected: require('./new-thread-with-message-and-edit/expected.json'),
		steps: [
			require('./new-thread-with-message-and-edit/01.json'),
			require('./new-thread-with-message-and-edit/02.json')
		]
	},
	'new-thread-with-message-and-other-user-reply': {
		expected: require('./new-thread-with-message-and-other-user-reply/expected.json'),
		steps: [
			require('./new-thread-with-message-and-other-user-reply/01.json'),
			require('./new-thread-with-message-and-other-user-reply/02.json')
		]
	},
	'new-thread-with-message-and-reply': {
		expected: require('./new-thread-with-message-and-reply/expected.json'),
		steps: [
			require('./new-thread-with-message-and-reply/01.json'),
			require('./new-thread-with-message-and-reply/02.json')
		]
	},
	'new-thread-with-message-pinging-2-people': {
		expected: require('./new-thread-with-message-pinging-2-people/expected.json'),
		steps: [
			require('./new-thread-with-message-pinging-2-people/01.json')
		]
	},
	'new-thread-with-message-pinging-myself': {
		expected: require('./new-thread-with-message-pinging-myself/expected.json'),
		steps: [
			require('./new-thread-with-message-pinging-myself/01.json')
		]
	},
	'new-thread-with-message-pinging-testbot': {
		expected: require('./new-thread-with-message-pinging-testbot/expected.json'),
		steps: [
			require('./new-thread-with-message-pinging-testbot/01.json')
		]
	}
}
