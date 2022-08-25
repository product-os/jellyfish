import { Contract } from 'autumndb';
import React from 'react';
import { useSelector } from 'react-redux';
import { CardChatSummary } from '../../';
import { useActions } from '../hooks';
import {
	selectMessages,
	selectNotificationsByThread,
} from '../store/selectors';

interface Props {
	thread: Contract;
}

export const ThreadListItem = ({ thread, ...rest }: Props) => {
	const actions = useActions();
	const timeline = useSelector(selectMessages(thread.id));
	const notifications = useSelector(selectNotificationsByThread(thread.id));

	return (
		<CardChatSummary
			{...rest}
			displayOwner={false}
			getActor={actions.getActor}
			card={thread}
			timeline={timeline}
			to={`/chat/${thread.id}`}
			active={notifications.length}
		/>
	);
};
