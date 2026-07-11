const API_BASE = process.env.HUASHUO_API_BASE || 'https://kcpq.site/api/v1'

const role = (id, name, type, breed, voiceName, personalityTags) => ({
  id,
  name,
  type,
  breed,
  voiceName,
  speakingTone: voiceName,
  personalityTags,
  roleTags: ['剧情角色'],
  anthropomorphic: true,
  referenceAssetIds: [],
})

const line = (order, speakerRoleId, speakerName, text, emotion, voiceName) => ({
  order,
  speakerRoleId,
  speakerName,
  text,
  emotion,
  speed: 'normal',
  voiceName,
  lipSync: true,
})

const shot = (index, durationSeconds, frameDescription, characterAction, cameraMove, subtitle, voiceEmotion = '开心') => ({
  index,
  durationSeconds,
  frameDescription,
  characterAction,
  cameraMove,
  subtitle,
  voiceEmotion,
})

const subtitleStyle = {
  position: 'bottom',
  highlighted: true,
  fontFamily: '微软雅黑',
  fontSize: 34,
  textColor: '#FFFFFF',
  outlineColor: '#111827',
  strokeMode: 'strong',
}

const dog = role('dog-doubao', '豆包', 'dog', '金毛犬', '活泼男声', ['热情', '积极', '爱撒娇'])
const cat = role('cat-lizi', '栗子', 'cat', '中华田园猫', '清亮女声', ['冷静', '机智', '吐槽'])
const owner = role('owner-linran', '林然', 'other', '宠物主人', '温柔女声', ['温暖', '耐心', '会接梗'])

