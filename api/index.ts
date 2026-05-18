import awsLambdaFastify from '@fastify/aws-lambda'

import { BuildApp } from '../src/app.js'

const AppPromise = BuildApp()

export default async function Handler(RequestObj: unknown, ReplyObj: unknown) {
  const App = await AppPromise
  const Proxy = awsLambdaFastify(App)

  return Proxy(RequestObj, ReplyObj)
}
