# oh-my-auggie

<!-- Banner -->
<p align="center">
  <img src="assets/oma-banner.png" alt="biểu ngữ oh-my-auggie" width="100%"/>
</p>

<!-- Badges -->
<p align="center">

  [![Sponsor](https://img.shields.io/static/v1?label=Sponsor&message=r3dlex&logo=GitHub%20Sponsors&color=success)](https://github.com/sponsors/r3dlex)
  [![Phiên bản](https://img.shields.io/badge/version-0.2-blue)](https://github.com/r3dlex/oh-my-auggie)
  [![auggie](https://img.shields.io/badge/auggie-%3E%3D%200.22.0-green)](https://www.augmentcode.com)
  [![Giấy phép](https://img.shields.io/badge/license-Apache%202.0-orange)](LICENSE)

</p>

> **Điều phối đa tác tử cho [CLI `auggie` của Augment Code](https://www.augmentcode.com)** — trải nghiệm "oh-my-*" cho auggie.

---

## Cài đặt

### Yêu cầu tiên quyết

- `auggie` >= 0.22.0 — [tài liệu cài đặt](https://www.augmentcode.com)
- `node` >= 18 (cho máy chủ trạng thái MCP)

### Cài đặt qua Marketplace (khuyến nghị)

```bash
auggie plugin marketplace add r3dlex/oh-my-auggie
auggie plugin install oma@oh-my-auggie
```
Then initialize OMA in your project:

```
/oma:setup
```

Optionally configure MCP servers (adds state persistence and advanced tooling):

```
/oma:mcp-setup
```

Xong. Plugin sẽ tự động đăng ký tất cả các lệnh, tác tử, hook và máy chủ trạng thái MCP.

### Cài đặt thủ công

```bash
git clone https://github.com/r3dlex/oh-my-auggie.git
cd oh-my-auggie
auggie plugin install --source ./plugins/oma oma@oh-my-auggie
```
Then initialize OMA in your project:

```
/oma:setup
```

Optionally configure MCP servers (adds state persistence and advanced tooling):

```
/oma:mcp-setup
```

<p align="center">
  <img src="assets/buddy-dark.png" alt="OMA - Dark Theme" width="300" style="border-radius:12px;"/>
</p>

<p align="center">
  <em>OMA — installed and ready. What do you want to build?</em>
</p>

---

## Các lệnh

Sau khi cài đặt, các lệnh slash này sẽ khả dụng:

| Lệnh | Mô tả |
|------|-------|
| `/oma:autopilot` | Pipeline tự động hoàn toàn — mở rộng, lập kế hoạch, triển khai, QA, xác thực |
| `/oma:ralph` | Vòng lặp kiên trì — tiếp tục làm việc cho đến khi tất cả tiêu chí chấp nhận đạt |
| `/oma:ultrawork` | Thực thi song song cao thông lượng qua các tác tử con đồng thời |
| `/oma:team` | Đội ngũ phối hợp gồm N tác tử |
| `/oma:ultraqa` | Vòng lặp QA: kiểm tra, xác minh, sửa, lặp lại |
| `/oma:ralplan` | Lập kế hoạch đồng thuận với đánh giá từ Architect + Critic |
| `/oma:plan` | Lập kế hoạch chiến lược với đánh giá từ analyst/architect |
| `/oma:cancel` | Hủy chế độ đang hoạt động và xóa trạng thái |
| `/oma:status` | Hiển thị chế độ và trạng thái hiện tại |
| `/oma:ask <model>` | Truy vấn với một model cụ thể |
| `/oma:note` | Ghi vào notepad (priority, working, manual) |
| `/oma:doctor` | Chẩn đoán các vấn đề cài đặt |

### Kích hoạt bằng từ khóa

Bỏ qua tiền tố `/oma:` — các lệnh này sẽ tự động kích hoạt khi được phát hiện trong cuộc trò chuyện:

| Từ khóa | Kích hoạt |
|---------|-----------|
| `autopilot` | `/oma:autopilot` |
| `ralph`, "don't stop" | `/oma:ralph` |
| `ulw`, `ultrawork` | `/oma:ultrawork` |
| `ralplan` | `/oma:ralplan` |
| `canceloma` | `/oma:cancel` |
| `deslop`, "anti-slop" | deslop cleanup pass |

<p align="center">
  <img src="assets/buddy-galaxy-dark.png" alt="OMA - Galaxy Theme" width="300" style="border-radius:12px;"/>
</p>

<p align="center">
  <em>OMA — parallel agents, persistent state, zero dependency overhead</em>
</p>

---

## Kiến trúc

```
oh-my-auggie/
├── plugins/oma/
│   ├── agents/          # 4 tác tử con (v0.1): explorer, planner, executor, architect
│   ├── commands/        # 5 lệnh (v0.1): autopilot, ralph, status, cancel, help
│   ├── hooks/           # 3 hook: session-start, delegation-enforce, stop-gate
│   ├── rules/           # orchestration.md, enterprise.md (cộng thêm)
│   └── mcp/
│       └── state-server.mjs   # Máy chủ trạng thái MCP không phụ thuộc
├── .augment-plugin/
│   └── marketplace.json  # Manifest marketplace của Auggie
└── e2e/
    └── oma-core-loop.bats   # 34 bài kiểm tra tích hợp
```

**Các tệp trạng thái** (lưu trong `.oma/` — được git bỏ qua):

| Tệp | Mục đích |
|-----|----------|
| `.oma/state.json` | mode, active, iteration |
| `.oma/notepad.json` | các phần priority, working, manual |
| `.oma/task.log.json` | lịch sử kết quả architect/executor |

---

## Hồ sơ

| Hồ sơ | Mô tả |
|-------|-------|
| **Community** (mặc định) | Song song hóa đầy đủ, không có cổng phê duyệt |
| **Enterprise** | Định tuyến model nhận biết chi phí, yêu cầu ADR, cổng phê duyệt |

Enterprise được kích hoạt bằng cách tạo `.oma/config.json` với `{ "profile": "enterprise" }`. Enterprise chỉ *thêm* các quy tắc — nó không bao giờ loại bỏ các tính năng của community.

---

## Phát triển

```bash
# Chạy bộ kiểm tra
bats e2e/oma-core-loop.bats

# Kiểm tra hook scripts
shellcheck plugins/oma/hooks/*.sh

# Xác thực tất cả manifest
node -e "
  const fs = require('fs');
  const files = [
    '.augment-plugin/marketplace.json',
    'plugins/oma/.augment-plugin/plugin.json',
    'plugins/oma/.augment-plugin/.mcp.json',
    'plugins/oma/hooks/hooks.json',
    '.claude-plugin/plugin.json'
  ];
  for (const f of files) {
    try { JSON.parse(fs.readFileSync(f)); console.log('OK: ' + f); }
    catch(e) { console.error('FAIL: ' + f + ' - ' + e.message); process.exit(1); }
  }
"
```

---

## Bảo mật

Vui lòng xem lại [Chính sách Bảo mật](SECURITY.md) của chúng tôi để biết các phiên bản được hỗ trợ và hướng dẫn báo cáo lỗ hổng bảo mật.

---

## Liên kết

| Tài nguyên | URL |
|------------|-----|
| Augment Code | https://www.augmentcode.com |
| Tài liệu auggie CLI | https://www.augmentcode.com/docs/cli |
| Tài liệu Plugin | https://www.augmentcode.com/docs/cli/plugins |
| Tài liệu Hooks | https://www.augmentcode.com/docs/cli/hooks |
| Tài liệu MCP | https://www.augmentcode.com/docs/cli/integrations |
| Bảo mật | https://github.com/r3dlex/oh-my-auggie/blob/main/SECURITY.md |
| oh-my-auggie | https://github.com/r3dlex/oh-my-auggie |

---

## Sponsor

**:heart: Yêu thích oh-my-auggie? Hãy cân nhắc tài trợ cho sự phát triển của nó.**

Tài trợ của bạn trực tiếp tài trợ thời gian và năng lượng được đổ vào việc làm cho điều phối đa tác tử trở nên dễ tiếp cận với mọi nhà phát triển trên nền tảng Augment Code. Mọi đóng góp — không phân biệt quy mô — đều giúp dự án duy trì hoạt động, phản hồi nhanh và không ngừng cải thiện.

👉 **[Sponsor trên GitHub](https://github.com/sponsors/r3dlex)**

Có sẵn các tùy chọn một lần và định kỳ. Các nhà tài trợ sẽ được ghi nhận trong README và ghi chú phát hành của dự án.

---

*oh-my-auggie không liên kết với Augment Code. "auggie" và "Augment Code" là nhãn hiệu của các chủ sở hữu tương ứng.*
