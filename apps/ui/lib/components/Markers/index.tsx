import { commaListsAnd } from 'common-tags';
import { flatMap, partition, uniq } from 'lodash';
import React from 'react';
import { Txt, TxtProps } from 'rendition';
import { Contract } from '@balena/jellyfish-types/build/core';

export default function CountFavicon({
	card,
	...props
}: {
	card: Contract;
} & TxtProps) {
	if (!card || !card.markers || !card.markers.length) {
		return null;
	}

	const distinctMarkers = uniq(
		flatMap(card.markers, (marker) => marker.split('+')),
	);

	const [users, orgs] = partition(distinctMarkers, (marker) => {
		return marker.startsWith('user');
	});

	const cleanUsers = users.map((user) => user.replace(/^user-/, ''));
	const cleanOrgs = orgs.map((org) => org.replace(/^org-/, ''));

	let message = 'Only visible to ';
	if (cleanUsers.length === 1) {
		message += `${cleanUsers[0]} `;
	}
	if (cleanUsers.length > 1) {
		message += commaListsAnd`users ${cleanUsers} `;
	}

	if (cleanUsers.length && cleanOrgs.length) {
		message += 'and ';
	}

	if (cleanOrgs.length) {
		message += `members of ${commaListsAnd`${cleanOrgs}`}`;
	}

	return (
		<Txt px={3} italic fontSize={0} {...props}>
			<em>{message}</em>
		</Txt>
	);
}
