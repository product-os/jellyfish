/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const utils = require('../../../../lib/sync/integrations/utils')

ava('.parseHTML() should parse a message with code blocks', (test) => {
	// eslint-disable-next-line max-len
	const string = '<div><p>According to the open man page (<code>man 2 open</code>):</p>\n<pre><code>O_EXCL Ensure that this call creates the file: if this flag is specified in conjunction with O_CREAT, and pathname already exists, then open() fails with the error EEXIST.\n</code></pre>\n</div>'
	// eslint-disable-next-line max-len
	const expected = 'According to the open man page (`man 2 open`):\n\n```\nO_EXCL Ensure that this call creates the file: if this flag is specified in conjunction with O_CREAT, and pathname already exists, then open() fails with the error EEXIST.\n\n```'
	const result = utils.parseHTML(string)
	test.is(result, expected)
})

ava('.parseHTML() should parse a message <br> and new lines', (test) => {
	// eslint-disable-next-line max-len
	const string = '<div><p>Hi again,<br>\nWould you mind pasting the full configuration file so we can see exactly how the connection is being created?<br>\nThanks!</p>\n</div>'
	// eslint-disable-next-line max-len
	const expected = 'Hi again,\nWould you mind pasting the full configuration file so we can see exactly how the connection is being created?\nThanks!'
	const result = utils.parseHTML(string)
	test.is(result, expected)
})

ava('.parseHTML() should parse <p>\\n correctly', (test) => {
	const string = '<div><p>Foo</p>\n<p>Bar</p>\n<p>Baz</p>\n</div>'
	const expected = 'Foo\n\nBar\n\nBaz'
	const result = utils.parseHTML(string)
	test.is(result, expected)
})
