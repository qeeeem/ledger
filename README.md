# 账本

这是一个可安装到 iPhone 主屏幕的个人账本。应用没有账号、接口或服务端数据库；账单与资产数据写入当前浏览器的 IndexedDB，Excel 也在设备端生成。

## 本地运行

```bash
npm ci
npm run dev
```

## 构建与部署

```bash
npm run build
```

把 `dist/` 目录完整上传到静态网站的 `/ledger/` 路径即可。正式使用必须通过 HTTPS 访问，否则 iPhone 无法启用完整的离线 Web App 能力。服务器需要把未知路径回退到 `/ledger/index.html`。当前构建的公开地址基址是 `/ledger/`。

当前生产环境的手机入口是 `https://...:443/ledger/`。该入口使用 Let’s Encrypt 的短期 IP 证书，由 acme.sh 定时自动续期。`ledger.catudio.art` 保留为桌面备用入口；由于大陆节点的域名备案拦截，不作为手机主入口。

Nginx 示例：

```nginx
server {
    listen 443 ssl http2;
    server_name ledger.example.com;
    root /var/www/local-ledger;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location = /sw.js {
        add_header Cache-Control "no-cache";
    }
}
```

## 安装到 iPhone

1. 用 Safari 打开部署后的 HTTPS 地址。
2. 点“分享”→“添加到主屏幕”。
3. 打开“作为 Web App 打开”，再点“添加”。

## 数据与备份

- 数据仅存在添加该 Web App 的 iPhone/Safari 本地存储中，不会自动同步到其他设备。
- 清除 Safari 网站数据、卸载 Web App 或设备存储压力都可能导致数据丢失。
- 建议每月在“我的”页面导出一次 Excel，并保存到“文件”、iCloud Drive 或自己的服务器。
- 如果更换域名或从 HTTP 改成 HTTPS，浏览器会把它视为新的独立应用，原本地数据不会自动迁移；请先在旧应用导出 Excel，再到新应用的“我的”页面导入。
- 导入会合并数据：相同账单自动跳过，同名账户的类型与余额以导入文件为准。

## Excel 内容

导出的 `.xlsx` 包含：

- `账单明细`：日期、类型、分类、金额、账户、备注、创建时间。
- `资产账户`：账户名称、账户类型、当前余额。
- `账本设置`：独立的月度预算与年度预算、自定义分类及净资产快照。旧版本导出的两张表也可以正常导入。
