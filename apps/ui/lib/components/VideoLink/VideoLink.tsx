import React from 'react';
import _ from 'lodash';
import { Link } from 'rendition';
import * as helpers from '../../services/helpers';
import * as notifications from '../../services/notifications';
import { Icon } from '../';

// The VideoLink component renders a button that lets the user open
// a Google Meet URL (in a new tab) that is specific to the provided card.
// If the card does not yet define a conferenceURL, a new one will be fetched
// and opened and the card updated with the new Google Meet URL so that
// subsequently the same URL can be opened immediately from this component.
export default function VideoLink({
	actions,
	card,
	sdk,
	types,
	theme,
	...rest
}) {
	const [loading, setLoading] = React.useState(false);
	const conferenceUrl = _.get(card, ['data', 'conferenceUrl']);
	const cardType = helpers.getType(card.type, types);
	const cardTypeName = cardType.name || cardType.slug;

	const openGoogleMeet = () => {
		if (loading) {
			return false;
		}
		if (conferenceUrl) {
			window.open(conferenceUrl);
			return false;
		}
		setLoading(true);
		sdk
			.action({
				card: card.id,
				action: 'action-google-meet@1.0.0',
				type: card.type,
				arguments: {},
			})
			.then((response) => {
				if (response.conferenceUrl) {
					window.open(response.conferenceUrl);
				} else {
					notifications.addNotification(
						'danger',
						'Unable to get a Google Meet',
					);
				}
			})
			.catch(() => {
				notifications.addNotification('danger', 'Unable to get a Google Meet');
			})
			.finally(() => {
				setLoading(false);
			});
		return false;
	};

	let tooltipText = `${
		conferenceUrl ? 'Open' : 'Request a'
	} Google Meet for this ${cardTypeName}`;
	if (loading) {
		tooltipText = 'Requesting Google Meet...';
	}
	return (
		<Link
			{...rest}
			color={conferenceUrl ? theme.colors.text.main : theme.colors.gray.dark}
			onClick={conferenceUrl ? null : (openGoogleMeet as any)}
			href={conferenceUrl}
			blank
			tooltip={{
				placement: 'left',
				text: tooltipText,
			}}
		>
			{loading ? <Icon spin name="cog" /> : <Icon name="video" />}
		</Link>
	);
}
