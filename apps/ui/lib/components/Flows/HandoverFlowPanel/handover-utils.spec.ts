/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as handoverUtils from './handover-utils';

describe('Handover utils', () => {
	describe('generateWhisperMessage()', () => {
		test('works for unassignment', () => {
			const currentOwner = {
				slug: 'user-Test1',
			};
			const newOwner = null;
			const reason = 'A reason';
			const currentStatus = 'New status';
			expect(
				handoverUtils.generateWhisperMessage(
					currentOwner,
					newOwner,
					reason,
					currentStatus,
				),
			).toBe(
				'Unassigned from @Test1\n\n**Reason:** A reason\n\n**Current Status:** New status',
			);
		});

		test('works for assignment', () => {
			const currentOwner = null;
			const newOwner = {
				slug: 'user-Test2',
			};
			const reason = 'A reason';
			const currentStatus = 'New status';
			expect(
				handoverUtils.generateWhisperMessage(
					currentOwner,
					newOwner,
					reason,
					currentStatus,
				),
			).toBe(
				'Assigned to @Test2\n\n**Reason:** A reason\n\n**Current Status:** New status',
			);
		});

		test('works for reassignment', () => {
			const currentOwner = {
				slug: 'user-Test1',
			};
			const newOwner = {
				slug: 'user-Test2',
			};
			const reason = 'A reason';
			const currentStatus = 'New status';
			expect(
				handoverUtils.generateWhisperMessage(
					currentOwner,
					newOwner,
					reason,
					currentStatus,
				),
			).toBe(
				'Reassigned from @Test1 to @Test2\n\n**Reason:** A reason\n\n**Current Status:** New status',
			);
		});

		test('does not require a reason', () => {
			const currentOwner = null;
			const newOwner = {
				slug: 'user-Test2',
			};
			const reason = null;
			const currentStatus = 'New status';
			expect(
				handoverUtils.generateWhisperMessage(
					currentOwner,
					newOwner,
					reason,
					currentStatus,
				),
			).toBe('Assigned to @Test2\n\n**Current Status:** New status');
		});

		test('does not require a status', () => {
			const currentOwner = null;
			const newOwner = {
				slug: 'user-Test2',
			};
			const reason = 'A reason';
			expect(
				handoverUtils.generateWhisperMessage(currentOwner, newOwner, reason),
			).toBe('Assigned to @Test2\n\n**Reason:** A reason');
		});
	});
});
