import { dev } from 'workers-routes/dev'
import pkg from '../package.json'

export default dev({ dependencies: pkg.dependencies })
