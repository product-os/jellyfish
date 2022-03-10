import _ from 'lodash';
import format from 'date-fns/format';
import sub from 'date-fns/sub';
import add from 'date-fns/add';
import * as helpers from './helpers';
import type { JsonSchema } from '@balena/jellyfish-types';
import type { UserContract } from '@balena/jellyfish-types/build/core';

const user = {
	slug: 'user',
	type: 'type@1.0.0',
	version: '1.0.0',
	name: 'Jellyfish User',
	data: {
		schema: {
			type: 'object',
			properties: {
				data: {
					type: 'object',
					properties: {
						status: {
							oneOf: [
								{
									type: 'object',
									properties: {
										title: {
											type: 'string',
											const: 'Do Not Disturb',
										},
										value: {
											type: 'string',
											const: 'DoNotDisturb',
										},
									},
								},
								{
									type: 'object',
									properties: {
										title: {
											type: 'string',
											const: 'On Annual Leave',
										},
										value: {
											type: 'string',
											const: 'AnnualLeave',
										},
									},
								},
								{
									type: 'object',
									properties: {
										title: {
											type: 'string',
											const: 'In a Meeting',
										},
										value: {
											type: 'string',
											const: 'Meeting',
										},
									},
								},
								{
									type: 'object',
									properties: {
										title: {
											type: 'string',
											const: 'Available',
										},
										value: {
											type: 'string',
											const: 'Available',
										},
									},
								},
							],
						},
					},
				},
			},
		},
	},
};

const user1: UserContract = {
	id: '2',
	name: 'Test user',
	slug: 'user-1',
	tags: [],
	type: 'user@1.0.0',
	active: true,
	version: '1.0.0',
	requires: [],
	linked_at: {},
	created_at: '2021-07-07T02:01:55.725Z',
	updated_at: null,
	markers: [],
	capabilities: [],
	data: {
		hash: '1234',
		roles: [],
	},
};

test('.slugify replaces non text with hyphens', () => {
	expect(helpers.slugify('balena []{}#@io')).toBe('balena-io');
});

test('.slugify converts text to lowercase', () => {
	expect(helpers.slugify('Balena IO')).toBe('balena-io');
});

test('.slugify strips any trailing spaces', () => {
	expect(helpers.slugify('balena ')).toBe('balena');
});

test('formatTimestamp returns time if date is today', () => {
	const timestamp = new Date();
	timestamp.setHours(2);
	timestamp.setMinutes(34);
	const formatted = helpers.formatTimestamp(timestamp.toISOString(), true);
	expect(formatted).toBe('at 02:34');
});

test('formatTimestamp returns full time if date is not today', () => {
	const timestamp = sub(new Date(), {
		days: 2,
	});
	const formatted = helpers.formatTimestamp(timestamp.toISOString(), true);

	// Not ideal but easiest way to avoid timezone issues
	expect(formatted).toBe(`on ${format(timestamp, 'MMM do, yyyy HH:mm')}`);
});

test('timeAgo returns empty string if invalid timestamp is provided', () => {
	expect(helpers.timeAgo('abcd')).toBe('');
	expect(helpers.timeAgo(null)).toBe('');
	// eslint-disable-next-line no-undefined
	expect(helpers.timeAgo(undefined)).toBe('');
});

test('timeAgo can return time in the past', () => {
	const timestamp = sub(new Date(), {
		hours: 1,
		minutes: 1,
	});
	expect(helpers.timeAgo(timestamp.toISOString())).toBe('about 1 hour ago');
});

test('timeAgo can return time in the future', () => {
	const timestamp = add(new Date(), {
		hours: 1,
		minutes: 1,
	});
	expect(helpers.timeAgo(timestamp.toISOString())).toBe('in about 1 hour');
});

test('.isCustomView returns true if view is custom', () => {
	const view: any = {
		slug: 'view-user-created-view-1',
		markers: [user.slug],
	};
	expect(helpers.isCustomView(view, user.slug)).toBe(true);
});

test('.isCustomView returns false if view is not user-created', () => {
	const view: any = {
		slug: 'view-2',
		markers: [user.slug],
	};
	expect(helpers.isCustomView(view, user.slug)).toBe(false);
});

test('.isCustomView returns false if user is not the only marker', () => {
	const view: any = {
		slug: 'view-user-created-view-1',
		markers: [user.slug, 'org-balena'],
	};
	expect(helpers.isCustomView(view, user.slug)).toBe(false);
});

test('.replaceEmoji replaces colon-encoded emoji but leaves unknown ones untouched', () => {
	expect(helpers.replaceEmoji('Test :+1: :unknown:')).toBe('Test 👍 :unknown:');
});

test('.createPrefixRegExp() match underscore characters', () => {
	const matchRE = helpers.createPrefixRegExp('@');
	const match = matchRE.exec('Lorem ipsum @user_name dolor sit amet');

	expect(match![2]).toEqual('@user_name');
});

