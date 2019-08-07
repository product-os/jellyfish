import * as React from 'react';

export interface IKeyPressListenerProps {
	onKeyPress: (e: KeyboardEvent) => void;
}

export class KeyPressListener extends React.Component<IKeyPressListenerProps> {
	handleKeyPress = (e: KeyboardEvent) => {
		this.props.onKeyPress(e);
	};

	componentDidMount() {
		document.addEventListener('keypress', this.handleKeyPress);
	}

	componentWillUnmount() {
		document.removeEventListener('keypress', this.handleKeyPress);
	}

	render() {
		return this.props.children || null;
	}
}
