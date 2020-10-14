const user = require('./user.json')
const org = require('./org.json')
const contact = require('./contact.json')
const account = require('./account.json')

const allTypes = [
	user, org, contact, account
]

module.exports = {
	user,
	org,
	contact,
	account,
	allTypes
}