test('.createPrefixRegExp() match period characters', () => {
	const matchRE = helpers.createPrefixRegExp('@');
	const match = matchRE.exec('Lorem ipsum @user.name dolor sit amet');

	expect(match![2]).toEqual('@user.name');
});

test('.createFullTextSearchFilter() uses regex by default on string properties', () => {
	const searchTerm = 'test';
	const schema: any = {
		properties: {
			title: {
				type: 'string',
			},
		},
	};
	const filter: any = helpers.createFullTextSearchFilter(schema, searchTerm);
	expect(filter.anyOf[0].properties.title.regexp.pattern).toBe(searchTerm);
});

test('.createFullTextSearchFilter() uses regex on properties where the type array includes string', () => {
	const searchTerm = 'test';
	const schema: any = {
		properties: {
			title: {
				type: ['array', 'string'],
			},
		},
	};
	const filter: any = helpers.createFullTextSearchFilter(schema, searchTerm);
	expect(filter.anyOf[0].properties.title.regexp.pattern).toBe(searchTerm);
});

test('.createFullTextSearchFilter() includes ID if the includeIdAndSlugs option is set and search term is a UUID', () => {
	const searchTerm = '48f776bc-5a32-4187-9623-9dc0b2b27783';
	const schema: JsonSchema = {
		properties: {
			title: {
				type: 'string',
			},
		},
	};
	const filter = helpers.createFullTextSearchFilter(schema, searchTerm, {
		includeIdAndSlug: true,
	});
	if (typeof filter !== 'object') {
		throw new Error();
	}
	expect(filter!.anyOf!.length).toBe(2);
	expect(
		_.find(filter!.anyOf, {
			properties: {
				title: {
					regexp: {
						pattern: searchTerm,
					},
				},
			},
		}),
	).toBeTruthy();
	expect(
		_.find(filter!.anyOf, {
			properties: {
				id: {
					const: searchTerm,
				},
			},
		}),
	).toBeTruthy();
	expect(
		_.find(filter!.anyOf, {
			properties: {
				slug: {
					const: searchTerm,
				},
			},
		}),
	).toBeUndefined();
});

test('.createFullTextSearchFilter() only creates one filter for slug if the includeIdAndSlugs option is set', () => {
	const searchTerm = 'test';
	const schema: JsonSchema = {
		properties: {
			slug: {
				type: 'string',
				fullTextSearch: true,
			},
		},
	};
	const filter = helpers.createFullTextSearchFilter(schema, searchTerm, {
		includeIdAndSlug: true,
	});
	if (typeof filter !== 'object') {
		throw new Error();
	}
	expect(filter!.anyOf!.length).toBe(1);
	expect(
		_.find(filter!.anyOf, {
			properties: {
				id: {
					const: searchTerm,
				},
			},
		}),
	).toBeUndefined();
	expect(
		_.find(filter!.anyOf, {
			properties: {
				slug: {
					fullTextSearch: {
						term: searchTerm,
					},
				},
			},
		}),
	).toBeTruthy();
});

test(".createFullTextSearchFilter() uses fullTextSearch on string properties with the 'fullTextSearch' field set", () => {
	const searchTerm = 'test';
	const schema: any = {
		properties: {
			title: {
				type: 'string',
				fullTextSearch: true,
			},
		},
	};
	const filter: any = helpers.createFullTextSearchFilter(schema, searchTerm);
	expect(filter.anyOf[0].properties.title.fullTextSearch.term).toBe(searchTerm);
});

test(".createFullTextSearchFilter() only filters on fullTextSearch fields if any 'fullTextSearch' field found", () => {
	const searchTerm = 'test';
	const schema: any = {
		properties: {
			title: {
				type: 'string',
				fullTextSearch: true,
			},
			description: {
				type: 'string',
			},
		},
	};
	const filter: any = helpers.createFullTextSearchFilter(schema, searchTerm);
	expect(filter.anyOf.length).toBe(1);
	expect(filter.anyOf[0].properties.title.fullTextSearch.term).toBe(searchTerm);
});

test('.createFullTextSearchFilter() works on deeply nested objects', () => {
	const searchTerm = 'test';
	const schema: any = {
		properties: {
			title: {
				type: 'object',
				properties: {
					label: {
						type: 'string',
					},
				},
			},
		},
	};
	const filter: any = helpers.createFullTextSearchFilter(schema, searchTerm);
	expect(filter.anyOf[0].properties.title.properties.label.regexp.pattern).toBe(
		searchTerm,
	);
});

test('.createFullTextSearchFilter() returns null if no fullTextSearch fields and fullTextSearchFieldsOnly is set', () => {
	const searchTerm = 'test';
	const schema: any = {
		properties: {
			title: {
				type: 'string',
			},
		},
	};
	const filter: any = helpers.createFullTextSearchFilter(schema, searchTerm, {
		fullTextSearchFieldsOnly: true,
	});
	expect(filter).toBe(null);
});

