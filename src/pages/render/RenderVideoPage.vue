<template>
  <div class="render-video-page app-page-stack">
    <header class="render-head">
      <h1>视频合成</h1>
      <p>
        基于火山方舟 Seedance 系列模型，通过文字或图片生成短视频。后端同步轮询任务，
        生成耗时通常 1~3 分钟，期间请保持页面打开。
      </p>
    </header>

    <section class="app-card render-input">
      <div class="app-section-title">
        <span>1</span>
        <div>
          <h2>选择生成模式</h2>
          <p class="app-muted">
            文生视频仅需文本提示词；图生视频支持首帧、首尾帧、参照图三种子模式。
          </p>
        </div>
      </div>

      <div class="render-tabs render-tabs-main" role="tablist">
        <button
          v-for="tab in visibleMainTabs"
          :key="tab.key"
          type="button"
          role="tab"
          :class="{ active: mainTab === tab.key }"
          :aria-selected="mainTab === tab.key"
          :disabled="busy"
          @click="mainTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <div v-if="mainTab === 'image'" class="render-tabs render-tabs-sub" role="tablist">
        <button
          v-for="tab in imageSubTabs"
          :key="tab.key"
          type="button"
          role="tab"
          :class="{ active: imageSubTab === tab.key }"
          :aria-selected="imageSubTab === tab.key"
          :disabled="busy"
          @click="imageSubTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="render-form">
        <template v-if="mainTab === 'digitalHuman'">
          <div class="digital-human-guide" aria-label="数字人口播流程">
            <div class="digital-human-guide-item" :class="{ done: digitalHumanImage }">
              <span>1</span>
              <strong>主播图</strong>
            </div>
            <div
              class="digital-human-guide-item"
              :class="{ done: digitalHumanAudioReady }"
            >
              <span>2</span>
              <strong>口播内容</strong>
            </div>
            <div class="digital-human-guide-item" :class="{ done: canSubmit }">
              <span>3</span>
              <strong>生成视频</strong>
            </div>
          </div>

          <div class="render-digital-workspace">
            <section class="render-digital-section">
              <h3>主播图</h3>
              <AssetPicker
                title="从资产中心选择主播图"
                asset-type="IMAGE"
                :selected-url="digitalHumanImage"
                placeholder="搜索图片资产..."
                @select="digitalHumanImage = $event.url"
              />
              <ImageInput
                label="粘贴 / 上传主播图片"
                :busy="busy"
                :value="digitalHumanImage"
                placeholder="https://xxx.tos-cn-guangzhou.volces.com/avatar.png"
                @update="digitalHumanImage = $event"
              />
            </section>

            <section class="render-digital-section">
              <h3>口播内容</h3>
              <div class="render-tabs render-tabs-sub" role="tablist">
                <button
                  v-for="tab in digitalHumanAudioTabs"
                  :key="tab.key"
                  type="button"
                  role="tab"
                  :class="{ active: digitalHumanAudioMode === tab.key }"
                  :aria-selected="digitalHumanAudioMode === tab.key"
                  :disabled="busy"
                  @click="digitalHumanAudioMode = tab.key"
                >
                  {{ tab.label }}
                </button>
              </div>

              <AssetPicker
                v-if="digitalHumanAudioMode === 'asset'"
                title="从资产中心选择口播音频"
                asset-type="AUDIO"
                :selected-url="digitalHumanAudio"
                placeholder="搜索音频资产..."
                @select="digitalHumanAudio = $event.url"
              />

              <div v-else-if="digitalHumanAudioMode === 'upload'" class="render-form-field">
                <label>上传本地口播音频</label>
                <label class="render-upload-audio" :class="{ disabled: busy || digitalHumanAudioUploading }">
                  <input
                    type="file"
                    accept="audio/*"
                    :disabled="busy || digitalHumanAudioUploading"
                    @change="handleDigitalHumanAudioUpload"
                  />
                  <span>{{ digitalHumanAudioUploading ? '上传中...' : '选择音频文件' }}</span>
                  <small>{{ digitalHumanAudioUploadName || '支持 mp3 / wav / m4a 等音频' }}</small>
                </label>
                <p v-if="digitalHumanAudio" class="app-muted render-ref-tip">{{ digitalHumanAudio }}</p>
              </div>

              <div v-else-if="digitalHumanAudioMode === 'url'" class="render-form-field">
                <label>口播音频 URL</label>
                <input v-model.trim="digitalHumanAudio" type="url" :disabled="busy" placeholder="https://xxx/tts.mp3" />
              </div>

              <div v-else class="render-form-field">
                <label>口播文本</label>
                <textarea
                  v-model="digitalHumanText"
                  :disabled="busy"
                  rows="4"
                  maxlength="2000"
                  placeholder="输入文本后由 Vidu 使用指定音色生成口播。"
                />
              </div>
            </section>
          </div>

          <div class="render-grid-two render-digital-options">
            <div v-if="digitalHumanAudioMode === 'text'" class="render-form-field">
              <label>Vidu 音色 ID</label>
              <input v-model.trim="digitalHumanVoiceId" :disabled="busy" placeholder="例如 Vidu 提供的 voice_id" />
            </div>
            <div class="render-form-field">
              <label>分辨率</label>
              <select v-model="digitalHumanResolution" :disabled="busy">
                <option value="540p">540p</option>
                <option value="720p">720p</option>
                <option value="1080p">1080p</option>
              </select>
            </div>
          </div>
        </template>

        <template v-if="mainTab === 'carSales'">
          <div class="render-digital-workspace">
            <section class="render-digital-section">
              <h3>车辆图片</h3>
              <AssetPicker
                title="从资产中心选择车辆图片"
                asset-type="IMAGE"
                :selected-url="carPickedImageUrl"
                placeholder="搜索车辆图片素材..."
                @select="handleCarImageAssetSelect"
              />
              <div class="render-ref-list">
                <div
                  v-for="(item, idx) in carImages"
                  :key="`car-img-${idx}`"
                  class="render-ref-item"
                >
                  <div class="render-ref-index">图{{ idx + 1 }}</div>
                  <ImageInput
                    :busy="busy"
                    :value="item"
                    compact
                    @update="updateCarImage(idx, $event)"
                  />
                  <button
                    type="button"
                    class="render-ref-remove"
                    :disabled="busy || carImages.length <= 1"
                    title="移除该图片"
                    @click="removeCarImageSlot(idx)"
                  >
                    ×
                  </button>
                </div>
              </div>
              <button
                type="button"
                class="app-secondary-button render-mini-btn"
                :disabled="busy || carImages.length >= MAX_REFERENCE"
                @click="addCarImageSlot"
              >
                添加车辆图片
              </button>
            </section>

            <section class="render-digital-section">
              <h3>复用前序资产</h3>
              <AssetPicker
                title="分镜生成结果（控制视频画面）"
                asset-type="JSON"
                :selected-url="carStoryboardAssetUrl"
                :source-types="['STORYBOARD_GENERATE', 'VIDEO_SCRIPT_ANALYZE', 'VIDEO_SCRIPT_URL_ANALYZE']"
                source-hint="分镜用于决定镜头画面、节奏和场景，不和口播文案混用"
                placeholder="搜索分镜生成结果..."
                @select="handleCarStoryboardAssetSelect"
              />
              <AssetPicker
                title="爆款对标文案（口播参考）"
                asset-type="JSON"
                :selected-url="carBenchmarkAssetUrl"
                :source-types="['DOUYIN_BENCHMARK', 'DOUYIN_PARSE_TRANSCRIPT', 'DOUYIN_REWRITE', 'DOUYIN_TRANSCRIPT']"
                source-hint="爆款解析文案主要用于声音生成或口播参考"
                placeholder="搜索爆款对标文案..."
                @select="handleCarBenchmarkAssetSelect"
              />
              <AssetPicker
                title="口播/配音音频"
                asset-type="AUDIO"
                :selected-url="carAudioUrl"
                :source-types="['TTS_GENERATE', 'VOICE_SAMPLE']"
                source-hint="口播音频会作为字幕、口型和节奏的主导来源"
                placeholder="搜索口播音频资产..."
                @select="handleCarAudioAssetSelect"
              />
              <label class="render-upload-audio" :class="{ disabled: busy || carAudioUploading }">
                <input
                  type="file"
                  accept="audio/*"
                  :disabled="busy || carAudioUploading"
                  @change="handleCarAudioUpload"
                />
                <span>{{ carAudioUploading ? '上传中...' : '上传本地口播' }}</span>
                <small>{{ carAudioUploadName || '用于口播、字幕和口型；BGM 请在下方单独选择' }}</small>
              </label>
              <div class="render-audio-mode">
                <button
                  type="button"
                  :class="{ active: carAudioMode === 'none' }"
                  :disabled="busy"
                  @click="carAudioMode = 'none'"
                >
                  不使用音频
                </button>
                <button
                  type="button"
                  :class="{ active: carAudioMode === 'post_mix' }"
                  :disabled="busy || !carAudioUrl"
                  title="生成画面后，用该口播音频替换最终成片音轨"
                  @click="carAudioMode = 'post_mix'"
                >
                  后期口播配音
                </button>
                <button
                  type="button"
                  :class="{ active: carAudioMode === 'reference' }"
                  :disabled="busy || !canUseAudioReference"
                  :title="audioReferenceHint"
                  @click="carAudioMode = 'reference'"
                >
                  参考音频生成
                </button>
              </div>
              <p class="app-muted render-audio-hint">{{ audioReferenceHint }}</p>
              <AssetPicker
                title="背景音乐 BGM"
                asset-type="AUDIO"
                :selected-url="carBgmUrl"
                :source-types="['USER_UPLOAD']"
                source-hint="BGM 只作为背景音乐，不参与口播、字幕或口型生成"
                placeholder="搜索 BGM 音频资产..."
                @select="handleCarBgmAssetSelect"
              />
              <label class="render-upload-audio" :class="{ disabled: busy || carBgmUploading }">
                <input
                  type="file"
                  accept="audio/*"
                  :disabled="busy || carBgmUploading"
                  @change="handleCarBgmUpload"
                />
                <span>{{ carBgmUploading ? '上传中...' : '上传本地 BGM' }}</span>
                <small>{{ carBgmUploadName || '仅混入背景音乐，不覆盖口播音频' }}</small>
              </label>
              <AssetPicker
                title="数字人形象"
                asset-type="IMAGE"
                :selected-url="carHostImageUrl"
                :source-types="['AVATAR_GENERATE', 'USER_UPLOAD', 'MANUAL_CREATED', 'AI_GENERATED']"
                source-hint="选择数字人形象图片，生成时会作为销售顾问/主播参考图"
                placeholder="搜索数字人形象或上传图片..."
                @select="handleCarHostImageAssetSelect"
              />
              <ImageInput
                :busy="busy"
                :value="carHostImageUrl"
                label="上传本地数字人形象"
                compact
                @update="carHostImageUrl = $event"
              />
              <AssetPicker
                title="已有视频素材"
                asset-type="VIDEO"
                :selected-url="carMaterialVideoUrl"
                :source-types="['USER_UPLOAD', 'SEEDANCE_TEXT_VIDEO', 'SEEDANCE_FIRST_FRAME_VIDEO', 'SEEDANCE_FIRST_LAST_FRAME_VIDEO', 'SEEDANCE_REFERENCE_VIDEO', 'SEEDANCE_CAR_SALES_VIDEO']"
                source-hint="选择上传或视频制作阶段产出的素材"
                placeholder="搜索视频素材..."
                @select="handleCarMaterialVideoAssetSelect"
              />
            </section>
          </div>

          <section class="render-recommend-panel">
            <div class="render-recommend-main">
              <span>推荐出片设置</span>
              <strong>{{ carRecommendationSummary }}</strong>
              <p>{{ carRecommendationReasonText }}</p>
            </div>
            <button
              type="button"
              class="app-secondary-button render-mini-btn"
              :disabled="busy || recommendationMatchesCurrent"
              @click="applyCarRecommendation"
            >
              {{ recommendationMatchesCurrent ? '已采用' : '应用推荐' }}
            </button>
          </section>

          <div class="render-grid-two">
            <div class="render-form-field render-form-field-inline">
              <label>分段数量</label>
              <select v-model.number="carSegmentCount" :disabled="busy">
                <option v-for="n in [1, 2, 3, 4, 5, 6]" :key="n" :value="n">{{ n }} 段</option>
              </select>
              <span class="app-muted render-duration-hint">会分别生成并入库</span>
            </div>
            <div class="render-form-field render-form-field-inline">
              <label>单段时长</label>
              <select v-model.number="carSegmentDuration" :disabled="busy">
                <option v-for="n in carSegmentDurationOptions" :key="n" :value="n">
                  {{ n }} 秒
                </option>
              </select>
              <span class="app-muted render-duration-hint">{{ carDurationHint }}，总片约 {{ carTotalDuration }} 秒</span>
            </div>
          </div>

          <details class="render-details">
            <summary>
              <span>可选销售信息</span>
              <small>车型、客户、卖点等应优先在脚本/分镜阶段整理，这里只做最终补充</small>
            </summary>
            <div class="render-details-body">
              <div class="render-grid-two">
                <div class="render-form-field">
                  <label>车型</label>
                  <input v-model.trim="carBrandModel" :disabled="busy" placeholder="例如：比亚迪秦 PLUS DM-i" />
                </div>
                <div class="render-form-field">
                  <label>目标客户</label>
                  <input v-model.trim="carAudience" :disabled="busy" placeholder="例如：家庭通勤 / 首购 / 置换客户" />
                </div>
              </div>

              <div class="render-form-field">
                <label>转化引导</label>
                <input v-model.trim="carCallToAction" :disabled="busy" placeholder="例如：预约试驾，私信领取到店权益" />
              </div>

              <div class="render-form-field">
                <label>卖点与优惠</label>
                <textarea
                  v-model="carSellingPoints"
                  :disabled="busy"
                  rows="3"
                  maxlength="1000"
                  placeholder="输入配置、价格、金融政策、到店礼、试驾权益等"
                />
              </div>
            </div>
          </details>

          <details class="render-details">
            <summary>
              <span>高级微调</span>
              <small>一般不用改；前序改写、分镜和口播应在各自模块完成</small>
            </summary>
            <div class="render-details-body">
              <div class="render-form-field">
                <label>分镜画面参考</label>
                <textarea
                  v-model="carStoryboardContext"
                  :disabled="busy"
                  rows="4"
                  maxlength="4000"
                  placeholder="选择分镜资产后会自动填入；这里只保留画面、节奏、场景"
                />
              </div>

              <div class="render-form-field">
                <label>口播文案参考</label>
                <textarea
                  v-model="carVoiceContext"
                  :disabled="busy"
                  rows="3"
                  maxlength="4000"
                  placeholder="仅在未选择口播音频时作为文案参考"
                />
              </div>

              <div class="render-form-field">
                <label>补充镜头要求</label>
                <textarea
                  v-model="prompt"
                  :disabled="busy"
                  rows="3"
                  maxlength="500"
                  placeholder="例如：门店实拍风格、竖屏短视频、镜头运动更稳、突出车灯和内饰"
                />
              </div>
            </div>
          </details>
        </template>

        <template v-if="mainTab === 'image' && imageSubTab === 'first'">
          <ImageInput
            label="首帧图片"
            :busy="busy"
            :value="firstFrame"
            @update="firstFrame = $event"
          />
        </template>

        <template v-else-if="mainTab === 'image' && imageSubTab === 'firstLast'">
          <div class="render-grid-two">
            <ImageInput
              label="首帧图片"
              :busy="busy"
              :value="firstFrame"
              @update="firstFrame = $event"
            />
            <ImageInput
              label="尾帧图片"
              :busy="busy"
              :value="lastFrame"
              @update="lastFrame = $event"
            />
          </div>
        </template>

        <template v-else-if="mainTab === 'image' && imageSubTab === 'reference'">
          <div class="render-form-field">
            <div class="render-field-head">
              <label>参照图（1 ~ 9 张，推荐 1 ~ 4 张）</label>
              <button
                type="button"
                class="app-secondary-button render-mini-btn"
                :disabled="busy || referenceImages.length >= MAX_REFERENCE"
                @click="addReferenceSlot"
              >
                + 添加一张
              </button>
            </div>
            <div class="render-ref-list">
              <div
                v-for="(item, idx) in referenceImages"
                :key="`ref-${idx}`"
                class="render-ref-item"
              >
                <div class="render-ref-index">[图{{ idx + 1 }}]</div>
                <ImageInput
                  :busy="busy"
                  :value="item"
                  compact
                  @update="updateReferenceImage(idx, $event)"
                />
                <button
                  type="button"
                  class="render-ref-remove"
                  :disabled="busy || referenceImages.length <= 1"
                  title="移除该参照图"
                  @click="removeReferenceSlot(idx)"
                >
                  ×
                </button>
              </div>
            </div>
            <p class="app-muted render-ref-tip">
              提示词中可使用 [图1]、[图2] 等标记指代具体参照图，模型对指令的遵循会更精准。
            </p>
          </div>
        </template>

        <div v-if="mainTab !== 'digitalHuman' && mainTab !== 'carSales'" class="render-form-field">
          <label>
            提示词
            <span v-if="mainTab === 'text'" class="render-required">*</span>
            <span v-else class="render-optional">（选填）</span>
          </label>
          <textarea
            v-model="prompt"
            :placeholder="promptPlaceholder"
            rows="4"
            :disabled="busy"
            maxlength="500"
          />
          <div class="render-counter">{{ prompt.length }} / 500</div>
        </div>

        <div v-if="mainTab !== 'digitalHuman' && mainTab !== 'carSales'" class="render-form-field render-form-field-inline">
          <label>视频时长（秒）</label>
          <select v-model.number="duration" :disabled="busy">
            <option v-for="d in durationOptions" :key="d.value" :value="d.value">
              {{ d.label }}
            </option>
          </select>
          <span class="app-muted render-duration-hint">{{ durationHint }}</span>
        </div>

        <div
          v-if="showModelSelector"
          class="render-form-field render-form-field-inline"
        >
          <label>生成模型</label>
          <div
            ref="modelDropdownRef"
            class="render-model-dropdown"
            :class="{ open: modelDropdownOpen, disabled: busy }"
          >
            <button
              type="button"
              class="render-model-trigger"
              :disabled="busy"
              :aria-expanded="modelDropdownOpen"
              aria-haspopup="listbox"
              @click="toggleModelDropdown"
              @keydown.esc.stop.prevent="closeModelDropdown"
            >
              <span>{{ selectedModelLabel }}</span>
              <span class="render-model-caret" aria-hidden="true">▾</span>
            </button>
            <ul v-if="modelDropdownOpen" class="render-model-options" role="listbox">
              <li
                v-for="opt in seedanceModelOptions"
                :key="opt.value"
                class="render-model-option"
                :class="{ active: selectedModel === opt.value, 'has-tip': !!opt.tip }"
                role="option"
                :aria-selected="selectedModel === opt.value"
                :data-tip="opt.tip || null"
                @click="selectModel(opt.value)"
              >
                <span>{{ opt.label }}</span>
              </li>
            </ul>
          </div>
        </div>

        <section v-if="mainTab === 'carSales'" class="render-basis-panel" aria-label="生成依据检查">
          <div class="render-basis-head">
            <h3>生成依据检查</h3>
            <span :class="carGenerationBlockingMessages.length ? 'danger' : 'ok'">
              {{ carGenerationBlockingMessages.length ? '需修正' : '可生成' }}
            </span>
          </div>
          <p>{{ carGenerationBasisSummary }}</p>
          <dl class="render-basis-grid">
            <div v-for="row in carGenerationBasisRows" :key="row.label">
              <dt>{{ row.label }}</dt>
              <dd>{{ row.value }}</dd>
            </div>
          </dl>
          <div v-if="carGenerationBlockingMessages.length" class="render-basis-alert danger">
            <strong>提交前需要处理：</strong>
            <span v-for="item in carGenerationBlockingMessages" :key="item">{{ item }}</span>
          </div>
          <div v-if="carGenerationWarnings.length" class="render-basis-alert warn">
            <strong>生成提示：</strong>
            <span v-for="item in carGenerationWarnings" :key="item">{{ item }}</span>
          </div>
        </section>
      </div>

      <BillingEstimateBanner
        :estimated-credit-cost="renderEstimate.estimatedCreditCost.value"
        :balance="renderEstimate.balance.value"
        :loading="renderEstimate.loading.value"
        :steps="renderEstimate.steps.value"
      />

      <div class="render-actions">
        <button
          class="app-primary-button"
          type="button"
          :disabled="!canSubmit || busy || !!renderEstimate.insufficientHint.value"
          :title="renderEstimate.insufficientHint.value || carGenerationBlockingMessages[0] || ''"
          @click="handleGenerate"
        >
          {{ busy ? '生成中…' : '开始生成视频' }}
        </button>
        <button
          v-if="result || errorMessage"
          class="app-secondary-button"
          type="button"
          :disabled="busy"
          @click="resetResult"
        >
          重新开始
        </button>
      </div>

      <p v-if="errorMessage" class="app-error">{{ errorMessage }}</p>
    </section>

    <section class="app-card render-result">
      <div class="app-section-title">
        <span>2</span>
        <div>
          <h2>生成结果</h2>
          <p class="app-muted">
            视频由火山方舟同步生成，请耐心等待 1~3 分钟。生成后可直接预览或下载。
          </p>
        </div>
      </div>

      <div v-if="busy" class="render-status">
        <span class="render-status-dot" />
        正在生成视频，预计 1~3 分钟，期间请勿关闭页面…
      </div>

      <div v-if="showTaskProgress" class="render-digital-progress">
        <div
          class="render-progress-track"
          role="progressbar"
          :aria-valuemin="0"
          :aria-valuemax="100"
          :aria-valuenow="barProgressPercent"
        >
          <div class="render-progress-fill" :style="{ width: `${barProgressPercent}%` }" />
        </div>
        <span>{{ barProgressPercent }}%</span>
      </div>
      <p v-if="digitalHumanTaskError" class="app-error">{{ digitalHumanTaskError }}</p>

      <div v-if="!busy && !result" class="app-empty render-empty">
        生成完成后，视频会自动展示在这里。
      </div>

      <div v-if="result" class="render-video">
        <video :src="result.videoUrl" controls preload="metadata" />
        <div class="render-video-meta">
          <div class="render-meta-row">
            <span class="render-meta-key">任务 ID</span>
            <span class="render-meta-value">{{ result.taskId }}</span>
          </div>
          <div class="render-meta-row">
            <span class="render-meta-key">使用模型</span>
            <span class="render-meta-value">{{ result.model }}</span>
          </div>
          <div class="render-meta-row">
            <span class="render-meta-key">消耗 tokens</span>
            <span class="render-meta-value">{{ result.completionTokens }}</span>
          </div>
          <div class="render-meta-row">
            <span class="render-meta-key">完成时间</span>
            <span class="render-meta-value">{{ formatTimestamp(result.updatedAt) }}</span>
          </div>
        </div>
        <div class="render-video-actions">
          <a class="app-primary-button" :href="result.videoUrl" target="_blank" rel="noreferrer" download>
            下载视频
          </a>
          <a class="app-secondary-button" :href="result.videoUrl" target="_blank" rel="noreferrer">
            在新窗口打开
          </a>
        </div>
        <div v-if="result.segmentVideos?.length" class="render-segment-list">
          <h3>分段视频</h3>
          <div class="render-segment-grid">
            <article
              v-for="(segment, idx) in result.segmentVideos"
              :key="segment.resultAssetId || segment.taskId || idx"
              class="render-segment-item"
            >
              <video :src="segment.videoUrl" controls preload="metadata" />
              <div>
                <strong>片段 {{ idx + 1 }}</strong>
                <small>资产 ID：{{ segment.resultAssetId || '-' }}</small>
              </div>
              <a :href="segment.videoUrl" target="_blank" rel="noreferrer">打开</a>
            </article>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AssetPicker from './AssetPicker.vue'
