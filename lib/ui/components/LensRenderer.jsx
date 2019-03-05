/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const React = require('react')
const lens = require('../lens')
class LensRenderer extends React.Component {
	constructor (props) {
		super(props)
		this.state = {
			lens: lens.default.getLens(props.card)
		}
	}
	componentWillReceiveProps (nextProps) {
		this.setState({
			lens: lens.default.getLens(nextProps.card)
		})
	}
	render () {
		const ActiveLens = this.state.lens.data.renderer
		const {
			card, level
		} = this.props
		return (<ActiveLens card={card} level={level}/>)
	}
}
exports.LensRenderer = LensRenderer
