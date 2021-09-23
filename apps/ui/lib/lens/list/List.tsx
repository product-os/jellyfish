/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { circularDeepEqual } from 'fast-equals';
import * as _ from 'lodash';
import React from 'react';
import { connect } from 'react-redux';
import ReactResizeObserver from 'react-resize-observer';
import {
	AutoSizer,
	List,
	CellMeasurer,
	CellMeasurerCache,
	InfiniteLoader,
} from 'react-virtualized';
import { bindActionCreators } from 'redux';
import { Box, Divider } from 'rendition';
import { Column } from '@balena/jellyfish-ui-components';
import { actionCreators, selectors } from '../../core';
import { getLens } from '../';

export class CardList extends React.Component<any, any> {
	clearCellCache;
	loadMore;
	isRowLoaded;
	rowRenderer;
	cache;

	constructor(props) {
		super(props);

		this.state = {
			// eslint-disable-next-line no-undefined
			scrollToIndex: undefined,
		};

		this.clearCellCache = () => {
			this.cache.clearAll();
		};

		this.loadMore = async () => {
			await this.props.setPage(this.props.page + 1);
		};

		this.isRowLoaded = ({ index }) => {
			return Boolean(this.props.tail[index]);
		};

		this.rowRenderer = (rowProps) => {
			const { user, tail, channel } = this.props;
			const card = tail[rowProps.index];

			// Don't continue if the card doesn't exist
			if (!card) {
				return null;
			}

			const lens = getLens('snippet', card, user);

			// Don't show the card if its the head, this can happen on view types
			if (card.id === _.get(channel, ['data', 'head', 'id'])) {
				return null;
			}

			return (
				<CellMeasurer
					key={rowProps.key}
					cache={this.cache}
					parent={rowProps.parent}
					columnIndex={0}
					rowIndex={rowProps.index}
				>
					<Box style={rowProps.style}>
						<lens.data.renderer card={card} />
						<Divider
							color="#eee"
							m={0}
							style={{
								height: 1,
							}}
						/>
					</Box>
				</CellMeasurer>
			);
		};

		this.cache = new CellMeasurerCache({
			defaultHeight: 300,
			fixedWidth: true,
		});

		this.openCreateChannel = this.openCreateChannel.bind(this);
	}

	openCreateChannel() {
		const {
			type,
			actions,
			channel: {
				data: { head },
			},
		} = this.props;
		actions.openCreateChannel(head, type);
	}

	getSnapshotBeforeUpdate({ tail: prevTail }) {
		const nextTail = this.props.tail;

		// Only clear CellCache if already rendered tail data has changed
		const previousTailDataChanged = !circularDeepEqual(
			prevTail,
			nextTail.slice(0, prevTail.length),
		);
		if (previousTailDataChanged) {
			this.clearCellCache();
		}
		return previousTailDataChanged;
	}

	componentDidUpdate(
		{
			tail: prevTail,
			pageOptions: { sortBy: previousSortBy, sortDir: previousSortDir },
		},
		prevState,
		previousTailDataChanged,
	) {
		const currentSortBy = this.props.pageOptions.sortBy;
		const currentSortDir = this.props.pageOptions.sortDir;

		// If sort-by value changes (such that the tail order also changes),
		// scroll to the top row and then immediately reset to undefined.
		// This is so we can scroll up again when/if the sort-by changes again
		if (
			(previousSortBy !== currentSortBy ||
				previousSortDir !== currentSortDir) &&
			previousTailDataChanged
		) {
			this.setState(
				{
					scrollToIndex: 0,
				},
				() => {
					this.setState({
						// eslint-disable-next-line no-undefined
						scrollToIndex: undefined,
					});
				},
			);
		}
	}

	render() {
		const { tail, pageOptions, totalPages } = this.props;

		// TODO: remove this logic when totalPage returns a usefull number
		// We can't get the totalPage of a schema.
		// Until then we should assume we want atleast 1 page more than our current page.
		const rowCount =
			totalPages === Infinity ? tail.length + pageOptions.limit : totalPages;

		// Passing sortBy to the list ensures that it re-renders on sort, since
		// by default all react-virtualized components use shallowCompare (https://github.com/bvaughn/react-virtualized/blob/master/README.md#pass-thru-props)
		const sortBy = _.last(pageOptions.sortBy);

		return (
			<Column flex="1" overflowY>
				<Box
					flex="1"
					style={{
						position: 'relative',
						minHeight: 80,
						overflow: 'hidden',
					}}
				>
					<ReactResizeObserver onResize={this.clearCellCache} />
					{Boolean(tail) && tail.length > 0 && (
						<InfiniteLoader
							loadMoreRows={this.loadMore}
							rowCount={rowCount}
							isRowLoaded={this.isRowLoaded}
						>
							{({ onRowsRendered, registerChild }) => (
								<AutoSizer>
									{({ width, height }) => {
										return (
											<List
												width={width}
												height={height}
												onRowsRendered={onRowsRendered}
												ref={registerChild}
												rowCount={tail.length}
												deferredMeasurementCache={this.cache}
												overscanRowCount={3}
												rowHeight={this.cache.rowHeight}
												rowRenderer={this.rowRenderer}
												sortBy={sortBy}
												scrollToIndex={this.state.scrollToIndex}
												tail={tail}
											/>
										);
									}}
								</AutoSizer>
							)}
						</InfiniteLoader>
					)}
				</Box>
			</Column>
		);
	}
}

const mapStateToProps = (state) => {
	return {
		user: selectors.getCurrentUser(state),
	};
};

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, ['addChannel', 'openCreateChannel']),
			dispatch,
		),
	};
};

const listLens = {
	slug: 'lens-list',
	type: 'lens',
	version: '1.0.0',
	name: 'Default list lens',
	data: {
		label: 'List',
		format: 'list',
		renderer: connect(mapStateToProps, mapDispatchToProps)(CardList),
		icon: 'address-card',
		type: '*',
		filter: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					id: {
						type: 'string',
					},
					slug: {
						type: 'string',
					},
				},
			},
		},
	},
};

export default listLens;
