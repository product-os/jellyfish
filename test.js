const Bluebird = require('bluebird')
const Backend = require('./components/sdk/lib/backend')
const Database = require('./components/sdk/lib/database')
const EVENT_CARD = require('./components/sdk/lib/cards/event.json')

const backend = new Backend({
  host: 'localhost',
  port: 28015,
  database: 'test'
})

const database = new Database(backend)

database.initialize().then(() => {
  // console.log('CONNECTED!')
  return backend.getElement('type', 'event')
  // return database.upsertCard(EVENT_CARD)
}).then((result) => {
  console.log(result)
  return backend.disconnect()
}).catch((error) => {
  console.error(error)
  return backend.disconnect()
})
