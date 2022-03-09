import type { Contract } from '@balena/jellyfish-types/build/core';
import { v4 as uuidv4 } from 'uuid';
import { createReducer } from './reducer';
import { selectMessages, areEqualArrayOfContracts } from './selectors';

describe('areEqualArrayOfContracts', () => {
	const contractA = { id: 'a' } as Contract;
	const contractB = { id: 'b' } as Contract;
	const contractC = { id: 'c' } as Contract;

	it('returns false if arrays are of different lengths', () => {
		const res = areEqualArrayOfContracts([contractA], [contractA, contractB]);
		expect(res).toBe(false);
	});

	it('returns true if arrays are identical in same order', () => {
		const res = areEqualArrayOfContracts(
			[contractA, contractB],
			[contractA, contractB],
		);
		expect(res).toBe(true);
	});

	it('returns false if arrays are identical in different order', () => {
		const res = areEqualArrayOfContracts(
			[contractB, contractA],
			[contractA, contractB],
		);
		expect(res).toBe(false);
	});

	it('returns false if any ids are different', () => {
		const res = areEqualArrayOfContracts(
			[contractA, contractB],
			[contractA, contractC],
		);
		expect(res).toBe(false);
	});
});

describe('selectMessages', () => {
	const context: any = {};

	beforeEach(() => {
		context.reducer = createReducer({
			product: 'jelly-chat-test',
			productTitle: 'Jelly Chat Test',
			inbox: 'paid',
		});
	});

	it('should sort messages by data.timestamp asc', () => {
		const timestamp = Date.now();
		const target = uuidv4();

		const card1 = {
			id: uuidv4(),
			type: 'message@1.0.0',
			data: {
				timestamp: timestamp + 1,
				target,
			},
		};

		const card2 = {
			id: uuidv4(),
			type: 'message@1.0.0',
			data: {
				timestamp,
				target,
			},
		};

		const card3 = {
			id: uuidv4(),
			type: 'message@1.0.0',
			data: {
				timestamp: timestamp + 2,
				target,
			},
		};

		const state = context.reducer({
			cards: {
				[card1.id]: card1,
				[card2.id]: card2,
				[card3.id]: card3,
			},
		});

		const messages = selectMessages(target)(state);

		expect(messages).toEqual([card2, card1, card3]);
	});
});
