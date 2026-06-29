<template>
  <section class="tutorial-page">
    <header class="tutorial-hero" id="top">
      <div class="hero-copy">
        <span class="tutorial-eyebrow">产品教程中心</span>
        <h1>汽车 AI 视频制作平台使用教程</h1>
        <p>
          从车型素材、文案分镜到视频生成，按流程完成第一条汽车销售视频。
          先理解产品价值，再选择适合自己的创作链路。
        </p>
        <div class="hero-tags" aria-label="三条核心创作链路">
          <span v-for="tag in heroTags" :key="tag">{{ tag }}</span>
        </div>
        <div class="hero-actions">
          <a class="primary-action" href="#quick-start">5 分钟生成第一条视频</a>
          <a class="secondary-action" href="#overview">查看三条创作链路</a>
        </div>
      </div>

      <aside class="hero-panel" aria-label="产品发布会核心数据">
        <div class="hero-panel-head">
          <strong>从 PPT 主线整理</strong>
          <span>需求 → 素材 → 方案 → 生成 → 复用</span>
        </div>
        <div class="hero-metrics">
          <article v-for="item in heroMetrics" :key="item.value">
            <strong>{{ item.value }}</strong>
            <span>{{ item.label }}</span>
          </article>
        </div>
        <div class="hero-preview">
          <img :src="shot('dashboard.png')" alt="汽车 AI 视频工作台真实界面" loading="eager" />
          <span class="hero-badge">真实线上工作台</span>
        </div>
      </aside>
    </header>

    <nav class="tutorial-nav" aria-label="教程模块导航">
      <a v-for="item in navItems" :key="item.id" :href="`#${item.id}`">
        {{ item.label }}
      </a>
    </nav>

    <section class="product-overview" id="overview">
      <div class="section-heading">
        <span class="tutorial-eyebrow">01 · 产品概览</span>
        <h2>不是单个视频生成器，而是一站式 AI 视频工作台</h2>
        <p>
          系统围绕车型素材、文案分镜、视频任务和结果复用形成闭环。
          用户带着一个销售需求进入，最终得到可下载、可沉淀、可再次组合的内容资产。
        </p>
      </div>

      <div class="overview-grid">
        <article v-for="item in painCards" :key="item.title" class="pain-card">
          <span>{{ item.index }}</span>
          <strong>{{ item.title }}</strong>
          <p>{{ item.description }}</p>
        </article>
      </div>

      <div class="path-card-grid">
        <article v-for="path in creationPaths" :key="path.title" class="path-card">
          <div class="path-icon">{{ path.index }}</div>
          <div>
            <h3>{{ path.title }}</h3>
            <p>{{ path.summary }}</p>
            <strong>适合：{{ path.audience }}</strong>
          </div>
          <RouterLink :to="path.to">{{ path.cta }}</RouterLink>
        </article>
      </div>
    </section>

    <section class="quick-start" id="quick-start">
      <div class="section-heading compact">
        <span class="tutorial-eyebrow">02 · 新手最快路径</span>
        <h2>5 分钟生成第一条汽车销售视频</h2>
        <p>第一次使用时，不需要先学完所有功能。按最短路径走完一条 AI 智能创作即可。</p>
      </div>
      <div class="quick-timeline">
        <article v-for="(step, index) in quickStartSteps" :key="step">
          <span>{{ String(index + 1).padStart(2, '0') }}</span>
          <strong>{{ step }}</strong>
        </article>
      </div>
      <RouterLink class="inline-cta" to="/render">进入 AI 智能创作</RouterLink>
    </section>

    <div class="tutorial-sections">
      <article
        v-for="section in tutorialSections"
        :id="section.id"
        :key="section.id"
        class="tutorial-section"
      >
        <div class="section-copy">
          <span class="section-index">{{ section.index }}</span>
          <span class="tutorial-eyebrow">{{ section.eyebrow }}</span>
          <h2>{{ section.title }}</h2>
          <p class="section-summary">{{ section.summary }}</p>
          <p class="section-audience">
            <strong>适合谁：</strong>{{ section.audience }}
          </p>

          <div class="section-steps">
            <strong>操作步骤</strong>
            <ol>
              <li v-for="step in section.steps" :key="step">{{ step }}</li>
            </ol>
          </div>

          <div v-if="section.highlights?.length" class="highlight-grid">
            <article v-for="item in section.highlights" :key="item.title">
              <strong>{{ item.title }}</strong>
              <p>{{ item.description }}</p>
            </article>
          </div>

          <RouterLink v-if="section.ctaTo" class="inline-cta" :to="section.ctaTo">
            {{ section.cta }}
          </RouterLink>
          <a v-else class="inline-cta" :href="section.ctaHref">{{ section.cta }}</a>
        </div>

        <figure class="section-shot">
          <div class="shot-frame" :class="section.imageFit">
            <img :src="section.image" :alt="section.imageAlt" loading="lazy" />
            <span
              v-for="callout in section.callouts"
              :key="callout.label"
              class="shot-callout"
              :style="{ left: callout.left, top: callout.top }"
            >
              {{ callout.label }}
            </span>
          </div>
          <figcaption>{{ section.caption }}</figcaption>
          <ul class="shot-callout-list" aria-label="截图标注列表">
            <li v-for="callout in section.callouts" :key="`${section.id}-${callout.label}`">
              {{ callout.label }}
            </li>
          </ul>
        </figure>
      </article>
    </div>

    <section class="advanced-cards" id="advanced">
      <div class="section-heading compact">
        <span class="tutorial-eyebrow">07 · 高级参数</span>
        <h2>把视频质量约束前置</h2>
        <p>高级参数不是复杂设置，而是把数字人、字幕、大字报、场景图和音频策略提前说清楚。</p>
      </div>
      <div class="control-grid">
        <article v-for="item in advancedControls" :key="item.title">
          <span>{{ item.index }}</span>
          <strong>{{ item.title }}</strong>
          <p>{{ item.description }}</p>
        </article>
      </div>
      <figure class="wide-shot">
        <img :src="shot('advanced-parameters-top.png')" alt="高级参数真实界面" loading="lazy" />
        <figcaption>高级参数入口覆盖数字人、字幕、大字报、BGM 和生成模型。</figcaption>
      </figure>
    </section>

    <section class="task-result" id="task-result">
      <div class="section-heading compact">
        <span class="tutorial-eyebrow">08 · 任务与结果</span>
        <h2>任务中心让生成过程可见，结果可以继续复用</h2>
        <p>提交后不再猜测是否成功。排队、运行、成功、失败和积分记录都能回溯。</p>
      </div>
      <div class="result-grid">
        <article v-for="item in resultSteps" :key="item.title">
          <span>{{ item.index }}</span>
          <strong>{{ item.title }}</strong>
          <p>{{ item.description }}</p>
        </article>
      </div>
      <div class="result-shots">
        <figure>
          <img :src="shot('task-center.png')" alt="任务中心真实界面" loading="lazy" />
          <figcaption>任务中心查看排队、运行、成功、失败和退款状态。</figcaption>
        </figure>
        <figure>
          <img :src="shot('recent-results.png')" alt="最近生成真实界面" loading="lazy" />
          <figcaption>最近生成区域可打开视频、查看结果并继续复用。</figcaption>
        </figure>
      </div>
    </section>

    <section class="tutorial-faq" id="faq">
      <div class="section-heading compact">
        <span class="tutorial-eyebrow">09 · 常见问题</span>
        <h2>第一次使用最容易问的 6 个问题</h2>
        <p>保留必要答案，避免把教程页重新变成长篇说明书。</p>
      </div>
      <div class="faq-grid">
        <article v-for="item in faqs" :key="item.question">
          <strong>{{ item.question }}</strong>
          <p>{{ item.answer }}</p>
        </article>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
