import type { JellyfishSDK } from '@balena/jellyfish-client-sdk';
import type { Contract, ContractSummary } from 'autumndb';
import { v4 as uuid } from 'uuid';
import { initSdk, login, teardown } from './helpers';

const sdk: JellyfishSDK = initSdk();

async function createSupportThread(): Promise<Contract> {
	return sdk.card.create({
		type: 'support-thread@1.0.0',
		data: {
			inbox: 'S/Paid_Support',
			status: 'open',
		},
	});
};

async function createIssue(): Promise<Contract> {
	return sdk.card.create({
		type: 'issue@1.0.0',
		name: `test-issue-${uuid()}`,
		data: {
			inbox: 'S/Paid_Support',
			status: 'open',
			repository: 'foobar',
		},
	});
};

beforeAll(async () => {
    await login(sdk);
});

afterEach(() => {
    teardown(sdk);
});

test(
	'Calling card.link twice with same params returns same link card',
	async () => {
		// Create a support thread and support issue
		const supportThread = await createSupportThread();
		const issue = await createIssue();

		// Link the support thread to the issue
		const link1 = await sdk.card.link(supportThread, issue, 'is attached to') as ContractSummary;

		// Try to link the same support thread to the same issue
		const link2 = await sdk.card.link(supportThread, issue, 'is attached to') as ContractSummary;

		// Verify the link ID is the same
        expect(link1.id).toEqual(link2.id);
	},
);

test(
	'card.link will create a new link if previous one was deleted',
	async () => {
		// Create a support thread and issue
		const supportThread = await createSupportThread();

		const issue = await createIssue();

		// Link the support thread to the issue
		const link1 = await sdk.card.link(supportThread, issue, 'is attached to') as ContractSummary;

		// Now remove the link
		await sdk.card.unlink(supportThread, issue, 'is attached to');

		// Try to link the same support thread to the same issue
		const link2 = await sdk.card.link(supportThread, issue, 'is attached to') as ContractSummary;

		// Verify the link ID is not the same
        expect(link1.id).not.toEqual(link2.id);
	},
);
