# Dr.やまねこの バイキン退治だいさくせん！

Godot 4.7.1 Standard／GDScript／Compatibilityレンダラーで制作した、5～7歳向けの横画面3Dアリーナ・クリーニングゲームです。

## 収録ステージ

1. 手あらいラボ
2. はみがき洞窟
3. おさらピカピカ工場
4. おなかフローラガーデン
5. バイキン大王の秘密基地

## 操作

- 左下をドラッグ：移動
- 右側をドラッグ：視点
- 「あわ」ボタン長押し：泡を発射
- PC：WASD／矢印、右ドラッグ、Space

## Web書き出し

```powershell
& 'C:\Users\yuya1\.codex\tools\godot-4.7.1\Godot_v4.7.1-stable_win64_console.exe' `
  --headless `
  --path '.' `
  --export-release 'Web' `
  '..\..\dr-yamaneko-baikin\index.html'
```

## 音声

Dr.やまねこの音声にはVOICEVOX ずんだもんを使用しています。

```text
音声：VOICEVOX:ずんだもん
```

音声は事前生成済みの静的ファイルです。ゲーム実行時にVOICEVOXへ接続しません。

## セーブ

進行と設定は`user://`へ保存します。Web版ではブラウザー内のIndexedDBです。サイトデータの削除やプライベートブラウズにより消える場合があります。