test(".createFullTextSearchFilter() works on arrays of strings with the 'fullTextSearch' field set on the array", () => {
	const searchTerm = 'test';
	const schema: any = {
		properties: {
			folders: {
				type: 'array',
				fullTextSearch: true,
				items: {
					type: 'string',
				},
			},
		},
	};
	const filter: any = helpers.createFullTextSearchFilter(schema, searchTerm);
	expect(filter.anyOf[0].properties.folders.contains.fullTextSearch.term).toBe(
		searchTerm,
	);
});

test(".createFullTextSearchFilter() works on arrays of strings with the 'fullTextSearch' field set on the array inside oneOf", () => {
	const searchTerm = 'test';
	const schema: any = {
		properties: {
			folders: {
				oneOf: [
					{
						type: 'array',
						fullTextSearch: true,
						items: {
							type: 'string',
						},
					},
					{
						type: 'string',
					},
				],
			},
		},
	};
	const filter: any = helpers.createFullTextSearchFilter(schema, searchTerm);
	expect(filter.anyOf.length).toBeGreaterThan(0);
	expect(filter.anyOf[0].properties.folders.contains.fullTextSearch.term).toBe(
		searchTerm,
	);
});

test(".createFullTextSearchFilter() works on arrays of strings with the 'fullTextSearch' field set on the array inside anyOf", () => {
	const searchTerm = 'test';
	const schema: any = {
		properties: {
			folders: {
				anyOf: [
					{
						type: 'array',
						fullTextSearch: true,
						items: {
							type: 'string',
						},
					},
					{
						type: 'string',
					},
				],
			},
		},
	};
	const filter: any = helpers.createFullTextSearchFilter(schema, searchTerm);
	expect(filter.anyOf.length).toBeGreaterThan(0);
	expect(filter.anyOf[0].properties.folders.contains.fullTextSearch.term).toBe(
		searchTerm,
	);
});

test('.createFullTextSearchFilter() works on arrays of strings', () => {
	const searchTerm = 'test';
	const schema: any = {
		properties: {
			folders: {
				type: 'array',
				items: {
					type: 'string',
				},
			},
		},
	};
	const filter: any = helpers.createFullTextSearchFilter(schema, searchTerm);
	expect(filter.anyOf[0].properties.folders.contains.regexp.pattern).toBe(
		searchTerm,
	);
});

// TODO: Unskip this test once we fix the flattening of arrays of objects.
test.skip('.createFullTextSearchFilter() works on arrays of objects', () => {
	const searchTerm = 'test';
	const schema: any = {
		properties: {
			folders: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						label: {
							type: 'string',
						},
					},
				},
			},
		},
	};
	const filter: any = helpers.createFullTextSearchFilter(schema, searchTerm);
	expect(filter.anyOf[0].properties.folders.items.label.regexp.pattern).toBe(
		searchTerm,
	);
});

test('.getUpdateObjectFromSchema() should parse the `const` keyword', () => {
	const schema: any = {
		type: 'object',
		properties: {
			type: {
				const: 'message@1.0.0',
			},
			data: {
				type: 'object',
				properties: {
					number: {
						const: 1,
					},
					string: {
						const: 'foobar',
					},
					boolean: {
						const: true,
					},
				},
			},
		},
	};

	const result = helpers.getUpdateObjectFromSchema(schema);

	expect(result).toEqual({
		type: 'message@1.0.0',
		data: {
			number: 1,
			string: 'foobar',
			boolean: true,
		},
	});
});

test('.getUpdateObjectFromSchema() should parse the `contains` keyword', () => {
	const schema: any = {
		type: 'object',
		properties: {
			tags: {
				contains: {
					const: 'i/frontend',
				},
			},
		},
	};

	const result = helpers.getUpdateObjectFromSchema(schema);

	expect(result).toEqual({
		tags: ['i/frontend'],
	});
});

test('.getSlugsByPrefix() should get user ids by parsing text', () => {
	const source = '@johndoe';

	const result = helpers.getSlugsByPrefix('@', source, 'user-');

	expect(result).toEqual(['user-johndoe']);
});

test('.getSlugsByPrefix() should return an array of unique values', () => {
	const source = '@johndoe @johndoe @janedoe';

	const result = helpers.getSlugsByPrefix('@', source, 'user-');

	expect(result).toEqual(['user-johndoe', 'user-janedoe']);
});

test('.getSlugsByPrefix() should be able to use an exclamation mark as a prefix', () => {
	const source = '!johndoe';

	const result = helpers.getSlugsByPrefix('!', source, 'user-');

	expect(result).toEqual(['user-johndoe']);
});

test('.findWordsByPrefix() should ignore # symbols in urls', () => {
	const source = 'http://localhost:9000/#/231cd14d-e92a-4a19-bf16-4ce2535bf5c8';

	expect(helpers.findWordsByPrefix('#', source)).toEqual([]);
});

test('.findWordsByPrefix() should ignore @ symbols in email addresses', () => {
	const source = 'test@example.com';

	expect(helpers.findWordsByPrefix('@', source)).toEqual([]);
});

