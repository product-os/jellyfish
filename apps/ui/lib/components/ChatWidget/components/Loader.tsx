import React from 'react';
import { Flex, FlexProps } from 'rendition';
import { Icon } from '../../';

export const Loader = (props: FlexProps) => {
	return (
		<Flex justifyContent="center" alignItems="center" {...props}>
			<Icon spin name="cog" />
		</Flex>
	);
};
