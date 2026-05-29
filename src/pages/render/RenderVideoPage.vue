<template>
  <div class="render-video-page app-page-stack">
    <header class="render-head">
      <div>
        <h1>视频制作</h1>
        <p>
          一键成片适合直接上传素材包自动判断；手动制作保留完整参数控制，适合精修分镜、口播和成片一致性。
        </p>
      </div>
      <div class="render-mode-switch" aria-label="视频制作模式">
        <button
          type="button"
          :class="{ active: productionMode === 'quick' }"
          :disabled="busy || seedanceSubmitInFlight"
          @click="setProductionMode('quick')"
        >
          一键成片
        </button>
        <button
          type="button"
          :class="{ active: productionMode === 'manual' }"
          :disabled="busy || seedanceSubmitInFlight"
          @click="setProductionMode('manual')"
        >
          手动制作
        </button>
      </div>
    </header>

    <QuickRenderPage v-if="productionMode === 'quick'" embedded />

    <template v-else>
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
          <div class="render-car-workflow-strip" aria-label="视频制作主流程">
            <span><strong>1</strong>素材</span>
            <span><strong>2</strong>分镜</span>
            <span><strong>3</strong>口播</span>
            <small>配音、BGM、数字人和已有视频素材按需展开</small>
          </div>
          <div class="render-digital-workspace">
              <section class="render-digital-section">
              <h3>车辆图片</h3>
              <AssetPicker
                title="车型素材包"
                asset-type="JSON"
                :selected-url="carBundleAssetUrl"
                :source-types="['USER_UPLOAD']"
                :asset-roles="['car_model_bundle']"
                :role-options="CAR_MODEL_BUNDLE_ROLE_OPTIONS"
                source-hint="从资产中心选择一款已整理好的车型素材包，自动填充车型图和部位标记"
                placeholder="搜索车型素材包..."
                @select="handleCarBundleAssetSelect"
              />
              <div v-if="carBundleAssetUrl" class="render-car-bundle-status" :class="{ error: carBundleLoadError }">
                <strong>{{ carBundleLoadError ? '素材包读取失败' : '已载入车型素材包' }}</strong>
                <span v-if="!carBundleLoadError">
                  {{ carBundleLoadedName || '车型素材包' }} · {{ carBundleImageCount }} 张图片已填入下方列表
                </span>
                <span v-else>{{ carBundleLoadError }}</span>
              </div>
              <div class="render-car-bundle-guidance">
                <strong>分镜优先素材</strong>
                <span>{{ carStoryboardBundleNeedText }}</span>
              </div>
              <AssetPicker
                title="从资产中心选择车辆图片"
                asset-type="IMAGE"
                :selected-url="carPickedImageUrl"
                :role-options="CAR_IMAGE_ROLE_OPTIONS"
                placeholder="搜索车辆图片素材..."
                @select="handleCarImageAssetSelect"
              />
              <div class="render-ref-list">
                <div
                  v-for="(item, idx) in carImages"
                  :key="`car-img-${idx}`"
                  class="render-ref-item render-ref-item-car"
                >
                  <div class="render-ref-index">图{{ idx + 1 }}</div>
                  <ImageInput
                    :busy="busy"
                    :value="item"
                    compact
                    @update="updateCarImage(idx, $event)"
                  />
                  <div class="render-ref-role-picker">
                    <button
                      type="button"
                      class="render-ref-role-trigger"
                      :disabled="busy || !item.trim()"
                      title="标记车辆素材角色，用于每段自动选择参考图"
                      @click.stop="toggleCarRolePicker(idx)"
                    >
                      <span>{{ carImageRoleLabelForUrl(item, idx) }}</span>
                      <span>⌄</span>
                    </button>
                    <div v-if="carRolePickerOpenIndex === idx" class="render-ref-role-menu">
                      <button type="button" @click="selectCarImageRole(item, '')">未标记</button>
                      <button
                        v-for="option in CAR_IMAGE_ROLE_OPTIONS"
                        :key="option.value"
                        type="button"
                        :class="{ active: carImageRoleForUrl(item, idx) === option.value }"
                        @click="selectCarImageRole(item, option.value)"
                      >
                        {{ option.label }}
                      </button>
                    </div>
                  </div>
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
              <details class="render-scene-material-block render-optional-group">
                <summary class="render-scene-material-head">
                  <strong>场景图片</strong>
                  <span>用于替换分镜里的展厅、道路、门店等地点，车辆与人物仍由上方素材控制。</span>
                </summary>
                <AssetPicker
                  title="从资产中心选择场景图片"
                  asset-type="IMAGE"
                  :selected-url="carPickedSceneImageUrl"
                  :role-options="CAR_SCENE_IMAGE_ROLE_OPTIONS"
                  placeholder="搜索场景图片素材..."
                  @select="handleCarSceneImageAssetSelect"
                />
                <div class="render-ref-list">
                  <div
                    v-for="(item, idx) in carSceneImages"
                    :key="`car-scene-img-${idx}`"
                    class="render-ref-item render-ref-item-car"
                  >
                    <div class="render-ref-index">场景{{ idx + 1 }}</div>
                    <ImageInput
                      :busy="busy"
                      :value="item"
                      compact
                      @update="updateCarSceneImage(idx, $event)"
                    />
                    <div class="render-ref-role-picker">
                      <button
                        type="button"
                        class="render-ref-role-trigger"
                        :disabled="busy || !item.trim()"
                        title="标记场景类型，用于替换分镜中的地点描述"
                        @click.stop="toggleCarSceneRolePicker(idx)"
                      >
                        <span>{{ carSceneImageRoleLabelForUrl(item, idx) }}</span>
                        <span>⌄</span>
                      </button>
                      <div v-if="carSceneRolePickerOpenIndex === idx" class="render-ref-role-menu">
                        <button type="button" @click="selectCarSceneImageRole(item, '')">未标记</button>
                        <button
                          v-for="option in CAR_SCENE_IMAGE_ROLE_OPTIONS"
                          :key="option.value"
                          type="button"
                          :class="{ active: carSceneImageRoleForUrl(item, idx) === option.value }"
                          @click="selectCarSceneImageRole(item, option.value)"
                        >
                          {{ option.label }}
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      class="render-ref-remove"
                      :disabled="busy || carSceneImages.length <= 1"
                      title="移除该场景"
                      @click="removeCarSceneImageSlot(idx)"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  class="app-secondary-button render-mini-btn"
                  :disabled="busy || carSceneImages.length >= MAX_REFERENCE"
                  @click="addCarSceneImageSlot"
                >
                  添加场景图片
                </button>
              </details>
              <div class="render-car-bundle-save">
                <label>
                  <span>加入车型素材包</span>
                  <input
                    v-model.trim="carBundleSaveName"
                    :disabled="busy || carBundleSaving"
                    placeholder="素材包名称，默认使用车型名称"
                  />
                </label>
                <button
                  type="button"
                  class="app-secondary-button"
                  :disabled="busy || carBundleSaving || carImageUrls.length === 0"
                  @click="saveCurrentCarBundle"
                >
                  {{ carBundleSaving ? '保存中...' : '保存当前车型素材包' }}
                </button>
              </div>
              <section class="render-completeness-panel" aria-label="素材完整度提示">
                <div class="render-completeness-head">
                  <span>素材完整度</span>
                  <strong>{{ carMaterialCompleteness.providedCount }} / {{ carMaterialCompleteness.totalCount }}</strong>
                </div>
                <div class="render-completeness-track" aria-hidden="true">
                  <span :style="{ width: `${carMaterialCompleteness.percent}%` }"></span>
                </div>
                <div class="render-completeness-lines">
                  <p>
                    <strong>已提供：</strong>
                    {{ carMaterialProvidedText }}
                  </p>
                  <p>
                    <strong>建议补充：</strong>
                    {{ carMaterialMissingText }}
                  </p>
                </div>
              </section>
            </section>

            <section class="render-digital-section">
              <h3>分镜与口播</h3>
              <AssetPicker
                title="分镜生成结果（控制段落节奏）"
                asset-type="JSON"
                :selected-url="carStoryboardAssetUrl"
                :source-types="['STORYBOARD_GENERATE', 'VIDEO_SCRIPT_ANALYZE', 'VIDEO_SCRIPT_URL_ANALYZE', 'USER_UPLOAD']"
                :asset-roles="['storyboard_json']"
                :role-options="CAR_STORYBOARD_ROLE_OPTIONS"
                source-hint="分镜只用于段落节奏、景别、运镜和构图，车辆、人物、场景事实以参考图和文案为准"
                placeholder="搜索分镜生成结果..."
                @select="handleCarStoryboardAssetSelect"
              />
              <AssetPicker
                title="爆款对标文案（口播参考）"
                asset-type="JSON"
                :selected-url="carBenchmarkAssetUrl"
                :source-types="['DOUYIN_BENCHMARK', 'DOUYIN_PARSE_TRANSCRIPT', 'DOUYIN_REWRITE', 'DOUYIN_TRANSCRIPT', 'USER_UPLOAD']"
                :asset-roles="['benchmark_json']"
                :role-options="CAR_BENCHMARK_ROLE_OPTIONS"
                source-hint="爆款解析文案主要用于声音生成或口播参考"
                placeholder="搜索爆款对标文案..."
                @select="handleCarBenchmarkAssetSelect"
              />
              <label class="render-upload-audio render-upload-text" :class="{ disabled: busy || carBenchmarkUploading }">
                <input
                  type="file"
                  accept=".json,.txt,.md,application/json,text/plain,text/markdown"
                  :disabled="busy || carBenchmarkUploading"
                  @change="handleCarBenchmarkUpload"
                />
                <span>{{ carBenchmarkUploading ? '上传中...' : '上传爆款对标文案' }}</span>
                <small>{{ carBenchmarkUploadName || '支持 JSON / TXT / MD；不上传音频时可用它生成口播和音频' }}</small>
              </label>
              <details class="render-optional-group">
                <summary>
                  <span>可选配音</span>
                  <small>默认按口播文案驱动模型；已有音频时再展开配置。</small>
                </summary>
                <div class="render-optional-body">
                  <AssetPicker
                    title="口播/配音音频"
                    asset-type="AUDIO"
                    :selected-url="carAudioUrl"
                    :source-types="['TTS_GENERATE', 'VOICE_SAMPLE', 'USER_UPLOAD']"
                    :asset-roles="['voiceover', 'reference_audio']"
                    :role-options="CAR_VOICE_AUDIO_ROLE_OPTIONS"
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
                      @click="setCarAudioMode('none')"
                    >
                      不使用音频
                    </button>
                    <button
                      type="button"
                      :class="{ active: carAudioMode === 'model_native' }"
                      :disabled="busy"
                      title="不调用音色库，直接把口播文案交给视频模型生成匹配的画面和原生音频"
                      @click="setCarAudioMode('model_native')"
                    >
                      文案生成音视频
                    </button>
                    <button
                      type="button"
                      :class="{ active: carAudioMode === 'post_mix' }"
                      :disabled="busy || !carAudioUrl"
                      title="生成画面后，用该口播音频替换最终成片音轨"
                      @click="setCarAudioMode('post_mix')"
                    >
                      后期口播配音
                    </button>
                    <button
                      type="button"
                      :class="{ active: carAudioMode === 'reference' }"
                      :disabled="busy || !carAudioUrl.trim()"
                      :title="audioReferenceHint"
                      @click="setCarAudioMode('reference')"
                    >
                      参考音频生成
                    </button>
                  </div>
                  <p class="app-muted render-audio-hint">{{ audioReferenceHint }}</p>
                </div>
              </details>
              <section v-if="usesModelNativeVoiceover()" class="render-tts-style-panel" aria-label="文案驱动音视频设置">
                <div class="render-tts-source">
                  <span>口播文案来源</span>
                  <div class="render-tts-source-options">
                    <button
                      type="button"
                      :class="{ active: carVoiceTextSource === 'auto' }"
                      :disabled="busy"
                      @click="setCarVoiceTextSource('auto')"
                    >
                      系统整理
                    </button>
                    <button
                      type="button"
                      :class="{ active: carVoiceTextSource === 'benchmark' }"
                      :disabled="busy || !carBenchmarkVoiceText.trim()"
                      @click="setCarVoiceTextSource('benchmark')"
                    >
                      爆款对标
                    </button>
                    <button
                      type="button"
                      :class="{ active: carVoiceTextSource === 'manual' }"
                      :disabled="busy"
                      @click="setCarVoiceTextSource('manual')"
                    >
                      手写文案
                    </button>
                  </div>
                  <small>{{ carVoiceTextSourceHint }}</small>
                </div>
                <div v-if="shouldShowNativeVoiceLanguagePanel" class="render-tts-controls">
                  <div class="render-form-field">
                    <label>讲述语言</label>
                    <select v-model="carNativeVoiceLanguage" :disabled="busy">
                      <option v-for="item in CAR_NATIVE_VOICE_LANGUAGE_OPTIONS" :key="item.value" :value="item.value">
                        {{ item.label }}
                      </option>
                    </select>
                    <small>{{ carNativeVoiceLanguageHint }}</small>
                  </div>
                  <div v-if="shouldShowNativeVoiceStylePanel" class="render-form-field">
                    <label>口播风格</label>
                    <select v-model="carNativeVoiceStyle" :disabled="busy">
                      <option v-for="item in CAR_NATIVE_VOICE_STYLE_OPTIONS" :key="item.value" :value="item.value">
                        {{ item.label }}
                      </option>
                    </select>
                    <small>{{ carNativeVoiceStyleHint }}</small>
                  </div>
                  <div v-if="shouldShowNativeVoiceStylePanel" class="render-form-field">
                    <label>节奏控制</label>
                    <select v-model="carNativeSpeechStyle" :disabled="busy">
                      <option v-for="item in CAR_NATIVE_SPEECH_STYLE_OPTIONS" :key="item.value" :value="item.value">
                        {{ item.label }}
                      </option>
                    </select>
                    <small>{{ carNativeSpeechStyleHint }}</small>
                  </div>
                </div>
                <section v-if="shouldShowNativeVoiceStylePanel" class="render-tts-script-panel" aria-label="完整口播台词">
                  <div class="render-tts-script-head">
                    <strong>完整口播台词</strong>
                    <span>{{ modelNativeVoiceTextPreview.length }} 字</span>
                  </div>
                  <p class="render-tts-preview">
                    {{ modelNativeVoiceTextPreview || '暂无可用口播台词' }}
                  </p>
                </section>
                <section v-if="shouldShowSceneVoiceStructure" class="render-tts-script-panel" aria-label="分镜台词结构">
                  <div class="render-tts-script-head">
                    <strong>分镜台词结构</strong>
                    <span>{{ carSceneVoiceStructurePreview.length }} 段</span>
                  </div>
                  <div class="render-scene-voice-list">
                    <article
                      v-for="scene in carSceneVoiceStructurePreview"
                      :key="`scene-voice-${scene.segmentIndex}`"
                      class="render-scene-voice-card"
                    >
                      <div class="render-scene-voice-head">
                        <strong>{{ scene.title }}</strong>
                        <span>{{ formatSeconds(scene.duration) }}</span>
                      </div>
                      <p class="render-scene-visual">{{ scene.visualPrompt }}</p>
                      <p class="render-scene-voice">{{ scene.voiceText || '此段暂无口播台词' }}</p>
                    </article>
                  </div>
                </section>
                <p v-if="!shouldShowNativeVoiceStylePanel" class="render-tts-empty">
                  上传或选择口播文案后展示音色、语速和分段台词，避免无内容时干扰判断。
                </p>
              </section>
              <div class="render-voice-policy" :class="carVoicePolicyLevel">
                <strong>{{ carVoicePolicyTitle }}</strong>
                <p>{{ carVoicePolicyDescription }}</p>
              </div>
              <div class="render-form-field">
                <label>字幕</label>
                <div class="render-audio-mode render-subtitle-mode">
                  <button
                    v-for="option in carSubtitleOptions"
                    :key="option.key"
                    type="button"
                    :class="{ active: carSubtitleMode === option.key }"
                    :disabled="busy"
                    @click="carSubtitleMode = option.key"
                  >
                    {{ option.label }}
                  </button>
                </div>
              </div>
              <div v-if="carSubtitleMode === 'custom'" class="render-form-field">
                <textarea
                  v-model="carSubtitleText"
                  :disabled="busy"
                  rows="4"
                  maxlength="8000"
                  placeholder="输入或粘贴自定义字幕内容"
                />
              </div>
              <div v-if="carSubtitleMode !== 'off'" class="render-form-field">
                <label>字幕语言</label>
                <select v-model="carSubtitleLanguage" :disabled="busy">
                  <option v-for="item in carSubtitleLanguageOptions" :key="item.value" :value="item.value">
                    {{ item.label }}
                  </option>
                </select>
                <small>用于生成后自动识别字幕；自定义字幕会按原文烧录。</small>
              </div>
              <details class="render-optional-group">
                <summary>
                  <span>更多可选素材</span>
                  <small>BGM、数字人出镜和已有视频素材按需配置。</small>
                </summary>
                <div class="render-optional-body">
                  <AssetPicker
                    title="背景音乐 BGM"
                    asset-type="AUDIO"
                    :selected-url="carBgmUrl"
                    :source-types="['USER_UPLOAD']"
                    :asset-roles="['bgm']"
                    :role-options="CAR_BGM_AUDIO_ROLE_OPTIONS"
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
                  <div class="render-host-toggle">
                    <span>数字人出镜</span>
                    <div class="render-host-options">
                      <button
                        type="button"
                        :class="{ active: !carHostAppearanceEnabled }"
                        :disabled="busy"
                        @click="carHostAppearanceEnabled = false"
                      >
                        不出镜
                      </button>
                      <button
                        type="button"
                        :class="{ active: carHostAppearanceEnabled }"
                        :disabled="busy"
                        @click="carHostAppearanceEnabled = true"
                      >
                        虚拟人物出镜
                      </button>
                    </div>
                  </div>
                  <p v-if="!carHostAppearanceEnabled" class="app-muted render-audio-hint">
                    不出镜时会强制提示模型不要出现人物；若文案或分镜包含人物描述，提交前会提示你切换或调整。
                  </p>
                  <template v-if="carHostAppearanceEnabled">
                <AssetPicker
                  title="数字人形象"
                  asset-type="IMAGE"
                  :selected-url="carHostImageUrl"
                  :source-types="['AVATAR_GENERATE', 'USER_UPLOAD', 'MANUAL_CREATED', 'AI_GENERATED']"
                  :asset-roles="['host_image']"
                  :role-options="CAR_HOST_IMAGE_ROLE_OPTIONS"
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
                  </template>
                  <AssetPicker
                    title="已有视频素材"
                    asset-type="VIDEO"
                    :selected-url="carMaterialVideoUrl"
                    :source-types="['USER_UPLOAD', 'SEEDANCE_TEXT_VIDEO', 'SEEDANCE_FIRST_FRAME_VIDEO', 'SEEDANCE_FIRST_LAST_FRAME_VIDEO', 'SEEDANCE_REFERENCE_VIDEO', 'SEEDANCE_CAR_SALES_VIDEO']"
                    :asset-roles="['material_video', 'host_video', 'reference_video']"
                    :role-options="CAR_VIDEO_ROLE_OPTIONS"
                    source-hint="选择上传或视频制作阶段产出的素材"
                    placeholder="搜索视频素材..."
                    @select="handleCarMaterialVideoAssetSelect"
                  />
                </div>
              </details>
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
              @click="applyCarRecommendation()"
            >
              {{ recommendationMatchesCurrent ? '已采用' : '应用推荐' }}
            </button>
          </section>

          <div class="render-grid-three">
            <div class="render-form-field render-form-field-inline">
              <label>分段数量</label>
              <select :value="carSegmentCount" :disabled="busy" @change="handleCarSegmentCountChange">
                <option v-for="n in carSegmentCountOptions" :key="n" :value="n">{{ n }} 段</option>
              </select>
              <span class="app-muted render-duration-hint">会分别生成并入库</span>
            </div>
            <div class="render-form-field render-form-field-inline">
              <label>出片时长</label>
              <strong class="render-duration-summary">{{ carSegmentDurationSummary }}</strong>
              <span class="app-muted render-duration-hint">{{ carDurationHint }}</span>
            </div>
            <div class="render-form-field render-form-field-inline">
              <label>成片比例</label>
              <select v-model="renderAspectRatio" :disabled="busy">
                <option v-for="item in renderAspectRatioOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </option>
              </select>
              <span class="app-muted render-duration-hint">{{ renderAspectRatioHint }}</span>
            </div>
          </div>

          <section class="render-segment-duration-panel">
            <div class="render-segment-duration-head">
              <strong>每段时长</strong>
              <span>{{ carSegmentDurationPanelHint }}</span>
            </div>
            <div class="render-segment-duration-grid">
              <label
                v-for="(_, index) in normalizedCarSegmentDurations"
                :key="index"
                class="render-segment-duration-item"
              >
                <span>
                  第{{ index + 1 }}段
                  <small>{{ carSegmentDurationSourceLabel(index) }}</small>
                </span>
                <select
                  :value="carSegmentDurationAt(index)"
                  :disabled="busy"
                  @change="handleCarSegmentDurationChange(index, $event)"
                >
                  <option v-for="n in carSegmentDurationOptions" :key="n" :value="n">
                    {{ n }} 秒
                  </option>
                </select>
              </label>
            </div>
            <p v-if="carSegmentTimingNotice" class="render-segment-duration-notice">
              {{ carSegmentTimingNotice }}
            </p>
          </section>

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
                <label>分镜节奏参考</label>
                <textarea
                  v-model="carStoryboardContext"
                  :disabled="busy"
                  rows="4"
                  maxlength="4000"
                  placeholder="选择分镜资产后会自动填入；生成时只保留镜头意图、景别、运镜和段落节奏"
                />
              </div>

              <div class="render-form-field">
                <label>口播文案参考</label>
                <textarea
                  v-model="carVoiceContext"
                  :disabled="busy"
                  rows="3"
                  maxlength="4000"
                  placeholder="会替换分镜里的旧台词；选择音频时可粘贴转写文案帮助镜头适配"
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

        <div v-if="mainTab !== 'digitalHuman' && mainTab !== 'carSales'" class="render-form-field render-form-field-inline">
          <label>成片比例</label>
          <select v-model="renderAspectRatio" :disabled="busy">
            <option v-for="item in renderAspectRatioOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
          <span class="app-muted render-duration-hint">{{ renderAspectRatioHint }}</span>
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
          <span v-if="modelAutoHint" class="app-muted render-model-auto-hint">
            {{ modelAutoHint }}
          </span>
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
          :disabled="!canSubmit || generateButtonBusy || !!renderEstimate.insufficientHint.value"
          :title="renderEstimate.insufficientHint.value || carGenerationBlockingMessages[0] || ''"
          @click="handleGenerate"
        >
          {{ generateButtonText }}
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
            多段成片会按设置好的段落并行生成，再按原分镜顺序合成为完整视频；完成的片段会先展示。
          </p>
        </div>
      </div>

      <div v-if="busy" class="render-status">
        <span class="render-status-dot" />
        {{ renderTaskStatusText }}
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
      <p v-if="showTaskProgress && currentTaskIsCarSales" class="app-muted render-progress-note">
        进度按“素材准备、并行分段生成、成片合成、音频处理、入库保存”计算；总耗时会随段数和模型排队波动。
      </p>
      <p v-if="digitalHumanTaskError" class="app-error">{{ digitalHumanTaskError }}</p>

      <div v-if="!busy && !result" class="app-empty render-empty">
        生成完成后，视频会自动展示在这里。
      </div>

      <div v-if="result" class="render-video">
        <template v-if="result.videoUrl">
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
        </template>
        <div v-else class="render-partial-panel">
          <strong>{{ renderTaskStatusText }}</strong>
          <span>{{ renderCompletedSegmentCount }} / {{ renderSegmentCount }} 段已完成</span>
        </div>
        <div v-if="result.segmentVideos?.length" class="render-segment-list">
          <h3>{{ result.videoUrl ? '分段视频' : '已完成片段预览' }}</h3>
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
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import AssetPicker from './AssetPicker.vue'
import ImageInput from './ImageInput.vue'
import QuickRenderPage from './QuickRenderPage.vue'
import { useSmoothTaskProgress } from '../../composables/useSmoothTaskProgress'
import { API_ORIGIN, getAuthToken } from '../../services/request'
import BillingEstimateBanner from '../../components/business/BillingEstimateBanner.vue'
import { useBillingEstimate } from '../../composables/useBillingEstimate'
import { rememberSessionTaskId } from '../../services/sessionTaskStore'
import { trackTaskResult } from '../../services/taskRealtime'
import { getTaskResult } from '../../services/taskApi'
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
import type {
  CarSalesAssetRoleBinding,
  DigitalHumanTaskDetailResponse,
  VideoScriptShotItem,
  VideoTaskVO,
} from '../../types/videoTypes'
import type { AssetItem } from '../../types/assetTypes'


