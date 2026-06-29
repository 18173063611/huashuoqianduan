<template>
  <section class="tutorial-page">
    <header class="tutorial-hero">
      <div>
        <span class="tutorial-eyebrow">使用教程</span>
        <h1>汽车 AI 视频系统快速上手</h1>
        <p>按“选车型素材、定脚本分镜、选数字人和声音、生成并下载”的流程，帮助门店快速产出汽车销售短视频。</p>
      </div>
      <div class="tutorial-hero-card">
        <strong>推荐路径</strong>
        <span>AI智能创作 → 方案确认 → 视频生成 → 资产复用</span>
      </div>
    </header>

    <section class="tutorial-overview">
      <article v-for="item in overviewCards" :key="item.title">
        <span>{{ item.index }}</span>
        <strong>{{ item.title }}</strong>
        <p>{{ item.description }}</p>
      </article>
    </section>

    <nav class="tutorial-anchor-bar" aria-label="教程章节">
      <a v-for="item in tutorialModules" :key="item.id" :href="`#${item.id}`">{{ item.navLabel }}</a>
    </nav>

    <div class="tutorial-flow">
      <article v-for="module in tutorialModules" :id="module.id" :key="module.id" class="tutorial-module">
        <div class="tutorial-module-copy">
          <span class="tutorial-step">{{ module.step }}</span>
          <h2>{{ module.title }}</h2>
          <p class="tutorial-conclusion">{{ module.conclusion }}</p>
          <p class="tutorial-description">{{ module.description }}</p>

          <div class="tutorial-list">
            <strong>操作步骤</strong>
            <ol>
              <li v-for="step in module.steps" :key="step">{{ step }}</li>
            </ol>
          </div>

          <div v-if="module.notes.length" class="tutorial-note">
            <strong>注意事项</strong>
            <p v-for="note in module.notes" :key="note">{{ note }}</p>
          </div>
        </div>

        <figure class="tutorial-shot">
          <div class="tutorial-shot-frame">
            <img :src="module.image" :alt="module.title" loading="lazy" />
            <span
              v-for="mark in module.marks"
              :key="mark.label"
              class="tutorial-mark"
              :style="{ left: mark.left, top: mark.top }"
            >
              {{ mark.label }}
            </span>
          </div>
          <figcaption>{{ module.caption }}</figcaption>
        </figure>
      </article>
    </div>

    <section class="tutorial-faq" id="faq">
      <div class="tutorial-faq-head">
        <span class="tutorial-eyebrow">FAQ</span>
        <h2>常见问题与上线前注意事项</h2>
        <p>这些规则来自系统真实链路，遇到问题时优先按任务中心和资产中心定位。</p>
      </div>
      <div class="tutorial-faq-grid">
        <article v-for="item in faqs" :key="item.question">
          <strong>{{ item.question }}</strong>
          <p>{{ item.answer }}</p>
        </article>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
interface TutorialMark {
  label: string
  left: string
  top: string
}

interface TutorialModule {
  id: string
  step: string
  navLabel: string
  title: string
  conclusion: string
  description: string
  steps: string[]
  notes: string[]
  image: string
  caption: string
  marks: TutorialMark[]
}

const screenshotBase = '/tutorial/screenshots'

const overviewCards = [
  {
    index: '01',
    title: '三条创作链路',
    description: 'AI智能创作、爆款对标创作、资产复用创作，覆盖从灵感到成片的主要场景。',
  },
  {
    index: '02',
    title: '公共资产复用',
    description: '车型素材包、文案、分镜、数字人、BGM 和场景图都可以在资产中心统一管理。',
  },
  {
    index: '03',
    title: '生成前可确认',
    description: '关键文案、分镜和高级参数在生成前确认，减少无效提交和重复扣费。',
  },
  {
    index: '04',
    title: '结果可沉淀',
    description: '生成完成后可在我的视频和资产中心查看、下载、复用或发布到公共资产。',
  },
]

