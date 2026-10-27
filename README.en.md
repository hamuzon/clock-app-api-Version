# Clock-App (API Version)

[日本語](README.md)

A simple online clock that displays the current time synchronized with a public time API.

## Live sites

- [now.hamusata.f5.si](https://now.hamusata.f5.si/)
- [now.hamuzon-jp.f5.si](https://now.hamuzon-jp.f5.si/)
- [GitHub Pages](https://hamuzon.github.io/clock-app-api-Version/)

## Time synchronization

The clock uses [public-api.siyukatu.com](https://public-api.siyukatu.com/) to synchronize the time.
For more information, see the [public time API article on Zenn](https://zenn.dev/siyukatu/articles/public-time-api).

1. The clock receives the server time every second over WebSocket and adjusts for network latency using a ping/pong exchange every 5 seconds.
2. If the WebSocket connection is unavailable, the clock fetches the time from the HTTP API every 5 seconds.
3. If both methods fail, the clock continues using the device's system time.

The synchronized time is calculated using `performance.timeOrigin + performance.now()` for smooth updates. The WebSocket reconnects if no response is received for 15 seconds.

## Connection status indicator

The indicator in the bottom-right corner shows the current connection status.

| Indicator | Status | Description |
| --- | --- | --- |
| Green | `online` | Connected via WebSocket |
| Blinking yellow | `connecting` | Connecting |
| Yellow | `fallback` | Fetching time from the HTTP API |
| Blinking red | `offline` | Not connected to the API; displaying the device's system time |

## License

[LICENSE](LICENSE)
