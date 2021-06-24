/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react';
import _ from 'lodash';
import skhema from 'skhema';
import clone from 'deep-copy';
import type { JSONSchema7 } from 'json-schema';
import { Box, Filters, Flex, Search, Theme } from 'rendition';
import SortByButton from './SortByButton';

const getSchemaForFilters = (tailTypes, timelineFilter) => {
	const tailSchemas = _.map(tailTypes, (tailType) => {
		return clone(_.get(tailType, ['data', 'schema'], {}));
	});

	// TODO: Improve safety of skhema.merge so that it doesn't throw if the
	// skhemas can't be merged. That way we can merge all the typesSchemas
	// instead of just the first one.
	const schemaForFilters = skhema.merge([_.first(tailSchemas)]);

	// Always expose the loop, created_at and updated_at field for filtering
	_.set(schemaForFilters, ['properties', 'created_at'], {
		title: 'Created at',
		type: 'string',
		format: 'date-time',
	});
	_.set(schemaForFilters, ['properties', 'updated_at'], {
		title: 'Last updated',
		type: 'string',
		format: 'date-time',
	});
	_.set(schemaForFilters, ['properties', 'loop'], {
		title: 'Loop',
		type: 'string',
	});

	// Add the timeline link prop to spoof the filters component into generating
	// subschemas for the $$links property - see the createSyntheticViewCard()
	// method for how we unpack the filters
	_.set(schemaForFilters, ['properties', timelineFilter], {
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
								type: 'string',
							},
						},
					},
				},
			},
		},
	});
	return schemaForFilters;
};

const ViewFilters = ({
	tailTypes,
	filters,
	searchFilter,
	updateFilters,
	saveView,
	searchTerm,
	updateSearch,
	updateFiltersFromSummary,
	pageOptions,
	setSortByField,
	timelineFilter,
}) => {
	const summaryFilters = _.compact([...filters, searchFilter]);

	const schemaForFilters = getSchemaForFilters(tailTypes, timelineFilter);

	// Only render filters in compact mode for the first breakpoint
	const FiltersBreakpointSettings = _.sortBy(Theme.breakpoints).map(
		(breakpoint, index) => Boolean(index <= 0),
	);
	return (
		<React.Fragment>
			<Box flex="1">
				<Flex mt={0} flex="1 0 auto" justifyContent="space-between">
					<Filters
						schema={schemaForFilters as JSONSchema7}
						filters={filters}
						onFiltersUpdate={updateFilters}
						onViewsUpdate={saveView}
						compact={FiltersBreakpointSettings}
						renderMode={['add']}
					/>
					<Flex
						flexWrap="wrap"
						alignItems="center"
						justifyContent="flex-end"
						flex={1}
					>
						<Box mb={3} flex="0 1 500px">
							<Search
								className="view__search"
								value={searchTerm}
								onChange={updateSearch}
							/>
						</Box>
						<SortByButton
							pageOptions={pageOptions}
							setSortByField={setSortByField}
							tailTypes={tailTypes}
							ml={2}
							mb={3}
							minWidth="150px"
						/>
					</Flex>
				</Flex>
			</Box>
			{summaryFilters.length > 0 && (
				<Box flex="1 0 auto" mt={-3} data-test="view__filters-summary-wrapper">
					<Filters
						schema={schemaForFilters as JSONSchema7}
						filters={summaryFilters}
						onFiltersUpdate={updateFiltersFromSummary}
						onViewsUpdate={saveView}
						renderMode={['summary']}
					/>
				</Box>
			)}
		</React.Fragment>
	);
};

export default ViewFilters;
