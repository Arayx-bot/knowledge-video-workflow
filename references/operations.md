# 独立包操作

包根含src/budget-cli.mjs，Node.js20+用于规划，Python3.10+和Pillow、FFmpeg、使用者自己有权使用的中文字体用于基础视频输出。有声分支还需macOS Tingting；其他平台只承诺静音路径，未实机验证。缺依赖说明官方来源、空间、网络和权限影响，由用户选择安装后复检；不自动调用云端。

`node src/budget-cli.mjs --help`只读参数，不创建文件。开始制作前显式指定--workspace；先核对input/script.md与input/renovation-scenes.json的口播完全一致。`--mock --plan-only --portable`只写工作区计划、字幕和时间表，仍不是严格只读；去掉--plan-only才渲染。--portable使用基础数据驱动排版，不含原私人装修镜头模板。number镜必须显式给metric与unit，不默认填旧案例数字。输入每镜含key/type/narration/headline/items/direction，type遵守video-plan.schema.json六类视觉。

工作区写work/、output/、public/audio/，可能覆盖已有结果；先说明范围，未知旧输出不得直接覆盖。音频与真实定稿保持private。不能承诺单段独立渲染或真实录音已对齐；静音预览只证明计划和画面，不是完整有声验收。实际成片需要用户审片，不自动发布。
