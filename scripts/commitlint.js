import chalk from 'chalk'
import { execSync } from 'node:child_process'

console.log('\n')
console.log(chalk.cyan('📝 Checking commit message...'))

try {
  execSync('npm run commitlint', { stdio: 'inherit' })
  console.log('\n')
  console.log(chalk.green(`✅ 📝 Commit message is valid!`))
} catch {
  console.log('\n')
  console.log(chalk.red(`❌ That commit message looks a little sussy.\n`))
  console.log(
    chalk.yellow(
      `Please follow the format:\n<type>: <description>\n\nExample:\nfeat: add login screen\nfix: resolve ci/cd pipeline issue`,
    ),
  )
  process.exit(1)
}