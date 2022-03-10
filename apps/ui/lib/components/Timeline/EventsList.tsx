import React from 'react';
import _ from 'lodash';
import { Box } from 'rendition';
import styled from 'styled-components';
import Icon from '../shame/Icon';
import Event from '../Event';
import { WHISPER } from '../constants';
import { getTypeBase, isTimelineEvent } from '../../services/helpers';
import { InfiniteList } from '../InfiniteList';
import Loading from './Loading';
import TimelineStart from './TimelineStart';
import { eventsContainerStyles } from '../EventsContainer';

const EventListItem: React.FunctionComponent<any> = ({
	event,
	hideWhispers,
	uploadingFiles,
	messagesOnly,
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

	const isSurfacedUpdate =
		event.type === 'update@1.0.0' &&
		event.name &&
		event.data.payload.length > 0;

	if (messagesOnly && !isTimelineEvent(pureType) && !isSurfacedUpdate) {
		return null;
	}

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

const EventsList = React.forwardRef<any, any>(
	(
		{
			sortedEvents,
			pendingMessages = [],
			loading,
			onScrollBeginning,
			reachedBeginningOfTimeline,
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
							key={event.slug}
							event={event}
							previousEvent={sortedEvents[index - 1]}
							nextEvent={sortedEvents[index + 1]}
						/>
					);
				})}
				{pendingMessages.map((message) => {
					return <Event {...rest} key={message.slug} card={message} />;
				})}
			</StyledInfiniteList>
		);
	},
);

export default EventsList;