interface TutorialCallout {
  label: string
  left: string
  top: string
}

interface TutorialHighlight {
  title: string
  description: string
}

interface TutorialSection {
  id: string
  index: string
  eyebrow: string
  title: string
  summary: string
  audience: string
  steps: string[]
  highlights?: TutorialHighlight[]
  image: string
  imageAlt: string
  imageFit: 'fit-wide' | 'fit-tall'
  caption: string
  callouts: TutorialCallout[]
  cta: string
  ctaTo?: string
  ctaHref?: string
}

const screenshotBase = '/tutorial/screenshots'
const shot = (name: string) => `${screenshotBase}/${name}`

const heroTags = ['AI 智能创作', '爆款对标创作', '资产复用创作']

const heroMetrics = [
  { value: '3 条', label: '创作链路' },
  { value: '6-8 段', label: '标准分镜' },
  { value: '30s', label: '销售节奏' },
]

const navItems = [
  { id: 'overview', label: '产品概览' },
  { id: 'quick-start', label: '5 分钟路径' },
  { id: 'ai-create', label: 'AI 智能创作' },
  { id: 'plan-confirm', label: '文案分镜' },
  { id: 'benchmark', label: '爆款对标' },
  { id: 'asset-reuse', label: '资产复用' },
  { id: 'advanced', label: '高级参数' },
  { id: 'task-result', label: '任务与结果' },
  { id: 'faq', label: '常见问题' },
]

