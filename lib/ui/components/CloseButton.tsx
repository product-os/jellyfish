import * as React from 'react';
import Icon from './Icon';
import { IconButton } from './IconButton';

export const CloseButton = (props: any) => {
	return (
		<IconButton
			plaintext
			square
			{...props}
		>
			<Icon name="times" />
		</IconButton>
	);
};
