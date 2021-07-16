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
import { Box, Filters, Flex, SchemaSieve, Search, Theme } from 'rendition';
import SortByButton from './SortByButton';
import { core, JSONSchema } from '@balena/jellyfish-types';
import { linkConstraints } from '@balena/jellyfish-client-sdk';
import { helpers } from '@balena/jellyfish-ui-components';
import {
	getLinkedContractDataFilterKey,
	compareFilterFields,
	LINKED_CONTRACT_PREFIX,
} from './filter-utils';

const getSchemaForFilters = (tailTypes, allTypes) => {
	const tailSchemas = _.map(tailTypes, (tailType) => {
		return clone(_.get(tailType, ['data', 'schema'], {}));
	});

	// TODO: Improve safety of skhema.merge so that it doesn't throw if the
	// skhemas can't be merged. That way we can merge all the typesSchemas
	// instead of just the first one.
	const unflattenedSchemaForFilters = skhema.merge([
		_.first(tailSchemas),
	]) as JSONSchema;

	// The filters component doesn't care if our schema is flat or not, but
	// by flattening it, it's easier to set the title field for each item.
	const schemaForFilters = SchemaSieve.flattenSchema(
		unflattenedSchemaForFilters,
	);

	// Set the filter titles to be Start Case
	_.forEach(schemaForFilters.properties, (prop, propName) => {
		const filterSchema = prop as JSONSchema;
		filterSchema.title = _.startCase(filterSchema.title || propName);
	});

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

	// Get all relevant link constraints from the tail type
	const firstTailType = tailTypes[0];
	const filteredLinkConstraints = _.filter(linkConstraints, {
		data: {
			from: firstTailType.slug,
		},
	});

	// For each relevant link constraint...
	filteredLinkConstraints.forEach((linkConstraint) => {
		// Get the flattened contract schema
		const toType: core.TypeContract = helpers.getType(
			linkConstraint.data.to,
			allTypes,
		);
		const flattenedLinkContractSchema = SchemaSieve.flattenSchema(
			toType.data.schema,
		) as JSONSchema;

		// For each flattened schema property...
		_.forEach(
			flattenedLinkContractSchema.properties,
			(schema: JSONSchema, keyPath: string) => {
				// Create a filter, encoding the link verb and the linked contract type in the filter key
				const fieldTitle = _.startCase(
					schema.title || _.last(keyPath.split('___')),
				);
				const linkedContractType = `${toType.slug}@${toType.version}`;
				_.set(
					schemaForFilters,
					[
						'properties',
						getLinkedContractDataFilterKey(
							linkConstraint.name,
							linkedContractType,
							`___${keyPath.replace(/^___/, '')}`,
						),
					],
					{
						...schema,
						title: `${LINKED_CONTRACT_PREFIX} ${linkConstraint.data.title}: ${fieldTitle}`,
					},
				);
			},
		);
	});

	// Manually add a 'Timeline message' filter
	_.set(
		schemaForFilters,
		[
			'properties',
			getLinkedContractDataFilterKey(
				'has attached element',
				['whisper@1.0.0', 'message@1.0.0'],
				'___data___payload___message',
			),
		],
		{
			type: 'string',
			title: 'Timeline message',
		},
	);
	return schemaForFilters;
};

const ViewFilters = React.memo<any>(
	({
		tailTypes,
		allTypes,
		filters,
		searchFilter,
		updateFilters,
		saveView,
		searchTerm,
		updateSearch,
		updateFiltersFromSummary,
		pageOptions,
		setSortByField,
	}) => {
		const summaryFilters = React.useMemo(() => {
			return _.compact([...filters, searchFilter]);
		}, [filters, searchFilter]);

		const schemaForFilters = React.useMemo(() => {
			return getSchemaForFilters(tailTypes, allTypes);
		}, [tailTypes]);

		// Only render filters in compact mode for the first breakpoint
		const filtersBreakpointSettings = React.useMemo(() => {
			return _.sortBy(Theme.breakpoints).map((breakpoint, index) =>
				Boolean(index <= 0),
			);
		}, [Theme.breakpoints]);

		return (
			<React.Fragment>
				<Box flex="1">
					<Flex mt={0} flex="1 0 auto" justifyContent="space-between">
						<Filters
							schema={schemaForFilters as JSONSchema7}
							filters={filters}
							onFiltersUpdate={updateFilters}
							onViewsUpdate={saveView}
							compact={filtersBreakpointSettings}
							renderMode={['add']}
							filterFieldCompareFn={compareFilterFields}
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
					<Box
						flex="1 0 auto"
						mt={-3}
						data-test="view__filters-summary-wrapper"
					>
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
	},
);

export default ViewFilters;
