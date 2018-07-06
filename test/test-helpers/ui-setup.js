const Enzyme = require('enzyme')
const Adapter = require('enzyme-adapter-react-16')
const {
	HowlerGlobal
} = require('howler')
const {
	JSDOM
} = require('jsdom')
const _ = require('lodash')

Enzyme.configure({
	adapter: new Adapter()
})

class NotificationStub {}
NotificationStub.permission = 'granted'
NotificationStub.requestPermission = _.noop
NotificationStub.close = _.noop
NotificationStub.onClick = _.noop

global.document = (new JSDOM('<body></body>')).window.document
global.window = document.defaultView

global.HowlerGlobal = HowlerGlobal
global.Image = window.Image
global.NodeFilter = window.NodeFilter
global.NodeList = window.NodeList
global.Notification = NotificationStub
global.getComputedStyle = window.getComputedStyle
global.navigator = window.navigator
