import React from 'react';
import type { SettingType } from '@webscopeio/react-textarea-autocomplete';
import type { UserContract } from '@balena/jellyfish-types/build/core';
import type { JellyfishSDK } from '@balena/jellyfish-client-sdk';
import findMatchingUsers from './find-matching-users';

const userTrigger = (
	user: UserContract,
	sdk: JellyfishSDK,
	tag: string,
): SettingType<{
	slug: string;
	name: string;
}> => {
	return {
		dataProvider: async (token) => {
			return findMatchingUsers(user, sdk, token);
		},
		component: ({ entity: { slug, name } }) => {
			return <div>{`${tag}${slug} ${name}`.trim()}</div>;
		},
		output: (item) => {
			return `${tag}${item.slug}`;
		},
	};
};

export default userTrigger;
