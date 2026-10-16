# Knowledge Video 独立基础包

将用户定稿与配套分镜整理成9:16知识视频计划、字幕和可选的本地基础视频预览。公开版保留实际规划与校验代码，新增数据驱动基础renderer；原私人装修叙事模板、素材、稿件、原片及Remotion工程不在本包中，不声称画面与私人样片相同。

需要Node.js20+；只做静音计划不需npm依赖。渲染需要Python3.10+、Pillow、FFmpeg和用户自己安装且有权使用的字体（KNOWLEDGE_VIDEO_FONT指定）；有声分支仅macOS本机Tingting，缺项先说明安装来源及影响，用户选择安装后复检，不静默下载。macOS合成计划验证；其他平台与实际渲染尚未实机验收。

对能加载SKILL.md的AI说“使用knowledge-video，先检查定稿与分镜，在我指定的新工作区生成静音计划”。独立包从源码根运行：

```sh
python3 scripts/init_workspace.py --output NEW_USER_WORKSPACE
node src/budget-cli.mjs --workspace NEW_USER_WORKSPACE --mock --plan-only --portable
node src/budget-cli.mjs --workspace NEW_USER_WORKSPACE --mock --portable
node --test tests/test_portable.mjs
```

初始化器只创建全新用户工作目录，样例全新虚构，不代表用户经历或真实预算。真实使用以明确提供的稿件和分镜替换工作区input文件。保留完整原文，分镜narration合并必须一致。公开包number镜必须显式提供metric/unit，缺数据改用文字，不填估计或旧案例数值。

计划阶段输出video-plan.json、edit-plan.json、captions.srt和时间表；基础renderer输出visual-preview.mp4，为静音或临时本机语音预览，不是已和真实录音对齐的最终片。基础画面只读取本次headline/items/narration，不含私人CTA或项目经验。原my-skills本地工具保留旧renderer兼容，独立包只使用--portable路径。

输入和产物不写安装目录；已有结果覆盖前说明范围。备份、上传、付费、删除和线上改动按该次明确授权执行；本包不联网、不自动安装或公开媒体。候选许可MIT，正式公开前确认精确文件与产物。
