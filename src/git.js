// @flow

import Git from 'nodegit';

import {allObj} from './utils';


const REF_TYPES = Git.Reference.TYPE;

export type Repo = {
  path: string,
  unborn: boolean,
  detached: boolean,
  state: number,
  statuses: Array<Status>,
  references: Array<Ref>,
  stashes: Array<Stash>
};

type Status = {
  path: string
};

type Ref = {
  name: string,
  shorthand: string,
  target: any,
  type: number,
  isHead: boolean,
  isBranch: boolean,
  isRemote: boolean,
  upstreamAheadBehind: ?{ahead: number, behind: number},
  upstream: ?string,
  commit: ?Commit
};

type Commit = {
  author: string,
  committer: string,
  message: string,
  summary: string,
  date: Date
}

type Stash = {
  index: number,
  message: string,
  id: any
};

function readCommit(ref) {
  return (ref.isTag()
    ? Git.Tag.lookup(ref.owner(), ref.target())
      .then(
        (tag) => tag.target(),
        () => ref.target())
    : Promise.resolve(ref.target()))
    .then((id) => Git.Commit.lookup(ref.owner(), id))
    .then((commit) => ({
      author: commit.author(),
      committer: commit.committer(),
      message: commit.message(),
      summary: commit.summary(),
      date: commit.date()
    }));
}

function readReferences(repo): Promise<Array<Ref>> {
  return repo.getReferences(REF_TYPES.LISTALL)
    .then((refs) => {
      return Promise.all(refs.map((ref) => {
        const isBranch = ref.isBranch();
        const name = ref.name();
        const target = ref.target();
        return allObj({
          name,
          shorthand: ref.shorthand(),
          target,
          type: ref.type(),
          isHead: ref.isHead(),
          isBranch,
          isRemote: ref.isRemote(),
          upstreamAheadBehind: undefined,
          upstream: isBranch ? Git.Branch.upstream(ref)
            .then(
              (ref) => ref.name(),
              () => {}) : null,
          commit: isBranch ? readCommit(ref) : null
        });
      }))
        .then((refs) => {
          const branchesWithUpstreams = [];
          const remotes: Map<string, Ref> = new Map();
          refs.forEach((ref) => {
            if (ref.isBranch && ref.upstream) {
              branchesWithUpstreams.push(ref);
            } else if (ref.isRemote) {
              if (remotes.has(ref.name)) {
                // TODO why are these duplicated?
                // console.warn(`duplicate ref ${ref.name}`);
              } else {
                remotes.set(ref.name, ref);
              }
            }
          });

          return Promise.all(branchesWithUpstreams.map((ref) => {
            const remote = remotes.get(ref.upstream);
            if (remote) {
              return Git.Graph.aheadBehind(repo, ref.target, remote.target)
                .then((aheadBehind) => {
                  ref.upstreamAheadBehind = aheadBehind;
                });
              } else {
                // TODO missing remote
              }
          }))
            .then(() => refs);
        });
    });
}

function readStashes(repo): Promise<Array<Stash>> {
  const stashes = [];

  return Git.Stash.foreach(repo, (index, message, id) => {
    stashes.push({index, message, id});
    return 0;
  })
    .then((res) => {
      if (res !== undefined && res !== 0) {
        throw new Error(`Stash.foreach returned ${res}`);
      }
      return stashes;
    });
}

function readRemotes(repo) {
  const callbacks = {
    credentials(url, userName) {
      return Git.Cred.sshKeyFromAgent(userName);
    }
  };

  return repo.getRemotes()
    .then((remotes) => {
      return Promise.all(remotes.map((remoteName) => {
        return Git.Remote.lookup(repo, remoteName)
          .then((remote) => {
            console.log(remote.url());
            return remote.connect(Git.Enums.DIRECTION.FETCH, callbacks)
              .then(() => {
                return remote.defaultBranch()
                  .then((defaultBranch) => {
                    console.log(`defaultBranch: ${defaultBranch}`);
                  })
                //console.log('connected?', wat);
              });
          })
      }))
    });
}

export function readRepo(repoPath: string): Promise<Repo> {
  return Git.Repository.open(repoPath)
    .then((repo) => {
      const unborn = repo.headUnborn() === 1;
      return allObj({
        path: repoPath,
        unborn,
        statuses: (unborn
          ? Promise.resolve([])
          // the default flags include RECURSE_UNTRACKED_DIRS which takes forever
          // if something like node_modules is not ignored
          : repo.getStatus({flags: Git.Status.OPT.INCLUDE_UNTRACKED}))
            .then((statuses) => statuses.map((status) => ({path: status.path()}))),
        references: readReferences(repo),
        stashes: readStashes(repo),
        detached: repo.headDetached() === 1,
        state: repo.state(),
        remotes: readRemotes(repo)
      });
    });
}
