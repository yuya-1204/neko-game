"""Build bundled VOICEVOX audio. Requires a running local VOICEVOX engine.

Generate lossless masters (never directly served by the website):
  python tools/synthesize-voice.py --output-dir /path/to/voice-wav
Then build the small bundled MP3 files:
  python tools/compress-voice.py --input-dir /path/to/voice-wav --ffmpeg /path/to/ffmpeg
The default master directory is a temporary folder outside the repository.
The website plays the bundled MP3 files and never contacts this engine.
"""
from __future__ import annotations

import argparse
import array
import json
import math
from pathlib import Path
import sys
import tempfile
import urllib.parse
import urllib.request
import wave


ROOT = Path(__file__).resolve().parent.parent


def request(url: str, body: bytes = b"", content_type: str | None = None) -> bytes:
    headers = {"Content-Type": content_type} if content_type else {}
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=90) as response:
        return response.read()


def validate(path: Path) -> dict:
    with wave.open(str(path), "rb") as wav:
        rate, channels, width, frames = (
            wav.getframerate(), wav.getnchannels(), wav.getsampwidth(), wav.getnframes()
        )
        raw = wav.readframes(frames)
    if width != 2:
        raise ValueError(f"Expected 16-bit PCM: {path}")
    samples = array.array("h", raw)
    if sys.byteorder != "little":
        samples.byteswap()
    peak = max(abs(s) for s in samples) if samples else 0
    rms = math.sqrt(sum(s * s for s in samples) / max(1, len(samples)))
    duration = frames / rate
    if not 0.25 < duration < 12 or peak < 1000 or rms < 100:
        raise ValueError(f"Unexpected or silent audio: {path}, {duration=}, {peak=}, {rms=}")
    return {
        "file": path.name, "duration": round(duration, 3),
        "rate": rate, "channels": channels, "peak": peak, "rms": round(rms, 1),
        "bytes": path.stat().st_size,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--engine", default="http://127.0.0.1:50021")
    parser.add_argument("--speaker", type=int, default=3, help="VOICEVOX Zundamon normal")
    parser.add_argument("--validate-only", action="store_true")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--only", help="Regenerate or validate one line by its ID")
    parser.add_argument("--output-dir", type=Path,
                        default=Path(tempfile.gettempdir()) / "hakoneko-voice-wav",
                        help="Lossless WAV master directory, separate from bundled MP3 files")
    args = parser.parse_args()
    lines = json.loads((ROOT / "voice-lines.json").read_text(encoding="utf-8"))
    if args.only:
        if args.only not in lines:
            parser.error(f"Unknown voice ID: {args.only}")
        lines = {args.only: lines[args.only]}
    reports = []
    for ident, line in lines.items():
        path = args.output_dir / f"{ident}.wav"
        path.parent.mkdir(parents=True, exist_ok=True)
        if not args.validate_only and (args.force or not path.exists()):
            query_url = args.engine + "/audio_query?" + urllib.parse.urlencode({
                "text": line["text"], "speaker": args.speaker,
            })
            query = json.loads(request(query_url))
            query.update({
                "speedScale": 1.08,
                "intonationScale": 1.1,
                "volumeScale": 0.95,
                "prePhonemeLength": 0.08,
                "postPhonemeLength": 0.16,
                "outputSamplingRate": 24000,
                "outputStereo": False,
            })
            payload = json.dumps(query, ensure_ascii=False).encode("utf-8")
            sound = request(
                args.engine + f"/synthesis?speaker={args.speaker}",
                payload, "application/json",
            )
            path.write_bytes(sound)
        result = {"id": ident, **validate(path)}
        reports.append(result)
        print(json.dumps(result, ensure_ascii=False), flush=True)
    print(json.dumps({
        "validated": len(reports), "total_bytes": sum(r["bytes"] for r in reports),
        "total_seconds": round(sum(r["duration"] for r in reports), 3),
    }))


if __name__ == "__main__":
    main()
