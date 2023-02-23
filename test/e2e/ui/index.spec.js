const environment = require('@balena/jellyfish-environment').defaultEnvironment;
const { test, expect } = require('@playwright/test');
const _ = require('lodash');
const path = require('path');
const { v4: uuid } = require('uuid');
const sdkHelpers = require('../sdk/helpers');
const helpers = require('./helpers');
const macros = require('./macros');

let sdk = {};
let user = {};
let user2 = {};

const users = {
	community: {
		username: `johndoe-${uuid()}`,
		email: `johndoe-${uuid()}@example.com`,
		password: 'password',
	},
	community2: {
		username: `janedoe-${uuid()}`,
		email: `janedoe-${uuid()}@example.com`,
		password: 'password',
	},
	admin: {
		username: `team-admin-${uuid()}`,
		email: `team-admin-${uuid()}@example.com`,
		password: 'password',
	},
};

const login = async (page, details) => {
	await page.goto('/');
	await page.type('.login-page__input--username', details.username);
	await page.type('.login-page__input--password', details.password);
	await page.click('.login-page__submit--login');
	await page.waitForSelector('.home-channel');
};

test.beforeAll(async () => {
	sdk = await sdkHelpers.login();
	user = await helpers.createUser(sdk, users.community);
	await helpers.addUserToBalenaOrg(sdk, user.id);
	user2 = await helpers.createUser(sdk, users.community2);
	await helpers.addUserToBalenaOrg(sdk, user2.id);
});

test.afterEach(async ({ page }) => {
	sdkHelpers.afterEach(sdk);
	await page.close();
});

test.describe('Core', () => {
	test('Should let users login', async ({ page }) => {
		await login(page, users.community);
	});
});

test.describe('Contract actions', () => {
	test.only('Should let users copy contract data', async ({ browser }) => {
		const context = await browser.newContext();

		// https://playwright.dev/docs/api/class-browsercontext#browser-context-grant-permissions
		await context.grantPermissions(['clipboard-read']);
		const newpage = await context.newPage();
		await login(newpage, users.community);

		// Create and go to thread contract
		const contract = await sdk.card.create({
			slug: `thread-${uuid()}`,
			type: 'thread@1.0.0',
		});
		await newpage.goto(`/${contract.id}`);
		await newpage.waitForSelector('.column--thread');
		await newpage.locator('[data-test="card-action-menu"]').click();

		// Assert permalink copy
		await newpage.locator('[data-test="card-action-menu__permalink"]').click();
		const permalink = await newpage.evaluate(() => {
			return window.navigator.clipboard.readText();
		});
		expect(permalink.startsWith('http')).toBe(true);
		expect(permalink.endsWith(`/${contract.slug}`)).toBe(true);

		// Assert JSON copy
		await newpage.locator('[data-test="card-action-menu__json"]').click();
		const copiedJSON = await newpage.evaluate(() => {
			return window.navigator.clipboard.readText();
		});
		expect(_.omit(contract, ['links']).slug).toEqual(
			_.omit(JSON.parse(copiedJSON), ['links']).slug,
		);

		context.clearPermissions();
		await newpage.close();
	});

	test('Should let users delete a card', async ({ page }) => {
		await login(page, users.community);

		// Create a thread contract
		const contract = await sdk.card.create({
			slug: `thread-${uuid()}`,
			type: 'thread@1.0.0',
		});

		// Go to the created thread and delete it
		await page.goto(`/${contract.id}`);
		await page.locator('[data-test="card-action-menu"]').click();
		await page.locator('[data-test="card-action-menu__delete"]').click();
		await page.locator('[data-test="card-delete__submit"]').click();

		// Wait for the success alert as a heuristic for the action completing
		await macros.waitForThenDismissAlert(page, 'Success!');

		const updatedContract = await sdk.card.get(contract.id);
		expect(updatedContract.active).toBeFalsy();
	});

	test('Should let users add a custom field to a card', async ({ page }) => {
		await login(page, users.community);

		const fieldName = 'test';
		const fieldValue = 'lorem ipsom dolor sit amet';

		const contract = await sdk.card.create({
			slug: `thread-${uuid()}`,
			type: 'thread@1.0.0',
		});
		await page.goto(`/${contract.id}`);

		// Add a new custom field called "test"
		await page.locator('.card-actions__btn--edit').click();
		await page.waitForSelector(
			'[data-test="card-edit__free-field-name-input"]',
		);
		await macros.setInputValue(
			page,
			'[data-test="card-edit__free-field-name-input"]',
			fieldName,
		);
		await page.locator('[data-test="card-edit__add-free-field"]').click();

		// Input a value to the new field and save the changes
		await page.waitForSelector('#root_test');
		await macros.setInputValue(page, '#root_test', fieldValue);
		await page.locator('[data-test="card-edit__submit"]').click();

		// Wait for the success alert as a heuristic for the action completing
		await macros.waitForThenDismissAlert(page, 'Success!');

		// Check that the card now has the expected value
		const updatedCard = await sdk.card.get(contract.id);
		expect(updatedCard.data[fieldName]).toEqual(fieldValue);
	});
});

