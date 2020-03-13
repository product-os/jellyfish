/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import React from 'react'
import {
	Box,
	Modal,
	Flex,
	Txt,
	Select
} from 'rendition'
import {
	constraints as LINKS
} from '../../sdk/link-constraints'
import AutoCompleteCardSelect from '../AutoCompleteCardSelect'

export default class LinkModal extends React.Component {
	constructor (props) {
		super(props)

		this.getFromType = _.memoize((card) => {
			let fromType = card.type.split('@')[0]
			if (fromType === 'type') {
				fromType = card.slug.split('@')[0]
			}
			return fromType
		})

		this.getAvailableTypeSlugs = _.memoize((types) => {
			return _.reduce(types || [], (acc, type) => {
				acc[type.slug] = true
				return acc
			}, {})
		})

		this.filterLinks = (linkVerb, availableTypeSlugs, target, fromType) => {
			return _.filter(LINKS, (link) => {
				// Filter by the link verb
				if (linkVerb && linkVerb !== link.name) {
					return false
				}

				// Filter by the 'from' card
				if (fromType !== link.data.from) {
					return false
				}

				// Filter by the 'types' prop
				if (!availableTypeSlugs[link.data.to]) {
					return false
				}

				// If the target is specified, the link 'to' property must match it
				if (target && target.type.split('@')[0] !== link.data.to) {
					return false
				}

				return true
			}).map((link) => {
				// Move the data.title property to the root of the object, as the rendition Select
				// component can't use a non-root field for the `labelKey` prop
				return Object.assign({}, link, {
					title: link.data.title
				})
			})
		}

		const {
			card,
			linkVerb,
			types,
			target
		} = props

		const fromType = this.getFromType(card)
		const availableTypeSlugs = this.getAvailableTypeSlugs(types)
		const linkTypeTargets = this.filterLinks(linkVerb, availableTypeSlugs, target, fromType)
		const linkType = _.first(linkTypeTargets)

		this.state = {
			selectedTarget: target || null,
			linkType
		}

		this.handleTargetSelect = this.handleTargetSelect.bind(this)
		this.handleLinkTypeSelect = this.handleLinkTypeSelect.bind(this)
		this.linkToExisting = this.linkToExisting.bind(this)
	}

	handleTargetSelect (target) {
		this.setState({
			selectedTarget: target
		})
	}

	async handleLinkTypeSelect (payload) {
		this.setState({
			linkType: payload.option
		})
	}

	async linkToExisting () {
		const {
			card,
			onSave
		} = this.props

		const {
			linkType,
			selectedTarget
		} = this.state

		if (!linkType || !selectedTarget) {
			return
		}

		if (onSave) {
			this.props.onSave(card, selectedTarget, linkType.name)
		} else {
			this.props.actions.createLink(card, selectedTarget, linkType.name)
		}

		// Create the link asynchronously without waiting for the result
		this.setState({
			selectedTarget: null
		})

		// Trigger the onHide callback to close the modal
		this.props.onHide()
	}

	render () {
		const {
			actions,
			card,
			linkVerb,
			show,
			types,
			target
		} = this.props
		const {
			linkType
		} = this.state

		if (!show) {
			return null
		}

		const fromType = this.getFromType(card)
		const availableTypeSlugs = this.getAvailableTypeSlugs(types)
		const linkTypeTargets = this.filterLinks(linkVerb, availableTypeSlugs, target, fromType)

		if (!linkTypeTargets.length) {
			console.error(`No matching link types for ${fromType}`)
			actions.addNotification('danger', `No matching link types for ${fromType}`)
			return null
		}

		const typeCard = _.find(types, [ 'slug', fromType ])
		const typeName = typeCard ? typeCard.name : fromType

		const title = `Link this ${typeName} to ${linkTypeTargets.length === 1
			? linkTypeTargets[0].title : 'another element'}`

		return (
			<Modal
				title={title}
				cancel={this.props.onHide}
				primaryButtonProps={{
					disabled: !linkType,
					'data-test': 'card-linker--existing__submit'
				}}
				done={this.linkToExisting}
			>
				<Flex alignItems="center">
					{linkTypeTargets.length > 1 && (
						<Txt>
							Link this {typeName} to{' '}
						</Txt>
					)}
					{linkTypeTargets.length > 1 && (
						<Select ml={2}
							id="card-linker--type-select"
							value={linkType}
							onChange={this.handleLinkTypeSelect}
							labelKey="title"
							options={linkTypeTargets}
							data-test="card-linker--type__input"
						/>
					)}
					<Box
						flex="1"
						ml={2}
						data-test="card-linker--existing__input"
					>
						<AutoCompleteCardSelect
							cardType={linkType.data.to}
							types={types}
							isDisabled={Boolean(target)}
							onChange={this.handleTargetSelect}
						/>
					</Box>
				</Flex>
			</Modal>
		)
	}
}