const tutorialModules: TutorialModule[] = [
  {
    id: 'overview',
    step: '01',
    navLabel: '系统概览',
    title: '先理解系统能做什么',
    conclusion: '系统把汽车销售视频生产拆成素材、文案分镜、参数和任务结果四个可复用环节。',
    description: '进入工作台后，左侧是创作中心与 AI 资产生产工具，顶部可进入任务中心、积分和资产中心。',
    steps: [
      '从左侧进入 AI智能创作、爆款对标创作或资产复用创作。',
      '通过顶部资产中心查看已有车型素材、文案、分镜、数字人和视频结果。',
      '通过任务中心跟踪生成进度，成功后回到结果或资产页下载。',
    ],
    notes: ['普通用户优先使用 AI智能创作；已有文案、分镜或历史素材时再使用资产复用。'],
    image: `${screenshotBase}/dashboard.png`,
    caption: '工作台首页展示创作入口、参数区、推荐模板和最近生成。',
    marks: [
      { label: '创作入口', left: '4%', top: '17%' },
      { label: '生成参数', left: '55%', top: '47%' },
      { label: '最近结果', left: '30%', top: '79%' },
    ],
  },
  {
    id: 'login',
    step: '02',
    navLabel: '登录设置',
    title: '登录后再管理资产和任务',
    conclusion: '登录态用于同步积分、任务结果和资产库，避免生成结果找不到。',
    description: '系统支持账号登录；登录后顶部会显示积分余额，生成前会显示预计积分。',
    steps: [
      '打开登录页，输入账号和密码。',
      '登录后回到创作页面，确认右上角显示账号与积分。',
      '如果需要查看扣费记录，进入顶部“积分”或资产中心的积分明细。',
    ],
    notes: ['未登录时只能浏览部分公开入口，上传素材、资产管理和生成任务需要登录。'],
    image: `${screenshotBase}/login.png`,
    caption: '登录页保留注册入口，登录后进入统一工作台。',
    marks: [
      { label: '登录方式', left: '58%', top: '14%' },
      { label: '账号密码', left: '57%', top: '38%' },
      { label: '提交登录', left: '58%', top: '64%' },
    ],
  },
  {
    id: 'create',
    step: '03',
    navLabel: '创建项目',
    title: '从 AI 智能创作创建汽车视频',
    conclusion: '选择车型素材包后，即可用需求描述、时长、语言、比例和高级参数进入方案确认。',
    description: 'AI智能创作适合从车型资料快速生成销售视频，也可以先不写需求，让系统基于车型素材包生成文案和分镜。',
    steps: [
      '在输入框描述想突出空间、续航、智能座舱或到店权益等方向。',
      '点击“选择”从资产中心选择车型素材包。',
      '设置时长、讲述语言和视频比例；需要数字人、字幕、BGM 或场景图时打开高级参数。',
      '点击“立即生成”进入文案和分镜确认弹窗，确认后再提交视频生成。',
    ],
    notes: ['不要把车型素材、口播音频和场景图混在同一个上传入口里；系统会按角色传入生成链路。'],
    image: `${screenshotBase}/create-video.png`,
    caption: 'AI智能创作的核心配置区。',
    marks: [
      { label: '需求描述', left: '9%', top: '15%' },
      { label: '车型素材包', left: '15%', top: '73%' },
      { label: '高级参数', left: '77%', top: '75%' },
      { label: '立即生成', left: '92%', top: '75%' },
    ],
  },
  {
    id: 'materials',
    step: '04',
    navLabel: '选择素材',
    title: '在资产中心选择可复用素材',
    conclusion: '资产中心按文案、分镜、音频/BGM、数字人、视频素材、车型素材包和场景图片分类。',
    description: '用户上传的私有资产和开发者发布的公共资产可以统一筛选；视频生成时按资产角色加入本次任务。',
    steps: [
      '进入顶部“资产中心”，在素材资产里选择资产类型。',
      '用公共/私有、来源、分组和搜索条件缩小范围。',
      '预览确认后复制链接、发布公共资产或在生成页作为对应角色加入。',
    ],
    notes: ['场景图片是一张一张的背景约束图；车型素材包是一组车辆图片和车型信息，二者不要混用。'],
    image: `${screenshotBase}/asset-materials.png`,
    caption: '资产中心支持按资产类型和来源筛选。',
    marks: [
      { label: '资产类型', left: '46%', top: '18%' },
      { label: '筛选搜索', left: '54%', top: '24%' },
      { label: '资产卡片', left: '30%', top: '59%' },
      { label: '发布公共', left: '81%', top: '91%' },
    ],
  },
  {
    id: 'script-storyboard',
    step: '05',
    navLabel: '文案分镜',
    title: '文案和分镜要配套确认',
    conclusion: '文案用于口播和字幕，分镜控制镜头结构、时长和画面节奏，两者确认后再生成视频。',
    description: '系统会从车型素材、用户需求和高级参数中生成方案；用户也可以从资产中心选择已有文案和分镜。',
    steps: [
      '在生成前确认弹窗中查看口播文案是否完整、语气是否符合目标客户。',
      '检查分镜是否 5-8 段、总时长是否等于目标时长。',
      '如果选择数字人，确认分镜中有统一的数字人出镜描述。',
      '确认无误后点击弹窗中的“确认生成”，系统会自动衔接视频制作任务。',
    ],
    notes: ['如果用户上传了自己的口播音频，文案只作为参考，不应覆盖用户音频。'],
    image: `${screenshotBase}/asset-reuse.png`,
    caption: '资产复用创作展示文案、分镜、时长和素材组合关系。',
    marks: [
      { label: '文案/分镜', left: '48%', top: '47%' },
      { label: '视频预览', left: '88%', top: '55%' },
      { label: '生成参数', left: '38%', top: '83%' },
    ],
  },
  {
    id: 'advanced',
    step: '06',
    navLabel: '高级参数',
    title: '选择数字人、字幕、大字报、BGM 和场景图',
    conclusion: '高级参数决定视频是否有数字人、字幕位置、字体样式、BGM 和背景场景约束。',
    description: '高级参数会随任务一起提交，适合在门店活动、到店促销、数字人口播和无口播视频之间切换。',
    steps: [
      '开启或关闭数字人出镜；使用数字人时选择系统虚拟数字人全身照素材。',
      '选择场景图片，约束展厅、道路、户外或夜景门店背景。',
      '配置字幕策略、字体、位置和字号；需要大字报时单独开启并设置位置。',
      '选择背景音乐策略，也可以上传本地 BGM 后作为后期混音素材。',
    ],
    notes: ['BGM 只控制背景音乐，不应关闭口播；用户上传口播音频时，视频模型不应再生成自己的口播。'],
    image: `${screenshotBase}/advanced-parameters.png`,
    caption: '高级参数抽屉覆盖数字人、场景图、字幕和音频风格。',
    marks: [
      { label: '数字人', left: '18%', top: '9%' },
      { label: '场景图', left: '18%', top: '26%' },
      { label: '字幕字体', left: '16%', top: '52%' },
      { label: '大字报', left: '16%', top: '70%' },
    ],
  },
  {
    id: 'benchmark',
    step: '07',
    navLabel: '爆款对标',
    title: '用参考视频提炼可复用方案',
    conclusion: '爆款对标用于解析参考视频，再把文案、结构和风格转成可确认的汽车销售视频方案。',
    description: '支持链接或本地视频解析；解析结果进入文案、分镜、车辆素材和高级参数确认，不直接覆盖最终生成逻辑。',
    steps: [
      '选择链接解析或本地上传，按平台规则输入参考视频。',
      '解析后检查口播文案、关键词和分镜结构。',
      '选择目标车型素材包，必要时补充场景图、数字人和 BGM。',
      '进入方案确认后提交视频生成。',
    ],
    notes: ['无口播参考视频也可以生成视频，此时应以画面分镜为主，不强制生成口播。'],
    image: `${screenshotBase}/benchmark-create.png`,
    caption: '爆款对标创作页展示解析入口、车辆素材和生成参数。',
    marks: [
      { label: '解析来源', left: '19%', top: '17%' },
      { label: '车辆素材', left: '76%', top: '18%' },
      { label: '参数确认', left: '76%', top: '42%' },
      { label: '结果区域', left: '43%', top: '73%' },
    ],
  },
  {
    id: 'result',
    step: '08',
    navLabel: '预览下载',
    title: '在任务中心和最近生成查看结果',
    conclusion: '视频生成后会进入我的视频和资产中心，用户可以预览、打开视频、查看资产或继续复用。',
    description: '任务中心会展示排队、运行、成功、失败等状态；成功任务会沉淀为资产，方便后续下载和复用。',
    steps: [
      '提交后打开任务中心查看进度。',
      '生成完成后在“我的最近生成”点击查看结果或打开视频。',
      '进入资产中心查看生成资产，必要时发布为公共资产或复制链接。',
      '如果失败，查看错误提示后重试或调整素材。',
    ],
    notes: ['长任务可能需要等待模型平台回调；页面提示“查看进度”时可进入任务中心持续观察。'],
    image: `${screenshotBase}/recent-results.png`,
    caption: '最近生成区域用于快速打开视频和查看资产。',
    marks: [
      { label: '视频封面', left: '13%', top: '42%' },
      { label: '查看结果', left: '77%', top: '44%' },
      { label: '打开视频', left: '91%', top: '43%' },
    ],
  },
]

