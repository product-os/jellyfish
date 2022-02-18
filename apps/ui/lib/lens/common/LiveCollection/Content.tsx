import React from 'react';
import _ from 'lodash';
import { Box, Flex, Txt } from 'rendition';
import { Icon } from '@balena/jellyfish-ui-components';
import type {
	Contract,
	TypeContract,
} from '@balena/jellyfish-types/build/core';
import { ViewFooter } from '../ViewFooter';
import type { ChannelContract, LensContract } from '../../../types';

const sortTail = (
	tail: Contract[] | null,
	sortBy: string | string[],
	sortDir: 'asc' | 'desc',
) => {
	if (!tail) {
		return null;
	}
	return _.orderBy(tail, sortBy, sortDir);
};

interface ContentProps {
	lens: LensContract | null;
	// TS-TODO: These are always provided by the LiveCollection component, type accordingly
	lenses?: LensContract[];
	results?: null | Contract[];
	channel: ChannelContract;
	tailTypes: TypeContract[];
	pageOptions: {
		page: number;
		totalPages: number;
		limit: number;
		sortBy: string | string[];
		sortDir: 'asc' | 'desc';
	};
	nextPage?: any;
}

export default class Content extends React.Component<ContentProps, any> {
	render() {
		const { lens, lenses, results, channel, tailTypes, pageOptions, nextPage } =
			this.props;

		const activeLens = lens || lenses![0];

		const sortedTail = sortTail(
			results || null,
			pageOptions.sortBy,
			pageOptions.sortDir,
		);

		return (
			<Flex height="100%" minHeight="0">
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
						{results != null && results.length === 0 && (
							<Txt.p data-test="alt-text--no-results" p={3}>
								No results found
							</Txt.p>
						)}
						{Boolean(results) && Boolean(activeLens) && (
							<activeLens.data.renderer
								channel={channel}
								tail={sortedTail}
								nextPage={nextPage}
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
			</Flex>
		);
	}
}