type MainTab = 'text' | 'image' | 'carSales' | 'digitalHuman'
type ImageSubTab = 'first' | 'firstLast' | 'reference'
type DigitalHumanAudioMode = 'asset' | 'upload' | 'url' | 'text'
type CarAudioMode = 'none' | 'post_mix' | 'reference' | 'model_native'
type CarVoicePolicy = 'user_audio' | 'model_native' | 'none'
type CarVoiceTextSource = 'auto' | 'benchmark' | 'manual'
type CarSubtitleMode = 'off' | 'auto' | 'custom'
type NativeVoiceLanguage = 'zh-CN' | 'en-US'
type SeedanceModelValue = 'doubao-seedance-1-5-pro-251215' | 'ep-20260512233524-85r4g'
type CarMaterialGroup = 'exterior' | 'interior' | 'detail' | 'scene' | 'host'
type RenderProductionMode = 'quick' | 'manual'
type RenderAspectRatio = '9:16' | '16:9' | 'auto'

interface ModelRequirement {
  model: SeedanceModelValue
  reason: string
}

const MAX_REFERENCE = 9
const SEEDANCE2_MAX_REFERENCE_IMAGES = 9
const SEEDANCE_LEGACY_MAX_REFERENCE_IMAGES = 1
const SEEDANCE_2_MODEL: SeedanceModelValue = 'ep-20260512233524-85r4g'

const CAR_MATERIAL_TARGETS: Array<{ role: string; label: string; group: CarMaterialGroup }> = [
  { role: 'car_exterior_front', label: '正面', group: 'exterior' },
  { role: 'car_exterior_side', label: '侧面', group: 'exterior' },
  { role: 'car_exterior_rear', label: '背面', group: 'exterior' },
  { role: 'car_exterior_45', label: '45 度角', group: 'exterior' },
  { role: 'car_interior_dashboard', label: '中控台', group: 'interior' },
  { role: 'car_interior_front_seat', label: '前排', group: 'interior' },
  { role: 'car_interior_back_seat', label: '后排', group: 'interior' },
  { role: 'car_interior_steering', label: '方向盘/仪表', group: 'interior' },
  { role: 'car_interior_trunk', label: '后备箱', group: 'interior' },
  { role: 'car_detail_light', label: '车灯', group: 'detail' },
  { role: 'car_detail_wheel', label: '轮毂', group: 'detail' },
  { role: 'car_detail_logo', label: 'Logo', group: 'detail' },
  { role: 'car_detail_seat_material', label: '座椅材质', group: 'detail' },
  { role: 'scene_showroom', label: '展厅', group: 'scene' },
  { role: 'scene_outdoor', label: '户外场景', group: 'scene' },
  { role: 'scene_road', label: '公路/山路', group: 'scene' },
  { role: 'scene_night', label: '夜景/门店', group: 'scene' },
  { role: 'host_image', label: '销售顾问/数字人', group: 'host' },
]

const CAR_IMAGE_ROLE_OPTIONS = CAR_MATERIAL_TARGETS
  .filter((item) => item.group !== 'host' && item.group !== 'scene')
  .map((item) => ({ value: item.role, label: item.label }))
const CAR_SCENE_IMAGE_ROLE_OPTIONS = CAR_MATERIAL_TARGETS
  .filter((item) => item.group === 'scene')
  .map((item) => ({ value: item.role, label: item.label }))
const CAR_HOST_IMAGE_ROLE_OPTIONS = [{ value: 'host_image', label: '数字人形象' }]
const CAR_MODEL_BUNDLE_ROLE_OPTIONS = [{ value: 'car_model_bundle', label: '车型素材包' }]
const CAR_VOICE_AUDIO_ROLE_OPTIONS = [
  { value: 'voiceover', label: '口播' },
  { value: 'reference_audio', label: '参考音频' },
]
const CAR_BGM_AUDIO_ROLE_OPTIONS = [{ value: 'bgm', label: 'BGM' }]
const CAR_STORYBOARD_ROLE_OPTIONS = [{ value: 'storyboard_json', label: '分镜' }]
const CAR_BENCHMARK_ROLE_OPTIONS = [
  { value: 'benchmark_json', label: '爆款对标' },
]
const CAR_VIDEO_ROLE_OPTIONS = [
  { value: 'material_video', label: '视频素材' },
  { value: 'host_video', label: '数字人视频' },
  { value: 'reference_video', label: '参考视频' },
]
const CAR_NATIVE_VOICE_LANGUAGE_OPTIONS = [
  { value: 'zh-CN', label: '中文讲述', hint: '按中文普通话讲述，适合国内销售口播' },
  { value: 'en-US', label: '英语讲述', hint: '按自然英语讲述，中文文案会忠实转成英文表达' },
]
const CAR_NATIVE_VOICE_STYLE_OPTIONS = [
  { value: 'natural_explain', label: '自然讲解', hint: '中性销售顾问，普通话清晰可信' },
  { value: 'female_clear', label: '清亮女销售', hint: '青年女性声线，干净亲和不尖锐' },
  { value: 'male_steady', label: '沉稳男顾问', hint: '成年男性低中音，稳重可信' },
  { value: 'female_live', label: '女声直播带看', hint: '女性门店主播，轻快有互动感' },
  { value: 'live_seller', label: '直播带看', hint: '门店主播口吻，适合短视频种草' },
  { value: 'energetic_promo', label: '促销强节奏', hint: '更有能量，突出权益和到店转化' },
  { value: 'male_review', label: '专业男评测', hint: '理性媒体评测感，卖点表达清楚' },
  { value: 'luxury_calm', label: '高级质感', hint: '成熟沉稳，有高端车广告质感' },
  { value: 'young_tech', label: '年轻科技感', hint: '清爽利落，适合智能配置介绍' },
  { value: 'family_warm', label: '家庭温和', hint: '亲和生活化，适合家用场景' },
  { value: 'soft_story', label: '温柔叙事', hint: '柔和有画面感，适合生活方式广告' },
  { value: 'local_friendly', label: '本地亲和', hint: '真实接地气，可轻微本地口吻' },
]
const CAR_NATIVE_SPEECH_STYLE_OPTIONS = [
  { value: 'natural', label: '自然语速', hint: '按正常口播节奏生成' },
  { value: 'concise', label: '短促利落', hint: '少废话、信息密度更高' },
  { value: 'emotional', label: '情绪递进', hint: '先吸引，再卖点，最后引导咨询' },
  { value: 'slow_detail', label: '细节讲解', hint: '更慢一些，适合配置说明' },
  { value: 'fast_hook', label: '开场抓人', hint: '前 2 秒更有吸引力，后面回到清晰表达' },
  { value: 'review_steady', label: '评测节奏', hint: '稳扎稳打，适合对比和配置说明' },
  { value: 'soft_story', label: '故事节奏', hint: '停顿更自然，适合生活化叙事' },
]

const FALLBACK_CAR_IMAGE_ROLES = [
  'car_exterior_front',
  'car_exterior_side',
  'car_exterior_rear',
  'car_interior_dashboard',
  'car_interior_front_seat',
  'car_interior_back_seat',
  'car_detail_light',
  'car_detail_wheel',
  'scene_showroom',
]

const CAR_ASSET_ROLE_ALIASES: Record<string, string> = {
  front: 'car_exterior_front',
  exterior_front: 'car_exterior_front',
  car_front: 'car_exterior_front',
  side: 'car_exterior_side',
  exterior_side: 'car_exterior_side',
  rear: 'car_exterior_rear',
  back: 'car_exterior_rear',
  exterior_rear: 'car_exterior_rear',
  '45': 'car_exterior_45',
  '45_degree': 'car_exterior_45',
  car_exterior_45_degree: 'car_exterior_45',
  interior: 'car_interior_dashboard',
  dashboard: 'car_interior_dashboard',
  interior_dashboard: 'car_interior_dashboard',
  front_seat: 'car_interior_front_seat',
  back_seat: 'car_interior_back_seat',
  rear_seat: 'car_interior_back_seat',
  steering: 'car_interior_steering',
  steering_wheel: 'car_interior_steering',
  instrument: 'car_interior_steering',
  dashboard_wheel: 'car_interior_steering',
  trunk: 'car_interior_trunk',
  boot: 'car_interior_trunk',
  light: 'car_detail_light',
  headlight: 'car_detail_light',
  wheel: 'car_detail_wheel',
  logo: 'car_detail_logo',
  seat: 'car_detail_seat_material',
  seat_material: 'car_detail_seat_material',
  material: 'car_detail_seat_material',
  showroom: 'scene_showroom',
  scene: 'scene_showroom',
  outdoor: 'scene_outdoor',
  city: 'scene_outdoor',
  road: 'scene_road',
  mountain: 'scene_road',
  highway: 'scene_road',
  night: 'scene_night',
  store_night: 'scene_night',
  dealership: 'scene_showroom',
  scene_outdoor_city: 'scene_outdoor',
  scene_road: 'scene_road',
  host: 'host_image',
  avatar: 'host_image',
}

const CAR_SCENE_ROLE_PRIORITY: string[][] = [
  ['car_exterior_front', 'car_exterior_side', 'car_exterior_45', 'car_exterior_rear'],
  ['car_interior_dashboard', 'car_interior_front_seat', 'car_interior_back_seat', 'car_interior_steering'],
  ['car_detail_light', 'car_detail_wheel', 'car_detail_logo', 'car_detail_seat_material'],
  ['scene_showroom', 'car_exterior_front', 'host_image', 'car_exterior_side'],
  ['scene_outdoor', 'scene_road', 'scene_night', 'car_exterior_side', 'car_exterior_45'],
  ['car_detail_logo', 'car_detail_light', 'car_exterior_rear', 'scene_showroom'],
]

const CAR_IDENTITY_ANCHOR_ROLES = ['car_exterior_front', 'car_exterior_side', 'car_exterior_45', 'car_exterior_rear']
const CAR_VEHICLE_REFERENCE_ROLES = CAR_MATERIAL_TARGETS
  .filter((item) => item.group !== 'scene' && item.group !== 'host')
  .map((item) => item.role)
const CAR_SCENE_REFERENCE_ROLES = CAR_MATERIAL_TARGETS
  .filter((item) => item.group === 'scene')
  .map((item) => item.role)
const FALLBACK_CAR_SCENE_IMAGE_ROLES = ['scene_showroom', 'scene_outdoor', 'scene_road', 'scene_night']

const CAR_SCENE_KEYWORD_ROLES: Array<{ keywords: string[]; roles: string[] }> = [
  { keywords: ['内饰', '座椅', '中控', '空间', '前排', '后排', '方向盘', '仪表', '后备箱'], roles: ['car_interior_dashboard', 'car_interior_front_seat', 'car_interior_back_seat', 'car_interior_steering', 'car_interior_trunk'] },
  { keywords: ['车灯', '灯光', '轮毂', 'logo', '标识', '细节', '材质'], roles: ['car_detail_light', 'car_detail_wheel', 'car_detail_logo', 'car_detail_seat_material'] },
  { keywords: ['展厅', '门店', '到店', '试驾', '邀约', '销售顾问'], roles: ['scene_showroom', 'car_exterior_front', 'host_image'] },
  { keywords: ['户外', '城市', '公路', '道路', '山路', '夜景', '通勤', '出行'], roles: ['scene_outdoor', 'scene_road', 'scene_night', 'car_exterior_side'] },
  { keywords: ['外观', '车头', '车身', '正面', '侧面', '背面'], roles: ['car_exterior_front', 'car_exterior_side', 'car_exterior_45', 'car_exterior_rear'] },
]

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
const carSubtitleOptions: Array<{ key: CarSubtitleMode; label: string }> = [
  { key: 'off', label: '关闭' },
  { key: 'auto', label: '自动字幕' },
  { key: 'custom', label: '自定义字幕' },
]
const carSubtitleLanguageOptions = [
  { value: 'zh-CN', label: '中文普通话' },
  { value: 'en-US', label: '英语' },
]
const renderAspectRatioOptions: Array<{ value: RenderAspectRatio; label: string; hint: string }> = [
  { value: '9:16', label: '竖屏 9:16', hint: '适合抖音、视频号、竖版信息流' },
  { value: '16:9', label: '横屏 16:9', hint: '适合横版展示、门店大屏和通用素材' },
  { value: 'auto', label: '跟随素材', hint: '交给模型按素材主体自动决定' },
]

