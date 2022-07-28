import React from 'react';
import _ from 'lodash';
import { Box, Flex, Txt } from 'rendition';
import styled from 'styled-components';
import Icon from '../Icon';
import Event from '../Event';
import { WHISPER } from '../constants';
import { getTypeBase, isTimelineEvent } from '../../services/helpers';
import { InfiniteList } from '../InfiniteList';
import Loading from './Loading';
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
			retry,
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
					<Flex justifyContent="center">
						<Txt data-test="Timeline__TimelineStart">Beginning of Timeline</Txt>
					</Flex>
				) : (
					<Loading />
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
