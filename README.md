# 贪吃蛇大战 Android 项目（进阶版）

## 本次升级
- 加入「加速冲刺」技能（3 秒）
- 加入「护盾」技能（抵挡一次撞墙/撞自己）
- 适配 Android WebView，可离线运行
- 保留 AI 对手、得分、最高纪录、暂停/重开、触屏方向键与滑动控制

## 生成 APK 的方法

### 方式一：Android Studio（电脑）
1. 安装 Android Studio。
2. 选择 **Open**，打开本文件夹 `SnakeBattle_Android_Project`。
3. 等待 Gradle Sync 完成。
4. 选择 **Build > Build Bundle(s) / APK(s) > Build APK(s)**。
5. APK 通常位于 `app/build/outputs/apk/debug/app-debug.apk`。

### 方式二：GitHub Actions 云端编译（不需要本地安装 Android Studio）
1. 在 GitHub 新建一个仓库，把本项目文件上传。
2. 打开仓库的 **Actions** 标签页。
3. 选择 **Build Snake Battle APK**，点击 **Run workflow**。
4. 工作流完成后打开运行记录，在 **Artifacts** 下载 `snake-battle-debug-apk`，解压后得到 `app-debug.apk`。

## 说明
当前交付的是 Android Studio 工程源码，不是已编译 APK。当前运行环境没有 Android SDK/Gradle，因此无法在这里直接产出并验证 APK。首次安装 APK 时，Android 可能提示允许安装未知来源应用，请只安装自己构建并信任的文件。