const faqs = [
  {
    question: '没有素材可以直接生成吗？',
    answer: '汽车销售视频建议至少选择车型素材包。只有车型素材包齐全，系统才能稳定约束车型外观、内饰和卖点。',
  },
  {
    question: '已经上传口播音频，还需要文案吗？',
    answer: '不强制。用户自带口播音频优先，文案不应再覆盖口播；字幕可以基于音频或确认后的文本生成。',
  },
  {
    question: '为什么要确认文案和分镜？',
    answer: '文案影响口播和字幕，分镜影响镜头结构和时长。生成前确认可以减少错误方向导致的重复生成。',
  },
  {
    question: '场景图片和车辆图片有什么区别？',
    answer: '场景图片用于约束背景环境，车辆图片用于约束具体车型。二者在生成链路中角色不同，不能互相替代。',
  },
  {
    question: '生成失败后积分如何处理？',
    answer: '任务会在提交前预扣，失败后按后端结算策略退款或保留日志。可在积分记录和任务中心查看明细。',
  },
  {
    question: '成片在哪里下载？',
    answer: '生成成功后可在我的视频、最近生成、资产中心结果资产中打开视频、复制链接或下载。',
  },
]
</script>

<style scoped>
.tutorial-page {
  display: grid;
  width: min(1280px, calc(100% - 56px));
  gap: 18px;
  margin: 24px auto 36px;
}