test('.findWordsByPrefix() should ignore symbols with no following test', () => {
	const source = '!';

	expect(helpers.findWordsByPrefix('!', source)).toEqual([]);
});

test('.findWordsByPrefix() should trim leading space', () => {
	const source = 'Test #tag';
	expect(helpers.findWordsByPrefix('#', source)).toEqual(['#tag']);
});

test('.getUserStatuses() returns a dictionary of statuses if status is provided in schema', () => {
	const userStatuses = helpers.getUserStatuses(user);
	const dnd = userStatuses.DoNotDisturb;
	expect(dnd.title).toBe('Do Not Disturb');
	expect(dnd.value).toBe('DoNotDisturb');
});

test('.getUserStatuses() returns an empty object if status is missing from schema', () => {
	const userType = _.omit(
		user,
		'data.schema.properties.data.properties.status',
	);
	expect(helpers.getUserStatuses(userType)).toEqual({});
});

test('.getRelationshipTargetType() returns top level type if defined', () => {
	const relationship = {
		type: 'some-type@1.0.0',
	};
	expect(helpers.getRelationshipTargetType(relationship)).toBe('some-type');
});

test('.getRelationshipTargetType() returns query type if top level type not defined', () => {
	const relationship = {
		query: [
			{
				type: 'some-query-type@1.0.0',
			},
		],
	};
	expect(helpers.getRelationshipTargetType(relationship)).toBe(
		'some-query-type',
	);
});

test('getActorIdFromCard gets the actor from the card data first', () => {
	const card = {
		id: '1',
		data: {
			actor: 'test-actor-id',
		},
	};
	expect(helpers.getActorIdFromCard(card)).toBe('test-actor-id');
});

test('getActorIdFromCard gets the actor from the linked create card if card has no actor', () => {
	const card = {
		id: '2',
		data: {},
		links: {
			'has attached element': [
				{
					id: 'create-1',
					data: {
						actor: 'create-actor-id',
					},
					type: 'create@1.0.0',
				},
			],
		},
	};
	expect(helpers.getActorIdFromCard(card)).toBe('create-actor-id');
});

test('generateActorFromUserCard can generate name from slug', () => {
	const card: any = {
		slug: 'user-foobar',
		links: {
			'is member of': [
				{
					slug: 'org-balena',
				},
			],
		},
	};
	const actor: any = helpers.generateActorFromUserCard(card);
	expect(actor.name).toBe('foobar');
	expect(actor.proxy).toBe(false);
});

test('generateActorFromUserCard can generate name from handle', () => {
	const card: any = {
		slug: 'user-foobar',
		data: {
			handle: 'a-handle',
		},
	};
	const actor: any = helpers.generateActorFromUserCard(card);
	expect(actor.name).toBe('[a-handle]');
});

test('generateActorFromUserCard can generate name from email', () => {
	const card: any = {
		slug: 'user-foobar',
		data: {
			email: 'user@test.com',
		},
	};
	const actor: any = helpers.generateActorFromUserCard(card);
	expect(actor.name).toBe('[user@test.com]');
});

test('generateActorFromUserCard generates proxy, email and avatarUrl from card', () => {
	const card: any = {
		slug: 'user-foobar',
		data: {
			email: 'user@test.com',
			avatar: 'https://www.example.com',
		},
	};
	const actor: any = helpers.generateActorFromUserCard(card);
	expect(actor.avatarUrl).toBe('https://www.example.com');
	expect(actor.email).toBe('user@test.com');
	expect(actor.proxy).toBe(true);
});

test('.stringToNumber() should convert string to number', () => {
	const text = 'string of text';

	const result = helpers.stringToNumber(text, 10);

	expect(result).toEqual(0);
});

