import React from 'react';
import styled from 'styled-components';
import _ from 'lodash';
import { Box } from 'rendition';
import * as helpers from '../../services/helpers';

// Min-width is used to stop text from overflowing the flex container, see
// https://css-tricks.com/flexbox-truncated-text/ for a nice explanation
const StyledBox = styled(Box)`
	min-width: 0;
	border-left-style: solid;
	border-left-width: 3px;
	word-break: break-word;

	.event-card--actions {
		opacity: 0;
	}

	&:hover {
		.event-card--actions {
			opacity: 1;
		}
	}
`;

const getTargetId = (card: any) => {
	return _.get(card, ['data', 'target']) || card.id;
};

const Wrapper = ({ children, card, ...props }: any) => {
	const wrapperStyle = {
		borderLeftColor: helpers.colorHash(getTargetId(card)),
	};
	const typeBase = card.type.split('@')[0];
	return (
		<StyledBox
			{...props}
			pl="40px"
			pb={2}
			className={`event-card--${typeBase}`}
			style={wrapperStyle}
			alignItems="center"
		>
			{children}
		</StyledBox>
	);
};

export default Wrapper;
