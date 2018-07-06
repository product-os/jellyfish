import {
	Theme,
	Txt,
} from 'rendition';
import styled from 'styled-components';

export const tagStyle = `
	background: #efefef;
	padding: 2px 2px;
	border-radius: ${Theme.radius}px;
	border: 1px solid #c3c3c3;
`;

export const Tag = styled(Txt.span)`${tagStyle}`;
