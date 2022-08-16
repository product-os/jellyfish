import { circularDeepEqual } from 'fast-equals';
import styled from 'styled-components';
import React, { useEffect, useRef, useState } from 'react';
import { Flex, Box, Txt } from 'rendition';
import { Column, Icon } from '../../../components';
import _ from 'lodash';
import { GroupedVirtuoso } from 'react-virtuoso';
import { SdkQueryOptions } from '@balena/jellyfish-client-sdk/build/types';
import { JsonSchema } from 'autumndb';
import { useCursorEffect } from '../../../hooks';

import { Markdown } from 'rendition/dist/extra/Markdown';

const MessageListColumn = styled(Column)`
	position: relative;
	min-height: 0;
`;

const MessageContainer = styled(Box)`
	min-width: 0;
	border-radius: 12px;
	border-top-left-radius: 0;
	box-shadow: -5px 4.5px 10.5px 0 rgba(152, 173, 227, 0.08);
	a {
		color: inherit;
		text-decoration: underline;
	}

	img {
		background-color: transparent !important;
		&.emoji {
			width: 20px;
			height: 20px;
			vertical-align: middle;
		}
	}
	code {
		color: #333;
		background-color: #f6f8fa;
	}

	border: solid 0.5px #e8ebf2;
	background: white;
`;

const HeaderWrapper = styled(Flex)`
	position: relative;
`;

const getQuery = (threadId: string): JsonSchema => {
	return {
		type: 'object',
		required: ['type'],
		properties: {
			type: {
				type: 'string',
				const: 'flowdock-message@1.0.0',
			},
		},
		$$links: {
			'is attached to': {
				type: 'object',
				required: ['type', 'id'],
				properties: {
					type: {
						type: 'string',
						const: 'flowdock-archive@1.0.0',
					},
					id: {
						type: 'string',
						const: threadId,
					},
				},
			},
		},
	};
};

const INITIAL_ITEM_COUNT = 30;

const START_INDEX = 10000;

const DEFAULT_OPTIONS: SdkQueryOptions = {
	limit: 30,
	sortBy: 'created_at',
	sortDir: 'desc',
};

const Messages = ({ id }) => {
	const [firstItemIndex, setFirstItemIndex] = useState(START_INDEX);
	const [isLoadingPage, setIsLoadingPage] = useState(false);

	const query = React.useMemo(() => {
		return getQuery(id);
	}, [id]);
	const [messages, nextPage, hasNextPage, loading] = useCursorEffect(
		query,
		DEFAULT_OPTIONS,
	);
	const prevTail = useRef([]);

	useEffect(() => {
		const newItemsCount =
			(messages ? messages.length : 0) -
			(prevTail.current ? prevTail.current.length : 0);
		if (newItemsCount > 0) {
			setFirstItemIndex(() => firstItemIndex - newItemsCount);
		}
		prevTail.current = messages as any;
	}, [messages]);

	const loadMoreContracts = async () => {
		if (!isLoadingPage && hasNextPage()) {
			setIsLoadingPage(true);
			await nextPage();
			setIsLoadingPage(false);
		}
	};

	return (
		<MessageListColumn flex="1">
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
						firstItemIndex={firstItemIndex}
						initialTopMostItemIndex={INITIAL_ITEM_COUNT - 1}
						data={messages}
						startReached={loadMoreContracts}
						overscan={10}
						itemContent={(_index: number, message: any) => {
							return (
								<Flex flexDirection="column">
									<HeaderWrapper mx={2}>
										<Flex
											mt={1}
											alignItems="center"
											style={{
												lineHeight: 1.75,
											}}
										>
											<Txt>
												<Txt.span color="black">
													@{message.data.username}({message.data.userFullName})
												</Txt.span>
											</Txt>
										</Flex>
									</HeaderWrapper>
									<MessageContainer px={2} py={1} mb={1} mx={2}>
										{message.data.content && (
											<Markdown>{message.data.content}</Markdown>
										)}
										{/* {message.data.file && (
											<AuthenticatedImage
												cardId={message.id}
												fileName={message.data.file.slug}
												mimeType={message.data.file.mime}
												maxImageSize={500}
											/>
										)} */}
									</MessageContainer>
								</Flex>
							);
						}}
					/>
				)}
			</Box>
		</MessageListColumn>
	);
};

export default React.memo(Messages, circularDeepEqual);
