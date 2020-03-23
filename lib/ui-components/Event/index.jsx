/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import Event, {
	getMessage
} from './Event'
import CardLoader from '../CardLoader'
import * as helpers from '../services/helpers'
import {
	withSetup
} from '../SetupProvider'

export {
	getMessage
}

const EventWithActor = (props) => {
	return (
		<CardLoader
			id={helpers.getActorIdFromCard(props.card)}
			type="user"
			withLinks={[ 'is member of' ]}
			cardSelector={props.selectCard}
			getCard={props.getCard}
		>
			{(author) => {
				return (
					<Event {...props} actor={helpers.generateActorFromUserCard(author)} />
				)
			}}
		</CardLoader>
	)
}

export default withSetup(EventWithActor)
