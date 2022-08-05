import React from 'react';
import _ from 'lodash';
import { Box } from 'rendition';
import styled from 'styled-components';
import Icon from '../Icon';
import Event from '../Event';
import { WHISPER } from '../constants';
import { getTypeBase } from '../../services/helpers';
import { InfiniteList } from '../InfiniteList';
import Loading from './Loading';
import TimelineStart from './TimelineStart';
import { eventsContainerStyles } from '../EventsContainer';
import { Contract, UserContract } from 'autumndb';

const EventListItem: React.FunctionComponent<any> = ({
	event,
	hideWhispers,
	uploadingFiles,
	eventMenuOptions,
	notifications = [],
	...eventProps
}) => {
	if (_.includes(uploadingFiles, event.slug)) {
		return (
			<Box key={event.slug} p={3}>
				<Icon name="cog" spin />
				<em> Uploading file...</em>
			</Box>
		);
	}

	const pureType = getTypeBase(event.type);

	if (hideWhispers && pureType === WHISPER) {
		return null;
	}

	const eventNotifications = notifications.filter((notification: any) => {
		return notification.links['is attached to'][0].id === event.id;
	});

	return (
		<Box data-test={event.id}>
			<Event {...eventProps} card={event} notifications={eventNotifications} />
		</Box>
	);
};

const StyledInfiniteList = styled(InfiniteList)`
	${eventsContainerStyles}
`;

export type PendingMessage = Pick<
	Contract,
	'type' | 'tags' | 'slug' | 'data'
> & {
	pending: boolean;
	created_at: string;
	data: {
		actor: string;
		payload: any;
		target: string;
	};
};

interface Props {
	sortedEvents: Contract[];
	pendingMessages: PendingMessage[];
	loading: boolean;
	user: UserContract;
	hideWhispers: boolean;
	uploadingFiles: string[];
	reachedBeginningOfTimeline: boolean;
	retry: (contract: Contract) => void;
	onScrollBeginning: () => void;
	onCardVisible: (contract: Contract) => void;
}

const EventsList = React.forwardRef<any, Props>(
	(
		{
			sortedEvents,
			pendingMessages = [],
			loading,
			onScrollBeginning,
			reachedBeginningOfTimeline,
			retry,
			onCardVisible,
			...rest
		},
		ref,
	) => {
		return (
			<StyledInfiniteList
				ref={ref}
				loading={loading}
				onScrollBeginning={onScrollBeginning}
			>
				{reachedBeginningOfTimeline ? (
					<TimelineStart />
				) : (
					<Box p={3}>
						<Loading />
					</Box>
				)}
				{sortedEvents.map((event, index) => {
					return (
						<EventListItem
							{...rest}
							onCardVisible={onCardVisible}
							key={event.slug}
							event={event}
							previousEvent={sortedEvents[index - 1]}
							nextEvent={sortedEvents[index + 1]}
						/>
					);
				})}
				{pendingMessages.map((message) => {
					if (message) {
						return (
							<Event
								{...rest}
								key={message.slug}
								card={message}
								retry={retry}
							/>
						);
					}
				})}
			</StyledInfiniteList>
		);
	},
);

export default EventsList;
