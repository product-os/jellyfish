import React from 'react';
import { Contract } from 'autumndb';
import path from 'path';
import { Box, Button, Flex, Txt } from 'rendition';
import styled from 'styled-components';
import { Event, Icon, useSetup } from '../../../components';
import { MESSAGE, WHISPER } from '../../../components/constants';
import { ChannelContract, UIActor } from '../../../types';
import { useSelector } from 'react-redux';
import { selectors } from '../../../store';
import { useHistory } from 'react-router-dom';

const InboxMessageWrapper = styled(Box)`
	position: relative;
	&.event-unread {
		background: #ffeb838a;
	}

	.notifications-meta-container {
		position: absolute;
		right: 0;
		z-index: 4;
	}
`;

const getActorHref = (actor: UIActor) => {
	return path.join(location.pathname, actor.card.slug);
};

interface Props {
	contract: Contract;
	channel: ChannelContract;
	canArchive?: boolean;
}

export const EventBox = React.memo(
	({ channel, contract, canArchive }: Props) => {
		const { sdk } = useSetup()!;
		const history = useHistory();
		const groups = useSelector(selectors.getGroups());
		const user = useSelector(selectors.getCurrentUser());
		const [isArchiving, setIsArchiving] = React.useState(false);

		// Depending on the executed query, the matching contract could be a
		// message/whisper or a thread. We need to account for both cases.
		const typeBase = contract.type.split('@')[0];
		let message = contract.links?.['has attached element']?.[0];
		let source = contract;
		if (typeBase === MESSAGE || typeBase === WHISPER) {
			message = contract;
			source = contract.links!['is attached to']?.[0];
		}
		const hasNotification = !!message?.links?.['has attached']?.[0];

		const read =
			!hasNotification ||
			(!!user && (message as any).data?.readBy?.includes(user.slug));

		const archiveNotification = React.useCallback(async () => {
			setIsArchiving(true);

			// There may be multiple notifications to clear, since we
			// compact messages and their notifications from the same thread together
			const notifications: Contract[] = [];

			for (const event of source.links?.['has attached element'] ?? []) {
				notifications.push(...(event?.links?.['has attached'] || []));
			}

			await Promise.all(
				notifications.map(async (notification) => {
					try {
						await sdk.card.update(notification.id, notification.type, [
							{
								op: notification.data.status ? 'replace' : 'add',
								path: '/data/status',
								value: 'archived',
							},
						]);
					} catch (err) {
						console.error(err);
					}
				}),
			);
			setIsArchiving(false);
		}, [contract]);

		const openChannel = React.useCallback(
			(target: string) => {
				const current = channel.data.target;

				if (current) {
					history.push(
						path.join(
							window.location.pathname.split(current)[0],
							current,
							target,
						),
					);
				}
			},
			[channel],
		);

		if (!contract) {
			return <Box p={3}>Loading...</Box>;
		}

		// The context is either the source of the message or the notification itself
		const context =
			source?.links?.['is of']?.[0] ?? message?.links?.['has attached']?.[0];

		const messageCount = source?.links?.['has attached element']?.length ?? 0;

		const is121 = source?.data.dms ?? false;

		return (
			<InboxMessageWrapper className={read ? 'event-read' : 'event-unread'}>
				<Flex
					flexDirection="column"
					alignItems="flex-end"
					pt={2}
					pr={2}
					className="notifications-meta-container"
				>
					{messageCount > 1 && (
						<Txt className="notifications-count" bold>
							+ {messageCount} more
						</Txt>
					)}
					{canArchive && (
						<Button
							className="notifications-archive-button"
							tooltip={{
								text: 'Archive this notification',
								placement: 'left',
							}}
							plain
							icon={
								<Icon name={isArchiving ? 'cog' : 'box'} spin={isArchiving} />
							}
							onClick={archiveNotification}
						/>
					)}
				</Flex>
				<Event
					openChannel={openChannel}
					user={user}
					groups={groups}
					getActorHref={getActorHref}
					card={message}
					is121={is121}
					context={context}
				/>
			</InboxMessageWrapper>
		);
	},
);
