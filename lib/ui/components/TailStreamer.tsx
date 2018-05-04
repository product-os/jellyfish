import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import * as React from 'react';
import { JellyfishStream } from '../../sdk/stream';
import { Card } from '../../Types';
import { actionCreators, sdk, store } from '../app';
import { debug } from '../services/helpers';

interface TailStreamerState {
	tail: null | Card[];
}

/**
 * A generic class for streaming data to a `tail` property on this.state
 */
export class TailStreamer<P, S> extends React.Component<P, TailStreamerState & S> {
	public stream: JellyfishStream;

	public componentWillUnmount() {
		if (this.stream) {
			this.stream.destroy();
		}
	}

	public setTail(tail: Card[]) {
		this.setState({ tail });
	}

	public streamTail(query: string | Card | JSONSchema6) {
		if (this.stream) {
			this.stream.destroy();
		}

		this.stream = sdk.stream(query);

		debug('STREAMING TAIL USING QUERY', query);

		this.stream.on('data', (response) => {
			this.setTail(response.data);
		});

		this.stream.on('update', (response) => {
			// If before is non-null then the card has been updated
			if (response.data.before) {
				return this.setState((prevState) => {
					if (prevState.tail) {
						const index = _.findIndex(prevState.tail, { id: response.data.before.id });
						prevState.tail.splice(index, 1, response.data.after);
					}
					return { tail: prevState.tail };
				});
			}

			const tail = this.state.tail === null ? [] : this.state.tail.slice();
			tail.push(response.data.after);

			this.setTail(tail);
		});

		this.stream.on('streamError', (response) => {
			console.error('Received a stream error', response.data);
			store.dispatch(actionCreators.addNotification('danger', response.data));
		});
	}
}
