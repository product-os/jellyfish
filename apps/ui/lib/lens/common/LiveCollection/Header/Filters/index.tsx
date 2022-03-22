import React from 'react';
import _ from 'lodash';
import skhema from 'skhema';
import clone from 'deep-copy';
import type { JSONSchema7 } from 'json-schema';
import {
	Box,
	Filters,
	FiltersProps,
	Flex,
	SchemaSieve,
	Theme,
} from 'rendition';
import styled from 'styled-components';
import SortByButton from './SortByButton';
import { SortDirButton } from './SortDirButton';
import type { JsonSchema } from '@balena/jellyfish-types';
import type { TypeContract } from '@balena/jellyfish-types/build/core';
import { linkConstraints } from '@balena/jellyfish-client-sdk';
import * as helpers from '../../../../../services/helpers';
import {
	getLinkedContractDataFilterKey,
	compareFilterFields,
	LINKED_CONTRACT_PREFIX,
} from './filter-utils';

type JsonSchemaObject = Exclude<JsonSchema, boolean>;

const StyledSummaryWrapper = styled(Box)`
	> div {
		margin-bottom: 0;
		background: red;
		> div {
			margin: 0;
			padding-top: 8px;
			padding-bottom: 8px;
			&: first-child {
				padding: 0;
			}
			> div:first-child {
				display: none;
			}
			> div {
				> div {
					margin-top: 0;
				}
			}
		}
	}
`;

const simplifiedCardProperties = {
	created_at: {
		title: 'Created at',
		type: 'string',
		format: 'date-time',
	},
	updated_at: {
		title: 'Last updated',
		type: 'string',
		format: 'date-time',
	},
	loop: {
		title: 'Loop',
		type: 'string',
	},
	slug: {
		title: 'Slug',
		type: 'string',
	},
	id: {
		title: 'ID',
		type: 'string',
		format: 'uuid',
	},
};

const getSchemaForFilters = (tailTypes, allTypes) => {
	const tailSchemas = _.map(tailTypes, (tailType) => {
		return clone(_.get(tailType, ['data', 'schema'], {}));
	});

	// TODO: Improve safety of skhema.merge so that it doesn't throw if the
	// skhemas can't be merged. That way we can merge all the typesSchemas
	// instead of just the first one.
	const unflattenedSchemaForFilters = skhema.merge([
		_.first(tailSchemas),
	]) as JsonSchema;

	// The filters component doesn't care if our schema is flat or not, but
	// by flattening it, it's easier to set the title field for each item.
	const schemaForFilters = SchemaSieve.flattenSchema(
		unflattenedSchemaForFilters as JSONSchema7,
	);

	// Set the filter titles to be Start Case
	_.forEach(schemaForFilters.properties, (prop, propName) => {
		const filterSchema = prop as JsonSchemaObject;
		filterSchema.title = _.startCase(filterSchema.title || propName);
	});

	// Always expose the loop, created_at and updated_at field for filtering
	_.merge(
		schemaForFilters.properties,
		_.pick(simplifiedCardProperties, 'created_at', 'updated_at', 'loop'),
	);

	// Get all relevant link constraints from the tail type
	const firstTailType = tailTypes[0];
	const filteredLinkConstraints = _.filter(
		linkConstraints,
		(linkConstraint) => {
			// TODO: We exclude '*' link constraints that can link to any type as that would make for
			// an insanely large list of filter options. But we should find _some_ way to accomodate
			// this kind of link constraint in the future.
			return (
				linkConstraint.data.from === firstTailType.slug &&
				linkConstraint.data.to !== '*'
			);
		},
	);

	// For each relevant link constraint...
	for (const linkConstraint of filteredLinkConstraints) {
		// Get the flattened contract schema
		const toType: TypeContract = helpers.getType(
			linkConstraint.data.to,
			allTypes,
		);
		if (!toType) {
			// This link constraint points to a contract type that can't be found - so ignore it
			continue;
		}
		const flattenedLinkContractSchema = SchemaSieve.flattenSchema(
			toType.data.schema as JSONSchema7,
		) as JsonSchemaObject;

		// Always expose certain fields for filtering by linked contracts
		_.merge(flattenedLinkContractSchema.properties, simplifiedCardProperties);

		// For each flattened schema property...
		_.forEach(
			flattenedLinkContractSchema.properties,
			(schema: JsonSchema, keyPath: string) => {
				// Create a filter, encoding the link verb and the linked contract type in the filter key
				const fieldTitle = _.startCase(
					_.get(schema, 'title', _.last(keyPath.split('___'))),
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
						...(schema as JsonSchemaObject),
						title: `${LINKED_CONTRACT_PREFIX} ${linkConstraint.data.title}: ${fieldTitle}`,
					},
				);
			},
		);
	}

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

	// TODO: Port this fix to rendition
	// When filtering, the readonly property is irrelevant and should be ignored
	_.forEach(schemaForFilters.properties, (value) => {
		if (typeof value !== 'boolean' && value.readOnly) {
			value.readOnly = false;
		}
	});

	return schemaForFilters;
};

