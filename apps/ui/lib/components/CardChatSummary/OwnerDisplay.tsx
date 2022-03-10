import React from 'react';
import { Flex } from 'rendition';
import { UserAvatarLive } from '../UserAvatar';
import Icon from '../Icon';

export const OwnerDisplay = ({ owner, ...rest }: any) => {
	if (!owner) {
		return null;
	}
	return (
		<Flex
			{...rest}
			alignItems="center"
			tooltip={`Owned by ${owner.name || owner.slug}`}
		>
			<Icon name="user" regular />
			<UserAvatarLive ml={2} userId={owner.id} />
		</Flex>
	);
};
