# キラキラしっぽグランプリ

Godot 4.7.1で制作した、子ども向けの3Dアーケードレーシングゲームです。

## 内容

- 明るい草原のオーバルコースを3周
- プレイヤー1台とAIレーサー3台
- 順位、ラップ、タイム、最高タイム
- ドリフトからのミニターボ
- キラリ収集と加速パネル
- キーボード、ゲームパッド、画面タッチ操作
- 自動アクセル、コース復帰、走行ライン補助
- 音は初期状態でオフ

## 操作

- 曲がる: `A` / `D` または左右キー
- ブレーキ: `S` または下キー
- ドリフト: `Space`
- コースへ戻る: `R`
- ゲームパッドと画面ボタンにも対応

## Web書き出し

Godot 4.7.1のStandard Export Templatesを導入後、プロジェクトの親リポジトリで次を実行します。

```powershell
godot --headless --path .\godot-src\kirakira-shippo-gp --export-release Web .\kirakira-shippo-gp\index.html
```

Web版はCompatibility renderer、single-thread構成です。外部通信、広告、解析、アカウント機能はありません。

## ライセンス

ゲーム固有のソースコードは本リポジトリの方針に従います。Godot Engineのライセンス表示は、公開物の`GODOT_ENGINE_LICENSE.txt`に収録します。

画面表示にはGoogle Fontsの`Kosugi Maru`を使用しています。フォント本体とApache License 2.0の全文は`assets/fonts/`に収録しています。
