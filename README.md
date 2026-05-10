# 📝 任务记事本 PWA

一个功能完整的手机端 PWA 记事本应用，支持分类、标签、提醒功能，采用暗黑酷炫风格。

## ✨ 功能特性

- **📋 任务管理** - 创建、编辑、删除任务
- **🏷️ 分类和标签** - 用分类和标签组织任务
- **⏰ 提醒功能** - 设置截止日期和提醒时间
- **🔍 搜索和筛选** - 快速查找任务
- **💾 本地存储** - 所有数据保存在本地，隐私安全
- **📱 PWA 应用** - 支持离线使用、添加到主屏幕
- **🎨 暗黑酷炫风格** - 深空黑背景 + 紫色渐变

## 🛠 技术栈

- **前端框架**: React 19 + TypeScript
- **样式**: Tailwind CSS 4
- **UI 组件**: shadcn/ui
- **图标**: Lucide React
- **通知**: Sonner
- **构建工具**: Vite + pnpm
- **PWA**: Manifest + Service Worker

## 🚀 快速开始

### 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 访问 http://localhost:5173
```

### 构建生产版本

```bash
pnpm build
pnpm preview
```

## 📦 项目结构

```
task-notes-pwa/
├── src/
│   ├── components/       # UI 组件
│   ├── pages/           # 页面组件
│   ├── lib/             # 工具函数和存储
│   ├── App.tsx          # 主应用
│   ├── main.tsx         # 入口
│   └── index.css        # 全局样式
├── public/              # 静态文件
├── vercel.json          # Vercel 配置
└── package.json         # 依赖
```

## 🎨 设计理念

采用 **暗色科技感** 设计风格：
- **色调**: 深空黑 (#0F0F13) + 紫色渐变 (#8B5CF6)
- **排版**: Space Grotesk（标题）+ Noto Sans SC（正文）
- **交互**: 触控优先，流畅动画，毛玻璃效果

## 💾 数据存储

所有数据都存储在浏览器的 localStorage 中：
- `tasks_v1` - 任务列表
- `categories_v1` - 分类
- `tags_v1` - 标签

数据完全私密，不会上传到服务器。

## 📱 PWA 特性

- **离线支持**: Service Worker 缓存核心资源
- **安装到主屏**: 支持 iOS 和 Android 添加到主屏幕
- **原生体验**: 全屏显示，隐藏浏览器 UI
- **快速加载**: 预缓存关键资源

## 🔔 提醒功能

设置截止日期和提醒时间后，任务会显示在"逾期"分类中（如果超过截止日期）。

**注意**: 浏览器通知需要用户手动启用。

## 🌐 部署

### Vercel 部署

```bash
# 推送到 GitHub
git push origin main

# 在 Vercel 中导入项目
# 自动部署完成！
```

## 🐛 已知问题

- 某些旧设备可能不支持 Service Worker
- 提醒功能需要浏览器支持通知 API

## 🚀 未来计划

- [ ] 云同步功能
- [ ] 任务重复设置
- [ ] 优先级排序
- [ ] 导出功能
- [ ] 深色/浅色主题切换

## 📄 许可证

MIT

## 👨‍💻 贡献

欢迎提交 Issue 和 Pull Request！

---

**Made with ❤️ by Task Notes PWA**
