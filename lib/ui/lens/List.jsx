/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const {
	circularDeepEqual
} = require('fast-equals')
const React = require('react')
const {
	connect
} = require('react-redux')
const reactResizeObserver = require('react-resize-observer')
const reactVirtualized = require('react-virtualized')
const redux = require('redux')
const rendition = require('rendition')
const CardCreator = require('../components/CardCreator')
const store = require('../core/store')
const helpers = require('../services/helpers')
const SingleCard = require('./SingleCard')
const Icon = require('../shame/Icon')
const Column = require('../shame/Column').default

class CardList extends React.Component {
	constructor (props) {
		super(props)
		this.clearCellCache = () => {
			this.cache.clearAll()
		}
		this.showNewCardModal = () => {
			this.setState({
				showNewCardModal: true
			})
		}
		this.hideNewCardModal = () => {
			this.setState({
				showNewCardModal: false
			})
		}
		this.startCreatingCard = () => {
			this.hideNewCardModal()
			this.setState({
				creatingCard: true
			})
		}
		this.doneCreatingCard = (card) => {
			if (card) {
				this.openChannel(card)
			}
			this.setState({
				creatingCard: false
			})
		}
		this.cancelCreatingCard = () => {
			this.hideNewCardModal()
			this.setState({
				creatingCard: false
			})
		}
		this.rowRenderer = (rowProps) => {
			const {
				tail, channel: {
					data: {
						head
					}
				}
			} = this.props
			const card = tail[rowProps.index]

			// Don't show the card if its the head, this can happen on view types
			if (card.id === head.id) {
				return null
			}
			return (
				<reactVirtualized.CellMeasurer
					cache={this.cache}
					columnIndex={0}
					key={card.id}
					overscanRowCount={10}
					parent={rowProps.parent}
					rowIndex={rowProps.index}
				>
					{() => {
						return (
							<rendition.Box px={3} pb={3} style={rowProps.style}>
								<SingleCard.default.data.renderer card={card} level={1}/>
								<rendition.Divider color="#eee" m={0} style={{
									height: 1
								}}/>
							</rendition.Box>
						)
					}}
				</reactVirtualized.CellMeasurer>
			)
		}
		this.state = {
			creatingCard: false,
			showNewCardModal: false
		}
		this.cache = new reactVirtualized.CellMeasurerCache({
			defaultHeight: 300,
			fixedWidth: true
		})
	}
	componentWillUpdate ({
		tail
	}) {
		// If tail data has changed, clear the cell cache
		if (!circularDeepEqual(this.props.tail, tail)) {
			this.clearCellCache()
		}
	}
	openChannel (card) {
		this.props.actions.addChannel(helpers.createChannel({
			target: card.id,
			cardType: card.type,
			head: card,
			parentChannel: this.props.channel.id
		}))
	}
	getSeedData () {
		const {
			head
		} = this.props.channel.data
		if (!head || head.type !== 'view') {
			return {}
		}
		const schema = helpers.getViewSchema(head)
		if (!schema) {
			return {}
		}
		return helpers.getUpdateObjectFromSchema(schema)
	}
	render () {
		const {
			tail
		} = this.props
		return (<Column flex="1" overflowY>
			<rendition.Box flex="1" style={{
				position: 'relative'
			}}>
				<reactResizeObserver.default onResize={this.clearCellCache}/>
				{Boolean(tail) && tail.length > 0 && (
					<reactVirtualized.AutoSizer>
						{({
							width, height
						}) => {
							return (
								<reactVirtualized.List
									width={width}
									height={height}
									deferredMeasurementCache={this.cache}
									rowHeight={this.cache.rowHeight}
									rowRenderer={this.rowRenderer}
									rowCount={tail.length}
									onResize={this.clearCellCache}
									overscanRowCount={3}
								/>
							)
						}}
					</reactVirtualized.AutoSizer>
				)}

				{Boolean(tail) && tail.length === 0 && (
					<rendition.Txt.p p={3}>No results found</rendition.Txt.p>
				)}
			</rendition.Box>

			{Boolean(this.props.type) && (
				<React.Fragment>
					<rendition.Flex
						p={3}
						style={{
							borderTop: '1px solid #eee'
						}}
						justify="flex-end"
					>
						<rendition.Button
							success={true}
							className={`btn--add-${this.props.type.slug}`}
							onClick={this.showNewCardModal}
							disabled={this.state.creatingCard}
						>
							{this.state.creatingCard && <Icon.default name="cog fa-spin"/>}
							{!this.state.creatingCard &&
						<span>Add {this.props.type.name || this.props.type.slug}</span>}
						</rendition.Button>
					</rendition.Flex>

					<CardCreator.CardCreator
						seed={this.getSeedData()}
						show={this.state.showNewCardModal}
						type={this.props.type}
						onCreate={this.startCreatingCard}
						done={this.doneCreatingCard}
						cancel={this.cancelCreatingCard}
					/>
				</React.Fragment>
			)}
		</Column>)
	}
}
const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(store.actionCreators, dispatch)
	}
}
const lens = {
	slug: 'lens-list',
	type: 'lens',
	version: '1.0.0',
	name: 'Default list lens',
	data: {
		renderer: connect(null, mapDispatchToProps)(CardList),
		icon: 'address-card',
		type: '*',
		filter: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					slug: {
						type: 'string'
					}
				}
			}
		}
	}
}
exports.default = lens
