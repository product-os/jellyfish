import * as Sentry from '@sentry/browser';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { Theme } from 'rendition';
import { injectGlobal } from 'styled-components';
import { store } from './core';
import { JellyfishUI } from './JellyfishUI';

// tslint:disable-next-line
injectGlobal`
  * {
    box-sizing: border-box;
  }

  body {
    line-height: 1.5;
    margin: 0;
    font-family: ${Theme.font};
  }

	html,
	body,
	#app {
		height: 100%;
	}
`;


const SENTRY_DSN = process.env.SENTRY_DSN_UI;

if (process.env.NODE_ENV === 'production' && SENTRY_DSN) {
	Sentry.init({
		dsn: SENTRY_DSN,
		release: process.env.VERSION,
		environment: 'ui',
	});
}

ReactDOM.render(
	<Provider store={store}>
		<JellyfishUI />
	</Provider>,
	document.getElementById('app'),
);
