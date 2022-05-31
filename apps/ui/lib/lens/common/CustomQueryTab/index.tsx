import React from 'react';
import _ from 'lodash';
import memoize from 'memoize-one';
import { connect } from 'react-redux';
import { Contract, TypeContract } from '@balena/jellyfish-types/build/core';
import { selectors, actionCreators } from '../../../store';
import { bindActionCreators } from '../../../bindactioncreators';
import { ChannelContract } from '../../../types';
import {
	CustomQueryTab as InnerCustomQueryTab,
	OwnProps,
	StateProps,
	DispatchProps,
} from './CustomQueryTab';

const mapStateToProps = (state, props): StateProps => {
	return {
		types: selectors.getTypes()(state),
	};
};

const mapDispatchToProps = (dispatch): DispatchProps => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, ['getLinks', 'queryAPI', 'addChannel']),
			dispatch,
		),
	};
};

export const CustomQueryTab = connect<StateProps, DispatchProps, OwnProps>(
	mapStateToProps,
	mapDispatchToProps,
)(InnerCustomQueryTab);

const getCustomQueries = memoize((typeCard) => {
	// TODO: Don't hardcode these queries for loop contracts
	if (typeCard.slug === 'support-thread') {
		return [
			{
				title: 'Patterns',
				type: 'pattern',
				link: 'has attached',
			},
		];
	}
	if (typeCard.slug === 'pattern') {
		return [
			{
				title: 'Improvements',
				type: 'improvement',
				link: 'has attached',
			},
		];
	}
	if (typeCard.slug === 'improvement') {
		return [
			{
				title: 'Milestones',
				type: 'milestone',
				link: 'has attached',
			},
		];
	}
	if (typeCard.slug === 'milestone') {
		return [
			{
				title: 'Issues',
				type: 'issue',
				link: 'is attached to',
			},
		];
	}
	return null;
});

export const customQueryTabs = (
	card: Contract,
	typeCard: TypeContract,
	channel: ChannelContract,
) => {
	const customQueries = getCustomQueries(typeCard);
	if (customQueries) {
		return customQueries.map((segment) => (
			<CustomQueryTab
				channel={channel}
				key={segment.title}
				card={card}
				segment={segment}
			/>
		));
	}
	return null;
};
