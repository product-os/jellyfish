import * as React from 'react';
import {
	Flex,
} from 'rendition';

export default ({ children }: any) =>
	<Flex
		justify='space-between'
		align='center'
		style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)' }}
	>
	{children}
	</Flex>;
