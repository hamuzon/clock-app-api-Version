# Clock-App (API Version)

公開時刻同期API [public-api.siyukatu.com](https://public-api.siyukatu.com/) で時刻を補正して表示する、シンプルなオンライン時計です。

**公開サイト:** [https://hamuzon.github.io/clock-app-api-Version/](https://hamuzon.github.io/clock-app-api-Version/)

右下の小さなランプだけで通信状態を表示します。

## 通信状態ランプ

| 色 | 状態 | 意味 |
| --- | --- | --- |
| 緑 | `online` | WebSocket で接続中（通常） |
| 黄（点滅） | `connecting` | 接続処理中 |
| 黄 | `fallback` | WebSocket は未接続だが HTTP で時刻同期中 |
| 赤（点滅） | `offline` | 未接続（端末の時計で表示） |

## 時刻の取得方法

1. **WebSocket**（優先）
   `wss://public-api.siyukatu.com/time/socket?interval=1000`
   - `time` イベントで毎秒サーバー時刻を受信
   - 5秒ごとに `ping` / `pong` で往復遅延を計測し、ずれを補正
   - 15秒以上応答がない場合は接続を切り直し
2. **HTTP**（フォールバック）
   `https://public-api.siyukatu.com/time.json`
   - WebSocket 未接続の間、5秒ごとに取得
3. どちらも失敗した場合は端末の時計で表示を継続

補正値は `performance.timeOrigin + performance.now()` を基準に保持するため、表示は滑らかに進みます。

## ファイル構成

- `index.html` - 画面
- `style.css` - スタイル（ランプの色・位置）
- `script.js` - 時刻同期・再接続・状態ランプ
- `404.html` - 404ページ
- `icon.svg` / `favicon.ico` など - アイコン

## TIME API について

[public time API の解説記事（Zenn）](https://zenn.dev/siyukatu/articles/public-time-api)

## 免責

時刻APIは外部サービスです。停止・仕様変更により正しく表示されない場合があります。

## ライセンス

[LICENSE](LICENSE)

---

*README 作成 By AI*
*README Created By AI*
