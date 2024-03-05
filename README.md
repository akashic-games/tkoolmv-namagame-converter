<p align="center">
<img src="https://github.com/akashic-games/tkoolmv-namagame-converter/blob/main/img/akashic.png"/>
</p>

# tkoolmv-namagame-converter
ツクールMVコンテンツをニコ生ゲームに変換するアプリ

## 使い方
以下のようにツクールMVゲームの配布用ファイルを生成します。
1. ツクールMVの「ファイル」メニューの「デプロイメント」を選択
2. プラットフォームを「ウェブブラウザ」、オプションの「未使用ファイルを含まない」を選択
3. 出力先を選んで「OK」ボタンを押す

上記で生成したファイルを本アプリにドラッグ＆ドロップして、ニコ生ゲームの変換する処理が完了するまで待ちます。
![RPG ツクール MV ニコ生ゲーム化コンバーター1](https://github.com/akashic-games/tkoolmv-namagame-converter/blob/main/img/namagame-converter1.png)

完了すると以下の画像のように本アプリ上でゲームの動作確認ができるようになります。
![RPG ツクール MV ニコ生ゲーム化コンバーター2](https://github.com/akashic-games/tkoolmv-namagame-converter/blob/main/img/namagame-converter2.png)

「ダウンロード」ボタンで変換済みのニコ生ゲームのダウンロードが、「ゲームページ」ボタンでブラウザ上でのゲームの動作確認が可能です。

## ビルド方法
以下のコマンドでビルドを実行します。

```bash
npm install
```

## 動作確認方法
以下のコマンドでアプリを実行します。

```bash
npm start
```

## exeファイルの生成方法
windows 環境と mac 環境で実行するコマンドが異なります。

windows 環境の場合は、以下のコマンドで exe ファイルを生成します。

```bash
npm run build-exec:win
```

mac 環境の場合は、以下のコマンドで dmg ファイルを生成します。  
**ただし、生成されたファイルは正常に動作しない可能性があります。**

```bash
npm run build-exec:mac
```

## 開発者向け

### playgroundの更新方法
以下のコマンドで、playground を最新の状態に更新します。

```bash
npm run update-playground
```

### テスト方法
以下のコマンドで、src に対して lint が実行されます。

```bash
npm test
```

### デプロイ方法
本リポジトリでは 以下のコマンドで windows 環境でのデプロイが可能です。

```bash
npm run release:win
```

これによって、Github リポジトリに現バージョンでのリリースノートが作成され、そのリリースノートに exeファイル等のビルド成果物がアップロードされます。

## ライセンス

本リポジトリのソースコードは MIT License の元で公開されています。
詳しくは [LICENSE](https://github.com/akashic-games/tkoolmv-namagame-converter/blob/main/LICENSE) をご覧ください。

ただし、画像ファイルおよび音声ファイルは
[CC BY 2.1 JP](https://creativecommons.org/licenses/by/2.1/jp/) の元で公開されています。

本リポジトリが生成する exe ファイルは [ffmpeg.wasm][ffmpeg-wasm] を使用しています。
ffmpeg.wasm の元になっている [FFmpeg][ffmpeg] のライセンスはビルド方法によって異なります。
[このリポジトリで利用しているもの][ffmpeg-wasm-lgpl] は、LGPL ライセンスになるようにビルドオプションを選択しています。
LGPL については [LICENSE-LGPL][lgpl] を参照してください。

[ffmpeg]: https://ffmpeg.org/
[ffmpeg-wasm]: https://github.com/ffmpegwasm/ffmpeg.wasm
[ffmpeg-wasm-lgpl]: https://github.com/akashic-games/namagame-converter-ffmpeg.wasm
[lgpl]: https://github.com/akashic-games/tkoolmv-namagame-converter/blob/main/LICENSE-LGPL
