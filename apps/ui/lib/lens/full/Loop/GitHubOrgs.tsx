import { JsonSchema, LoopContract } from 'autumndb';
import React from 'react';
import { Box, Flex } from 'rendition';
import { ChannelContract } from '../../../types';
import LiveCollection from '../../common/LiveCollection';

interface Props {
	channel: ChannelContract;
	contract: LoopContract;
}

const getGitHubOrgsQuery = (contract: LoopContract): JsonSchema => {
	return {
		type: 'object',
		properties: {
			type: {
				const: 'github-org@1.0.0',
				type: 'string',
			},
			loop: {
				type: 'string',
				const: `${contract.slug}@${contract.version}`,
			},
		},
	};
};

export const GitHubOrgs = ({ channel, contract }: Props) => {
	const query = getGitHubOrgsQuery(contract);
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