test.describe('Lens', () => {
	test('A lens selection should be remembered', async ({ page }) => {
		await login(page, users.community);

		await macros.navigateToHomeChannelItem(page, [
			'[data-test="home-channel__group-toggle--org-balena"]',
			'[data-test="home-channel__group-toggle--Support"]',
			'[data-test="home-channel__item--view-paid-support-threads"]',
		]);

		await page.waitForSelector('.column--view-paid-support-threads');
		await page.locator('[data-test="lens-selector--lens-kanban"]').click();
		await page.waitForSelector('[data-test="lens--lens-kanban"]');
		await page
			.locator('[data-test="home-channel__item--view-all-forum-threads"]')
			.click();
		await page.waitForSelector('.column--view-all-forum-threads');

		// Allow some time for the lens selection to be stored
		await new Promise((resolve) => {
			setTimeout(resolve, 5000);
		});

		await page
			.locator('[data-test="home-channel__item--view-paid-support-threads"]')
			.click();
		await page.waitForSelector('.column--view-paid-support-threads');
		await page.waitForSelector('[data-test="lens--lens-kanban"]');
	});
});

test.describe('User Status', () => {
	test('You should be able to enable and disable Do Not Disturb', async ({
		page,
	}) => {
		await login(page, users.community);

		const dndButtonSelector = '[data-test="button-dnd"]';
		const verifyDndState = async (expectedOn) => {
			// Open the user menu
			await page.locator('.user-menu-toggle').click();

			await page.waitForSelector(dndButtonSelector);

			// A 'check' icon implies 'Do Not Disturb' is ON
			const checkIcon = await page.$(`${dndButtonSelector} i`);
			expect(Boolean(checkIcon)).toEqual(expectedOn);

			// The user's avatar should also have a status icon if 'Do Not Disturb' is ON
			const statusIcon = await page.$('.user-menu-toggle .user-status-icon i');
			expect(Boolean(statusIcon)).toEqual(expectedOn);
		};

		const toggleDnd = async () => {
			await page.locator(dndButtonSelector).click();
			await macros.waitForThenDismissAlert(page, 'Success!');
		};

		await verifyDndState(false);
		await toggleDnd();
		await verifyDndState(true);
		await toggleDnd();
		await verifyDndState(false);
	});
});

