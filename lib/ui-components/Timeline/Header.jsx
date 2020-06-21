/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import moment from 'moment'
import {
	html
} from 'common-tags'
import {
	saveAs
} from 'file-saver'
import {
	Flex,
	Box,
	Button
} from 'rendition'
import {
	getMessage
} from '../Event'
import {
	generateJSONPatchDescription
} from '../Update'
import Icon from '../shame/Icon'
import HeaderTitle from './HeaderTitle'

const getEventContent = (typeBase, event) => {
	switch (typeBase) {
		case 'update':
			if (_.some(event.data.payload, 'op')) {
				return generateJSONPatchDescription(event.data.payload)
			}
			return event.name
		case 'message':
			return getMessage(event)
		case 'whisper':
			return `**whisper** ${getMessage(event)}`
		default:
			return ''
	}
}

export default class Header extends React.Component {
	constructor (props) {
		super(props)

		this.handleDownloadConversation = this.handleDownloadConversation.bind(this)
	}

	async handleDownloadConversation (events) {
		const {
			card,
			getActor
		} = this.props
		let text = card.name
		let activeDate = null

		for (const event of events) {
			const typeBase = event.type.split('@')[0]
			const content = getEventContent(typeBase, event)
			const actorCard = await getActor(event.data.actor)
			const actorName = actorCard.name || ''
			const timestamp = moment(_.get(event, [ 'data', 'timestamp' ]) || event.created_at)
			const time = timestamp.format('HH:mm')
			let date = ''

			// Show message date if it's different from previous message date
			if (!activeDate || !timestamp.isSame(activeDate, 'day')) {
				date = timestamp.format('YYYY - MM - DD')
				activeDate = timestamp
			}

			text += '\n\n'
			text += html `
                ${date}
                ${time} ${actorName}

                    ${content}
			`
		}

		const blob = new Blob([ text ], {
			type: 'text/plain'
		})

		saveAs(blob, `${card.name || card.slug}.txt`)
	}

	render () {
		const {
			headerOptions,
			hideWhispers,
			messagesOnly,
			sortedEvents,
			handleJumpToTop,
			handleWhisperToggle,
			handleEventToggle
		} = this.props
		return (
			<Flex m={2}>
				<HeaderTitle title={_.get(headerOptions, [ 'title' ])} />
				<Box style={{
					marginLeft: 'auto'
				}}>
					<Button
						plain
						tooltip={{
							placement: 'left',
							text: 'Jump to first message'
						}}
						ml={2}
						onClick={handleJumpToTop}
						icon={<Icon name="chevron-circle-up"/>}
					/>

					{_.get(headerOptions, [ 'buttons', 'toggleWhispers' ]) !== false && (
						<Button
							plain
							tooltip={{
								placement: 'left',
								text: `${hideWhispers ? 'Show' : 'Hide'} whispers`
							}}
							style={{
								opacity: hideWhispers ? 0.5 : 1
							}}
							ml={2}
							onClick={handleWhisperToggle}
							icon={<Icon name="user-secret"/>}
						/>
					)}

					{_.get(headerOptions, [ 'buttons', 'toggleEvents' ]) !== false && (
						<Button
							plain
							tooltip={{
								placement: 'left',
								text: `${messagesOnly ? 'Show' : 'Hide'} create and update events`
							}}
							style={{
								opacity: messagesOnly ? 0.5 : 1
							}}
							className="timeline__checkbox--additional-info"
							ml={2}
							onClick={handleEventToggle}
							icon={<Icon name="stream"/>}
						/>
					)}

					<Button
						plain
						tooltip={{
							placement: 'left',
							text: 'Download conversation'
						}}
						ml={2}
						onClick={() => { return this.handleDownloadConversation(sortedEvents) }}
						icon={<Icon name="download"/>}
					/>
				</Box>
			</Flex>
		)
	}
}