import ImageInput from './ImageInput.vue'
import { useSmoothTaskProgress } from '../../composables/useSmoothTaskProgress'
import { API_ORIGIN, getAuthToken } from '../../services/request'
import BillingEstimateBanner from '../../components/business/BillingEstimateBanner.vue'
import { useBillingEstimate } from '../../composables/useBillingEstimate'
import { rememberSessionTaskId } from '../../services/sessionTaskStore'
import { trackTaskResult } from '../../services/taskRealtime'
import { uploadFile } from '../../services/uploadApi'
import { getAssetTextContent, uploadMaterialAsset } from '../../services/assetApi'
import {
  generateCarSalesVideo,
  generateDigitalHumanVideo,
  generateFirstFrameVideo,
  generateFirstLastFrameVideo,
  generateReferenceVideo,
  generateTextToVideo,
  getDigitalHumanVideoTask,
  newVideoIdempotencyKey,
} from '../../services/videoApi'
import type { DigitalHumanTaskDetailResponse, VideoScriptShotItem, VideoTaskVO } from '../../types/videoTypes'
import type { AssetItem } from '../../types/assetTypes'


type MainTab = 'text' | 'image' | 'carSales' | 'digitalHuman'
type ImageSubTab = 'first' | 'firstLast' | 'reference'
type DigitalHumanAudioMode = 'asset' | 'upload' | 'url' | 'text'
type CarAudioMode = 'none' | 'post_mix' | 'reference'
type SeedanceModelValue = 'doubao-seedance-1-5-pro-251215' | 'ep-20260512233524-85r4g'