const route = useRoute()
const router = useRouter()
const productionMode = ref<RenderProductionMode>(route.query.mode === 'quick' ? 'quick' : 'manual')

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

watch(
  () => route.query.mode,
  (mode) => {
    productionMode.value = mode === 'quick' ? 'quick' : 'manual'
  },
)

function setProductionMode(mode: RenderProductionMode) {
  productionMode.value = mode
  const query = { ...route.query }
  if (mode === 'quick') {
    query.mode = 'quick'
  } else {
    delete query.mode
  }
  void router.replace({ name: 'render', query })
}

const selectedModel = ref<SeedanceModelValue>('doubao-seedance-1-5-pro-251215')
const modelDropdownOpen = ref(false)
const modelDropdownRef = ref<HTMLElement | null>(null)

const prompt = ref('')
const duration = ref<number>(5)
const renderAspectRatio = ref<RenderAspectRatio>('9:16')
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
const carImageAssetIdsByUrl = ref<Record<string, number>>({})
const carImageAssetRoleByUrl = ref<Record<string, string>>({})
const carSceneImages = ref<string[]>([''])
const carSceneImageAssetIdsByUrl = ref<Record<string, number>>({})
const carSceneImageAssetRoleByUrl = ref<Record<string, string>>({})
const carBundleAssetUrl = ref('')
const carBundleAssetId = ref<number | null>(null)
const carBundleSaveName = ref('')
const carBundleLoadedName = ref('')
const carBundleImageCount = ref(0)
const carBundleLoadError = ref('')
const carBundleSaving = ref(false)
const carPickedImageUrl = ref('')
const carPickedSceneImageUrl = ref('')
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
const carBenchmarkVoiceText = ref('')
const carBenchmarkUploading = ref(false)
const carBenchmarkUploadName = ref('')
const carAudioUrl = ref('')
const carAudioAssetId = ref<number | null>(null)
const carAudioSourceType = ref('')
const carAudioMode = ref<CarAudioMode>('model_native')
const carAudioUploading = ref(false)
const carAudioUploadName = ref('')
const carVoiceTextSource = ref<CarVoiceTextSource>('auto')
const carNativeVoiceLanguage = ref<NativeVoiceLanguage>('zh-CN')
const carNativeVoiceStyle = ref('natural_explain')
const carNativeSpeechStyle = ref('natural')
const carSubtitleMode = ref<CarSubtitleMode>('off')
const carSubtitleText = ref('')
const carSubtitleLanguage = ref('zh-CN')
const carBgmUrl = ref('')
const carBgmAssetId = ref<number | null>(null)
const carBgmSourceType = ref('')
const carBgmUploading = ref(false)
const carBgmUploadName = ref('')
const carAudioDurationSeconds = ref<number | null>(null)
const carHostImageUrl = ref('')
const carHostImageAssetId = ref<number | null>(null)
const carHostAppearanceEnabled = ref(false)
const carMaterialVideoUrl = ref('')
const carMaterialVideoAssetId = ref<number | null>(null)
const carSegmentCount = ref(4)
const carSegmentCountOptions = Array.from({ length: 12 }, (_, idx) => idx + 1)
const carSegmentDuration = ref(8)
const carSegmentDurations = ref<number[]>([])
const carSegmentTimingTouched = ref(false)
const carRolePickerOpenIndex = ref<number | null>(null)
const carSceneRolePickerOpenIndex = ref<number | null>(null)

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
const seedanceSubmitInFlight = ref(false)
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
  { ceiling: 88, minStep: 0.08, roomRate: 0.014 },
)
const showTaskProgress = computed(
  () => showTaskProgressBar.value || !!activeDigitalHumanTaskId.value || !!activeSeedanceTaskId.value,
)
const generateButtonBusy = computed(() => (mainTab.value === 'digitalHuman' ? busy.value : seedanceSubmitInFlight.value))
const generateButtonText = computed(() => {
  if (mainTab.value !== 'digitalHuman') {
    return seedanceSubmitInFlight.value ? '提交中...' : activeSeedanceTaskId.value ? '再生成一条视频' : '开始生成视频'
  }
  return busy.value ? '生成中…' : '开始生成视频'
})
let digitalHumanPollTimer: number | null = null
let stopSeedanceTaskTracking: (() => void) | null = null
let carSalesPartialFetchInFlight = false
let carSalesPartialFetchAt = 0

const currentTaskIsCarSales = computed(() => mainTab.value === 'carSales' || !!result.value?.segmentVideos?.length)
const renderSegmentCount = computed(() => result.value?.segmentCount || carSegmentCount.value || 1)
const renderCompletedSegmentCount = computed(() =>
  Math.min(
    renderSegmentCount.value,
    Math.max(
      result.value?.completedSegmentCount || 0,
      result.value?.segmentVideos?.length || 0,
    ),
  ),
)
const renderTaskStatusText = computed(() => {
  if (!currentTaskIsCarSales.value) {
    return '视频正在生成，耗时会受模型排队、素材大小和网络状态影响，请在任务中心查看进度。'
  }
  if (result.value?.stage) {
    return result.value.stage
  }
  if (taskStatus.value === 'QUEUED') {
    return '任务已进入队列，等待开始并行分段生成。'
  }
  const progress = taskProgress.value ?? barProgressPercent.value
  const total = renderSegmentCount.value
  const completed = renderCompletedSegmentCount.value
  if (progress >= 86) {
    return '分段视频已完成，正在合成整条视频并处理音频。'
  }
  if (completed > 0) {
    return `并行生成中，已完成 ${completed} / ${total} 段，完成的片段可先在下方预览。`
  }
  return `正在并行生成 ${total} 段视频，完成后会先展示片段预览。`
})

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

const renderAspectRatioHint = computed(
  () => renderAspectRatioOptions.find((item) => item.value === renderAspectRatio.value)?.hint || '',
)

function aspectRatioForRequest() {
  return renderAspectRatio.value === 'auto' ? undefined : renderAspectRatio.value
}

const isSeedance2Selected = computed(() => selectedModel.value === SEEDANCE_2_MODEL)

