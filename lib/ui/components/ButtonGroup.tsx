import { Flex } from 'rendition';
import styled from 'styled-components';

export default styled(Flex)`
	> * {
		border-radius: 0;
		margin-right: -1px;

		&:first-child {
			border-top-left-radius: ${props => props.theme.radius}px;
			border-bottom-left-radius: ${props => props.theme.radius}px;
		}

		&:last-child {
			border-top-right-radius: ${props => props.theme.radius}px;
			border-bottom-right-radius: ${props => props.theme.radius}px;
		}
	}
`;
