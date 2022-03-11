import styled from 'styled-components';
import { Box } from 'rendition';
import { px } from '../services/helpers';

export const eventsContainerStyles = `
	padding: ${(props) => {
		return px(props.theme.space[2]);
	}}
	0;
	flex: 1;
	overflow-y: auto;
	border-top: 1px solid
	${(props) => {
		return props.theme.colors.border;
	}};
	background-color: ${(props) => {
		return props.theme.colors.quartenary.light;
	}};
`;

export default styled(Box)`
	${eventsContainerStyles}
`;