test('.stringToNumber() should convert string to number while not exeeding the maximum', () => {
	const max = 100;
	const array = [
		'What',
		'it',
		'means',
		'when',
		'media',
		'moves',
		'from',
		'the',
		'new',
		'to',
		'the',
		'habitual—when',
		'our',
		'bodies',
		'become',
		'archives',
		'of',
		'supposedly',
		'obsolescent',
		'media,',
		'streaming,',
		'updating,',
		'sharing,',
		'saving',
		'New',
		'media—we',
		'are',
		'told—exist',
		'at',
		'the',
		'bleeding',
		'edge',
		'of',
		'obsolescence.',
		'We',
		'thus',
		'forever',
		'try',
		'to',
		'catch',
		'up,',
		'updating',
		'to',
		'remain',
		'the',
		'same.',
		'Meanwhile,',
		'analytic,',
		'creative,',
		'and',
		'commercial',
		'efforts',
		'focus',
		'exclusively',
		'on',
		'the',
		'next',
		'big',
		'thing:',
		'figuring',
		'out',
		'what',
		'will',
		'spread',
		'and',
		'who',
		'will',
		'spread',
		'it',
		'the',
		'fastest.',
		'But',
		'what',
		'do',
		'we',
		'miss',
		'in',
		'this',
		'constant',
		'push',
		'to',
		'the',
		'future?',
		'In',
		'Updating',
		'to',
		'Remain',
		'the',
		'Same,',
		'Wendy',
		'Hui',
		'Kyong',
		'Chun',
		'suggests',
		'another',
		'approach,',
		'arguing',
		'that',
		'our',
		'media',
		'matter',
		'most',
		'when',
		'they',
		'seem',
		'not',
		'to',
		'matter',
		'at',
		'all—when',
		'they',
		'have',
		'moved',
		'from',
		'“new”',
		'to',
		'habitual.',
		'Smart',
		'phones,',
		'for',
		'example,',
		'no',
		'longer',
		'amaze,',
		'but',
		'they',
		'increasingly',
		'structure',
		'and',
		'monitor',
		'our',
		'lives.',
		'Through',
		'habits,',
		'Chun',
		'says,',
		'new',
		'media',
		'become',
		'embedded',
		'in',
		'our',
		'lives—indeed,',
		'we',
		'become',
		'our',
		'machines:',
		'we',
		'stream,',
		'update,',
		'capture,',
		'upload,',
		'link,',
		'save,',
		'trash,',
		'and',
		'troll',
		'Chun',
		'links',
		'habits',
		'to',
		'the',
		'rise',
		'of',
		'networks',
		'as',
		'the',
		'defining',
		'concept',
		'of',
		'our',
		'era.',
		'Networks',
		'have',
		'been',
		'central',
		'to',
		'the',
		'emergence',
		'of',
		'neoliberalism,',
		'replacing',
		'“society”',
		'with',
		'groupings',
		'of',
		'individuals',
		'and',
		'connectable',
		'“YOUS.”',
		'(For',
		"isn't",
		'“new',
		'media”',
		'actually',
		'“NYOU',
		'media”?)',
		'Habit',
		'is',
		'central',
		'to',
		'the',
		'inversion',
		'of',
		'privacy',
		'and',
		'publicity',
		'that',
		'drives',
		'neoliberalism',
		'and',
		'networks.',
		'Why',
		'do',
		'we',
		'view',
		'our',
		'networked',
		'devices',
		'as',
		'“personal”',
		'when',
		'they',
		'are',
		'so',
		'chatty',
		'and',
		'promiscuous?',
		'What',
		'would',
		'happen,',
		'Chun',
		'asks,',
		'if,',
		'rather',
		'than',
		'pushing',
		'for',
		'privacy',
		'that',
		'is',
		'no',
		'privacy,',
		'we',
		'demanded',
		'public',
		'rights—the',
		'right',
		'to',
		'be',
		'exposed,',
		'to',
		'take',
		'risks',
		'and',
		'to',
		'be',
		'in',
		'public',
		'and',
		'not',
		'be',
		'attacked?',
	];

	const result = array.map((text) => {
		return helpers.stringToNumber(text, max);
	});

	const expectedResult = [
		100, 0, 100, 32, 100, 36, 32, 0, 0, 0, 0, 100, 0, 4, 96, 96, 0, 96, 36, 36,
		64, 32, 64, 64, 0, 100, 0, 68, 0, 0, 96, 36, 0, 36, 0, 0, 68, 0, 0, 100, 0,
		68, 0, 64, 0, 68, 64, 0, 4, 0, 64, 0, 68, 96, 0, 0, 96, 0, 68, 32, 0, 68,
		64, 4, 0, 0, 64, 4, 0, 0, 68, 0, 68, 0, 0, 100, 0, 4, 36, 0, 0, 0, 96, 0,
		100, 0, 36, 0, 68, 4, 0, 0, 68, 100, 68, 68, 64, 36, 0, 100, 4, 0, 32, 32,
		96, 0, 0, 4, 0, 68, 32, 96, 36, 32, 68, 0, 96, 36, 68, 0, 0, 0, 0, 36, 0,
		32, 68, 36, 0, 64, 0, 64, 0, 32, 68, 96, 0, 100, 96, 0, 0, 0, 64, 0, 96, 0,
		68, 0, 4, 96, 36, 96, 68, 100, 100, 0, 36, 68, 68, 100, 0, 0, 64, 0, 4, 0,
		0, 32, 32, 0, 0, 64, 36, 96, 36, 36, 0, 0, 68, 0, 64, 96, 64, 68, 0, 0, 32,
		0, 100, 36, 0, 4, 4, 36, 0, 100, 64, 32, 0, 36, 0, 0, 100, 0, 100, 0, 96,
		36, 4, 96, 0, 4, 0, 0, 0, 36, 0, 0, 68, 0, 4, 32, 32, 0, 0, 68, 0, 4, 100,
		36, 32, 68, 68, 0, 4, 32, 96, 0, 100, 36, 0, 0, 36, 0, 32, 36, 68, 64, 0, 0,
		4, 0, 4, 100, 0, 0, 0, 0, 36, 0, 0, 0, 4,
	];

	result.forEach((num) => {
		expect(num <= max).toBe(true);
	});

	expect(result).toEqual(expectedResult);
});

