// @flow

import chalk from 'chalk';

type LintResult = {ruleName: string, message?: string, safe: boolean};

type LintResults = {
  failures: Array<LintResult>
};

export type LintReporter = {
  fail: (message?: string, opts?: {safe?: boolean}) => void
};

type Rules<T> = {
  [key: string]: (result: LintReporter, arg: T) => void
};

export function summary(ruleResults: LintResults) {
  if (ruleResults.failures.length === 0) {
    console.log(`  ${chalk.green('OK')}`);
  }
  ruleResults.failures.forEach(({ruleName, message='', safe}) => {
    console.log(`  ${chalk.red('error')}\t${ruleName}\t\t${message}`);
  });
}

export function applyRules<T>(rules: Rules<T>, arg: T): Promise<LintResults> {
  const failures = [];

  const resultReporter = {
    failures,
    fail(message, opts={}) {
      const {safe=false} = opts;
      failures.push({
        ruleName: this.ruleName,
        message,
        safe
      });
    }
  };

  const promises = Object.keys(rules).map((ruleName: string) => {
    const ruleResult = Object.assign(Object.create(resultReporter), {ruleName});
    return rules[ruleName](ruleResult, arg);
  });

  return Promise.all(promises).then(() => ({failures}));
}
