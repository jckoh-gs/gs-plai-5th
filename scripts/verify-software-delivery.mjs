import {readFileSync, lstatSync, writeFileSync, openSync, fsyncSync, closeSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve, join} from 'node:path';
import {pathToFileURL} from 'node:url';

const approvedOrigin = 'git@github.com:jckoh-gs/gs-plai-5th.git';
const sha = value => createHash('sha256').update(value).digest('hex');
const demand = (condition, code) => { if (!condition) throw Error(code); };
const oid = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const safePath = value => typeof value === 'string' && /^[A-Za-z0-9_.\/-]+$/.test(value)
  && !value.startsWith('/') && !value.split('/').some(x => !x || x === '.' || x === '..' || x === '.git')
  && !value.startsWith('artifacts/private/') && value !== '.env';
const ordinary = item => item?.type === 'blob' && ['100644', '100755'].includes(item.mode);
const required = ['package.json', 'package-lock.json', 'samples/wind.csv', 'samples/solar.csv', 'samples/hybrid.csv'];
const supplemental = ['README.md', '.env.example', 'docker-compose.yml', 'mosquitto/mosquitto.conf'];
const completePrefixes = ['server/', 'web/', 'samples/', 'scripts/', 'tests/'];

// Checkpoints describe historical source objects. The working tree can contain later
// operational changes; this verifier does not confuse it with the deployed image.
export function verifySoftwareDelivery({root = process.cwd(), manifestPath, checkpointTag, runtimeTag, deadlineAt}) {
  demand(safePath(manifestPath), 'unsafe-manifest-path');
  for (const tag of [checkpointTag, runtimeTag]) demand(typeof tag === 'string' && /^stable-[A-Za-z0-9.-]+$/.test(tag) && !tag.includes('..') && !tag.endsWith('.'), 'invalid-tag');
  const deadline = Date.parse(deadlineAt);
  demand(Number.isFinite(deadline), 'invalid-deadline');
  const stopAt = Math.min(deadline, Date.now() + 60000);
  const remaining = () => { const ms = stopAt - Date.now(); demand(ms > 0, 'deadline-expired'); return ms; };
  const git = args => {
    const timeout = Math.min(8000, remaining());
    try {
      const value = execFileSync('git', args, {cwd: root, timeout, killSignal: 'SIGKILL', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'], env: {...process.env, GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0'}});
      remaining(); return value;
    } catch { throw Error('git-read-failed-or-deadline'); }
  };
  let local = resolve(root);
  for (const part of manifestPath.split('/')) { local = join(local, part); demand(!lstatSync(local).isSymbolicLink(), 'manifest-symlink'); }
  demand(lstatSync(local).isFile(), 'manifest-not-file');
  const bytes = readFileSync(local), manifest = JSON.parse(bytes);
  const sourceCommit = manifest.source?.commit, runtimeCommit = manifest.runtimeIdentity?.commit;
  demand(oid(sourceCommit) && oid(runtimeCommit) && manifest.deployment?.sourceCommit === runtimeCommit, 'invalid-commit-binding');
  const tree = commit => {
    demand(oid(commit) && git(['cat-file', '-t', commit]).toString().trim() === 'commit', 'commit-unavailable');
    const entries = new Map();
    for (const row of git(['ls-tree', '-rz', '--full-tree', commit]).toString().split('\0').filter(Boolean)) {
      const match = /^(\d{6}) (blob|commit) ([a-f0-9]{40})\t([\s\S]+)$/.exec(row);
      demand(match, 'invalid-git-tree');
      entries.set(match[4], {mode: match[1], type: match[2], oid: match[3]});
    }
    return entries;
  };
  const sourceTree = tree(sourceCommit), runtimeTree = tree(runtimeCommit);
  const cache = new Map();
  const blob = (entries, path) => {
    demand(safePath(path), 'unsafe-inventory-path');
    const entry = entries.get(path); demand(ordinary(entry), 'nonregular-or-missing-file');
    if (!cache.has(entry.oid)) cache.set(entry.oid, git(['cat-file', 'blob', entry.oid]));
    return cache.get(entry.oid);
  };
  const verifyHashes = (hashes, entries) => {
    demand(hashes && typeof hashes === 'object' && !Array.isArray(hashes) && Object.keys(hashes).length > 0, 'empty-hash-inventory');
    return Object.entries(hashes).sort(([a], [b]) => a.localeCompare(b)).map(([path, expected]) => {
      demand(typeof expected === 'string' && /^[a-f0-9]{64}$/.test(expected), 'invalid-sha256');
      const data = blob(entries, path); demand(sha(data) === expected, 'git-blob-hash-mismatch');
      return {path, sha256: expected, bytes: data.length, gitBlob: entries.get(path).oid};
    });
  };
  const sourceFiles = verifyHashes(manifest.source.hashes, sourceTree);
  for (const path of required) demand(Object.hasOwn(manifest.source.hashes, path), 'required-source-file-omitted');
  for (const prefix of completePrefixes) demand([...sourceTree.keys()].some(path => path.startsWith(prefix)), `required-${prefix.slice(0, -1)}-inventory-empty`);
  for (const path of sourceTree.keys()) if (completePrefixes.some(prefix => path.startsWith(prefix))) demand(Object.hasOwn(manifest.source.hashes, path), 'source-tree-inventory-incomplete');
  const runtimeFiles = verifyHashes(manifest.runtimeIdentity.hashes, runtimeTree);
  for (const path of required.concat(['Dockerfile', 'vite.config.js', 'docs/protocol.md', 'scripts/vpp-client.js', 'scripts/client-message.js'])) demand(Object.hasOwn(manifest.runtimeIdentity.hashes, path), 'required-runtime-file-omitted');
  for (const path of runtimeTree.keys()) if (['server/', 'samples/'].some(prefix => path.startsWith(prefix)) || (path.startsWith('web/') && !path.endsWith('.md'))) demand(Object.hasOwn(manifest.runtimeIdentity.hashes, path), 'runtime-tree-inventory-incomplete');
  for (const file of runtimeFiles) demand(sha(blob(sourceTree, file.path)) === file.sha256, 'source-runtime-divergence');
  const supplementalFiles = supplemental.map(path => { const data = blob(sourceTree, path); return {path, sha256: sha(data), bytes: data.length, gitBlob: sourceTree.get(path).oid, scope: 'Supplemental delivery file at source.commit; not retroactively added to immutable manifest hashes'}; });
  const pkg = JSON.parse(blob(sourceTree, 'package.json')), lock = JSON.parse(blob(sourceTree, 'package-lock.json'));
  demand(pkg.version === manifest.productVersion && lock.version === pkg.version && lock.packages?.['']?.version === pkg.version, 'package-version-mismatch');
  demand(git(['remote', 'get-url', 'origin']).toString().trim() === approvedOrigin, 'unapproved-origin');
  const branch = 'refs/heads/main', releaseRef = `refs/tags/${checkpointTag}`, runtimeRef = `refs/tags/${runtimeTag}`;
  const requested = [branch, releaseRef, `${releaseRef}^{}`, runtimeRef, `${runtimeRef}^{}`];
  const refs = new Map();
  const observedAt = new Date().toISOString();
  for (const row of git(['ls-remote', 'origin', ...requested]).toString().trim().split('\n')) {
    const [object, ref] = row.split(/\s+/); demand(oid(object) && requested.includes(ref) && !refs.has(ref), 'invalid-remote-ref-response'); refs.set(ref, object);
  }
  for (const ref of requested) demand(refs.has(ref), 'missing-advertised-ref');
  const peel = ref => {
    const object = refs.get(ref), commit = refs.get(`${ref}^{}`);
    demand(git(['cat-file', '-t', object]).toString().trim() === 'tag', 'tag-object-unavailable');
    demand(git(['rev-parse', `${object}^{commit}`]).toString().trim() === commit, 'remote-tag-peel-mismatch');
    return commit;
  };
  const checkpointCommit = peel(releaseRef), runtimeTagCommit = peel(runtimeRef), mainCommit = refs.get(branch);
  demand(runtimeTagCommit === runtimeCommit, 'runtime-tag-mismatch');
  const mainTree = tree(mainCommit), checkpointTree = tree(checkpointCommit);
  for (const target of [mainCommit, checkpointCommit]) for (const ancestor of [sourceCommit, runtimeCommit]) git(['merge-base', '--is-ancestor', ancestor, target]);
  for (const entries of [mainTree, checkpointTree]) demand(sha(blob(entries, manifestPath)) === sha(bytes), 'advertised-manifest-mismatch');
  // Main may advance operational documents, but the claimed running software must
  // still be the same exact runtime bytes when this delivery observation is made.
  for (const file of runtimeFiles) demand(sha(blob(mainTree, file.path)) === file.sha256, 'main-runtime-divergence');
  const deliveredPaths = [...new Set([...sourceFiles.map(x => x.path), ...supplemental, ...[...mainTree.keys()].filter(path => completePrefixes.some(prefix => path.startsWith(prefix)))])].sort();
  const deliveredFilesAtMain = deliveredPaths.map(path => { const data = blob(mainTree, path); return {path, sha256: sha(data), bytes: data.length, gitBlob: mainTree.get(path).oid}; });
  remaining();
  return {schemaVersion: 1, result: 'SOFTWARE_GIT_DELIVERY_CHECKS_PASSED', checkedAt: new Date().toISOString(), completionClaim: false, remoteMutationsPerformed: false, manifest: {path: manifestPath, sha256: sha(bytes), productVersion: manifest.productVersion}, sourceCommit, runtimeCommit, sourceFiles, runtimeFiles, supplementalFiles, deliveredFilesAtMain, counts: {source: sourceFiles.length, runtime: runtimeFiles.length, supplemental: supplementalFiles.length, deliveredAtMain: deliveredFilesAtMain.length, testsAtSource: sourceFiles.filter(x => x.path.startsWith('tests/')).length, scriptsAtSource: sourceFiles.filter(x => x.path.startsWith('scripts/')).length, samplesAtSource: sourceFiles.filter(x => x.path.startsWith('samples/')).length}, remote: {origin: approvedOrigin, observedAt, refs: Object.fromEntries(refs), mainCommit, checkpointCommit, runtimeTagCommit, sourceAndRuntimeAncestorsOfMainAndCheckpoint: true}, scope: 'Exact regular Git objects and freshly advertised refs. Historical source inventory is distinct from later main operational files. No working-tree byte equality, secret scan, test execution, remote runtime verification, final media or overall completion is implied.'};
}

