import { JSONSchema6 } from 'json-schema';
import * as _ from 'lodash';
import * as React from 'react';
import { JellyfishStream } from '../../sdk';
import { store } from '../core';
import { sdk } from '../core/sdk';
import { actionCreators } from '../core/store';
import { debug } from '../services/helpers';
import { loadSchema } from '../services/sdk-helpers';
import { Card } from '../types';

interface TailStreamerState {
	tail: null | Card[];
}

/**
 * A generic class for streaming data to a `tail` property on this.state
 */
export class TailStreamer<P, S extends TailStreamerState> extends React.Component<P, S> {
	public stream: JellyfishStream;

	public componentWillUnmount(): void {
		if (this.stream) {
			this.stream.destroy();
		}
	}

	public setTail(tail: Card[]): void {
		this.setState({ tail });
	}

	public async streamTail(query: string | Card | JSONSchema6): Promise<void> {
		if (this.stream) {
			this.stream.destroy();
			this.setState({ tail: null });
		}

		const schema = await loadSchema(query);

		if (!schema) {
			return;
		}

		this.stream = await sdk.stream(schema);

		// Set the initial tail once a stream is ready, to minimize risk of missing
		// timeline data
		sdk.query(schema)
			.then((data) => {
				this.setTail(_.uniqBy<any>(data.concat(this.state.tail as any || []), 'id'));
			});

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
	}
}
