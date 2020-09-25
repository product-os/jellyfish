/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	Flex
} from 'rendition'
import Collapsible from '@balena/jellyfish-ui-components/lib/Collapsible'
import {
	CloseButton
} from '@balena/jellyfish-ui-components/lib/shame/CloseButton'
import Markers from '../../../../components/Markers'
import LensSelection from './LensSelection'
import SliceOptions from './SliceOptions'
import ViewFilters from './ViewFilters'
import {
	withTheme
} from 'styled-components'

class Header extends React.Component {
	render () {
		const {
			isMobile,
			sliceOptions,
			activeSlice,
			setSlice,
			lenses,
			setLens,
			lens,
			filters,
			tailType,
			updateFilters,
			saveView,
			channel,
			searchFilter,
			searchTerm,
			updateSearch,
			updateFiltersFromSummary,
			pageOptions,
			setSortByField,
			timelineFilter
		} = this.props

		if (!channel.data.head) {
			return null
		}

		return (
			<React.Fragment>
				<Flex alignItems="flex-start" mx={3} mt={3} style={{
					flexShrink: 0
				}}>
					<Collapsible
						title="Filters and Lenses"
						maxContentHeight="70vh"
						flex={1}
						collapsible={isMobile}
						data-test="filters-and-lense"
					>
						<Flex
							mt={[ 2, 2, 0 ]}
							flexWrap={[ 'wrap', 'wrap', 'nowrap' ]}
							flexDirection="row-reverse"
							alignItems={[ 'flex-start', 'flex-start', 'center' ]}
						>
							<Flex mb={3} alignItems="center" justifyContent="flex-end" minWidth={[ '100%', '100%', 'auto' ]}>
								<SliceOptions
									sliceOptions={sliceOptions}
									activeSlice={activeSlice}
									setSlice={setSlice}
								/>
								<LensSelection
									lenses={lenses}
									lens={lens}
									setLens={setLens}
								/>
							</Flex>
						</Flex>
						<ViewFilters
							tailType={tailType}
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
						mr={-3}
						mt={[ -2, -2, 0 ]}
						channel={channel}
					/>
				</Flex>

				<Markers card={channel.data.head} />
			</React.Fragment>
		)
	}
}

export default withTheme(Header)
