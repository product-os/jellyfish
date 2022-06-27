import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box } from 'rendition';
import styled from 'styled-components';
import * as selectors from '../store/selectors';
import _ from 'lodash';
import { actionCreators } from '../store';
import { useCursorEffect } from '../hooks';

const getFontSize = (text: any) => {
	if (text.length === 1) {
		return 14;
	}

	if (text.length === 2) {
		return 12;
	}

	return 10;
};

const Container = styled(Box)`
	background: rgb(255, 197, 35);
	color: white;
	width: auto;
	min-width: 18px;
	height: 18px;
	padding: 0px 4px;
	border-radius: 18px;
	transform: translateX(6px);
	display: inline-flex;
	justify-content: center;
	align-items: center;
	font-weight: bold;
	font-size: ${(props) => {
		return getFontSize(props.children);
	}}px;
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
			style={{
				position: 'absolute',
				left: '30px',
				bottom: '10px',
			}}
			tooltip={`${mentions.length} notifications`}
			data-test="homechannel-mentions-count"
		>
			{mentions.length >= 100 ? '99+' : mentions.length}
		</Container>
	);
};

export default MentionsCount;
