# Repository Guidelines

## 项目结构
- `app/`：Next.js App Router 页面；`app/api/` 提供聊天、上传、反馈与分享接口。
- `app/components/`：业务组件与基础组件；`app/styles/`：全局及 Markdown 样式。组件局部样式通常使用 `*.module.css`。
- `hooks/`、`service/`、`types/`、`utils/`：分别存放自定义 Hook、请求封装、共享类型与工具函数。
- `config/index.ts`：应用配置；`i18n/lang/`：多语言文案；`public/`：静态资源；`docs/`：工作流配置和示例知识库。

## 开发与检查命令
以下命令使用已有依赖；未经明确同意，不安装依赖或工具。
- `npm run dev`：启动本地服务，默认地址为 `http://localhost:3000`。
- `npm run build`：生成生产版本，会写入 `.next/`，仅在允许生成构建文件时执行。
- `npm run start`：启动已构建的生产服务。
- `node_modules/.bin/eslint .`：直接执行 ESLint 检查，不自动修复；项目也提供 `npm run lint`（`next lint`）。
- `node_modules/.bin/tsc --noEmit --incremental false`：检查类型，不生成编译文件或增量缓存。

生产构建配置跳过 ESLint 和类型错误检查，因此构建成功不能替代独立检查。`npm run fix` 和 `npm run eslint-fix` 会修改文件，使用前确认范围。

## 代码风格与组件约定
- 使用 TypeScript，遵循现有两空格缩进、单引号、无分号及 LF 换行风格；以 `.editorconfig` 和 `eslint.config.mjs` 为准。
- 文件与目录沿用周边命名，如 `use-conversation.ts`、`style.module.css`；组件使用 PascalCase，Hook 使用 `use` 前缀，根目录导入可使用 `@/`。
- 优先复用现有组件、请求封装及共享类型；组件禁止使用 `any`、内联样式和不稳定的列表 key。
- 关键逻辑添加简洁中文注释；异步操作处理加载、成功、失败及过期结果，及时清理监听、订阅和定时器。

## 验证要求
目前未配置自动化测试框架、测试脚本或覆盖率门槛。修改后执行相关 ESLint、类型检查，并手动验证涉及的聊天流式响应、附件上传、反馈或分享流程，包括失败和边界情况。新增测试时明确运行方式，再约定测试位置和命名，不擅自引入框架。

## 提交与 Pull Request
历史提交多为简短中文说明，部分使用 `add`、`update` 前缀；保持描述具体，例如 `update 修复附件上传失败提示`。PR 应说明变更目的、影响范围、关联 issue 和验证结果；界面修改附截图，未验证部分明确标注。

## 配置与修改边界
参考 `.env.example` 配置 `.env.local`；不得提交凭据、用户分享数据或在日志中输出敏感信息。`NEXT_PUBLIC_` 变量可能暴露到浏览器，不应存放需要保密的密钥。

保持最小改动，不覆盖已有未提交修改，不绕过权限、输入校验或异常处理。禁止修改锁文件、`dist/` 和框架生成文件（如 `.next/`、`next-env.d.ts`），也不得通过命令间接改写。沟通、新增文档及逻辑注释使用简体中文，标识符保留原样。
