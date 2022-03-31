import { circularDeepEqual } from 'fast-equals';
import _ from 'lodash';
import React from 'react';
import { BoundActionCreators, LensRendererProps } from '../../../types';
import { TypeContract } from '@balena/jellyfish-types/build/core';
import { actionCreators } from '../../../core';
import TabbedContractLayout from '../../../layouts/TabbedContractLayout';

export type OwnProps = LensRendererProps;

export interface StateProps {
	types: TypeContract[];
}

type Props = StateProps & OwnProps;

interface State {
	activeIndex: number;
}

export default class SingleCardFull extends React.Component<Props, State> {
	constructor(props: Props) {
		super(props);

		const tail = _.get(this.props.card.links, ['has attached element'], []);

		const comms = _.filter(tail, (item) => {
			const typeBase = item.type.split('@')[0];
			return typeBase === 'message' || typeBase === 'whisper';
		});

		this.state = {
			activeIndex: comms.length ? 1 : 0,
		};

		this.setActiveIndex = this.setActiveIndex.bind(this);
	}

	shouldComponentUpdate(nextProps, nextState) {
		return (
			!circularDeepEqual(nextState, this.state) ||
			!circularDeepEqual(nextProps, this.props)
		);
	}

	setActiveIndex(activeIndex) {
		this.setState({
			activeIndex,
		});
	}

	render() {
		const { card, channel } = this.props;

		return <TabbedContractLayout card={card} channel={channel} />;
	}
}
