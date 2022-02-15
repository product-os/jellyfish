import React from 'react';
import { Route, Switch } from 'react-router-dom';
import AuthContainer from './Auth';
import { createLazyComponent } from './SafeLazy';

export const Login = createLazyComponent(
	() => import(/* webpackChunkName: "login" */ './Auth/Login'),
);

export const RequestPasswordReset = createLazyComponent(
	() =>
		import(
			/* webpackChunkName: "request-password-reset" */ './Auth/RequestPasswordReset'
		),
);

export const CompletePasswordReset = createLazyComponent(
	() =>
		import(
			/* webpackChunkName: "complete-password-reset" */ './Auth/CompletePasswordReset'
		),
);

export const CompleteFirstTimeLogin = createLazyComponent(
	() =>
		import(
			/* webpackChunkName: "complete-first-time-login" */ './Auth/CompleteFirstTimeLogin'
		),
);

const Unauthorized = () => {
	return (
		<AuthContainer>
			<Switch>
				<Route
					path="/request_password_reset"
					component={RequestPasswordReset}
				/>
				<Route
					path="/password_reset/:resetToken/:username?"
					component={CompletePasswordReset}
				/>
				<Route
					path="/first_time_login/:firstTimeLoginToken/:username?"
					component={CompleteFirstTimeLogin}
				/>
				<Route path="/*" component={Login} />
			</Switch>
		</AuthContainer>
	);
};

export default Unauthorized;