const assets = [
  {
    key: 'dialogue-snack-evidence',
    title: '零食失踪案｜猫狗互相举证',
    group: '宠物文案',
    assetRole: 'voice_script',
    workflowStage: 'petCopy',
    payload: {
      assetKind: 'dialogue',
      templateId: 'multi-pet-dialogue',
      videoType: 'dialogue',
      durationSeconds: 15,
      aspectRatio: '9:16',
      style: 'funny',
      prompt: '零食袋突然空了，豆包和栗子互相举证，最后发现主人早已把零食分装，误会温暖收尾。',
      roles: [dog, cat],
      dialogueLines: [
        line(1, dog.id, dog.name, '先声明，我只闻了三秒。', '认真解释', dog.voiceName),
        line(2, cat.id, cat.name, '你嘴边的碎屑也只待了三秒？', '吐槽', cat.voiceName),
        line(3, dog.id, dog.name, '那是证物，我负责保管。', '委屈', dog.voiceName),
        line(4, cat.id, cat.name, '证物正在被你消化。', '吐槽', cat.voiceName),
        line(5, dog.id, dog.name, '等等，柜子上还有两袋！', '惊讶', dog.voiceName),
        line(6, cat.id, cat.name, '散会，主人只是换了包装。', '开心', cat.voiceName),
      ],
      shots: [
        shot(1, 3, '空零食袋特写，两只宠物同时入镜', '豆包迅速移开视线，栗子盯住碎屑', '快速推近', '零食失踪案，现在开会', '惊讶'),
        shot(2, 3, '豆包正面近景', '豆包认真抬爪解释', '稳定近景', '我只闻了三秒', '认真解释'),
        shot(3, 3, '栗子侧脸与豆包嘴边碎屑同框', '栗子冷静转头看证据', '轻微横移', '碎屑也只待了三秒？', '吐槽'),
        shot(4, 3, '两只宠物同时看向柜子', '豆包突然竖耳，栗子回头', '快速摇镜', '柜子上还有两袋', '惊讶'),
        shot(5, 3, '两只宠物并排坐好', '栗子轻轻碰豆包，温暖收尾', '缓慢拉远', '误会解除，散会', '开心'),
      ],
      materialHints: {
        main_pet: { keyword: '金毛 dog' },
        second_pet: { keyword: '猫 cat' },
        scene: { keyword: '温暖客厅 living room' },
        prop: { keyword: '宠物零食 snack' },
      },
    },
  },
  {
    key: 'dialogue-feeder-mystery',
    title: '自动喂食器提前开饭之谜',
    group: '宠物文案',
    assetRole: 'voice_script',
    workflowStage: 'petCopy',
    payload: {
      assetKind: 'dialogue',
      templateId: 'multi-pet-dialogue',
      videoType: 'dialogue',
      durationSeconds: 15,
      aspectRatio: '9:16',
      style: 'funny',
      prompt: '自动喂食器提前响了，豆包以为自己许愿成功，栗子层层推理，最后发现是夏令时设置。',
      roles: [dog, cat],
      dialogueLines: [
        line(1, dog.id, dog.name, '我刚许愿，饭就掉下来了！', '惊讶', dog.voiceName),
        line(2, cat.id, cat.name, '许愿前，你碰过那个按钮。', '吐槽', cat.voiceName),
        line(3, dog.id, dog.name, '那是给愿望一个方向。', '认真解释', dog.voiceName),
        line(4, cat.id, cat.name, '屏幕显示，夏令时已开启。', '认真解释', cat.voiceName),
        line(5, dog.id, dog.name, '所以时间也支持加餐？', '撒娇', dog.voiceName),
        line(6, cat.id, cat.name, '只支持你提前饿。', '吐槽', cat.voiceName),
      ],
      materialHints: {
        main_pet: { keyword: '金毛 dog' },
        second_pet: { keyword: '猫 cat' },
        scene: { keyword: '家庭厨房 kitchen' },
        prop: { keyword: '自动喂食器 feeder' },
      },
    },
  },
  {
    key: 'dialogue-bath-negotiation',
    title: '洗澡通知引发的三方谈判',
    group: '宠物文案',
    assetRole: 'voice_script',
    workflowStage: 'petCopy',
    payload: {
      assetKind: 'dialogue',
      templateId: 'multi-pet-dialogue',
      videoType: 'dialogue',
      durationSeconds: 15,
      aspectRatio: '9:16',
      style: 'funny',
      prompt: '主人宣布洗澡，豆包积极谈条件，栗子冷静划清界限，最后两只宠物一起用卖萌换来擦澡。',
      roles: [owner, dog, cat],
      dialogueLines: [
        line(1, owner.id, owner.name, '今晚，大家都要洗澡。', '开心', owner.voiceName),
        line(2, dog.id, dog.name, '先谈零食补偿，可以吗？', '撒娇', dog.voiceName),
        line(3, cat.id, cat.name, '请把“大家”改成“豆包”。', '吐槽', cat.voiceName),
        line(4, owner.id, owner.name, '那就从最会谈判的开始。', '开心', owner.voiceName),
        line(5, cat.id, cat.name, '我宣布谈判暂停。', '惊讶', cat.voiceName),
        line(6, dog.id, dog.name, '一起卖萌，争取改成擦澡！', '开心', dog.voiceName),
      ],
      materialHints: {
        human_avatar: { keyword: '林然 主人' },
        main_pet: { keyword: '金毛 dog' },
        second_pet: { keyword: '猫 cat' },
        scene: { keyword: '温暖客厅 living room' },
      },
    },
  },
  {
    key: 'dialogue-after-work-meeting',
    title: '主人下班后的门口会议',
    group: '宠物文案',
    assetRole: 'voice_script',
    workflowStage: 'petCopy',
    payload: {
      assetKind: 'dialogue',
      templateId: 'multi-pet-dialogue',
      videoType: 'dialogue',
      durationSeconds: 15,
      aspectRatio: '9:16',
      style: 'healing',
      prompt: '主人下班回家，豆包热烈汇报一天，栗子表面冷静却一直守在门边，最后三者拥抱。',
      roles: [owner, dog, cat],
      dialogueLines: [
        line(1, dog.id, dog.name, '欢迎回家！我等了整整一天！', '开心', dog.voiceName),
        line(2, cat.id, cat.name, '准确说，是从钥匙响起开始。', '吐槽', cat.voiceName),
        line(3, owner.id, owner.name, '那是谁一直坐在门垫上？', '开心', owner.voiceName),
        line(4, cat.id, cat.name, '我在监督门垫。', '认真解释', cat.voiceName),
        line(5, dog.id, dog.name, '监督得眼睛都亮了！', '开心', dog.voiceName),
        line(6, owner.id, owner.name, '辛苦了，今晚一起加餐。', '开心', owner.voiceName),
      ],
      materialHints: {
        human_avatar: { keyword: '林然 主人' },
        main_pet: { keyword: '金毛 dog' },
        second_pet: { keyword: '猫 cat' },
        scene: { keyword: '温暖客厅 living room' },
      },
    },
  },
  {
    key: 'storyboard-sleeping-twist',
    title: '前三秒装睡失败｜零食袋钩子',
    group: '宠物分镜',
    assetRole: 'storyboard_json',
    workflowStage: 'petStoryboard',
    payload: {
      assetKind: 'storyboard',
      templateId: 'viral-benchmark-storyboard',
      videoType: 'short_drama',
      durationSeconds: 11,
      aspectRatio: '9:16',
      style: 'funny',
      prompt: '小狗假装熟睡，第一秒用零食袋声音制造钩子，表情逐级失控，最后发现只是空袋。',
      roles: [dog],
      shots: [
        shot(1, 2, '小狗闭眼装睡，画外突然响起零食袋声音', '耳朵先动，眼睛仍闭着', '极近景快速推近', '别动，它可能是在试探我', '认真解释'),
        shot(2, 3, '小狗偷偷睁开一只眼', '鼻子轻嗅，前爪缓慢挪动', '稳定近景', '只确认一下，不算醒', '撒娇'),
        shot(3, 3, '小狗瞬间冲到镜头前', '快速起身，尾巴高速摆动', '快速拉焦', '确认完毕：是零食！', '开心'),
        shot(4, 3, '主人展示空零食袋', '小狗僵住后慢慢趴回去', '缓慢拉远', '今天的演技，白演了', '吐槽'),
      ],
      materialHints: { main_pet: { keyword: '金毛 dog' }, scene: { keyword: '温暖客厅 living room' }, prop: { keyword: '零食袋 snack' } },
    },
  },
  {
    key: 'storyboard-mystery-box',
    title: '纸箱里的神秘声音｜悬念反转',
    group: '宠物分镜',
    assetRole: 'storyboard_json',
    workflowStage: 'petStoryboard',
    payload: {
      assetKind: 'storyboard',
      templateId: 'viral-benchmark-storyboard',
      videoType: 'short_drama',
      durationSeconds: 15,
      aspectRatio: '9:16',
      style: 'funny',
      prompt: '纸箱里传来声音，猫狗谨慎接近，悬念递进，最后发现是会说话的宠物玩具。',
      roles: [dog, cat],
      dialogueLines: [
        line(1, dog.id, dog.name, '里面刚刚叫了我的名字。', '惊讶', dog.voiceName),
        line(2, cat.id, cat.name, '也可能只是你太想出名。', '吐槽', cat.voiceName),
        line(3, dog.id, dog.name, '你先开，我负责支援。', '委屈', dog.voiceName),
        line(4, cat.id, cat.name, '支援为什么在三米外？', '吐槽', cat.voiceName),
      ],
      shots: [
        shot(1, 2, '安静客厅中纸箱轻微晃动', '豆包和栗子同时看向纸箱', '快速推近纸箱', '箱子里，有东西在说话', '惊讶'),
        shot(2, 3, '两只宠物压低身体接近纸箱', '豆包停在后方，栗子谨慎前探', '低机位跟拍', '你先开，我负责支援', '委屈'),
        shot(3, 3, '栗子回头看远处的豆包', '栗子冷静凝视，豆包假装看别处', '反打近景', '支援为什么在三米外？', '吐槽'),
        shot(4, 3, '纸箱再次发声并弹开一条缝', '两只宠物同时后跳', '轻微手持后撤', '它又说话了！', '惊讶'),
        shot(5, 4, '主人拿出会录音的宠物玩具', '两只宠物靠近玩具，豆包轻碰按钮', '稳定中景拉远', '真相：昨天录音的玩具', '开心'),
      ],
      materialHints: { main_pet: { keyword: '金毛 dog' }, second_pet: { keyword: '猫 cat' }, scene: { keyword: '温暖客厅 living room' }, prop: { keyword: '纸箱 玩具 box toy' } },
    },
  },
  {
    key: 'storyboard-rainy-homecoming',
    title: '雨天等主人回家｜温暖陪伴',
    group: '宠物分镜',
    assetRole: 'storyboard_json',
    workflowStage: 'petStoryboard',
    payload: {
      assetKind: 'storyboard',
      templateId: 'viral-benchmark-storyboard',
      videoType: 'short_drama',
      durationSeconds: 15,
      aspectRatio: '9:16',
      style: 'healing',
      prompt: '雨天傍晚，猫狗轮流守在窗边和门口，听到钥匙声后克制变成雀跃，主人回家温暖收尾。',
      roles: [owner, dog, cat],
      shots: [
        shot(1, 3, '雨滴落在窗上，栗子坐在窗边看楼下', '栗子尾巴轻摆，耳朵捕捉门外声音', '窗外到猫咪缓慢拉焦', '今天的雨，比平时久一点', '开心'),
        shot(2, 3, '豆包趴在门口，身旁放着主人的拖鞋', '豆包抬头又趴下', '低机位缓慢推近', '豆包已经检查了十二次门', '委屈'),
        shot(3, 3, '门外传来钥匙声', '猫狗同时竖耳并看向门锁', '快速切换双近景', '等等，是钥匙声！', '惊讶'),
        shot(4, 3, '门打开，主人带着雨伞出现', '豆包迎上去，栗子克制地走近', '跟随主人入门', '欢迎回家', '开心'),
        shot(5, 3, '主人坐下，两只宠物靠在身边', '主人擦干宠物的爪子，三者同框', '缓慢拉远定格', '等你回家，是今天最重要的事', '开心'),
      ],
      materialHints: { human_avatar: { keyword: '林然 主人' }, main_pet: { keyword: '金毛 dog' }, second_pet: { keyword: '猫 cat' }, scene: { keyword: '雨天客厅 窗边 living room' } },
    },
  },
  {
    key: 'storyboard-snack-court',
    title: '猫狗零食法庭｜角色对话分镜',
    group: '宠物分镜',
    assetRole: 'storyboard_json',
    workflowStage: 'petStoryboard',
    payload: {
      assetKind: 'storyboard',
      templateId: 'viral-benchmark-storyboard',
      videoType: 'short_drama',
      durationSeconds: 15,
      aspectRatio: '9:16',
      style: 'funny',
      prompt: '主人主持零食法庭，豆包积极申请加餐，栗子担任冷静证人，最后主人宣布用拥抱兑换奖励。',
      roles: [owner, dog, cat],
      dialogueLines: [
        line(1, owner.id, owner.name, '零食法庭，现在开庭。', '开心', owner.voiceName),
        line(2, dog.id, dog.name, '我申请今晚加餐两次。', '认真解释', dog.voiceName),
        line(3, cat.id, cat.name, '证据显示，他下午吃过三次。', '吐槽', cat.voiceName),
        line(4, dog.id, dog.name, '那是庭前准备。', '委屈', dog.voiceName),
        line(5, owner.id, owner.name, '判决：一个拥抱换一颗。', '开心', owner.voiceName),
        line(6, cat.id, cat.name, '我申请追加两个拥抱。', '撒娇', cat.voiceName),
      ],
      shots: [
        shot(1, 2, '主人坐在客厅中间，猫狗分坐两侧', '主人轻敲小勺宣布开庭', '对称中景快速推近', '零食法庭，现在开庭', '开心'),
        shot(2, 3, '豆包正面近景', '豆包抬爪积极申请', '稳定近景', '我申请今晚加餐两次', '认真解释'),
        shot(3, 3, '栗子和空零食碗同框', '栗子冷静看向豆包', '侧面反打', '他下午已经吃过三次', '吐槽'),
        shot(4, 3, '豆包表情从自信变委屈', '豆包慢慢放下爪子', '缓慢推近表情', '那是庭前准备', '委屈'),
        shot(5, 4, '主人张开手臂，猫狗一起靠近', '三者拥抱，栗子悄悄抬爪追加', '缓慢拉远', '一个拥抱换一颗', '开心'),
      ],
      materialHints: { human_avatar: { keyword: '林然 主人' }, main_pet: { keyword: '金毛 dog' }, second_pet: { keyword: '猫 cat' }, scene: { keyword: '温暖客厅 living room' }, prop: { keyword: '宠物零食 snack' } },
    },
  },
]

