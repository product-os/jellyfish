import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { store } from './app';
import { JellyfishUI } from './JellyfishUI';

ReactDOM.render(
	<Provider store={store}>
		<JellyfishUI />
	</Provider>,
	document.getElementById('app'),
);
