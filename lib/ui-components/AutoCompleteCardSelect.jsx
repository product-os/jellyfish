/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import React from 'react'
import Async from 'react-select/lib/Async'
import {
	withSetup
} from './SetupProvider'
import * as helpers from './services/helpers'

class AutoCompleteCardSelect extends React.Component {
	constructor (props) {
		super(props)
		this.state = {
			selectedValue: null,
			results: []
		}

		this.getTargets = this.getTargets.bind(this)
		this.onChange = this.onChange.bind(this)
	}

	componentDidUpdate (prevProps) {
		// If the card type is changed, we should reset
		if (prevProps.cardType !== this.props.cardType) {
			this.setState({
				results: [],
				selectedValue: null
			})
			this.props.onChange(null)
		}
	}

	onChange (option) {
		// Find the full card from cached results and return it
		const selectedCard = option
			? (_.find(this.state.results, {
				id: option.value
			}) || null) : null

		// Cache an AsyncSelect-compatible format of the selected option
		const selectedValue = selectedCard ? {
			value: selectedCard.id,
			label: selectedCard.name || selectedCard.slug
		} : null

		this.setState({
			selectedValue
		})

		this.props.onChange(selectedCard)
	}

	async getTargets (value) {
		const {
			cardType,
			types,
			sdk
		} = this.props

		// Retrieve the target type of the selected link
		const typeCard = _.find(types, {
			slug: cardType.split('@')[0]
		})

		// Create full text search query based on the target type and search term
		const filter = helpers.createFullTextSearchFilter(typeCard.data.schema, value)

		// Additionally, restrict the query to only filter for cards of the chosen
		// type
		_.set(filter, [ 'properties', 'type' ], {
			type: 'string',
			const: `${typeCard.slug}@${typeCard.version}`
		})

		// Query the API for results and set them to state so they can be accessed
		// when an option is selected
		const results = await sdk.query(filter)
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
	}

	render () {
		const {
			cardType
		} = this.props
		const {
			selectedValue
		} = this.state

		return (
			<Async
				key={cardType}
				classNamePrefix="jellyfish-async-select"
				value={selectedValue}
				isClearable
				cacheOptions
				defaultOptions
				onChange={this.onChange}
				loadOptions={this.getTargets}
			/>
		)
	}
}

export default withSetup(AutoCompleteCardSelect)
