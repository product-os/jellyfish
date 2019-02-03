/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as _ from 'lodash';
import { store } from '../core';
import { selectors } from '../core/store';

export const getActor = (id: string) => {
	const state = store.getState();
	const allUsers = selectors.getAllUsers(state);
	const accounts = selectors.getAccounts(state);

	const actor = _.find(allUsers, { id });

	let name = 'unknown user';
	let email: string | null = null;

	if (actor) {
		name = actor.slug!.replace('user-', '');
		email = actor.data.email;
	} else {
		const account = _.find(accounts, { id });
		if (account) {
			name = `[${account.data.email}]`;
			email = account.data.email;
		}
	}
	return {
		name,
		email,
	};
};