const audioReferenceHint = computed(() => {
  if (usesModelNativeVoiceover()) {
    return '文案会直接交给视频模型生成匹配的画面和原生音频；需要指定音色时请先用声音生成产出音频。'
  }
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

const activeModelRequirement = computed<ModelRequirement | null>(() => {
  if (mainTab.value === 'image' && imageSubTab.value === 'firstLast') {
    return {
      model: 'doubao-seedance-1-5-pro-251215',
      reason: '首尾帧生成当前使用 seedance1.5 能力',
    }
  }
  if (mainTab.value !== 'carSales') {
    return null
  }
  if (carAudioMode.value === 'reference' && carAudioUrl.value.trim()) {
    return {
      model: SEEDANCE_2_MODEL,
      reason: '参考音频生成只支持 seedance2.0',
    }
  }
  if (maxStoryboardSegmentDurationRaw.value && maxStoryboardSegmentDurationRaw.value > 12) {
    return {
      model: SEEDANCE_2_MODEL,
      reason: '分镜里存在超过 12 秒的单镜头，需要 seedance2.0 的更长单段时长',
    }
  }
  if (carSegmentDurations.value.some((duration) => Number(duration) > 12)) {
    return {
      model: SEEDANCE_2_MODEL,
      reason: '当前每段时长设置超过 seedance1.5 上限',
    }
  }
  if (hasCarSceneReference.value) {
    return {
      model: SEEDANCE_2_MODEL,
      reason: '场景替换需要多参考图控制，seedance1.5 只能取单张首帧',
    }
  }
  if (carHostAppearanceEnabled.value && carHostImageUrl.value.trim() && carImageUrls.value.length > 0) {
    return {
      model: SEEDANCE_2_MODEL,
      reason: '人物形象和车辆同时参考时，需要多参考图保持一致性',
    }
  }
  return null
})

const modelAutoHint = computed(() => {
  const requirement = activeModelRequirement.value
  if (!requirement) {
    return ''
  }
  const label = seedanceModelOptions.find((item) => item.value === requirement.model)?.label || requirement.model
  return `已自动匹配 ${label}：${requirement.reason}`
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
  enforceRequiredModelSelection()
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

function setCarVoiceTextSource(source: CarVoiceTextSource) {
  if (source === 'benchmark' && !carBenchmarkVoiceText.value.trim()) {
    ElMessage.warning('请先选择或上传爆款对标文案')
    return
  }
  carVoiceTextSource.value = source
}

function setCarAudioMode(mode: CarAudioMode) {
  if ((mode === 'post_mix' || mode === 'reference') && !carAudioUrl.value.trim()) {
    ElMessage.warning('请先选择或上传口播音频')
    return
  }
  carAudioMode.value = mode
  if (mode === 'reference') {
    carSegmentCount.value = 1
    carSegmentDurations.value = normalizeCarSegmentDurations(carRecommendedSegmentDurations.value, 1)
    syncCarSegmentDurationFallback(carSegmentDurations.value)
    carSegmentTimingTouched.value = false
  }
  enforceRequiredModelSelection()
}

const carNativeVoiceStyleLabel = computed(
  () => CAR_NATIVE_VOICE_STYLE_OPTIONS.find((item) => item.value === carNativeVoiceStyle.value)?.label || '自然讲解',
)
const carNativeVoiceLanguageLabel = computed(
  () => CAR_NATIVE_VOICE_LANGUAGE_OPTIONS.find((item) => item.value === carNativeVoiceLanguage.value)?.label || '中文讲述',
)
const carNativeSpeechStyleLabel = computed(
  () => CAR_NATIVE_SPEECH_STYLE_OPTIONS.find((item) => item.value === carNativeSpeechStyle.value)?.label || '自然语速',
)
const carNativeVoiceLanguageHint = computed(
  () => CAR_NATIVE_VOICE_LANGUAGE_OPTIONS.find((item) => item.value === carNativeVoiceLanguage.value)?.hint || '',
)
const carNativeVoiceStyleHint = computed(
  () => CAR_NATIVE_VOICE_STYLE_OPTIONS.find((item) => item.value === carNativeVoiceStyle.value)?.hint || '',
)
const carNativeSpeechStyleHint = computed(
  () => CAR_NATIVE_SPEECH_STYLE_OPTIONS.find((item) => item.value === carNativeSpeechStyle.value)?.hint || '',
)
const carNativeVoiceStyleSummary = computed(
  () => `${carNativeVoiceLanguageLabel.value} / ${carNativeVoiceStyleLabel.value} / ${carNativeSpeechStyleLabel.value}`,
)

const carVoiceTextSourceLabel = computed(() => {
  if (carVoiceTextSource.value === 'benchmark' && carBenchmarkVoiceText.value.trim()) return '爆款对标文案'
  if (carVoiceTextSource.value === 'manual') return '手写口播文案'
  return '系统整理文案'
})

const carVoiceTextSourceHint = computed(() => {
  if (carVoiceTextSource.value === 'benchmark') {
    return carBenchmarkVoiceText.value.trim()
      ? '爆款对标原文会逐字保留，并按分镜段落拆入下方结构'
      : '请先选择或上传爆款对标文案'
  }
  if (carVoiceTextSource.value === 'manual') {
    return '会优先使用高级微调里的口播文案原文；为空则回退到系统整理文案'
  }
  return '系统会根据车型、卖点、文案场景和转化引导整理口播文案，并按分镜节奏拆段'
})

const digitalHumanAudioReady = computed(() => {
  if (digitalHumanAudioMode.value === 'text') {
    return digitalHumanText.value.trim().length > 0
  }
  return digitalHumanAudio.value.trim().length > 0
})

const carImageUrls = computed(() => carImages.value.map((url) => url.trim()).filter((url) => url.length > 0))
const carSceneMaterialUrls = computed(() => carSceneImages.value.map((url) => url.trim()).filter((url) => url.length > 0))
const carImageSceneReferenceUrls = computed(() =>
  carImageUrls.value.filter((url, idx) => CAR_SCENE_REFERENCE_ROLES.includes(carImageRoleForUrl(url, idx))),
)
const hasCarSceneReference = computed(() => carSceneMaterialUrls.value.length > 0 || carImageSceneReferenceUrls.value.length > 0)
const carTotalDuration = computed(() => normalizedCarSegmentDurations.value.reduce((sum, value) => sum + value, 0))
function collectProvidedCarMaterialRoles() {
  const providedRoles = new Set<string>()
  const untaggedImages: string[] = []
  const untaggedSceneImages: string[] = []

  for (const url of carImageUrls.value) {
    const role = normalizeCarAssetRole(carImageAssetRoleByUrl.value[url])
    if (role) {
      providedRoles.add(role)
    } else {
      untaggedImages.push(url)
    }
  }

  for (const url of carSceneMaterialUrls.value) {
    const role = normalizeCarAssetRole(carSceneImageAssetRoleByUrl.value[url])
    if (role) {
      providedRoles.add(role)
    } else {
      untaggedSceneImages.push(url)
    }
  }

  untaggedImages.forEach((_, idx) => {
    const fallbackRole = FALLBACK_CAR_IMAGE_ROLES[idx]
    if (fallbackRole) providedRoles.add(fallbackRole)
  })
  untaggedSceneImages.forEach((_, idx) => {
    const fallbackRole = FALLBACK_CAR_SCENE_IMAGE_ROLES[idx]
    if (fallbackRole) providedRoles.add(fallbackRole)
  })

  if (carHostAppearanceEnabled.value && carHostImageUrl.value.trim()) {
    providedRoles.add('host_image')
  }
  return providedRoles
}

const carMaterialCompleteness = computed(() => {
  const providedRoles = collectProvidedCarMaterialRoles()
  const providedTargets = CAR_MATERIAL_TARGETS.filter((item) => providedRoles.has(item.role))
  const missingTargets = CAR_MATERIAL_TARGETS.filter((item) => !providedRoles.has(item.role))
  const percent = CAR_MATERIAL_TARGETS.length
    ? Math.round((providedTargets.length / CAR_MATERIAL_TARGETS.length) * 100)
    : 0
  const extraLabels: string[] = []
  if (hasSelectedVoiceAudio()) {
    extraLabels.push('口播')
  }
  if (carBgmUrl.value.trim()) {
    extraLabels.push('BGM')
  }
  return {
    providedCount: providedTargets.length,
    totalCount: CAR_MATERIAL_TARGETS.length,
    percent,
    providedLabels: [...providedTargets.map((item) => item.label), ...extraLabels],
    missingLabels: missingTargets.map((item) => item.label),
  }
})
const carMaterialProvidedText = computed(() =>
  carMaterialCompleteness.value.providedLabels.length
    ? carMaterialCompleteness.value.providedLabels.join('、')
    : '暂无',
)
const carStoryboardNeededVehicleRoles = computed(() => {
  const roles: string[] = []
  const pushRole = (role: string) => {
    if (CAR_VEHICLE_REFERENCE_ROLES.includes(role) && !roles.includes(role)) {
      roles.push(role)
    }
  }
  const shots = storyboardShotsForRecommendation.value.slice(0, carSegmentCount.value)
  if (shots.length > 0) {
    shots.forEach((shot, idx) => {
      const title = `镜头 ${shot.order || idx + 1}`
      const visualPrompt = storyboardVisualText(shot, idx)
      carSceneRolePriority(title, visualPrompt, idx).forEach(pushRole)
    })
  } else {
    for (let idx = 0; idx < carSegmentCount.value; idx += 1) {
      ;(CAR_SCENE_ROLE_PRIORITY[idx] || CAR_SCENE_ROLE_PRIORITY[0]).forEach(pushRole)
    }
  }
  if (!roles.some((role) => CAR_IDENTITY_ANCHOR_ROLES.includes(role))) {
    CAR_IDENTITY_ANCHOR_ROLES.slice(0, 2).forEach(pushRole)
  }
  return roles
})
const carStoryboardNeededVehicleRoleLabels = computed(() =>
  carStoryboardNeededVehicleRoles.value.map(carRoleLabel),
)
const carStoryboardMissingVehicleRoleLabels = computed(() => {
  const providedRoles = collectProvidedCarMaterialRoles()
  return carStoryboardNeededVehicleRoles.value
    .filter((role) => !providedRoles.has(role))
    .map(carRoleLabel)
})
const carStoryboardBundleNeedText = computed(() => {
  const labels = carStoryboardNeededVehicleRoleLabels.value
  const prefix = labels.length
    ? `当前分镜建议优先准备：${labels.join('、')}`
    : '建议按分镜会出现的车身、内饰和细节部位准备素材'
  return `${prefix}。生成时会按每段分镜从素材包中取对应部位，Seedance2 单段最多使用 ${SEEDANCE2_MAX_REFERENCE_IMAGES} 张参考图。`
})
const carMaterialMissingText = computed(() =>
  carStoryboardMissingVehicleRoleLabels.value.length
    ? carStoryboardMissingVehicleRoleLabels.value.slice(0, 6).join('、')
    : carMaterialCompleteness.value.missingLabels.length
    ? carMaterialCompleteness.value.missingLabels.slice(0, 6).join('、')
    : '已覆盖主要一致性素材',
)
const carMaterialCompletenessStatus = computed(() => {
  const { providedCount, totalCount } = carMaterialCompleteness.value
  if (providedCount >= 8) return `较完整（${providedCount} / ${totalCount}）`
  if (providedCount >= 4) return `可用，建议补充（${providedCount} / ${totalCount}）`
  return `偏少（${providedCount} / ${totalCount}）`
})
const carReferenceImageStrategyLabel = computed(() =>
  isSeedance2Selected.value
    ? `按片段选择最多 ${SEEDANCE2_MAX_REFERENCE_IMAGES} 张相关参考图`
    : '每段只取最关键 1 张首帧图',
)
const carVoicePolicyLevel = computed(() => {
  if (hasSelectedVoiceAudio()) return 'ok'
  if (usesModelNativeVoiceover()) return 'ok'
  return 'neutral'
})
const carVoicePolicyTitle = computed(() => {
  if (hasSelectedVoiceAudio()) return '口播主控：已选择口播音频'
  if (usesModelNativeVoiceover()) return '口播主控：文案生成音视频'
  return '口播主控：未设置口播音频'
})
const carVoicePolicyDescription = computed(() => {
  if (hasSelectedVoiceAudio()) {
    if (carAudioMode.value === 'reference') {
      return '本次将用口播音频控制内容、节奏和字幕；BGM 只作为背景音乐。'
    }
    return '本次将先生成画面，再用口播音频替换或混入最终音轨；BGM 不参与口播、字幕或口型。'
  }
  if (usesModelNativeVoiceover()) {
    if (carVoiceTextSource.value === 'benchmark' && carBenchmarkVoiceText.value.trim()) {
      return `将按爆款对标文案生成画面和模型原生音频；风格：${carNativeVoiceStyleSummary.value}。`
    }
    if (carVoiceTextSource.value === 'manual' && carVoiceContext.value.trim()) {
      return `已检测到手写口播文案；视频模型会直接按这版文案生成画面和原生音频。风格：${carNativeVoiceStyleSummary.value}。`
    }
    return `未上传口播音频；系统会根据车型卖点、文案场景和转化引导整理文案，再由视频模型生成画面和原生音频。风格：${carNativeVoiceStyleSummary.value}。`
  }
  if (carBgmUrl.value.trim()) {
    return '当前只选择了 BGM；BGM 不会作为口播、字幕或口型来源。'
  }
  return '当前选择不使用口播音频；生成会以画面和车辆信息为主，BGM 仍只作为背景音乐。'
})

const storyboardShotsForRecommendation = computed(() => extractStoryboardShots(carStoryboardContext.value))
const storyboardDurationSeconds = computed(() => storyboardTotalDuration(storyboardShotsForRecommendation.value))
const storyboardTimingSignature = computed(() =>
  storyboardShotsForRecommendation.value
    .map((shot, idx) => `${idx + 1}:${shot.order}:${shot.time || ''}`)
    .join('|'),
)
const maxStoryboardSegmentDurationRaw = computed(() => {
  const durations = storyboardShotsForRecommendation.value
    .map((shot) => parseStoryboardDurationRaw(shot.time))
    .filter((value): value is number => typeof value === 'number' && value > 0)
  return durations.length ? Math.max(...durations) : null
})
const carRecommendedSegmentCount = computed(() => {
  if (carAudioMode.value === 'reference' && carAudioUrl.value.trim()) {
    return 1
  }
  const shotCount = storyboardShotsForRecommendation.value.length
  if (shotCount > 0) {
    return Math.max(1, Math.min(12, shotCount))
  }
  if (carAudioDurationSeconds.value && carAudioDurationSeconds.value > 0) {
    return Math.max(1, Math.min(12, Math.ceil(carAudioDurationSeconds.value / selectedSeedanceModel.value.maxDuration)))
  }
  return Math.max(1, Math.min(12, carSegmentCount.value || 4))
})
const carRecommendedSegmentDurations = computed(() => {
  const count = carRecommendedSegmentCount.value
  const storyboardShots = storyboardShotsForRecommendation.value.slice(0, count)
  if (carAudioMode.value === 'reference' && carAudioDurationSeconds.value) {
    return [clampCarSegmentDuration(Math.ceil(carAudioDurationSeconds.value))]
  }
  if (storyboardShots.length > 0) {
    return Array.from({ length: count }, (_, idx) => {
      const raw = parseStoryboardDurationRaw(storyboardShots[idx]?.time || '')
      return clampCarSegmentDuration(raw || carSegmentDuration.value || 8)
    })
  }
  if (carAudioDurationSeconds.value) {
    return distributeDurationAcrossSegments(Math.ceil(carAudioDurationSeconds.value), count)
  }
  return Array.from({ length: count }, () => clampCarSegmentDuration(carSegmentDuration.value || 8))
})
const normalizedCarSegmentDurations = computed(() =>
  normalizeCarSegmentDurations(carSegmentDurations.value, carSegmentCount.value),
)
const carRecommendedTotalDuration = computed(() => sumDurations(carRecommendedSegmentDurations.value))
const carRecommendationSummary = computed(
  () =>
    `${carRecommendedSegmentCount.value} 段，总约 ${carRecommendedTotalDuration.value} 秒（${formatDurationList(carRecommendedSegmentDurations.value)}）`,
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
const carSegmentDurationSummary = computed(() =>
  `总约 ${carTotalDuration.value} 秒（${formatDurationList(normalizedCarSegmentDurations.value)}）`,
)
const carSegmentDurationPanelHint = computed(() =>
  carSegmentTimingTouched.value
    ? '已按手动设置提交，分镜变化后会重新推荐'
    : storyboardShotsForRecommendation.value.length
    ? '已按分镜时间自动填写，可逐段微调'
    : '没有分镜时间时使用默认均匀时长，可逐段调整',
)
const carSegmentTimingNotice = computed(() => {
  const rawMax = maxStoryboardSegmentDurationRaw.value
  if (rawMax && rawMax > selectedSeedanceModel.value.maxDuration) {
    return `部分分镜超过 ${selectedSeedanceModel.value.maxDuration} 秒，已按当前模型单段上限截断；更长镜头建议拆成多个分镜。`
  }
  if (storyboardShotsForRecommendation.value.length) {
    return '分镜时间变化后会重新给出推荐分段；你手动调整后，提交时会按这里的每段时长生成。'
  }
  return ''
})
const recommendationMatchesCurrent = computed(
  () =>
    carSegmentCount.value === carRecommendedSegmentCount.value &&
    sameDurationList(normalizedCarSegmentDurations.value, carRecommendedSegmentDurations.value),
)

function enforceRequiredModelSelection() {
  const requirement = activeModelRequirement.value
  if (!requirement || selectedModel.value === requirement.model) {
    return
  }
  selectedModel.value = requirement.model
  modelDropdownOpen.value = false
  if (mainTab.value === 'carSales' && !carSegmentTimingTouched.value) {
    carSegmentDurations.value = normalizeCarSegmentDurations(
      carRecommendedSegmentDurations.value,
      carRecommendedSegmentCount.value,
    )
    syncCarSegmentDurationFallback(carSegmentDurations.value)
  }
}

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
  carSegmentDurations.value = normalizeCarSegmentDurations(carSegmentDurations.value, carSegmentCount.value)
  enforceRequiredModelSelection()
})

watch(
  () => [
    mainTab.value,
    imageSubTab.value,
    activeModelRequirement.value?.model || '',
    activeModelRequirement.value?.reason || '',
  ].join('|'),
  () => enforceRequiredModelSelection(),
  { immediate: true },
)

watch(
  () => storyboardTimingSignature.value,
  (signature, previous) => {
    if (!signature || signature === previous || mainTab.value !== 'carSales' || busy.value) {
      return
    }
    applyCarRecommendation(false)
  },
)

let audioDurationRequestId = 0
watch(
  () => carAudioUrl.value,
  (url) => {
    const requestId = ++audioDurationRequestId
    carAudioDurationSeconds.value = null
    const cleanUrl = url.trim()
    if (!cleanUrl) {
      if (carAudioMode.value === 'post_mix' || carAudioMode.value === 'reference') {
        carAudioMode.value = 'model_native'
      }
      return
    }
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
  const removedUrl = carImages.value[idx] || ''
  carImages.value.splice(idx, 1)
  forgetCarImageAssetIfUnused(removedUrl)
}

function updateCarImage(idx: number, value: string) {
  const previousUrl = carImages.value[idx]?.trim()
  carImages.value[idx] = value
  const nextUrl = value.trim()
  if (previousUrl && previousUrl !== nextUrl) {
    forgetCarImageAssetIfUnused(previousUrl)
  }
}

function addCarSceneImageSlot() {
  if (carSceneImages.value.length >= MAX_REFERENCE) {
    return
  }
  carSceneImages.value.push('')
}

function removeCarSceneImageSlot(idx: number) {
  if (carSceneImages.value.length <= 1) {
    return
  }
  const removedUrl = carSceneImages.value[idx] || ''
  carSceneImages.value.splice(idx, 1)
  forgetCarSceneImageAssetIfUnused(removedUrl)
}

function updateCarSceneImage(idx: number, value: string) {
  const previousUrl = carSceneImages.value[idx]?.trim()
  carSceneImages.value[idx] = value
  const nextUrl = value.trim()
  if (previousUrl && previousUrl !== nextUrl) {
    forgetCarSceneImageAssetIfUnused(previousUrl)
  }
}

function parseAssetMetadata(value: string | null | undefined): Record<string, unknown> | null {
  if (!value || !value.trim()) {
    return null
  }
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null
  } catch {
    return null
  }
}

function firstRecordText(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return ''
}

function toPositiveNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function normalizeCarAssetRole(value: unknown) {
  if (typeof value !== 'string') {
    return ''
  }
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (!normalized) {
    return ''
  }
  const aliased = CAR_ASSET_ROLE_ALIASES[normalized] || normalized
  return CAR_MATERIAL_TARGETS.some((item) => item.role === aliased) ? aliased : ''
}

function updateCarImageRole(url: string, role: string) {
  const cleanUrl = url.trim()
  if (!cleanUrl) {
    return
  }
  const normalizedRole = normalizeCarAssetRole(role)
  const nextRoles = { ...carImageAssetRoleByUrl.value }
  if (normalizedRole) {
    nextRoles[cleanUrl] = normalizedRole
  } else {
    delete nextRoles[cleanUrl]
  }
  carImageAssetRoleByUrl.value = nextRoles
}

function toggleCarRolePicker(index: number) {
  carRolePickerOpenIndex.value = carRolePickerOpenIndex.value === index ? null : index
}

function selectCarImageRole(url: string, role: string) {
  updateCarImageRole(url, role)
  carRolePickerOpenIndex.value = null
}

function updateCarSceneImageRole(url: string, role: string) {
  const cleanUrl = url.trim()
  if (!cleanUrl) {
    return
  }
  const normalizedRole = normalizeCarAssetRole(role)
  const nextRoles = { ...carSceneImageAssetRoleByUrl.value }
  if (normalizedRole && CAR_SCENE_REFERENCE_ROLES.includes(normalizedRole)) {
    nextRoles[cleanUrl] = normalizedRole
  } else {
    delete nextRoles[cleanUrl]
  }
  carSceneImageAssetRoleByUrl.value = nextRoles
}

function toggleCarSceneRolePicker(index: number) {
  carSceneRolePickerOpenIndex.value = carSceneRolePickerOpenIndex.value === index ? null : index
}

function selectCarSceneImageRole(url: string, role: string) {
  updateCarSceneImageRole(url, role)
  carSceneRolePickerOpenIndex.value = null
}

function carAssetRoleFromAsset(asset: AssetItem) {
  const metadata = parseAssetMetadata(asset.metadataJson)
  const metadataRole = normalizeCarAssetRole(metadata?.assetRole)
  if (metadataRole) {
    return metadataRole
  }
  const inferredRole = inferCarAssetRoleFromAsset(asset, metadata)
  if (inferredRole) {
    return inferredRole
  }
  return normalizeCarAssetRole(asset.kind)
}

function inferCarAssetRoleFromAsset(asset: AssetItem, metadata: Record<string, unknown> | null) {
  const sourceType = String(asset.sourceType || '').trim().toUpperCase()
  const source = metadata ? firstRecordText(metadata, ['source']) : ''
  const name = [
    asset.fileName,
    metadata ? firstRecordText(metadata, ['originalFileName', 'title', 'sourceTitle']) : '',
  ].filter(Boolean).join(' ').toLowerCase()

  if (
    sourceType === 'AVATAR_GENERATE' ||
    source.toUpperCase() === 'DOUBAO_SEEDREAM' ||
    name.includes('avatar') ||
    name.includes('host') ||
    name.includes('主播') ||
    name.includes('数字人')
  ) {
    return 'host_image'
  }
  if (name.includes('side') || name.includes('侧面') || name.includes('车侧')) return 'car_exterior_side'
  if (name.includes('rear') || name.includes('back') || name.includes('尾部') || name.includes('车尾') || name.includes('背面')) return 'car_exterior_rear'
  if (name.includes('45')) return 'car_exterior_45'
  if (name.includes('dashboard') || name.includes('interior') || name.includes('内饰') || name.includes('中控')) return 'car_interior_dashboard'
  if (name.includes('front_seat') || name.includes('前排')) return 'car_interior_front_seat'
  if (name.includes('back_seat') || name.includes('rear_seat') || name.includes('后排')) return 'car_interior_back_seat'
  if (name.includes('steering') || name.includes('方向盘') || name.includes('仪表')) return 'car_interior_steering'
  if (name.includes('trunk') || name.includes('后备箱')) return 'car_interior_trunk'
  if (name.includes('wheel') || name.includes('轮毂') || name.includes('轮胎')) return 'car_detail_wheel'
  if (name.includes('logo') || name.includes('车标') || name.includes('标识')) return 'car_detail_logo'
  if (name.includes('light') || name.includes('灯')) return 'car_detail_light'
  if (name.includes('seat') || name.includes('座椅') || name.includes('材质')) return 'car_detail_seat_material'
  if (name.includes('showroom') || name.includes('展厅') || name.includes('门店')) return 'scene_showroom'
  if (name.includes('road') || name.includes('highway') || name.includes('山路') || name.includes('公路') || name.includes('道路')) return 'scene_road'
  if (name.includes('night') || name.includes('夜景')) return 'scene_night'
  if (name.includes('outdoor') || name.includes('city') || name.includes('户外') || name.includes('城市')) return 'scene_outdoor'
  if (name.includes('front') || name.includes('car') || name.includes('车头') || name.includes('正面') || name.includes('外观')) return 'car_exterior_front'
  return ''
}

function rememberCarImageAsset(asset: AssetItem, url: string) {
  const cleanUrl = url.trim()
  if (!cleanUrl) {
    return
  }
  carImageAssetIdsByUrl.value = {
    ...carImageAssetIdsByUrl.value,
    [cleanUrl]: asset.assetId,
  }
  const role = carAssetRoleFromAsset(asset)
  if (role) {
    carImageAssetRoleByUrl.value = {
      ...carImageAssetRoleByUrl.value,
      [cleanUrl]: role,
    }
  }
}

function forgetCarImageAsset(url: string) {
  const cleanUrl = url.trim()
  if (!cleanUrl) {
    return
  }
  const nextIds = { ...carImageAssetIdsByUrl.value }
  const nextRoles = { ...carImageAssetRoleByUrl.value }
  delete nextIds[cleanUrl]
  delete nextRoles[cleanUrl]
  carImageAssetIdsByUrl.value = nextIds
  carImageAssetRoleByUrl.value = nextRoles
}

function forgetCarImageAssetIfUnused(url: string) {
  const cleanUrl = url.trim()
  if (!cleanUrl || carImages.value.some((item) => item.trim() === cleanUrl)) {
    return
  }
  forgetCarImageAsset(cleanUrl)
}

function rememberCarSceneImageAsset(asset: AssetItem, url: string) {
  const cleanUrl = url.trim()
  if (!cleanUrl) {
    return
  }
  carSceneImageAssetIdsByUrl.value = {
    ...carSceneImageAssetIdsByUrl.value,
    [cleanUrl]: asset.assetId,
  }
  const role = carAssetRoleFromAsset(asset)
  carSceneImageAssetRoleByUrl.value = {
    ...carSceneImageAssetRoleByUrl.value,
    [cleanUrl]: CAR_SCENE_REFERENCE_ROLES.includes(role) ? role : 'scene_showroom',
  }
}

function forgetCarSceneImageAsset(url: string) {
  const cleanUrl = url.trim()
  if (!cleanUrl) {
    return
  }
  const nextIds = { ...carSceneImageAssetIdsByUrl.value }
  const nextRoles = { ...carSceneImageAssetRoleByUrl.value }
  delete nextIds[cleanUrl]
  delete nextRoles[cleanUrl]
  carSceneImageAssetIdsByUrl.value = nextIds
  carSceneImageAssetRoleByUrl.value = nextRoles
}

function forgetCarSceneImageAssetIfUnused(url: string) {
  const cleanUrl = url.trim()
  if (!cleanUrl || carSceneImages.value.some((item) => item.trim() === cleanUrl)) {
    return
  }
  forgetCarSceneImageAsset(cleanUrl)
}

function handleCarImageAssetSelect(payload: { asset: AssetItem; url: string }) {
  if (CAR_SCENE_REFERENCE_ROLES.includes(carAssetRoleFromAsset(payload.asset))) {
    handleCarSceneImageAssetSelect(payload)
    return
  }
  carPickedImageUrl.value = payload.url
  const emptyIndex = carImages.value.findIndex((url) => !url.trim())
  if (emptyIndex >= 0) {
    carImages.value[emptyIndex] = payload.url
  } else if (!carImages.value.includes(payload.url) && carImages.value.length < MAX_REFERENCE) {
    carImages.value.push(payload.url)
  }
  rememberCarImageAsset(payload.asset, payload.url)
}

function handleCarSceneImageAssetSelect(payload: { asset: AssetItem; url: string }) {
  carPickedSceneImageUrl.value = payload.url
  const emptyIndex = carSceneImages.value.findIndex((url) => !url.trim())
  if (emptyIndex >= 0) {
    carSceneImages.value[emptyIndex] = payload.url
  } else if (!carSceneImages.value.includes(payload.url) && carSceneImages.value.length < MAX_REFERENCE) {
    carSceneImages.value.push(payload.url)
  }
  rememberCarSceneImageAsset(payload.asset, payload.url)
}

function carImageRoleLabelForUrl(url: string, index: number) {
  const role = carImageRoleForUrl(url, index)
  return role ? carRoleLabel(role) : '选择部位'
}

function carSceneImageRoleLabelForUrl(url: string, index: number) {
  const role = carSceneImageRoleForUrl(url, index)
  return role ? carRoleLabel(role) : '选择场景'
}

async function handleCarBundleAssetSelect(payload: { asset: AssetItem; url: string }) {
  carBundleAssetUrl.value = payload.url
  carBundleAssetId.value = payload.asset.assetId
  carBundleLoadedName.value = payload.asset.fileName || ''
  carBundleImageCount.value = 0
  carBundleLoadError.value = ''
  try {
    const text = await getAssetTextContent(payload.asset)
    const parsed = JSON.parse(text) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('车型素材包格式不正确')
    }
    const bundle = parsed as Record<string, unknown>
    const images = Array.isArray(bundle.images) ? bundle.images : []
    const nextImages: string[] = []
    const nextIds: Record<string, number> = {}
    const nextRoles: Record<string, string> = {}
    const nextSceneImages: string[] = []
    const nextSceneIds: Record<string, number> = {}
    const nextSceneRoles: Record<string, string> = {}
    for (const raw of images) {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue
      const item = raw as Record<string, unknown>
      const url = firstRecordText(item, ['url', 'fileUrl', 'previewUrl', 'imageUrl'])
      if (!url) continue
      const role = normalizeCarAssetRole(firstRecordText(item, ['role', 'assetRole', 'type']))
      const assetId = toPositiveNumber(item.assetId)
      if (CAR_SCENE_REFERENCE_ROLES.includes(role)) {
        if (nextSceneImages.length >= MAX_REFERENCE) continue
        nextSceneImages.push(url)
        if (assetId) {
          nextSceneIds[url] = assetId
        }
        nextSceneRoles[url] = role
      } else {
        if (nextImages.length >= MAX_REFERENCE) continue
        nextImages.push(url)
        if (assetId) {
          nextIds[url] = assetId
        }
        if (role) {
          nextRoles[url] = role
        }
      }
    }
    if (!nextImages.length) {
      throw new Error('车型素材包内没有可用图片')
    }
    carImages.value = nextImages
    carImageAssetIdsByUrl.value = nextIds
    carImageAssetRoleByUrl.value = nextRoles
    if (nextSceneImages.length) {
      carSceneImages.value = nextSceneImages
      carSceneImageAssetIdsByUrl.value = nextSceneIds
      carSceneImageAssetRoleByUrl.value = nextSceneRoles
      carPickedSceneImageUrl.value = nextSceneImages[0] || ''
    }
    const brandModel = typeof bundle.brandModel === 'string' ? bundle.brandModel.trim() : ''
    if (brandModel) {
      carBrandModel.value = brandModel
      carBundleLoadedName.value = brandModel
    }
    carBundleImageCount.value = nextImages.length + nextSceneImages.length
    carPickedImageUrl.value = nextImages[0] || ''
    ElMessage.success('已载入车型素材包')
  } catch (error) {
    carBundleLoadError.value = error instanceof Error ? error.message : '车型素材包读取失败'
    errorMessage.value = error instanceof Error ? error.message : '车型素材包读取失败'
  }
}

async function saveCurrentCarBundle() {
  if (!carImageUrls.value.length) {
    errorMessage.value = '请先上传或选择车辆图片'
    return
  }
  carBundleSaving.value = true
  errorMessage.value = ''
  try {
    const name = carBundleSaveName.value.trim() || carBrandModel.value.trim() || '车型素材包'
    const images = carImageUrls.value.map((url, idx) => {
      const role = carImageRoleForUrl(url, idx)
      return {
        role,
        label: role ? carRoleLabel(role) : `图${idx + 1}`,
        assetId: carImageAssetIdsByUrl.value[url],
        url,
        fileName: url.split('/').pop() || `car-image-${idx + 1}`,
      }
    })
    const payload = {
      bundleType: 'car_model',
      assetRole: 'car_model_bundle',
      brandModel: carBrandModel.value.trim() || name,
      color: '',
      notes: '从视频制作页保存',
      images,
      createdAt: new Date().toISOString(),
    }
    const file = new File([JSON.stringify(payload, null, 2)], `${name.replace(/[\\/:*?"<>|]+/g, '_')}-车型素材包.json`, {
      type: 'application/json',
    })
    const asset = await uploadMaterialAsset(file, {
      metadataJson: JSON.stringify({
        from: 'car_model_bundle',
        assetRole: 'car_model_bundle',
        bundleType: 'car_model',
        brandModel: payload.brandModel,
      }),
    })
    carBundleAssetId.value = asset.assetId
    carBundleAssetUrl.value = asset.fileUrl
    ElMessage.success('已保存为车型素材包')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '车型素材包保存失败'
  } finally {
    carBundleSaving.value = false
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
      applyCarRecommendation(false)
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '分镜资产读取失败'
  }
}

async function handleCarBenchmarkAssetSelect(payload: { asset: AssetItem; url: string }) {
  carBenchmarkAssetUrl.value = payload.url
  carBenchmarkAssetId.value = payload.asset.assetId
  carBenchmarkUploadName.value = payload.asset.fileName || ''
  try {
    const text = await getAssetTextContent(payload.asset)
    applyBenchmarkVoiceText(text)
    if (!carBenchmarkVoiceText.value.trim()) {
      throw new Error('未从该资产中识别到可用口播文案')
    }
    ElMessage.success('已载入爆款对标文案')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '爆款文案读取失败'
  }
}

async function handleCarBenchmarkUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }
  carBenchmarkUploading.value = true
  carBenchmarkUploadName.value = file.name
  errorMessage.value = ''
  try {
    const rawText = await file.text()
    const extracted = extractBenchmarkVoiceText(rawText)
    if (!extracted.trim()) {
      throw new Error('没有识别到可用口播文案')
    }
    const isJson = file.name.toLowerCase().endsWith('.json') || file.type.toLowerCase().includes('json')
    const sourceFile = isJson
      ? file
      : new File(
          [
            JSON.stringify(
              {
                assetRole: 'benchmark_json',
                originalFileName: file.name,
                content: rawText,
                createdAt: new Date().toISOString(),
              },
              null,
              2,
            ),
          ],
          `${file.name.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]+/g, '_') || '爆款对标文案'}-爆款对标文案.json`,
          { type: 'application/json' },
        )
    const asset = await uploadMaterialAsset(sourceFile, {
      metadataJson: JSON.stringify({
        from: 'car_sales_benchmark_upload',
        assetRole: 'benchmark_json',
        originalFileName: file.name,
        source: 'render_video',
      }),
    })
    carBenchmarkAssetUrl.value = normalizePublicUrl(asset.fileUrl)
    carBenchmarkAssetId.value = asset.assetId
    carBenchmarkVoiceText.value = extracted
    carVoiceTextSource.value = 'benchmark'
    ElMessage.success('爆款对标文案已上传，将用于替换分镜旧台词')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '爆款文案上传失败'
  } finally {
    carBenchmarkUploading.value = false
    input.value = ''
  }
}

