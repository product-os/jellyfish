/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import skhema from 'skhema'
import memoize from 'memoize-one'
import {
	circularDeepEqual
} from 'fast-equals'
import clone from 'deep-copy'
import {
	Select
} from 'rendition'
import {
	helpers
} from '@balena/jellyfish-ui-components'
import {
	sdk
} from '../../../../../core'

// Do not include fields with array type (doesn't make sense to sort by an array), as well as the id, version, active, or type fields
const FIELDS_TO_OMIT = [ {
	key: 'type',
	value: 'array'
}, {
	field: 'id'
}, {
	field: 'version'
}, {
	field: 'active'
}, {
	field: 'type'
} ]

const PREFIX = 'Sort by: '

const isSupportView = memoize((types) => {
	return _.find(types, {
		slug: 'support-thread'
	})
})

const getSortByOptions = (cardSchema, tailTypes) => {
	const tailSchemas = _.map(tailTypes, (tailType) => {
		return clone(_.get(tailType, [ 'data', 'schema' ], {}))
	})

	// Merge generic card schema with current card schema to get top-level and data fields
	const fullSchema = skhema.merge([ cardSchema, ...tailSchemas ])

	const dataFieldPaths = helpers.getPathsInSchema(fullSchema, FIELDS_TO_OMIT)

	return _.map(dataFieldPaths, ({
		path, title
	}) => {
		return {
			title: `${PREFIX}${title}`,
			value: _.join(path, '.')
		}
	})
}

export default class SortByDropdown extends React.Component {
	constructor (props) {
		super(props)
		this.state = {
			sortByOptions: [],
			cardSchema: {},

			// TODO remove this once we have support for sorting by linked cards
			isSupportView: false
		}
		this.handleSortBySelectionChange = this.handleSortBySelectionChange.bind(this)
	}

	async componentDidMount () {
		const {
			tailTypes
		} = this.props

		// TODO remove this once we have support for sorting by linked cards
		if (isSupportView(tailTypes)) {
			this.setState({
				isSupportView: true
			})
			return
		}
		const {
			data: {
				schema: cardSchema
			}
		} = await sdk.getBySlug('card@1.0.0')

		this.setState({
			sortByOptions: getSortByOptions(cardSchema, tailTypes),
			cardSchema
		})
	}

	async componentDidUpdate ({
		tailTypes: prevTailTypes
	}) {
		const {
			tailTypes
		} = this.props

		const prevTailTypeSlugs = _.map(prevTailTypes, 'slug')
		const tailTypeSlugs = _.map(tailTypes, 'slug')

		// If the tail types have changed, recalculate the sort by options
		// TODO remove check for support view once we have support for sorting by linked cards
		if (!circularDeepEqual(tailTypeSlugs, prevTailTypeSlugs) && !this.state.isSupportView) {
			this.setState({
				sortByOptions: getSortByOptions(this.state.cardSchema, tailTypes)
			})
		}
	}

	handleSortBySelectionChange ({
		option: {
			value
		}
	}) {
		const valueAsList = value.split('.')
		this.props.setSortByField(valueAsList)
	}

	render () {
		const {
			pageOptions: {
				sortBy: currentSortBy
			},
			setSortByField,
			tailTypes,
			...rest
		} = this.props

		// TODO remove this once we have support for sorting by linked cards
		if (this.state.isSupportView) {
			return null
		}

		const currentValue = {
			value: _.join(currentSortBy, '.')
		}

		return (
			<Select
				{...rest}
				labelKey='title'
				valueKey='value'
				value={currentValue}
				options={this.state.sortByOptions}
				onChange={this.handleSortBySelectionChange}
			/>
		)
	}
}
