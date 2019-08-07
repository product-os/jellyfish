import * as React from 'react';
import { Button } from 'rendition';

export interface SeeAllConversationsButtonProps {
	onClick: () => void;
}

export const SeeAllConversationsButton = ({
	onClick,
}: SeeAllConversationsButtonProps) => (
	<Button onClick={onClick} underline primary m="20px auto">
		See all conversations
	</Button>
);