const MAX_REFERENCE = 9
const SEEDANCE_2_MODEL: SeedanceModelValue = 'ep-20260512233524-85r4g'

const seedanceModelOptions: Array<{
  value: SeedanceModelValue
  label: string
  tip?: string
  maxDuration: number
}> = [
  { value: 'doubao-seedance-1-5-pro-251215', label: 'seedance1.5', maxDuration: 12 },
  { value: SEEDANCE_2_MODEL, label: 'seedance2.0', tip: '不支持上传人脸', maxDuration: 15 },
]

const mainTabs: Array<{ key: MainTab; label: string }> = [
  { key: 'carSales', label: '汽车销售成片' },
  { key: 'text', label: '文生视频' },
  { key: 'image', label: '图生视频' },
  { key: 'digitalHuman', label: '数字人口播' },
]

/** 临时开关：设为 true 可恢复「数字人口播」主 Tab 入口（不删逻辑与数据结构） */
const ENABLE_DIGITAL_HUMAN_TAB = false

const visibleMainTabs = computed(() =>
  ENABLE_DIGITAL_HUMAN_TAB ? mainTabs : mainTabs.filter((t) => t.key !== 'digitalHuman'),
)

const imageSubTabs: Array<{ key: ImageSubTab; label: string }> = [
  { key: 'first', label: '首帧生成' },
  { key: 'firstLast', label: '首尾帧生成' },
  { key: 'reference', label: '参照图生成' },
]

const digitalHumanAudioTabs: Array<{ key: DigitalHumanAudioMode; label: string }> = [
  { key: 'asset', label: '资产音频' },
  { key: 'upload', label: '上传音频' },
  { key: 'url', label: '音频链接' },
  { key: 'text', label: '文本口播' },
]

const mainTab = ref<MainTab>('carSales')
const imageSubTab = ref<ImageSubTab>('first')

watch(
  () => mainTab.value,
  (tab) => {
    if (!ENABLE_DIGITAL_HUMAN_TAB && tab === 'digitalHuman') {
      mainTab.value = 'text'
    }
  },
  { immediate: true },
)

const selectedModel = ref<SeedanceModelValue>('doubao-seedance-1-5-pro-251215')
const modelDropdownOpen = ref(false)
const modelDropdownRef = ref<HTMLElement | null>(null)

const prompt = ref('')
const duration = ref<number>(5)
const firstFrame = ref('')
const lastFrame = ref('')
const referenceImages = ref<string[]>([''])
const digitalHumanImage = ref('')
const digitalHumanAudio = ref('')
const digitalHumanText = ref('')
const digitalHumanVoiceId = ref('')
const digitalHumanResolution = ref<'540p' | '720p' | '1080p'>('720p')
const digitalHumanAudioMode = ref<DigitalHumanAudioMode>('asset')
const digitalHumanAudioUploading = ref(false)
const digitalHumanAudioUploadName = ref('')
const carImages = ref<string[]>([''])
const carPickedImageUrl = ref('')
const carBrandModel = ref('')
const carAudience = ref('')
const carCallToAction = ref('预约试驾，私信领取到店权益')
const carSellingPoints = ref('')
const carStoryboardContext = ref('')
const carStoryboardAssetUrl = ref('')
const carStoryboardAssetId = ref<number | null>(null)
const carVoiceContext = ref('')
const carBenchmarkAssetUrl = ref('')
const carBenchmarkAssetId = ref<number | null>(null)
const carAudioUrl = ref('')
const carAudioAssetId = ref<number | null>(null)
const carAudioSourceType = ref('')
const carAudioMode = ref<CarAudioMode>('none')
const carAudioUploading = ref(false)
const carAudioUploadName = ref('')
const carBgmUrl = ref('')
const carBgmAssetId = ref<number | null>(null)
const carBgmSourceType = ref('')
const carBgmUploading = ref(false)
const carBgmUploadName = ref('')
const carAudioDurationSeconds = ref<number | null>(null)
const carHostImageUrl = ref('')
const carHostImageAssetId = ref<number | null>(null)
const carMaterialVideoUrl = ref('')
const carMaterialVideoAssetId = ref<number | null>(null)
const carSegmentCount = ref(4)
const carSegmentDuration = ref(8)

const loggedIn = ref(false)

/**
 * 当前 Tab 对应的预扣 task_type：
 *   文生视频 → TEXT_TO_VIDEO_SEEDANCE_1_5（默认主力模型；2.0 价格不同，但前端展示以 1.5 为基线，
 *              提交时后端 createTask 会按真实 request 的 modelCode 重新解析，依旧能保证"前后一致"）
 *   图生视频（首帧 / 首尾帧） → IMAGE_TO_VIDEO_SEEDANCE_1_5
 *   图生视频（参照图）         → IMAGE_TO_VIDEO_SEEDANCE_2_0_FAST
 *   数字人口播                 → DIGITAL_HUMAN_GENERATE
 */
const currentRenderTaskType = computed(() => {
  if (mainTab.value === 'digitalHuman') return 'DIGITAL_HUMAN_GENERATE'
  if (mainTab.value === 'carSales') return 'SEEDANCE_CAR_SALES_VIDEO'
  if (mainTab.value === 'text') return 'TEXT_TO_VIDEO_SEEDANCE_1_5'
  if (imageSubTab.value === 'reference') return 'IMAGE_TO_VIDEO_SEEDANCE_2_0_FAST'
  return 'IMAGE_TO_VIDEO_SEEDANCE_1_5'
})

// 一份预估 + Tab 切换自动重取；与后端 createTask 实际预扣金额保持一致，不允许任何前端写死。
const renderEstimate = useBillingEstimate({ taskType: () => currentRenderTaskType.value })

async function refreshLocalBalance() {
  await renderEstimate.refresh()
}

