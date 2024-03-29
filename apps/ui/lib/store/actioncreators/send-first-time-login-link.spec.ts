import sinon from 'sinon';
import * as notifications from '../../services/notifications';
import _ from 'lodash';
import { actionCreators } from '.';

const sandbox = sinon.createSandbox();

let context: any = {};

describe('sendFirstTimeLoginLink action creator', () => {
	beforeEach(() => {
		const sdk = {
			action: sandbox.stub(),
		};
		const user = {
			id: 'fake-user',
			type: 'user@1.0.0',
		};

		const analytics = {
			track: sinon.stub(),
		};

		analytics.track.resolves();

		const dispatchedObjs: any[] = [];
		const dispatch = (fn) => {
			dispatchedObjs.push(fn);
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
			dispatchedObjs,
			user,
			thunkArgs,
		};
	});

	afterEach(() => {
		sandbox.restore();
	});

	test('uses the sdk.action to send a first-time login link to a user', async () => {
		const { sdk, user, thunkArgs } = context;

		sdk.action.resolves();

		await actionCreators.sendFirstTimeLoginLink({
			user,
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
	});

	test("fires a 'success' notification when successful", async () => {
		const { sdk, user, thunkArgs } = context;

		const addNotification = sandbox.stub(notifications, 'addNotification');

		sdk.action.resolves();

		await actionCreators.sendFirstTimeLoginLink({
			user,
		})(...(thunkArgs as [any, any, any]));

		expect(addNotification.callCount).toBe(1);
		expect(addNotification.args).toEqual([
			['success', 'Sent first-time login token to user'],
		]);
	});

	test("fires a 'danger' notification when an error occurs", async () => {
		const { sdk, user, thunkArgs } = context;

		const addNotification = sandbox.stub(notifications, 'addNotification');

		const errorMessage = 'User does not exist';
		sdk.action.throws(new Error(errorMessage));

		await actionCreators.sendFirstTimeLoginLink({
			user,
		})(...(thunkArgs as [any, any, any]));

		expect(addNotification.callCount).toBe(1);
		expect(addNotification.args).toEqual([['danger', errorMessage]]);
	});
});
