import AwsLambdaFastify from '@fastify/aws-lambda'

import { BuildApp } from '../src/app'

let HandlerObj: ReturnType<typeof AwsLambdaFastify> | null = null

export default async function Handler(RequestObj: any, ReplyObj: any) {
  if (!HandlerObj) {
    const AppObj = BuildApp()
    HandlerObj = AwsLambdaFastify(AppObj)
  }

  return HandlerObj(RequestObj, ReplyObj)
}