const busy = ref(false)
const errorMessage = ref('')
const result = ref<VideoTaskVO | null>(null)
const taskStatus = ref('')
const taskProgress = ref<number | null>(null)
const activeDigitalHumanTaskId = ref<number | null>(null)
const activeSeedanceTaskId = ref<number | null>(null)
const digitalHumanTaskError = ref('')
/** 单次数字人口播提交周期内复用 Idempotency-Key */
const digitalHumanIdempotencyKey = ref<string | null>(null)
const { showTaskProgressBar, barProgressPercent, reset: resetSmoothProgress } = useSmoothTaskProgress(
  taskStatus,
  taskProgress,
)
const showTaskProgress = computed(
  () => showTaskProgressBar.value || !!activeDigitalHumanTaskId.value || !!activeSeedanceTaskId.value,
)
let digitalHumanPollTimer: number | null = null
let stopSeedanceTaskTracking: (() => void) | null = null

const selectedSeedanceModel = computed(
  () => seedanceModelOptions.find((o) => o.value === selectedModel.value) ?? seedanceModelOptions[0],
)

// seedance1.5 支持 [4, 12]，seedance2.0 支持 [4, 15]，参照图（lite i2v）支持 [2, 12]
const durationOptions = computed(() => {
  if (mainTab.value === 'image' && imageSubTab.value === 'reference') {
    return [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((v) => ({ value: v, label: `${v} 秒` }))
  }
  return Array.from({ length: selectedSeedanceModel.value.maxDuration - 3 }, (_, idx) => idx + 4).map((v) => ({
    value: v,
    label: `${v} 秒`,
  }))
})

const durationHint = computed(() => {
  if (mainTab.value === 'image' && imageSubTab.value === 'reference') {
    return 'lite i2v 模型支持 2 ~ 12 秒'
  }
  return `${selectedSeedanceModel.value.label} 支持 4 ~ ${selectedSeedanceModel.value.maxDuration} 秒`
})

const carSegmentDurationOptions = computed(() =>
  Array.from({ length: selectedSeedanceModel.value.maxDuration - 3 }, (_, idx) => idx + 4),
)

const carDurationHint = computed(
  () => `${selectedSeedanceModel.value.label} 单段支持 4 ~ ${selectedSeedanceModel.value.maxDuration} 秒`,
)

const isSeedance2Selected = computed(() => selectedModel.value === SEEDANCE_2_MODEL)
const canUseAudioReference = computed(
  () => !!carAudioUrl.value.trim() && isSeedance2Selected.value && carSegmentCount.value === 1,
)

const audioReferenceHint = computed(() => {
  if (!carAudioUrl.value.trim()) {
    return '选择音频后可决定是否参与视频生成。'
  }
  if (!isSeedance2Selected.value) {
    return '参考音频生成仅支持 seedance2.0；seedance1.5 只能后期口播配音。'
  }
  if (carSegmentCount.value !== 1) {
    return '参考音频生成当前仅支持 1 段视频；多段成片建议使用后期口播配音。'
  }
  return 'seedance2.0 会把音频作为生成参考，并在成片中使用该音频。'
})

const showModelSelector = computed(() => {
  if (mainTab.value === 'carSales') {
    return true
  }
  if (mainTab.value === 'text') {
    return true
  }
  if (mainTab.value === 'image') {
    return imageSubTab.value === 'first' || imageSubTab.value === 'firstLast'
  }
  return false
})

const selectedModelLabel = computed(() => selectedSeedanceModel.value.label)

function selectModel(value: SeedanceModelValue) {
  selectedModel.value = value
  modelDropdownOpen.value = false
}

function toggleModelDropdown() {
  if (busy.value) return
  modelDropdownOpen.value = !modelDropdownOpen.value
}

function closeModelDropdown() {
  modelDropdownOpen.value = false
}

function handleModelDropdownPointerDown(event: PointerEvent) {
  if (!modelDropdownOpen.value) return
  const target = event.target
  if (target instanceof Node && modelDropdownRef.value?.contains(target)) {
    return
  }
  closeModelDropdown()
}

function handleModelDropdownKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeModelDropdown()
  }
}

const promptPlaceholder = computed(() => {
  if (mainTab.value === 'text') {
    return '描述你想要的画面，例如：小猫对着镜头打哈欠，慵懒的午后阳光，景深浅'
  }
  if (imageSubTab.value === 'reference') {
    return '可使用 [图1]xxx，[图2]xxx 形式指代参照图，例如：[图1]戴眼镜穿蓝色T恤的男生在[图2]的篮球场上'
  }
  return '可选，描述视频中的运动 / 风格 / 镜头，例如：360 度环绕运镜，电影感'
})

const digitalHumanAudioReady = computed(() => {
  if (digitalHumanAudioMode.value === 'text') {
    return digitalHumanText.value.trim().length > 0
  }
  return digitalHumanAudio.value.trim().length > 0
})

const carImageUrls = computed(() => carImages.value.map((url) => url.trim()).filter((url) => url.length > 0))
const carTotalDuration = computed(() => carSegmentCount.value * carSegmentDuration.value)

const storyboardShotsForRecommendation = computed(() => extractStoryboardShots(carStoryboardContext.value))
const storyboardDurationSeconds = computed(() => storyboardTotalDuration(storyboardShotsForRecommendation.value))
const carRecommendedSegmentCount = computed(() => {
  if (carAudioMode.value === 'reference' && carAudioUrl.value.trim()) {
    return 1
  }
  const shotCount = storyboardShotsForRecommendation.value.length
  if (shotCount > 0) {
    return Math.max(1, Math.min(6, shotCount))
  }
  if (carAudioDurationSeconds.value && carAudioDurationSeconds.value > 0) {
    return Math.max(1, Math.min(6, Math.ceil(carAudioDurationSeconds.value / selectedSeedanceModel.value.maxDuration)))
  }
  return Math.max(1, Math.min(6, carSegmentCount.value || 4))
})
const carRecommendedSegmentDuration = computed(() => {
  const count = carRecommendedSegmentCount.value
  if (carAudioMode.value === 'reference' && carAudioDurationSeconds.value) {
    return clampCarSegmentDuration(Math.ceil(carAudioDurationSeconds.value))
  }
  if (storyboardDurationSeconds.value) {
    return clampCarSegmentDuration(Math.ceil(storyboardDurationSeconds.value / count))
  }
  if (carAudioDurationSeconds.value) {
    return clampCarSegmentDuration(Math.ceil(carAudioDurationSeconds.value / count))
  }
  return clampCarSegmentDuration(carSegmentDuration.value || 8)
})
const carRecommendedTotalDuration = computed(
  () => carRecommendedSegmentCount.value * carRecommendedSegmentDuration.value,
)
const carRecommendationSummary = computed(
  () => `${carRecommendedSegmentCount.value} 段 × ${carRecommendedSegmentDuration.value} 秒，总约 ${carRecommendedTotalDuration.value} 秒`,
)
const carRecommendationReasonText = computed(() => {
  const reasons: string[] = []
  const shotCount = storyboardShotsForRecommendation.value.length
  if (shotCount > 0) {
    reasons.push(`已选分镜包含 ${shotCount} 个镜头`)
  }
  if (storyboardDurationSeconds.value) {
    reasons.push(`分镜标注时长约 ${formatSeconds(storyboardDurationSeconds.value)}`)
  }
  if (carAudioDurationSeconds.value) {
    reasons.push(`口播音频约 ${formatSeconds(carAudioDurationSeconds.value)}`)
  }
  if (carAudioMode.value === 'reference') {
    reasons.push('参考音频生成当前按单段处理')
  }
  reasons.push(`${selectedSeedanceModel.value.label} 单段最长 ${selectedSeedanceModel.value.maxDuration} 秒`)
  return reasons.join('；')
})
const recommendationMatchesCurrent = computed(
  () =>
    carSegmentCount.value === carRecommendedSegmentCount.value &&
    carSegmentDuration.value === carRecommendedSegmentDuration.value,
)

// 切换模式时重置错误与结果，避免误展示其它模式产物
watch([mainTab, imageSubTab, selectedModel], () => {
  errorMessage.value = ''
  const allowed = durationOptions.value.map((o) => o.value)
  const min = allowed[0] ?? 4
  const max = allowed[allowed.length - 1] ?? min
  if (duration.value < min) {
    duration.value = min
  } else if (duration.value > max) {
    duration.value = max
  } else if (!allowed.includes(duration.value)) {
    duration.value = min
  }
  const carAllowed = carSegmentDurationOptions.value
  const carMin = carAllowed[0] ?? 4
  const carMax = carAllowed[carAllowed.length - 1] ?? carMin
  if (carSegmentDuration.value < carMin) {
    carSegmentDuration.value = carMin
  } else if (carSegmentDuration.value > carMax) {
    carSegmentDuration.value = carMax
  } else if (!carAllowed.includes(carSegmentDuration.value)) {
    carSegmentDuration.value = carMin
  }
})

let audioDurationRequestId = 0
watch(
  () => carAudioUrl.value,
  (url) => {
    const requestId = ++audioDurationRequestId
    carAudioDurationSeconds.value = null
    const cleanUrl = url.trim()
    if (!cleanUrl) return
    resolveAudioDuration(cleanUrl).then((seconds) => {
      if (requestId === audioDurationRequestId) {
        carAudioDurationSeconds.value = seconds
      }
    })
  },
)

const canSubmit = computed(() => {
  if (mainTab.value === 'digitalHuman') {
    if (digitalHumanAudioMode.value === 'text') {
      return digitalHumanImage.value.trim().length > 0 && digitalHumanText.value.trim().length > 0
    }
    return digitalHumanImage.value.trim().length > 0 && digitalHumanAudio.value.trim().length > 0
  }
  if (mainTab.value === 'text') {
    return prompt.value.trim().length > 0
  }
  if (mainTab.value === 'carSales') {
    return carImageUrls.value.length > 0 && carGenerationBlockingMessages.value.length === 0
  }
  if (imageSubTab.value === 'first') {
    return firstFrame.value.trim().length > 0
  }
  if (imageSubTab.value === 'firstLast') {
    return firstFrame.value.trim().length > 0 && lastFrame.value.trim().length > 0
  }
  // reference
  return referenceImages.value.some((url) => url.trim().length > 0)
})

function addReferenceSlot() {
  if (referenceImages.value.length >= MAX_REFERENCE) {
    return
  }
  referenceImages.value.push('')
}

function removeReferenceSlot(idx: number) {
  if (referenceImages.value.length <= 1) {
    return
  }
  referenceImages.value.splice(idx, 1)
}

