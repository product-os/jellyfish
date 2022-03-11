import Bluebird from 'bluebird';
import React, { useState, useCallback } from 'react';
import { Button } from 'rendition';
import { Icon } from '../../../components';

const markMessagesAsRead = (sdk, inboxData, user, groupNames) => {
	return Bluebird.map(
		inboxData,
		(card) => {
			return sdk.card.markAsRead(user.slug, card, groupNames);
		},
		{
			concurrency: 10,
		},
	);
};

const MarkAsReadButton = ({ messages, user, groupNames, sdk }) => {
	const [isMarkingAllAsRead, setIsMarkingAllAsRead] = useState(false);

	const markAllAsRead = useCallback(async () => {
		setIsMarkingAllAsRead(true);
		if (messages) {
			await markMessagesAsRead(sdk, messages, user, groupNames);
		}
		setIsMarkingAllAsRead(false);
	}, [messages, sdk, user, groupNames]);

	return (
		<Button
			ml={3}
			disabled={isMarkingAllAsRead}
			onClick={markAllAsRead}
			data-test="inbox__mark-all-as-read"
			icon={
				isMarkingAllAsRead ? (
					<Icon name="cog" spin />
				) : (
					<Icon name="check-circle" />
				)
			}
		>
			{`Mark ${messages ? messages.length : 'all'} as read`}
		</Button>
	);
};

export default MarkAsReadButton;