const painCards = [
  {
    index: 'WHY 01',
    title: '素材散落',
    description: '车型图、场景图、数字人和成片结果分散，二次复用成本高。',
  },
  {
    index: 'WHY 02',
    title: '脚本难写',
    description: '销售知道卖点，但很难快速组织成口播文案和分镜结构。',
  },
  {
    index: 'WHY 03',
    title: '质量不可控',
    description: '人物、字幕、BGM、比例等约束常常在生成后才发现问题。',
  },
  {
    index: 'WHY 04',
    title: '结果难追踪',
    description: '任务排队、失败、退款和积分记录需要统一回看。',
  },
]

const creationPaths = [
  {
    index: 'AI',
    title: 'AI 智能创作',
    summary: '从车型素材包和简单需求直接生成视频方案。',
    audience: '从 0 开始做一条汽车销售视频',
    cta: '进入创作',
    to: '/render',
  },
  {
    index: 'HOT',
    title: '爆款对标创作',
    summary: '提炼参考视频结构，再替换成本次目标车型。',
    audience: '参考优秀案例，复刻结构和节奏',
    cta: '进入对标',
    to: '/benchmark-create',
  },
  {
    index: 'USE',
    title: '资产复用创作',
    summary: '调用沉淀素材，快速组合生成新片。',
    audience: '复用已有文案、分镜、数字人、BGM 和车型素材',
    cta: '进入复用',
    to: '/asset-reuse',
  },
]

const quickStartSteps = [
  '进入 AI 智能创作',
  '选择车型素材包',
  '输入一句视频目标',
  '确认文案分镜',
  '提交生成',
  '到任务中心查看结果',
  '下载或复用视频',
]

