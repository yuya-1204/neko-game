# 音声の再生成

公開ゲームは `voice/*.mp3` を再生します。遊ぶ人のPCにVOICEVOXは不要です。

制作者が音声を作り直す場合だけ、VOICEVOXを起動して次を実行します。音声原本の出力先はリポジトリの外に指定してください。

```sh
python tools/synthesize-voice.py --output-dir /path/to/neko-shelf-voice-wav
python tools/compress-voice.py --input-dir /path/to/neko-shelf-voice-wav --ffmpeg /path/to/ffmpeg
```

台本は `voice-lines.json`、ゲームからの呼び出しIDと字幕は `audio.mjs` の `VOICE_LINES` にあります。文言を変えるときは両方を同じ内容に更新します。特定の音声だけ再生成するには、合成コマンドに `--only guide1 --force` などを付けてください。

合成はずんだもんのノーマル（speaker 3）、24 kHz・モノラルです。MP3は48 kbpsで、全24本を合わせて500 KB未満に収めています。スクリプトは全ファイルの長さと音量を調べ、圧縮後には再デコードして無音や破損がないことを確認します。

音声の利用・再配布時は、[音声クレジットと利用規約](../THIRD_PARTY_NOTICES.md)を確認してください。
