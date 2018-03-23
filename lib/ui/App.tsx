import * as React from 'react';
import { Box, Link, Provider} from 'rendition';
import * as sdk from './services/sdk';

(window as any).sdk = sdk;

interface AppState {
	views: any[];
}

export default class App extends React.Component<{}, AppState> {
	constructor() {
		super({});

		this.state = {
			views: [],
		};

		sdk.get({
			type: 'object',
			properties: {
				type: {
					type: 'string',
					const: 'view',
				},
			},
			required: ['type'],
			additionalProperties: true,
		})
		.then((response: any) => {
			this.setState({ views: response.data });
			console.log('GOT VIEWS', response);
		});
	}

	public render() {
		return (
			<Provider>
				{this.state.views.map(view =>
					<Box px={3} py={2} key={view.id}>
						<Link>{view.name}</Link>
					</Box>,
				)}
			</Provider>
		);
	}
}
