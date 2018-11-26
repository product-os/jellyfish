import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import { Flex, Provider } from 'rendition';
import { AppStatus, Channel } from '../types';
import ChannelRenderer from './components/ChannelRenderer';
import { HomeChannel } from './components/HomeChannel';
import { Login } from './components/Login';
import { Notifications } from './components/Notifications';
import { Splash } from './components/Splash';
import { selectors, StoreState } from './core/store';

import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';

// Register the mermaid and markdown widgets for rendition forms
import 'rendition/dist/extra/Form/markdown';
import 'rendition/dist/extra/Form/mermaid';

interface UIProps {
	channels: Channel[];
	status: AppStatus;
}

const calcFlex = (n: number) => {
	let flex = 1;
	while(n--) {
		flex *= 2;
	}

	return flex;
};

class UI extends React.Component<UIProps, {}> {
	public render(): React.ReactElement<any> {
		if (this.props.status === 'initializing') {
			return <Splash />;
		}

		if (this.props.status === 'unauthorized') {
			return (
				<Provider>
					<Login />
					<Notifications />
				</Provider>
			);
		}

		const [ home, ...rest ] = this.props.channels;

		return (
			<Provider
				style={{
					height: '100%',
					fontSize: 14,
				}}
			>
				<Flex flex="1" style={{ height: '100%'}}>
					<HomeChannel channel={home} />

					{_.map(rest, (channel, index) => {
						return (
							<ChannelRenderer
								key={channel.id}
								channel={channel}
								flex={calcFlex(index)}
							/>
						);
					})}
				</Flex>

				<Notifications />
			</Provider>
		);
	}
}

const mapStateToProps = (state: StoreState) => {
	return {
		channels: selectors.getChannels(state),
		status: selectors.getStatus(state),
	};
};

export const JellyfishUI = DragDropContext(HTML5Backend)(
	connect(mapStateToProps)(UI),
);
