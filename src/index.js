#!/usr/bin/env node
// @flow

import * as fs from 'fs';
import * as path from 'path';

import chalk from 'chalk';

import rules from './rules';
import * as lint from './lint';
import {readRepo} from './git';


const ignore = new Set(['node_modules']);

type Dir = {dir: string, isRepo: boolean};

type DirResult = {dir: Dir, result: lint.LintResults, safe: boolean};

function collectDirs(root: string): Array<Dir> {
  const result = [];
  function recurse(dirPath: string, depth: number, inRepo: boolean) {
    let hasGit = false;
    const subDirs = [];
    fs.readdirSync(dirPath).forEach((basename) => {
      const subDirPath = path.join(dirPath, basename);
      if (basename === '.git') {
        hasGit = true;
        console.log(`found ${dirPath}`);
        result.push({dir: dirPath, isRepo: true});
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
          subDirs.push(subDirPath);
        }
      }
    });

    subDirs.forEach((subDirPath) => {
      recurse(subDirPath, depth + 1, hasGit);
    });

    if (depth === 1 && !(inRepo || hasGit)) {
      result.push({dir: dirPath, isRepo: false});
    }
  }

  recurse(path.resolve(root), 0, false);

  return result;
}

function checkDir(dir: Dir): Promise<DirResult> {
  const result = dir.isRepo
    ? readRepo(dir.dir)
      .then((repo) => {
        return lint.applyRules(rules, repo);
      })
    : Promise.resolve({failures: [{ruleName: 'not-repo', safe: false}]})
  return result.then((result) => ({result, dir, safe: result.failures.every(({safe}) => safe)}));
}

function checkDirs(dirs: Dir[]): Promise<DirResult[]> {
  // $FlowIssue https://github.com/facebook/flow/issues/1163
  const iterator = dirs[Symbol.iterator]();

  const results = [];

  function advance() {
    const {done, value} = iterator.next();
    if (done) {
      return Promise.resolve(results);
    } else {
      return checkDir(value).then((result) => {
        results.push(result);
        return advance();
      });
    }
  }

  return advance();
}

const dirs = collectDirs(process.argv[2] || '.');
console.log('checking repos');
checkDirs(dirs).then((dirResults) => {
  dirResults.forEach(({dir, result}) => {
    console.log(chalk.underline(dir.dir));
    lint.summary(result);
    console.log();
  })
}).catch(e => setImmediate(() => {throw e;}));
