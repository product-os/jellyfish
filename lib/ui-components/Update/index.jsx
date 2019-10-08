/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	commaListsAnd
} from 'common-tags'
import copy from 'copy-to-clipboard'
import {
	circularDeepEqual
} from 'fast-equals'
import _ from 'lodash'
import React from 'react'
import {
	Box,
	Button,
	Flex,
	Txt
}	from 'rendition'
import styled from 'styled-components'
import ContextMenu from '../ContextMenu'
import * as helpers from '../../../apps/ui/services/helpers'
import {
	ActionLink
} from '../shame/ActionLink'
import Icon from '../shame/Icon'

const generateJSONPatchDescription = (payload) => {
	const items = []
	for (const patch of payload) {
		switch (patch.op) {
			case 'add':
				items.push(`added value to path "${patch.path}"`)
				break
			case 'remove':
				items.push(`removed path "${patch.path}"`)
				break
			case 'replace':
				items.push(`changed value at path "${patch.path}"`)
				break
			default:
				items.push(`path "${patch.path}" was modified`)
		}
	}

	return items
}

const getTargetId = (card) => {
	return _.get(card, [ 'data', 'target' ]) || card.id
}

// Min-width is used to stop text from overflowing the flex container, see
// https://css-tricks.com/flexbox-truncated-text/ for a nice explanation
const UpdateWrapper = styled(Box) `
	min-width: 0;
	border-left-style: solid;
	border-left-width: 3px;
	word-break: break-word;

	.event-card--actions {
		opacity: 0;
	}

	&:hover {
		.event-card--actions {
			opacity: 1;
		}
	}
`

export default class Update extends React.Component {
	constructor (props) {
		super(props)

		this.copyJSON = (event) => {
			event.preventDefault()
			event.stopPropagation()
			copy(JSON.stringify(this.props.card, null, 2))
		}

		this.toggleMenu = () => {
			this.setState({
				showMenu: !this.state.showMenu
			})
		}

		this.state = {
			actor: null,
			showMenu: false
		}
	}

	shouldComponentUpdate (nextProps, nextState) {
		return !circularDeepEqual(nextState, this.state) || !circularDeepEqual(nextProps, this.props)
	}

	async componentDidMount () {
		const createCard = _.find(_.get(this.props.card, [ 'links', 'has attached element' ]), {
			type: 'create'
		})

		const actorId = _.get(this.props.card, [ 'data', 'actor' ]) || _.get(createCard, [ 'data', 'actor' ])
		const actor = await this.props.getActor(actorId)
		this.setState({
			actor
		})
	}

	render () {
		const {
			card
		} = this.props
		const {
			actor
		} = this.state
		const props = _.omit(this.props, [
			'card',
			'menuOptions',
			'onCardVisible',
			'openChannel'
		])

		const timestamp = _.get(card, [ 'data', 'timestamp' ]) || card.created_at

		let description = null

		if (_.some(card.data.payload, 'op')) {
			description = generateJSONPatchDescription(card.data.payload)
		}

		return (
			<UpdateWrapper
				{...props}
				pl="40px"
				pb={2}
				className={`event-card--${card.type}`}
				style={{
					borderLeftColor: helpers.colorHash(getTargetId(card))
				}}
				alignItems="center"
			>
				<Flex
					justifyContent="space-between"
					mr={2}
				>
					<Flex alignItems="center">
						<Icon name="pencil-alt" />

						<Txt ml={2}>
							<strong>{actor ? actor.name : ''}</strong> updated this{' '}
							{helpers.formatTimestamp(timestamp, true)}
						</Txt>
					</Flex>

					<span>
						<Button
							className="event-card--actions"
							px={2}
							mr={card.type === 'whisper' ? -12 : -1}
							plain
							onClick={this.toggleMenu}
							icon={<Icon name="ellipsis-v"/>}
						/>

						{this.state.showMenu && (
							<ContextMenu position="bottom" onClose={this.toggleMenu}>
								<React.Fragment>
									<ActionLink onClick={this.copyJSON} tooltip={{
										text: 'JSON copied!',
										trigger: 'click'
									}}>
										Copy as JSON
									</ActionLink>

									{this.props.menuOptions}
								</React.Fragment>
							</ContextMenu>
						)}
					</span>
				</Flex>

				{Boolean(card.name) && (
					<Flex align="center" ml="23px">
						<Icon name="level-up-alt" rotate="90" />

						<Txt ml={3}><em>{card.name}</em></Txt>
					</Flex>
				)}

				{!card.name && Boolean(description) && (
					<Flex align="center" ml="23px">
						<Icon name="level-up-alt" rotate="90" />

						<Txt ml={3}><em>{commaListsAnd `${description}`}</em></Txt>
					</Flex>
				)}
			</UpdateWrapper>
		)
	}
}
