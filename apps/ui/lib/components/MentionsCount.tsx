import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box } from 'rendition';
import styled from 'styled-components';
import * as selectors from '../store/selectors';
import _ from 'lodash';
import { actionCreators } from '../store';
import { useCursorEffect } from '../hooks';
import { JsonSchema, UserContract } from 'autumndb';

const Container = styled(Box)`
	background: rgb(255, 197, 35);
	border-radius: 50%;
	transform: translateX(6px);
	position: absolute;
	left: 18px;
	bottom: 6px;
	padding: 0;
	width: 8px;
	height: 8px;
	min-width: 0;
`;

// Returns a query that matches all unread messages or whispers that
// are attached to an open notification
const getQuery = (user: UserContract): JsonSchema => {
	return {
		type: 'object',
		properties: {
			type: {
				enum: ['message@1.0.0', 'whisper@1.0.0'],
			},
			data: {
				type: 'object',
				properties: {
					readBy: {
						type: 'array',
						not: {
							contains: {
								const: user.slug,
							},
						},
					},
				},
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
			// By requiring the "is attached to" link to be present, we ensure that we don't show
			// notifications for messages that are attached to deleted threads.
			'is attached to': true,
		},
	};
};

const MentionsCount = () => {
	const user = useSelector(selectors.getCurrentUser());
	if (!user) {
		throw new Error('Cannot render without user');
	}
	const inboxQuery = React.useMemo(() => {
		return getQuery(user);
	}, [user]);
	const dispatch = useDispatch();

	const [mentions] = useCursorEffect(inboxQuery, {
		limit: 100,
	});

	React.useEffect(() => {
		dispatch(actionCreators.setMentionsCount(mentions.length));
	}, [mentions.length]);

	if (!mentions.length) {
		return null;
	}

	return (
		<Container
			tooltip={{
				placement: 'right',
				text: `${mentions.length} notifications`,
			}}
			data-test="homechannel-mentions-count"
		/>
	);
};

export default MentionsCount;
