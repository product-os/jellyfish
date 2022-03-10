import React, { useState, useEffect, useRef } from 'react';
import _ from 'lodash';
import path from 'path';
import { RouteComponentProps } from 'react-router-dom';
import { sdk } from '../../../core';
import { core } from '@balena/jellyfish-types';
import { Event } from '../../../components';
import { GroupedVirtuoso } from 'react-virtuoso';
import { Box } from 'rendition';
import { LensRendererProps } from '../../../types';

interface State {
	newMessage: string;
	showNewCardModal: boolean;
	messagesOnly: boolean;
	isLoadingPage: boolean;
}

export interface StateProps {
	types: core.TypeContract[];
	groups: core.Contract[];
	user: core.UserContract;
}

export type OwnProps = LensRendererProps;

type Props = RouteComponentProps &
	OwnProps &
	StateProps & {
		// From `withDefaultGetActorHref`
		getActorHref: (actor: any) => string;
	};

const NONE_MESSAGE_TIMELINE_TYPES = [
	'create',
	'event',
	'update',
	'create@1.0.0',
	'event@1.0.0',
	'update@1.0.0',
	'thread@1.0.0',
];

const isHiddenEventType = (type) => {
	return _.includes(NONE_MESSAGE_TIMELINE_TYPES, type);
};

// TODO: remove once we can retrieve this data during query
const isFirstInThread = (card, firstMessagesByThreads) => {
	const target = _.get(card, ['data', 'target']);
	const firstInThread = firstMessagesByThreads[target];
	if (!firstInThread) {
		firstMessagesByThreads[target] = card;
		return true;
	}
	return false;
};

export const InterleavedList = (props: Props) => {
	const START_INDEX = 100000;
	const INITIAL_ITEM_COUNT = 30;

	const [state, setState] = useState<State>({
		newMessage: '',
		showNewCardModal: false,
		messagesOnly: true,
		isLoadingPage: false,
	});

	const { user, groups, getActorHref } = props;

	const tail = _.sortBy(props.tail || [], 'created_at');
	const prevTail = useRef<LensRendererProps['tail']>([]);

	const [firstItemIndex, setFirstItemIndex] = useState(START_INDEX);

	useEffect(() => {
		const newItemsCount =
			(props.tail ? props.tail.length : 0) -
			(prevTail.current ? prevTail.current.length : 0);
		if (newItemsCount > 0) {
			setFirstItemIndex(() => firstItemIndex - newItemsCount);
		}
		prevTail.current = props.tail;
	}, [props.tail]);

	const loadMoreContracts = async () => {
		setState({ ...state, isLoadingPage: true });
		await props.nextPage();
		setState({ ...state, isLoadingPage: false });
	};

	const openChannel = (target: string) => {
		const current = props.channel.data.target;
		props.history.push(
			path.join(window.location.pathname.split(current)[0], current, target),
		);
	};

	const handleContractVisible = (contract: core.Contract) => {
		sdk.card
			.markAsRead(
				props.user.slug,
				contract as any,
				_.map(_.filter(props.groups, 'isMine'), 'name') as string[],
			)
			.catch((error) => {
				console.error(error);
			});
	};

	const firstMessagesByThreads = {};

	const EventBox = React.memo(({ contract }: { contract: core.Contract }) => {
		if (!contract) {
			return <Box p={3}>Loading...</Box>;
		}

		// We cannot rely on the index arg passed by react-virtuoso as it is offset by START_INDEX,
		// so we get the index of the contract being rendered in order to find its neighbors.
		const contractIndex = _.findIndex(tail, (el: any) => el.id === contract.id);

		return (
			<Box>
				<Event
					nextEvent={tail![contractIndex + 1]}
					previousEvent={tail![contractIndex - 1]}
					onCardVisible={handleContractVisible}
					openChannel={openChannel}
					user={user}
					groups={groups}
					firstInThread={isFirstInThread(contract, firstMessagesByThreads)}
					getActorHref={getActorHref}
					card={contract}
				/>
			</Box>
		);
	});

	// An oddity of react-virtuoso is that the `itemContent` cannot be a memoized component, but it can call out to a memoized component.
	// See https://virtuoso.dev/#performance
	const itemContent = (_index, contract) => {
		return <EventBox contract={contract} />;
	};

	return (
		<GroupedVirtuoso
			data={tail}
			firstItemIndex={firstItemIndex}
			initialTopMostItemIndex={INITIAL_ITEM_COUNT - 1}
			startReached={loadMoreContracts}
			itemContent={itemContent}
			overscan={10}
		/>
	);
};
