import React from 'react';
import { Txt } from 'rendition';
import styled from 'styled-components';

const StyledTxt = styled(Txt.span)`
	min-width: 0;
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
`;

const HeaderTitle = ({ title }: { title?: string }) => {
	return title ? (
		<StyledTxt mr={2} my={2} tooltip={title}>
			{title}
		</StyledTxt>
	) : null;
};

export default HeaderTitle;