function handleCarAudioAssetSelect(payload: { asset: AssetItem; url: string }) {
  carAudioUrl.value = payload.url
  carAudioAssetId.value = payload.asset.assetId
  carAudioSourceType.value = payload.asset.sourceType || ''
  carAudioUploadName.value = payload.asset.fileName
  if (carAudioMode.value === 'none' || carAudioMode.value === 'model_native') {
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
    const asset = await uploadMaterialAsset(file, {
      metadataJson: JSON.stringify({
        from: 'car_sales_voice_upload',
        assetRole: 'voiceover',
        originalFileName: file.name,
        source: 'render_video',
      }),
    })
    carAudioUrl.value = normalizePublicUrl(asset.fileUrl)
    carAudioAssetId.value = asset.assetId
    carAudioSourceType.value = asset.sourceType || 'USER_UPLOAD'
    if (carAudioMode.value === 'none' || carAudioMode.value === 'model_native') {
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
    const asset = await uploadMaterialAsset(file, {
      metadataJson: JSON.stringify({
        from: 'car_sales_bgm_upload',
        assetRole: 'bgm',
        originalFileName: file.name,
        source: 'render_video',
      }),
    })
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

const STORYBOARD_IGNORED_FIELD_KEYS = [
  'content',
  'voiceText',
  'backgroundMusic',
  'narration',
  'script',
  'voiceover',
  'subtitle',
  'bgm',
]

function parseJsonSafely(raw: string): unknown | null {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const BENCHMARK_TEXT_KEYS = [
  'finalVoiceText',
  'rewrittenText',
  'rewriteText',
  'voiceText',
  'copyText',
  'scriptText',
  'script',
  'content',
  'text',
  'transcript',
  'caption',
  'originalText',
  'translatedText',
  'summary',
]

function limitLongText(text: string, max = 4000) {
  const clean = text.trim()
  return clean.length > max ? clean.slice(0, max) : clean
}

function benchmarkTextFromValue(value: unknown, depth = 0): string {
  if (depth > 5 || value == null) {
    return ''
  }
  if (typeof value === 'string') {
    return value.trim()
  }
  if (typeof value === 'number') {
    return String(value)
  }
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => benchmarkTextFromValue(item, depth + 1))
      .filter((item) => item.trim().length > 0)
    return parts.join('\n')
  }
  const record = asRecord(value)
  if (!record) {
    return ''
  }
  for (const key of BENCHMARK_TEXT_KEYS) {
    const candidate = benchmarkTextFromValue(record[key], depth + 1)
    if (candidate.trim()) {
      return candidate.trim()
    }
  }
  const nestedKeys = ['data', 'result', 'payload', 'parseResult', 'rewriteResult', 'transcriptResult', 'scriptResult']
  for (const key of nestedKeys) {
    const candidate = benchmarkTextFromValue(record[key], depth + 1)
    if (candidate.trim()) {
      return candidate.trim()
    }
  }
  const sceneLike = ['scenes', 'shots', 'segments', 'paragraphs', 'lines']
  for (const key of sceneLike) {
    const candidate = benchmarkTextFromValue(record[key], depth + 1)
    if (candidate.trim()) {
      return candidate.trim()
    }
  }
  return ''
}

function extractBenchmarkVoiceText(raw: string) {
  const clean = raw.trim()
  if (!clean) {
    return ''
  }
  const parsed = parseJsonSafely(clean)
  if (parsed == null) {
    return limitLongText(clean)
  }
  const extracted = benchmarkTextFromValue(parsed)
  return limitLongText(extracted || clean)
}

function applyBenchmarkVoiceText(raw: string) {
  const text = extractBenchmarkVoiceText(raw)
  carBenchmarkVoiceText.value = text
  if (text) {
    carVoiceTextSource.value = 'benchmark'
  }
}

function storyboardArrayFromParsed(parsed: unknown, depth = 0): unknown[] {
  if (depth > 3) {
    return []
  }
  if (Array.isArray(parsed)) {
    return parsed
  }
  const record = asRecord(parsed)
  if (!record) {
    return []
  }
  for (const key of ['scripts', 'storyboard', 'shots', 'scenes', 'segments']) {
    const value = record[key]
    if (Array.isArray(value)) {
      return value
    }
  }
  for (const key of ['result', 'data', 'parseResult', 'storyboardResult', 'output']) {
    const nested = storyboardArrayFromParsed(record[key], depth + 1)
    if (nested.length) {
      return nested
    }
  }
  return []
}

function extractStoryboardShots(raw: string): VideoScriptShotItem[] {
  const parsed = parseJsonSafely(raw.trim())
  const source = storyboardArrayFromParsed(parsed)
  return source
    .map((item, idx): VideoScriptShotItem | null => {
      const record = asRecord(item)
      if (!record) return null
      const orderValue = record.order ?? record.index ?? record.segmentIndex
      const order = typeof orderValue === 'number' ? orderValue : Number(orderValue) || idx + 1
      const camera = stringField(record, ['camera', 'cameraMotion', 'movement', 'motion'])
      const shotType = stringField(record, ['shotType', 'framing', 'lens', 'angle'])
      const composition = stringField(record, ['composition', 'layout'])
      const transition = stringField(record, ['transition', 'cut', 'rhythm'])
      return {
        order,
        time: stringField(record, ['time', 'duration', 'durationSec', 'estDurationSec', 'range']),
        page: stringField(record, ['page', 'visualPrompt', 'visual', 'scene', 'shot', 'picture', 'prompt', 'description']),
        visualPrompt: stringField(record, ['visualPrompt', 'visual']),
        prompt: stringField(record, ['prompt']),
        camera,
        cameraMotion: camera,
        movement: stringField(record, ['movement', 'motion']),
        shotType,
        framing: shotType,
        composition,
        transition,
        backgroundMusic: stringField(record, ['backgroundMusic', 'bgm']),
        content: stringField(record, ['content', 'voiceText', 'script', 'voiceover', 'subtitle', 'narration']),
        highlight: stringField(record, ['highlight', 'intent', 'goal', 'purpose', 'tips']),
      }
    })
    .filter((item): item is VideoScriptShotItem => !!item && (
      !!item.page ||
      !!item.highlight ||
      !!item.camera ||
      !!item.shotType ||
      !!item.composition ||
      !!item.transition
    ))
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
  const rounded = Math.round(value)
  return Math.max(min, Math.min(max, rounded))
}

function normalizeCarSegmentCount(value: number) {
  const parsed = Math.round(Number(value))
  return Math.max(1, Math.min(12, Number.isFinite(parsed) ? parsed : 1))
}

function normalizeCarSegmentDurations(values: number[], count: number) {
  const normalizedCount = normalizeCarSegmentCount(count)
  return Array.from({ length: normalizedCount }, (_, idx) => {
    const explicit = Number(values[idx])
    if (Number.isFinite(explicit) && explicit > 0) {
      return clampCarSegmentDuration(explicit)
    }
    const recommended = Number(carRecommendedSegmentDurations.value[idx])
    if (Number.isFinite(recommended) && recommended > 0) {
      return clampCarSegmentDuration(recommended)
    }
    return clampCarSegmentDuration(carSegmentDuration.value || 8)
  })
}

function sumDurations(values: number[]) {
  return values.reduce((sum, value) => sum + Math.max(0, Math.round(value || 0)), 0)
}

function averageSegmentDuration(values: number[]) {
  if (!values.length) {
    return clampCarSegmentDuration(carSegmentDuration.value || 8)
  }
  return clampCarSegmentDuration(Math.round(sumDurations(values) / values.length))
}

function sameDurationList(left: number[], right: number[]) {
  return left.length === right.length && left.every((value, idx) => value === right[idx])
}

function formatDurationList(values: number[]) {
  if (!values.length) {
    return '-'
  }
  if (values.every((value) => value === values[0])) {
    return `每段 ${values[0]} 秒`
  }
  return values.map((value) => `${value}`).join(' / ') + ' 秒'
}

function distributeDurationAcrossSegments(totalDuration: number, count: number) {
  const normalizedCount = normalizeCarSegmentCount(count)
  const total = Math.max(normalizedCount * 4, Math.round(totalDuration || normalizedCount * 8))
  const base = Math.floor(total / normalizedCount)
  const rest = total % normalizedCount
  return Array.from({ length: normalizedCount }, (_, idx) =>
    clampCarSegmentDuration(base + (idx < rest ? 1 : 0)),
  )
}

function carSegmentDurationAt(index: number) {
  return normalizedCarSegmentDurations.value[index] || clampCarSegmentDuration(carSegmentDuration.value || 8)
}

function carSegmentDurationSourceLabel(index: number) {
  const shot = storyboardShotsForRecommendation.value[index]
  if (shot?.time && parseStoryboardDurationRaw(shot.time)) {
    return '来自分镜'
  }
  if (carSegmentDurations.value[index]) {
    return '手动'
  }
  return '默认'
}

function syncCarSegmentDurationFallback(values: number[]) {
  carSegmentDuration.value = averageSegmentDuration(values)
}

function handleCarSegmentCountChange(event: Event) {
  const target = event.target as HTMLSelectElement | null
  const nextCount = normalizeCarSegmentCount(Number(target?.value))
  const current = normalizedCarSegmentDurations.value
  carSegmentCount.value = nextCount
  carSegmentDurations.value = normalizeCarSegmentDurations(current, nextCount)
  syncCarSegmentDurationFallback(carSegmentDurations.value)
  carSegmentTimingTouched.value = true
  enforceRequiredModelSelection()
}

function handleCarSegmentDurationChange(index: number, event: Event) {
  const target = event.target as HTMLSelectElement | null
  const nextDuration = clampCarSegmentDuration(Number(target?.value))
  const durations = normalizedCarSegmentDurations.value.slice()
  durations[index] = nextDuration
  carSegmentDurations.value = normalizeCarSegmentDurations(durations, carSegmentCount.value)
  syncCarSegmentDurationFallback(carSegmentDurations.value)
  carSegmentTimingTouched.value = true
  enforceRequiredModelSelection()
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

function applyCarRecommendation(markTouched = true) {
  carSegmentCount.value = carRecommendedSegmentCount.value
  carSegmentDurations.value = normalizeCarSegmentDurations(
    carRecommendedSegmentDurations.value,
    carRecommendedSegmentCount.value,
  )
  syncCarSegmentDurationFallback(carSegmentDurations.value)
  carSegmentTimingTouched.value = markTouched
  enforceRequiredModelSelection()
}

function storyboardIntentText(text: string) {
  const value = text.toLowerCase()
  const intents: string[] = []
  const add = (label: string) => {
    if (!intents.includes(label)) intents.push(label)
  }
  if (['内饰', '座椅', '中控', '空间', '前排', '后排', '方向盘', '仪表', '后备箱', 'interior', 'seat', 'dashboard', 'trunk'].some((keyword) => value.includes(keyword))) {
    add('展示车辆内饰空间与舒适配置')
  }
  if (['车灯', '灯光', '轮毂', 'logo', '标识', '细节', '材质', 'light', 'wheel', 'detail'].some((keyword) => value.includes(keyword))) {
    add('展示车辆细节特写')
  }
  if (['外观', '车头', '车身', '整车', '正面', '侧面', '背面', '环绕', 'exterior', 'front', 'side', 'rear'].some((keyword) => value.includes(keyword))) {
    add('展示车辆外观与车身线条')
  }
  if (['展厅', '门店', '到店', '试驾', '邀约', '联系', '咨询', '转化', 'showroom', 'store', 'dealer'].some((keyword) => value.includes(keyword))) {
    add('保留销售引导和转化动作')
  }
  if (['户外', '城市', '公路', '道路', '山路', '夜景', '通勤', '出行', 'road', 'city', 'outdoor', 'night'].some((keyword) => value.includes(keyword))) {
    add('展示用车场景和行驶氛围')
  }
  if (['开场', '介绍', '打招呼', 'hello', 'hi'].some((keyword) => value.includes(keyword))) {
    add('开场介绍车辆与业务')
  }
  return intents.length ? intents.join('，') : '按当前口播安排镜头转场和展示节奏'
}

function containsAnyText(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword.toLowerCase()))
}

function storyboardShotSourceText(shot: VideoScriptShotItem) {
  return [
    shot.page,
    shot.visualPrompt,
    shot.prompt,
    shot.highlight,
    shot.camera,
    shot.cameraMotion,
    shot.movement,
    shot.shotType,
    shot.framing,
    shot.composition,
    shot.transition,
  ].filter(Boolean).join(' ')
}

function storyboardShotPlanText(text: string, idx: number, total: number) {
  const value = text.toLowerCase()
  const safeTotal = Math.max(1, total || 1)
  const safeIndex = Math.max(1, Math.min(idx + 1, safeTotal))
  const interior = containsAnyText(value, ['内饰', '座椅', '中控', '空间', '前排', '后排', '方向盘', '仪表', '后备箱', 'interior', 'seat', 'dashboard', 'trunk'])
  const detail = containsAnyText(value, ['车灯', '灯光', '轮毂', 'logo', '标识', '细节', '材质', '特写', 'light', 'wheel', 'detail', 'close', 'macro'])
  const exterior = containsAnyText(value, ['外观', '车头', '车身', '整车', '正面', '侧面', '背面', '环绕', 'exterior', 'front', 'side', 'rear'])
  const conversion = containsAnyText(value, ['展厅', '门店', '到店', '试驾', '邀约', '联系', '咨询', '转化', '优惠', 'showroom', 'store', 'dealer', 'cta'])
  const lifestyle = containsAnyText(value, ['户外', '城市', '公路', '道路', '山路', '夜景', '通勤', '出行', '家庭', 'road', 'city', 'outdoor', 'night', 'drive'])
  const opening = safeIndex === 1 || containsAnyText(value, ['开场', '介绍', '打招呼', 'hello', 'hi'])
  const closing = safeIndex === safeTotal || containsAnyText(value, ['收口', '结尾', '关注', '预约', '下单'])

  const shotSize = detail
    ? '特写/近景，突出一个车辆细节'
    : interior
      ? '中近景，展示座舱空间和配置层次'
      : conversion
        ? '中景/全景，保留门店、车辆和咨询氛围'
        : lifestyle
          ? '中远景/跟拍，展示车辆和使用场景关系'
          : exterior || opening
            ? '全景到中景，先建立整车轮廓'
            : '中景，主体清楚，适合短视频裁切'

  const cameraMotion = containsAnyText(value, ['环绕', '360', 'orbit'])
    ? '平稳小幅环绕车辆'
    : containsAnyText(value, ['推进', '推近', '推入', 'zoom in', 'dolly in'])
      ? '慢速推进到展示重点'
      : containsAnyText(value, ['拉远', '后退', 'zoom out', 'dolly out'])
        ? '轻微拉远扩大空间'
        : containsAnyText(value, ['横移', '侧移', '平移', 'pan', 'track', 'tracking'])
          ? '平滑横移或跟拍，方向保持单一'
          : containsAnyText(value, ['俯拍', '航拍', '上帝视角', 'aerial', 'top'])
            ? '轻微俯拍下探，车辆保持完整'
            : detail
              ? '锁定或微距慢推'
              : interior
                ? '沿座舱结构平稳横移'
                : lifestyle
                  ? '顺车辆行进方向轻跟拍'
                  : '稳定慢推，避免突然换角度'

  const composition = interior
    ? '前景放配置或座椅，背景保留座舱纵深'
    : detail
      ? '细节居中或三分构图，背景干净'
      : lifestyle
        ? '车辆与道路/城市/生活环境同框'
        : conversion
          ? '车辆、门店或权益氛围同框'
          : '车辆主体居中偏三分线，保留车身比例'

  const subjectAction = detail
    ? '锁定灯组、轮毂、Logo、材质或车漆反光之一'
    : interior
      ? '从中控、座椅或后排空间掠过'
      : lifestyle
        ? '车辆在真实使用场景中自然通过或静态展示'
        : conversion
          ? (carHostAppearanceEnabled.value ? '销售顾问可在边侧完成试驾邀约，车辆仍是主角' : '落在车辆、门店、权益氛围和咨询入口上')
          : opening
            ? '先建立整车轮廓，再展示车头或车身高光'
            : '围绕当前卖点做一个清楚的可视化展示'

  const pacing = containsAnyText(value, ['快节奏', '快速', '卡点', 'fast'])
    ? '快节奏，一段内只做一到两次重点转移'
    : containsAnyText(value, ['慢', '高级', '质感', 'slow', 'cinematic'])
      ? '慢节奏，动作克制'
      : opening
        ? '开场两秒内建立主体'
        : closing
          ? '结尾放慢半拍，留稳定画面'
          : '中等节奏，动作连续'

  const transition = opening
    ? '干净开场'
    : closing
      ? '稳定收束'
      : '结尾保持主体、运动方向和色彩稳定'

  return [
    `画面目标=${storyboardIntentText(value)}`,
    `景别=${shotSize}`,
    `镜头运动=${cameraMotion}`,
    `构图=${composition}`,
    `主体动作=${subjectAction}`,
    `节奏=${pacing}`,
    `转场=${transition}`,
  ].join('；')
}

function storyboardVisualText(shot: VideoScriptShotItem, idx: number) {
  const sourceText = storyboardShotSourceText(shot)
  const pieces = [`镜头${shot.order || idx + 1}`]
  if (shot.time) pieces.push(`时间 ${shot.time}`)
  pieces.push(`镜头意图 ${storyboardIntentText(sourceText)}`)
  pieces.push(`导演执行 ${storyboardShotPlanText(sourceText, idx, carSegmentCount.value)}`)
  return pieces.join('；')
}

function summarizeStoryboardForPrompt(raw: string) {
  const shots = extractStoryboardShots(raw)
  if (!shots.length) {
    return `镜头意图 ${storyboardIntentText(raw)}；导演执行 ${storyboardShotPlanText(raw, 0, 1)}`
  }
  return shots.map(storyboardVisualText).join('\n')
}

function hasSelectedVoiceAudio() {
  return carAudioMode.value !== 'none' && !!carAudioUrl.value.trim()
}

function usesModelNativeVoiceover() {
  return carAudioMode.value === 'model_native' && !carAudioUrl.value.trim()
}

function buildAutoCarVoiceText() {
  const parts: string[] = []
  if (carBrandModel.value.trim()) {
    parts.push(`今天带大家看 ${carBrandModel.value.trim()}`)
  } else {
    parts.push('今天带大家看这台车')
  }
  if (carAudience.value.trim()) {
    parts.push(`它很适合${carAudience.value.trim()}`)
  }
  if (carSellingPoints.value.trim()) {
    parts.push(`核心亮点包括${carSellingPoints.value.trim()}`)
  }
  if (prompt.value.trim()) {
    parts.push(`画面风格突出${prompt.value.trim()}`)
  }
  if (carCallToAction.value.trim()) {
    parts.push(carCallToAction.value.trim())
  }
  return `${parts.join('。')}。`
}

function modelNativeVoiceTextForRequest() {
  const benchmark = carBenchmarkVoiceText.value.trim()
  const manual = carVoiceContext.value.trim()
  if (carVoiceTextSource.value === 'benchmark' && benchmark) {
    return benchmark
  }
  if (carVoiceTextSource.value === 'manual' && manual) {
    return manual
  }
  return buildAutoCarVoiceText()
}

function effectiveVoiceTextForRequest() {
  if (usesModelNativeVoiceover()) {
    return modelNativeVoiceTextForRequest()
  }
  const manual = carVoiceContext.value.trim()
  if (manual) {
    return manual
  }
  const benchmark = carBenchmarkVoiceText.value.trim()
  if (benchmark) {
    return benchmark
  }
  return ''
}

function splitVoiceTextForSegments(text: string, total: number) {
  const clean = text.trim()
  if (!clean) {
    return []
  }
  const count = Math.max(1, total)
  if (count <= 1) {
    return [clean]
  }
  const clauses = clean
    .split(/(?<=[。！？!?；;，,、.])|\n+/)
    .map((item) => item.trim())
    .filter(Boolean)
  if (clauses.length <= 1) {
    return splitTextByLength(clean, count)
  }
  const totalLength = clauses.reduce((sum, item) => sum + item.length, 0)
  const targetLength = Math.max(1, Math.ceil(totalLength / count))
  const chunks: string[] = []
  let current = ''
  clauses.forEach((clause, idx) => {
    const remainingClauses = clauses.length - idx
    const remainingSlots = count - chunks.length - 1
    const shouldClose =
      current &&
      current.length + clause.length > targetLength &&
      remainingSlots > 0 &&
      remainingClauses >= remainingSlots
    if (shouldClose) {
      chunks.push(current)
      current = clause
    } else {
      current = joinVoiceChunk(current, clause)
    }
  })
  if (current) {
    chunks.push(current)
  }
  while (chunks.length < count) {
    const longestIndex = chunks.reduce((best, item, idx) => item.length > chunks[best].length ? idx : best, 0)
    const split = splitTextByLength(chunks[longestIndex], 2)
    if (split.length < 2 || !split[1]) {
      break
    }
    chunks.splice(longestIndex, 1, split[0], split[1])
  }
  return chunks.slice(0, count)
}

function splitTextByLength(text: string, total: number) {
  const clean = text.trim()
  const count = Math.max(1, total)
  if (!clean || count <= 1) {
    return clean ? [clean] : []
  }
  const chunks: string[] = []
  let cursor = 0
  while (chunks.length < count - 1 && cursor < clean.length) {
    const remainingSlots = count - chunks.length
    const remainingLength = clean.length - cursor
    const preferredEnd = cursor + Math.ceil(remainingLength / remainingSlots)
    const end = smartVoiceSplitBoundary(clean, cursor, preferredEnd)
    const chunk = clean.slice(cursor, end).trim()
    if (chunk) {
      chunks.push(chunk)
    }
    cursor = skipVoiceWhitespace(clean, end)
  }
  const tail = clean.slice(cursor).trim()
  if (tail) {
    chunks.push(tail)
  }
  return chunks
}

function smartVoiceSplitBoundary(text: string, start: number, preferredEnd: number) {
  const minEnd = Math.min(text.length, start + 1)
  const clamped = Math.max(minEnd, Math.min(text.length, preferredEnd))
  if (clamped >= text.length) {
    return text.length
  }
  const window = 28
  const leftLimit = Math.max(start + 1, clamped - window)
  const rightLimit = Math.min(text.length - 1, clamped + window)
  for (let i = clamped; i >= leftLimit; i -= 1) {
    if (isPreferredVoiceBreak(text[i - 1])) {
      return skipVoiceWhitespace(text, i)
    }
  }
  for (let i = clamped; i <= rightLimit; i += 1) {
    if (isPreferredVoiceBreak(text[i - 1])) {
      return skipVoiceWhitespace(text, i)
    }
  }
  if (isAsciiWordChar(text[clamped - 1]) && isAsciiWordChar(text[clamped])) {
    for (let i = clamped; i >= leftLimit; i -= 1) {
      if (!isAsciiWordChar(text[i - 1])) {
        return skipVoiceWhitespace(text, i)
      }
    }
    for (let i = clamped; i <= rightLimit; i += 1) {
      if (!isAsciiWordChar(text[i])) {
        return skipVoiceWhitespace(text, i + 1)
      }
    }
    for (let i = rightLimit + 1; i < text.length; i += 1) {
      if (!isAsciiWordChar(text[i])) {
        return skipVoiceWhitespace(text, i + 1)
      }
    }
    return text.length
  }
  return clamped
}

function joinVoiceChunk(left: string, right: string) {
  if (!left) return right
  if (!right) return left
  const last = left[left.length - 1]
  const first = right[0]
  return isAsciiWordChar(last) && isAsciiWordChar(first) ? `${left} ${right}` : `${left}${right}`
}

function skipVoiceWhitespace(text: string, index: number) {
  let next = Math.max(0, Math.min(text.length, index))
  while (next < text.length && /\s/.test(text[next])) {
    next += 1
  }
  return next
}

function isPreferredVoiceBreak(char: string | undefined) {
  return !!char && /[\s。！？!?；;，,、.]/.test(char)
}

function isAsciiWordChar(char: string | undefined) {
  return !!char && /[A-Za-z0-9'_+-]/.test(char)
}

const modelNativeVoiceTextPreview = computed(() => modelNativeVoiceTextForRequest())
const effectiveVoiceTextPreview = computed(() => effectiveVoiceTextForRequest())
const carSceneVoiceStructurePreview = computed(() =>
  buildCarSalesScenes().map((scene, idx) => ({
    segmentIndex: scene.segmentIndex || idx + 1,
    title: scene.title || `片段 ${idx + 1}`,
    visualPrompt: scene.visualPrompt || scene.prompt || '',
    voiceText: scene.voiceText || '',
    duration: scene.duration || carSegmentDuration.value,
  })),
)
const hasExplicitNativeVoiceText = computed(() => {
  if (carVoiceTextSource.value === 'benchmark') return Boolean(carBenchmarkVoiceText.value.trim())
  if (carVoiceTextSource.value === 'manual') return Boolean(carVoiceContext.value.trim())
  return false
})
const shouldShowNativeVoiceStylePanel = computed(() =>
  usesModelNativeVoiceover() && hasExplicitNativeVoiceText.value,
)
const shouldShowNativeVoiceLanguagePanel = computed(() => usesModelNativeVoiceover())
const shouldShowSceneVoiceStructure = computed(() =>
  shouldShowNativeVoiceStylePanel.value && Boolean(carStoryboardContext.value.trim()) && carSceneVoiceStructurePreview.value.length > 0,
)

const storyboardIgnoredFields = computed(() => collectStoryboardIgnoredFields(carStoryboardContext.value))
const storyboardHasOldLines = computed(() => storyboardIgnoredFields.value.length > 0)
const storyboardOldLineStatus = computed(() => {
  if (!carStoryboardContext.value.trim()) return '未使用分镜'
  if (storyboardHasOldLines.value) return '已忽略'
  return '无旧台词'
})
const carNoHostHumanConflict = computed(() => {
  if (carHostAppearanceEnabled.value) {
    return { count: 0, sources: [] as string[] }
  }
  const checks = [
    { label: '分镜描述', text: carStoryboardContext.value },
    { label: '补充提示词', text: prompt.value },
    { label: '口播文案', text: carVoiceContext.value },
    { label: '爆款文案', text: carBenchmarkVoiceText.value },
  ]
  const sources: string[] = []
  let count = 0
  for (const item of checks) {
    const hits = countHumanDescriptionHits(item.text)
    if (hits > 0) {
      count += hits
      sources.push(item.label)
    }
  }
  return { count, sources }
})

const HUMAN_DESCRIPTION_KEYWORDS = [
  '人物',
  '真人',
  '人脸',
  '人像',
  '半身',
  '全身',
  '主播',
  '销售顾问',
  '讲解员',
  '顾问',
  '客户',
  '顾客',
  '路人',
  '行人',
  '司机',
  '乘客',
  '试驾者',
  '出镜',
  '口型',
  '表情',
  '眼神',
  '服装',
  '手持',
  '站在',
  '走进',
  '挥手',
]

function countHumanDescriptionHits(text: string) {
  const source = text.trim()
  if (!source) {
    return 0
  }
  return HUMAN_DESCRIPTION_KEYWORDS.reduce((total, keyword) => {
    const matches = source.match(new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))
    return total + (matches?.length || 0)
  }, 0)
}

function sourceTypeLabelForAudio(sourceType: string) {
  const normalized = sourceType.trim().toUpperCase()
  if (normalized === 'USER_UPLOAD' || !normalized) return '用户上传音频'
  if (['TTS_GENERATE', 'VOICE_SAMPLE', 'AI_GENERATED'].includes(normalized)) return '声音生成音频'
  return '已选择音频'
}

const carAudioSourceLabel = computed(() => {
  if (!hasSelectedVoiceAudio()) {
    if (usesModelNativeVoiceover()) return `文案生成音视频（${carNativeVoiceStyleSummary.value}）`
    if (carBgmUrl.value.trim()) return '无（BGM 不作为口播）'
    return '无'
  }
  const audioKind = sourceTypeLabelForAudio(carAudioSourceType.value)
  if (carAudioMode.value === 'reference') return `参考音频生成（${audioKind}）`
  return `后期口播配音（${audioKind}）`
})

const carBgmSourceLabel = computed(() => (carBgmUrl.value.trim() ? '已选择 BGM' : '无'))
const carSubtitleSourceLabel = computed(() => {
  const suffix = storyboardHasOldLines.value ? '（不使用分镜旧台词）' : ''
  const language = carSubtitleLanguageOptions.find((item) => item.value === carSubtitleLanguage.value)?.label || '默认语言'
  if (carSubtitleMode.value === 'off') return '关闭'
  if (carSubtitleMode.value === 'auto') return `自动字幕 / ${language}${suffix}`
  return carSubtitleText.value.trim() ? `自定义字幕 / ${language}${suffix}` : '自定义字幕（未填写）'
})

const carVisualSourceLabel = computed(() => {
  const sources: string[] = []
  if (prompt.value.trim()) sources.push('用户输入提示词')
  if (carStoryboardContext.value.trim()) sources.push('分镜节奏参考')
  if (carImageUrls.value.length > 0) {
    sources.push(isSeedance2Selected.value ? '参考图 / 车型图' : '车型图')
  }
  sources.push(carHostAppearanceEnabled.value ? '虚拟人物出镜' : '无人物出镜')
  if (carHostAppearanceEnabled.value && carHostImageUrl.value.trim()) sources.push('数字人形象参考')
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
  if (usesModelNativeVoiceover() && carVoiceTextSource.value === 'benchmark' && !carBenchmarkVoiceText.value.trim()) {
    messages.push('请先选择或上传爆款对标文案')
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
  if (usesModelNativeVoiceover() && carVoiceTextSource.value === 'manual' && !carVoiceContext.value.trim()) {
    warnings.push('已选择手写文案，但口播文案参考为空，系统将回退到车型卖点、文案场景和转化引导整理口播')
  } else if (usesModelNativeVoiceover() && carVoiceTextSource.value === 'auto') {
    warnings.push('未填写口播文案，系统将根据车型卖点、文案场景和转化引导自动整理口播，并替换分镜旧台词')
  } else if (!hasSelectedVoiceAudio() && !usesModelNativeVoiceover()) {
    warnings.push('未选择口播音频，系统不会把 BGM 或分镜旧台词当作口播来源')
  }
  if (carNoHostHumanConflict.value.count > 0) {
    const sourceText = carNoHostHumanConflict.value.sources.join('、') || '当前内容'
    warnings.push(`当前选择数字人不出镜，但${sourceText}检测到 ${carNoHostHumanConflict.value.count} 处人物/主播/客户描述；系统会强制忽略人物并只展示车辆。若要保留讲解人物，请切换为“虚拟人物出镜”并上传数字人形象。`)
  }
  if (carMaterialCompleteness.value.providedCount < 4) {
    warnings.push(`车辆一致性素材偏少，建议补充：${carMaterialMissingText.value}`)
  } else if (carMaterialCompleteness.value.providedCount < 8) {
    warnings.push(`车辆一致性素材仍可补充：${carMaterialMissingText.value}`)
  }
  if (!isSeedance2Selected.value && carImageUrls.value.length > 1) {
    warnings.push('当前模型每段只使用最关键 1 张首帧图，一致性弱于 Seedance 2.0 多参考图模式')
  }
  if (!isSeedance2Selected.value && carSceneMaterialUrls.value.length > 0) {
    warnings.push('已上传场景图，但当前模型只能使用单张首帧；场景替换建议切换到 Seedance 2.0 多参考图模式')
  }
  if (isSeedance2Selected.value && carSceneMaterialUrls.value.length === 0) {
    warnings.push('未上传独立场景图时，场景会以参考图和补充文案为主；如需明确替换展厅/道路/门店，请补充场景图片')
  }
  return warnings
})

const carGenerationBasisRows = computed(() => [
  { label: '视频模型', value: selectedSeedanceModel.value.label },
  { label: '视频段数', value: carSegmentModeLabel.value },
  { label: '画面来源', value: carVisualSourceLabel.value },
  { label: '场景替换', value: carSceneMaterialUrls.value.length ? `使用 ${carSceneMaterialUrls.value.length} 张独立场景图` : '以参考图和文案场景为主' },
  { label: '车辆一致性', value: carMaterialCompletenessStatus.value },
  { label: '参考图策略', value: carReferenceImageStrategyLabel.value },
  { label: '数字人出镜', value: carHostAppearanceEnabled.value ? '虚拟人物出镜' : '不出镜，只介绍车辆' },
  { label: '口播来源', value: carAudioSourceLabel.value },
  { label: '文案来源', value: usesModelNativeVoiceover() ? carVoiceTextSourceLabel.value : '随口播音频/手写文案' },
  { label: 'BGM 来源', value: carBgmSourceLabel.value },
  { label: '字幕来源', value: carSubtitleSourceLabel.value },
  { label: '分镜旧台词处理', value: storyboardOldLineStatus.value },
])

const carGenerationBasisSummary = computed(() => {
  if (hasSelectedVoiceAudio()) {
    const bgmSentence = carBgmUrl.value.trim() ? 'BGM 只会作为背景音乐混入，不参与口型和字幕。' : ''
    const storyboardSentence = storyboardHasOldLines.value
      ? '分镜中的旧台词和旧主体描述会被忽略，仅保留镜头节奏。'
      : carStoryboardContext.value.trim()
        ? '分镜只作为镜头节奏参考。'
        : '未使用分镜旧台词。'
    const voiceTextSentence = effectiveVoiceTextPreview.value
      ? `已提供口播文案参考：${effectiveVoiceTextPreview.value.slice(0, 120)}`
      : '未提供音频转写文本，画面会尽量按车型和分镜适配音频。'
    return `本次视频将以【口播音频】作为内容主导，${storyboardSentence}${bgmSentence}${voiceTextSentence}`
  }
  if (usesModelNativeVoiceover()) {
    const bgmSentence = carBgmUrl.value.trim() ? 'BGM 只会作为背景音乐混入，不参与口型和字幕。' : ''
    const storyboardSentence = storyboardHasOldLines.value
      ? '分镜中的旧台词和旧主体描述会被当前口播文案与参考图替换，仅保留镜头节奏。'
      : carStoryboardContext.value.trim()
        ? '分镜只作为镜头节奏参考。'
        : ''
    return `本次视频将以【文案驱动的模型原生音频】作为内容主导。文案来源：${carVoiceTextSourceLabel.value}；风格：${carNativeVoiceStyleSummary.value}。${storyboardSentence}${bgmSentence}口播预览：${modelNativeVoiceTextPreview.value.slice(0, 120)}`
  }
  if (carBgmUrl.value.trim()) {
    return '本次视频只选择了 BGM，它只会作为背景音乐混入，不会生成口播、字幕或口型。'
  }
  if (carStoryboardContext.value.trim()) {
    return '本次视频将只使用分镜的段落节奏、景别、运镜和镜头意图，主体车辆、人物和场景以参考图与文案场景为准。'
  }
  return '本次视频将以车型图、补充提示词和销售信息作为主要生成依据。'
})

function buildCarScriptContext() {
  const parts: string[] = []
  if (carStoryboardContext.value.trim()) {
    parts.push(`分镜节奏参考（仅保留镜头意图、景别、运镜、构图和转场，不作为车辆、人物、场景事实来源）：${summarizeStoryboardForPrompt(carStoryboardContext.value)}`)
  }
  if (!carHostAppearanceEnabled.value) {
    parts.push('人物策略：数字人不出镜，生成时必须忽略所有人物、主播、销售顾问、客户、路人、司机和乘客描述，只展示车辆与场景。')
  }
  if (hasSelectedVoiceAudio()) {
    parts.push('内容主导：已选择口播/配音音频，口型和节奏以该音频为准；字幕按当前字幕设置处理；分镜和爆款对标文案只作为画面参考。')
    if (effectiveVoiceTextPreview.value) {
      parts.push(`口播原文已按 ${carSegmentCount.value} 段写入 scenes.voiceText；每段生成时只使用对应片段，不重复整条文案。`)
    }
  } else if (usesModelNativeVoiceover()) {
    parts.push(`内容主导：视频模型按口播文案直接生成画面和原生音频，文案来源为${carVoiceTextSourceLabel.value}，风格为${carNativeVoiceStyleSummary.value}；BGM 只作为背景音乐。`)
    parts.push(`口播原文已按 ${carSegmentCount.value} 段写入 scenes.voiceText；每段生成时只使用对应片段，不重复整条文案，不对台词做改写。`)
  } else if (carVoiceContext.value.trim()) {
    parts.push(`口播文案参考：${carVoiceContext.value.trim()}`)
  }
  return parts.join('\n\n')
}

function carImageRoleForUrl(url: string, index: number) {
  return normalizeCarAssetRole(carImageAssetRoleByUrl.value[url]) || FALLBACK_CAR_IMAGE_ROLES[index] || ''
}

function carSceneImageRoleForUrl(url: string, index: number) {
  const role = normalizeCarAssetRole(carSceneImageAssetRoleByUrl.value[url])
  if (role && CAR_SCENE_REFERENCE_ROLES.includes(role)) {
    return role
  }
  return FALLBACK_CAR_SCENE_IMAGE_ROLES[index] || 'scene_showroom'
}

function carRoleLabel(role: string) {
  return CAR_MATERIAL_TARGETS.find((item) => item.role === role)?.label || role
}

function carSceneRolePriority(title: string, visualPrompt: string, index: number) {
  const text = `${title} ${visualPrompt}`.toLowerCase()
  const withoutHost = (roles: string[]) =>
    carHostAppearanceEnabled.value ? roles : roles.filter((role) => role !== 'host_image')
  for (const item of CAR_SCENE_KEYWORD_ROLES) {
    if (item.keywords.some((keyword) => text.includes(keyword.toLowerCase()))) {
      return withoutHost(item.roles)
    }
  }
  return withoutHost(CAR_SCENE_ROLE_PRIORITY[index] || CAR_SCENE_ROLE_PRIORITY[0])
}

function carSceneImageUrls(title: string, visualPrompt: string, index: number) {
  const carImageEntries = carImageUrls.value.map((url, idx) => ({
    url,
    role: carImageRoleForUrl(url, idx),
  })).filter((entry) => carHostAppearanceEnabled.value || entry.role !== 'host_image')
  const vehicleEntries = carImageEntries.filter((entry) => !CAR_SCENE_REFERENCE_ROLES.includes(entry.role))
  const sceneEntries = [
    ...carImageEntries.filter((entry) => CAR_SCENE_REFERENCE_ROLES.includes(entry.role)),
    ...carSceneMaterialUrls.value.map((url, idx) => ({
      url,
      role: carSceneImageRoleForUrl(url, idx),
    })),
  ]
  const entries = [...vehicleEntries, ...sceneEntries]
  if (carHostAppearanceEnabled.value && carHostImageUrl.value.trim()) {
    entries.push({
      url: carHostImageUrl.value.trim(),
      role: 'host_image',
    })
  }
  const selected: string[] = []
  const addByRole = (role: string) => {
    const found = entries.find((entry) => entry.role === role && !selected.includes(entry.url))
    if (found) selected.push(found.url)
  }
  const addFirstByRoles = (roles: string[]) => {
    for (const role of roles) {
      const before = selected.length
      addByRole(role)
      if (selected.length > before) return
    }
  }
  const priorityRoles = carSceneRolePriority(title, visualPrompt, index)
  const scenePriorityRoles = priorityRoles.filter((role) => CAR_SCENE_REFERENCE_ROLES.includes(role))
  const vehiclePriorityRoles = priorityRoles.filter((role) => !CAR_SCENE_REFERENCE_ROLES.includes(role))
  const addSceneReference = () => {
    if (!sceneEntries.length) return
    const preferredRoles = [
      ...priorityRoles.filter((role) => CAR_SCENE_REFERENCE_ROLES.includes(role)),
      ...CAR_SCENE_REFERENCE_ROLES,
    ]
    for (const role of preferredRoles) {
      const found = sceneEntries.find((entry) => entry.role === role && !selected.includes(entry.url))
      if (found) {
        selected.push(found.url)
        return
      }
    }
    const first = sceneEntries.find((entry) => !selected.includes(entry.url))
    if (first) selected.push(first.url)
  }
  if (isSeedance2Selected.value) {
    addSceneReference()
    if (carHostAppearanceEnabled.value) addByRole('host_image')
    addFirstByRoles(CAR_IDENTITY_ANCHOR_ROLES)
  } else {
    addFirstByRoles(vehiclePriorityRoles.length ? vehiclePriorityRoles : CAR_IDENTITY_ANCHOR_ROLES)
  }
  vehiclePriorityRoles.forEach(addByRole)
  if (isSeedance2Selected.value) {
    scenePriorityRoles.forEach(addByRole)
    CAR_IDENTITY_ANCHOR_ROLES.forEach(addByRole)
  }
  if (!isSeedance2Selected.value) {
    for (const entry of vehicleEntries) {
      if (!selected.includes(entry.url)) selected.push(entry.url)
    }
  } else if (!selected.some((url) => vehicleEntries.some((entry) => entry.url === url))) {
    const firstVehicle = vehicleEntries.find((entry) => !selected.includes(entry.url))
    if (firstVehicle) selected.push(firstVehicle.url)
  }
  const max = isSeedance2Selected.value ? SEEDANCE2_MAX_REFERENCE_IMAGES : SEEDANCE_LEGACY_MAX_REFERENCE_IMAGES
  return selected.slice(0, max)
}

function buildCarSubtitleValue() {
  if (carSubtitleMode.value === 'off') return '无'
  if (carSubtitleMode.value === 'auto') return '自动生成'
  return carSubtitleText.value.trim()
}

function buildCarSalesScenes() {
  const storyboardShots = extractStoryboardShots(carStoryboardContext.value)
  const voiceChunks = splitVoiceTextForSegments(effectiveVoiceTextPreview.value, carSegmentCount.value)
  const segmentDurations = normalizedCarSegmentDurations.value
  if (storyboardShots.length > 0) {
    return storyboardShots.slice(0, carSegmentCount.value).map((shot, idx) => {
      const title = `镜头 ${shot.order || idx + 1}`
      const visualPrompt = storyboardVisualText(shot, idx)
      const imageUrls = carSceneImageUrls(title, visualPrompt, idx)
      return {
        segmentIndex: idx + 1,
        title,
        visualPrompt,
        prompt: visualPrompt,
        imageUrls,
        referenceImage: imageUrls[0],
        voiceText: voiceChunks[idx] || undefined,
        duration: segmentDurations[idx] || parseStoryboardDuration(shot.time) || carSegmentDuration.value,
      }
    })
  }
  const titles = [
    '外观开场',
    '车头灯光',
    '内饰座舱',
    '座椅空间',
    '核心卖点',
    '用车场景',
    '细节质感',
    '门店试驾',
    '安全智能',
    '尾部收束',
    '生活氛围',
    '优惠收口',
  ]
  const prompts = [
    '整车外观作为开场建立，车头和车身线条清晰，镜头慢速推进。',
    '围绕车头、灯组、前脸和车身高光做近景展示，镜头小幅横移。',
    '展示中控屏、方向盘、仪表、座舱氛围和材质，镜头从前排空间平稳扫过。',
    '展示座椅、后排腿部空间、储物和乘坐舒适性，镜头从座椅延伸到空间纵深。',
    '突出动力、智能、安全、油耗/续航或核心配置卖点，画面干净有销售说服力。',
    '展示城市通勤、家庭出行或周末短途场景，让车辆与真实生活需求结合。',
    '用车灯、轮毂、Logo、座椅材质或车漆反光做特写，镜头稳定停留在一个细节重点。',
    '展示试驾邀约、到店权益、咨询引导和成交氛围，车辆仍是画面主角。',
    '展示辅助驾驶、屏幕交互、安全配置或舒适配置的视觉化表达。',
    '展示车尾、尾灯、后备箱或车身侧后方，作为视觉收束并承接下一段。',
    '展示车辆与真实生活场景的关系，画面温和可信，让目标客户能代入使用。',
    '用整车高光和优惠咨询氛围收口，镜头稳定，强化立即咨询和预约试驾。',
  ]
  return Array.from({ length: carSegmentCount.value }, (_, idx) => {
    const templateIndex = idx % titles.length
    const title = titles[templateIndex] || `片段 ${idx + 1}`
    const visualPrompt = prompts[templateIndex] || prompts[prompts.length - 1]
    const imageUrls = carSceneImageUrls(title, visualPrompt, idx)
    return {
      segmentIndex: idx + 1,
      title,
      visualPrompt,
      prompt: visualPrompt,
      imageUrls,
      referenceImage: imageUrls[0],
      voiceText: voiceChunks[idx] || undefined,
      duration: segmentDurations[idx] || carSegmentDuration.value,
    }
  })
}

function carVoicePolicyForRequest(): CarVoicePolicy {
  if (hasSelectedVoiceAudio()) return 'user_audio'
  if (usesModelNativeVoiceover()) return 'model_native'
  return 'none'
}

function carAudioModeForRequest(): CarAudioMode {
  if (hasSelectedVoiceAudio()) {
    return carAudioMode.value === 'reference' ? 'reference' : 'post_mix'
  }
  return usesModelNativeVoiceover() ? 'model_native' : 'none'
}

function carFinalVoiceTextForRequest() {
  const chunks = splitVoiceTextForSegments(effectiveVoiceTextPreview.value, carSegmentCount.value)
  return chunks.length ? chunks.join('\n') : undefined
}

function buildCarAssetRoleBindings(): CarSalesAssetRoleBinding[] {
  const bindings: CarSalesAssetRoleBinding[] = carImageUrls.value.map((url, idx) => {
    const role = carImageRoleForUrl(url, idx)
    return {
      assetId: carImageAssetIdsByUrl.value[url],
      url,
      assetType: 'IMAGE',
      assetRole: role || undefined,
      label: role ? carRoleLabel(role) : undefined,
    }
  })
  for (const [idx, url] of carSceneMaterialUrls.value.entries()) {
    const role = carSceneImageRoleForUrl(url, idx)
    bindings.push({
      assetId: carSceneImageAssetIdsByUrl.value[url],
      url,
      assetType: 'IMAGE',
      assetRole: role || undefined,
      label: role ? carRoleLabel(role) : undefined,
    })
  }
  if (carHostAppearanceEnabled.value && carHostImageUrl.value.trim()) {
    bindings.push({
      assetId: carHostImageAssetId.value || undefined,
      url: carHostImageUrl.value.trim(),
      assetType: 'IMAGE',
      assetRole: 'host_image',
      label: carRoleLabel('host_image'),
    })
  }
  if (carAudioUrl.value.trim()) {
    bindings.push({
      assetId: carAudioAssetId.value || undefined,
      url: carAudioUrl.value.trim(),
      assetType: 'AUDIO',
      assetRole: 'voiceover',
      label: '口播',
    })
  }
  if (carBgmUrl.value.trim()) {
    bindings.push({
      assetId: carBgmAssetId.value || undefined,
      url: carBgmUrl.value.trim(),
      assetType: 'AUDIO',
      assetRole: 'bgm',
      label: 'BGM',
    })
  }
  if (carBenchmarkAssetUrl.value.trim()) {
    bindings.push({
      assetId: carBenchmarkAssetId.value || undefined,
      url: carBenchmarkAssetUrl.value.trim(),
      assetType: 'JSON',
      assetRole: 'benchmark_json',
      label: '爆款对标文案',
    })
  }
  return bindings.filter((item) => item.url)
}

function carSourceAssetIds() {
  const carImageAssetIds = carImageUrls.value
    .map((url) => carImageAssetIdsByUrl.value[url])
    .filter((id): id is number => typeof id === 'number' && id > 0)
  const carSceneImageAssetIds = carSceneMaterialUrls.value
    .map((url) => carSceneImageAssetIdsByUrl.value[url])
    .filter((id): id is number => typeof id === 'number' && id > 0)
  const ids = [
    ...carImageAssetIds,
    ...carSceneImageAssetIds,
    carBundleAssetId.value,
    carStoryboardAssetId.value,
    carBenchmarkAssetId.value,
    carAudioAssetId.value,
    carBgmAssetId.value,
    carHostAppearanceEnabled.value ? carHostImageAssetId.value : null,
    carMaterialVideoAssetId.value,
  ].filter(
    (id): id is number => typeof id === 'number' && id > 0,
  )
  return Array.from(new Set(ids))
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
  const isCarSalesSubmit = mainTab.value === 'carSales'
  const isSeedanceSubmit = mainTab.value !== 'digitalHuman'
  if (isSeedanceSubmit ? seedanceSubmitInFlight.value : busy.value) {
    return
  }
  if (isCarSalesSubmit && carGenerationBlockingMessages.value.length > 0) {
    const message = carGenerationBlockingMessages.value[0]
    errorMessage.value = message
    ElMessage.error(message)
    return
  }
  if (!canSubmit.value) {
    return
  }

  if (isSeedanceSubmit) {
    seedanceSubmitInFlight.value = true
  } else {
    busy.value = true
  }
  errorMessage.value = ''
  if (!isSeedanceSubmit) {
    result.value = null
  }
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
        subtitle: buildCarSubtitleValue(),
        subtitleMode: carSubtitleMode.value,
        subtitleLanguage: carSubtitleLanguage.value,
        audioUrl: hasSelectedVoiceAudio() ? carAudioUrl.value.trim() : undefined,
        audioMode: carAudioModeForRequest(),
        bgmUrl: carBgmUrl.value.trim() || undefined,
        voicePolicy: carVoicePolicyForRequest(),
        finalVoiceText: carFinalVoiceTextForRequest(),
        nativeVoiceLanguage: usesModelNativeVoiceover() ? carNativeVoiceLanguage.value : undefined,
        nativeVoiceStyle: usesModelNativeVoiceover() ? carNativeVoiceStyle.value : undefined,
        nativeSpeechStyle: usesModelNativeVoiceover() ? carNativeSpeechStyle.value : undefined,
        ignoredStoryboardFields: storyboardIgnoredFields.value,
        hostImageUrl: carHostAppearanceEnabled.value ? carHostImageUrl.value.trim() || undefined : undefined,
        hostAppearanceEnabled: carHostAppearanceEnabled.value,
        hostVideoUrl: carMaterialVideoUrl.value.trim() || undefined,
        sourceAssetIds: carSourceAssetIds(),
        renderMode: 'manual',
        aspectRatio: aspectRatioForRequest(),
        assetRoleBindings: buildCarAssetRoleBindings(),
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
        ratio: aspectRatioForRequest(),
        model: selectedModel.value,
      })
      submittedTaskId = submitted.taskId
      submittedStatus = String(submitted.status)
    } else if (imageSubTab.value === 'first') {
      const submitted = await generateFirstFrameVideo({
        imageUrl: firstFrame.value.trim(),
        prompt: prompt.value.trim() || undefined,
        duration: duration.value,
        ratio: aspectRatioForRequest(),
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
        ratio: aspectRatioForRequest(),
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
        ratio: aspectRatioForRequest(),
        model: selectedModel.value,
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
    if (isSeedanceSubmit) {
      await refreshLocalBalance()
      ElMessage.success('任务已提交，可继续提交下一条；进度在任务中心查看')
    }
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
    if (isSeedanceSubmit) {
      seedanceSubmitInFlight.value = false
      busy.value = false
    } else if (mainTab.value !== 'digitalHuman' && activeSeedanceTaskId.value == null) {
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
      if (message.taskType === 'SEEDANCE_CAR_SALES_VIDEO') {
        void refreshCarSalesPartialResult(taskId)
      }
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

async function refreshCarSalesPartialResult(taskId: number) {
  if (carSalesPartialFetchInFlight) {
    return
  }
  const now = Date.now()
  if (now - carSalesPartialFetchAt < 2500) {
    return
  }
  carSalesPartialFetchInFlight = true
  carSalesPartialFetchAt = now
  try {
    const detail = await getTaskResult<VideoTaskVO>(taskId)
    const partial = detail.result
    if (partial && typeof partial === 'object' && (partial.segmentVideos?.length || partial.partial)) {
      result.value = {
        ...partial,
        videoUrl: partial.videoUrl || '',
        lastFrameUrl: partial.lastFrameUrl ?? null,
        completionTokens: partial.completionTokens ?? 0,
        errorCode: partial.errorCode ?? null,
        errorMessage: partial.errorMessage ?? null,
      }
    }
  } catch {
    // 阶段性结果只用于预览，不影响主任务轮询。
  } finally {
    carSalesPartialFetchInFlight = false
  }
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

.render-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
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

.render-mode-switch {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 6px;
  border: 1px solid #e7eaf2;
  border-radius: 8px;
  background: #fff;
  padding: 4px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

.render-mode-switch button {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  padding: 0 12px;
  color: #4f586c;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.render-mode-switch button.active {
  background: #f5f3ff;
  color: #5e50df;
}

.render-mode-switch button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
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

.render-car-workflow-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(120px, 1fr)) minmax(220px, 1.4fr);
  gap: 10px;
  align-items: center;
  border: 1px solid #e3e7ef;
  border-radius: 8px;
  background: #fff;
  padding: 10px;
}

.render-car-workflow-strip span {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  gap: 8px;
  border-radius: 8px;
  background: #f6f8fc;
  color: #344054;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 900;
}

.render-car-workflow-strip strong {
  display: inline-grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border-radius: 999px;
  background: #635bff;
  color: #fff;
  font-size: 12px;
}

.render-car-workflow-strip small {
  color: #667085;
  font-size: 12.5px;
  line-height: 1.5;
}

.render-optional-group {
  display: grid;
  gap: 12px;
  border: 1px solid #edf0f6;
  border-radius: 8px;
  background: #fbfcff;
  padding: 12px;
}

.render-optional-group summary {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
  list-style: none;
}

.render-optional-group summary::-webkit-details-marker {
  display: none;
}

.render-optional-group summary::after {
  content: '展开';
  flex: 0 0 auto;
  border-radius: 999px;
  background: #eef0f6;
  color: #667085;
  padding: 3px 9px;
  font-size: 11px;
  font-weight: 900;
}

.render-optional-group[open] summary::after {
  content: '收起';
}

.render-optional-group summary span {
  color: #344054;
  font-size: 13px;
  font-weight: 900;
}

.render-optional-group summary small {
  min-width: 0;
  color: #98a2b3;
  font-size: 12px;
  font-weight: 750;
  line-height: 1.5;
}

.render-optional-body {
  display: grid;
  gap: 12px;
  padding-top: 10px;
  border-top: 1px solid #edf0f6;
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

.render-duration-summary {
  color: #1d2939;
  font-size: 15px;
  font-weight: 900;
  line-height: 1.4;
}

.render-segment-duration-panel {
  display: grid;
  gap: 12px;
  border: 1px solid #e7eaf2;
  border-radius: 8px;
  background: #fff;
  padding: 14px;
}

.render-segment-duration-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.render-segment-duration-head strong {
  color: #1d2939;
  font-size: 14px;
  font-weight: 900;
}

.render-segment-duration-head span,
.render-segment-duration-notice {
  color: #667085;
  font-size: 12.5px;
  line-height: 1.6;
}

.render-segment-duration-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}

.render-segment-duration-item {
  display: grid;
  gap: 8px;
  border: 1px solid #edf0f6;
  border-radius: 8px;
  background: #fafbff;
  padding: 10px;
}

.render-segment-duration-item > span {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: #344054;
  font-size: 12.5px;
  font-weight: 900;
}

.render-segment-duration-item small {
  color: #667085;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}

.render-segment-duration-item select {
  width: 100%;
}

.render-segment-duration-notice {
  margin: 0;
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

.render-grid-three {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

@media (max-width: 720px) {
  .render-head {
    flex-direction: column;
  }

  .digital-human-guide,
  .render-digital-workspace,
  .render-car-workflow-strip {
    grid-template-columns: 1fr;
  }

  .render-grid-two,
  .render-grid-three,
  .render-basis-grid {
    grid-template-columns: 1fr;
  }

  .render-audio-mode {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .render-tts-source-options {
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

.render-upload-text {
  min-height: 52px;
  background: #fff;
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
  grid-template-columns: repeat(4, minmax(0, 1fr));
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

.render-tts-style-panel {
  display: grid;
  gap: 12px;
  border: 1px solid #dce3f2;
  border-radius: 8px;
  background: #fff;
  padding: 12px;
}

.render-tts-source {
  display: grid;
  gap: 8px;
}

.render-tts-source > span {
  color: #344054;
  font-size: 12.5px;
  font-weight: 900;
}

.render-tts-source-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.render-tts-source-options button {
  min-height: 34px;
  border: 1px solid #e1e6f0;
  border-radius: 8px;
  background: #fff;
  color: #4f586c;
  font-size: 12.5px;
  font-weight: 850;
  cursor: pointer;
}

.render-tts-source-options button.active {
  border-color: #7d69ff;
  background: #f5f3ff;
  color: #5b4be7;
}

.render-tts-source-options button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.render-tts-source small {
  color: #667085;
  font-size: 12px;
  line-height: 1.6;
}

.render-tts-empty {
  margin: 0;
  border: 1px dashed #d8d2ff;
  border-radius: 8px;
  background: #fbfaff;
  color: #667085;
  padding: 10px 12px;
  font-size: 12.5px;
  line-height: 1.6;
}

.render-tts-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
  align-items: start;
}

.render-voice-library-panel {
  display: grid;
  min-width: 0;
  gap: 8px;
}

.render-voice-library-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.render-voice-library-head label {
  color: #2d3446;
  font-size: 13px;
  font-weight: 800;
}

.render-voice-library-head small {
  min-width: 0;
  overflow: hidden;
  color: #667085;
  font-size: 12px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.render-voice-library-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.render-voice-library-tabs button {
  min-width: 0;
  height: 34px;
  border: 1px solid #e1e6f0;
  border-radius: 8px;
  background: #fff;
  color: #4b5565;
  font-size: 12px;
  font-weight: 850;
  cursor: pointer;
}

.render-voice-library-tabs button.active {
  border-color: #7d69ff;
  background: #f5f3ff;
  color: #5b4be7;
}

.render-voice-library-tabs button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.render-voice-library-panel input {
  height: 38px;
  border: 1px solid #e3e7ef;
  border-radius: 8px;
  background: #fff;
  color: #232838;
  padding: 0 12px;
  font-family: inherit;
  font-size: 13px;
  outline: none;
}

.render-voice-library-panel input:focus {
  border-color: #8f81ff;
  box-shadow: 0 0 0 3px rgba(99, 91, 255, 0.12);
}

.render-voice-library-list {
  display: grid;
  max-height: 220px;
  overflow: auto;
  gap: 8px;
  padding-right: 2px;
}

.render-voice-library-card {
  display: grid;
  min-width: 0;
  gap: 4px;
  border: 1px solid #e1e6f0;
  border-radius: 8px;
  background: #fff;
  color: #344054;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
}

.render-voice-library-card strong {
  overflow: hidden;
  color: #1f2937;
  font-size: 13px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.render-voice-library-card span {
  overflow: hidden;
  color: #667085;
  font-size: 11.5px;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.render-voice-library-card small {
  color: #5e50df;
  font-size: 12px;
  font-weight: 800;
}

.render-voice-library-card.active {
  border-color: #7d69ff;
  background: #f5f3ff;
  box-shadow: 0 0 0 3px rgba(99, 91, 255, 0.09);
}

.render-voice-library-card.public:not(.active) {
  background: #fbfcff;
}

.render-voice-library-card:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.render-voice-library-empty {
  margin: 0;
  padding: 12px;
  border-radius: 8px;
}

.render-tts-preview {
  max-height: 180px;
  overflow: auto;
  margin: 0;
  border: 1px solid #edf0f6;
  border-radius: 8px;
  background: #fbfcff;
  color: #4f586c;
  padding: 10px 12px;
  font-size: 12.5px;
  line-height: 1.7;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.render-tts-script-panel {
  display: grid;
  gap: 8px;
  border-top: 1px solid #edf0f6;
  padding-top: 10px;
}

.render-tts-script-head,
.render-scene-voice-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.render-tts-script-head strong,
.render-scene-voice-head strong {
  min-width: 0;
  overflow: hidden;
  color: #232838;
  font-size: 12.5px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.render-tts-script-head span,
.render-scene-voice-head span {
  flex: 0 0 auto;
  color: #667085;
  font-size: 12px;
  font-weight: 800;
}

.render-scene-voice-list {
  display: grid;
  max-height: 380px;
  overflow: auto;
  gap: 8px;
  padding-right: 2px;
}

.render-scene-voice-card {
  display: grid;
  gap: 7px;
  border: 1px solid #edf0f6;
  border-radius: 8px;
  background: #fbfcff;
  padding: 10px 12px;
}

.render-scene-visual,
.render-scene-voice {
  margin: 0;
  overflow-wrap: anywhere;
  font-size: 12.5px;
  line-height: 1.65;
  white-space: pre-wrap;
}

.render-scene-visual {
  color: #667085;
}

.render-scene-voice {
  border-left: 3px solid #7d69ff;
  color: #2d3446;
  padding-left: 9px;
  font-weight: 750;
}

@media (max-width: 720px) {
  .render-tts-source-options,
  .render-tts-controls,
  .render-tts-script-head,
  .render-scene-voice-head {
    grid-template-columns: 1fr;
    align-items: flex-start;
  }
}

.render-completeness-panel {
  display: grid;
  gap: 8px;
  border: 1px solid #dce3f2;
  border-radius: 8px;
  background: #fff;
  padding: 12px;
}

.render-car-bundle-status {
  display: grid;
  gap: 4px;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  background: #f0fdf4;
  color: #166534;
  padding: 10px 12px;
}

.render-car-bundle-status.error {
  border-color: #fecaca;
  background: #fff1f2;
  color: #b42318;
}

.render-car-bundle-status strong {
  font-size: 13px;
  font-weight: 900;
}

.render-car-bundle-status span {
  font-size: 12.5px;
  line-height: 1.5;
}

.render-car-bundle-guidance {
  display: grid;
  gap: 4px;
  border: 1px solid #d8d2ff;
  border-radius: 8px;
  background: #fbfaff;
  color: #344054;
  padding: 10px 12px;
}

.render-car-bundle-guidance strong {
  color: #5541d7;
  font-size: 13px;
  font-weight: 900;
}

.render-car-bundle-guidance span {
  font-size: 12.5px;
  line-height: 1.55;
}

.render-scene-material-block {
  display: grid;
  gap: 12px;
  border: 1px solid #bfe8ce;
  border-radius: 10px;
  background: #f7fffa;
  padding: 14px;
}

.render-scene-material-head {
  display: grid;
  gap: 4px;
}

.render-scene-material-head strong {
  color: #0f5132;
  font-size: 14px;
  font-weight: 900;
}

.render-scene-material-head span {
  color: #4f586c;
  font-size: 12.5px;
  line-height: 1.6;
}

.render-car-bundle-save {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: end;
  border: 1px solid #dce3f2;
  border-radius: 8px;
  background: #fff;
  padding: 12px;
}

.render-car-bundle-save label {
  display: grid;
  min-width: 0;
  gap: 6px;
}

.render-car-bundle-save span,
.render-host-toggle > span {
  color: #344054;
  font-size: 12.5px;
  font-weight: 900;
}

.render-car-bundle-save input {
  width: 100%;
  height: 36px;
  border: 1px solid #e1e6f0;
  border-radius: 8px;
  background: #fff;
  color: #111827;
  padding: 0 12px;
  outline: none;
}

.render-host-toggle {
  display: grid;
  gap: 8px;
  border: 1px solid #dce3f2;
  border-radius: 8px;
  background: #fff;
  padding: 12px;
}

.render-host-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.render-host-options button {
  min-height: 36px;
  border: 1px solid #e1e6f0;
  border-radius: 8px;
  background: #fff;
  color: #4f586c;
  font-size: 13px;
  font-weight: 850;
  cursor: pointer;
}

.render-host-options button.active {
  border-color: #7d69ff;
  background: #f5f3ff;
  color: #5b4be7;
}

.render-completeness-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.render-completeness-head span {
  color: #667085;
  font-size: 12px;
  font-weight: 900;
}

.render-completeness-head strong {
  color: #1d4ed8;
  font-size: 16px;
  font-weight: 900;
}

.render-completeness-track {
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: #e8ecf4;
}

.render-completeness-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2563eb 0%, #16a34a 100%);
}

.render-completeness-lines {
  display: grid;
  gap: 4px;
}

.render-completeness-lines p {
  margin: 0;
  color: #4f586c;
  font-size: 12.5px;
  line-height: 1.6;
}

.render-completeness-lines strong {
  color: #2d3446;
  font-weight: 900;
}

.render-voice-policy {
  display: grid;
  gap: 4px;
  border-radius: 8px;
  padding: 10px 12px;
}

.render-voice-policy strong {
  color: #232838;
  font-size: 12.5px;
  font-weight: 900;
}

.render-voice-policy p {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.6;
}

.render-voice-policy.ok {
  border: 1px solid #b7e4cd;
  background: #f0fbf5;
  color: #067647;
}

.render-voice-policy.warn {
  border: 1px solid #fedf89;
  background: #fffaeb;
  color: #93370d;
}

.render-voice-policy.neutral {
  border: 1px solid #dce3f2;
  background: #f8fafc;
  color: #4f586c;
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

.render-model-auto-hint {
  line-height: 1.55;
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

.render-ref-item-car {
  grid-template-columns: 60px minmax(0, 1fr) minmax(132px, 180px) 36px;
}

.render-ref-index {
  padding-top: 8px;
  color: #5e50df;
  font-weight: 800;
  font-size: 13px;
}

.render-ref-role-picker {
  position: relative;
}

.render-ref-role-trigger {
  display: inline-flex;
  width: 100%;
  height: 36px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid #e1e6f0;
  border-radius: 8px;
  background: #fff;
  color: #2d3446;
  padding: 0 10px;
  font-size: 12.5px;
  font-weight: 800;
  cursor: pointer;
}

.render-ref-role-trigger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.render-ref-role-menu {
  position: absolute;
  z-index: 30;
  top: 42px;
  right: 0;
  display: grid;
  width: 280px;
  max-height: 260px;
  overflow: auto;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  border: 1px solid #e1e6f0;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 16px 38px rgba(19, 25, 45, 0.14);
  padding: 8px;
}

.render-ref-role-menu button {
  min-height: 30px;
  border: 1px solid #edf0f6;
  border-radius: 7px;
  background: #fbfcff;
  color: #344054;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.render-ref-role-menu button:hover,
.render-ref-role-menu button.active {
  border-color: #a79bff;
  background: #f5f3ff;
  color: #5e50df;
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

@media (max-width: 720px) {
  .render-ref-item,
  .render-ref-item-car {
    grid-template-columns: 1fr;
  }

  .render-car-bundle-save,
  .render-host-options {
    grid-template-columns: 1fr;
  }

  .render-ref-index {
    padding-top: 0;
  }
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

.render-progress-note {
  margin: -6px 0 0;
  font-size: 12px;
  line-height: 1.6;
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

.render-partial-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid #d8e2ff;
  border-radius: 8px;
  background: #f8fbff;
  padding: 14px 16px;
}

.render-partial-panel strong {
  color: #1f2937;
  font-size: 14px;
  font-weight: 900;
}

.render-partial-panel span {
  flex: 0 0 auto;
  color: #4f46e5;
  font-size: 13px;
  font-weight: 900;
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