const tutorialSections: TutorialSection[] = [
  {
    id: 'ai-create',
    index: '03',
    eyebrow: '链路一 · AI 智能创作',
    title: '选择车型和目标，让系统先生成方案',
    summary: '减少从 0 写脚本的压力，让销售只负责选择车型和确认方向。',
    audience: '门店销售、运营人员，需要快速产出一条车型讲解或活动促销短视频。',
    steps: [
      '从左侧菜单进入 AI 智能创作。',
      '从资产中心选择车型素材包。',
      '输入活动、客户、卖点或门店政策。',
      '设置时长、语言、比例、数字人等参数。',
      '确认文案分镜后提交生成。',
    ],
    image: shot('create-video.png'),
    imageAlt: 'AI 智能创作页面真实截图',
    imageFit: 'fit-wide',
    caption: 'AI 智能创作把需求描述、车型素材包和生成参数放在同一入口。',
    callouts: [
      { label: '输入视频目标', left: '22%', top: '30%' },
      { label: '选择车型素材包', left: '18%', top: '76%' },
      { label: '设置时长/语言/比例', left: '70%', top: '72%' },
      { label: '立即生成', left: '90%', top: '72%' },
    ],
    cta: '去生成第一条视频',
    ctaTo: '/render',
  },
  {
    id: 'plan-confirm',
    index: '04',
    eyebrow: '生成前确认 · 文案与分镜',
    title: '不是盲目生成，而是先确认口播、镜头和约束',
    summary: '文案负责口播和字幕，分镜负责镜头结构和时长；确认无误后才进入视频任务。',
    audience: '希望减少返工、需要控制口播内容、镜头顺序和视频时长的用户。',
    steps: [
      '先确认口播文案和字幕内容。',
      '检查分镜结构、镜头顺序和每段时长。',
      '确认数字人、车辆、字幕、大字报、BGM 等约束。',
      '确认积分和预估时长后提交视频任务。',
    ],
    highlights: [
      { title: '输入需求', description: '车型、活动、卖点或参考视频进入方案生成。' },
      { title: '生成文案分镜', description: '系统先输出可编辑的口播文案和镜头结构。' },
      { title: '用户确认', description: '确认文字、镜头、素材和参数后再提交。' },
      { title: '提交任务', description: '视频任务进入队列，状态可追踪。' },
    ],
    image: shot('asset-reuse.png'),
    imageAlt: '文案分镜与方案确认真实截图',
    imageFit: 'fit-tall',
    caption: '方案确认把文案、分镜、素材和生成参数放在提交前统一检查。',
    callouts: [
      { label: '文案资产', left: '58%', top: '22%' },
      { label: '分镜结构', left: '58%', top: '11%' },
      { label: '素材组合', left: '86%', top: '17%' },
      { label: '进入确认', left: '88%', top: '70%' },
    ],
    cta: '查看资产复用流程',
    ctaTo: '/asset-reuse',
  },
  {
    id: 'benchmark',
    index: '05',
    eyebrow: '链路二 · 爆款对标创作',
    title: '参考视频只学结构，最终仍围绕目标车型生成',
    summary: '上传参考视频或链接，系统提炼口播、节奏和画面结构，再绑定本次目标车型。',
    audience: '已有优秀案例，希望复刻结构和节奏，但替换成自己车型的门店。',
    steps: [
      '上传参考视频或填写参考链接。',
      '系统提炼口播、节奏和画面结构。',
      '选择目标车型素材包。',
      '确认生成方案。',
      '提交生成目标车型的视频。',
    ],
    image: shot('benchmark-create.png'),
    imageAlt: '爆款对标创作页面真实截图',
    imageFit: 'fit-tall',
    caption: '爆款对标创作支持链接解析、本地上传、车型绑定和参数确认。',
    callouts: [
      { label: '参考视频入口', left: '32%', top: '13%' },
      { label: '车型素材包', left: '78%', top: '15%' },
      { label: '生成参数', left: '78%', top: '33%' },
      { label: '解析结果', left: '35%', top: '66%' },
    ],
    cta: '进入爆款对标',
    ctaTo: '/benchmark-create',
  },
  {
    id: 'asset-reuse',
    index: '06',
    eyebrow: '链路三 · 资产复用',
    title: '让一次生成变成长期可复用内容库',
    summary: '车型素材、文案、分镜、场景图、数字人、BGM 和结果视频都可以沉淀为资产。',
    audience: '已经有历史视频、文案、分镜或公共素材，希望快速组合新成片的用户。',
    steps: [
      '进入资产中心。',
      '通过筛选找到车型素材、文案、分镜或视频结果。',
      '选择已有资产重新组合。',
      '进入二次创作或下载复用。',
    ],
    image: shot('asset-materials.png'),
    imageAlt: '资产中心素材筛选真实截图',
    imageFit: 'fit-wide',
    caption: '资产中心按类型、来源和公共/私有状态筛选素材。',
    callouts: [
      { label: '素材分类', left: '43%', top: '19%' },
      { label: '筛选条件', left: '52%', top: '27%' },
      { label: '资产卡片', left: '34%', top: '60%' },
      { label: '加入生成', left: '83%', top: '62%' },
    ],
    cta: '打开资产中心',
    ctaTo: '/assets?tab=materials',
  },
]

