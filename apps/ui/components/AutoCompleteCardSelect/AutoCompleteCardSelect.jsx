/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable no-underscore-dangle */

import _ from 'lodash'
import React from 'react'
import AsyncSelect from 'react-select/async'
import {
	Badge, Flex, Txt
} from 'rendition'
import * as helpers from '@balena/jellyfish-ui-components/lib/services/helpers'

const defaultOptionLabel = (option) => {
	return (
		<Flex alignItems="center" justifyContent="center">
			{option.type && (
				<Badge shade={option.shade} mr={2}>{option.type}</Badge>
			)}
			<Txt style={{
				flex: 1,
				whiteSpace: 'nowrap',
				overflow: 'hidden',
				textOverflow: 'ellipsis'
			}}>{option.label}</Txt>
		</Flex>
	)
}

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
		if (!_.isEqual(prevProps.cardType, this.props.cardType)) {
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
			getOption,
			cardFilter,
			cardType: cardTypes,
			types,
			sdk
		} = this.props

		const queryFilter = {
			type: 'object',
			anyOf: [].concat(cardTypes).map((cardType) => {
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

				// Merge with the provided filter (if given)
				return _.merge(filter, cardFilter)
			})
		}

		// Query the API for results and set them to state so they can be accessed
		// when an option is selected
		const results = await sdk.query(queryFilter, {
			limit: 50
		})

		// If the card type was changed while the request was in-flight, we should discard these results
		if (!_.isEqual(cardTypes, this.props.cardType)) {
			return []
		}

		if (this._isMounted) {
			this.setState({
				results
			})
		}

		// Return the results in a format understood by the AsyncSelect component
		return results.map((card) => {
			const typeCardIndex = _.findIndex(types, {
				slug: card.type.split('@')[0]
			})

			return getOption ? getOption(card) : {
				label: card.name || card.slug || card.id,
				value: card.id,
				type: types[typeCardIndex].name,
				shade: typeCardIndex
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
			isClearable,
			formatOptionLabel,
			...rest
		} = this.props

		return (
			<AsyncSelect
				key={cardType}
				classNamePrefix="jellyfish-async-select"
				value={value}
				isClearable={isClearable}
				defaultOptions
				onChange={this.onChange}
				loadOptions={this.getTargets}
				menuPortalTarget={document.body}
				styles={{
					// Ensure the menu portal shows on top of a modal
					menuPortal: (base) => {
						return {
							...base, zIndex: 100
						}
					}
				}}
				formatOptionLabel={formatOptionLabel}
				{...rest}
			/>
		)
	}
}

AutoCompleteCardSelect.defaultProps = {
	formatOptionLabel: defaultOptionLabel,
	isClearable: true
}
