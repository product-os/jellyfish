/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const browserEnv = require('browser-env')
const Enzyme = require('enzyme')
const Adapter = require('enzyme-adapter-react-16')
const {
	HowlerGlobal
} = require('howler')
const _ = require('lodash')

browserEnv()

Enzyme.configure({
	adapter: new Adapter()
})

class NotificationStub {}
NotificationStub.permission = 'granted'
NotificationStub.requestPermission = _.noop
NotificationStub.close = _.noop
NotificationStub.onClick = _.noop
global.HowlerGlobal = HowlerGlobal
global.Notification = NotificationStub
global.URL = {
	createObjectURL: _.constant('https://jel.ly.fish/icons/jellyfish.svg')
}
