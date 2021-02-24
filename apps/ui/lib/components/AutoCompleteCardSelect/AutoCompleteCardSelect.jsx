/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable no-underscore-dangle */

import _ from 'lodash'
import React from 'react'
import skhema from 'skhema'
import AsyncSelect from 'react-select/async'
import {
	Badge, Flex, Txt
} from 'rendition'
import debounce from 'debounce-promise'
import {
	helpers
} from '@balena/jellyfish-ui-components'

const preventClickPropagation = (event) => {
	event.stopPropagation()
	event.preventDefault()
}

export default class AutoCompleteCardSelect extends React.Component {
	constructor (props) {
		super(props)
		this.state = {
			results: []
		}

		this.getTargets = debounce(this.getTargets.bind(this), 500)
		this.onChange = this.onChange.bind(this)
	}

	createContainer () {
		this.container = document.createElement('div')
		this.container.addEventListener('mousedown', preventClickPropagation)
		document.body.appendChild(this.container)
	}

	disposeContainer () {
		this.container.parentNode.removeChild(this.container)
		this.container.removeEventListener('mousedown', preventClickPropagation)
		this.container = null
	}

	componentDidMount () {
		this._isMounted = true
		this.createContainer()
	}

	componentWillUnmount () {
		this._isMounted = false
		this.disposeContainer()
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
			getQueryFilter,
			cardFilter,
			cardType,
			types,
			sdk
		} = this.props
		const cardTypes = _.castArray(cardType)

		let queryFilter = null
		if (getQueryFilter) {
			queryFilter = getQueryFilter(value)
		} else if (value) {
			queryFilter = {
				type: 'object',
				anyOf: _.compact(_.flatMap(cardTypes, (cardTypeSlug) => {
					// Retrieve the target type of the selected link
					const typeCard = _.find(types, {
						slug: helpers.getTypeBase(cardTypeSlug)
					})
					const baseFilter = skhema.merge([
						{
							type: 'object',
							required: [ 'type' ],
							properties: {
								type: {
									const: `${typeCard.slug}@${typeCard.version}`
								}
							}
						},
						cardFilter
					])
					const searchFilter = helpers.createFullTextSearchFilter(typeCard.data.schema, value, {
						fullTextSearchFieldsOnly: true
					})
					if (!searchFilter) {
						return null
					}
					return _.map(searchFilter.anyOf, (subSchema) => {
						return skhema.merge([ baseFilter, subSchema ])
					})
				}))
			}
		} else {
			queryFilter = {
				type: 'object',
				required: [ 'type' ],
				properties: {
					type: {
						enum: cardTypes.map((cardTypeSlug) => {
							const typeCard = _.find(types, {
								slug: helpers.getTypeBase(cardTypeSlug)
							})
							return `${typeCard.slug}@${typeCard.version}`
						})
					}
				}
			}
		}

		// Query the API for results and set them to state so they can be accessed
		// when an option is selected
		const results = await sdk.query(queryFilter, {
			limit: 50
		})

		// If the card type was changed while the request was in-flight, we should discard these results
		if (!_.isEqual(cardType, this.props.cardType)) {
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
				slug: helpers.getTypeBase(card.type)
			})

			return {
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
				menuPortalTarget={this.container}
				styles={{
					// Ensure the menu portal shows on top of a modal
					menuPortal: (base) => {
						return {
							...base, zIndex: 100
						}
					}
				}}
				formatOptionLabel={(option) => {
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
				}}
				{...rest}
			/>
		)
	}
}
