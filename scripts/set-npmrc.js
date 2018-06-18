// Used in production to install npm private modules
const fs = require('fs')
const NPM_TOKEN = process.env.NPM_TOKEN

if (process.env.NODE_ENV === 'production') {
	fs.writeFileSync('.npmrc', `//registry.npmjs.org/:_authToken=${NPM_TOKEN}`)
	fs.chmodSync('.npmrc', '0600')
}
