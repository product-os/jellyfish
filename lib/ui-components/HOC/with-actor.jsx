/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	useSelector
} from 'react-redux'
import _ from 'lodash'

const getActorIdFromCard = _.memoize((card) => {
	const createCard = _.find(_.get(card, [ 'links', 'has attached element' ]), (linkedCard) => {
		return [ 'create', 'create@1.0.0' ].includes(linkedCard.type)
	})
	return _.get(card, [ 'data', 'actor' ]) || _.get(createCard, [ 'data', 'actor' ])
}, (card) => { return card.id })

const getActorFromState = (actorId) => {
	return (state) => {
		return _.get(state, [ 'core', 'actors', actorId ], null)
	}
}

export const withActor = (BaseComponent) => {
	return ({
		card, ...props
	}) => {
		const actorId = getActorIdFromCard(card)
		const actor = useSelector(getActorFromState(actorId))

		React.useEffect(() => {
			if (!actor) {
				props.getActor(actorId)
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
