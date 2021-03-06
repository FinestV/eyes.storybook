'use strict';
const yargs = require('yargs');
const {Logger} = require('@applitools/eyes-common');
const {configParams: externalConfigParams} = require('@applitools/visual-grid-client');
const VERSION = require('../package.json').version;
const eyesStorybook = require('./eyesStorybook');
const processResults = require('./processResults');
const validateAndPopulateConfig = require('./validateAndPopulateConfig');
const yargsOptions = require('./yargsOptions');
const generateConfig = require('./generateConfig');
const defaultConfig = require('./defaultConfig');
const configDigest = require('./configDigest');
const {makeTiming} = require('@applitools/monitoring-commons');
const handleTapFile = require('./handleTapFile');
const {performance, timeItAsync} = makeTiming();

(async function() {
  try {
    const argv = yargs
      .usage('Usage: $0 [options]')
      .epilogue('Check our documentation here: https://applitools.com/resources/tutorial')
      .showHelpOnFail(false, 'Specify --help for available options')
      .version('version', 'Show the version number', `Version ${VERSION}`)
      .alias('version', 'v')
      .wrap(yargs.terminalWidth())
      .options(yargsOptions).argv;

    console.log(`Using @applitools/eyes-storybook version ${VERSION}.\n`);

    const config = generateConfig({argv, defaultConfig, externalConfigParams});
    const logger = new Logger(config.showLogs, 'storybook');
    await validateAndPopulateConfig({config, logger, packagePath: process.cwd()});
    logger.log(`Running with the following config:\n${configDigest(config)}`);
    const results = await timeItAsync('eyesStorybook', () =>
      eyesStorybook({config, logger, performance, timeItAsync}),
    );
    const {exitCode, formatter, outputStr} = processResults({
      results,
      totalTime: performance['eyesStorybook'],
      concurrency: config.concurrency,
    });
    console.log(outputStr);

    if (config.tapFilePath) {
      handleTapFile(config.tapFilePath, formatter);
    }

    process.exit(config.exitcode === undefined ? exitCode : config.exitcode);
  } catch (ex) {
    console.log(ex.message);
    process.exit(1);
  }
})();
