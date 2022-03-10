import React from 'react';
import { Flex } from 'rendition';
import Icon from '../Icon';

const Loading = () => {
	return (
		<Flex justifyContent="center">
			<Icon spin name="cog" />
		</Flex>
	);
};

export default Loading;
