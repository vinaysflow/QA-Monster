import 'dotenv/config';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { CodeReadingAgent } from '../core/Agent.js';
import { OutputFormatter } from '../output/Formatters.js';
import * as fs from 'fs/promises';
import * as path from 'path';

const program = new Command();

program
  .name('qa-monster')
  .description('Autonomous code reading agent for comprehensive test generation')
  .version('1.0.0');

// Main analyze command
program
  .command('analyze')
  .description('Analyze code and generate QA package')
  .argument('<file>', 'File or directory to analyze')
  .option('-c, --config <path>', 'Config file path')
  .option('-o, --output <dir>', 'Output directory', './qa-output')
  .option('-f, --format <formats>', 'Output formats (json,markdown,code)', 'json,code')
  .option('--no-cache', 'Disable caching')
  .option('--verbose', 'Verbose logging')
  .option('--cost-limit <amount>', 'Maximum cost in USD', '10.00')
  .option('--max-depth <depth>', 'Maximum dependency depth', '2')
  .action(async (file, options) => {
    const spinner = ora('Initializing agent...').start();

    try {
      const resolvedPath = path.resolve(file);
      spinner.text = 'Analyzing code...';

      const agent = new CodeReadingAgent(
        process.cwd(),
        process.env.TSCONFIG_PATH,
        process.env.OPENAI_API_KEY
      );

      const qaPackage = await agent.process(resolvedPath, {
        maxDependencyDepth: parseInt(options.maxDepth),
        costLimit: parseFloat(options.costLimit),
        verbose: options.verbose,
      });

      spinner.text = 'Generating output...';
      const formatter = new OutputFormatter(options.output, options.format.split(','));
      await formatter.format(qaPackage);

      spinner.succeed(chalk.green('Analysis complete!'));

      console.log(chalk.cyan('\n📊 Summary:'));
      console.log(`  Confidence: ${(qaPackage.confidence.overall * 100).toFixed(1)}%`);
      console.log(`  Test Scenarios: ${qaPackage.understanding.target.mainFunctions.length}`);
      if (qaPackage.metadata) {
        console.log(`  Cost: $${qaPackage.metadata.cost.toFixed(4)}`);
        console.log(`  Duration: ${qaPackage.metadata.duration}ms`);
      }

      console.log(chalk.cyan('\n📁 Output:'));
      console.log(`  ${options.output}/`);
    } catch (error) {
      spinner.fail(chalk.red('Analysis failed'));
      console.error(chalk.red('\nError:'), (error as Error).message);

      if ((error as Error).message.includes('cost limit')) {
        console.log(chalk.yellow('\n💡 Tip: Increase cost limit with --cost-limit'));
      }

      process.exit(1);
    }
  });

// Generate tests command
program
  .command('generate')
  .description('Generate test code from QA package')
  .argument('<package>', 'QA package JSON file')
  .option('-o, --output <dir>', 'Output directory', './tests/generated')
  .option('-f, --framework <name>', 'Test framework (auto-detect if not specified)')
  .action(async (packagePath, options) => {
    const spinner = ora('Loading package...').start();

    try {
      const qaPackage = JSON.parse(await fs.readFile(packagePath, 'utf-8'));
      const agent = new CodeReadingAgent();

      spinner.text = 'Generating tests...';
      const tests = await agent.generateTests(qaPackage, options);

      await fs.mkdir(options.output, { recursive: true });
      const testFilePath = path.join(options.output, tests.filePath);
      await fs.writeFile(testFilePath, tests.code);

      spinner.succeed(chalk.green('Tests generated!'));
      console.log(chalk.cyan(`\n📝 Tests written to: ${testFilePath}`));
    } catch (error) {
      spinner.fail(chalk.red('Generation failed'));
      console.error(chalk.red('\nError:'), (error as Error).message);
      process.exit(1);
    }
  });

// Watch mode (for development)
program
  .command('watch')
  .description('Watch files and auto-generate tests')
  .argument('<file>', 'File to watch')
  .option('-d, --debounce <ms>', 'Debounce delay', '1000')
  .action(async (file, options) => {
    console.log(chalk.cyan(`👀 Watching ${file}...`));

    const agent = new CodeReadingAgent();
    const chokidar = await import('chokidar');

    const watcher = chokidar.watch(file);
    let timeout: NodeJS.Timeout;

    watcher.on('change', async () => {
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        try {
          const qaPackage = await agent.process(file);
          const tests = await agent.generateTests(qaPackage);
          console.log(chalk.green('✅ Tests updated!'));
        } catch (error) {
          console.error(chalk.red('❌ Error:'), (error as Error).message);
        }
      }, parseInt(options.debounce));
    });
  });

// Serve command
program
  .command('serve')
  .description('Start API server')
  .option('-p, --port <port>', 'Port number', '3000')
  .action((options) => {
    const { startServer } = require('../api/server.js');
    startServer(parseInt(options.port));
  });

program.parse();