function main() {
  const args = process.argv.slice(2), options = {};
  demand(args.length === 8, 'usage');
  for (let i = 0; i < args.length; i += 2) { demand(['--manifest', '--checkpoint-tag', '--runtime-tag', '--output'].includes(args[i]) && !Object.hasOwn(options, args[i]), 'usage'); options[args[i]] = args[i + 1]; }
  const output = options['--output']; demand(safePath(output) && output.endsWith('.json'), 'unsafe-output-path');
  let parent = process.cwd();
  for (const part of output.split('/').slice(0, -1)) { parent = join(parent, part); demand(lstatSync(parent).isDirectory() && !lstatSync(parent).isSymbolicLink(), 'unsafe-output-parent'); }
  // The caller supplies an existing evidence directory. Reserve only after all
  // reads pass; wx prevents overwriting a prior or uncertain result.
  const run = JSON.parse(readFileSync('docs/operations/run.json'));
  const report = verifySoftwareDelivery({manifestPath: options['--manifest'], checkpointTag: options['--checkpoint-tag'], runtimeTag: options['--runtime-tag'], deadlineAt: run.deadlineAt});
  demand(Date.now() < Date.parse(run.deadlineAt), 'deadline-expired');
  // A file can survive an interrupted write or a deadline reached during fsync.
  // Its existence is never the successful exit receipt. Only stdout after this
  // final deadline check carries the PASS verdict and binds the saved bytes.
  const recorded = {...report, result: 'SOFTWARE_GIT_CHECKS_RECORDED', requiresSuccessfulExitReceipt: true};
  const outputBytes = JSON.stringify(recorded, null, 2) + '\n';
  const fd = openSync(output, 'wx', 0o600);
  try { writeFileSync(fd, outputBytes); fsyncSync(fd); } finally { closeSync(fd); }
  demand(Date.now() < Date.parse(run.deadlineAt), 'deadline-expired-after-write');
  console.log(JSON.stringify({result: report.result, output, outputSha256: sha(outputBytes), counts: report.counts, completionClaim: false, scope: 'Valid only with process exit 0 and the exact saved report hash'}));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { main(); } catch { console.error('SOFTWARE_DELIVERY_INCOMPLETE: verify explicit manifest, regular Git objects, approved remote refs and original deadline. No completion claim; raw command output withheld.'); process.exitCode = 1; }
}
