import _ from 'lodash';
import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
	createClient,
	createNoopClient,
	createWebTracker,
} from 'analytics-client';
import { saveAs } from 'file-saver';
import Splash from './components/Splash';
import { actionCreators, selectors } from './core';
import { useLocation, useHistory, Redirect, matchPath } from 'react-router-dom';
import { isProduction } from './environment';
import { createLazyComponent } from './components/SafeLazy';
import { LOGIN_AS_SEARCH_PARAM_NAME } from './components/LoginAs';

const Unauthorized = createLazyComponent(
	() =>
		import(/* webpackChunkName: "unauthorized" */ './components/Unauthorized'),
);

const Authorized = createLazyComponent(
	() => import(/* webpackChunkName: "authorized" */ './components/Authorized'),
);

const Livechat = createLazyComponent(
	() => import(/* webpackChunkName: "livechat" */ './components/Livechat'),
);

const LoginAs = createLazyComponent(
	() => import(/* webpackChunkName: "login-as" */ './components/LoginAs'),
);

const OauthCallback = createLazyComponent(
	() =>
		import(
			/* webpackChunkName: "oauth-callback" */ './components/OauthCallback'
		),
);

const OauthProviderLogin = createLazyComponent(
	() =>
		import(
			/* webpackChunkName: "oauth-provider-login" */ './components/OauthProviderLogin'
		),
);

const OauthProviderConsent = createLazyComponent(
	() =>
		import(
			/* webpackChunkName: "oauth-provider-consent" */ './components/OauthProviderConsent'
		),
);

// Check if the path begins with a hash fragment, followed by a slash: /#/ OR
// A path that begins with a type and a tilde
const LEGACY_PATH_CHECK_RE = /^\/(#\/|[a-z-].+~)/;
const isLegacyPath = (path) => {
	if (path.match(LEGACY_PATH_CHECK_RE)) {
		return true;
	}

	return false;
};

// Removes # fragment prefix and type prefixes for a url path
const LEGACY_PATH_REPLACE_RE = /(^\/#\/|[a-z-]+~)/g;
const transformLegacyPath = (path) => {
	return path.replace(LEGACY_PATH_REPLACE_RE, '');
};

const analyticsClient = isProduction()
	? createClient({
			endpoint: 'data.balena-cloud.com',
			projectName: 'jellyfish',
			componentName: 'jellyfish-ui',
	  })
	: createNoopClient(false);

const webTracker = createWebTracker(analyticsClient, 'UI');

const JellyfishUI = ({ actions, status }) => {
	const location = useLocation();

	// Expose the router history object on the window so that UI navigation
	// can be driven from puppeteer, without having to reload the page
	(window as any).routerHistory = useHistory();

	React.useEffect(() => {
		webTracker.trackPageView();
	}, [location.pathname]);

	React.useEffect(() => {
		// Add a utility to the window to dump the core state, this is useful for
		// debugging
		(window as any).dumpState = async () => {
			const state = await actions.dumpState();

			const blob = new Blob([JSON.stringify(state)], {
				type: 'application/json;charset=utf-8',
			});

			saveAs(blob, `jellyfish-ui-dump__${new Date().toISOString()}.json`);
		};
	}, []);

	const path = window.location.pathname + window.location.hash;
	const query = new URLSearchParams(location.search);

	if (status === 'initializing') {
		return <Splash />;
	}

	if (matchPath(location.pathname, '/oauth/callback')) {
		return <OauthCallback />;
	}

	if (query.get(LOGIN_AS_SEARCH_PARAM_NAME)) {
		return <LoginAs />;
	}

	if (status === 'unauthorized') {
		return <Unauthorized />;
	}

	if (isLegacyPath(path)) {
		return <Redirect to={transformLegacyPath(path)} />;
	}

	if (matchPath(location.pathname, '/livechat')) {
		return <Livechat />;
	}

	if (matchPath(location.pathname, '/oauthprovider/login')) {
		return <OauthProviderLogin />;
	}

	if (matchPath(location.pathname, '/oauthprovider/consent')) {
		return <OauthProviderConsent />;
	}

	return <Authorized />;
};

const mapStateToProps = (state) => {
	return {
		status: selectors.getStatus(state),
		version: selectors.getAppVersion(state),
	};
};

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, ['dumpState']),
			dispatch,
		),
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(JellyfishUI);
