import React from 'react';
import _ from 'lodash';
import { Box, Flex, Txt } from 'rendition';
import { Icon } from '../../../components';
import type { Contract, TypeContract, UserContract } from 'autumndb';
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
	lenses: LensContract[];
	results: null | Contract[];
	channel: ChannelContract;
	tailTypes: TypeContract[];
	pageOptions: {
		page: number;
		totalPages: number;
		limit: number;
		sortBy: string | string[];
		sortDir: 'asc' | 'desc';
	};
	nextPage: () => Promise<any>;
	hasNextPage: boolean;
	hideFooter: boolean;
	user: UserContract;
	card: Contract;
}

export default class Content extends React.Component<ContentProps, any> {
	render() {
		const {
			lens,
			lenses,
			results,
			channel,
			tailTypes,
			pageOptions,
			nextPage,
			hasNextPage,
			hideFooter,
			user,
			card,
		} = this.props;

		const activeLens =
			(lens && _.find(lenses, { slug: lens.slug })) || lenses[0];

		const sortedTail = sortTail(
			results,
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
							<>
								Below Header
								<activeLens.data.renderer
									user={user}
									card={card}
									channel={channel}
									tail={sortedTail}
									nextPage={nextPage}
									pageOptions={pageOptions}
									page={pageOptions.page}
									totalPages={pageOptions.totalPages}
									tailTypes={tailTypes}
									hasNextPage={!!hasNextPage}
								/>
							</>
						)}
					</Flex>
					{!hideFooter && tailTypes.length && <ViewFooter types={tailTypes} />}
				</Flex>
			</Flex>
		);
	}
}
