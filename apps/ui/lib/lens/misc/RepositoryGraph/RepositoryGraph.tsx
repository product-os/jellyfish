import * as React from 'react';
import * as _ from 'lodash';
import type { LensRendererProps } from '../../../types';
import DraggableContractGraph from '../../common/DraggableContractGraph';
import type { TypeContract } from 'autumndb';

export type OwnProps = LensRendererProps;
export interface StateProps {
	types: TypeContract[];
}

type Props = StateProps & OwnProps;

export default (props: Props) => {
	const { card, channel, tail, types } = props;

	return (
		<DraggableContractGraph
			card={card}
			types={types}
			tail={tail}
			channel={channel}
			linkVerbs={['is used by']}
		/>
	);
};