function updateReferenceImage(idx: number, value: string) {
  referenceImages.value[idx] = value
}

function addCarImageSlot() {
  if (carImages.value.length >= MAX_REFERENCE) {
    return
  }
  carImages.value.push('')
}

function removeCarImageSlot(idx: number) {
  if (carImages.value.length <= 1) {
    return
  }
  carImages.value.splice(idx, 1)
}

function updateCarImage(idx: number, value: string) {
  carImages.value[idx] = value
}

function handleCarImageAssetSelect(payload: { asset: AssetItem; url: string }) {
  carPickedImageUrl.value = payload.url
  const emptyIndex = carImages.value.findIndex((url) => !url.trim())
  if (emptyIndex >= 0) {
    carImages.value[emptyIndex] = payload.url
  } else if (!carImages.value.includes(payload.url) && carImages.value.length < MAX_REFERENCE) {
    carImages.value.push(payload.url)
  }
}

async function handleCarStoryboardAssetSelect(payload: { asset: AssetItem; url: string }) {
  carStoryboardAssetUrl.value = payload.url
  carStoryboardAssetId.value = payload.asset.assetId
  try {
    const text = await getAssetTextContent(payload.asset)
    carStoryboardContext.value = text.length > 4000 ? text.slice(0, 4000) : text
    const shots = extractStoryboardShots(carStoryboardContext.value)
    if (shots.length > 0) {
      const count = Math.max(1, Math.min(6, shots.length))
      carSegmentCount.value = count
      const total = storyboardTotalDuration(shots)
      if (total) {
        carSegmentDuration.value = clampCarSegmentDuration(Math.ceil(total / count))
      }
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '分镜资产读取失败'
  }
}

async function handleCarBenchmarkAssetSelect(payload: { asset: AssetItem; url: string }) {
  carBenchmarkAssetUrl.value = payload.url
  carBenchmarkAssetId.value = payload.asset.assetId
  try {
    const text = await getAssetTextContent(payload.asset)
    carVoiceContext.value = text.length > 4000 ? text.slice(0, 4000) : text
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '爆款文案读取失败'
  }
}

function handleCarAudioAssetSelect(payload: { asset: AssetItem; url: string }) {
  carAudioUrl.value = payload.url
  carAudioAssetId.value = payload.asset.assetId
  carAudioSourceType.value = payload.asset.sourceType || ''
  carAudioUploadName.value = payload.asset.fileName
  if (carAudioMode.value === 'none') {
    carAudioMode.value = 'post_mix'
  }
}

async function handleCarAudioUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }
  carAudioUploading.value = true
  carAudioUploadName.value = file.name
  errorMessage.value = ''
  try {
    const asset = await uploadMaterialAsset(file)
    carAudioUrl.value = normalizePublicUrl(asset.fileUrl)
    carAudioAssetId.value = asset.assetId
    carAudioSourceType.value = asset.sourceType || 'USER_UPLOAD'
    if (carAudioMode.value === 'none') {
      carAudioMode.value = 'post_mix'
    }
    ElMessage.success('音频已上传到资产中心')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '音频上传失败'
  } finally {
    carAudioUploading.value = false
    input.value = ''
  }
}

function handleCarBgmAssetSelect(payload: { asset: AssetItem; url: string }) {
  carBgmUrl.value = payload.url
  carBgmAssetId.value = payload.asset.assetId
  carBgmSourceType.value = payload.asset.sourceType || ''
  carBgmUploadName.value = payload.asset.fileName
}

async function handleCarBgmUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }
  carBgmUploading.value = true
  carBgmUploadName.value = file.name
  errorMessage.value = ''
  try {
    const asset = await uploadMaterialAsset(file)
    carBgmUrl.value = normalizePublicUrl(asset.fileUrl)
    carBgmAssetId.value = asset.assetId
    carBgmSourceType.value = asset.sourceType || 'USER_UPLOAD'
    ElMessage.success('BGM 已上传到资产中心')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'BGM 上传失败'
  } finally {
    carBgmUploading.value = false
    input.value = ''
  }
}

function handleCarHostImageAssetSelect(payload: { asset: AssetItem; url: string }) {
  carHostImageUrl.value = payload.url
  carHostImageAssetId.value = payload.asset.assetId
}

function handleCarMaterialVideoAssetSelect(payload: { asset: AssetItem; url: string }) {
  carMaterialVideoUrl.value = payload.url
  carMaterialVideoAssetId.value = payload.asset.assetId
}

type StoryboardRecord = Record<string, unknown>

function asRecord(value: unknown): StoryboardRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as StoryboardRecord) : null
}

function stringField(record: StoryboardRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
    if (typeof value === 'number') {
      return String(value)
    }
  }
  return ''
}

const STORYBOARD_IGNORED_FIELD_KEYS = ['content', 'voiceText', 'backgroundMusic']

function parseJsonSafely(raw: string): unknown | null {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function extractStoryboardShots(raw: string): VideoScriptShotItem[] {
  const parsed = parseJsonSafely(raw.trim())
  const source = Array.isArray(parsed)
    ? parsed
    : Array.isArray(asRecord(parsed)?.scripts)
      ? (asRecord(parsed)?.scripts as unknown[])
      : Array.isArray(asRecord(parsed)?.shots)
        ? (asRecord(parsed)?.shots as unknown[])
        : []
  return source
    .map((item, idx) => {
      const record = asRecord(item)
      if (!record) return null
      const orderValue = record.order
      const order = typeof orderValue === 'number' ? orderValue : Number(orderValue) || idx + 1
      return {
        order,
        time: stringField(record, ['time', 'duration', 'range']),
        page: stringField(record, ['page', 'visual', 'scene', 'shot', 'picture']),
        backgroundMusic: stringField(record, ['backgroundMusic', 'bgm']),
        content: stringField(record, ['content', 'voiceText', 'script', 'voiceover', 'subtitle']),
        highlight: stringField(record, ['highlight', 'intent', 'goal']),
      }
    })
    .filter((item): item is VideoScriptShotItem => !!item && (!!item.page || !!item.highlight))
}

function collectStoryboardIgnoredFields(raw: string) {
  const ignored = new Set<string>()
  const parsed = parseJsonSafely(raw.trim())
  const walk = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }
    const record = asRecord(value)
    if (!record) return
    for (const key of Object.keys(record)) {
      if (STORYBOARD_IGNORED_FIELD_KEYS.includes(key)) {
        const v = record[key]
        if (typeof v === 'string' ? v.trim() : v != null) {
          ignored.add(key)
        }
      }
      walk(record[key])
    }
  }
  if (parsed != null) {
    walk(parsed)
  } else {
    for (const key of STORYBOARD_IGNORED_FIELD_KEYS) {
      const pattern = new RegExp(`["']?${key}["']?\\s*[:：]`, 'i')
      if (pattern.test(raw)) ignored.add(key)
    }
  }
  return Array.from(ignored)
}

function parseStoryboardDuration(time: string) {
  const seconds = parseStoryboardDurationRaw(time)
  if (seconds == null) return undefined
  return clampCarSegmentDuration(seconds)
}

function parseStoryboardDurationRaw(time: string) {
  const match = time.match(/(\d{1,2}):(\d{2}):(\d{2})(?:\.\d+)?\s*[-~—]\s*(\d{1,2}):(\d{2}):(\d{2})(?:\.\d+)?/)
  if (!match) return undefined
  const start = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])
  const end = Number(match[4]) * 3600 + Number(match[5]) * 60 + Number(match[6])
  const seconds = Math.round(end - start)
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined
  return seconds
}

function storyboardTotalDuration(shots: VideoScriptShotItem[]) {
  const durations = shots.map((shot) => parseStoryboardDurationRaw(shot.time)).filter((n): n is number => !!n)
  if (!durations.length) return null
  return durations.reduce((sum, value) => sum + value, 0)
}

function clampCarSegmentDuration(value: number) {
  const min = 4
  const max = selectedSeedanceModel.value.maxDuration
  return Math.max(min, Math.min(max, value))
}

function formatSeconds(seconds: number) {
  const rounded = Math.max(1, Math.round(seconds))
  if (rounded < 60) return `${rounded} 秒`
  const minutes = Math.floor(rounded / 60)
  const rest = rounded % 60
  return rest ? `${minutes} 分 ${rest} 秒` : `${minutes} 分钟`
}

function resolveAudioDuration(url: string) {
  return new Promise<number | null>((resolve) => {
    if (typeof Audio === 'undefined') {
      resolve(null)
      return
    }
    const audio = new Audio()
    const cleanup = () => {
      audio.removeAttribute('src')
      audio.load()
    }
    const timer = window.setTimeout(() => {
      cleanup()
      resolve(null)
    }, 8000)
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => {
      window.clearTimeout(timer)
      const duration = Number.isFinite(audio.duration) ? audio.duration : null
      cleanup()
      resolve(duration)
    }
    audio.onerror = () => {
      window.clearTimeout(timer)
      cleanup()
      resolve(null)
    }
    audio.src = url
  })
}

function applyCarRecommendation() {
  carSegmentCount.value = carRecommendedSegmentCount.value
  carSegmentDuration.value = carRecommendedSegmentDuration.value
}

function storyboardVisualText(shot: VideoScriptShotItem, idx: number) {
  const pieces = [`镜头${shot.order || idx + 1}`]
  if (shot.time) pieces.push(`时间 ${shot.time}`)
  if (shot.page) pieces.push(`画面 ${shot.page}`)
  if (shot.highlight) pieces.push(`重点 ${shot.highlight}`)
  return pieces.join('；')
}

function summarizeStoryboardForPrompt(raw: string) {
  const shots = extractStoryboardShots(raw)
  if (!shots.length) {
    return raw.trim()
  }
  return shots.map(storyboardVisualText).join('\n')
}

function hasSelectedVoiceAudio() {
  return carAudioMode.value !== 'none' && !!carAudioUrl.value.trim()
}

const storyboardIgnoredFields = computed(() => collectStoryboardIgnoredFields(carStoryboardContext.value))
const storyboardHasOldLines = computed(() => storyboardIgnoredFields.value.length > 0)
const storyboardOldLineStatus = computed(() => {
  if (!carStoryboardContext.value.trim()) return '未使用分镜'
  if (storyboardHasOldLines.value) return '已忽略'
  return '无旧台词'
})

function sourceTypeLabelForAudio(sourceType: string) {
  const normalized = sourceType.trim().toUpperCase()
  if (normalized === 'USER_UPLOAD' || !normalized) return '用户上传音频'
  if (['TTS_GENERATE', 'VOICE_SAMPLE', 'AI_GENERATED'].includes(normalized)) return '声音生成音频'
  return '已选择音频'
}

