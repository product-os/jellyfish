import React from 'react';
import _ from 'lodash';
import { Box, Flex, Txt } from 'rendition';
import { Icon } from '@balena/jellyfish-ui-components';
import { core } from '@balena/jellyfish-types';
import { ViewFooter } from '../../common/ViewFooter';
import {
	BoundActionCreators,
	ChannelContract,
	LensContract,
} from '../../../types';

const sortTail = (tail, options) => {
	if (!tail) {
		return null;
	}
	return _.orderBy(tail, options.sortBy, options.sortDir);
};

interface ContentProps {
	lens: LensContract;
	activeLens: string;
	tail: null | core.Contract[];
	channel: ChannelContract;
	getQueryOptions: (
		lensSlug: string,
		keepState?: boolean,
	) => {
		limit: number;
		page: number;
		sortBy: string;
		sortDir: string;
	};
	tailTypes: core.TypeContract[];
	setPage: (page: number) => Promise<void>;
	pageOptions: {
		page: number;
		totalPages: number;
	};
}

export default class Content extends React.Component<ContentProps, any> {
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
					{tail != null && tail.length === 0 && (
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
