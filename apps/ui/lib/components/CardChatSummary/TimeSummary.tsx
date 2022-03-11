import React from 'react';
import styled from 'styled-components';
import { Flex, Txt } from 'rendition';
import Icon from '../Icon';
import { timeAgo } from '../../services/helpers';

const SingleLine = styled(Txt)`
	white-space: nowrap;
`;

export const TimeSummary = React.memo(
	({ prefix, timestamp, iconName, ...rest }: any) => {
		return (
			<Flex
				{...rest}
				alignItems="center"
				tooltip={`${prefix} ${timeAgo(timestamp)}`}
			>
				<Icon name={iconName} />
				<SingleLine ml={2} fontSize={12}>
					{timeAgo(timestamp, true)}
				</SingleLine>
			</Flex>
		);
	},
);
