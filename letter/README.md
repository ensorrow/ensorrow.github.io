# /letter

静态滚动叙事页，无构建步骤，可直接部署到 GitHub Pages。

## 结构

- `index.html`：六段画面与五章文字结构（第四章之后包含《白头发》间奏）
- `css/style.css`：桌面 / 手机竖屏布局、转场和无障碍降级
- `js/main.js`：Scrollama 场景切换、视频生命周期、双音乐互斥播放与进度控制
- `js/scrollama.min.js`：本地托管的 Scrollama 3.2.0
- `assets/video/`：去除原音轨并启用 fast-start 的网页视频
- `assets/audio/heartwarming.mp3`：96 kbps 背景音乐
- `assets/audio/days-ahead-suno.mp3`：128 kbps Suno 歌曲《往后的日子》
- `assets/images/`：视频首帧、歌曲封面，占位与减少动态效果时使用

## 本地预览

在本目录运行：

```bash
python3 -m http.server 4173
```

然后打开 `http://127.0.0.1:4173/`。

现代浏览器要求用户交互后才能播放声音，因此音乐会在点击“开启音乐，开始阅读”后播放，也可用右上角按钮随时暂停。
