import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import * as React from 'react';
import { Card } from '../../Types';
import { debug } from '../services/helpers';
import * as sdk from '../services/sdk';
import store, { actionCreators } from '../services/store';

interface TailStreamerState {
	tail: null | Card[];
}

/**
 * A generic class for streaming data to a `tail` property on this.state
 */
export default class TailStreamer<P, S> extends React.Component<P, TailStreamerState & S> {
	private stream: sdk.db.JellyfishStream;

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

		this.stream = sdk.db.stream(query);

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
			store.dispatch(actionCreators.addNotification('danger', response.data));
		});
	}
}
