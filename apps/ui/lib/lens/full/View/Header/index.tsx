/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react';
import { CSVLink } from 'react-csv';
import { Box, Flex, Heading, Txt } from 'rendition';
import { flatten } from 'flat';
import { CloseButton, Collapsible } from '@balena/jellyfish-ui-components';
import Markers from '../../../../components/Markers';
import { LensSelection } from './LensSelection';
import SliceOptions from './SliceOptions';
import ViewFilters from './ViewFilters';
import styled from 'styled-components';

// Style CSV link to match rendition theme
const CSVLinkWrapper = styled(Box)`
	a {
		display: block;
		font-size: 10px;
		color: #00aeef;
		text-decoration: none;

		&: hover {
			color: #008bbf;
		}
	}
`;

export default class Header extends React.Component<any, any> {
	render() {
		const {
			isMobile,
			sliceOptions,
			activeSlice,
			setSlice,
			lenses,
			setLens,
			lens,
			filters,
			tailTypes,
			updateFilters,
			saveView,
			channel,
			searchFilter,
			searchTerm,
			updateSearch,
			updateFiltersFromSummary,
			pageOptions,
			setSortByField,
			timelineFilter,
			tail,
		} = this.props;

		if (!channel.data.head) {
			return null;
		}

		const csvName = `${channel.data.head.slug}_${new Date().toISOString()}.csv`;
		const csvData = tail
			? tail.map((contract) => {
					// To keep the CSV functionality simple, don't include any link data in the output
					return flatten(
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

		return (
			<React.Fragment>
				<Flex
					alignItems="flex-start"
					mx={3}
					mt={3}
					style={{
						flexShrink: 0,
					}}
				>
					<Collapsible
						title="Filters and Lenses"
						maxContentHeight="70vh"
						flex={1}
						minWidth={0}
						collapsible={isMobile}
						data-test="filters-and-lenses"
					>
						<Flex
							mt={[2, 2, 0]}
							flexWrap={['wrap', 'wrap', 'nowrap']}
							flexDirection="row-reverse"
							justifyContent="space-between"
							alignItems={['flex-start', 'flex-start', 'center']}
						>
							<Flex
								mb={3}
								alignItems="center"
								justifyContent="flex-end"
								minWidth={['100%', '100%', 'auto']}
							>
								{!lens.data.supportsSlices && (
									<SliceOptions
										sliceOptions={sliceOptions}
										activeSlice={activeSlice}
										setSlice={setSlice}
									/>
								)}
								<LensSelection
									ml={3}
									lenses={lenses}
									lens={lens}
									setLens={setLens}
								/>
							</Flex>
							{!isMobile && channel.data.head.name && (
								<Heading.h4 mb={3}>{channel.data.head.name}</Heading.h4>
							)}
						</Flex>
						<ViewFilters
							tailTypes={tailTypes}
							filters={filters}
							searchFilter={searchFilter}
							updateFilters={updateFilters}
							saveView={saveView}
							searchTerm={searchTerm}
							updateSearch={updateSearch}
							updateFiltersFromSummary={updateFiltersFromSummary}
							pageOptions={pageOptions}
							setSortByField={setSortByField}
							timelineFilter={timelineFilter}
						/>
					</Collapsible>
					<CloseButton
						flex={0}
						p={3}
						py={2}
						mr={-2}
						mt={[-2, -2, 0]}
						channel={channel}
					/>
				</Flex>

				<Flex justifyContent="space-between">
					<Markers card={channel.data.head} />
					<CSVLinkWrapper mr={3}>
						<CSVLink data={csvData} headers={csvHeaders} filename={csvName}>
							Download as CSV
						</CSVLink>
					</CSVLinkWrapper>
				</Flex>
			</React.Fragment>
		);
	}
}