test.describe('User Profile', () => {
	test('The send command should default to "shift+enter"', async ({ page }) => {
		await login(page, users.community);

		// Create a new thread
		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0',
			});
		});

		// Navigate to the user profile page and update settings
		await page.goto(`/${user.id}/${thread.id}`);
		await page.waitForSelector('[data-test="lens--lens-my-user"]');
		await page
			.locator(
				'[data-test="lens--lens-my-user"] button.card-actions__btn--edit',
			)
			.click();
		await page.waitForSelector('[data-test="lens--edit-my-user"]');
		await page
			.locator(
				'[data-test="lens--edit-my-user"] button[role="tab"]:nth-of-type(3)',
			)
			.click();
		await page.locator('button#root_profile_sendCommand').click();
		await page
			.locator('[role="menubar"] > button[role="menuitem"]:nth-of-type(1)')
			.click();
		await page.waitForSelector(
			'input#root_profile_sendCommand__input[value="shift+enter"]',
		);
		const value = await macros.getElementValue(
			page,
			'input#root_profile_sendCommand__input',
		);
		expect(value).toEqual('shift+enter');
		await page.locator('button[type="submit"]').click();

		// Wait for the success alert as a heuristic for the action completing
		await macros.waitForThenDismissAlert(page, 'Success!');

		// Check that the updated setting is working
		await page
			.locator('.column--thread button[data-test="timeline-tab"]')
			.click();
		await page.type('textarea', uuid());
		await new Promise((resolve) => {
			setTimeout(resolve, 500);
		});
		await page.keyboard.down('Shift');
		await page.keyboard.press('Enter');
		await page.keyboard.up('Shift');
		await page.waitForSelector(
			'.column--thread [data-test="event-card__message"]',
		);
	});

	test('You should be able to change the send command to "enter"', async ({
		page,
	}) => {
		await login(page, users.community);

		// Create a new thread
		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0',
			});
		});

		// Navigate to the user profile page and update settings
		await page.goto(`/${user.id}/${thread.id}`);
		await page.waitForSelector('[data-test="lens--lens-my-user"]');
		await page
			.locator(
				'[data-test="lens--lens-my-user"] button.card-actions__btn--edit',
			)
			.click();
		await page.waitForSelector('[data-test="lens--edit-my-user"]');
		await page
			.locator(
				'[data-test="lens--edit-my-user"] button[role="tab"]:nth-of-type(3)',
			)
			.click();
		await page.locator('button#root_profile_sendCommand').click();
		await page
			.locator('[role="menubar"] > button[role="menuitem"]:nth-of-type(3)')
			.click();
		await page.waitForSelector(
			'input#root_profile_sendCommand__input[value="enter"]',
		);
		const value = await macros.getElementValue(
			page,
			'input#root_profile_sendCommand__input',
		);
		expect(value).toEqual('enter');
		await page.locator('button[type="submit"]').click();

		// Wait for the success alert as a heuristic for the action completing
		await macros.waitForThenDismissAlert(page, 'Success!');

		// Check that the updated setting is working
		await page
			.locator('.column--thread button[data-test="timeline-tab"]')
			.click();
		await page.type('textarea', uuid());
		await new Promise((resolve) => {
			setTimeout(resolve, 500);
		});
		await page.keyboard.press('Enter');
		await page.waitForSelector(
			'.column--thread [data-test="event-card__message"]',
		);
	});
});

test.describe('Views', () => {
	test.skip('Should be able to save a new view', async ({ page }) => {
		await login(page, users.community);
		const name = `test-view-${uuid()}`;

		// Navigate to the all messages view
		await page.goto('/view-all-messages');
		await page.waitForSelector('.column--view-all-messages');
		await page.locator('[data-test="filters__add-filter"]').click();
		await page.waitForSelector('[data-test="filters__filter-edit-form"] input');
		await macros.setInputValue(
			page,
			'[data-test="filters__filter-edit-form"] input',
			'foobar',
		);
		await page.locator('[data-test="filters__save-filter"]').click();
		await page.locator('[data-test="filters__open-save-view-modal"]').click();
		await macros.setInputValue(
			page,
			'[data-test="filters__save-view-name"]',
			name,
		);
		await page.locator('[data-test="filters__save-view"]').click();
		await page
			.locator('[data-test="home-channel__group-toggle--__myViews"]')
			.click();
		await page.locator(`[data-test*="${name}"]`).click();
	});
});

