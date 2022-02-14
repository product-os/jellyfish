import _ from 'lodash';
import type { JSONSchema7 } from 'json-schema';
import React, { useState } from 'react';
import { CSVLink } from 'react-csv';
import {
	Box,
	Button,
	Divider,
	FiltersProps,
	Flex,
	Heading,
	Search,
	SelectProps,
	Txt,
} from 'rendition';
import styled from 'styled-components';
import { Contract, TypeContract } from '@balena/jellyfish-types/build/core';
import { JsonSchema } from '@balena/jellyfish-types';
import { flatten } from 'flat';
import { helpers, CloseButton, Icon } from '@balena/jellyfish-ui-components';
import { BookmarkButton } from '../../../../components/BookmarkButton';
import CardActions from '../../../../components/CardActions';
import Markers from '../../../../components/Markers';
import { LensContract, ChannelContract } from '../../../../types';
import { LensSelection } from './LensSelection';
import ViewFilters from './ViewFilters';
import SortByButton from './ViewFilters/SortByButton';
import { SortDirButton } from './ViewFilters/SortDirButton';

// Style CSV link to match rendition theme
const CSVLinkWrapper = styled(Box)`
	a {
		display: block;
		font-size: 14px;
		color: #00aeef;
		text-decoration: none;
		padding: 8px 16px;
		width: 100%;
		display: block !important;
		cursor: pointer;
		margin: 0;

		&: hover {
			color: #008bbf;
			background-color: #f4f4f4 !important;
		}
	}
`;

const StyledSearch = styled(Search)`
	padding-left: 0px;
	svg.search-icon {
		display: none;
	}
	min-width: 90px;
	input {
		padding-left: 0px;
	}
`;

const HeaderBox = styled(Box)`
	border-bottom: 1px solid #eee;
`;

interface HeaderProps {
	allTypes: TypeContract[];
	channel: ChannelContract;
	filters: JSONSchema7[];
	isMobile: boolean;
	lens: LensContract;
	lenses: LensContract[];
	onSortOptionsChange: (sortOptions: {
		sortBy?: string;
		sortDir?: 'desc' | 'asc';
	}) => void;
	pageOptions: { sortBy: string[] | string; sortDir: 'asc' | 'desc' };
	saveView: FiltersProps['onViewsUpdate'];
	searchFilter: JsonSchema;
	searchTerm: string;
	setLens: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
	tail: null | Contract[];
	tailTypes: TypeContract[];
	updateFilters: (filters: JSONSchema7[]) => void;
	updateFiltersFromSummary: (filters: JSONSchema7[]) => void;
	updateSearch: (value: any) => void;
}

export default React.memo<HeaderProps>((props) => {
	const {
		isMobile,
		lenses,
		setLens,
		lens,
		filters,
		tailTypes,
		allTypes,
		updateFilters,
		saveView,
		channel,
		searchFilter,
		searchTerm,
		updateSearch,
		updateFiltersFromSummary,
		pageOptions,
		onSortOptionsChange,
		tail,
	} = props;

	if (!channel.data.head) {
		return null;
	}

	const csvName = `${channel.data.head.slug}_${new Date().toISOString()}.csv`;
	const csvData = tail
		? tail.map((contract) => {
				// To keep the CSV functionality simple, don't include any link data in the output
				const flattened: any = flatten(
					{
						...contract,
						links: {},
						linked_at: contract.linked_at || {},
					},
					{
						// "safe" option preserves arrays, preventing a new header being created for each tag/marker
						safe: true,
					},
				);
				// react-csv does not correctly escape double quotes in fields, so it has to be done here.
				// Once https://github.com/react-csv/react-csv/pull/287 is resolved, we need to remove this code
				return _.mapValues(flattened, (field) => {
					// escape all non-escaped double-quotes (double double-quotes escape them in CSV)
					return _.isString(field)
						? field.replace(/([^"]|^)"(?=[^"]|$)/g, '$1""')
						: field;
				});
		  })
		: [];

	const csvHeaders = csvData.length
		? Object.keys(csvData[0]).map((key) => {
				return {
					key,
					label: key.split('.').pop(),
				};
		  })
		: [];

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

	const [showFilters, setShowFilters] = useState(false);

	return (
		<HeaderBox>
			<Flex
				p={3}
				pb={0}
				flexDirection={['column-reverse', 'column-reverse', 'row']}
				justifyContent="space-between"
				alignItems="center"
			>
				<Box>
					{channel.data.head.name && <Txt bold>{channel.data.head.name}</Txt>}
					<Markers px={0} card={channel.data.head} />
				</Box>
				<Flex alignSelf={['flex-end', 'flex-end', 'flex-start']}>
					<CardActions card={channel.data.head}>
						<CSVLinkWrapper>
							<CSVLink
								data={csvData}
								headers={csvHeaders as any}
								filename={csvName}
							>
								Download results as CSV
							</CSVLink>
						</CSVLinkWrapper>
					</CardActions>

					<CloseButton
						flex={0}
						p={3}
						py={2}
						mr={-2}
						mt={[-2, -2, 0]}
						channel={channel}
					/>
				</Flex>
			</Flex>

			<Divider width="100%" color={helpers.colorHash('view')} />

			<Flex flexDirection={['column', 'column', 'row']}>
				<Flex px={3} pb={2} justifyContent="space-between">
					<Box>
						<StyledSearch
							className="view__search"
							value={searchTerm}
							onChange={updateSearch}
						/>
					</Box>

					<Flex ml={2} alignItems="center">
						<Button
							data-test="show-filters"
							plain
							onClick={() => setShowFilters(!showFilters)}
						>
							Filters &nbsp;
							<Icon name="chevron-down" />
						</Button>
					</Flex>
				</Flex>

				<Flex
					px={3}
					pb={2}
					alignItems="center"
					justifyContent={'flex-end'}
					flex={1}
				>
					<LensSelection ml={2} lenses={lenses} lens={lens} setLens={setLens} />
				</Flex>
			</Flex>

			<ViewFilters
				show={showFilters}
				tailTypes={tailTypes}
				allTypes={allTypes}
				filters={filters}
				searchFilter={searchFilter}
				updateFilters={updateFilters}
				saveView={saveView}
				updateFiltersFromSummary={updateFiltersFromSummary}
				pageOptions={pageOptions}
				onSortOptionsChange={onSortOptionsChange}
			/>
		</HeaderBox>
	);
});
