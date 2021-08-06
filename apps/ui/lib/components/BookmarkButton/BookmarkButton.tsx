/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react';
import {
	notifications,
	Icon,
	PlainButton,
} from '@balena/jellyfish-ui-components';
import _ from 'lodash';

export const BookmarkButton = ({ user, card, sdk, ...rest }) => {
	const bookmarked = React.useMemo(() => {
		const bookmarks = _.get(card, ['links', 'is bookmarked by'], []);
		return _.find(bookmarks, {
			id: user.id,
		});
	}, [card.links, user.id]);

	const toggleBookmark = async () => {
		if (bookmarked) {
			await sdk.card.unlink(card, user, 'is bookmarked by');
			notifications.addNotification('success', 'Removed bookmark');
		} else {
			await sdk.card.link(card, user, 'is bookmarked by');
			notifications.addNotification('success', 'Added bookmark');
		}
	};

	return (
		<PlainButton
			onClick={toggleBookmark}
			className="btn--bookmark"
			tooltip={{
				placement: 'left',
				text: bookmarked ? 'Remove from bookmarks' : 'Add to bookmarks',
			}}
			icon={<Icon regular={!bookmarked} name="bookmark" />}
			{...rest}
		/>
	);
};
