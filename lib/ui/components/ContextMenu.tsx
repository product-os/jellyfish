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
	margin-top: -18px;
	margin-left: -4px

	&:before {
		position: absolute;
    left: -5px;
		top: 10px;
    content: '';
    display: block;
    width: 0;
    height: 0;
    border-top: 6px solid transparent;
    border-bottom: 6px solid transparent;
    border-right: 5px solid #fff;
	}
`;

interface ContextMenuProps {
	onClose: () => void;
	children: string | string[] | JSX.Element | JSX.Element[];
}

interface ContextMenuState {
	offsetLeft?: number;
	offsetTop?: number;
}

export class ContextMenu extends React.Component<ContextMenuProps, ContextMenuState> {
	constructor(props: ContextMenuProps) {
		super(props);

		this.state = {};
	}

	componentDidMount() {
		const node = ReactDOM.findDOMNode(this);
		if (!node) {
			return;
		}
		const parent = node.parentNode;

		if (!parent) {
			return;
		}

		const bounds = (parent as HTMLElement).getBoundingClientRect();

		this.setState({
			offsetLeft: bounds.left + bounds.width,
			offsetTop: bounds.top + (bounds.height / 2),
		});
	}

	public render() {
		const { onClose, children } = this.props;
		const { offsetLeft, offsetTop } = this.state;

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
					style={{
						top: offsetTop,
						left: offsetLeft,
						display,
					}}
				>
					{children}
				</Menu>
			</Fixed>
		);
	}
}
