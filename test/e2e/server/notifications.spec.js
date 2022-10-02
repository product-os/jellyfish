const ava = require('ava');
const { v4: uuid } = require('uuid');
const sdkHelpers = require('../sdk/helpers');
const helpers = require('./helpers');
const { setTimeout } = require('timers/promises');

let sdk = {};

ava.serial.before(async () => {
	sdk = await sdkHelpers.login();
});

ava.serial.afterEach(() => {
	sdkHelpers.afterEach(sdk);
});

ava.serial(
	'Should create a notification when posting a message on a thread',
	async (test) => {
		const product = 'my_product';
		const subject = 'lorem ipsom';
		const markers = [];

		const user1Details = helpers.generateUserDetails();
		await sdk.auth.signup(user1Details);
		const user2Details = helpers.generateUserDetails();
		await sdk.auth.signup(user2Details);

		await sdk.auth.login(user1Details);

		const [thread, subscription] = await Promise.all([
			sdk.card.create({
				type: 'support-thread',
				name: subject,
				markers,
				data: {
					inbox: 'my_inbox',
					product,
					status: 'open',
				},
			}),
			sdk.card.create({
				type: 'subscription@1.0.0',
				slug: `subscription-${uuid()}`,
				data: {},
			}),
		]);

		await sdk.card.link(thread, subscription, 'has attached');

		// Now login as the second user and post a message on the thread
		await sdk.auth.login(user2Details);

		const newMessage = {
			target: thread,
			type: 'message',
			slug: `message-${uuid()}`,
			tags: [],
			payload: {
				mentionsUser: [],
				alertsUser: [],
				mentionsGroup: [],
				alertsGroup: [],
				message: 'hello world',
			},
		};

		await sdk.event.create(newMessage);

		await setTimeout(2000);

		// The first user should have a notification
		await sdk.auth.login(user1Details);
		const results = await sdk.card.getAllByType('notification');

		test.is(results.length, 1);
	},
);
