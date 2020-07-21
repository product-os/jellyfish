/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import skhema from 'skhema'
import {
	Select
} from 'rendition'
import {
	getPathsInSchema
} from '@balena/jellyfish-ui-components/lib/services/helpers'
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

const getSortByOptions = (cardSchema, tailType) => {
	const dataSchema = _.get(tailType, [ 'data', 'schema' ])

	// Merge generic card schema with current card schema to get top-level and data fields
	const fullSchema = skhema.merge([ cardSchema, dataSchema ])

	const dataFieldPaths = getPathsInSchema(fullSchema, FIELDS_TO_OMIT)

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
			cardSchema: {}
		}
		this.handleSortBySelectionChange = this.handleSortBySelectionChange.bind(this)
	}

	async componentDidMount () {
		const {
			tailType
		} = this.props
		const {
			data: {
				schema: cardSchema
			}
		} = await sdk.getBySlug('card@1.0.0')

		this.setState({
			sortByOptions: getSortByOptions(cardSchema, tailType),
			cardSchema
		})
	}

	async componentDidUpdate ({
		tailType: prevTailType
	}) {
		const {
			tailType
		} = this.props

		if (tailType.slug !== prevTailType.slug) {
			this.setState({
				sortByOptions: getSortByOptions(this.state.cardSchema, tailType)
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
			tailType,
			...rest
		} = this.props

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
