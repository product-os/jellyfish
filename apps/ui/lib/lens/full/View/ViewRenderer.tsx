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
	LensRendererProps,
	LensContract,
} from '../../../types';
import LiveCollection from '../../common/LiveCollection';
import Header from './Header';

export type OwnProps = LensRendererProps;

export interface StateProps {
	types: TypeContract[];
	// lenses: LensContract[];
	userActiveLens: string | null;
	userCustomFilters: JsonSchema[];
	channels: ChannelContract[];
}

export interface DispatchProps {
	actions: BoundActionCreators<
		Pick<typeof actionCreators, 'setViewLens' | 'setViewSlice'>
	>;
}

export interface ResponsiveProps {
	isMobile: boolean;
}

type Props = OwnProps &
	ResponsiveProps &
	StateProps &
	DispatchProps & {
		card: ViewContract;
	};

interface State {
	redirectTo: null | string;
	query: JsonSchema | null;
	results: Contract[] | null;
}

export default class ViewRenderer extends React.Component<Props, State> {
	constructor(props: Props) {
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
		const { channel, isMobile, card } = this.props;

		const { redirectTo, results, query } = this.state;

		if (redirectTo) {
			return <Redirect push to={redirectTo} />;
		}

		return (
			<Flex
				className={`column--${
					card ? card.slug || card.type.split('@')[0] : 'unknown'
				}`}
				flexDirection="column"
				style={{
					height: '100%',
					overflowY: 'auto',
					position: 'relative',
				}}
			>
				<Header
					isMobile={isMobile}
					contract={card}
					channel={channel}
					results={results}
				/>

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
