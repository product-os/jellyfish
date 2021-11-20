import _ from 'lodash';
import sinon from 'sinon';
import { actionCreators } from './';

const sandbox = sinon.createSandbox();

let context: any = {};

describe('addUser action creator', () => {
	beforeEach(() => {
		const sdk = {
			auth: {
				signup: sandbox.stub(),
			},
			card: {
				link: sandbox.stub(),
			},
			action: sandbox.stub(),
		};
		const username = 'fakeUsername';
		const email = 'fake@email.com';
		const user = {
			id: 'fake-user',
			type: 'user@1.0.0',
			slug: `user-${username}`,
			data: {
				email,
			},
		};

		const org = {
			id: 'fake-org',
		};
		const analytics = {
			track: sinon.stub(),
		};

		analytics.track.resolves();

		sdk.auth.signup.resolves(user);

		const dispatch = (fn) => {
			return fn(...thunkArgs);
		};

		const thunkArgs = [
			dispatch,
			_.noop,
			{
				sdk,
				analytics,
			},
		];

		context = {
			sdk,
			username,
			email,
			user,
			org,
			thunkArgs,
		};
	});

	test('uses the sdk.auth.signup to create a new user', async () => {
		const { sdk, username, email, org, thunkArgs } = context;

		sdk.card.link.resolves();
		sdk.action.resolves();

		await actionCreators.addUser({
			username,
			email,
			org,
		})(...(thunkArgs as [any, any, any]));

		expect(sdk.auth.signup.callCount).toBe(1);
		expect(sdk.auth.signup.args).toEqual([
			[
				{
					username,
					email,
					password: '',
				},
			],
		]);
	});

	test(
		'uses the sdk.card.link method (via firing a dispatch to the createLink action) ' +
			' to create a link between the org and the user',
		async () => {
			const { sdk, username, email, user, org, thunkArgs } = context;

			sdk.auth.signup.resolves(user);
			sdk.card.link.resolves();
			sdk.action.resolves();

			await actionCreators.addUser({
				username,
				email,
				org,
			})(...(thunkArgs as [any, any, any]));

			expect(sdk.card.link.callCount).toBe(1);
			expect(sdk.card.link.args).toEqual([[org, user, 'has member']]);
		},
	);

	test(
		'uses the sdk.action method (via firing a dispatch to the sendFirstTimeLoginLink action)' +
			' to send a first-time login link to the new user',
		async () => {
			const { sdk, username, email, user, org, thunkArgs } = context;

			sdk.auth.signup.resolves(user);
			sdk.card.link.resolves();
			sdk.action.resolves();

			await actionCreators.addUser({
				username,
				email,
				org,
			})(...(thunkArgs as [any, any, any]));

			expect(sdk.action.callCount).toBe(1);
			expect(sdk.action.args).toEqual([
				[
					{
						action: 'action-send-first-time-login-link@1.0.0',
						arguments: {},
						card: user.id,
						type: user.type,
					},
				],
			]);
		},
	);

	test('returns true when it succeeds', async () => {
		const { sdk, user, username, email, org, thunkArgs } = context;

		sdk.auth.signup.resolves(user);
		sdk.card.link.resolves();
		sdk.action.resolves();

		const result = await actionCreators.addUser({
			username,
			email,
			org,
		})(...(thunkArgs as [any, any, any]));

		expect(result).toBe(true);
	});

	test('addUser returns false when it fails', async () => {
		const { sdk, user, username, email, org, thunkArgs } = context;

		sdk.auth.signup.resolves(user);
		sdk.card.link.resolves();
		sdk.action.throws(new Error());

		const result = await actionCreators.addUser({
			username,
			email,
			org,
		})(...(thunkArgs as [any, any, any]));

		expect(result).toBe(false);
	});
});
