/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable no-underscore-dangle */

import _ from 'lodash'
import React from 'react'
import AsyncSelect from 'react-select/async'
import * as helpers from '../services/helpers'

export default class AutoCompleteCardSelect extends React.Component {
	constructor (props) {
		super(props)
		this.state = {
			results: []
		}

		this.getTargets = this.getTargets.bind(this)
		this.onChange = this.onChange.bind(this)
	}

	componentDidMount () {
		this._isMounted = true
	}

	componentWillUnmount () {
		this._isMounted = false
	}

	componentDidUpdate (prevProps) {
		// If the card type is changed, we should reset
		if (prevProps.cardType !== this.props.cardType) {
			this.setState({
				results: []
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

		// If the card type was changed while the request was in-flight, we should discard these results
		if (cardType !== this.props.cardType) {
			return []
		}

		if (this._isMounted) {
			this.setState({
				results
			})
		}

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
			actions,
			analytics,
			cardType,
			sdk,
			types,
			onChange,
			value,
			...rest
		} = this.props

		return (
			<AsyncSelect
				key={cardType}
				classNamePrefix="jellyfish-async-select"
				value={value}
				isClearable
				defaultOptions
				onChange={this.onChange}
				loadOptions={this.getTargets}
				{...rest}
			/>
		)
	}
}
