import React from 'react';
import ReactDOM from 'react-dom';
import { Box, BoxProps, Fixed } from 'rendition';
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
	position: absolute;
	text-align: left;
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

interface ContextMenuProps extends BoxProps {
	position?: 'top' | 'right' | 'bottom' | 'left';
	onClose: React.MouseEventHandler<HTMLElement>;
}

interface ContextMenuState {
	offsetLeft?: string | number;
	offsetTop?: number;
	offsetRight?: string | number;
}

export default class ContextMenu extends React.Component<
	ContextMenuProps,
	ContextMenuState
> {
	constructor(props: ContextMenuProps) {
		super(props);
		this.state = {};
	}

	componentDidMount() {
		// eslint-disable-next-line react/no-find-dom-node
		const node = ReactDOM.findDOMNode(this);
		if (!node) {
			return;
		}
		const parent = node.parentNode as HTMLElement;
		if (!parent) {
			return;
		}
		const bounds = parent.getBoundingClientRect();
		if (this.props.position === 'bottom') {
			this.setState({
				offsetLeft: 'auto',
				offsetTop: bounds.top + bounds.height,
				offsetRight:
					window.innerWidth -
					(bounds.left +
						bounds.width / 2 +
						ARROW_WIDTH / 2 +
						ARROW_RIGHT_OFFSET +
						4),
			});
		} else {
			this.setState({
				offsetLeft: bounds.left + bounds.width,
				offsetTop: bounds.top + bounds.height / 2,
				offsetRight: 'auto',
			});
		}
	}

	render() {
		const { children, onClose, position, ...rest } = this.props;
		const { offsetLeft, offsetRight, offsetTop } = this.state;
		const display = offsetLeft && offsetTop ? 'block' : 'none';
		return (
			<Fixed top right bottom left z={999} onClick={onClose}>
				<Menu
					width="220px"
					px={0}
					py={2}
					{...rest}
					className={`context-menu context-menu--${position || 'left'}`}
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
