# にゃんこリバーシ くるりん大作戦！

6〜8歳ごろから遊べる、AI対戦の子ども向けリバーシです。

## 遊び方

- れんしゅう：6×6、やさしいAI、ヒント付き、1局で終了
- 2本先取：8×8、AIは「やさしい・ふつう・つよい」の3段階、先に2勝で終了
- 縦・横・斜めに相手のコマを挟むと、挟んだコマが自分のコマになります。
- 置ける場所がない場合は自動でパスします。
- 両者とも置けない場合、または盤面が埋まった場合に終局します。
- AIに1局勝つごとに、おさかなを1匹獲得します。
- おさかな数、音設定、ルール説明の閲覧状態はブラウザ内だけに保存します。

## 音声

音声はVOICEVOXで事前生成した静的WAVです。ゲーム実行時にVOICEVOXへ接続しません。

- ネコ先生：VOICEVOX:ずんだもん

VOICEVOX Engine起動中に次を実行すると、`voice-lines.json` から再生成できます。

```powershell
./tools/generate_voicevox.ps1
```

## テスト

Node.js 18以降で、ルール、パス、終局、AI合法手、2本先取を確認できます。

```powershell
node --test tests/reversi-core.test.js
```

## 公開ルート

- ゲーム：`https://yuya-1204.github.io/neko-game/neko-reversi/`
- 代表画像：`https://yuya-1204.github.io/neko-game/neko-reversi/screenshot.png`

© 山岸産業医事務所
