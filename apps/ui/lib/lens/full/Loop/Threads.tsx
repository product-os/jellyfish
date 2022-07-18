import { Contract, JsonSchema } from 'autumndb';
import React from 'react';
import { Box, Flex } from 'rendition';
import { ChannelContract } from '../../../types';
import LiveCollection from '../../common/LiveCollection';

interface Props {
	channel: ChannelContract;
	contract: Contract;
}

// Aggregate all threads that are linked to product repositories of this loop, or directly to the loop itself
const getQuery = (contract: Contract): JsonSchema => {
	// The query is a intentionally verbose so that the "interleaved" lens
	// can be correctly inferred and used prior to data being loaded from the API.
	return {
		type: 'object',
		required: ['id', 'type', 'slug'],
		properties: {
			id: {
				type: 'string',
			},
			slug: {
				type: 'string',
			},
			type: {
				const: 'thread@1.0.0',
				type: 'string',
			},
		},
		anyOf: [
			{
				$$links: {
					'is of': {
						type: 'object',
						properties: {
							type: {
								const: 'repository@1.0.0',
							},
							data: {
								type: 'object',
								// TODO: Use full relationships once https://github.com/product-os/autumndb/issues/1396 is fixed
								required: ['is_used_by'],
								properties: {
									is_used_by: {
										const: contract.id,
									},
								},
							},
						},
					},
				},
			},
			{
				$$links: {
					'is of': {
						type: 'object',
						properties: {
							id: {
								const: contract.id,
							},
						},
					},
				},
			},
		],
	};
};

export const Threads = ({ channel, contract }: Props) => {
	const query = getQuery(contract);
	return (
		<Flex
			flexDirection="column"
			style={{
				maxWidth: '100%',
				flex: 1,
			}}
		>
			<Box
				flex={1}
				mt={3}
				style={{
					minHeight: 0,
				}}
			>
				<LiveCollection
					// Use a key here to force a remount if the query changes
					key={(query as any).$id}
					channel={channel}
					query={query}
					card={contract}
				/>
			</Box>
		</Flex>
	);
};
