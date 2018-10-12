import * as React from 'react';
import { Button } from 'rendition';
import styled from 'styled-components';
import Icon from './Icon';

const Btn = styled(Button)`
	background: transparent;
	color: #c3c3c3;

	&:hover,
	&:focus,
	&:active {
		color: #333;
	}
`;

export const CloseButton = (props: any) => {
	return (
		<Btn
			plaintext
			square
			{...props}
		>
			<Icon name="times" />
		</Btn>
);
