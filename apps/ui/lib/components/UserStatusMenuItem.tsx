import React from 'react';
import { Box, Flex, Txt } from 'rendition';
import _ from 'lodash';
import { ActionButton, Icon } from '.';
import * as helpers from '../services/helpers';

export default function UserStatusMenuItem({ user, actions, types, ...rest }) {
	const userType = _.find(types, {
		slug: 'user',
	});
	const userStatusOptions = helpers.getUserStatuses(userType);

	if (!Object.keys(userStatusOptions).length) {
		return null;
	}

	const status = _.get(user, ['data', 'status'], userStatusOptions.Available);
	const isDnd = status.value === userStatusOptions.DoNotDisturb.value;
	const toggleStatus = () => {
		const newStatus = isDnd
			? userStatusOptions.Available
			: userStatusOptions.DoNotDisturb;
		const patches = helpers.patchPath(user, ['data', 'status'], newStatus);
		const successNotification = `Your status is now '${newStatus.title}'`;
		actions.updateUser(patches, successNotification);
	};
	const buttonProps: any = {
		...rest,
		plain: true,
		'data-test': 'button-dnd',
		tooltip: {
			text: isDnd ? 'Turn off Do Not Disturb' : 'Turn off notifications',
			placement: 'right',
		},
		onClick: toggleStatus,
	};
	return (
		<ActionButton {...buttonProps}>
			<Flex flex={1} alignItems="center" justifyContent="space-between">
				<Txt>{userStatusOptions.DoNotDisturb.title}</Txt>
				<Box>{isDnd && <Icon name="check" />}</Box>
			</Flex>
		</ActionButton>
	);
}
