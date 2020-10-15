/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import {
	appendToChannelPath
} from '@balena/jellyfish-ui-components/lib/services/helpers'
import CardChatSummary from '@balena/jellyfish-ui-components/lib/CardChatSummary'

export default function SupportThread ({
	actions,
	card,
	channels,
	channel
}) {
	const isActive = React.useMemo(() => {
		const threadTargets = _.map(channels, 'data.target')
		return _.includes(threadTargets, card.slug) || _.includes(threadTargets, card.id)
	}, [ channels, card ])

	const timeline = React.useMemo(() => {
		return _.sortBy(
			_.get(card.links, [ 'has attached element' ], []),
			'data.timestamp'
		)
	}, [ card.links ])

	return (
		<CardChatSummary
			getActor={actions.getActor}
			key={card.id}
			active={isActive}
			card={card}
			timeline={timeline}
			highlightedFields={[ 'data.status', 'data.inbox' ]}
			to={appendToChannelPath(channel, card)}
		/>
	)
}
