import { Box } from 'rendition';
import styled from 'styled-components';

const getFontSize = (text: any) => {
	if (text.length === 1) {
		return 14;
	}

	if (text.length === 2) {
		return 12;
	}

	return 10;
};

const MentionsCount = styled(Box)`
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

export default MentionsCount;
