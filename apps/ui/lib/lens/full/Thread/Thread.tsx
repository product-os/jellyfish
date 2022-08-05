import _ from 'lodash';
import React from 'react';
import type { LensRendererProps } from '../../../types';
import type { TypeContract } from 'autumndb';
import TabbedContractLayout from '../../../layouts/TabbedContractLayout';

export type OwnProps = LensRendererProps;

export interface StateProps {
	types: TypeContract[];
}

type Props = StateProps & OwnProps;

const ThreadLens = (props: Props) => {
	const { card, channel } = props;

	return <TabbedContractLayout card={card} channel={channel} />;
};

export default ThreadLens;
