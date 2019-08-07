import * as moment from 'moment';
import * as React from 'react';
import { Txt, TxtProps } from 'rendition';

const UPDATE_TIMEOUT = 30000;

export interface TimeSinceProps extends TxtProps {
	date: number;
}

export interface TimeSinceState {
	date: number;
	timeSince: string;
}

export class TimeSince extends React.Component<TimeSinceProps, TimeSinceState> {
	private updateInterval: NodeJS.Timer;

	state = {
		date: 0,
		timeSince: '',
	};

	static getDerivedStateFromProps(
		props: TimeSinceProps,
		state: TimeSinceState,
	) {
		if (props.date !== state.date) {
			return {
				date: props.date,
				timeSince: moment(props.date).fromNow(),
			};
		}

		return null;
	}

	shouldComponentUpdate(_nextProps: TimeSinceProps, nextState: TimeSinceState) {
		return nextState.timeSince !== this.state.timeSince;
	}

	componentDidMount() {
		this.scheduleUpdates();
	}

	componentDidUpdate() {
		this.scheduleUpdates();
	}

	componentWillUnmount() {
		this.cancelUpdates();
	}

	scheduleUpdates() {
		this.cancelUpdates();

		this.updateInterval = setInterval(() => {
			this.setState({
				timeSince: moment(this.state.date).fromNow(),
			});
		}, UPDATE_TIMEOUT);
	}

	cancelUpdates() {
		clearInterval(this.updateInterval);
	}

	render() {
		const { date, ...props } = this.props;
		return <Txt {...props}>{this.state.timeSince}</Txt>;
	}
}
