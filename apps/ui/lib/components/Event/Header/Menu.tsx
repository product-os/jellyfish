import React from 'react';
import ContextMenu from '../../ContextMenu';
import { ActionLink } from '../../ActionLink';

const Menu = ({ showMenu, menuOptions, onToggleMenu, onCopyJSON }: any) => {
	if (!showMenu) {
		return null;
	}

	return (
		<ContextMenu position="bottom" onClose={onToggleMenu}>
			<ActionLink
				onClick={onCopyJSON}
				tooltip={{
					text: 'JSON copied!',
					trigger: 'click',
				}}
			>
				Copy as JSON
			</ActionLink>
			{menuOptions}
		</ContextMenu>
	);
};

export default React.memo(Menu);
