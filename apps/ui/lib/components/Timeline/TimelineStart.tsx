import React from 'react';
import { Box, Txt } from 'rendition';
import styled, { CSSObject } from 'styled-components';

const StyledBox = styled(Box)(() => {
	return {
		width: '100%',
		textAlign: 'center',
		opacity: 0.8,
	} as CSSObject;
});

const TimelineStart = () => {
	return (
		<StyledBox pb={14} pt={14}>
			<Txt data-test="Timeline__TimelineStart">Beginning of Timeline</Txt>
		</StyledBox>
	);
};

export default TimelineStart;