const advancedControls = [
  { index: '01', title: '数字人出镜', description: '选择系统虚拟数字人全身照，减少人物风格跳变。' },
  { index: '02', title: '字幕与大字报', description: '字体、位置、字号和样式适配横竖屏安全区。' },
  { index: '03', title: '场景图与背景环境', description: '用展厅、道路、户外等图片约束视频背景。' },
  { index: '04', title: 'BGM 与口播音频', description: 'BGM 只做背景音乐，用户口播音频优先生效。' },
  { index: '05', title: '横屏/竖屏比例', description: '按投放平台选择 9:16、16:9 等成片比例。' },
  { index: '06', title: '视频时长与语言', description: '总时长和讲述语言会带入文案、分镜和生成任务。' },
]

const resultSteps = [
  { index: '01', title: '进入任务中心', description: '提交后任务自动进入队列，用户可以查看进度。' },
  { index: '02', title: '查看状态', description: '排队、运行、成功、失败和退款状态都有记录。' },
  { index: '03', title: '预览下载', description: '成功后可打开视频、预览成片或下载使用。' },
  { index: '04', title: '继续复用', description: '生成结果可进入资产中心，后续继续组合新内容。' },
]

const faqs = [
  {
    question: '没有素材可以生成吗？',
    answer: '建议至少选择车型素材包。车型图和参数越完整，车辆一致性和卖点表达越稳定。',
  },
  {
    question: '为什么要先确认文案和分镜？',
    answer: '文案决定口播和字幕，分镜决定镜头结构和时长。先确认可以减少方向错误导致的重复生成。',
  },
  {
    question: '生成失败怎么办？',
    answer: '先在任务中心查看失败状态和提示，再检查车型素材、数字人图片、音频或参考视频是否可用。',
  },
  {
    question: '生成的视频在哪里查看？',
    answer: '可以在任务中心、我的视频、最近生成和资产中心查看，成功后支持打开、预览和下载。',
  },
  {
    question: '积分在哪里查看？',
    answer: '顶部积分入口和资产中心积分明细可以查看余额、预扣、消耗、退款等记录。',
  },
  {
    question: '生成后还能再次编辑或复用吗？',
    answer: '可以。成片、文案、分镜、车型素材和场景图都可以沉淀为资产，再进入资产复用创作。',
  },
]
</script>

<style scoped>
.tutorial-page {
  display: grid;
  width: min(1320px, calc(100% - 56px));
  gap: 18px;
  margin: 24px auto 40px;
  color: #101828;
}

.tutorial-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 430px;
  gap: 22px;
  overflow: hidden;
  border: 1px solid #dbe7ff;
  border-radius: 8px;
  background: linear-gradient(135deg, #f8fbff 0%, #eef5ff 58%, #f7fafc 100%);
  padding: 26px;
}

.hero-copy {
  display: grid;
  align-content: center;
  gap: 16px;
}

.tutorial-eyebrow {
  color: #2563eb;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0;
}

.tutorial-hero h1,
.section-heading h2,
.section-copy h2 {
  margin: 0;
  color: #0f172a;
  font-weight: 950;
  line-height: 1.18;
}

.tutorial-hero h1 {
  max-width: 760px;
  font-size: 38px;
}

.tutorial-hero p,
.section-heading p,
.section-summary,
.section-audience,
.section-steps li,
.path-card p,
.pain-card p,
.control-grid p,
.result-grid p,
.faq-grid p,
.hero-panel span,
.hero-metrics span,
.section-shot figcaption,
.wide-shot figcaption,
.result-shots figcaption {
  margin: 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.7;
}

.tutorial-hero p {
  max-width: 760px;
  color: #475569;
  font-size: 16px;
}

.hero-tags,
.hero-actions,
.tutorial-nav,
.quick-timeline,
.result-shots,
.shot-callout-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.hero-tags span {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  border: 1px solid #bfdbfe;
  border-radius: 999px;
  background: #fff;
  color: #1d4ed8;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 850;
}

.primary-action,
.secondary-action,
.inline-cta,
.path-card a {
  display: inline-flex;
  min-height: 38px;
  width: fit-content;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 900;
  text-decoration: none;
}

