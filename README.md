# Zhouxian 博客界面示例

这是 [Zhouxian 个人网站](https://blog.zhouxian.xyz/) 的 Hugo 界面源码示例，包含页面模板、样式、交互脚本和少量演示文章。真实网站的文章、图片、草稿以及私有网页发布后台不在此仓库中；此仓库不与线上网站自动同步。

## 本地运行

安装 Hugo `0.167.0` 或更新的兼容版本，然后在仓库根目录运行：

```sh
hugo server -D
```

浏览器打开 `http://localhost:1313/`。正式构建运行 `hugo --minify`，静态文件生成到 `public/`。部署到自己的域名之前，修改 `hugo.toml` 中的 `baseURL` 和站点信息。

示例文章位于 `content/posts/`；新增文章时，可在 front matter 中设置 `column` 以归入相应专栏。公开仓库中的示例文章仅用于展示界面。

## 授权与来源

- 本仓库的原创网站代码采用 [MIT License](LICENSE)。
- `content/` 中的示例文字采用 [CC BY 4.0](LICENSE-CONTENT.md)。
- 部分交互效果基于 React Bits 改写，遵循其独立的 MIT + Commons Clause 条款，见 [第三方说明](THIRD_PARTY_NOTICES.md) 和 [许可原文](static/licenses/React-Bits-LICENSE.txt)。这些部分不适用本仓库的 MIT 授权。
