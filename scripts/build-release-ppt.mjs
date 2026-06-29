import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(projectRoot, '..')
const artifactEntrypoint = 'C:/Users/16914/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs'

const { Presentation, PresentationFile } = await import(pathToFileURL(artifactEntrypoint).href)

const PPT_PATH = path.join(repoRoot, '交付文档', '汽车AI视频产品发布会_用户版优化.pptx')
const SCREENSHOT_DIR = path.join(projectRoot, 'public', 'tutorial', 'screenshots')
const SLIDE = { width: 1280, height: 720 }

const colors = {
  navy: '#0f172a',
  ink: '#111827',
  muted: '#64748b',
  soft: '#f6f8fc',
  line: '#dbe5f4',
  blue: '#2563eb',
  blueSoft: '#eff6ff',
  green: '#0f766e',
  tealSoft: '#ecfeff',
  purple: '#7c3aed',
  orange: '#f59e0b',
  white: '#ffffff',
}

function screenshot(name) {
  return path.join(SCREENSHOT_DIR, name)
}

async function imageBytes(name) {
  return await fs.readFile(screenshot(name))
}

function addShape(slide, position, fill, line = colors.line, geometry = 'roundRect') {
  return slide.shapes.add({
    geometry,
    position,
    fill,
    line: { style: 'solid', fill: line, width: line === 'none' ? 0 : 1 },
    borderRadius: geometry === 'roundRect' ? 'rounded-xl' : undefined,
  })
}

function addText(slide, text, position, opts = {}) {
  const box = slide.shapes.add({
    geometry: 'textbox',
    position,
    fill: 'none',
    line: { style: 'solid', fill: 'none', width: 0 },
  })
  box.text = text
  box.text.style = {
    fontSize: opts.size ?? 22,
    bold: Boolean(opts.bold),
    color: opts.color ?? colors.ink,
    alignment: opts.align ?? 'left',
  }
  return box
}

function addTitle(slide, eyebrow, title, conclusion, dark = false) {
  addText(slide, eyebrow, { left: 56, top: 34, width: 260, height: 28 }, {
    size: 13,
    bold: true,
    color: dark ? '#93c5fd' : colors.blue,
  })
  addText(slide, title, { left: 56, top: 64, width: 780, height: 52 }, {
    size: 32,
    bold: true,
    color: dark ? colors.white : colors.ink,
  })
  addText(slide, conclusion, { left: 56, top: 112, width: 900, height: 34 }, {
    size: 15,
    color: dark ? '#cbd5e1' : colors.muted,
  })
}

function addFooter(slide, index, dark = false) {
  addText(slide, `华烁 AI 视频 · 用户版产品介绍 · ${String(index).padStart(2, '0')}`, {
    left: 56,
    top: 682,
    width: 420,
    height: 22,
  }, { size: 10, color: dark ? '#94a3b8' : '#94a3b8' })
}

function addCard(slide, title, body, position, accent = colors.blue) {
  addShape(slide, position, colors.white, colors.line)
  addShape(slide, { left: position.left, top: position.top, width: 5, height: position.height }, accent, accent, 'rect')
  addText(slide, title, { left: position.left + 18, top: position.top + 14, width: position.width - 34, height: 28 }, {
    size: 17,
    bold: true,
    color: colors.ink,
  })
  addText(slide, body, { left: position.left + 18, top: position.top + 47, width: position.width - 34, height: position.height - 56 }, {
    size: 12,
    color: colors.muted,
  })
}

function addMetric(slide, value, label, position, accent = colors.blue) {
  addShape(slide, position, colors.white, colors.line)
  addText(slide, value, { left: position.left + 16, top: position.top + 14, width: position.width - 32, height: 34 }, {
    size: 26,
    bold: true,
    color: accent,
    align: 'center',
  })
  addText(slide, label, { left: position.left + 14, top: position.top + 52, width: position.width - 28, height: 30 }, {
    size: 12,
    color: colors.muted,
    align: 'center',
  })
}

async function addScreenshot(slide, name, position, alt, opts = {}) {
  if (opts.card !== false) {
    addShape(slide, {
      left: position.left - 8,
      top: position.top - 8,
      width: position.width + 16,
      height: position.height + 16,
    }, colors.white, colors.line)
  }
  slide.images.add({
    blob: await imageBytes(name),
    contentType: 'image/png',
    alt,
    fit: opts.fit ?? 'cover',
    position,
    geometry: 'roundRect',
    borderRadius: 'rounded-lg',
  })
}

function addTag(slide, text, left, top, fill = colors.blue) {
  addShape(slide, { left, top, width: 116, height: 30 }, fill, fill)
  addText(slide, text, { left: left + 8, top: top + 6, width: 100, height: 18 }, {
    size: 11,
    bold: true,
    color: colors.white,
    align: 'center',
  })
}