interface ViewFiltersProps {
	show: boolean;
	onSortOptionsChange: (sortOptions: {
		sortBy?: string;
		sortDir?: 'desc' | 'asc';
	}) => void;
	pageOptions: { sortBy: string | string[]; sortDir: 'desc' | 'asc' };
	updateFiltersFromSummary: (filters: JSONSchema7[]) => void;
	allTypes: TypeContract[];
	filters: JSONSchema7[];
	saveView: FiltersProps['onViewsUpdate'];
	searchFilter: JsonSchema;
	tailTypes: TypeContract[];
	updateFilters: (filters: JSONSchema7[]) => void;
}

const ViewFilters = React.memo<ViewFiltersProps>(
	({
		show,
		tailTypes,
		allTypes,
		filters,
		searchFilter,
		updateFilters,
		saveView,
		updateFiltersFromSummary,
		pageOptions,
		onSortOptionsChange,
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

		const handleSortByChange = React.useCallback(
			(sortBy) => {
				onSortOptionsChange({
					sortBy,
				});
			},
			[onSortOptionsChange],
		);

		const handleSortDirChange = React.useCallback(
			(sortDir) => {
				onSortOptionsChange({
					sortDir,
				});
			},
			[onSortOptionsChange],
		);

		if (show) {
			return (
				<Box px={3}>
					<Flex mt={0} flexWrap="wrap" justifyContent="space-between">
						<Flex
							alignItems="center"
							justifyContent="flex-start"
							flex="1 1 300px"
						>
							<Filters
								schema={schemaForFilters as JSONSchema7}
								filters={filters}
								onFiltersUpdate={updateFilters}
								onViewsUpdate={saveView}
								compact={filtersBreakpointSettings}
								renderMode={['add']}
								filterFieldCompareFn={compareFilterFields}
							/>
						</Flex>
					</Flex>
					{summaryFilters.length > 0 && (
						<Box
							flex="1 0 auto"
							data-test="view__filters-summary-wrapper"
							mt={2}
						>
							<Filters
								schema={schemaForFilters as JSONSchema7}
								filters={summaryFilters as JSONSchema7[]}
								onFiltersUpdate={updateFiltersFromSummary}
								onViewsUpdate={saveView}
								renderMode={['summary']}
							/>
						</Box>
					)}

					<Flex
						mx={-2}
						alignItems="center"
						justifyContent="space-between"
						flex={1}
						mt={2}
					>
						<SortByButton
							pageOptions={pageOptions}
							setSortByField={handleSortByChange}
							tailTypes={tailTypes}
							mx={2}
							mb={2}
							minWidth="150px"
						/>
						<SortDirButton
							value={pageOptions.sortDir}
							onChange={handleSortDirChange}
							mx={2}
							mb={2}
							minWidth="50px"
						/>
					</Flex>
				</Box>
			);
		}

		return (
			<StyledSummaryWrapper>
				<Filters
					schema={schemaForFilters as JSONSchema7}
					filters={summaryFilters as JSONSchema7[]}
					onFiltersUpdate={updateFiltersFromSummary}
					onViewsUpdate={saveView}
					renderMode={['summary']}
				/>
			</StyledSummaryWrapper>
		);
	},
);

export default ViewFilters;
