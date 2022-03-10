import React from 'react';
import { withRouter } from 'react-router-dom';
import styled from 'styled-components';
import { pathWithoutChannel } from '../services/helpers';
import { PlainButton } from './PlainButton';
import Icon from './Icon';

const CloseRenditionButton = styled(PlainButton)`
	i {
		line-height: 1.5;
	}
`;

class CloseButtonBase extends React.Component<any> {
	constructor(props: any) {
		super(props);

		this.navigate = this.navigate.bind(this);
	}

	navigate(event: any) {
		event.preventDefault();
		const { history, channel } = this.props;

		history.push(pathWithoutChannel(channel));

		if (this.props.onClick) {
			this.props.onClick();
		}
	}

	render() {
		return (
			<CloseRenditionButton
				{...this.props}
				icon={<Icon name="times" />}
				onClick={this.navigate}
			/>
		);
	}
}

export const CloseButton = withRouter(CloseButtonBase);
