#!/usr/bin/env node
// @flow

import * as fs from 'fs';
import * as path from 'path';

import chalk from 'chalk';

import rules from './rules';
import * as lint from './lint';
import {readRepo} from './git';


const ignore = new Set(['node_modules']);

function collectGits(dirPath: string, result: Array<string>=[]): Array<string> {
  fs.readdirSync(dirPath).forEach((basename) => {
    const subDirPath = path.join(dirPath, basename);
    if (basename === '.git') {
      console.log(`found ${dirPath}`);
      result.push(dirPath);
    }
    else if (basename[0] !== '.' && !ignore.has(basename)) {
      let stat;
      try {
        stat = fs.statSync(subDirPath);
      } catch (e) {
        if (e.code !== 'ENOENT') {
          throw e;
        }
        return;
      }
      if (stat.isDirectory()) {
        collectGits(subDirPath, result);
      }
    }
  });
  return result;
}

function checkRepo(repoPath: string) {
  return readRepo(repoPath)
    .then((repo) => {
      return lint.applyRules(rules, repo);
    })
    .then((ruleResults) => {
      lint.summary(ruleResults);
      console.log();
    });
}

const gits = collectGits(process.argv[2] || '.');

console.log('checking repos');
// $FlowIssue https://github.com/facebook/flow/issues/1163
const iterator = gits[Symbol.iterator]();

function advance() {
  const {done, value} = iterator.next();
  if (!done) {
    console.log(chalk.underline(value));
    checkRepo(value).then(advance).done();
  }
}

advance();
