import { JellyfishStream } from '@resin.io/jellyfish-sdk/dist/stream';
import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import * as React from 'react';
import { Card } from '../../Types';
import { store } from '../core';
import { sdk } from '../core/sdk';
import { actionCreators } from '../core/store';
import { debug } from '../services/helpers';
import { loadSchema } from '../services/sdk-helpers';

interface TailStreamerState {
	tail: null | Card[];
}

/**
 * A generic class for streaming data to a `tail` property on this.state
 */
export class TailStreamer<P, S> extends React.Component<P, TailStreamerState & S> {
	public stream: JellyfishStream;

	public componentWillUnmount(): void {
		if (this.stream) {
			this.stream.destroy();
		}
	}

	public setTail(tail: Card[]): void {
		this.setState({ tail });
	}

	public streamTail(query: string | Card | JSONSchema6): void {
		if (this.stream) {
			this.stream.destroy();
		}

		loadSchema(query)
		.then((schema) => {

			if (!schema) {
				return;
			}

			sdk.query(schema)
				.then((data) => {
					this.setTail(data);
				});

			this.stream = sdk.stream(schema);

			debug('STREAMING TAIL USING QUERY', query);

			this.stream.on('update', (response) => {
				const { after, before } = response.data;
				// If before is non-null then the card has been updated
				if (before) {
					return this.setState((prevState) => {
						if (prevState.tail) {
							const index = _.findIndex(prevState.tail, { id: before.id });
							prevState.tail.splice(index, 1, response.data.after);
						}
						return { tail: prevState.tail };
					});
				}

				const tail = this.state.tail ? this.state.tail.slice() : [];
				tail.push(after);

				this.setTail(tail);
			});

			this.stream.on('streamError', (response) => {
				console.error('Received a stream error', response.data);
				store.dispatch(actionCreators.addNotification('danger', response.data));
			});
		});
	}
}
