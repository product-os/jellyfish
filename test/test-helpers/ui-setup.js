const Enzyme = require('enzyme')
const Adapter = require('enzyme-adapter-react-16')
const {
	JSDOM
} = require('jsdom')

Enzyme.configure({
	adapter: new Adapter()
})

global.document = (new JSDOM('<body></body>')).window.document
global.window = document.defaultView
global.navigator = window.navigator