.tutorial-hero,
.tutorial-overview article,
.tutorial-module,
.tutorial-faq {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.04);
}

.tutorial-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  align-items: center;
  gap: 24px;
  padding: 24px;
}

.tutorial-eyebrow {
  color: #2563eb;
  font-size: 12px;
  font-weight: 900;
}

.tutorial-hero h1,
.tutorial-faq-head h2 {
  margin: 7px 0;
  color: #111827;
  font-size: 28px;
  line-height: 1.25;
  font-weight: 900;
}

.tutorial-hero p,
.tutorial-faq-head p,
.tutorial-description,
.tutorial-conclusion,
.tutorial-module li,
.tutorial-note p,
.tutorial-faq p,
.tutorial-shot figcaption {
  color: #64748b;
  font-size: 13px;
  line-height: 1.7;
}

.tutorial-hero-card {
  display: grid;
  gap: 9px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
  padding: 18px;
}

.tutorial-hero-card strong {
  color: #1d4ed8;
  font-size: 15px;
}

.tutorial-hero-card span {
  color: #1f2a44;
  font-size: 13px;
  font-weight: 750;
  line-height: 1.6;
}

.tutorial-overview {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.tutorial-overview article {
  display: grid;
  gap: 8px;
  padding: 16px;
}

.tutorial-overview span {
  color: #2563eb;
  font-size: 12px;
  font-weight: 900;
}

.tutorial-overview strong,
.tutorial-list strong,
.tutorial-note strong,
.tutorial-faq strong {
  color: #111827;
  font-size: 15px;
  font-weight: 900;
}

.tutorial-overview p,
.tutorial-faq p {
  margin: 0;
}

.tutorial-anchor-bar {
  position: sticky;
  z-index: 3;
  top: 64px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  padding: 10px;
  backdrop-filter: blur(16px);
}

.tutorial-anchor-bar a {
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

.tutorial-flow {
  display: grid;
  gap: 18px;
}

.tutorial-module {
  display: grid;
  grid-template-columns: minmax(330px, 0.8fr) minmax(0, 1.2fr);
  gap: 22px;
  scroll-margin-top: 132px;
  padding: 18px;
}

.tutorial-module-copy {
  display: grid;
  align-content: start;
  gap: 12px;
}

.tutorial-step {
  display: inline-grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 999px;
  background: #2563eb;
  color: #fff;
  font-size: 14px;
  font-weight: 900;
}

.tutorial-module h2 {
  margin: 0;
  color: #111827;
  font-size: 22px;
  font-weight: 900;
}

.tutorial-conclusion {
  margin: 0;
  color: #1f2a44;
  font-weight: 800;
}

.tutorial-description {
  margin: 0;
}

.tutorial-list,
.tutorial-note {
  display: grid;
  gap: 8px;
  border-radius: 8px;
  background: #f8fafc;
  padding: 12px;
}

.tutorial-list ol {
  display: grid;
  gap: 7px;
  margin: 0;
  padding-left: 18px;
}

.tutorial-note {
  border: 1px solid #dbeafe;
  background: #eff6ff;
}

.tutorial-note p {
  margin: 0;
}

.tutorial-shot {
  display: grid;
  align-content: start;
  gap: 9px;
  margin: 0;
}

.tutorial-shot-frame {
  position: relative;
  overflow: hidden;
  border: 1px solid #dbe7ff;
  border-radius: 8px;
  background: #f8fbff;
}

.tutorial-shot-frame img {
  display: block;
  width: 100%;
  height: auto;
}

.tutorial-mark {
  position: absolute;
  min-width: 74px;
  transform: translate(-50%, -50%);
  border: 2px solid #ffffff;
  border-radius: 999px;
  background: #2563eb;
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.28);
  color: #fff;
  padding: 6px 10px;
  text-align: center;
  font-size: 12px;
  font-weight: 900;
  white-space: nowrap;
}

.tutorial-shot figcaption {
  margin: 0;
  text-align: center;
}

.tutorial-faq {
  display: grid;
  gap: 16px;
  padding: 20px;
}

.tutorial-faq-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.tutorial-faq-grid article {
  display: grid;
  gap: 9px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
  padding: 14px;
}

@media (max-width: 1180px) {
  .tutorial-overview,
  .tutorial-faq-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .tutorial-module {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .tutorial-page {
    width: calc(100% - 24px);
    margin-top: 16px;
  }

  .tutorial-hero,
  .tutorial-overview,
  .tutorial-faq-grid {
    grid-template-columns: 1fr;
  }

  .tutorial-anchor-bar {
    position: static;
  }
}
</style>
