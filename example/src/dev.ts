import { dev } from 'workerkit/dev'
import pkg from '../package.json'

export default dev({ dependencies: pkg.dependencies })
