#!/usr/bin/env python3
"""Transcribe this run's own media locally with the reviewed, pinned ASR tools.

Run through scripts/deadline-command.py. A saved receipt alone is not success:
require the original process exit 0 and the receipt SHA printed on stdout.
This records transcription evidence, never direct listening or pronunciation.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import math
import os
from pathlib import Path
import subprocess
import sys
import time
import wave

ROOT = Path(__file__).resolve().parents[2]
PRIVATE = ROOT / "artifacts/private/audio-asr-20260921"
TOOLS = {
    "cli": (PRIVATE / "build/bin/whisper-cli", "645af2334c629a5ee8ed33b76a2cad4745c9c39c4b003a3ca90616326cb98528"),
    "model": (PRIVATE / "ggml-small.bin", "1be3a9b2063867b937e64e2ec7483364a79917e157fa98c5d94b5c1fffea987b"),
    "ffmpeg": (Path("/Users/charleskoh/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/lib/python3.12/site-packages/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1"), "6d175a4743ca50256e89a8cdd731100f9cee33bd79aeea46894d209410dc6617"),
}


def regular_path(path):
    path = Path(os.path.abspath(path))
    if any(part.is_symlink() for part in [path, *path.parents]):
        raise ValueError("symlink paths are not accepted")
    if not path.is_file():
        raise ValueError("a regular input file is required")
    return path


def sha256(path, check=lambda: None):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        while chunk := stream.read(1024 * 1024):
            check()
            digest.update(chunk)
    check()
    return digest.hexdigest()


def validate_transcription(data, duration):
    if isinstance(duration, bool) or not isinstance(duration, (int, float)) or not math.isfinite(duration) or not 10 <= duration <= 600:
        raise ValueError("trusted PCM must contain 10 to 600 seconds")
    if data.get("result", {}).get("language") != "ko":
        raise ValueError("Korean transcription is required")
    params = data.get("params", {})
    if params.get("language") != "ko" or params.get("translate") is not False:
        raise ValueError("Korean transcription without translation is required")
    rows = data.get("transcription")
    if not isinstance(rows, list) or not rows:
        raise ValueError("nonempty transcription is required")
    previous = 0
    nonempty = False
    for row in rows:
        offsets = row["offsets"]
        start, end = offsets["from"], offsets["to"]
        if any(isinstance(x, bool) or not isinstance(x, (int, float)) or not math.isfinite(x) for x in [start, end]):
            raise ValueError("finite numeric offsets are required")
        # The CLI timestamps use 10 ms units. Allow only rounding tolerance,
        # measured against actual extracted PCM, not the video container length.
        if not 0 <= previous <= start <= end <= duration * 1000 + 30:
            raise ValueError("unordered or out-of-audio transcription offsets")
        if not isinstance(row["text"], str):
            raise ValueError("text segments are required")
        nonempty |= bool(row["text"].strip())
        previous = end
    if not nonempty:
        raise ValueError("blank transcription is not evidence")
    return len(rows)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True,
                        help="new private directory; existing paths are rejected")
    args = parser.parse_args()
    run = json.loads((ROOT / "docs/operations/run.json").read_text())
    deadline_dt = datetime.fromisoformat(run["deadlineAt"].replace("Z", "+00:00"))
    if deadline_dt.tzinfo is None:
        raise ValueError("original deadline must have a timezone")
    deadline = deadline_dt.timestamp()
    stop = time.monotonic() + min(180, deadline - time.time())

    def remaining():
        seconds = min(stop - time.monotonic(), deadline - time.time())
        if seconds <= 0:
            raise TimeoutError("original deadline or 180 second budget expired")
        return seconds

    remaining()
    source = regular_path(args.input)
    if source.stat().st_size <= 0 or source.stat().st_size > 2 * 1024**3:
        raise ValueError("input must be nonempty and at most 2 GiB")
    source_hash = sha256(source, remaining)
    tool_records = {}
    for name, (path, expected) in TOOLS.items():
        path = regular_path(path)
        actual = sha256(path, remaining)
        if actual != expected:
            raise ValueError("pinned tool or model hash mismatch")
        tool_records[name] = {"path": str(path), "sha256": actual}

    output = Path(os.path.abspath(args.output_dir))
    if any(part.is_symlink() for part in [output, *output.parents]) or not output.parent.is_dir():
        raise ValueError("output parent must exist without symlinks")
    if not output.is_relative_to(ROOT / "artifacts/private"):
        raise ValueError("PCM and logs must remain under artifacts/private")
    remaining()
    output.mkdir(mode=0o700)  # Exclusive creation: never overwrite a prior run.
    started = datetime.now(timezone.utc).isoformat()
    commands = []

    def execute(command, log_name):
        with (output / log_name).open("x") as log:
            result = subprocess.run(command, stdin=subprocess.DEVNULL, stdout=log,
                                    stderr=subprocess.STDOUT, timeout=remaining())
        remaining()
        commands.append({"argv": command, "exitCode": result.returncode})
        if result.returncode != 0:
            raise ValueError("local media command failed; private log retained")

    pcm = output / "audio.wav"
    execute([str(TOOLS["ffmpeg"][0]), "-nostdin", "-hide_banner", "-loglevel", "error",
             "-protocol_whitelist", "file,pipe", "-i", str(source), "-vn", "-ac", "1", "-ar", "16000",
             "-c:a", "pcm_s16le", "-t", "601", "-n", str(pcm)], "decode.log")
    with wave.open(str(regular_path(pcm)), "rb") as audio:
        if (audio.getnchannels(), audio.getsampwidth(), audio.getframerate(), audio.getcomptype()) != (1, 2, 16000, "NONE"):
            raise ValueError("16 kHz mono signed 16-bit PCM is required")
        frames = audio.getnframes()
        duration = frames / 16000
        if not 10 <= duration <= 600:
            raise ValueError("trusted PCM must contain 10 to 600 seconds")
        if len(audio.readframes(frames)) != frames * 2:
            raise ValueError("truncated PCM data")
    pcm_hash = sha256(pcm, remaining)
    prefix = output / "transcription"
    execute([str(TOOLS["cli"][0]), "-m", str(TOOLS["model"][0]), "-f", str(pcm),
             "-l", "ko", "-t", "4", "-ng", "-oj", "-otxt", "-osrt", "-of", str(prefix)], "asr.log")
    result_path = regular_path(prefix.with_suffix(".json"))
    data = json.loads(result_path.read_text())
    segments = validate_transcription(data, duration)
    # Check inputs again before recording: concurrent changes invalidate provenance.
    if sha256(source, remaining) != source_hash or sha256(pcm, remaining) != pcm_hash:
        raise ValueError("input changed during transcription")
    for record in tool_records.values():
        if sha256(Path(record["path"]), remaining) != record["sha256"]:
            raise ValueError("pinned tool changed during transcription")
    outputs = []
    for name in ["transcription.json", "transcription.txt", "transcription.srt", "decode.log", "asr.log"]:
        path = regular_path(output / name)
        if name.startswith("transcription") and not path.stat().st_size:
            raise ValueError("empty ASR output")
        outputs.append({"path": str(path), "bytes": path.stat().st_size, "sha256": sha256(path, remaining)})
    receipt = {
        "state": "TECHNICAL_ASR_RECORDED", "requiresSuccessfulExitReceipt": True,
        "startedAt": started, "recordedAt": datetime.now(timezone.utc).isoformat(),
        "deadlineAt": run["deadlineAt"], "source": {"path": str(source), "sha256": source_hash},
        "pcm": {"path": str(pcm), "sha256": pcm_hash, "frames": frames, "durationSeconds": duration},
        "tools": tool_records, "commands": commands, "outputs": outputs,
        "segments": segments, "nonemptyAndActualPcmBoundsValidated": True,
        "language": "ko", "promptProvided": False, "directListening": False,
        "naturalPronunciationVerified": False, "semanticReviewRequired": True,
    }
    remaining()
    receipt_path = output / "receipt.json"
    with receipt_path.open("x") as stream:
        json.dump(receipt, stream, ensure_ascii=False, indent=2)
        stream.write("\n")
        stream.flush()
        os.fsync(stream.fileno())
    remaining()
    receipt_hash = sha256(receipt_path, remaining)
    print(json.dumps({"status": "ASR_CHECKS_RECORDED", "receipt": str(receipt_path),
                      "sha256": receipt_hash, "segments": segments,
                      "durationSeconds": duration, "directListening": False}))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, ValueError, KeyError, TypeError, AttributeError, TimeoutError, subprocess.SubprocessError, wave.Error):
        print("transcribe-audio: no successful receipt; inspect existing private output before retrying", file=sys.stderr)
        sys.exit(1)