const carAudioSourceLabel = computed(() => {
  if (!hasSelectedVoiceAudio()) return '无'
  const audioKind = sourceTypeLabelForAudio(carAudioSourceType.value)
  if (carAudioMode.value === 'reference') return `参考音频生成（${audioKind}）`
  return `后期口播配音（${audioKind}）`
})

const carBgmSourceLabel = computed(() => (carBgmUrl.value.trim() ? '已选择 BGM' : '无'))
const carSubtitleSourceLabel = computed(() => {
  const suffix = storyboardHasOldLines.value ? '（不使用分镜旧台词）' : ''
  if (hasSelectedVoiceAudio()) return `口播音频转写 / 最终口播文案${suffix}`
  if (carVoiceContext.value.trim()) return `最终口播文案${suffix}`
  return '无'
})

const carVisualSourceLabel = computed(() => {
  const sources: string[] = []
  if (prompt.value.trim()) sources.push('用户输入提示词')
  if (carStoryboardContext.value.trim()) sources.push('分镜画面参考')
  if (carImageUrls.value.length > 0) {
    sources.push(isSeedance2Selected.value ? '参考图 / 车型图' : '车型图')
  }
  if (carHostImageUrl.value.trim()) sources.push('数字人形象参考')
  return sources.length ? sources.join('、') : '未选择'
})

const carSegmentModeLabel = computed(() => (carSegmentCount.value === 1 ? '单段' : `多段（${carSegmentCount.value} 段）`))

const carGenerationBlockingMessages = computed(() => {
  if (mainTab.value !== 'carSales') return []
  const messages: string[] = []
  if (carAudioMode.value === 'reference' && !isSeedance2Selected.value) {
    messages.push('参考音频生成仅支持 Seedance 2.0')
  }
  if (carAudioMode.value === 'reference' && carSegmentCount.value > 1) {
    messages.push('当前参考音频生成仅支持单段视频，多段请使用后期口播配音或拆段生成')
  }
  return messages
})

const carGenerationWarnings = computed(() => {
  if (mainTab.value !== 'carSales') return []
  const warnings: string[] = []
  if (hasSelectedVoiceAudio() && storyboardHasOldLines.value) {
    warnings.push('口播音频优先，分镜台词已忽略')
  }
  if (!hasSelectedVoiceAudio() && carBgmUrl.value.trim()) {
    warnings.push('BGM 不会生成口播、字幕或口型')
  }
  if (carAudioMode.value === 'post_mix' && carAudioUrl.value.trim()) {
    warnings.push('后期口播配音不保证口型同步，如需口型同步请使用参考音频生成或数字人口播链路')
  }
  return warnings
})

const carGenerationBasisRows = computed(() => [
  { label: '视频模型', value: selectedSeedanceModel.value.label },
  { label: '视频段数', value: carSegmentModeLabel.value },
  { label: '画面来源', value: carVisualSourceLabel.value },
  { label: '口播来源', value: carAudioSourceLabel.value },
  { label: 'BGM 来源', value: carBgmSourceLabel.value },
  { label: '字幕来源', value: carSubtitleSourceLabel.value },
  { label: '分镜旧台词处理', value: storyboardOldLineStatus.value },
])

const carGenerationBasisSummary = computed(() => {
  if (hasSelectedVoiceAudio()) {
    const bgmSentence = carBgmUrl.value.trim() ? 'BGM 只会作为背景音乐混入，不参与口型和字幕。' : ''
    const storyboardSentence = storyboardHasOldLines.value
      ? '分镜中的旧台词已被忽略，仅保留画面描述。'
      : carStoryboardContext.value.trim()
        ? '分镜只作为画面描述参考。'
        : '未使用分镜旧台词。'
    return `本次视频将以【口播音频】作为内容主导，${storyboardSentence}${bgmSentence}`
  }
  if (carBgmUrl.value.trim()) {
    return '本次视频只选择了 BGM，它只会作为背景音乐混入，不会生成口播、字幕或口型。'
  }
  if (carStoryboardContext.value.trim()) {
    return '本次视频将使用分镜中的画面描述控制镜头，分镜旧台词和背景音乐字段不会作为口播或字幕来源。'
  }
  return '本次视频将以车型图、补充提示词和销售信息作为主要生成依据。'
})

function buildCarScriptContext() {
  const parts: string[] = []
  if (carStoryboardContext.value.trim()) {
    parts.push(`分镜画面参考（仅用于镜头画面，不作为口播、字幕或 BGM 来源）：${summarizeStoryboardForPrompt(carStoryboardContext.value)}`)
  }
  if (hasSelectedVoiceAudio()) {
    parts.push('内容主导：已选择口播/配音音频，口型、字幕和节奏以该音频为准；分镜和爆款对标文案只作为画面参考。')
  } else if (carVoiceContext.value.trim()) {
    parts.push(`口播文案参考：${carVoiceContext.value.trim()}`)
  }
  return parts.join('\n\n')
}

function buildCarSalesScenes() {
  const storyboardShots = extractStoryboardShots(carStoryboardContext.value)
  if (storyboardShots.length > 0) {
    return storyboardShots.slice(0, carSegmentCount.value).map((shot, idx) => ({
      segmentIndex: idx + 1,
      title: `镜头 ${shot.order || idx + 1}`,
      visualPrompt: storyboardVisualText(shot, idx),
      prompt: storyboardVisualText(shot, idx),
      imageUrls: carImageUrls.value,
      referenceImage: carImageUrls.value[0],
      voiceText: hasSelectedVoiceAudio() ? undefined : carVoiceContext.value.trim() || undefined,
      duration: parseStoryboardDuration(shot.time) || carSegmentDuration.value,
    }))
  }
  const titles = ['外观开场', '内饰空间', '核心卖点', '到店转化', '用车场景', '优惠收口']
  const prompts = [
    '展示车辆外观、车头、车身线条和灯光质感，镜头稳定推进。',
    '展示内饰、座椅、空间、屏幕和舒适体验。',
    '突出动力、智能、安全、油耗/续航或核心配置卖点。',
    '展示试驾邀约、到店权益、咨询引导和成交氛围。',
    '展示城市通勤、家庭出行或周末短途场景。',
    '用车身高光细节和优惠信息氛围收口。',
  ]
  return Array.from({ length: carSegmentCount.value }, (_, idx) => ({
    segmentIndex: idx + 1,
    title: titles[idx] || `片段 ${idx + 1}`,
    visualPrompt: prompts[idx] || prompts[prompts.length - 1],
    prompt: prompts[idx] || prompts[prompts.length - 1],
    imageUrls: carImageUrls.value,
    referenceImage: carImageUrls.value[0],
    voiceText: hasSelectedVoiceAudio() ? undefined : carVoiceContext.value.trim() || undefined,
    duration: carSegmentDuration.value,
  }))
}

function carSourceAssetIds() {
  return [
    carStoryboardAssetId.value,
    carBenchmarkAssetId.value,
    carAudioAssetId.value,
    carBgmAssetId.value,
    carHostImageAssetId.value,
    carMaterialVideoAssetId.value,
  ].filter(
    (id): id is number => typeof id === 'number' && id > 0,
  )
}

function resetResult() {
  stopDigitalHumanPoll()
  stopSeedanceTracking()
  activeDigitalHumanTaskId.value = null
  activeSeedanceTaskId.value = null
  taskStatus.value = ''
  taskProgress.value = null
  digitalHumanTaskError.value = ''
  digitalHumanIdempotencyKey.value = null
  resetSmoothProgress()
  result.value = null
  errorMessage.value = ''
}

function formatTimestamp(seconds: number | null | undefined) {
  if (!seconds) {
    return '-'
  }
  const d = new Date(seconds * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function normalizePublicUrl(url: string) {
  if (!url) {
    return ''
  }
  return url.startsWith('http') ? url : `${API_ORIGIN}${url}`
}

async function handleDigitalHumanAudioUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }

  digitalHumanAudioUploadName.value = file.name
  digitalHumanAudioUploading.value = true
  errorMessage.value = ''

  try {
    const uploaded = await uploadFile(file)
    digitalHumanAudio.value = normalizePublicUrl(uploaded.previewUrl)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '音频上传失败'
  } finally {
    digitalHumanAudioUploading.value = false
    input.value = ''
  }
}