async function main() {
  const token = await resolveToken()
  const existing = await api('/assets?scope=global&businessDomain=pet&pageNo=1&pageSize=200', { token })
  const rows = Array.isArray(existing) ? existing : []
  const existingKeys = new Set(rows.map((asset) => metadataOf(asset.metadataJson).curatedKey).filter(Boolean))
  const published = []
  const updateExisting = String(process.env.HUASHUO_UPDATE_EXISTING || '').toLowerCase() === 'true'

  for (const entry of assets) {
    const existingAsset = existingKeys.has(entry.key)
      ? rows.find((asset) => metadataOf(asset.metadataJson).curatedKey === entry.key)
      : null
    const payload = {
      title: entry.title,
      ...entry.payload,
      subtitleStyle,
      voiceEnabled: true,
      subtitleEnabled: true,
      lipSyncEnabled: true,
      bgmEnabled: true,
      visualSettings: {
        expressionIntensity: 84,
        cameraRhythm: 'short_drama',
        stylePrompt: '短视频叙事，首秒钩子，冲突递进，结尾反转或温暖收束',
        ...(entry.payload.visualSettings || {}),
      },
    }
    const metadata = {
      businessDomain: 'pet',
      domain: 'pet_creation',
      from: 'pet_curated_creation_asset',
      curatedKey: entry.key,
      assetGroup: entry.group,
      assetRole: entry.assetRole,
      workflowStage: entry.workflowStage,
      title: entry.title,
      displayName: entry.title,
      chineseName: entry.title,
      templateId: entry.payload.templateId,
      officialTemplate: true,
      publicTemplate: true,
      tags: ['首秒钩子', '角色对话', '中文字幕', '9:16', '反转或温暖收束'],
    }
    if (existingAsset && !updateExisting) {
      published.push({ key: entry.key, assetId: existingAsset.assetId, status: 'exists' })
      continue
    }
    if (existingAsset && updateExisting) {
      const updated = await api(`/assets/${existingAsset.assetId}/content`, {
        method: 'PATCH',
        token,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: `${entry.title}.json`,
          content: JSON.stringify(payload, null, 2),
          metadataJson: JSON.stringify(metadata),
        }),
      })
      published.push({ key: entry.key, assetId: updated.assetId, status: 'updated' })
      continue
    }
    const form = new FormData()
    form.append('file', new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }), `${entry.title}.json`)
    form.append('publish', 'true')
    form.append('businessDomain', 'pet')
    form.append('metadataJson', JSON.stringify(metadata))
    const created = await api('/assets/upload', { method: 'POST', token, body: form })
    published.push({ key: entry.key, assetId: created.assetId, status: 'published' })
  }

  process.stdout.write(`${JSON.stringify({ count: published.length, assets: published }, null, 2)}\n`)
}

async function resolveToken() {
  if (process.env.HUASHUO_TOKEN) return process.env.HUASHUO_TOKEN
  const username = process.env.HUASHUO_USERNAME
  const password = process.env.HUASHUO_PASSWORD
  if (!username || !password) throw new Error('Set HUASHUO_TOKEN or HUASHUO_USERNAME/HUASHUO_PASSWORD.')
  const login = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
    headers: { 'Content-Type': 'application/json' },
  })
  const token = login.token || login.accessToken
  if (!token) throw new Error('Login response did not contain a token.')
  return token
}

async function api(path, { method = 'GET', token, body, headers = {} } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { ...headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body,
  })
  const text = await response.text()
  let payload
  try { payload = text ? JSON.parse(text) : null } catch { payload = text }
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${typeof payload === 'string' ? payload : JSON.stringify(payload)}`)
  if (payload && typeof payload === 'object' && 'code' in payload && Number(payload.code) !== 0 && Number(payload.code) !== 200) {
    throw new Error(payload.message || `API error ${payload.code}`)
  }
  return payload?.data ?? payload
}

function metadataOf(value) {
  try { return value ? JSON.parse(value) : {} } catch { return {} }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
