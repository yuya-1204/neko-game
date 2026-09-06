"""Encode small, fully bundled narration from lossless VOICEVOX masters.

python tools/compress-voice.py --input-dir /path/to/voice-wav --ffmpeg /path/to/ffmpeg

24 kHz mono, 48 kbps MP3 keeps all 22 lines below 500 KB. Every output is decoded
again, checked for a non-silent waveform, and compared with its original duration.
The source WAV files are never changed or removed by this script.
"""
from __future__ import annotations

import argparse
import array
import json
import math
from pathlib import Path
import subprocess
import sys
import wave

ROOT = Path(__file__).resolve().parent.parent


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-dir", type=Path, required=True)
    parser.add_argument("--ffmpeg", default="ffmpeg")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "voice")
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()
    lines = json.loads((ROOT / "voice-lines.json").read_text(encoding="utf-8"))
    args.output_dir.mkdir(parents=True, exist_ok=True)
    reports = []
    for ident in lines:
        source = args.input_dir / f"{ident}.wav"
        target = args.output_dir / f"{ident}.mp3"
        with wave.open(str(source), "rb") as wav:
            source_duration = wav.getnframes() / wav.getframerate()
        if not args.validate_only:
            subprocess.run([
                args.ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
                "-i", str(source), "-map_metadata", "-1", "-ac", "1", "-ar", "24000",
                "-c:a", "libmp3lame", "-b:a", "48k", str(target),
            ], check=True, capture_output=True)
        decoded = subprocess.run([
            args.ffmpeg, "-hide_banner", "-loglevel", "error", "-i", str(target),
            "-f", "s16le", "-acodec", "pcm_s16le", "-ac", "1", "-ar", "24000", "pipe:1",
        ], check=True, capture_output=True).stdout
        samples = array.array("h", decoded)
        if sys.byteorder != "little":
            samples.byteswap()
        if not samples:
            raise ValueError(f"Empty decoded audio: {target}")
        duration = len(samples) / 24000
        peak = max(abs(s) for s in samples)
        rms = math.sqrt(sum(s * s for s in samples) / len(samples))
        if abs(duration - source_duration) > .08 or peak < 500 or rms < 100:
            raise ValueError(f"Decoded audio mismatch: {ident}, {duration=}, {source_duration=}, {peak=}, {rms=}")
        report = {"id": ident, "bytes": target.stat().st_size,
                  "seconds": round(duration, 3), "peak": peak, "rms": round(rms, 1)}
        reports.append(report)
        print(json.dumps(report), flush=True)
    total = sum(report["bytes"] for report in reports)
    if total >= 500_000:
        raise ValueError(f"Narration exceeds 500 KB budget: {total}")
    print(json.dumps({"validated": len(reports), "total_bytes": total,
                      "total_seconds": round(sum(r["seconds"] for r in reports), 3)}))


if __name__ == "__main__":
    main()
