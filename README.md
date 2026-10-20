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


## 横屏操控版
- 游戏强制横屏并启用沉浸式全屏，隐藏系统状态栏和导航栏。
- 横屏左下角为虚拟摇杆，拖动控制方向；右侧为冲刺、护盾技能，旁边有暂停与重开。
- 竖屏下保留原有页面布局与触控按钮。


## 主菜单、存档与随机道具版
- 首次进入横屏显示主菜单：开始游戏、保留存档/继续游戏、退出游戏。
- 游戏右上角设置按钮打开暂停菜单：继续游戏、存档、退出到主菜单。
- 存档保存在应用 WebView 的 localStorage 中，包含蛇的位置、分数、道具和难度等状态。
- 游戏内“刷新道具”按钮可重新生成随机普通/金色/冰晶/星核道具。
- 嵌入式网页不能强制关闭 Android 宿主应用；退出游戏按钮回到主菜单。
