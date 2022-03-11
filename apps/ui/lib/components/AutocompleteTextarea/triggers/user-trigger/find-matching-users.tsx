import _ from 'lodash';
import getUsers from './get-users';
import { username } from '../../../../services/helpers';
import type { JellyfishSDK } from '@balena/jellyfish-client-sdk';
import type {
	UserContract,
	UserData,
} from '@balena/jellyfish-types/build/core';

const getFullName = (data: UserData) => {
	const firstName = _.get(data, ['profile', 'name', 'first']);
	const lastName = _.get(data, ['profile', 'name', 'last']);
	const fullName = _.join([firstName, lastName], ' ').trim();
	return _.isEmpty(fullName) ? '' : `(${fullName})`;
};

const findMatchingUsers = async (
	user: UserContract,
	sdk: JellyfishSDK,
	token: string,
) => {
	if (!token) {
		return [];
	}
	const users = await getUsers(user, sdk, token);
	const usernames = users.map(({ slug, data }) => {
		return {
			slug: `${username(slug)}`,
			name: getFullName(data),
		};
	});

	return usernames;
};

export default findMatchingUsers;
