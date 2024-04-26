<template>
  <div class="usage">
    <h1>RPGツクールMVの配布用ファイルを生成する</h1>

    <p>
      <a href="https://akashic-games.github.io/shin-ichiba/tkool-mv/exchange-to-nicolive-game">
        ニコ生ゲームへの変換手順
      </a>
      を参照して、RPG ツクールMV でゲームを作成してください。<br />
      その後、次の手順で配布用ファイル一式を含むフォルダを生成します:
    </p>

    <ol>
      <li>ツクールMVの「ファイル」メニューの「デプロイメント」を選択</li>
      <li>プラットフォームを「ウェブブラウザ」、オプションの「未使用ファイルを含まない」を選択</li>
      <li>出力先を選んで「OK」ボタンを押す</li>
    </ol>

    <p class="center">
      <img src="../assets/deploy-tkoolgame.png" alt="ツクールMVゲームデプロイ" />
    </p>

    <h1>ニコ生ゲームに変換する</h1>

    <p>
      出力されたフォルダをこのアプリの「ホーム」タブのドロップ領域にドラッグ＆ドロップします。<br />
      完了後、画面内で変換された状態のテストプレイを行えます。 「ダウンロード」ボタンで変換結果の
      .zip ファイルを保存します。 「RPGツクールMVプラグインを含めて変換する」にチェックを入れると、
      <a
        href="https://akashic-games.github.io/shin-ichiba/tkool-mv/specification.html#limitations"
        target="_blank"
        >非サポートプラグイン</a
      >も
      ニコ生ゲーム上で動くように変換処理が行われます(ただし、プラグインが正常に動作しないこともあります。その場合はチェックを外して再度変換処理を行ってください)。
    </p>

    <h1>投稿する</h1>
    保存した .zip ファイルはそのままにニコ生ゲームとして投稿できます。 詳細は
    <a href="https://akashic-games.github.io/shin-ichiba/submit.html"> ニコ生ゲームを投稿しよう </a>
    を参照してください。
  </div>
</template>

<style scoped>
.usage {
  padding: 2rem;
  overflow-y: auto;
  > .center {
    margin: 1rem;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  > h1 {
    font-size: 1.4rem;
    margin: 3rem 0 1rem 0;

    &:first-child {
      margin-top: 0;
    }
  }

  > p {
    margin: 1rem 0;
  }

  > ol {
    margin: 1rem 0;
  }
}
</style>
