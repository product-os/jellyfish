import _ from 'lodash';
import type { JSONSchema7 } from 'json-schema';
import React, { useState } from 'react';
import { Box, Button, FiltersProps, Flex, Search } from 'rendition';
import styled from 'styled-components';
import type { JsonSchema, TypeContract } from 'autumndb';
import { Icon } from '../../../../components';
import type { LensContract } from '../../../../types';
import { LensSelection } from './LensSelection';
import ViewFilters from './Filters';

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
	filters: JSONSchema7[];
	isMobile: boolean;
	lens: LensContract | null;
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
	tailTypes: TypeContract[];
	updateFilters: (filters: JSONSchema7[]) => void;
	updateFiltersFromSummary: (filters: JSONSchema7[]) => void;
	updateSearch: (value: any) => void;
}

export default React.memo<HeaderProps>((props) => {
	const {
		lenses,
		setLens,
		lens,
		filters,
		tailTypes,
		allTypes,
		updateFilters,
		saveView,
		searchFilter,
		searchTerm,
		updateSearch,
		updateFiltersFromSummary,
		pageOptions,
		onSortOptionsChange,
	} = props;

	const [showFilters, setShowFilters] = useState(false);

	return (
		<HeaderBox>
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
					<LensSelection
						ml={2}
						lenses={lenses || []}
						lens={lens}
						setLens={setLens}
					/>
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
