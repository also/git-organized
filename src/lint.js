// @flow

import chalk from 'chalk';


type LintResults = {
  failures: Array<{ruleName: string, message: string}>
};

export type LintReporter = {
  fail: (message: ?string) => void
};

type Rules<T> = {
  [key: string]: (result: LintReporter, arg: T) => void
};

export function summary(ruleResults: LintResults) {
  if (ruleResults.failures.length === 0) {
    console.log(`  ${chalk.green('OK')}`);
  }
  ruleResults.failures.forEach(({ruleName, message=''}) => {
    console.log(`  ${chalk.red('error')}\t${ruleName}\t\t${message}`);
  });
}

export function applyRules<T>(rules: Rules<T>, arg: T): Promise<LintResults> {
  const failures = [];

  const resultReporter = {
    failures,
    fail(message) {
      this.failures.push({
        ruleName: this.ruleName,
        message
      });
    }
  };

  const promises = Object.keys(rules).map((ruleName) => {
    const ruleResult = Object.assign(Object.create(resultReporter), {ruleName});
    return rules[ruleName](ruleResult, arg);
  });

  return Promise.all(promises).then(() => ({failures}));
}
