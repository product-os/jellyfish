import { circularDeepEqual } from 'fast-equals';
import styled from 'styled-components';
import React from 'react';
import { Flex, Heading } from 'rendition';
import { Column } from '../../../components';
import _ from 'lodash';

import Messages from './Messages';

const StyledColumn = styled(Column)`
	display: flex;
	flex-direction: column;
`;

const Flowdock = ({ card }) => {
	const {
		data: { title },
		id,
	} = card;

	return (
		<StyledColumn>
			<Flex p={3} justifyContent="space-between">
				<Heading.h4>{title}</Heading.h4>
			</Flex>
			<Flex
				flexDirection="column"
				style={{
					minHeight: 0,
					flex: 1,
					paddingBottom: 20,
				}}
			>
				{!!id && <Messages id={id} />}
			</Flex>
		</StyledColumn>
	);
};

export default React.memo(Flowdock, circularDeepEqual);
