import * as ava from 'ava';
import * as _ from 'lodash';
import * as stringTesters from '../../lib/utils/string-testers';

function testStrings(testStrings: string[], testFunction: (focus: string) => boolean, expectation: boolean) {
	return (test: ava.AssertContext) => {
		const expectations = _.fill(_.clone(testStrings), expectation);
		const results = _.map(testStrings, testFunction);
		test.deepEqual(results, expectations);
	};
}

ava.test('stringTesters.isUrl() should pass example good urls', testStrings(
	[
		'http://example.com',
		'https://example.com',
		'http://example.com/path',
		'http://example.com/index.html',
		'http://example.com?foo=bar',
		'http://example.com#anchor',
	],
	stringTesters.isUrl,
	true,
));

ava.test('stringTesters.isUrl() should fail example bad urls', testStrings(
	[
		'not a url',
		'http:/example.com',
		'http://example.com duff',
	],
	stringTesters.isUrl,
	false,
));

ava.test('stringTesters.isSingleLine() should pass example single line strings', testStrings(
	[
		'not a url',
		'http:/example.com',
		'http://example.com duff',
	],
	stringTesters.isSingleLine,
	true,
));

ava.test('stringTesters.isSingleLine() should fail example multi line strings', testStrings(
	[
		'line one\rline two',
		'line one\nline two',
		'line one\r\nline two',
		'line one\n\rline two',
	],
	stringTesters.isSingleLine,
	false,
));

ava.test('stringTesters.isSlug() should pass example slugs', testStrings(
	[
		'abc',
		'not-a-url',
		'http-example-com',
		'abc-123',
	],
	stringTesters.isSlug,
	true,
));

ava.test('stringTesters.isSlug() should fail example non-slug strings', testStrings(
	[
		'',
		'CapitalLetters',
		'has spaces',
		'http://example.com',
		'under_score',
	],
	stringTesters.isSlug,
	false,
));

ava.test('stringTesters.hasSpace() should pass example strings with whitespace', testStrings(
	[
		'not a url',
		'http://example.com duff',
	],
	stringTesters.hasSpace,
	true,
));

ava.test('stringTesters.hasSpace() should fail example strings without whitespace', testStrings(
	[
		'foo',
		'http://example.com',
	],
	stringTesters.hasSpace,
	false,
));

ava.test('stringTesters.isTime() should pass example time strings', testStrings(
	[
		'2018-07-30T16:39:12Z',
	],
	stringTesters.isTime,
	true,
));

ava.test('stringTesters.isTime() should fail example non-time strings', testStrings(
	[
		'not a url',
		'http:/example.com',
		'http://example.com duff',
	],
	stringTesters.isTime,
	false,
));

ava.test('stringTesters.hasContent() should pass example strings with content', testStrings(
	[
		'not a url',
		'http:/example.com',
		'http://example.com duff',
	],
	stringTesters.hasContent,
	true,
));

ava.test('stringTesters.hasContent() should fail pure whitespace strings', testStrings(
	[
		'',
		' ',
		'	',
		'\r\n',
	],
	stringTesters.hasContent,
	false,
));
