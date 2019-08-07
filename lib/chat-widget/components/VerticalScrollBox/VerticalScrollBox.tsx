import * as React from 'react';
import { Flex, FlexProps } from 'rendition';
import styled from 'styled-components';

const Outer = styled(Flex)`
	position: relative;
`;

const Inner = styled(Flex)`
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
`;

const Scrollable = styled(Flex)`
	overflow: auto;
`;

export interface VerticalScrollBoxProps extends FlexProps {
	revert?: boolean;
}

export const VerticalScrollBox = ({
	children,
	revert,
	...rest
}: VerticalScrollBoxProps) => (
	<Outer {...rest}>
		<Inner flexDirection="column">
			<Scrollable flexDirection={revert ? 'column-reverse' : 'column'}>
				{children}
			</Scrollable>
		</Inner>
	</Outer>
);