async function handleGenerate() {
  if (busy.value) {
    return
  }
  if (mainTab.value === 'carSales' && carGenerationBlockingMessages.value.length > 0) {
    const message = carGenerationBlockingMessages.value[0]
    errorMessage.value = message
    ElMessage.error(message)
    return
  }
  if (!canSubmit.value) {
    return
  }

  busy.value = true
  errorMessage.value = ''
  result.value = null
  digitalHumanTaskError.value = ''

  try {
    let submittedTaskId = 0
    let submittedStatus = 'QUEUED'
    if (mainTab.value === 'digitalHuman') {
      if (!digitalHumanIdempotencyKey.value) {
        digitalHumanIdempotencyKey.value = newVideoIdempotencyKey()
      }
      const useText = digitalHumanAudioMode.value === 'text'
      const submitted = await generateDigitalHumanVideo(
        {
          imageUrl: digitalHumanImage.value.trim(),
          audioUrl: useText ? undefined : digitalHumanAudio.value.trim(),
          text: useText ? digitalHumanText.value.trim() : undefined,
          voiceId: useText ? digitalHumanVoiceId.value.trim() || undefined : undefined,
          resolution: digitalHumanResolution.value,
        },
        digitalHumanIdempotencyKey.value,
      )
      digitalHumanIdempotencyKey.value = null
      rememberSessionTaskId(submitted.taskId)
      activeDigitalHumanTaskId.value = submitted.taskId
      taskStatus.value = submitted.status
      taskProgress.value = 0
      resetSmoothProgress()
      startDigitalHumanPoll(submitted.taskId)
      await refreshLocalBalance()
      const cost = renderEstimate.estimatedCreditCost.value
      if (cost > 0) {
        ElMessage.success(`任务已提交，已预扣 ${cost} 积分`)
      } else {
        ElMessage.success('任务已提交')
      }
      return
    } else if (mainTab.value === 'carSales') {
      const submitted = await generateCarSalesVideo({
        carImageUrls: carImageUrls.value,
        brandModel: carBrandModel.value.trim() || undefined,
        sellingPoints: carSellingPoints.value.trim() || undefined,
        audience: carAudience.value.trim() || undefined,
        callToAction: carCallToAction.value.trim() || undefined,
        scriptContext: buildCarScriptContext() || undefined,
        prompt: prompt.value.trim() || undefined,
        audioUrl: carAudioMode.value === 'none' ? undefined : carAudioUrl.value.trim() || undefined,
        audioMode: carAudioUrl.value.trim() ? carAudioMode.value : 'none',
        bgmUrl: carBgmUrl.value.trim() || undefined,
        ignoredStoryboardFields: storyboardIgnoredFields.value,
        hostImageUrl: carHostImageUrl.value.trim() || undefined,
        hostVideoUrl: carMaterialVideoUrl.value.trim() || undefined,
        sourceAssetIds: carSourceAssetIds(),
        segmentCount: carSegmentCount.value,
        segmentDuration: carSegmentDuration.value,
        scenes: buildCarSalesScenes(),
        model: selectedModel.value,
      })
      submittedTaskId = submitted.taskId
      submittedStatus = String(submitted.status)
    } else if (mainTab.value === 'text') {
      const submitted = await generateTextToVideo({
        prompt: prompt.value.trim(),
        duration: duration.value,
        model: selectedModel.value,
      })
      submittedTaskId = submitted.taskId
      submittedStatus = String(submitted.status)
    } else if (imageSubTab.value === 'first') {
      const submitted = await generateFirstFrameVideo({
        imageUrl: firstFrame.value.trim(),
        prompt: prompt.value.trim() || undefined,
        duration: duration.value,
        model: selectedModel.value,
      })
      submittedTaskId = submitted.taskId
      submittedStatus = String(submitted.status)
    } else if (imageSubTab.value === 'firstLast') {
      const submitted = await generateFirstLastFrameVideo({
        firstFrameUrl: firstFrame.value.trim(),
        lastFrameUrl: lastFrame.value.trim(),
        prompt: prompt.value.trim() || undefined,
        duration: duration.value,
        model: selectedModel.value,
      })
      submittedTaskId = submitted.taskId
      submittedStatus = String(submitted.status)
    } else {
      const urls = referenceImages.value.map((u) => u.trim()).filter((u) => u.length > 0)
      const submitted = await generateReferenceVideo({
        imageUrls: urls,
        prompt: prompt.value.trim() || undefined,
        duration: duration.value,
      })
      submittedTaskId = submitted.taskId
      submittedStatus = String(submitted.status)
    }
    rememberSessionTaskId(submittedTaskId)
    activeSeedanceTaskId.value = submittedTaskId
    taskStatus.value = submittedStatus
    taskProgress.value = 0
    resetSmoothProgress()
    startSeedanceTaskTracking(submittedTaskId)
  } catch (error) {
    const msg = error instanceof Error ? error.message : '视频生成失败'
    errorMessage.value = msg
    if (mainTab.value === 'digitalHuman') {
      digitalHumanIdempotencyKey.value = null
      if (msg.includes('积分余额不足') || msg.includes('40900')) {
        ElMessage.error('积分余额不足，无法提交当前任务')
      }
    }
    busy.value = false
  } finally {
    if (mainTab.value !== 'digitalHuman' && activeSeedanceTaskId.value == null) {
      busy.value = false
    }
  }
}

function startSeedanceTaskTracking(taskId: number) {
  stopSeedanceTracking()
  stopSeedanceTaskTracking = trackTaskResult<VideoTaskVO>(taskId, {
    onStatus(message) {
      taskStatus.value = String(message.status)
      taskProgress.value = message.progress
      digitalHumanTaskError.value = message.errorMessage || ''
    },
    onResult(taskResult) {
      taskStatus.value = String(taskResult.status)
      taskProgress.value = taskResult.progress ?? 100
      result.value = taskResult.result
      busy.value = false
      activeSeedanceTaskId.value = null
      digitalHumanTaskError.value = taskResult.errorMessage || ''
    },
    onFailure(message) {
      errorMessage.value = message.errorMessage || '视频生成任务失败'
      digitalHumanTaskError.value = errorMessage.value
      busy.value = false
      activeSeedanceTaskId.value = null
    },
    onError(error) {
      errorMessage.value = error.message
      digitalHumanTaskError.value = error.message
      busy.value = false
      activeSeedanceTaskId.value = null
    },
  })
}

function stopSeedanceTracking() {
  if (stopSeedanceTaskTracking) {
    stopSeedanceTaskTracking()
    stopSeedanceTaskTracking = null
  }
}

function startDigitalHumanPoll(taskId: number) {
  stopDigitalHumanPoll()
  void pollDigitalHumanOnce(taskId)
  digitalHumanPollTimer = window.setInterval(() => {
    void pollDigitalHumanOnce(taskId)
  }, 2000)
}

function stopDigitalHumanPoll() {
  if (digitalHumanPollTimer != null) {
    window.clearInterval(digitalHumanPollTimer)
    digitalHumanPollTimer = null
  }
}

async function pollDigitalHumanOnce(taskId: number) {
  try {
    const detail = await getDigitalHumanVideoTask(taskId)
    taskStatus.value = detail.status
    taskProgress.value = detail.progress
    digitalHumanTaskError.value = detail.errorMessage || ''
    if (['SUCCESS', 'FAILED', 'RETRYABLE', 'CANCELED'].includes(detail.status)) {
      stopDigitalHumanPoll()
      busy.value = false
      if (detail.status === 'SUCCESS' && detail.videoUrl) {
        result.value = digitalHumanDetailToVideoResult(detail)
      } else if (detail.errorMessage) {
        errorMessage.value = detail.errorMessage
      }
    }
  } catch (error) {
    stopDigitalHumanPoll()
    busy.value = false
    errorMessage.value = error instanceof Error ? error.message : '数字人口播任务查询失败'
  }
}

function digitalHumanDetailToVideoResult(detail: DigitalHumanTaskDetailResponse): VideoTaskVO {
  const now = Math.floor(Date.now() / 1000)
  return {
    taskId: String(detail.taskId),
    model: detail.model || 'viduq2-turbo',
    status: 'succeeded',
    createdAt: now,
    updatedAt: now,
    videoUrl: detail.videoUrl || '',
    resultAssetId: detail.resultAssetId,
    lastFrameUrl: detail.coverUrl,
    completionTokens: detail.credits || 0,
    errorCode: null,
    errorMessage: null,
  }
}

onMounted(async () => {
  loggedIn.value = !!getAuthToken()
  document.addEventListener('pointerdown', handleModelDropdownPointerDown, true)
  document.addEventListener('keydown', handleModelDropdownKeydown)
  await renderEstimate.refresh()
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleModelDropdownPointerDown, true)
  document.removeEventListener('keydown', handleModelDropdownKeydown)
  stopDigitalHumanPoll()
  stopSeedanceTracking()
})
</script>

<style scoped>
.render-video-page {
  display: grid;
  gap: 16px;
}

.render-head h1 {
  margin: 0 0 8px;
  color: #151a2d;
  font-size: 22px;
  font-weight: 800;
}

.render-head p {
  margin: 0;
  color: #667085;
  font-size: 14px;
  line-height: 1.7;
}

.render-project-hint {
  margin-top: 8px !important;
}

.render-input,
.render-result {
  display: grid;
  gap: 16px;
}

.render-tabs {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 8px;
}

.render-tabs button {
  display: inline-flex;
  height: 36px;
  align-items: center;
  border: 1px solid #e7eaf2;
  border-radius: 8px;
  background: #fff;
  color: #4f586c;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.render-tabs button.active {
  border-color: #a79bff;
  background: #faf9ff;
  box-shadow: inset 0 0 0 1px #d8d2ff;
  color: #5e50df;
}

.render-tabs button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.render-tabs-sub button {
  height: 32px;
  padding: 0 12px;
  background: #f7f8fc;
  font-weight: 750;
}

.render-tabs-sub button.active {
  background: #fff;
  border-color: #c8bfff;
}

.render-form {
  display: grid;
  gap: 16px;
}

.digital-human-guide {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  border: 1px solid #e7eaf2;
  border-radius: 8px;
  background: #fbfcff;
  padding: 10px;
}

.digital-human-guide-item {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  border-radius: 8px;
  color: #667085;
  padding: 8px 10px;
  font-size: 13px;
  font-weight: 800;
}

.digital-human-guide-item span {
  display: inline-grid;
  width: 22px;
  height: 22px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 999px;
  background: #eef0f6;
  color: #98a2b3;
  font-size: 12px;
  font-weight: 900;
}

.digital-human-guide-item.done {
  background: #f5f3ff;
  color: #5e50df;
}

.digital-human-guide-item.done span {
  background: #635bff;
  color: #fff;
}

.render-digital-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.render-digital-section {
  display: grid;
  gap: 12px;
  align-content: start;
  border: 1px solid #e7eaf2;
  border-radius: 8px;
  background: #fbfcff;
  padding: 14px;
}

.render-digital-section h3 {
  margin: 0;
  color: #2d3446;
  font-size: 14px;
  font-weight: 850;
}

.render-digital-options {
  align-items: end;
}

.render-recommend-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border: 1px solid #d8e2ff;
  border-radius: 8px;
  background: #f8fbff;
  padding: 14px;
}

.render-recommend-main {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.render-recommend-main span {
  color: #667085;
  font-size: 12px;
  font-weight: 900;
}

.render-recommend-main strong {
  color: #1d4ed8;
  font-size: 18px;
  font-weight: 900;
}

.render-recommend-main p {
  margin: 0;
  color: #667085;
  font-size: 12.5px;
  line-height: 1.6;
}

.render-details {
  border: 1px solid #e7eaf2;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
}

.render-details summary {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 14px;
  color: #2d3446;
  cursor: pointer;
  font-size: 13px;
  font-weight: 900;
  list-style: none;
}

.render-details summary::-webkit-details-marker {
  display: none;
}

.render-details summary::after {
  content: '展开';
  flex: 0 0 auto;
  color: #5e50df;
  font-size: 12px;
  font-weight: 900;
}

.render-details[open] summary::after {
  content: '收起';
}

.render-details summary small {
  min-width: 0;
  color: #98a2b3;
  font-size: 12px;
  font-weight: 700;
  text-align: right;
}

.render-details-body {
  display: grid;
  gap: 14px;
  border-top: 1px solid #edf0f6;
  background: #fbfcff;
  padding: 14px;
}

.render-grid-two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 720px) {
  .digital-human-guide,
  .render-digital-workspace {
    grid-template-columns: 1fr;
  }

  .render-grid-two,
  .render-basis-grid {
    grid-template-columns: 1fr;
  }

  .render-recommend-panel,
  .render-details summary {
    align-items: flex-start;
    flex-direction: column;
  }

  .render-details summary {
    justify-content: center;
    padding: 10px 14px;
  }

  .render-details summary small {
    text-align: left;
  }
}

