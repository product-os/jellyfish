import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {
	Box,
	Fixed
} from 'rendition';
import styled from 'styled-components';

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
			border-top: 7px solid transparent;
			border-bottom: 7px solid transparent;
			border-right: 6px solid #ccc;
		}

		&:after {
			left: -5px;
			top: 10px;
			border-top: 6px solid transparent;
			border-bottom: 6px solid transparent;
			border-right: 5px solid #fff;
		}
	}

	&.context-menu--bottom {
		&:before {
			right: 11px;
			top: -6px;
			border-right: 7px solid transparent;
			border-left: 7px solid transparent;
			border-bottom: 6px solid #ccc;
		}

		&:after {
			right: 12px;
			top: -5px;
			border-right: 6px solid transparent;
			border-left: 6px solid transparent;
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
				offsetRight: window.innerWidth - (bounds.left + bounds.width),
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
