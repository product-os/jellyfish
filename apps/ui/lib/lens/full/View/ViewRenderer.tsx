import _ from 'lodash';
import React from 'react';
import { Redirect } from 'react-router-dom';
import { Flex, FlexProps } from 'rendition';
import type { JsonSchema } from '@balena/jellyfish-types';
import type {
	Contract,
	TypeContract,
	ViewContract,
	UserContract,
} from '@balena/jellyfish-types/build/core';
import { actionCreators } from '../../../core';
import type {
	BoundActionCreators,
	ChannelContract,
	LensContract,
} from '../../../types';
import LiveCollection from '../../common/LiveCollection';
import Header from './Header';

interface ViewRendererProps {
	types: TypeContract[];
	lenses: LensContract[];
	channel: ChannelContract;
	card: ViewContract;
	user: UserContract;
	userActiveLens: string | null;
	userActiveSlice: string | null;
	isMobile: boolean;
	flex: FlexProps['flex'];
	actions: BoundActionCreators<
		Pick<typeof actionCreators, 'setViewLens' | 'setViewSlice'>
	>;
}

interface State {
	redirectTo: null | string;
	query: JsonSchema | null;
	results: Contract[] | null;
}

export default class ViewRenderer extends React.Component<
	ViewRendererProps,
	State
> {
	constructor(props: ViewRendererProps) {
		super(props);

		const { card } = props;

		const query = {
			allOf: _.map(card.data.allOf, 'schema'),
		};

		this.state = {
			redirectTo: null,
			query,
			results: null,
		};
	}

	handleResultsChange = (results: Contract[] | null) => {
		this.setState({ results });
	};

	render() {
		const { channel, isMobile } = this.props;

		const { head } = channel.data;

		const { redirectTo, results, query } = this.state;

		if (redirectTo) {
			return <Redirect push to={redirectTo} />;
		}

		return (
			<Flex
				flex={this.props.flex}
				className={`column--${
					head ? head.slug || head.type.split('@')[0] : 'unknown'
				}`}
				flexDirection="column"
				style={{
					height: '100%',
					overflowY: 'auto',
					position: 'relative',
				}}
			>
				<Header isMobile={isMobile} channel={channel} results={results} />

				<LiveCollection
					channel={channel}
					card={this.props.card}
					query={query}
					seed={channel.data.seed}
					onResultsChange={this.handleResultsChange}
				/>
			</Flex>
		);
	}
}
