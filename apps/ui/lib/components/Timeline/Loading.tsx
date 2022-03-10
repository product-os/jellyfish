import React from 'react';
import { Flex } from 'rendition';
import Icon from '../shame/Icon';

const Loading = () => {
	return (
		<Flex justifyContent="center">
			<Icon spin name="cog" />
		</Flex>
	);
};

export default Loading;
