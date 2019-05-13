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

ava('.parseHTML() should parse <code> correctly', (test) => {
	const string = '<div><p>Foo <code>bar</code> baz</p>\n</div>'
	const expected = 'Foo `bar` baz'
	const result = utils.parseHTML(string)
	test.is(result, expected)
})

ava('.parseHTML() should parse a root relative link without a base url', (test) => {
	// eslint-disable-next-line max-len
	const string = '<p><a class="attachment" href="/uploads/balena/original/2X/1/1179cf7f41c08ea5f3c31b200b8002a77f44269d.pdf">pcasm-book.pdf</a> (1.0 MB)</p>'
	// eslint-disable-next-line max-len
	const expected = '[pcasm-book.pdf](/uploads/balena/original/2X/1/1179cf7f41c08ea5f3c31b200b8002a77f44269d.pdf) (1.0 MB)'
	const result = utils.parseHTML(string)
	test.is(result, expected)
})

ava('.parseHTML() should parse a root relative link with a base url', (test) => {
	// eslint-disable-next-line max-len
	const string = '<p><a class="attachment" href="/uploads/balena/original/2X/1/1179cf7f41c08ea5f3c31b200b8002a77f44269d.pdf">pcasm-book.pdf</a> (1.0 MB)</p>'
	// eslint-disable-next-line max-len
	const expected = '[pcasm-book.pdf](https://jel.ly.fish/uploads/balena/original/2X/1/1179cf7f41c08ea5f3c31b200b8002a77f44269d.pdf) (1.0 MB)'
	const result = utils.parseHTML(string, {
		baseUrl: 'https://jel.ly.fish'
	})

	test.is(result, expected)
})

ava('.parseHTML() should parse a relative link without a base url', (test) => {
	// eslint-disable-next-line max-len
	const string = '<p><a class="attachment" href="uploads/balena/original/2X/1/1179cf7f41c08ea5f3c31b200b8002a77f44269d.pdf">pcasm-book.pdf</a> (1.0 MB)</p>'
	// eslint-disable-next-line max-len
	const expected = '[pcasm-book.pdf](uploads/balena/original/2X/1/1179cf7f41c08ea5f3c31b200b8002a77f44269d.pdf) (1.0 MB)'
	const result = utils.parseHTML(string)
	test.is(result, expected)
})

ava('.parseHTML() should parse a relative link with a base url', (test) => {
	// eslint-disable-next-line max-len
	const string = '<p><a class="attachment" href="uploads/balena/original/2X/1/1179cf7f41c08ea5f3c31b200b8002a77f44269d.pdf">pcasm-book.pdf</a> (1.0 MB)</p>'
	// eslint-disable-next-line max-len
	const expected = '[pcasm-book.pdf](https://jel.ly.fish/uploads/balena/original/2X/1/1179cf7f41c08ea5f3c31b200b8002a77f44269d.pdf) (1.0 MB)'
	const result = utils.parseHTML(string, {
		baseUrl: 'https://jel.ly.fish'
	})

	test.is(result, expected)
})

ava('.parseHTML() should parse a root relative image without a base url', (test) => {
	// eslint-disable-next-line max-len
	const string = '<p><img src="/uploads/balena/original/2X/1/1105c95e7f862b9b5372d1691f9f5e9cd434eb5b.png" alt="46" width="690" height="431"></p>'
	// eslint-disable-next-line max-len
	const expected = '<img src="/uploads/balena/original/2X/1/1105c95e7f862b9b5372d1691f9f5e9cd434eb5b.png" alt="46" width="690" height="431">'
	const result = utils.parseHTML(string)
	test.is(result, expected)
})

ava('.parseHTML() should parse a root relative image with a base url', (test) => {
	// eslint-disable-next-line max-len
	const string = '<p><img src="/uploads/balena/original/2X/1/1105c95e7f862b9b5372d1691f9f5e9cd434eb5b.png" alt="46" width="690" height="431"></p>'
	// eslint-disable-next-line max-len
	const expected = '<img src="https://jel.ly.fish/uploads/balena/original/2X/1/1105c95e7f862b9b5372d1691f9f5e9cd434eb5b.png" alt="46" width="690" height="431">'

	const result = utils.parseHTML(string, {
		baseUrl: 'https://jel.ly.fish'
	})

	test.is(result, expected)
})

ava('.parseHTML() should parse a relative image without a base url', (test) => {
	// eslint-disable-next-line max-len
	const string = '<p><img src="uploads/balena/original/2X/1/1105c95e7f862b9b5372d1691f9f5e9cd434eb5b.png" alt="46" width="690" height="431"></p>'
	// eslint-disable-next-line max-len
	const expected = '<img src="uploads/balena/original/2X/1/1105c95e7f862b9b5372d1691f9f5e9cd434eb5b.png" alt="46" width="690" height="431">'
	const result = utils.parseHTML(string)
	test.is(result, expected)
})

ava('.parseHTML() should parse a relative image with a base url', (test) => {
	// eslint-disable-next-line max-len
	const string = '<p><img src="uploads/balena/original/2X/1/1105c95e7f862b9b5372d1691f9f5e9cd434eb5b.png" alt="46" width="690" height="431"></p>'
	// eslint-disable-next-line max-len
	const expected = '<img src="https://jel.ly.fish/uploads/balena/original/2X/1/1105c95e7f862b9b5372d1691f9f5e9cd434eb5b.png" alt="46" width="690" height="431">'
	const result = utils.parseHTML(string, {
		baseUrl: 'https://jel.ly.fish'
	})

	test.is(result, expected)
})

ava('.parseHTML() should remove style tags', (test) => {
	const string = `
	<div>\r
		<div>\r\r\r
			<style>
			.foo {
				color: red;
			}
			</style>\r
		</div>\r
		<div lang="EN-US" class="foo">Hello</div>
	</div>`
	// eslint-disable-next-line max-len
	const expected = 'Hello'
	const result = utils.parseHTML(string, {
		baseUrl: 'https://jel.ly.fish'
	})

	test.is(result, expected)
})

ava('.parseHTML() should strip out 1x1px images', (test) => {
	// eslint-disable-next-line max-len
	const string = '<img border="0" width="1" height="1" style="width:.0104in;height:.0104in" id="_x0000_i1072" src="foo.png"><p>Hello</p>'
	const expected = 'Hello'
	const result = utils.parseHTML(string, {
		baseUrl: 'https://jel.ly.fish'
	})

	test.is(result, expected)
})
