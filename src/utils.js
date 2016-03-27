// @flow

import chalk from 'chalk';


export function allObj(obj: { [key: string]: any }): any {
  return Promise.all(
    Object
      .keys(obj)
      .map((key) => Promise.resolve(obj[key])
        .then((res) => ({[key]: res}))))
    .then((objs) => Object.assign(...objs));
}

export function PRETTY(strings: Array<string>, ...substs: Array<String>): string {
  if (substs.length === 0) {
    return chalk.bold(strings[0]);
  }
  let result = '';
  substs.forEach((subst, i) => {
    result = result + strings[i] + chalk.bold(subst);
  });
  return result + strings[strings.length - 1];
}
