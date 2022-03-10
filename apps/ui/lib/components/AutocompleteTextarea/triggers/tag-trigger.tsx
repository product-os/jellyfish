import React from 'react';
import _ from 'lodash';
import { Flex, Txt } from 'rendition';
import type { SettingType } from '@webscopeio/react-textarea-autocomplete';
import type { Contract } from '@balena/jellyfish-types/build/core';
import type { JellyfishSDK } from '@balena/jellyfish-client-sdk';

const tagTrigger = (sdk: JellyfishSDK): SettingType<Contract> => {
	return {
		dataProvider: async (token) => {
			if (!token) {
				return [];
			}

			const matcher = token.toLowerCase();

			const cards = await sdk.query(
				{
					type: 'object',
					description: `Tag that matches ${matcher}`,
					properties: {
						type: {
							const: 'tag@1.0.0',
						},
						name: {
							pattern: `^${matcher}`,
						},
						data: {
							type: 'object',
						},
					},
				},
				{
					limit: 10,
				},
			);

			return _.reverse(_.sortBy(cards, 'data.count'));
		},
		component: ({ entity }) => {
			return (
				<Flex
					style={{
						minWidth: 160,
					}}
					justifyContent="space-between"
				>
					<Txt mr={3}>#{entity.name}</Txt>
					<Txt>x {entity.data.count}</Txt>
				</Flex>
			);
		},
		output: (item) => {
			return `#${item.name}`;
		},
	};
};

export default tagTrigger;
