# git-organized

Checks your cloned Git repositories for disorganization.

```
$ brew install libgcrypt # might be required
$ npm install -g git-organized

$ git organized
repo-1
  error no-unborn

repo-2
  error upstream                patch-1
  error no-stash                On master: work on readme


repo-3
  error no-uncomitted           src/index.js
  error no-behind               master is behind by 1 commit(s)
```

Looks for:

* Uncommitted files
* Stashes
* Heads with no recent commits
* Branches without remotes
* Branches ahead or behind their upstream
* Detached heads


## Why?

I work with several different Git repositories in a given day, and it's easy to leave them with uncommitted files or without syncing with the upstream.
