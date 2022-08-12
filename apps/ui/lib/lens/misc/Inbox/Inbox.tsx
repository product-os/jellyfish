import { circularDeepEqual } from 'fast-equals';
import _ from 'lodash';
import { SdkQueryOptions } from '@balena/jellyfish-client-sdk/build/types';
import styled from 'styled-components';
import React, { useState } from 'react';
import { Flex, Box } from 'rendition';
import path from 'path';
import { Column, Icon } from '../../../components';
import { Contract, JsonSchema } from 'autumndb';
import { useSelector } from 'react-redux';
import { selectors } from '../../../store';
import { useCursorEffect } from '../../../hooks';
import { GroupedVirtuoso } from 'react-virtuoso';
import { Event } from '../../../components';
import { UIActor } from '../../../types';
import { useHistory } from 'react-router-dom';

const InboxMessageWrapper = styled(Box)`
	&.event-unread {
		background: #ffeb838a;
	}
`;

const getActorHref = (actor: UIActor) => {
	return path.join(location.pathname, actor.card.slug);
};

const getQuery = (): JsonSchema => {
	return {
		title: 'foo',
		type: 'object',
		properties: {
			type: {
				enum: ['message@1.0.0', 'whisper@1.0.0'],
			},
		},
		$$links: {
			'has attached': {
				type: 'object',
				properties: {
					type: {
						const: 'notification@1.0.0',
					},
					data: {
						type: 'object',
						properties: {
							status: {
								const: 'open',
							},
						},
					},
				},
			},
			'is attached to': {
				type: 'object',
				anyOf: [
					{
						$$links: {
							'is of': {
								type: 'object',
							},
						},
					},
					true,
				],
			},
		},
	};
};

const DEFAULT_OPTIONS: SdkQueryOptions = {
	limit: 30,
	sortBy: 'created_at',
	sortDir: 'desc',
};

const Inbox = ({ channel }) => {
	const user = useSelector(selectors.getCurrentUser());
	const query = React.useMemo(() => {
		return getQuery();
	}, []);
	const [messages, nextPage, hasNextPage, loading] = useCursorEffect(
		query,
		DEFAULT_OPTIONS,
	);
	const [isLoadingPage, setIsLoadingPage] = useState(false);

	const groups = useSelector(selectors.getGroups());
	const history = useHistory();

	const loadMoreContracts = async () => {
		if (!isLoadingPage && hasNextPage()) {
			setIsLoadingPage(true);
			await nextPage();
			setIsLoadingPage(false);
		}
	};

	const openChannel = (target: string) => {
		const current = channel.data.target;
		history.push(
			path.join(window.location.pathname.split(current)[0], current, target),
		);
	};

	const EventBox = React.memo(({ contract }: { contract: Contract }) => {
		if (!contract) {
			return <Box p={3}>Loading...</Box>;
		}

		const read = (contract as any).data?.readBy?.includes(user.slug);

		const source = contract.links?.['is attached to']?.[0];
		const context = source?.links?.['is of']?.[0];

		const is121 = source?.data.dms ?? false;

		return (
			<InboxMessageWrapper className={read ? 'event-read' : 'event-unread'}>
				<Event
					openChannel={openChannel}
					user={user}
					groups={groups}
					getActorHref={getActorHref}
					card={contract}
					is121={is121}
					context={context}
				/>
			</InboxMessageWrapper>
		);
	});

	// An oddity of react-virtuoso is that the `itemContent` cannot be a memoized component, but it can call out to a memoized component.
	// See https://virtuoso.dev/#performance
	const itemContent = (_index, contract) => {
		return <EventBox contract={contract} />;
	};

	return (
		<Column>
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
					{loading && !messages.length ? (
						<Box p={2}>
							<Icon name="cog" spin />
						</Box>
					) : (
						<GroupedVirtuoso
							data={messages}
							endReached={loadMoreContracts}
							itemContent={itemContent}
							overscan={10}
						/>
					)}
				</Box>
			</Flex>
		</Column>
	);
};

export default React.memo(Inbox, circularDeepEqual);
