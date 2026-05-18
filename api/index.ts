import { BuildApp } from '../src/app.js'

const AppPromise = BuildApp()

export default async function Handler(RequestObj: any, ResponseObj: any) {
  const App = await AppPromise
  await App.ready()
  App.server.emit('request', RequestObj, ResponseObj)
}