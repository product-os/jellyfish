import sinon from 'sinon';
import userTrigger from '../user-trigger';
import { getComponentFromTrigger, getOutputFromTrigger } from './helpers';

const sandbox = sinon.createSandbox();

const USER: any = {
	links: {
		'is member of': {
			slug: 'org-fakeorg',
			type: 'org@1.0.0',
		},
	},
};

const FIRSTNAME = 'John';
const LASTNAME = 'Smith';
const SLUG = 'user-john';
const TAG = '@';
const USERNAME = 'john';

let context: any = {};

beforeEach(() => {
	context = {
		...context,
		sdk: {
			query: sandbox.stub(),
		},
	};
});

afterEach(() => {
	sandbox.restore();
});

test('The correct tag is returned in the component and output of the user trigger', async () => {
	const { sdk } = context;

	sdk.query.resolves([
		{
			slug: SLUG,
		},
	]);

	const atTag = '@';
	const atTrigger = await userTrigger(USER, sdk, atTag);
	const atDiv = await getComponentFromTrigger(atTrigger, atTag, USERNAME);
	const atOutput = await getOutputFromTrigger(atTrigger, atTag, USERNAME);
	expect(atDiv.props.children).toBe(`${atTag}${USERNAME}`);
	expect(atOutput).toBe(`${atTag}${USERNAME}`);

	const exclamationTag = '!';
	const exclamationTrigger = await userTrigger(USER, sdk, exclamationTag);
	const exclamationDiv = await getComponentFromTrigger(
		exclamationTrigger,
		exclamationTag,
		USERNAME,
	);
	const exclamationOutput = await getOutputFromTrigger(
		exclamationTrigger,
		exclamationTag,
		USERNAME,
	);
	expect(exclamationDiv.props.children).toBe(`${exclamationTag}${USERNAME}`);
	expect(exclamationOutput).toBe(`${exclamationTag}${USERNAME}`);
});

test('A user matching the search term is displayed as a slug when the user has no first-name or last-name value', async () => {
	const { sdk } = context;

	sdk.query.resolves([
		{
			slug: SLUG,
		},
	]);

	const trigger = await userTrigger(USER, sdk, TAG);
	const div = await getComponentFromTrigger(trigger, TAG, USERNAME);
	expect(div.props.children).toBe(`${TAG}${USERNAME}`);
});

test(
	'A user matching the search term is displayed with ' +
		'their slug and first name when the user has a first but no last-name value',
	async () => {
		const { sdk } = context;

		sdk.query.resolves([
			{
				slug: SLUG,
				data: {
					profile: {
						name: {
							first: FIRSTNAME,
						},
					},
				},
			},
		]);

		const trigger = await userTrigger(USER, sdk, TAG);
		const div = await getComponentFromTrigger(trigger, TAG, USERNAME);
		expect(div.props.children).toBe(`${TAG}${USERNAME} (${FIRSTNAME})`);
	},
);

test(
	'A user matching the search term is displayed with ' +
		'their slug and last name when the user has a last-name but no first-name value',
	async () => {
		const { sdk } = context;

		sdk.query.resolves([
			{
				slug: SLUG,
				data: {
					profile: {
						name: {
							last: LASTNAME,
						},
					},
				},
			},
		]);

		const trigger = await userTrigger(USER, sdk, TAG);
		const div = await getComponentFromTrigger(trigger, TAG, USERNAME);
		expect(div.props.children).toBe(`${TAG}${USERNAME} (${LASTNAME})`);
	},
);

test(
	'A user matching the search term is displayed with ' +
		'their slug and their first name and last name when the user has a first-name and last-name value',
	async () => {
		const { sdk } = context;

		sdk.query.resolves([
			{
				slug: SLUG,
				data: {
					profile: {
						name: {
							first: FIRSTNAME,
							last: LASTNAME,
						},
					},
				},
			},
		]);

		const trigger = await userTrigger(USER, sdk, TAG);
		const div = await getComponentFromTrigger(trigger, TAG, USERNAME);
		expect(div.props.children).toBe(
			`${TAG}${USERNAME} (${FIRSTNAME} ${LASTNAME})`,
		);
	},
);

test(
	'The userTrigger outputs the user as a tag ' +
		'plus the username, even when their first name and last name are present',
	async () => {
		const { sdk } = context;

		sdk.query.resolves([
			{
				slug: SLUG,
				data: {
					profile: {
						name: {
							first: FIRSTNAME,
							last: LASTNAME,
						},
					},
				},
			},
		]);

		const trigger = await userTrigger(USER, sdk, TAG);
		const output = await getOutputFromTrigger(trigger, TAG, USERNAME);
		expect(output).toBe(`${TAG}${USERNAME}`);
	},
);