test.describe('Chat Widget', () => {
	test('A user can start a Jellyfish support thread from the chat widget', async ({
		page,
	}) => {
		await login(page, users.community);

		const jfThreadsViewSelector = '.column--view-all-jellyfish-support-threads';
		const jfThreadSelector = '.column--support-thread';
		const cwWrapper = '[data-test="chat-widget"]';
		const cwConvList = '[data-test="initial-short-conversation-page"]';

		const subject = `Subject ${uuid()}`;
		const message = `Message ${uuid()}`;
		const replyMessage = `Reply ${uuid()}`;

		// Use the chat widget to start a new conversation
		await page.locator('[data-test="open-chat-widget"]').click();

		// Wait for the chat widget to open
		await page
			.locator(
				'[data-test="start-new-conversation-button"], [data-test="start-conversation-button"]',
			)
			.click();
		await macros.setInputValue(
			page,
			`${cwWrapper} [data-test="conversation-subject"]`,
			subject,
		);
		await macros.setInputValue(
			page,
			`${cwWrapper} textarea.new-message-input`,
			message,
		);
		await page
			.locator(`${cwWrapper} [data-test="start-conversation-button"]`)
			.click();

		// Verify the conversation timeline is displayed in the chat widget
		const threadSelector = '[data-test="chat-page"]';
		const threadElement = await page.waitForSelector(threadSelector);
		const threadId = await macros.getElementAttribute(
			page,
			threadElement,
			'data-test-id',
		);
		const messageText = await macros.getElementText(
			page,
			`${threadSelector} [data-test="event-card__message"] p`,
		);
		expect(messageText.trim(), message);

		// Return to the conversation list...
		await page.locator('[data-test="navigate-back-button"]').click();

		// ...and verify the new conversation is also now listed in the conversation list in the chat widget
		const messageSnippet = await macros.getElementText(
			page,
			`${cwConvList} [data-test-id="${threadId}"] [data-test="card-chat-summary__message"] p`,
		);
		expect(messageSnippet.trim(), message);

		// Now close the chat widget and navigate to the 'Jellyfish threads' support view
		await page
			.locator('[data-test="chat-widget"] [data-test="close-chat-widget"]')
			.click();
		await macros.navigateToHomeChannelItem(page, [
			'[data-test="home-channel__group-toggle--org-balena"]',
			'[data-test="home-channel__group-toggle--Support"]',
			'[data-test="home-channel__item--view-all-jellyfish-support-threads"]',
		]);

		// And verify the new conversation appears in the list of support threads in this view.
		const threadSummarySelector = `${jfThreadsViewSelector} [data-test-id="${threadId}"]`;
		const messageSnippetInThread = await macros.getElementText(
			page,
			`${threadSummarySelector} [data-test="card-chat-summary__message"] p`,
		);
		expect(messageSnippetInThread.trim(), message);

		// Now open the support thread view and reply
		await page.locator(threadSummarySelector).click();
		await page.locator('[data-test="timeline-tab"]').click();
		await page.locator('[data-test="timeline__whisper-toggle"]').click();

		await new Promise((resolve) => {
			setTimeout(resolve, 500);
		});
		await macros.createChatMessage(page, jfThreadSelector, replyMessage);

		// And finally verify the reply shows up in the chat widget conversation summary
		await page.locator('[data-test="open-chat-widget"]').click();
		await macros.waitForInnerText(
			page,
			`${cwConvList} [data-test-id="${threadId}"] [data-test="card-chat-summary__message"] p`,
			replyMessage,
		);
	});
});

test.describe('File Upload', () => {
	test('Users should be able to upload a file', async ({ page }) => {
		await login(page, users.community);

		// Create a new thread
		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0',
			});
		});

		// Navigate to thread and upload file
		await page.goto(`/${thread.id}`);
		await page.locator('[data-test="timeline-tab"]').click();
		await page.setInputFiles(
			'input[type="file"]',
			path.join(__dirname, 'assets', 'test.txt'),
		);
		await page.waitForSelector(
			'.column--thread [data-test="event-card__file"]',
		);
	});
});

