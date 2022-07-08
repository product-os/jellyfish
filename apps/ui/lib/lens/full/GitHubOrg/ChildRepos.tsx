import { JsonSchema, LoopContract } from 'autumndb';
import React from 'react';
import { Box, Flex } from 'rendition';
import { ChannelContract } from '../../../types';
import LiveCollection from '../../common/LiveCollection';

interface Props {
	channel: ChannelContract;
	contract: LoopContract;
}

const getQuery = (contract: LoopContract): JsonSchema => {
	return {
		$$links: {
			'belongs to': {
				type: 'object',
				properties: {
					type: {
						const: 'github-org@1.0.0',
						type: 'string',
					},
					id: {
						const: contract.id,
					},
				},
			},
		},
		type: 'object',
		properties: {
			type: {
				const: 'repository@1.0.0',
			},
		},
	};
};

export const ChildRepos = ({ channel, contract }: Props) => {
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
					hideFooter
					channel={channel}
					query={query}
					card={contract}
				/>
			</Box>
		</Flex>
	);
};
