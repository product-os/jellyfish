import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box } from 'rendition';
import styled from 'styled-components';
import * as selectors from '../store/selectors';
import _ from 'lodash';
import { actionCreators } from '../store';
import { useCursorEffect } from '../hooks';

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

const MentionsCount = () => {
	const inboxQuery = useSelector(selectors.getInboxQuery(), _.isEqual);
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