.primary-action,
.inline-cta {
  border: 1px solid #2563eb;
  background: #2563eb;
  color: #fff;
}

.secondary-action,
.path-card a {
  border: 1px solid #dbe7ff;
  background: #fff;
  color: #2563eb;
}

.hero-panel,
.product-overview,
.quick-start,
.tutorial-section,
.advanced-cards,
.task-result,
.tutorial-faq {
  border: 1px solid #e5edf8;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.04);
}

.hero-panel {
  display: grid;
  gap: 14px;
  padding: 14px;
}

.hero-panel-head {
  display: grid;
  gap: 4px;
}

.hero-panel-head strong {
  color: #0f172a;
  font-size: 15px;
  font-weight: 950;
}

.hero-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.hero-metrics article {
  display: grid;
  gap: 4px;
  border: 1px solid #e3eaf6;
  border-radius: 8px;
  background: #f8fafc;
  padding: 10px;
}

.hero-metrics strong {
  color: #1d4ed8;
  font-size: 20px;
  font-weight: 950;
}

.hero-preview {
  position: relative;
  overflow: hidden;
  border: 1px solid #dbe7ff;
  border-radius: 8px;
  background: #f8fbff;
  aspect-ratio: 16 / 9;
}

.hero-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top left;
}

.hero-badge {
  position: absolute;
  left: 12px;
  bottom: 12px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.92);
  color: #fff;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 900;
}

.tutorial-nav {
  position: sticky;
  z-index: 5;
  top: 64px;
  border: 1px solid #e5edf8;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  padding: 10px;
  backdrop-filter: blur(14px);
}

.tutorial-nav a {
  display: inline-flex;
  min-height: 32px;
  align-items: center;
  border: 1px solid #dbe7ff;
  border-radius: 999px;
  background: #f8fbff;
  color: #2563eb;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 850;
  text-decoration: none;
}

.product-overview,
.quick-start,
.advanced-cards,
.task-result,
.tutorial-faq {
  display: grid;
  gap: 18px;
  scroll-margin-top: 130px;
  padding: 22px;
}

.section-heading {
  display: grid;
  max-width: 880px;
  gap: 10px;
}

.section-heading.compact {
  max-width: 760px;
}

.section-heading h2 {
  font-size: 28px;
}

.overview-grid,
.path-card-grid,
.control-grid,
.result-grid,
.faq-grid {
  display: grid;
  gap: 12px;
}

.overview-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.pain-card,
.path-card,
.control-grid article,
.result-grid article,
.faq-grid article {
  display: grid;
  gap: 8px;
  border: 1px solid #e5edf8;
  border-radius: 8px;
  background: #f8fafc;
  padding: 14px;
}

.pain-card span,
.control-grid span,
.result-grid span {
  color: #2563eb;
  font-size: 12px;
  font-weight: 950;
}

.pain-card strong,
.path-card h3,
.control-grid strong,
.result-grid strong,
.faq-grid strong,
.section-steps strong,
.highlight-grid strong {
  color: #0f172a;
  font-size: 15px;
  font-weight: 950;
}

.path-card-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.path-card {
  align-content: start;
  background: #fff;
}

.path-icon {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 8px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 13px;
  font-weight: 950;
}

.path-card h3 {
  margin: 0 0 6px;
  font-size: 18px;
}

.path-card strong {
  color: #334155;
  font-size: 13px;
  line-height: 1.6;
}

.quick-start {
  background: #f8fbff;
}

