import React from 'react';
import type { JellyfishSDK } from '@balena/jellyfish-client-sdk';
import type { SettingType } from '@webscopeio/react-textarea-autocomplete';
import getGroups from './get-groups';

const groupTrigger = (sdk: JellyfishSDK, tag: string): SettingType<string> => {
	return {
		dataProvider: async (token) => {
			if (!token) {
				return [];
			}

			// ReactTexareaAutocomplete was not designed for triggers with more than one character
			// so we need to remove the first character from the token
			const cleanedToken = token.substring(1);
			const groups = await getGroups(sdk, cleanedToken);
			return groups.map((group) => {
				return `${tag}${group.name}`;
			});
		},
		component: ({ entity }) => {
			return <div>{entity}</div>;
		},
		output: (item) => {
			return item;
		},
	};
};

export default groupTrigger;
