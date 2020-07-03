/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import {
	Box
} from 'rendition'
import Icon from '../shame/Icon'
import Update from '../Update'
import Event from '../Event'

const MESSAGE = 'message'
const WHISPER = 'whisper'
const UPDATE = 'update'

const isNotMessage = (type) => {
	return !_.includes([ MESSAGE, WHISPER ], type)
}

export default class EventsList extends React.Component {
	render () {
		const {
			getActor,
			hideWhispers,
			sortedTail,
			uploadingFiles,
			handleCardVisible,
			messagesOnly,
			user,
			page,
			pageSize,
			eventMenuOptions,
			...eventProps
		} = this.props
		const pagedTail = (Boolean(sortedTail) && sortedTail.length > 0)
			? sortedTail.slice(0 - (pageSize * page)) : null
		if (pagedTail) {
			return _.map(pagedTail, (event, index) => {
				if (_.includes(uploadingFiles, event.slug)) {
					return (
						<Box key={event.slug} p={3}>
							<Icon name="cog" spin /><em>{' '}Uploading file...</em>
						</Box>
					)
				}

				const pureType = event.type.split('@')[0]

				if (messagesOnly && isNotMessage(pureType)) {
					return null
				}
				if (hideWhispers && pureType === WHISPER) {
					return null
				}

				if (pureType === UPDATE) {
					return (
						<Box
							data-test={event.id}
							key={event.id}>
							<Update
								onCardVisible={handleCardVisible}
								card={event}
								user={user}
								getActor={getActor}
							/>
						</Box>
					)
				}

				return (
					<Box
						data-test={event.id}
						key={event.id}>
						<Event
							{...eventProps}
							previousEvent={pagedTail[index - 1]}
							nextEvent={pagedTail[index + 1]}
							card={event}
							user={user}
						/>
					</Box>
				)
			})
		}
		return null
	}
}
