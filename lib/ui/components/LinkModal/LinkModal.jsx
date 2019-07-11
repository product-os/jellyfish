/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import React from 'react'
import Async from 'react-select/lib/Async'
import {
	Box,
	Modal,
	Flex,
	Txt,
	Select
} from 'rendition'
import {
	constants
} from '../../core'
import * as helpers from '../../services/helpers'

export default class LinkModal extends React.Component {
	constructor (props) {
		super(props)

		const {
			card,
			target
		} = props

		const linkType = _.find(constants.LINKS, [ 'data.from', card.type ])

		this.state = {
			results: [],
			selectedTarget: target || null,
			linkType: Object.assign({}, linkType, {
				title: linkType.data.title
			})
		}

		this.getLinkTargets = this.getLinkTargets.bind(this)
		this.handleTargetSelect = this.handleTargetSelect.bind(this)
		this.handleLinkTypeSelect = this.handleLinkTypeSelect.bind(this)
		this.linkToExisting = this.linkToExisting.bind(this)
	}

	async handleTargetSelect (target) {
		// Find the full card from cached results and save it to state
		this.setState({
			selectedTarget: _.find(this.state.results, {
				id: target.value
			}) || null
		})
	}

	async handleLinkTypeSelect (payload) {
		this.setState({
			linkType: payload.option
		})
	}

	async linkToExisting () {
		const {
			card
		} = this.props

		const {
			linkType,
			selectedTarget
		} = this.state

		if (!linkType || !selectedTarget) {
			return
		}

		// Create the link asynchronously without waiting for the result
		this.props.actions.createLink(card, selectedTarget, linkType.name)
		this.setState({
			selectedTarget: null
		})

		// Trigger the onHide callback to close the modal
		this.props.onHide()
	}

	async getLinkTargets (term) {
		try {
			const {
				linkType
			} = this.state

			// If there is no search term, return an empty array
			if (!linkType || !term) {
				return []
			}

			// Retrieve the target type of the selected link
			const typeCard = _.find(this.props.types, {
				slug: linkType.data.to
			})

			// Create full text search query based on the target type and search term
			const filter = helpers.createFullTextSearchFilter(typeCard.data.schema, term)

			// Additionally, restrict the query to only filter for cards of the chosen
			// type
			_.set(filter, [ 'properties', 'type' ], {
				type: 'string',
				const: typeCard.slug
			})

			// Query the API for results and set them to state so they can be accessed
			// when an option is selected
			const results = await this.props.actions.queryAPI(filter)
			this.setState({
				results
			})

			// Return the results in a format understood by the AsyncSelect component
			return results.map((card) => {
				return {
					label: card.name || card.slug || card.id,
					value: card.id
				}
			})
		} catch (error) {
			this.props.actions.addNotification('danger', error.message || error)
		}

		return null
	}

	render () {
		const {
			card,
			show,
			types,
			target
		} = this.props
		const {
			selectedTarget,
			linkType
		} = this.state

		if (!show) {
			return null
		}

		// Create an array of available link types, then map over them and move the
		// data.title file to the root of the object, as the rendition Select
		// component can't use a non-root field for the `labelKey` prop
		// TODO make the Select component allow nested fields for the `labelKey` prop
		let linkTypeTargets = _.filter(constants.LINKS, [ 'data.from', card.type ])
			.map((constraint) => {
				return Object.assign({}, constraint, {
					title: constraint.data.title
				})
			})

		// If the target prop was provided, restrict link options to those that can
		// link to the target
		if (target) {
			linkTypeTargets = _.filter(linkTypeTargets, [ 'data.to', target.type ])
		}

		if (!linkTypeTargets.length) {
			console.error(`No known link types for ${card.type}`)

			return null
		}

		// If there is a selectedTarget, create an object that AsyncSelect can use
		// as a value
		const selectTargetValue = selectedTarget ? {
			value: selectedTarget.id,
			label: selectedTarget.name || selectedTarget.slug
		} : null

		const typeCard = _.find(types, [ 'slug', card.type ])
		const typeName = typeCard ? typeCard.name : card.type

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
							value={linkType}
							onChange={this.handleLinkTypeSelect}
							labelKey="title"
							options={linkTypeTargets}
						/>
					)}
					<Box
						flex="1"
						ml={2}
						data-test="card-linker--existing__input"
					>
						<Async
							classNamePrefix="jellyfish-async-select"
							isDisabled={Boolean(target)}
							value={selectTargetValue}
							cacheOptions defaultOptions
							onChange={this.handleTargetSelect}
							loadOptions={this.getLinkTargets}
						/>
					</Box>
				</Flex>
			</Modal>
		)
	}
}
