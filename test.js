const Backend = require('./components/sdk/lib/rethink-backend')

const backend = new Backend({
  host: 'localhost',
  port: 28015,
  database: 'test'
})

backend.connect().then(() => {
  console.log('CONNECTED!')
  return backend.getElement('example', '761d82cb-3a06-4374-867c-65bfccc48fb9')
  // return backend.updateElement('example', {
    // id: '2dff887a-9d6f-4003-8d24-80fda4f92c79',
    // title: 'BAZ'
  // })
}).then((result) => {
  console.log(result)
  return backend.disconnect()
}).catch((error) => {
  console.error(error)
  return backend.disconnect()
})
