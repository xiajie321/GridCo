# 如何将本项目部署到 GitHub Pages

这个指南将帮助你将当前的算法教学网站部署到 GitHub，让所有人都能访问。

## 准备工作

1.  你需要一个 [GitHub](https://github.com/) 账号。
2.  你的电脑上需要安装 [Git](https://git-scm.com/downloads)。

## 步骤 1：在 GitHub 上创建新仓库

1.  登录 GitHub。
2.  点击右上角的 **+** 号，选择 **New repository**（新建仓库）。
3.  **Repository name**（仓库名称）：输入 `algorithm-tutorials`（或者你喜欢的名字）。
4.  **Public/Private**：保持默认的 **Public**（公开）。
5.  勾选 **Add a README file**（这会初始化仓库，方便后续操作）。
6.  点击 **Create repository**（创建仓库）。

## 步骤 2：初始化本地项目

打开你的项目文件夹 `C:\Users\31139\Desktop\BoKeProject\GridCo`，在空白处右键点击并选择 **Open Git Bash here**（或者在终端中进入该目录）。

依次执行以下命令：

```bash
# 1. 初始化 Git 仓库
git init

# 2. 将所有文件添加到暂存区
git add .

# 3. 提交更改
git commit -m "Initial commit: Algorithm tutorials website"

# 4. 将本地仓库关联到远程 GitHub 仓库
# 注意：将下面的 URL 替换为你刚才创建的仓库地址
# 格式通常是：https://github.com/你的用户名/仓库名.git
git remote add origin https://github.com/YOUR_USERNAME/algorithm-tutorials.git

# 5. 推送代码到 GitHub
# 如果是第一次推送，可能需要输入 GitHub 账号密码或 Token
git branch -M main
git push -u origin main
```

*(如果提示 `remote origin already exists`，说明你之前已经关联过，可以忽略第4步，或者用 `git remote set-url origin 新地址` 修改)*

## 步骤 3：开启 GitHub Pages

1.  回到你在 GitHub 上的仓库页面。
2.  点击顶部的 **Settings**（设置）选项卡。
3.  在左侧菜单栏向下滚动，找到 **Pages**（页面）选项。
4.  在 **Build and deployment** > **Source** 下，保持选择 **Deploy from a branch**。
5.  在 **Branch** 下，选择 **main** 分支，文件夹选择 **/(root)**。
6.  点击 **Save**（保存）。

## 步骤 4：访问你的网站

稍等几分钟（通常 1-2 分钟），刷新 Pages 设置页面。顶部会出现一个链接：

> **Your site is live at:** `https://你的用户名.github.io/algorithm-tutorials/`

点击该链接，你就能看到你的网站了！

**注意**：由于我们的主页在 `Main/index.html`，而 GitHub Pages 默认打开根目录的 `index.html`（如果有的话）。
如果你的根目录下没有 `index.html`，你可能需要手动在 URL 后面加上 `/Main/index.html` 才能访问主页。

**推荐优化**：
为了让用户直接访问根 URL 就能看到主页，建议将 `Main` 文件夹里的内容移动到根目录，或者在根目录创建一个跳转用的 `index.html`：

```html
<!-- 根目录下的 index.html -->
<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="refresh" content="0; url=./Main/index.html" />
</head>
<body>
</body>
</html>
```

---

## 常见问题

- **图片/样式不显示？**
  请检查代码中的路径是否使用了绝对路径（如 `/Root/...`）。在 GitHub Pages 上，路径通常是相对仓库名的。建议始终使用相对路径（如 `../Root/...`）。我们的项目已经是相对路径了，应该没问题。

- **更新了代码怎么办？**
  在本地修改后，执行：
  ```bash
  git add .
  git commit -m "Update content"
  git push
  ```
  GitHub Pages 会自动重新构建并更新。
