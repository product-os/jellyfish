import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import { Flex, Provider, Terminal } from 'rendition';
import { AppStatus, Channel } from '../Types';
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

class Repl {
	public state: any;
	public replRoot: any;
	public gotLineCallback: any;
	public iframe: any;

	constructor(gotLineCallback: any) {
		this.state = {
			history: [],
			input: '',
		};

		this.replRoot = {};
		this.gotLineCallback = gotLineCallback;

		this.open();
	}

	open(): any {
		this.iframe = document.createElement('iframe')
		this.iframe.style.display = 'none'
		document.body.appendChild(this.iframe)

		this.iframe.contentWindow.sdk = (window as any).sdk;
		this.iframe.contentWindow.enableUI = (window as any).enableUI;

		this.iframe.contentWindow.REPL_LOG_CAPTURE = (...args: any[]) => {
			args.forEach((arg: any) => this.state.history.push(arg));
		}
	}

	process(input: any): any {
		const history = this.state.history;
		history.push(input);
		const command = input.replace('console.log', 'REPL_LOG_CAPTURE', 'g');
		let result;
		const _iframe = this.iframe;
		try {
			result = (function(): any {
				return _iframe.contentWindow.eval(command);
			}.call(this.replRoot));
		} catch (err) {
			result = err;
		}
		history.push(result);
		this.state.history = history;

		if (this.gotLineCallback) {
			this.gotLineCallback(result);
		}
	}

	destroy(): any {
		this.iframe.remove();
	}
}

class InteractiveTerm extends Terminal {
	public input: any;
	constructor(props: any) {
		super(props);

		this.input = '';
	}

	componentDidMount(): any {
		(super.componentDidMount as any)();

		if (!this.props.ttyInstance) {
			(this.tty as any)._repl = new Repl((line: any) => {
				if (this.tty) {
					this.writeln(line);
					(this.tty as any).prompt();
				}
			});

			(this.tty as any).prompt = () => {
				this.tty.write('\u001b[33mC:\\Jellyfish> \u001b[0m');
			};

			this.tty.writeln(
				'\u001b[32mWelcome to jellyfishOS enterprise v19.608.9934.12 (Windows XP home edition)\u001b[0m',
			);
			(this.tty as any).prompt();

			this.tty.on('key', (key, ev: any) => {
				const printable =
					!ev.altKey && !ev.altGraphKey && !ev.ctrlKey && !ev.metaKey;
				// Ignore arrow keys
				if (
					ev.code === 'ArrowUp' ||
					ev.code === 'ArrowDown' ||
					ev.code === 'ArrowLeft' ||
					ev.code === 'ArrowRight'
				) {
					return;
				}

				if (ev.keyCode === 13) {
					this.write('\r\n');
					(this.tty as any)._repl.process(this.input);
					this.input = '';
				} else if (ev.keyCode === 8) {
					if ((this.tty as any).buffer.x > 2) {
						this.tty.write('\b \b');
						this.input = this.input.slice(0, -1);
					}
				} else if (printable) {
					this.input += key;
					this.tty.write(key as any);
				}
			});
		}
	}

	componentWillUnmount(): any {
		if (!this.props.persistent) {
			(this.tty as any)._repl.destroy();
		}

		(super.componentWillUnmount as any)();
	}
}

const calcFlex = (n: number) => {
	let flex = 1;
	while(n--) {
		flex *= 2;
	}

	return flex;
};

class UI extends React.Component<UIProps, { on: boolean }> {
	constructor(props: UIProps) {
		super(props);

		(window as any).enableUI = () => {
			localStorage.setItem('on', '1');
			this.setState({ on: true });
		};

		(window as any).disableUI = () => {
			localStorage.setItem('on', '0');
			this.setState({ on: false });
		};

		this.state = {
			on: localStorage.getItem('on') === '1',
		};
	}

	public render(): React.ReactElement<any> {
		if (this.props.status === 'initializing') {
			return <Splash />;
		}

		if (!this.state.on) {
			return <InteractiveTerm />
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
