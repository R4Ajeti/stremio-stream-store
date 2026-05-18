import type { IncomingMessage, ServerResponse } from 'node:http'

import { BuildApp } from '../src/app.js'

const AppPromiseObj = BuildApp()

export default async function Handler(RequestObj: IncomingMessage, ResponseObj: ServerResponse) {
  const AppObj = await AppPromiseObj
  await AppObj.ready()
  AppObj.server.emit('request', RequestObj, ResponseObj)
}
