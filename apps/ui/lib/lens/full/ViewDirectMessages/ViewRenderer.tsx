import _ from 'lodash';
import React from 'react';
import { Redirect } from 'react-router-dom';
import { Flex } from 'rendition';
import type {
	Contract,
	JsonSchema,
	TypeContract,
	ViewContract,
} from 'autumndb';
import { actionCreators } from '../../../store';
import type {
	BoundActionCreators,
	ChannelContract,
	LensRendererProps,
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
	queryWithFilters: JsonSchema | null;
}

const ViewRenderer = (props: Props) => {
	const { card, channel, isMobile } = props;
	const [state, setState] = React.useState<State>({
		redirectTo: null,
		query: {
			allOf: _.map(card.data.allOf, 'schema'),
		},
		queryWithFilters: null,
		results: null,
	});

	const handleResultsChange = React.useCallback(
		(results: Contract[] | null) => {
			setState((prevState) => ({ ...prevState, results }));
		},
		[],
	);

	const handleQueryUpdate = React.useCallback(
		(queryWithFilters: JsonSchema) => {
			setState((prevState) => ({ ...prevState, queryWithFilters }));
		},
		[],
	);

	const { redirectTo } = state;

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
				results={state.results}
				query={state.queryWithFilters || state.query}
			/>

			<LiveCollection
				channel={channel}
				card={card}
				query={state.query}
				seed={channel.data.seed}
				onResultsChange={handleResultsChange}
				onQueryUpdate={handleQueryUpdate}
				useSlices
			/>
		</Flex>
	);
};

export default ViewRenderer;
