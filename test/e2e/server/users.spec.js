const ava = require('ava');
const sdkHelpers = require('../sdk/helpers');
const helpers = require('./helpers');

let sdk = {};

ava.serial.before(async () => {
	sdk = await sdkHelpers.login();
});

ava.serial.afterEach(() => {
	sdkHelpers.afterEach(sdk);
});

ava.serial(
	"Users should be able to read other users, even if they don't have an email address",
	async (test) => {
		const user1Details = helpers.generateUserDetails();
		const user2Details = helpers.generateUserDetails();

		// Create user 1 and login as them
		await sdk.action({
			card: 'user@1.0.0',
			type: 'type',
			action: 'action-create-user@1.0.0',
			arguments: {
				username: `user-${user1Details.username}`,
				email: user1Details.email,
				password: user1Details.password,
			},
		});

		await sdk.auth.login(user1Details);

		const user1 = await sdk.auth.whoami();

		// Remove the email field from user 1
		await sdk.card.update(user1.id, 'user', [
			{
				op: 'remove',
				path: '/data/email',
			},
		]);

		await sdk.auth.login({
			username: 'jellyfish',
			password: 'jellyfish',
		});

		// Create and login as user 2
		await sdk.action({
			card: 'user@1.0.0',
			type: 'type',
			action: 'action-create-user@1.0.0',
			arguments: {
				username: `user-${user2Details.username}`,
				email: user2Details.email,
				password: user2Details.password,
			},
		});

		await sdk.auth.login(user2Details);

		// Try and read user 1
		const result = await sdk.card.get(user1.id);

		test.is(result.id, user1.id);
	},
);
