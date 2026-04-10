# oh-my-auggie

<!-- Banner -->
<p align="center">
  <img src="assets/oma-banner.png" alt="oh-my-auggie afişi" width="100%"/>
</p>

<!-- Badges -->
<p align="center">

  [![Sponsor](https://img.shields.io/static/v1?label=Sponsor&message=r3dlex&logo=GitHub%20Sponsors&color=success)](https://github.com/sponsors/r3dlex)
  [![Sürüm](https://img.shields.io/badge/version-0.2-blue)](https://github.com/r3dlex/oh-my-auggie)
  [![auggie](https://img.shields.io/badge/auggie-%3E%3D%200.22.0-green)](https://www.augmentcode.com)
  [![Lisans](https://img.shields.io/badge/license-Apache%202.0-orange)](LICENSE)

</p>

> **Augment Code'un `auggie` CLI'si icin coklu-agent orkestrasyonu** — auggie icin "oh-my-*" deneyimi.

---

## Kurulum

### On Sartlar

- `auggie` >= 0.22.0 — [kurulum dokumanlari](https://www.augmentcode.com)
- `node` >= 18 (MCP durum sunucusu icin)

### Market Place Kurulumu (tavsiye edilir)

```bash
auggie plugin marketplace add r3dlex/oh-my-auggie
auggie plugin install oma@oh-my-auggie
```

Bu kadar. Plugin, tum komutlari, agent'lari, hook'lari ve MCP durum sunucusunu otomatik olarak kaydeder.

### Manuel Kurulum

```bash
git clone https://github.com/r3dlex/oh-my-auggie.git
cd oh-my-auggie
auggie plugin install --source ./plugins/oma oma@oh-my-auggie
```

<p align="center">
  <img src="assets/buddy-dark.png" alt="OMA - Dark Theme" width="300" style="border-radius:12px;"/>
</p>

<p align="center">
  <em>OMA — your multi-agent co-pilot, dark mode edition</em>
</p>

---

## Komutlar

Kurulduktan sonra, bu eğik cizgili komutlar kullanilabilir:

| Komut | Aciklama |
|---------|-------------|
| `/oma:autopilot` | Tam otonom boru hatti — genislet, planla, uygula, QA, dogrula |
| `/oma:ralph` | Kalicilik dongusu — tum kabul kriterleri gecene kadar calismaya devam eder |
| `/oma:ultrawork` | Eszamanli alt-agent'lar araciligiyla yuksek isletim paralelligi |
| `/oma:team` | N agent'dan olusan koor dinli ekip |
| `/oma:ultraqa` | QA dongusu: test et, dogrula, duzelt, tekrarla |
| `/oma:ralplan` | Mimari + Critic incelemesiyle fikir birligi planlamasi |
| `/oma:plan` | Analist/mimari incelemeli stratejik planlama |
| `/oma:cancel` | Aktif modu iptal et ve durumu temizle |
| `/oma:status` | Mevcut modu ve durumu goster |
| `/oma:ask <model>` | Belirli bir model ile sorgula |
| `/oma:note` | Not defterine yaz (oncelikli, calisma, manuel) |
| `/oma:doctor` | Kurulum sorunlarini teshis et |

### Anahtar Kelime Tetikleyicileri

`/oma:` on ekini birakın — bunlar konusmada tespit edildiginde otomatik olarak aktive olur:

| Anahtar Kelime | Aktive Eden |
|---------|-----------|
| `autopilot` | `/oma:autopilot` |
| `ralph`, "don't stop" | `/oma:ralph` |
| `ulw`, `ultrawork` | `/oma:ultrawork` |
| `ralplan` | `/oma:ralplan` |
| `canceloma` | `/oma:cancel` |
| `deslop`, "anti-slop" | deslop temizlik pass'i |

<p align="center">
  <img src="assets/buddy-galaxy-dark.png" alt="OMA - Galaxy Theme" width="300" style="border-radius:12px;"/>
</p>

<p align="center">
  <em>OMA — galaxy-themed, ready for any workflow</em>
</p>

---

## Mimari

```
oh-my-auggie/
├── plugins/oma/
│   ├── agents/          # 4 alt-agent (v0.1): explorer, planner, executor, architect
│   ├── commands/        # 5 komut (v0.1): autopilot, ralph, status, cancel, help
│   ├── hooks/           # 3 hook: session-start, delegation-enforce, stop-gate
│   ├── rules/           # orchestration.md, enterprise.md (ekleyici)
│   └── mcp/
│       └── state-server.mjs   # Sifir bagimlilikli MCP durum sunucusu
├── .augment-plugin/
│   └── marketplace.json  # Auggie market place manifesti
└── e2e/
    └── oma-core-loop.bats   # 34 entegrasyon testi
```

**Durum dosyalari** (`.oma/` icinde saklanir — git-ignored):

| Dosya | Amac |
|------|---------|
| `.oma/state.json` | mod, aktif, iterasyon |
| `.oma/notepad.json` | oncelikli, calisma, manuel bolumler |
| `.oma/task.log.json` | mimari/executor karar gecmisi |

---

## Profiller

| Profil | Aciklama |
|---------|-----------|
| **Community** (varsayilan) | Tam paralellestirme, onay kapisi yok |
| **Enterprise** | Maliyet-bilincli model yonlendirmesi, ADR gereksinimleri, onay kapilari |

Enterprise, `.oma/config.json` dosyasini `{ "profile": "enterprise" }` ile olusturarak aktive edilir. Enterprise sadece kurallari *ekler* — Community ozelliklerini asla kaldirmaz.

---

## Gelistirme

```bash
# Test suite'ini calistir
bats e2e/oma-core-loop.bats

# Hook script'lerini lint et
shellcheck plugins/oma/hooks/*.sh

# Tum manifestleri dogrula
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

## Güvenlik

Lütfen desteklenen sürümler ve güvenlik açığı bildirimi yönergeleri için [Güvenlik Politikamızı](SECURITY.md) inceleyin.

---

## Linkler

| Kaynak | URL |
|----------|-----|
| Augment Code | https://www.augmentcode.com |
| auggie CLI dokumanlari | https://www.augmentcode.com/docs/cli |
| Plugin dokumanlari | https://www.augmentcode.com/docs/cli/plugins |
| Hooks dokumanlari | https://www.augmentcode.com/docs/cli/hooks |
| MCP dokumanlari | https://www.augmentcode.com/docs/cli/integrations |
| Güvenlik | https://github.com/r3dlex/oh-my-auggie/blob/main/SECURITY.md |
| oh-my-auggie | https://github.com/r3dlex/oh-my-auggie |

---

## Sponsor

**:heart: oh-my-auggie'yi seviyor musunuz? Gelistirmesini sponsor etmeyi dusunun.**

Sponsorlugunuz, coklu-agent orkestrasyonunu Augment Code platformundaki her gelistiriciye erisilebilir kilmak icin harcanan zamanı ve enerjiyi dogrudan fonlamaktadir. Buyuklugu ne olursa olsun her katki — projeyi canli, duyarli ve gelisen tutmaya yardimci olur.

👉 **[GitHub uzerinde Sponsor Ol](https://github.com/sponsors/r3dlex)**

Tek seferlik ve yinelenen secenekler mevcuttur. Sponsorlar, proje README'sinde ve surum notlarinda taninir.

---

*oh-my-auggie, Augment Code ile baglantili degildir. "auggie" ve "Augment Code", ilgili sahiplerinin ticari markalaridir.*
