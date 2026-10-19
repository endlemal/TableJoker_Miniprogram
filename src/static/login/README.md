# Login Ticket assets

Source: [Figma Ticket](https://www.figma.com/design/k1k6y8ANNJcFhLnMx7DMsx/mpprogram_UI-2.0?node-id=51-164), updated 2026-10-19.

The original SVG files retain their exported contents and intrinsic dimensions.
The component scales design pixels to `rpx` at a ratio of 2:1.

| File | Design layer | Intrinsic size |
| --- | --- | --- |
| `ticket-main.svg` | Main / Decoration | 340.656 × 360.55 |
| `ticket-logo.svg` | Header / Brand / Icon | 20 × 20 |
| `ticket-avatar.svg` | AvatarField / Placeholder | 56.4954 × 25.4147 |
| `ticket-location.svg` | CityField / Location | 13 × 13 |
| `ticket-stub.svg` | Stub / Decoration | 320 × 98 |
| `ticket-perforation.svg` | Stub / Perforation | 280 × 1 |

`login-ticket.vue` uses these as CSS backgrounds. The uni-app compiler embeds
the small SVGs in the WeChat stylesheet, avoiding local SVG image limitations.
See [uni-app static assets](https://uniapp.dcloud.net.cn/tutorial/page-static-assets).

Ticket fonts are generated separately by `tools/build_login_fonts.py` and
loaded by the component. The page owns profile data, validation and login;
the ticket emits native input events without changing their payloads.
