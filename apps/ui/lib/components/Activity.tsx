import { circularDeepEqual } from 'fast-equals';
import _ from 'lodash';
import { SdkQueryOptions } from '@balena/jellyfish-client-sdk/build/types';
import React, { useState } from 'react';
import { Flex, Box, Button, Heading } from 'rendition';
import path from 'path';
import { Column, Icon } from './';
import { Contract, JsonSchema } from 'autumndb';
import { useSelector } from 'react-redux';
import { selectors } from '../store';
import { useCursorEffect } from '../hooks';
import { Event } from './';
import { UIActor } from '../types';

const getActorHref = (actor: UIActor) => {
	return path.join(location.pathname, actor.card.slug);
};

const getQuery = (contract: Contract): JsonSchema => {
	return {
		type: 'object',
		properties: {
			type: {
				enum: ['create@1.0.0', 'update@1.0.0'],
			},
		},
		$$links: {
			'is attached to': {
				type: 'object',
				properties: {
					id: {
						const: contract.id,
					},
				},
			},
		},
	};
};

const DEFAULT_OPTIONS: SdkQueryOptions = {
	limit: 5,
	sortBy: 'created_at',
	sortDir: 'desc',
};

const Inbox = (props) => {
	const user = useSelector(selectors.getCurrentUser());
	const query = React.useMemo(() => {
		return getQuery(props.contract);
	}, []);
	const [messages, nextPage, hasNextPage, loading] = useCursorEffect(
		query,
		DEFAULT_OPTIONS,
	);
	const [isLoadingPage, setIsLoadingPage] = useState(false);

	const groups = useSelector(selectors.getGroups());

	const loadMoreContracts = async () => {
		if (!isLoadingPage && hasNextPage()) {
			setIsLoadingPage(true);
			await nextPage();
			setIsLoadingPage(false);
		}
	};

	const EventBox = React.memo(({ contract }: { contract: Contract }) => {
		if (!contract) {
			return <Box p={3}>Loading...</Box>;
		}

		return (
			<Event
				user={user}
				groups={groups}
				getActorHref={getActorHref}
				card={contract}
			/>
		);
	});

	return (
		<Column>
			<Flex
				flexDirection="column"
				style={{
					maxWidth: '100%',
					flex: 1,
				}}
			>
				<Heading.h4>Activity</Heading.h4>
				<Box
					flex={1}
					mt={3}
					style={{
						minHeight: 0,
					}}
				>
					{loading && !messages.length ? (
						<Box p={2}>
							<Icon name="cog" spin />
						</Box>
					) : (
						<>
							{messages.map((contract) => (
								<EventBox key={contract.id} contract={contract} />
							))}
							{hasNextPage() && !isLoadingPage && (
								<Button mt={2} onClick={loadMoreContracts}>
									Load more events
								</Button>
							)}
						</>
					)}
				</Box>
			</Flex>
		</Column>
	);
};

export default React.memo(Inbox, circularDeepEqual);
