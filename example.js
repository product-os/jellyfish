const r = require('rethinkdb')
const Bluebird = require('bluebird')
const Backend = require('./lib/sdk/backend')
const Database = require('./lib/sdk/database')
const CARDS = require('./lib/sdk/cards')
const jsonSchema = require('./lib/sdk/json-schema')

const backend = new Backend({
  host: 'localhost',
  port: 28015,
  database: 'test'
})

backend.connect().then(() => {
  return backend.query('cards', {
    type: 'object',
    additionalProperties: true,
    properties: {
      type: {
        type: 'string',
        pattern: '^type$'
      }
    },
    required: [ 'type' ]
  })
}).then((results) => {
  console.log(results)
  console.log(results.length)
  return backend.disconnect()
})



// const database = new Database(backend, {
  // bucket: 'cards'
// })

// database.initialize().then(() => {
  // console.log('CONNECTED!')

  // // return Bluebird.props({
    // // jviotti: backend.getElement('cards', 'jviotti'),
    // // action: backend.getElement('cards', 'action-update-email'),
  // // })
// }).then((result) => {
  // // console.log(result)
  // // return database.executeAction(result.action, result.jviotti, {
    // // email: 'juan@resin.com'
  // // })
// }).then((result) => {
  // console.log(result)
  // return backend.disconnect()
// }).catch((error) => {
  // console.error(error)
  // return backend.disconnect()
// })
