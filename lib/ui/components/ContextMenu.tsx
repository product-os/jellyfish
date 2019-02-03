/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {
	Box,
	Fixed
} from 'rendition';
import styled from 'styled-components';

const ARROW_WIDTH = 7;
const ARROW_RIGHT_OFFSET = 11;

const Menu = styled(Box)`
	background-clip: padding-box;
	background-color: #fff;
	border-radius: 3px;
	border: 1px solid rgba(0,0,0,.15);
	box-shadow: 0 6px 12px rgba(0,0,0,.175);
	color: #575757;
	list-style: none;
	margin: 2px 0 0;
	min-width: 160px;
	padding: 8px;
	position: absolute;
	text-align: left;
	width: 220px;
	z-index: 1000;
	&:before {
		position: absolute;
		content: '';
		display: block;
		width: 0;
		height: 0;
	}

	&:after {
		position: absolute;
		content: '';
		display: block;
		width: 0;
		height: 0;
	}

	&.context-menu--left {
		margin-top: -18px;
		margin-left: -4px

		&:before {
			left: -6px;
			top: 9px;
			border-top: ${ARROW_WIDTH}px solid transparent;
			border-bottom: ${ARROW_WIDTH}px solid transparent;
			border-right: ${ARROW_WIDTH - 1}px solid #ccc;
		}

		&:after {
			left: -5px;
			top: 10px;
			border-top: ${ARROW_WIDTH - 1}px solid transparent;
			border-bottom: ${ARROW_WIDTH - 1}px solid transparent;
			border-right: ${ARROW_WIDTH - 2}px solid #fff;
		}
	}

	&.context-menu--bottom {
		&:before {
			right: ${ARROW_RIGHT_OFFSET}px;
			top: -6px;
			border-right: ${ARROW_WIDTH}px solid transparent;
			border-left: ${ARROW_WIDTH}px solid transparent;
			border-bottom: ${ARROW_WIDTH - 1}px solid #ccc;
		}

		&:after {
			right: ${ARROW_RIGHT_OFFSET + 1}px;
			top: -5px;
			border-right: ${ARROW_WIDTH - 1}px solid transparent;
			border-left: ${ARROW_WIDTH - 1}px solid transparent;
			border-bottom: 5px solid #fff;
		}
	}
`;

interface ContextMenuProps {
	onClose: () => void;
	children: string | string[] | JSX.Element | JSX.Element[];
	position?: 'bottom' | 'left';
}

interface ContextMenuState {
	offsetLeft?: number | 'auto';
	offsetTop?: number | 'auto';
	offsetRight?: number | 'auto';
}

export class ContextMenu extends React.Component<ContextMenuProps, ContextMenuState> {
	constructor(props: ContextMenuProps) {
		super(props);

		this.state = {};
	}

	componentDidMount(): void {
		const node = ReactDOM.findDOMNode(this);
		if (!node) {
			return;
		}
		const parent = node.parentNode;

		if (!parent) {
			return;
		}

		const bounds = (parent as HTMLElement).getBoundingClientRect();

		if (this.props.position === 'bottom') {
			this.setState({
				offsetLeft: 'auto',
				offsetTop: bounds.top + bounds.height,
				offsetRight: window.innerWidth - (bounds.left + bounds.width / 2 + ARROW_WIDTH / 2 + ARROW_RIGHT_OFFSET + 4),
			});
		} else {
			this.setState({
				offsetLeft: bounds.left + bounds.width,
				offsetTop: bounds.top + (bounds.height / 2),
				offsetRight: 'auto',
			});
		}
	}

	public render(): React.ReactNode {
		const { onClose, children } = this.props;
		const { offsetLeft, offsetTop, offsetRight } = this.state;

		const display = offsetLeft && offsetTop ? 'block' : 'none';

		return (
			<Fixed
				top
				right
				bottom
				left
				z={999}
				onClick={onClose}
			>
				<Menu
					className={`context-menu--${this.props.position || 'left'}`}
					style={{
						top: offsetTop,
						left: offsetLeft,
						right: offsetRight,
						display,
					}}
				>
					{children}
				</Menu>
			</Fixed>
		);
	}
}