function addFlowStep(slide, index, title, body, left, top, accent = colors.blue) {
  addShape(slide, { left, top, width: 164, height: 112 }, colors.white, colors.line)
  addShape(slide, { left: left + 14, top: top + 14, width: 32, height: 32 }, accent, accent)
  addText(slide, String(index).padStart(2, '0'), { left: left + 14, top: top + 21, width: 32, height: 18 }, {
    size: 11,
    bold: true,
    color: colors.white,
    align: 'center',
  })
  addText(slide, title, { left: left + 56, top: top + 16, width: 88, height: 24 }, {
    size: 15,
    bold: true,
    color: colors.ink,
  })
  addText(slide, body, { left: left + 16, top: top + 58, width: 132, height: 42 }, {
    size: 11,
    color: colors.muted,
  })
}

function setBg(slide, dark = false) {
  slide.background.fill = dark ? colors.navy : colors.soft
}

async function build() {
  const deck = Presentation.create({ slideSize: SLIDE })
  deck.theme.colorScheme = {
    name: 'Huashuo Product Launch',
    themeColors: {
      accent1: colors.blue,
      accent2: colors.green,
      accent3: colors.orange,
      accent4: '#dc2626',
      accent5: colors.purple,
      accent6: '#16a34a',
      bg1: colors.white,
      bg2: colors.soft,
      tx1: colors.ink,
      tx2: colors.muted,
      dk1: '#000000',
      dk2: colors.navy,
      lt1: colors.white,
      lt2: '#e2e8f0',
      hlink: colors.blue,
      folHlink: colors.purple,
    },
  }

  {
    const slide = deck.slides.add()
    setBg(slide, true)
    addShape(slide, { left: 0, top: 0, width: 1280, height: 720 }, colors.navy, colors.navy, 'rect')
    addText(slide, '用户版产品发布会', { left: 64, top: 64, width: 190, height: 28 }, { size: 12, bold: true, color: '#93c5fd' })
    addText(slide, '汽车 AI 视频制作平台', { left: 64, top: 130, width: 520, height: 66 }, { size: 42, bold: true, color: colors.white })
    addText(slide, '让门店销售视频从“素材散落、脚本难写、制作慢”变成可复用、可追踪、可交付的标准流程。', {
      left: 64,
      top: 210,
      width: 486,
      height: 70,
    }, { size: 17, color: '#cbd5e1' })
    addMetric(slide, '3 条', '创作链路', { left: 64, top: 326, width: 126, height: 94 }, '#60a5fa')
    addMetric(slide, '6-8', '标准分镜', { left: 208, top: 326, width: 126, height: 94 }, '#34d399')
    addMetric(slide, '30s', '销售节奏', { left: 352, top: 326, width: 126, height: 94 }, '#fbbf24')
    await addScreenshot(slide, 'dashboard.png', { left: 610, top: 78, width: 600, height: 420 }, '线上系统工作台截图', { fit: 'cover' })
    addTag(slide, '真实线上界面', 1020, 100, '#2563eb')
    addFooter(slide, 1, true)
  }

  {
    const slide = deck.slides.add()
    setBg(slide)
    addTitle(slide, 'PRODUCT STORY', '不是功能集合，而是三条生产链路', '用户从不同起点进入，最终都围绕车型素材、文案分镜和视频任务完成交付。')
    const colorsByStep = [colors.blue, colors.orange, colors.green]
    addCard(slide, 'AI 智能创作', '适合门店销售从车型素材包和简单需求直接生成视频方案。', { left: 70, top: 184, width: 330, height: 120 }, colorsByStep[0])
    addCard(slide, '爆款对标创作', '适合参考优秀案例，提炼口播、结构和画面节奏。', { left: 475, top: 184, width: 330, height: 120 }, colorsByStep[1])
    addCard(slide, '资产复用创作', '适合复用已有文案、分镜、数字人、BGM 和车型素材。', { left: 880, top: 184, width: 330, height: 120 }, colorsByStep[2])
    addFlowStep(slide, 1, '输入目标', '车型、活动、卖点或参考视频', 144, 398)
    addFlowStep(slide, 2, '选择素材', '车型素材包、场景图、数字人', 346, 398, colors.green)
    addFlowStep(slide, 3, '确认方案', '文案、分镜、参数和积分', 548, 398, colors.purple)
    addFlowStep(slide, 4, '提交生成', '视频任务自动进入队列', 750, 398, colors.orange)
    addFlowStep(slide, 5, '结果复用', '下载、发布公共资产、二次创作', 952, 398, colors.blue)
    addFooter(slide, 2)
  }

  {
    const slide = deck.slides.add()
    setBg(slide)
    addTitle(slide, 'WORKBENCH', '产品定位：门店的一站式 AI 视频工作台', '把需求、车型素材、参数、任务结果放在同一张工作台里，让普通用户按流程完成视频生产。')
    await addScreenshot(slide, 'dashboard.png', { left: 64, top: 170, width: 760, height: 420 }, '线上系统首页', { fit: 'cover' })
    addCard(slide, '输入统一', '需求描述、车型素材包和高级参数在同一入口完成。', { left: 884, top: 178, width: 260, height: 100 }, colors.blue)
    addCard(slide, '生成可控', '文案和分镜先确认，再进入视频任务。', { left: 884, top: 306, width: 260, height: 100 }, colors.purple)
    addCard(slide, '结果可追踪', '任务中心、最近生成和资产中心都能回看。', { left: 884, top: 434, width: 260, height: 100 }, colors.green)
    addFooter(slide, 3)
  }

  {
    const slide = deck.slides.add()
    setBg(slide)
    addTitle(slide, 'AI CREATION', '链路一：AI 智能创作', '选车型素材包，设置时长、语言、比例和高级参数，进入文案分镜确认后再生成视频。')
    await addScreenshot(slide, 'create-video.png', { left: 58, top: 168, width: 760, height: 320 }, 'AI智能创作核心配置区', { fit: 'contain' })
    addFlowStep(slide, 1, '选择车型', '从资产中心选择车型素材包', 864, 170, colors.blue)
    addFlowStep(slide, 2, '补充目标', '活动、客户、门店政策或卖点', 1040, 170, colors.green)
    addFlowStep(slide, 3, '确认参数', '时长、语言、比例、数字人', 864, 322, colors.purple)
    addFlowStep(slide, 4, '提交生成', '确认文案分镜后自动制片', 1040, 322, colors.orange)
    addText(slide, '价值：减少用户从 0 写脚本的压力，让销售只负责选择车型和确认方向。', { left: 68, top: 542, width: 680, height: 34 }, {
      size: 17,
      bold: true,
      color: colors.ink,
    })
    addFooter(slide, 4)
  }

  {
    const slide = deck.slides.add()
    setBg(slide)
    addTitle(slide, 'PLAN CONFIRM', '生成前确认：文案与分镜配套', '文案负责口播和字幕，分镜负责镜头与时长，确认无误后才进入视频生成任务。')
    await addScreenshot(slide, 'asset-reuse.png', { left: 58, top: 166, width: 694, height: 410 }, '文案分镜与资产复用配置', { fit: 'cover' })
    addCard(slide, '文案资产', '可直接用于 TTS、数字人口播或视频模型原生口播；用户上传口播音频时不覆盖音频。', { left: 805, top: 178, width: 330, height: 106 }, colors.blue)
    addCard(slide, '分镜资产', '按镜头拆分画面内容、时长和文案对应关系，总时长跟随用户设定。', { left: 805, top: 314, width: 330, height: 106 }, colors.green)
    addCard(slide, '统一约束', '数字人、车辆、字幕安全区、大字报和 BGM 策略随方案一起进入生成。', { left: 805, top: 450, width: 330, height: 106 }, colors.purple)
    addFooter(slide, 5)
  }

  {
    const slide = deck.slides.add()
    setBg(slide)
    addTitle(slide, 'BENCHMARK', '链路二：爆款对标创作', '参考视频只作为结构和风格来源，最终仍要选择目标车型并确认方案。')
    await addScreenshot(slide, 'benchmark-create.png', { left: 62, top: 164, width: 760, height: 420 }, '爆款对标创作页', { fit: 'cover' })
    addCard(slide, '上传参考', '支持链接解析或本地视频上传，用于提炼口播和结构。', { left: 872, top: 170, width: 270, height: 94 }, colors.orange)
    addCard(slide, '绑定车型', '选择目标车型素材包，避免生成结果偏离本次销售车辆。', { left: 872, top: 292, width: 270, height: 94 }, colors.blue)
    addCard(slide, '确认生成', '无口播视频按画面分镜生成；有口播视频可参考文案但不覆盖用户自带音频。', { left: 872, top: 414, width: 270, height: 118 }, colors.green)
    addFooter(slide, 6)
  }

  {
    const slide = deck.slides.add()
    setBg(slide)
    addTitle(slide, 'ASSET CENTER', '链路三：资产复用与公共资产中心', '把车型素材、文案、分镜、场景图、数字人和结果视频沉淀成可复用资产。')
    await addScreenshot(slide, 'asset-materials.png', { left: 56, top: 164, width: 540, height: 400 }, '资产中心素材筛选', { fit: 'cover' })
    await addScreenshot(slide, 'asset-reuse.png', { left: 666, top: 164, width: 540, height: 400 }, '资产复用创作页', { fit: 'cover' })
    addTag(slide, '统一资产筛选', 96, 186, colors.blue)
    addTag(slide, '组合生成新片', 706, 186, colors.green)
    addText(slide, '价值：让一次生成变成长期可复用内容库，门店可以从“找素材”直接进入“组装成片”。', {
      left: 82,
      top: 604,
      width: 1040,
      height: 28,
    }, { size: 17, bold: true, color: colors.ink, align: 'center' })
    addFooter(slide, 7)
  }

  {
    const slide = deck.slides.add()
    setBg(slide)
    addTitle(slide, 'ADVANCED CONTROLS', '高级参数：把视频质量约束前置', '数字人、场景图、字幕、大字报、口播/BGM 和模型参数都在提交前显性配置。')
    await addScreenshot(slide, 'advanced-parameters-top.png', { left: 74, top: 160, width: 372, height: 452 }, '高级参数抽屉', { fit: 'cover' })
    addCard(slide, '数字人出镜', '选择系统虚拟数字人全身照，分镜同步加入统一人物描述，减少人物风格跳变。', { left: 510, top: 170, width: 290, height: 110 }, colors.blue)
    addCard(slide, '字幕与大字报', '支持字幕策略、字体、位置、字号和大字报样式，适配横竖屏安全区。', { left: 850, top: 170, width: 290, height: 110 }, colors.purple)
    addCard(slide, '场景图与 BGM', '场景图片约束背景环境，本地 BGM 上传后作为后期背景音乐混入。', { left: 510, top: 326, width: 290, height: 110 }, colors.green)
    addCard(slide, '音频策略', '用户上传口播音频时优先使用用户音频；无口播视频可关闭口播，仅按分镜生成。', { left: 850, top: 326, width: 290, height: 110 }, colors.orange)
    addFooter(slide, 8)
  }

  {
    const slide = deck.slides.add()
    setBg(slide)
    addTitle(slide, 'TASK & RESULT', '任务中心：让生成过程可见', '排队、运行、成功、失败和退款状态可追踪，成片结果可回到资产中心继续复用。')
    await addScreenshot(slide, 'recent-results.png', { left: 54, top: 164, width: 548, height: 388 }, '最近生成结果', { fit: 'cover' })
    await addScreenshot(slide, 'task-center.png', { left: 666, top: 164, width: 548, height: 388 }, '任务中心', { fit: 'cover' })
    addTag(slide, '最近生成', 92, 186, colors.blue)
    addTag(slide, '任务中心', 704, 186, colors.purple)
    addText(slide, '价值：用户不再猜测任务是否成功，结果、资产和积分记录都能回溯。', {
      left: 94,
      top: 596,
      width: 1040,
      height: 30,
    }, { size: 17, bold: true, color: colors.ink, align: 'center' })
    addFooter(slide, 9)
  }

  {
    const slide = deck.slides.add()
    setBg(slide, true)
    addShape(slide, { left: 0, top: 0, width: 1280, height: 720 }, colors.navy, colors.navy, 'rect')
    addTitle(slide, 'GO LIVE', '产品总结：让汽车门店自己也能持续生产营销短视频', '系统不是一次性生成器，而是围绕车型资产、内容资产和任务结果的长期生产工作台。', true)
    addCard(slide, '能创作', 'AI智能创作从车型素材包快速生成方案。', { left: 86, top: 214, width: 250, height: 104 }, '#3b82f6')
    addCard(slide, '能对标', '参考爆款视频，提炼结构并替换目标车型。', { left: 376, top: 214, width: 250, height: 104 }, '#f59e0b')
    addCard(slide, '能复用', '文案、分镜、数字人、BGM 和场景图持续沉淀。', { left: 666, top: 214, width: 250, height: 104 }, '#10b981')
    addCard(slide, '能追踪', '任务、结果、积分和资产记录都可回溯。', { left: 956, top: 214, width: 250, height: 104 }, '#8b5cf6')
    addText(slide, '上线后用户可从左侧“使用教程”进入完整图文教程，按截图完成第一条汽车销售视频。', {
      left: 170,
      top: 430,
      width: 940,
      height: 46,
    }, { size: 22, bold: true, color: colors.white, align: 'center' })
    addText(slide, 'https://kcpq.site/', { left: 432, top: 516, width: 416, height: 34 }, {
      size: 18,
      bold: true,
      color: '#93c5fd',
      align: 'center',
    })
    addFooter(slide, 10, true)
  }

  const output = await PresentationFile.exportPptx(deck)
  await fs.writeFile(PPT_PATH, Buffer.from(output.data))
  console.log(JSON.stringify({ output: PPT_PATH, slides: 10, bytes: output.data.length }, null, 2))
}

build().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