test('checkFieldAgainstOmissions matches field schemas against those to be omitted', async () => {
	const omissions: any[] = [
		{
			key: 'pattern',
		},
		{
			key: 'format',
			value: 'mermaid',
		},
		{
			key: 'format',
			value: 'markdown',
		},
		{
			field: 'version',
		},
	];

	const firstSchema: any = {
		type: 'string',
		pattern: 'fake-pattern',
	};

	const secondSchema: any = {
		type: 'string',
		format: 'mermaid',
	};

	const thirdSchema: any = {
		type: 'string',
		format: 'markdown',
	};

	expect(helpers.checkFieldAgainstOmissions(firstSchema, '', omissions)).toBe(
		true,
	);
	expect(helpers.checkFieldAgainstOmissions(secondSchema, '', omissions)).toBe(
		true,
	);
	expect(helpers.checkFieldAgainstOmissions(thirdSchema, '', omissions)).toBe(
		true,
	);
	expect(helpers.checkFieldAgainstOmissions({}, 'version', omissions)).toBe(
		true,
	);
});

test(
	'When there are both and key and value present in the omission, checkFieldAgainstOmissions' +
		' only returns true when the field schema matches both the key and the value',
	() => {
		const omissions: any[] = [
			{
				key: 'length',
				value: 5,
			},
		];

		const firstSchema: any = {
			type: 'string',
			length: 4,
		};

		const secondSchema: any = {
			type: 'string',
			length: 5,
		};

		expect(
			helpers.checkFieldAgainstOmissions(
				firstSchema,
				'fakeFieldName',
				omissions,
			),
		).toBe(false);
		expect(
			helpers.checkFieldAgainstOmissions(
				secondSchema,
				'fakeFieldName',
				omissions,
			),
		).toBe(true);
	},
);

test('getMessageMetaData ignores tokens in code blocks and inline code', async () => {
	const defaultExpectedTokens = ['0', '2', '4'];
	const defaultMetaData = {
		mentionsUser: [],
		alertsUser: [],
		mentionsGroup: [],
		alertsGroup: [],
		tags: [],
	};
	const generateMessage = (tokenPrefix: string) => {
		return [
			`Testing ${tokenPrefix}0}`,
			'```',
			`Code block 1 ${tokenPrefix}1}`,
			'```',
			`Testing ${tokenPrefix}2`,
			'```',
			`Code block 2 ${tokenPrefix}3`,
			'```',
			`Testing ${tokenPrefix}4`,
			`Inline code \`y = 0; ${tokenPrefix}5\``,
		].join('\n');
	};
	const testToken = (
		tokenPrefix: string,
		metaDataField: string,
		expectedTokens = defaultExpectedTokens,
	) => {
		const metaData = helpers.getMessageMetaData(generateMessage(tokenPrefix));
		const expectedMetaData = {
			...defaultMetaData,
			[metaDataField]: expectedTokens,
		};
		expect(metaData).toEqual(expectedMetaData);
	};
	const withUserPrefix = (token: string) => {
		return `user-${token}`;
	};
	testToken('#', 'tags');
	testToken('@', 'mentionsUser', defaultExpectedTokens.map(withUserPrefix));
	testToken('!', 'alertsUser', defaultExpectedTokens.map(withUserPrefix));
	testToken('@@', 'mentionsGroup');
	testToken('!!', 'alertsGroup');
});

test('checkFieldAgainstOmissions returns false when field schema do not match those to be omitted', async () => {
	const omissions: any[] = [
		{
			key: 'pattern',
		},
		{
			key: 'format',
			value: 'mermaid',
		},
		{
			key: 'format',
			value: 'markdown',
		},
	];

	const schema: any = {
		type: 'string',
		const: 'user@1.0.0',
	};

	expect(helpers.checkFieldAgainstOmissions(schema, 'type', omissions)).toBe(
		false,
	);
});

test(
	'getPathsInSchema returns the title and path for each field in our schema. ' +
		'Each path is represented as an array with a string value for each step through the schema. ' +
		'Title defaults to the key of the field  when there is no title in the schema',
	() => {
		const schema: any = {
			properties: {
				type: {
					title: 'type title',
					const: 'string',
				},
				data: {
					type: 'object',
					properties: {
						email: {
							type: 'string',
						},
						profile: {
							type: 'object',
							properties: {
								name: {
									type: 'object',
									properties: {
										firstname: {
											type: 'string',
										},
										lastname: {
											type: 'string',
										},
									},
								},
								username: {
									type: 'string',
								},
							},
						},
					},
				},
			},
		};

		const expectedResults = [
			{
				title: 'type title',
				path: ['type'],
			},
			{
				title: 'email',
				path: ['data', 'email'],
			},
			{
				title: 'username',
				path: ['data', 'profile', 'username'],
			},
			{
				title: 'firstname',
				path: ['data', 'profile', 'name', 'firstname'],
			},
			{
				title: 'lastname',
				path: ['data', 'profile', 'name', 'lastname'],
			},
		];

		const actualResults = helpers.getPathsInSchema(schema, []);

		expect(expectedResults).toEqual(actualResults);
	},
);

