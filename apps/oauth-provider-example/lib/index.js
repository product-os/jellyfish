const http = require('http')
const express = require('express')
const bodyParser = require('body-parser')

const app = express()
const server = http.createServer(app)

app.use(bodyParser.urlencoded({
	extended: false
}))

app.use(bodyParser.json({
	limit: '50mb'
}))

const LOGGED_IN_USER = 'test-user'

const users = [ {
	username: LOGGED_IN_USER,
	firstname: 'Support',
	lastname: 'User'
} ]

const oauthApps = [ {
	clientId: 'jellyfish',
	clientSecret: 'jellyfish client secret',
	redirectUrl: 'http://livechat/oauth/callback'
} ]

const oauthCodes = []
const apiTokens = []

app.use((req, _res, next) => {
	console.log('Received request:', req.url)
	next()
})

app.get('/oauth/authorize', (req, res) => {
	if (!req.query.client_id) {
		return res.status(400).json({
			message: 'The request has missing or malformed parameters'
		})
	}

	const oauthApp = oauthApps.find((oApp) => {
		return oApp.clientId === req.query.client_id
	})

	if (!oauthApp) {
		return res.status(400).json({
			message: `A client matching client_id ${req.query.client_id} was not found`
		})
	}

	// Show a confirmation dialog to user to approve `oauthApp.client_id` app
	// ...

	const code = `${Date.now()}`

	// Let's suppose LOGGED_IN_USER is logged in
	oauthCodes.push({
		user: LOGGED_IN_USER,
		value: code
	})

	return res.redirect(`${oauthApp.redirectUrl}?code=${code}&state=${req.query.state || ''}`)
})

app.post('/oauth/token', (req, res) => {
	const missingParams = [
		'code',
		'client_id',
		'client_secret'
	].filter((name) => {
		return !req.body[name]
	})

	if (missingParams.length) {
		return res.status(400).json({
			message: `The request is missing parameters: ${missingParams.join(', ')}`
		})
	}

	const oauthApp = oauthApps.find((oApp) => {
		return oApp.clientId === req.body.client_id
	})

	if (!oauthApp) {
		return res.status(400).json({
			message: `A client matching client_id "${req.body.client_id}" was not found`
		})
	}

	if (oauthApp.clientSecret !== req.body.client_secret) {
		return res.status(400).json({
			message: `Invalid client secret for ${oauthApp.clientId}`
		})
	}

	const oauthCode = oauthCodes.find((oCode) => {
		return oCode.value === req.body.code
	})

	if (!oauthCode) {
		return res.status(400).json({
			message: 'Invalid oauth code'
		})
	}

	const apiToken = {
		user: oauthCode.user,
		value: `${Date.now()}`
	}

	apiTokens.push(apiToken)

	return res.send({
		token_type: 'Bearer',
		access_token: apiToken.value
	})
})

app.get('/whoami', (req, res) => {
	const tokenValue = req.headers.authorization.split(' ').pop()

	const token = apiTokens.find((apiToken) => {
		return apiToken.value === tokenValue
	})

	if (!token) {
		return res.status(401).send({
			message: 'User not authorized'
		})
	}

	const user = users.find((usr) => {
		return usr.username === token.user
	})

	return res.send(user)
})

server.listen(80, () => {
	console.log('Oauth provider example app has started')
}).on('error', (err) => {
	throw new Error(`Oauth provider example app error:\n${err.toString()}`)
})