.quick-timeline {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.quick-timeline article {
  display: grid;
  gap: 8px;
  border: 1px solid #dbe7ff;
  border-radius: 8px;
  background: #fff;
  padding: 12px;
}

.quick-timeline span {
  color: #2563eb;
  font-size: 12px;
  font-weight: 950;
}

.quick-timeline strong {
  color: #0f172a;
  font-size: 13px;
  line-height: 1.45;
}

.tutorial-sections {
  display: grid;
  gap: 18px;
}

.tutorial-section {
  display: grid;
  grid-template-columns: minmax(360px, 0.78fr) minmax(0, 1.22fr);
  gap: 24px;
  scroll-margin-top: 130px;
  padding: 20px;
}

.section-copy {
  display: grid;
  align-content: start;
  gap: 12px;
}

.section-index {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 999px;
  background: #2563eb;
  color: #fff;
  font-size: 14px;
  font-weight: 950;
}

.section-copy h2 {
  font-size: 24px;
}

.section-summary {
  color: #1f2937;
  font-weight: 800;
}

.section-audience {
  border-left: 3px solid #22c55e;
  padding-left: 10px;
}

.section-audience strong {
  color: #166534;
}

.section-steps {
  display: grid;
  gap: 10px;
  border: 1px solid #e5edf8;
  border-radius: 8px;
  background: #f8fafc;
  padding: 14px;
}

.section-steps ol {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 20px;
}

.highlight-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.highlight-grid article {
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #eff6ff;
  padding: 12px;
}

.highlight-grid p {
  margin: 5px 0 0;
  color: #475569;
  font-size: 13px;
  line-height: 1.6;
}

.section-shot,
.wide-shot,
.result-shots figure {
  display: grid;
  align-content: start;
  gap: 8px;
  margin: 0;
}

.shot-frame {
  position: relative;
  overflow: hidden;
  border: 1px solid #dbe7ff;
  border-radius: 8px;
  background: #eef4ff;
}

.shot-frame img {
  display: block;
  width: 100%;
  height: 100%;
}

.shot-frame.fit-wide {
  aspect-ratio: 16 / 8.8;
}

.shot-frame.fit-wide img {
  object-fit: cover;
  object-position: top left;
}

.shot-frame.fit-tall {
  max-height: 520px;
}

.shot-frame.fit-tall img {
  height: auto;
  object-fit: contain;
}

.shot-callout {
  position: absolute;
  transform: translate(-50%, -50%);
  border: 2px solid #fff;
  border-radius: 999px;
  background: #2563eb;
  box-shadow: 0 10px 22px rgba(37, 99, 235, 0.28);
  color: #fff;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 950;
  white-space: nowrap;
}

.shot-callout-list {
  display: none;
  margin: 0;
  padding: 0;
  list-style: none;
}

.shot-callout-list li {
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 850;
}

.control-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.wide-shot {
  overflow: hidden;
  border: 1px solid #dbe7ff;
  border-radius: 8px;
  background: #f8fbff;
  padding: 12px;
}

.wide-shot img {
  width: 100%;
  max-height: 420px;
  object-fit: contain;
  object-position: top center;
}

.result-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.result-shots {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

.result-shots figure {
  overflow: hidden;
  border: 1px solid #dbe7ff;
  border-radius: 8px;
  background: #f8fbff;
  padding: 10px;
}

.result-shots img {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 6px;
  object-fit: cover;
  object-position: top left;
}

.faq-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.faq-grid article {
  background: #fff;
}

@media (max-width: 1180px) {
  .tutorial-hero,
  .tutorial-section,
  .result-shots {
    grid-template-columns: 1fr;
  }

  .overview-grid,
  .path-card-grid,
  .control-grid,
  .result-grid,
  .faq-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .quick-timeline {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .tutorial-page {
    width: calc(100% - 24px);
    margin-top: 14px;
  }

  .tutorial-hero,
  .product-overview,
  .quick-start,
  .tutorial-section,
  .advanced-cards,
  .task-result,
  .tutorial-faq {
    padding: 16px;
  }

  .tutorial-hero h1 {
    font-size: 28px;
  }

  .section-heading h2,
  .section-copy h2 {
    font-size: 22px;
  }

  .tutorial-nav {
    position: static;
  }

  .overview-grid,
  .path-card-grid,
  .control-grid,
  .result-grid,
  .faq-grid,
  .quick-timeline,
  .highlight-grid,
  .hero-metrics {
    grid-template-columns: 1fr;
  }

  .shot-callout {
    display: none;
  }

  .shot-callout-list {
    display: flex;
  }
}
</style>
