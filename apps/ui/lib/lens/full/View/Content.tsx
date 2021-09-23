/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react';
import _ from 'lodash';
import { Box, Flex, Txt } from 'rendition';
import { Icon } from '@balena/jellyfish-ui-components';
import { ViewFooter } from '../../common/ViewFooter';

const sortTail = (tail, options) => {
	if (!tail) {
		return null;
	}
	return _.orderBy(tail, options.sortBy, options.sortDir);
};

export default class Content extends React.Component<any, any> {
	render() {
		const {
			lens,
			activeLens,
			tail,
			channel,
			getQueryOptions,
			tailTypes,
			setPage,
			pageOptions,
		} = this.props;
		const options = getQueryOptions(activeLens);
		const sortedTail = sortTail(tail, options);

		return (
			<Flex flex={1} flexDirection="column" minWidth="270px">
				<Flex
					flex={1}
					flexDirection="column"
					data-test="inner-flex"
					style={{
						overflowY: 'auto',
					}}
				>
					{!sortedTail && (
						<Box p={3}>
							<Icon spin name="cog" />
						</Box>
					)}
					{Boolean(tail) && tail.length === 0 && (
						<Txt.p data-test="alt-text--no-results" p={3}>
							No results found
						</Txt.p>
					)}
					{Boolean(tail) && Boolean(lens) && (
						<lens.data.renderer
							channel={channel}
							tail={sortedTail}
							setPage={setPage}
							pageOptions={pageOptions}
							page={pageOptions.page}
							totalPages={pageOptions.totalPages}
							tailTypes={tailTypes}
						/>
					)}
				</Flex>
				{tailTypes.length && (
					<ViewFooter types={tailTypes} justifyContent="flex-end" />
				)}
			</Flex>
		);
	}
}
