const { spawn } = require('child_process')
const path = require('path')

const port = process.env.PORT || 3000
const root = path.join(__dirname, '..')

const child = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['serve', '-s', 'dist', '-l', `tcp://0.0.0.0:${port}`],
  { stdio: 'inherit', shell: true, cwd: root },
)

child.on('exit', (code) => process.exit(code ?? 0))
