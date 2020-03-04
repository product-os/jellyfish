/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'

const getActorIdFromCard = _.memoize((card) => {
	const createCard = _.find(_.get(card, [ 'links', 'has attached element' ]), (linkedCard) => {
		return [ 'create', 'create@1.0.0' ].includes(linkedCard.type)
	})
	return _.get(card, [ 'data', 'actor' ]) || _.get(createCard, [ 'data', 'actor' ])
}, (card) => { return card.id })

export const withActor = (BaseComponent) => {
	return ({
		card, ...props
	}) => {
		const actorId = getActorIdFromCard(card)
		const [ actor, setActor ] = React.useState(null)

		React.useEffect(() => {
			if (!actor) {
				props.getActor(actorId).then(setActor)
			}
		}, [ card.id ])

		return (
			<BaseComponent
				{...props}
				card={card}
				actor={actor}
			/>
		)
	}
}
