import React from 'react'
import copy from 'copy-to-clipboard'
import {
	Button
} from 'rendition'
import {
	ActionLink
} from '../shame/ActionLink'
import Icon from '../shame/Icon'
import ContextMenu from '../ContextMenu'

const Menu = ({
	isMessage, menuOptions, toggleMenu
}) => {
	const copyJSON = (event) => {
		event.preventDefault()
		event.stopPropagation()
		copy(JSON.stringify(this.props.card, null, 2))
	}
	const copyRawMessage = (event) => {
		event.preventDefault()
		event.stopPropagation()
		copy(this.props.card.data.payload.message)
	}
	return (
		<ContextMenu position="bottom" onClose={toggleMenu}>
			<ActionLink
				onClick={copyJSON}
				tooltip={{
					text: 'JSON copied!',
					trigger: 'click'
				}}
			>
				Copy as JSON
			</ActionLink>

			{isMessage && (
				<ActionLink
					onClick={copyRawMessage}
					tooltip={{
						text: 'Message copied!',
						trigger: 'click'
					}}
				>
					Copy raw message
				</ActionLink>
			)}
			{menuOptions}
		</ContextMenu>
	)
}

export default class MenuWrapper extends React.Component {
	constructor (props) {
		super(props)

		this.state = {
			showMenu: false
		}

		this.toggleMenu = () => {
			this.setState({
				showMenu: !this.state.showMenu
			})
		}
	}
	render () {
		return (
			<span>
				<Button
					className="event-card--actions"
					px={2}
					plain
					onClick={this.toggleMenu}
					icon={<Icon name="ellipsis-v" />}
				/>

				{this.state.showMenu && (
					<Menu {...this.props} toggleMenu={this.toggleMenu} />
				)}
			</span>
		)
	}
}
