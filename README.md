# Clock-App (API Version)

[English](README.en.md)

公開時刻同期 API を使って時刻を補正して表示する、シンプルなオンライン時計です。

## 公開サイト

- [now.hamusata.f5.si](https://now.hamusata.f5.si/)
- [now.hamuzon-jp.f5.si](https://now.hamuzon-jp.f5.si/)
- [GitHub Pages](https://hamuzon.github.io/clock-app-api-Version/)

## 時刻の同期について

時刻の取得には [public-api.siyukatu.com](https://public-api.siyukatu.com/) を利用します。
API の詳しい解説は [public time API の解説記事（Zenn）](https://zenn.dev/siyukatu/articles/public-time-api) をご覧ください。

1. WebSocket で毎秒サーバー時刻を受信し、5 秒ごとの ping / pong で通信遅延を測定して時刻を補正します。
2. WebSocket に接続できない場合は、HTTP API から 5 秒ごとに時刻を取得します。
3. どちらの方法でも取得できない場合は、端末の時計で表示を続けます。

補正した時刻は `performance.timeOrigin + performance.now()` を基準に計算するため、滑らかに進みます。WebSocket から 15 秒以上応答がない場合は再接続します。

## 通信状態ランプ

画面右下のランプで、接続状態を確認できます。

| 表示 | 状態 | 説明 |
| --- | --- | --- |
| 緑 | `online` | WebSocket で接続中 |
| 黄（点滅） | `connecting` | 接続処理中 |
| 黄 | `fallback` | HTTP API で時刻を取得中 |
| 赤（点滅） | `offline` | API に未接続。端末の時計で表示中 |

## ライセンス

[LICENSE](LICENSE)
