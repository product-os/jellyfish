import styled from 'styled-components';
import { Flex } from 'rendition';

// Min-width is used to stop text from overflowing the flex container, see
// https://css-tricks.com/flexbox-truncated-text/ for a nice explanation
const EventWrapper = styled(Flex)`
	@keyframes pulse {
		0% {
			opacity: 0;
			outline-color: transparent;
		}
		100% {
			opacity: 0.5;
			outline-color: ${(props) => {
				return props.theme.colors.info.dark;
			}};
		}
	}
	&.event--focused::after {
		content: '';
		opacity: 0;
		outline-offset: -4px;
		outline-width: 3px;
		outline-style: solid;
		position: absolute;
		width: 100%;
		height: 100%;
		z-index: 1;
		animation: pulse 0.7s 6;
		animation-direction: alternate;
		pointer-events: none;
	}
	position: relative;

	background: transparent;
	transition: 150ms ease-in-out background;
	&:hover {
		background: #dde1f080;
	}
	min-width: 0;
	word-break: break-word;
`;

export default EventWrapper;
