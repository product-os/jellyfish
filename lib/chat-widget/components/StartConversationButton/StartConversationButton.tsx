import * as React from 'react';
import SendMessageIcon = require('react-icons/lib/md/send');
import { Button, ButtonProps } from 'rendition';

export const StartConversationButton = ({
	children,
	onClick,
	...rest
}: ButtonProps) => (
	<Button
		{...rest}
		onClick={onClick}
		primary
		icon={<SendMessageIcon size="20px" />}
		width="100%"
	>
		{children}
	</Button>
);
