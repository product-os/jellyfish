import React from 'react';
import styled from 'styled-components';
import { Box, Flex, Heading } from 'rendition';
import * as helpers from '../../services/helpers';
import { CloseButton, Link } from '../';

const ErrorTitle = styled(Heading.h1)`
	background: url(/icons/jellyfish.svg) repeat;
	-webkit-background-clip: text;
	-webkit-text-fill-color: transparent;
	line-height: 1;
	background-size: 14px;
	background-color: #c5edff;
`;

const CloseWrapper = styled(Box)`
	position: absolute;
	top: ${(props) => {
		return helpers.px(props.theme.space[3]);
	}};
	right: ${(props) => {
		return helpers.px(props.theme.space[2]);
	}};
`;

const ChannelNotFound = ({ channel, displayHomeLink }) => {
	return (
		<Flex
			flexDirection="column"
			height="100%"
			justifyContent="center"
			alignItems="center"
		>
			<CloseWrapper>
				<CloseButton channel={channel} />
			</CloseWrapper>
			<ErrorTitle fontSize={['150px', '150px', '200px']}>404</ErrorTitle>
			{displayHomeLink && <Link to="/">Take me home!</Link>}
		</Flex>
	);
};

export default ChannelNotFound;
