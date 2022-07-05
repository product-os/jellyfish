import React from 'react';
import { Tab } from 'rendition';
import type {
	Contract,
	TypeContract,
} from '@balena/jellyfish-types/build/core';
import * as helpers from '../../../services/helpers';
import { actionCreators } from '../../../store';
import type { BoundActionCreators, ChannelContract } from '../../../types';
import Segment from '../Segment';

export interface StateProps {
	types: TypeContract[];
}

export interface DispatchProps {
	actions: BoundActionCreators<typeof actionCreators>;
}

export interface OwnProps {
	segment: {
		link: string;
		title: string;
		type: string;
	};
	card: Contract;
	channel: ChannelContract;
}

type Props = StateProps & DispatchProps & OwnProps;

export const CustomQueryTab: React.FunctionComponent<Props> = ({
	segment,
	card,
	channel,
}) => (
	<Tab
		title={segment.title}
		key={segment.title}
		data-test={`card-relationship-tab-${helpers.slugify(segment.title)}`}
	>
		<Segment channel={channel} card={card} segment={segment} />
	</Tab>
);
