/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import clone from 'deep-copy'
import * as React from 'react'
import FaPieChart from 'react-icons/lib/fa/pie-chart'
import styled from 'styled-components'
import {
	Box,
	DropDownButton
} from 'rendition'

const Wrapper = styled.div ``

const PlainPanel = styled.div `
	border-radius: 2px;
	background-color: #ffffff;
	box-shadow: 0 0 6px 0 rgba(0, 0, 0, 0.1);
	border: solid 1px #9b9b9b;
`

const Preview = styled(PlainPanel) `
	display: none;
	position: absolute;
	right: 230px;
	width: 300px;
	right: 100%;
	margin-right: 3px;
	top: 2px;
	padding: 15px 15px 5px;
`

export const ViewListItem = styled.li `
	position: relative;
	padding: 7px 40px 7px 20px;
	&:hover {
		background-color: #f3f3f3;
	}
	& > p {
		padding-right: 20px;
	}
	& > button {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		right: 2px;
		padding: 8px;
		background: none;
		border: none;
		display: none;
		cursor: pointer;
	}
	&:hover > button {
		display: block;
		opacity: 0.7;
	}
	> button:hover {
		opacity: 1;
	}
	&:hover ${Preview} {
		display: block;
	}
`

class ViewsMenu extends React.Component {
	constructor (props) {
		super(props)

		this.state = {
			showViewsMenu: false
		}
	}

	loadView (view) {
		const filters = clone(view.filters)
		this.props.setFilters(filters)
		this.setState({
			showViewsMenu: false
		})
	}

	render () {
		const {
			views, renderMode
		} = this.props
		const hasViews = views.length > 0

		let soloRender = false
		if (renderMode) {
			const mode = Array.isArray(renderMode) ? renderMode : [ renderMode ]
			soloRender = mode.length === 1 && mode[0] === 'views'
		}

		return (
			<Wrapper>
				<DropDownButton
					ml={soloRender ? 0 : 30}
					disabled={this.props.disabled}
					primary
					outline
					joined
					alignRight={!soloRender}
					noListFormat
					label={
						<span>
							<FaPieChart style={{
								marginRight: 10
							}} />
							Views
						</span>
					}
					{...this.props.buttonProps}
				>
					<Box py={1}>
						{!hasViews && (
							<Box py={2} px={3}>
								{'You haven\'t created any views yet'}
							</Box>
						)}
					</Box>
				</DropDownButton>
			</Wrapper>
		)
	}
}

export default ViewsMenu
