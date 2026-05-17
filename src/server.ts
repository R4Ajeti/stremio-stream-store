import { BuildApp } from './app.js'
import { Env } from './config/env.js'

const App = await BuildApp()

try {
  await App.listen({
    port: Env.PORT,
    host: '0.0.0.0',
  })

  App.log.info(`Stremio Stream Store running on port ${Env.PORT}`)
} catch (ErrorObj) {
  App.log.error(ErrorObj)
  process.exit(1)
}
