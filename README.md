# 🫧 珍珠湾 DM · v2.0

Instagram 私信风格，daddy 和小珍珠的专属对话界面。

## 安装

把四个文件上传到 GitHub 仓库根目录：
```
manifest.json
index.js
style.css
README.md
```
在酒馆「扩展 → 从 URL 安装」粘贴仓库地址即可。

## 功能

- **对话气泡**：蓝色（daddy 发送，右侧）/ 白色（小珍珠，左侧）
- **切换身份**：点左下角 emoji 按钮切换你在以哪个身份说话
- **AI daddy 回复**：点 ✨ 按钮，daddy 会通过 API 自动回一句
- **资料卡**：点头像/名字/简介可直接编辑，保存在本地
- **设置**：⚙ 按钮填写中转 API 地址和 Key
- **删除消息**：双击气泡删除
- 所有数据存在本地 localStorage

## API 设置

打开插件 → 右上角 ⚙ → 填写：
- **API 地址**：你的中转站地址，如 `https://xxx.com`（会自动拼接 `/v1/messages`）
- **API Key**：你的 key
