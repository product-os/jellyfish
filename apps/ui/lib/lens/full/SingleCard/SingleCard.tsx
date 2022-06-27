import { circularDeepEqual } from 'fast-equals';
import _ from 'lodash';
import React from 'react';
import type { LensRendererProps } from '../../../types';
import type { TypeContract } from '@balena/jellyfish-types/build/core';
import TabbedContractLayout from '../../../layouts/TabbedContractLayout';

export type OwnProps = LensRendererProps;

export interface StateProps {
	types: TypeContract[];
}

type Props = StateProps & OwnProps;

export default class SingleCardFull extends React.Component<Props> {
	shouldComponentUpdate(nextProps, nextState) {
		return (
			!circularDeepEqual(nextState, this.state) ||
			!circularDeepEqual(nextProps, this.props)
		);
	}

	render() {
		const { card, channel } = this.props;

		return <TabbedContractLayout card={card} channel={channel} />;
	}
}
