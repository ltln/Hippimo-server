import chalk from 'chalk'
import { execSync } from 'node:child_process'

function run(title, cmd, icon, success, fail) {
  console.log('\n')
  console.log(chalk.cyan(`${icon} ${title}`))

  try {
    execSync(cmd, { stdio: 'inherit' })
    console.log('\n')
    console.log(chalk.green(`✅ ${icon} ${success}`))
  } catch {
    console.log('\n')
    console.log(chalk.red(`❌ ${icon} ${fail}`))
    process.exit(1)
  }
}

run(
  'Checking if your code needs a haircut...',
  'npm run format',
  '🎨',
  'Looks handsome!',
  `Your code needs barbering. You can call a barber with ${chalk.underline(chalk.yellow('npm run format:fix'))}.`,
)
run(
  'Looking for suspicious code smells...',
  'npm run lint',
  '🧹',
  'Code police found nothing suspicious.',
  'Code police found an issue.',
)
run(
  "Verifying your types aren't chaotic...",
  'npm run typecheck',
  '🛡️ ',
  'Type approved! 🤌',
  'TypeScript caught a type crime!',
)

console.log(chalk.green('\n🚀 All pre-commit checks passed!\n'))