test('getPathsInSchema omits fields that match the omissions schema', () => {
	const schema: any = {
		properties: {
			type: {
				const: 'string',
			},
			data: {
				type: 'object',
				properties: {
					email: {
						type: 'string',
					},
					profile: {
						type: 'object',
						properties: {
							name: {
								type: 'object',
								properties: {
									firstname: {
										type: 'string',
										format: 'markdown',
									},
									lastname: {
										pattern: 'fake-pattern',
									},
								},
							},
							username: {
								type: 'string',
								length: 5,
							},
						},
					},
				},
			},
		},
	};

	const omissions: any[] = [
		{
			key: 'pattern',
		},
		{
			key: 'format',
			value: 'markdown',
		},
		{
			key: 'length',
		},
		{
			field: 'type',
		},
		{
			field: 'email',
		},
	];

	const actualResults = helpers.getPathsInSchema(schema, omissions);

	expect(actualResults).toEqual([]);
});

test('isRelativeUrl does not match absolute URLs', () => {
	expect(helpers.isRelativeUrl('https://example.com/test')).toBe(false);
});

test('isRelativeUrl matches relative URLs', () => {
	expect(helpers.isRelativeUrl('/test')).toBe(true);
});

test('isLocalUrl matches URLs on the same domain', () => {
	expect(helpers.isLocalUrl(`http://${window.location.host}/test`)).toBe(true);
	expect(helpers.isLocalUrl(`https://${window.location.host}/test`)).toBe(true);
	expect(helpers.isLocalUrl(`https://www.${window.location.host}/test`)).toBe(
		true,
	);
});

test('isLocalUrl does not match relative URLs', () => {
	expect(helpers.isLocalUrl('/test')).toBe(false);
});

test('isLocalUrl does not match external URLs', () => {
	expect(helpers.isLocalUrl('http://other.com/test')).toBe(false);
	expect(helpers.isLocalUrl('https://other.com/test')).toBe(false);
	expect(helpers.isLocalUrl('https://www.other.com/test')).toBe(false);
});

test('toRelativeUrl converts absolute URLs to relative URLs', () => {
	expect(helpers.toRelativeUrl('http://example.com/test')).toBe('/test');
	expect(helpers.toRelativeUrl('https://example.com/test?a=b')).toBe(
		'/test?a=b',
	);
	expect(helpers.toRelativeUrl('http://www.example.com/test')).toBe('/test');
});

test("getTypesFromViewCard prioritizes the types defined in a view card's types property", () => {
	expect(
		helpers.getTypesFromViewCard({
			slug: 'view-1',
			type: 'view@1.0.0',
			data: {
				types: ['type2@1.0.0'],
				allOf: [
					{
						schema: {
							type: 'object',
							properties: {
								type: {
									type: 'string',
									const: 'type1@1.0.0',
								},
							},
						},
					},
				],
			},
		} as any),
	).toEqual(['type2@1.0.0']);
});

test("getTypesFromViewCard returns the const type defined in a view card's allOf", () => {
	expect(
		helpers.getTypesFromViewCard({
			slug: 'view-1',
			type: 'view@1.0.0',
			data: {
				allOf: [
					{
						schema: {
							type: 'object',
							properties: {
								type: {
									type: 'string',
									const: 'type1@1.0.0',
								},
							},
						},
					},
				],
			},
		} as any),
	).toEqual(['type1@1.0.0']);
});

test("getTypesFromViewCard returns the enum types defined in a view card's allOf", () => {
	expect(
		helpers.getTypesFromViewCard({
			slug: 'view-1',
			type: 'view@1.0.0',
			data: {
				allOf: [
					{
						schema: {
							type: 'object',
							properties: {
								type: {
									type: 'string',
									enum: ['type1@1.0.0', 'type2@1.0.0'],
								},
							},
						},
					},
				],
			},
		} as any),
	).toEqual(['type1@1.0.0', 'type2@1.0.0']);
});

test("getTypesFromViewCard returns the enum types defined in an anyOf within a view card's allOf", () => {
	expect(
		helpers.getTypesFromViewCard({
			slug: 'view-1',
			type: 'view@1.0.0',
			data: {
				allOf: [
					{
						schema: {
							anyOf: [
								{
									type: 'object',
									properties: {
										type: {
											type: 'string',
											enum: ['type1@1.0.0', 'type2@1.0.0'],
										},
									},
								},
							],
						},
					},
				],
			},
		} as any),
	).toEqual(['type1@1.0.0', 'type2@1.0.0']);
});

test("getTypesFromViewCard returns the const type defined in a view card's oneOf", () => {
	expect(
		helpers.getTypesFromViewCard({
			slug: 'view-1',
			type: 'view@1.0.0',
			data: {
				oneOf: [
					{
						schema: {
							type: 'object',
							properties: {
								type: {
									type: 'string',
									const: 'type1@1.0.0',
								},
							},
						},
					},
				],
			},
		} as any),
	).toEqual(['type1@1.0.0']);
});

