/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import clone from 'deep-copy'
import {
	Box,
	Filters,
	Flex,
	Search,
	Theme
} from 'rendition'
import {
	TIMELINE_FILTER_PROP
} from './constants'

const getSchemaForFilters = (tailType) => {
	// Always expose the created_at and updated_at field for filtering
	const schemaForFilters = _.get(clone(tailType), [ 'data', 'schema' ], {})
	_.set(schemaForFilters, [ 'properties', 'created_at' ], {
		title: 'Created at',
		type: 'string',
		format: 'date-time'
	})
	_.set(schemaForFilters, [ 'properties', 'updated_at' ], {
		title: 'Last updated',
		type: 'string',
		format: 'date-time'
	})

	// Add the timeline link prop to spoof the filters component into generating
	// subschemas for the $$links property - see the createSyntheticViewCard()
	// method for how we unpack the filters
	_.set(schemaForFilters, [ 'properties', TIMELINE_FILTER_PROP ], {
		title: 'Timeline',
		type: 'object',
		properties: {
			data: {
				type: 'object',
				properties: {
					payload: {
						type: 'object',
						properties: {
							message: {
								title: 'Timeline message',
								type: 'string'
							}
						}
					}
				}
			}
		}
	})
	return schemaForFilters
}

const ViewFilters = ({
	tailType,
	filters,
	searchFilter,
	updateFilters,
	saveView,
	searchTerm,
	updateSearch,
	updateFiltersFromSummary
}) => {
	const isView = Boolean(tailType) && tailType.slug !== 'view'
	if (!isView) {
		return null
	}
	const summaryFilters = _.compact([ ...filters, searchFilter ])

	const schemaForFilters = getSchemaForFilters(tailType)

	// Only render filters in compact mode for the first breakpoint
	const FiltersBreakpointSettings = _.sortBy(Theme.breakpoints).map((breakpoint, index) => Boolean(index <= 0))
	return (
		<React.Fragment>
			<Box flex="1">
				<Flex mt={0} flex="1 0 auto" justifyContent="space-between">
					<Filters
						schema={schemaForFilters}
						filters={filters}
						onFiltersUpdate={updateFilters}
						onViewsUpdate={saveView}
						compact={FiltersBreakpointSettings}
						renderMode={[ 'add' ]}
					/>
					<Box mb={3} flex="0 1 500px">
						<Search
							className="view__search"
							value={searchTerm}
							onChange={updateSearch}
						/>
					</Box>
				</Flex>
			</Box>
			{summaryFilters.length > 0 && (
				<Box flex="1 0 auto" mt={-3} data-test="view__filters-summary-wrapper">
					<Filters
						schema={schemaForFilters}
						filters={summaryFilters}
						onFiltersUpdate={updateFiltersFromSummary}
						onViewsUpdate={saveView}
						renderMode={[ 'summary' ]}
					/>
				</Box>
			)}
		</React.Fragment>
	)
}

export default ViewFilters
