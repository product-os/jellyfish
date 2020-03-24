/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	getActorIdFromCard
} from '../services/helpers'

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