.render-form-field {
  display: grid;
  gap: 8px;
}

.render-form-field label {
  color: #2d3446;
  font-size: 13px;
  font-weight: 800;
}

.render-required {
  margin-left: 4px;
  color: #e5484d;
}

.render-optional {
  margin-left: 4px;
  color: #98a2b3;
  font-weight: 700;
}

.render-form-field input,
.render-form-field select,
.render-form-field textarea {
  border: 1px solid #e3e7ef;
  border-radius: 8px;
  background: #fff;
  color: #232838;
  padding: 10px 12px;
  font-family: inherit;
  font-size: 13.5px;
  outline: none;
}

.render-form-field input,
.render-form-field select {
  height: 38px;
}

.render-form-field textarea {
  line-height: 1.7;
  resize: vertical;
}

.render-form-field input:focus,
.render-form-field select:focus,
.render-form-field textarea:focus {
  border-color: #8f81ff;
  box-shadow: 0 0 0 3px rgba(99, 91, 255, 0.12);
}

.render-upload-audio {
  display: flex;
  min-height: 58px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px dashed #d9d2ff;
  border-radius: 10px;
  background: #fbfaff;
  padding: 12px 14px;
  cursor: pointer;
}

.render-upload-audio input {
  display: none;
}

.render-upload-audio span {
  flex: 0 0 auto;
  color: #5e50df;
  font-size: 13px;
  font-weight: 800;
}

.render-upload-audio small {
  min-width: 0;
  overflow: hidden;
  color: #98a2b3;
  font-size: 12.5px;
  font-weight: 700;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.render-upload-audio.disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.render-counter {
  align-self: flex-end;
  color: #98a2b3;
  font-size: 12px;
  font-weight: 700;
}

.render-form-field-inline {
  grid-template-columns: auto auto 1fr;
  align-items: center;
  gap: 12px;
}

.render-form-field-inline select {
  height: 36px;
  border: 1px solid #e3e7ef;
  border-radius: 8px;
  padding: 0 10px;
  font-size: 13px;
  font-weight: 700;
  background: #fff;
  color: #232838;
  outline: none;
}

.render-form-field-inline select:focus {
  border-color: #8f81ff;
  box-shadow: 0 0 0 3px rgba(99, 91, 255, 0.12);
}

.render-duration-hint {
  font-size: 12.5px;
}

.render-audio-mode {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.render-audio-mode button {
  min-height: 36px;
  border: 1px solid #e1e6f0;
  border-radius: 8px;
  background: #fff;
  color: #4f586c;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.render-audio-mode button.active {
  border-color: #7d69ff;
  background: #f5f3ff;
  color: #5b4be7;
}

.render-audio-mode button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.render-audio-hint {
  margin: -4px 0 4px;
  font-size: 12px;
}

.render-basis-panel {
  display: grid;
  gap: 12px;
  border: 1px solid #dce3f2;
  border-radius: 8px;
  background: #fbfcff;
  padding: 14px;
}

.render-basis-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.render-basis-head h3 {
  margin: 0;
  color: #151a2d;
  font-size: 15px;
  font-weight: 900;
}

.render-basis-head span {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 900;
}

.render-basis-head span.ok {
  background: #eafaf1;
  color: #099250;
}

.render-basis-head span.danger {
  background: #fff1f0;
  color: #d92d20;
}

.render-basis-panel p {
  margin: 0;
  color: #4f586c;
  font-size: 13px;
  line-height: 1.7;
}

.render-basis-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
}

.render-basis-grid div {
  min-width: 0;
  border: 1px solid #e7eaf2;
  border-radius: 8px;
  background: #fff;
  padding: 10px 12px;
}

.render-basis-grid dt {
  color: #98a2b3;
  font-size: 12px;
  font-weight: 800;
}

.render-basis-grid dd {
  margin: 4px 0 0;
  overflow-wrap: anywhere;
  color: #232838;
  font-size: 13px;
  font-weight: 800;
}

.render-basis-alert {
  display: grid;
  gap: 6px;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 12.5px;
  line-height: 1.6;
}

.render-basis-alert strong {
  font-weight: 900;
}

.render-basis-alert span {
  display: block;
}

.render-basis-alert.warn {
  background: #fffaeb;
  color: #93370d;
}

.render-basis-alert.danger {
  background: #fff1f0;
  color: #b42318;
}

@media (max-width: 720px) {
  .render-basis-grid {
    grid-template-columns: 1fr;
  }
}

.render-model-dropdown {
  position: relative;
  display: inline-block;
  min-width: 160px;
  z-index: 40;
}

.render-model-trigger {
  display: inline-flex;
  width: 100%;
  height: 36px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid #e3e7ef;
  border-radius: 8px;
  background: #fff;
  color: #232838;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  outline: none;
}

.render-model-trigger:hover:not(:disabled) {
  border-color: #c8bfff;
}

.render-model-trigger:focus,
.render-model-dropdown.open .render-model-trigger {
  border-color: #8f81ff;
  box-shadow: 0 0 0 3px rgba(99, 91, 255, 0.12);
}

.render-model-trigger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.render-model-caret {
  color: #98a2b3;
  font-size: 12px;
  transition: transform 0.18s ease;
}

.render-model-dropdown.open .render-model-caret {
  transform: rotate(180deg);
}

.render-model-options {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 80;
  min-width: 100%;
  margin: 0;
  padding: 6px;
  max-height: 220px;
  overflow-y: auto;
  list-style: none;
  border: 1px solid #e3e7ef;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 16px 38px rgba(15, 23, 42, 0.14), 0 0 0 1px rgba(99, 91, 255, 0.04);
}

.render-model-options::before {
  position: absolute;
  top: -8px;
  right: 0;
  left: 0;
  height: 8px;
  content: "";
}

.render-model-option {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 38px;
  padding: 9px 12px;
  border-radius: 8px;
  color: #232838;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background 0.16s ease,
    color 0.16s ease,
    transform 0.16s ease;
}

.render-model-option:hover {
  background: #f5f3ff;
  color: #5e50df;
  transform: translateX(1px);
}

.render-model-option.active {
  background: #faf9ff;
  color: #5e50df;
}

.render-model-option.has-tip:hover::after {
  content: attr(data-tip);
  position: absolute;
  top: 50%;
  left: calc(100% + 8px);
  transform: translateY(-50%);
  padding: 6px 10px;
  border-radius: 6px;
  background: #1f2230;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.18);
  pointer-events: none;
  z-index: 30;
}

.render-model-option.has-tip:hover::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 100%;
  transform: translateY(-50%);
  border: 5px solid transparent;
  border-right-color: #1f2230;
  pointer-events: none;
  z-index: 30;
}

.render-field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.render-mini-btn {
  height: 30px;
  padding: 0 12px;
  font-size: 12.5px;
}

.render-ref-list {
  display: grid;
  gap: 12px;
}

.render-ref-item {
  display: grid;
  grid-template-columns: 60px 1fr 36px;
  gap: 12px;
  align-items: start;
  padding: 12px;
  border: 1px dashed #e3dcff;
  border-radius: 10px;
  background: #fbfaff;
}

.render-ref-index {
  padding-top: 8px;
  color: #5e50df;
  font-weight: 800;
  font-size: 13px;
}

.render-ref-remove {
  height: 36px;
  width: 36px;
  border-radius: 8px;
  border: 1px solid #f4cccc;
  background: #fff5f5;
  color: #e5484d;
  font-size: 18px;
  font-weight: 800;
  cursor: pointer;
}

.render-ref-remove:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.render-ref-tip {
  margin: 4px 0 0;
  font-size: 12.5px;
}

.render-digital-credit {
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.95);
  border: 1px solid #e5e7eb;
}

.render-digital-credit p {
  margin: 0 0 6px;
  font-size: 14px;
}

.render-digital-credit p:last-child {
  margin-bottom: 0;
}

.render-credit-line {
  color: #374151;
}

.render-credit-line strong {
  color: #111827;
}

.render-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.render-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid #e3dcff;
  background: rgba(247, 245, 255, 0.8);
  color: #5e50df;
  font-size: 13px;
  font-weight: 750;
}

.render-digital-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #e3dcff;
  border-radius: 8px;
  background: #fbfaff;
  padding: 10px 12px;
  color: #5e50df;
  font-size: 13px;
  font-weight: 800;
}

.render-progress-track {
  flex: 1;
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #e8ecf4;
}

.render-progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #635bff 0%, #8b7cf6 100%);
  transition: width 0.35s ease;
}

.render-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #8b7cf6;
  animation: render-pulse 1.2s ease-in-out infinite;
}

@keyframes render-pulse {
  0%,
  100% {
    transform: scale(0.8);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.1);
    opacity: 1;
  }
}

.render-empty {
  margin: 0;
}

.render-video {
  display: grid;
  gap: 16px;
}

.render-video video {
  width: 100%;
  max-height: 480px;
  border-radius: 12px;
  background: #1f2230;
  outline: none;
}

.render-video-meta {
  display: grid;
  gap: 8px;
  padding: 14px 16px;
  border: 1px solid #edf0f6;
  border-radius: 10px;
  background: #fafbff;
}

.render-meta-row {
  display: flex;
  gap: 12px;
  font-size: 13px;
}

.render-meta-key {
  flex: 0 0 88px;
  color: #98a2b3;
  font-weight: 700;
}

.render-meta-value {
  color: #2d3446;
  font-weight: 700;
  word-break: break-all;
}

.render-video-actions {
  display: flex;
  gap: 12px;
}

.render-video-actions a {
  text-decoration: none;
}

.render-segment-list {
  display: grid;
  gap: 12px;
}

.render-segment-list h3 {
  margin: 0;
  color: #2d3446;
  font-size: 14px;
  font-weight: 850;
}

.render-segment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.render-segment-item {
  display: grid;
  gap: 8px;
  border: 1px solid #edf0f6;
  border-radius: 8px;
  background: #fafbff;
  padding: 10px;
}

.render-segment-item video {
  width: 100%;
  max-height: 180px;
  border-radius: 8px;
  background: #1f2230;
}

.render-segment-item strong,
.render-segment-item small {
  display: block;
}

.render-segment-item small {
  color: #667085;
  font-size: 12px;
}

.render-segment-item a {
  color: #5e50df;
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
}
</style>