test("getTypesFromViewCard returns the enum types defined in a view card's oneOf", () => {
	expect(
		helpers.getTypesFromViewCard({
			slug: 'view-1',
			type: 'view@1.0.0',
			data: {
				oneOf: [
					{
						schema: {
							type: 'object',
							properties: {
								type: {
									type: 'string',
									enum: ['type1@1.0.0', 'type2@1.0.0'],
								},
							},
						},
					},
				],
			},
		} as any),
	).toEqual(['type1@1.0.0', 'type2@1.0.0']);
});

test('getMergedSchemas merges the schemas of two type cards', () => {
	const mergedSchema = helpers.getMergedSchema(
		{
			type: 'type@1.0.0',
			data: {
				schema: {
					type: 'object',
					properties: {
						status: {
							type: 'string',
						},
					},
				},
			},
		} as any,
		{
			type: 'type@1.0.0',
			data: {
				schema: {
					type: 'object',
					properties: {
						category: {
							type: 'string',
						},
					},
				},
			},
		} as any,
	);
	expect(mergedSchema).toEqual({
		type: 'object',
		additionalProperties: true,
		properties: {
			status: {
				type: 'string',
			},
			category: {
				type: 'string',
			},
		},
	});
});

test('getViewSchema merges $$links with the same link verb using an allOf property', () => {
	// A (made-up) view with a built-in schema that references 'has attached element' links
	// and also a user-generated filter that also references 'has attached element' links
	// and another user-generated filter that references 'is attached to' links
	const view = {
		id: '1',
		name: 'My view',
		slug: 'view-my-view',
		tags: [],
		type: 'view@1.0.0',
		active: true,
		version: '1.0.0',
		requires: [],
		linked_at: {},
		created_at: '2021-07-07T02:01:55.725Z',
		updated_at: null,
		markers: [],
		capabilities: [],
		data: {
			allOf: [
				{
					name: 'Built-in schema',
					schema: {
						type: 'object',
						$$links: {
							'has attached element': {
								type: 'object',
								properties: {
									type: {
										enum: [
											'message@1.0.0',
											'create@1.0.0',
											'whisper@1.0.0',
											'update@1.0.0',
											'rating@1.0.0',
											'summary@1.0.0',
										],
									},
								},
								additionalProperties: true,
							},
						},
					} as JsonSchema,
				},
				{
					name: 'User generated filter',
					schema: {
						type: 'object',
						anyOf: [
							{
								$$links: {
									'is attached to': {
										type: 'object',
										additionalProperties: true,
										required: ['slug', 'type'],
										properties: {
											slug: {
												const: 'some-other-slug',
											},
											type: {
												const: 'whisper@1.0.0',
											},
										},
									},
								},
							},
						],
					} as JsonSchema,
				},
				{
					name: 'User generated filter',
					schema: {
						type: 'object',
						anyOf: [
							{
								$$links: {
									'has attached element': {
										type: 'object',
										additionalProperties: true,
										required: ['data', 'type'],
										properties: {
											data: {
												type: 'object',
												required: ['payload'],
												properties: {
													payload: {
														type: 'object',
														required: ['message'],
														properties: {
															message: {
																type: 'string',
																description: 'test',
																pattern: 'test',
																title: 'message',
															},
														},
													},
												},
											},
											type: {
												const: 'whisper@1.0.0',
											},
										},
									},
								},
							},
						],
					} as JsonSchema,
				},
			],
		},
	};

	const schema = helpers.getViewSchema(view, user1);

	expect(schema).toEqual({
		type: 'object',
		additionalProperties: true,
		$$links: {
			'is attached to': {
				type: 'object',
				additionalProperties: true,
				required: ['slug', 'type'],
				properties: {
					slug: {
						const: 'some-other-slug',
					},
					type: {
						const: 'whisper@1.0.0',
					},
				},
			},
			'has attached element': {
				type: 'object',
				// Note the two 'has attached element' schemas have been combined using an 'allOf' array
				allOf: [
					{
						type: 'object',
						properties: {
							type: {
								enum: [
									'message@1.0.0',
									'create@1.0.0',
									'whisper@1.0.0',
									'update@1.0.0',
									'rating@1.0.0',
									'summary@1.0.0',
								],
							},
						},
						additionalProperties: true,
					},
					{
						type: 'object',
						additionalProperties: true,
						required: ['data', 'type'],
						properties: {
							data: {
								type: 'object',
								required: ['payload'],
								properties: {
									payload: {
										type: 'object',
										required: ['message'],
										properties: {
											message: {
												type: 'string',
												description: 'test',
												pattern: 'test',
												title: 'message',
											},
										},
									},
								},
							},
							type: {
								const: 'whisper@1.0.0',
							},
						},
					},
				],
			},
		},
	});
});
