import React from 'react';
import { Flex, FlexProps } from 'rendition';
import styled from 'styled-components';

const ColumnBase = styled(Flex)`
	height: 100%;
	min-width: 270px;
`;

interface ColumnProps extends FlexProps {
	overflowY?: boolean;
}

const Column: React.FunctionComponent<ColumnProps> = (props) => {
	const { overflowY, ...rest } = props;

	const style: React.CSSProperties = overflowY
		? {
				overflowY: 'auto',
		  }
		: {};

	return <ColumnBase flexDirection="column" flex={1} style={style} {...rest} />;
};

export default Column;
