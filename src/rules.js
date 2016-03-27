// @flow

import type {Repo} from './git';
import type {LintReporter} from './lint';
import {PRETTY} from './utils';


export default {
  'no-uncomitted'(lint: LintReporter, repo: Repo) {
    repo.statuses.forEach((status) => {
      lint.fail(PRETTY`${status.path}`);
    });
  },

  'no-detached'(lint: LintReporter, repo: Repo) {
    if (repo.detached) {
      lint.fail();
    }
  },

  'no-unborn'(lint: LintReporter, repo: Repo) {
    if (repo.unborn) {
      lint.fail();
    }
  },

  'upstream'(lint: LintReporter, repo: Repo) {
    repo.references.forEach(({isBranch, upstream, shorthand}) => {
      if (isBranch && ! upstream) {
        lint.fail(PRETTY`${shorthand}`);
      }
    });
  },

  'no-ahead'(lint: LintReporter, repo: Repo) {
    repo.references.forEach(({upstreamAheadBehind, shorthand}) => {
      if (upstreamAheadBehind && upstreamAheadBehind.ahead !== 0) {
        lint.fail(PRETTY`${shorthand} is ahead by ${upstreamAheadBehind.ahead} commit(s)`);
      }
    });
  },

  'no-behind'(lint: LintReporter, repo: Repo) {
    repo.references.forEach(({upstreamAheadBehind, shorthand}) => {
      if (upstreamAheadBehind && upstreamAheadBehind.behind !== 0) {
        lint.fail(PRETTY`${shorthand} is behind by ${upstreamAheadBehind.behind} commit(s)`);
      }
    });
  },

  'no-stash'(lint: LintReporter, repo: Repo) {
    repo.stashes.forEach(({message}) => lint.fail(message));
  },

  'no-stale'(lint: LintReporter, repo: Repo) {
    const now = +new Date();
    repo.references.forEach((ref) => {
      if (ref.isHead && ref.commit && (now - ref.commit.date) > (1000*60*60*24*30)) {
        lint.fail(PRETTY`${ref.shorthand} last committed on ${ref.commit.date}`);
      }
    });
  }
};