test.describe('Chat', () => {
	test('A notice should be displayed when another user is typing', async ({
		page,
		browser,
	}) => {
		const context = await browser.newContext();
		const page2 = await context.newPage();
		await Promise.all([
			login(page, users.community),
			login(page2, users.community2),
		]);

		// Create a new thread
		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0',
			});
		});

		// Navigate to the thread page
		await Promise.all([
			page.goto(`/${thread.id}`),
			page2.goto(`/${thread.id}`),
		]);

		await page.locator('[data-test="timeline-tab"]').click();
		await page2.locator('[data-test="timeline-tab"]').click();
		await page.type('textarea', uuid());
		const messageText = await page2
			.locator('data-test=typing-notice')
			.textContent();
		expect(messageText).toEqual(`${users.community.username} is typing...`);

		await page2.close();
	});

	test('Messages typed but not sent should be preserved when navigating away', async ({
		page,
	}) => {
		await login(page, users.community);

		const [thread1, thread2] = await Promise.all([
			page.evaluate(() => {
				return window.sdk.card.create({
					type: 'thread@1.0.0',
				});
			}),
			page.evaluate(() => {
				return window.sdk.card.create({
					type: 'thread@1.0.0',
				});
			}),
		]);

		// Navigate to the thread page
		await page.goto(`/${thread1.id}`);
		await page.waitForSelector(`.column--slug-${thread1.slug}`);
		await page.locator('[data-test="timeline-tab"]').click();

		const rand = uuid();

		await page.waitForSelector('.new-message-input');
		await page.type('textarea', rand);

		// The delay here isn't ideal, but it helps mitigate issues that can occur due
		// to the message preservation being debounced in the UI
		await new Promise((resolve) => {
			setTimeout(resolve, 5000);
		});

		await page.goto(`/${thread2.id}`);
		await page.waitForSelector(`.column--slug-${thread2.slug}`);

		await page.goto(`/${thread1.id}`);
		await page.waitForSelector(`.column--slug-${thread1.slug}`);

		const messageText = await macros.getElementText(page, 'textarea');
		expect(messageText).toEqual(rand);
	});

	test('Messages that mention a user should appear in their inbox', async ({
		page,
		browser,
	}) => {
		const newContext = await browser.newContext();
		const page2 = await newContext.newPage();
		await Promise.all([
			login(page, users.community),
			login(page2, users.community2),
		]);

		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0',
			});
		});
		const columnSelector = `.column--slug-${thread.slug}`;

		// Navigate to the thread page
		await page.goto(`/${thread.id}`);
		await page.waitForSelector(columnSelector);
		await page.locator('[data-test="timeline-tab"]').click();
		await page.waitForSelector('.new-message-input');
		const msg = `@${user2.slug.slice(5)} ${uuid()}`;
		await macros.createChatMessage(page, columnSelector, msg);

		// Navigate to the inbox page
		await page2.goto('/inbox');
		const messageText = await macros.getElementText(
			page2,
			'[data-test="event-card__message"]',
		);
		expect(messageText.trim()).toEqual(msg);

		await page2.close();
	});

	test('Messages that alert a user should appear in their inbox', async ({
		page,
		browser,
	}) => {
		const context = await browser.newContext();
		const page2 = await context.newPage();
		await Promise.all([
			login(page, users.community),
			login(page2, users.community2),
		]);

		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0',
			});
		});
		const columnSelector = `.column--slug-${thread.slug}`;

		// Navigate to the thread page
		await page.goto(`/${thread.id}`);
		await page.waitForSelector(columnSelector);
		await page.locator('[data-test="timeline-tab"]').click();
		const msg = `!${user2.slug.slice(5)} ${uuid()}`;
		await page.waitForSelector('.new-message-input');
		await macros.createChatMessage(page, columnSelector, msg);

		// Navigate to the inbox page
		await page2.goto('/inbox');
		const messageText = await macros.getElementText(
			page2,
			'[data-test="event-card__message"]',
		);
		expect(messageText.trim()).toEqual(msg);

		await page2.close();
	});

	test('1 to 1 messages should appear in the inbox direct mentions tab', async ({
		page,
		browser,
	}) => {
		const newContext = await browser.newContext();
		const page2 = await newContext.newPage();
		await Promise.all([
			login(page, users.community),
			login(page2, users.community2),
		]);

		// Create thread for messages
		const threadDetails = {
			type: 'thread@1.0.0',
			markers: [`${user.slug}+${user2.slug}`],
			data: {
				dms: true,
				actors: [user.slug, user2.slug],
			},
		};
		const thread = await page.evaluate((options) => {
			return window.sdk.card.create(options);
		}, threadDetails);

		// Create message on thread
		const messageEvent = {
			target: thread,
			slug: `message-${uuid()}`,
			tags: [],
			type: 'message',
			payload: {
				message: `${uuid()}`,
			},
		};
		await page.evaluate((event) => {
			return window.sdk.event.create(event);
		}, messageEvent);

		// Navigate to the inbox page
		await page2.goto('/inbox');
		await page2.locator('[data-test="inbox-direct-mentions-tab"]').click();
		const messageText = await macros.getElementText(
			page2,
			'[data-test="event-card__message"]',
		);
		expect(messageText.trim()).toEqual(messageEvent.payload.message);
		await page2.close();
	});

	test('Direct mentions should appear in the inbox direct mentions tab', async ({
		page,
		browser,
	}) => {
		const newContext = await browser.newContext();
		const page2 = await newContext.newPage();
		await Promise.all([
			login(page, users.community),
			login(page2, users.community2),
		]);

		// Create thread for messages
		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0',
			});
		});

		// Create direct mention on thread
		const messageEvent = {
			target: thread,
			slug: `message-${uuid()}`,
			tags: [],
			type: 'message',
			payload: {
				message: `@${user2.slug.slice(5)} ${uuid()}`,
			},
		};
		await page.evaluate((event) => {
			return window.sdk.event.create(event);
		}, messageEvent);

		// Navigate to the inbox page
		await page2.goto('/inbox');
		await page2.locator('[data-test="inbox-direct-mentions-tab"]').click();
		const messageText = await macros.getElementText(
			page2,
			'[data-test="event-card__message"]',
		);
		expect(messageText.trim()).toEqual(messageEvent.payload.message);

		await page2.close();
	});

	test('Direct alerts should appear in the inbox direct mentions tab', async ({
		page,
		browser,
	}) => {
		const newContext = await browser.newContext();
		const page2 = await newContext.newPage();
		await Promise.all([
			login(page, users.community),
			login(page2, users.community2),
		]);

		// Create thread for messages
		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0',
			});
		});

		// Create direct mention on thread
		const messageEvent = {
			target: thread,
			slug: `message-${uuid()}`,
			tags: [],
			type: 'message',
			payload: {
				message: `!${user2.slug.slice(5)} ${uuid()}`,
			},
		};
		await page.evaluate((event) => {
			return window.sdk.event.create(event);
		}, messageEvent);

		// Navigate to the inbox page
		await page2.goto('/inbox');
		await page2.locator('[data-test="inbox-direct-mentions-tab"]').click();
		const messageText = await macros.getElementText(
			page2,
			'[data-test="event-card__message"]',
		);
		expect(messageText.trim()).toEqual(messageEvent.payload.message);

		await page2.close();
	});

	test('Group mentions should not appear in the inbox direct mentions tab', async ({
		page,
		browser,
	}) => {
		const newContext = await browser.newContext();
		const page2 = await newContext.newPage();
		await Promise.all([
			login(page, users.community),
			login(page2, users.community2),
		]);

		// Create thread for messages
		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0',
			});
		});

		// Create a group and add the user to it
		const groupName = `group-${uuid()}`;
		const group = await page.evaluate((name) => {
			return window.sdk.card.create({
				type: 'group@1.0.0',
				name,
			});
		}, groupName);
		await page.evaluate(
			(options) => {
				return window.sdk.card.link(
					options.group,
					options.user,
					'has group member',
				);
			},
			{
				group,
				user: user2,
			},
		);

		// Create direct mention on thread
		const messageEvent = {
			target: thread,
			slug: `message-${uuid()}`,
			tags: [],
			type: 'message',
			payload: {
				message: `@@${groupName} ${uuid()}`,
			},
		};
		await page.evaluate((event) => {
			return window.sdk.event.create(event);
		}, messageEvent);

		// Navigate to the inbox page
		await page2.goto('/inbox');
		await page2.locator('[data-test="inbox-direct-mentions-tab"]').click();
		const count = await page
			.locator('[data-test="event-card__message"]')
			.count();
		expect(count).toEqual(0);

		await page2.close();
	});

	test('Messages that mention a users group should appear in their inbox', async ({
		page,
		browser,
	}) => {
		const context = await browser.newContext();
		const page2 = await context.newPage();
		await Promise.all([
			login(page, users.community),
			login(page2, users.community2),
		]);

		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0',
			});
		});
		const columnSelector = `.column--slug-${thread.slug}`;

		// Create a group and add the user to it
		const groupName = `group-${uuid()}`;
		const group = await page.evaluate((name) => {
			return window.sdk.card.create({
				type: 'group@1.0.0',
				name,
			});
		}, groupName);
		await page.evaluate(
			(options) => {
				return window.sdk.card.link(
					options.group,
					options.user,
					'has group member',
				);
			},
			{
				group,
				user: user2,
			},
		);

		// Navigate to the thread page
		await page.goto(`/${thread.id}`);
		await page.waitForSelector(columnSelector);
		await page.locator('[data-test="timeline-tab"]').click();
		const msg = `@@${groupName} ${uuid()}`;
		await page.waitForSelector('.new-message-input');
		await macros.createChatMessage(page, columnSelector, msg);

		// Navigate to the inbox page
		await page2.goto('/inbox');
		await macros.waitForInnerText(
			page2,
			'[data-test="event-card__message"]',
			msg,
		);

		await page2.close();
	});

	test('Messages that alert a users group should appear in their inbox', async ({
		page,
		browser,
	}) => {
		const context = await browser.newContext();
		const page2 = await context.newPage();
		await Promise.all([
			login(page, users.community),
			login(page2, users.community2),
		]);

		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0',
			});
		});

		// Create a group and add the user to it
		const groupName = `group-${uuid()}`;
		const group = await page.evaluate((name) => {
			return window.sdk.card.create({
				type: 'group@1.0.0',
				name,
			});
		}, groupName);

		await page.evaluate(
			(options) => {
				return window.sdk.card.link(
					options.group,
					options.user,
					'has group member',
				);
			},
			{
				group,
				user: user2,
			},
		);
		const columnSelector = `.column--slug-${thread.slug}`;

		// Navigate to the thread page
		await page.goto(`/${thread.id}`);
		await page.waitForSelector(columnSelector);
		await page.locator('[data-test="timeline-tab"]').click();
		const msg = `!!${groupName} ${uuid()}`;
		await page.waitForSelector('.new-message-input');
		await macros.createChatMessage(page, columnSelector, msg);

		// Navigate to the inbox page
		await page2.goto('/inbox');
		const messageText = await macros.getElementText(
			page2,
			'[data-test="event-card__message"]',
		);
		expect(messageText.trim()).toEqual(msg);

		await page2.close();
	});

	test.skip('When having two chats side-by-side both should update with new messages', async ({
		page,
	}) => {
		await login(page, users.community);

		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0',
			});
		});

		await page.goto(`/${thread.id}/${thread.id}`);
		const columnSelector = `.column--slug-${thread.slug}`;
		await page.waitForSelector(columnSelector);
		await page.locator('{$columnSelector} [data-test="timeline-tab"]').click();
		await page.waitForSelector('.new-message-input');
		const msg = `@${user.slug.slice(5)} ${uuid()}`;
		await macros.createChatMessage(page, columnSelector, msg);

		await new Promise((resolve) => {
			setTimeout(resolve, 5000);
		});

		const messagesOnPages = await page.$$('.event-card--message');
		expect(messagesOnPages.length).toEqual(2);
	});

	// TODO re-enable this test once
	// https://github.com/product-os/jellyfish/issues/3703 is resolved
	test.skip('Username pings should be case insensitive', async ({
		page,
		browser,
	}) => {
		const context = await browser.newContext();
		const page2 = context.newPage();
		await Promise.all([
			login(page, users.community),
			login(page2, users.community2),
		]);

		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0',
			});
		});
		const columnSelector = `.column--slug-${thread.slug}`;

		// Navigate to the thread page
		await page.goto(`/${thread.id}`);
		await page.waitForSelector(columnSelector);
		await page.locator('[data-test="timeline-tab"]').click();
		const msg = `@${user2.slug.slice(5).toUpperCase()} ${uuid()}`;
		await page.waitForSelector('.new-message-input');
		await macros.createChatMessage(page, columnSelector, msg);

		// Navigate to the inbox page
		await page2.goto('/inbox');
		const messageText = await macros.getElementText(
			page2,
			'[data-test="event-card__message"]',
		);
		expect(messageText.trim()).toEqual(msg);

		await page2.close();
	});
});
