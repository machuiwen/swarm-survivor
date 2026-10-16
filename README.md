# Neon Hive Survivors 霓虹虫巢幸存者

A neon survivor-style browser game. You only move: your weapons fire on their own. Survive 15 minutes of the bug swarm and defeat the final boss, the Void Lord.

**Play online: https://machuiwen.github.io/swarm-survivor/**

Works on desktop, iPad and phones, in landscape or portrait. The game is in English and Chinese. It shows Chinese when your browser language is Chinese; switch any time with the language button on the main menu.

## Controls

| | Keyboard | Touch |
| --- | --- | --- |
| Move | WASD or arrow keys | Touch and drag anywhere (floating stick) |
| Pick an upgrade | 1 / 2 / 3, R to reroll | Tap a card |
| Pause | P or Esc | Pause button, top right |
| Sound on/off | M | Speaker button, top right |

## How to play

- Enemies drop XP gems. Level up and pick one of three: a new weapon, a weapon upgrade, or an item.
- 8 weapons and 12 items. Carry up to 6 of each.
- **Evolution**: get a weapon to max level (6) and own its matching item, then open a chest to evolve it. The upgrade card tells you which item you need.
- Elites (gold ring) and bosses drop chests. Bosses come at 5:00 and 10:00; the final boss arrives at 14:00.
- Pickups: hearts (heal), magnets (pull in every gem), skulls (clear the screen), coins.
- Spend coins in Upgrades for permanent boosts, and unlock new heroes under Heroes. Achievements also give coins.

## Tips

- Keep moving. Circle the swarm to bunch it up, then mow it down.
- Level your starting weapon first. The early game gets much easier.
- Grab a Gravity Core early so gems come to you.
- Follow the gold arrows at the screen edge to chests. A chest may evolve a weapon.
- Boomers explode when they die and hurt nearby enemies. Don't let one blow up next to you.
- Revival in the shop is expensive, but it can save a run.

## Notes

- Plain static site, no build step. All art and sound are generated in code. The Orbitron font is bundled in `fonts/` (SIL Open Font License, see `fonts/OFL.txt`).
- Progress is saved in the browser (localStorage). Clearing site data wipes it. On CrazyGames it is saved through the CrazyGames SDK instead.
- On iPhone / iPad the silent switch mutes the game. If there is no sound, check it and the speaker button.

## CrazyGames build

`tools/build-crazygames.sh` makes `dist/neon-hive-survivors-crazygames.zip` with `index.html` at the zip root. The game uses the CrazyGames HTML5 SDK v3 (`js/platform.js`) for loading and gameplay events and for saving. It shows no ads. Outside CrazyGames the SDK is skipped.

---

## 中文说明

霓虹风格的割草生存游戏。你只管走位，武器会自动开火。在 15 分钟的虫潮里活下来，打败最终首领「虚空之主」。

电脑、iPad、手机都能玩，横屏竖屏都可以。浏览器语言是中文时自动显示中文，主菜单的语言按钮可以随时切换。

### 操作

| | 键盘 | 触屏 |
| --- | --- | --- |
| 移动 | WASD 或方向键 | 按住屏幕任意位置拖动（浮动摇杆） |
| 选择升级 | 数字键 1 / 2 / 3，R 刷新 | 直接点卡片 |
| 暂停 | P 或 Esc | 右上角暂停按钮 |
| 声音开关 | M | 右上角喇叭按钮 |

### 玩法

- 击杀敌人掉落经验宝石，捡起来升级。每次升级三选一：新武器、武器升级或被动道具。
- 共 8 种武器、12 种道具。最多带 6 件武器和 6 件道具。
- **进化**：武器升到满级（6 级），再拥有对应的道具，打开宝箱时就会进化成超级形态。升级卡片上会提示需要哪个道具。
- 精英怪（金色光圈）和首领会掉宝箱。5:00 和 10:00 有首领，14:00 最终首领登场。
- 地上还会掉落：爱心（回血）、磁铁（吸走全屏宝石）、骷髅（清屏）、金币。
- 金币可以在「强化商店」买永久强化，在「角色」里解锁新角色。完成成就会奖励金币。

### 小技巧

- 别停下来。绕着敌群转圈走，把它们聚成一团再收割。
- 前期优先升级初始武器，开局会轻松很多。
- 早点拿一个「引力核」，捡宝石省心很多。
- 看到宝箱指示箭头（屏幕边缘的金色箭头）就去捡，可能直接进化。
- 爆破虫被打死会爆炸，能炸到周围的敌人，但别让它贴着你自爆。
- 商店里的「复活」很贵，但能救命。

### 说明

- 纯静态网页，没有构建步骤。所有画面和音效都由代码实时生成。
- 存档保存在浏览器本地（localStorage）。清除网站数据会清空进度。
- iPhone / iPad 上，声音受静音开关影响。没声音的话请检查静音开关和右上角喇叭按钮。
