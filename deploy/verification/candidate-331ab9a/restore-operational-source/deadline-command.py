#!/usr/bin/env python3
"""Bound an owned local command by this run's original deadline.

Killing a kubectl client does not cancel or roll back a remote operation.
After uncertain writes, inspect the original resource before any retry.
"""
import argparse
from datetime import datetime
import json
import math
import os
from pathlib import Path
import signal
import selectors
import subprocess
import sys
import tempfile
import time


def failure(message, code=125):
    print(f"deadline-command: {message}", file=sys.stderr)
    return code


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-file", type=Path,
                        default=Path(__file__).resolve().parents[1] / "docs/operations/run.json")
    parser.add_argument("--timeout-seconds", type=float, required=True)
    parser.add_argument("command", nargs=argparse.REMAINDER)
    args = parser.parse_args()
    command = args.command[1:] if args.command[:1] == ["--"] else args.command
    if not command or not math.isfinite(args.timeout_seconds) or args.timeout_seconds <= 0:
        return failure("a command and finite positive timeout are required")
    try:
        stamp = json.loads(args.run_file.read_text())["deadlineAt"]
        deadline = datetime.fromisoformat(stamp.replace("Z", "+00:00"))
        if deadline.tzinfo is None:
            raise ValueError()
        deadline = deadline.timestamp()
    except (OSError, ValueError, KeyError, TypeError, AttributeError):
        return failure("missing or invalid original run deadline; no command started")
    budget = min(args.timeout_seconds, deadline - time.time())
    if budget <= 0:
        return failure("original deadline has expired; no command started", 124)
    stop = time.monotonic() + budget
    process = None
    reaped = False
    cleanup_failed = False
    output_bytes = 0
    def stop_owned_group():
        # Keep our child unreaped until the group is signalled: its PID/PGID
        # cannot be reassigned to an unrelated process in that interval.
        nonlocal reaped, cleanup_failed
        if process is not None and not reaped:
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            except PermissionError:
                # Darwin may report EPERM for a group containing only our
                # unreaped zombie. Verify that no live member remains.
                try:
                    rows = subprocess.run(['/bin/ps', '-axo', 'pgid=,stat='],
                                          capture_output=True, text=True,
                                          timeout=1, check=True).stdout.splitlines()
                    cleanup_failed = any(int(parts[0]) == process.pid and not parts[1].startswith('Z')
                                         for row in rows if len(parts := row.split()) == 2)
                except (OSError, ValueError, subprocess.SubprocessError):
                    cleanup_failed = True
            except OSError:
                cleanup_failed = True
            # Do not signal this PID/group after wait has allowed PID reuse.
            reaped = True
            try:
                process.wait(timeout=1)
            except subprocess.TimeoutExpired:
                cleanup_failed = True
            if cleanup_failed:
                failure("local process-group cleanup is unverified; inspect the existing operation")
    def interrupt_command(_signal, _frame):
        signal.signal(signal.SIGTERM, signal.SIG_IGN)
        signal.signal(signal.SIGINT, signal.SIG_IGN)
        raise KeyboardInterrupt()
    signal.signal(signal.SIGTERM, interrupt_command)
    # Private temporary files bound memory and withhold raw failed-child output.
    with tempfile.TemporaryFile() as stdout, tempfile.TemporaryFile() as stderr:
        try:
            process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                       start_new_session=True)
            with selectors.DefaultSelector() as streams:
                for pipe, destination in [(process.stdout, stdout), (process.stderr, stderr)]:
                    streams.register(pipe, selectors.EVENT_READ, destination)
                while streams.get_map() or not reaped:
                    remaining = min(stop - time.monotonic(), deadline - time.time())
                    if remaining <= 0:
                        raise TimeoutError()
                    if not reaped:
                        exited = os.waitid(os.P_PID, process.pid, os.WEXITED | os.WNOHANG | os.WNOWAIT)
                        if exited is not None:
                            # A command is not a daemon launcher. Reap only after
                            # stopping any residual members of its owned group.
                            stop_owned_group()
                    for key, _ in streams.select(min(remaining, 0.05)):
                        chunk = os.read(key.fileobj.fileno(), 65536)
                        if not chunk:
                            streams.unregister(key.fileobj)
                            key.fileobj.close()
                            continue
                        output_bytes += len(chunk)
                        if output_bytes > 32 * 1024 * 1024:
                            raise OverflowError()
                        key.data.write(chunk)
            code = process.returncode
        except TimeoutError:
            return failure("local command timed out; remote work is not proven cancelled. "
                           "Inspect the existing operation before retrying.", 124)
        except OverflowError:
            return failure("command output exceeded the 32 MiB combined limit; local command stopped")
        except KeyboardInterrupt:
            return failure("local command interrupted; inspect the remote outcome before retrying", 130)
        except (OSError, ValueError):
            return failure("could not run the local command; no raw child output emitted")
        finally:
            stop_owned_group()
        if cleanup_failed:
            return 125
        if code != 0:
            return failure("local command failed; remote outcome may be uncertain. "
                           "Inspect existing state before retrying; raw output withheld.")
        if time.monotonic() >= stop or time.time() >= deadline:
            return failure("command finished after its deadline; success output withheld", 124)
        stdout.seek(0)
        stderr.seek(0)
        sys.stdout.buffer.write(stdout.read())
        sys.stderr.buffer.write(stderr.read())
    return 0


if __name__ == "__main__":
    sys.exit(main())
