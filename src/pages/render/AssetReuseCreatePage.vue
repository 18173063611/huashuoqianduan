<template>
  <section class="asset-reuse-page">
    <div class="asset-reuse-redesign">
      <header class="asset-reuse-head">
        <div class="asset-title-line">
          <div>
            <h1>
              资产复用创作
              <span class="asset-head-tag">从资产中心选择素材，快速生成视频</span>
            </h1>
            <p>从已有文案、分镜、数字人和素材中组合生成新视频。</p>
          </div>
        </div>
        <div class="asset-reuse-actions">
          <el-button
            type="primary"
            :icon="Finished"
            :disabled="!canPreparePlan"
            @click="prepareAssetReusePlanPreview"
          >
            {{ planPreviewLoading ? '方案生成中...' : planSubmitting ? '提交中...' : '进入方案确认' }}
          </el-button>
        </div>
      </header>

      <nav class="asset-steps" aria-label="资产复用流程">
        <div class="asset-step active">
          <span>1</span>
          <strong>选择素材</strong>
        </div>
        <div class="asset-step" :class="{ active: hasReusableVehicle }">
          <span>2</span>
          <strong>方案确认</strong>
        </div>
        <div class="asset-step" :class="{ active: hasReusableVehicle && hasCoreContent }">
          <span>3</span>
          <strong>生成视频</strong>
        </div>
        <div class="asset-step">
          <span>4</span>
          <strong>完成</strong>
        </div>
      </nav>

      <p class="asset-page-note">从资产中心选择已有素材，组合生成新视频</p>

      <div class="asset-reuse-shell">
        <main class="asset-stage-list">
          <section class="asset-stage-card asset-package-card">
            <div class="workflow-module-head">
              <div>
                <h2>资产整合包</h2>
                <p>可一键导入车型素材、文案、分镜、数字人、音频和高级生成参数；导入后仍走资产复用创作链路。</p>
              </div>
              <span class="workflow-badge core">可选</span>
            </div>
            <AssetPicker
              title="资产整合包"
              asset-type="JSON"
              :selected-url="selectedIntegrationPackageUrl"
              :selected-name="selectedIntegrationPackageName"
              :source-types="['ASSET_REUSE_PACKAGE', 'CAR_MODEL_CONTENT', 'MANUAL_CREATED', 'USER_UPLOAD']"
              :asset-roles="['asset_integration_package']"
              :role-options="ASSET_INTEGRATION_PACKAGE_ROLE_OPTIONS"
              :current-car-model-asset-id="selectedCarBundle?.asset.assetId || null"
              :current-car-model-name="selectedCarBundleName"
              initial-scope="global"
              source-hint="优先选择官方/公共资产整合包；匹配当前车型的包会排在前面，选择后自动填入资产复用参数。"
              placeholder="搜索车型、风格、数字人版或 30 秒整合包..."
              @select="handleAssetIntegrationPackageSelect"
            />
            <div v-if="selectedIntegrationPackage" class="workflow-status package-status">
              <strong>已导入资产整合包</strong>
              <span>{{ selectedIntegrationPackageName }} · 已预填文案、分镜和可用生成参数</span>
              <button type="button" class="workflow-mini-button" @click="selectedIntegrationPackage = null">
                取消整合包标识
              </button>
            </div>
          </section>

          <section class="asset-stage-card workflow-overview-card">
            <div class="stage-title workflow-heading">
              <span>1</span>
              <div>
                <h2>按视频制作工作区选择组件</h2>
                <p>先选车辆素材包，再补文案、分镜、音频、人物和字幕包装；可选内容默认收起。</p>
              </div>
            </div>
            <div class="reuse-workflow-strip" aria-label="资产复用组件选择流程">
              <span :class="{ active: hasReusableVehicle }"><strong>1</strong>车辆素材</span>
              <span :class="{ active: hasCoreContent }"><strong>2</strong>文案/分镜</span>
              <span :class="{ active: hasAudioOrHost }"><strong>3</strong>音频/人物</span>
              <span><strong>4</strong>字幕/大字报</span>
            </div>
          </section>

          <section class="asset-stage-card reuse-generation-settings-card">
            <div class="workflow-module-head">
              <div>
                <h2>生成参数</h2>
                <p>与新版页面发布前的视频制作参数保持一致；比例、语言、时长、模型、字幕和大字报会随方案一起提交。</p>
              </div>
              <span class="workflow-badge core">必看</span>
            </div>
            <div class="reuse-setting-grid">
              <label class="reuse-setting-field">
                <span>成片比例</span>
                <el-select v-model="assetReuseAspectRatio" size="small">
                  <el-option
                    v-for="item in ASSET_REUSE_ASPECT_RATIO_OPTIONS"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </label>
              <label class="reuse-setting-field">
                <span>讲述语言</span>
                <el-select v-model="assetReuseVoiceLanguage" size="small" @change="assetReuseSubtitleLanguage = assetReuseVoiceLanguage">
                  <el-option
                    v-for="item in ASSET_REUSE_LANGUAGE_OPTIONS"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </label>
              <label class="reuse-setting-field">
                <span>分段数量</span>
                <el-select v-model="assetReuseSegmentCount" size="small">
                  <el-option
                    v-for="item in ASSET_REUSE_SEGMENT_COUNT_OPTIONS"
                    :key="item"
                    :label="`${item} 段`"
                    :value="item"
                  />
                </el-select>
              </label>
              <label class="reuse-setting-field">
                <span>每段时长</span>
                <el-select v-model="assetReuseSegmentDuration" size="small">
                  <el-option
                    v-for="item in ASSET_REUSE_SEGMENT_DURATION_OPTIONS"
                    :key="item"
                    :label="`${item} 秒`"
                    :value="item"
                  />
                </el-select>
              </label>
              <label class="reuse-setting-field reuse-setting-field--wide">
                <span>生成模型</span>
                <el-select v-model="assetReuseModel" size="small">
                  <el-option
                    v-for="item in ASSET_REUSE_MODEL_OPTIONS"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </label>
              <label class="reuse-setting-field">
                <span>音频策略</span>
                <el-select v-model="assetReuseAudioPolicy" size="small">
                  <el-option
                    v-for="item in ASSET_REUSE_AUDIO_POLICY_OPTIONS"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </label>
            </div>
            <details class="reuse-optional-group reuse-generation-more">
              <summary>
                <span>字幕与大字报参数 <em>可选</em></span>
                <small>{{ assetReusePackagingSummary }}</small>
              </summary>
              <div class="reuse-optional-body">
                <div class="reuse-setting-grid reuse-setting-grid--packaging">
                  <label class="reuse-setting-field">
                    <span>字幕</span>
                    <el-select v-model="assetReuseSubtitleMode" size="small">
                      <el-option
                        v-for="item in ASSET_REUSE_SUBTITLE_MODE_OPTIONS"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                      />
                    </el-select>
                  </label>
                  <label class="reuse-setting-field">
                    <span>字幕语言</span>
                    <el-select v-model="assetReuseSubtitleLanguage" size="small" :disabled="assetReuseSubtitleMode === 'off'">
                      <el-option
                        v-for="item in ASSET_REUSE_LANGUAGE_OPTIONS"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                      />
                    </el-select>
                  </label>
                  <label class="reuse-setting-switch">
                    <span>烧录字幕</span>
                    <el-switch v-model="assetReuseBurnInSubtitle" :disabled="assetReuseSubtitleMode === 'off'" />
                  </label>
                  <label class="reuse-setting-switch">
                    <span>大字报</span>
                    <el-switch v-model="assetReuseHeadlineEnabled" />
                  </label>
                  <label v-if="assetReuseHeadlineEnabled" class="reuse-setting-field reuse-setting-field--wide">
                    <span>大字报文案</span>
                    <el-input v-model="assetReuseHeadlineText" maxlength="120" show-word-limit size="small" placeholder="例如：限时到店试驾权益" />
                  </label>
                </div>
              </div>
            </details>
          </section>

          <div class="reuse-workflow-grid">
            <section class="asset-stage-card reuse-workflow-module">
              <div class="workflow-module-head">
                <div>
                  <h2>必选：车辆素材包</h2>
                  <p>优先选择已整理好的车型素材包；场景图和车辆补图按需展开补充。</p>
                </div>
                <span class="workflow-badge required">必选</span>
              </div>
              <AssetPicker
                title="车型素材包"
                asset-type="JSON"
                :selected-url="selectedCarBundleUrl"
                :selected-name="selectedCarBundleName"
                :source-types="['USER_UPLOAD']"
                :asset-roles="['car_model_bundle']"
                :role-options="CAR_MODEL_BUNDLE_ROLE_OPTIONS"
                workflow-stage="carBundle"
                source-hint="从资产中心选择一款已整理好的车型素材包，自动带入车型图和部位标记"
                placeholder="搜索车型素材包..."
                @select="handleCarBundleAssetSelect"
              />
              <div v-if="selectedCarBundle" class="workflow-status" :class="{ error: carBundleLoadError }">
                <strong>{{ carBundleLoadError ? '素材包读取失败' : '已载入车型素材包' }}</strong>
                <span v-if="!carBundleLoadError">{{ selectedCarBundleName }} · {{ selectedCarBundleImageCountText }}</span>
                <span v-else>{{ carBundleLoadError }}</span>
              </div>

              <details class="reuse-optional-group">
                <summary>
                  <span>场景图片 <em>可选</em></span>
                  <small>{{ selectedSceneSelections.length ? `已选择 ${selectedSceneSelections.length} 张场景图` : '展厅、道路、门店、户外环境图，按需展开补充。' }}</small>
                </summary>
                <div class="reuse-optional-body">
                  <AssetPicker
                    title="从资产中心选择场景图片"
                    asset-type="IMAGE"
                    :asset-types="['IMAGE', 'COVER']"
                    :selected-url="firstSceneSelection?.asset.fileUrl || ''"
                    :selected-name="firstSceneSelection?.asset.fileName || ''"
                    :asset-roles="CAR_SCENE_REFERENCE_ROLES"
                    :role-options="CAR_SCENE_IMAGE_ROLE_OPTIONS"
                    workflow-stage="sceneBundle"
                    source-hint="只加载图片类资产；未打场景标签的普通图片也可在全部中选择"
                    placeholder="搜索场景图片素材..."
                    @select="handleSceneImageAssetSelect"
                  />
                  <div v-if="selectedSceneSelections.length" class="module-selected-list">
                    <article v-for="item in selectedSceneSelections" :key="item.asset.assetId">
                      <span>{{ roleLabel(item.role) }}</span>
                      <strong>{{ item.asset.fileName }}</strong>
                      <button type="button" @click="removeSelected(item.asset.assetId)">移除</button>
                    </article>
                  </div>
                </div>
              </details>

              <details class="reuse-optional-group">
                <summary>
                  <span>补充车辆素材 <em>可选</em></span>
                  <small>{{ selectedVehicleImageSelections.length ? `已选择 ${selectedVehicleImageSelections.length} 张车辆补图` : '多角度外观、内饰、轮毂、灯光等素材按需补充。' }}</small>
                </summary>
                <div class="reuse-optional-body">
                  <AssetPicker
                    title="从资产中心选择车辆图片"
                    asset-type="IMAGE"
                    :asset-types="['IMAGE', 'COVER']"
                    :selected-url="firstVehicleImageSelection?.asset.fileUrl || ''"
                    :selected-name="firstVehicleImageSelection?.asset.fileName || ''"
                    :role-options="CAR_IMAGE_ROLE_OPTIONS"
                    workflow-stage="material"
                    source-hint="用于补充车辆外观、内饰和细节图；生成时会按角色作为参考图"
                    placeholder="搜索车辆图片素材..."
                    @select="handleVehicleImageAssetSelect"
                  />
                  <div v-if="selectedVehicleImageSelections.length" class="module-selected-list">
                    <article v-for="item in selectedVehicleImageSelections" :key="item.asset.assetId">
                      <span>{{ roleLabel(item.role) }}</span>
                      <strong>{{ item.asset.fileName }}</strong>
                      <button type="button" @click="removeSelected(item.asset.assetId)">移除</button>
                    </article>
                  </div>
                </div>
              </details>
            </section>

            <section class="asset-stage-card reuse-workflow-module">
              <div class="workflow-module-head">
                <div>
                  <h2>核心：文案与分镜</h2>
                  <p>分镜控制画面节奏，爆款对标提供口播文案；补充目标用于约束最终方案。</p>
                </div>
                <span class="workflow-badge core">核心</span>
              </div>
              <AssetPicker
                title="分镜生成结果（控制段落节奏）"
                asset-type="JSON"
                :selected-url="selectedStoryboardUrl"
                :selected-name="selectedStoryboardName"
                :current-car-model-asset-id="selectedCarBundle?.asset.assetId || null"
                :current-car-model-name="selectedCarBundleName"
                :source-types="['STORYBOARD_GENERATE', 'VIDEO_SCRIPT_ANALYZE', 'VIDEO_SCRIPT_URL_ANALYZE', 'USER_UPLOAD']"
                :asset-roles="['storyboard_json']"
                :role-options="CAR_STORYBOARD_ROLE_OPTIONS"
                workflow-stage="storyboard"
                source-hint="旧分镜无需重新生成；系统会只复用镜头意图、景别、运镜和段落节奏"
                placeholder="搜索分镜生成结果..."
                @select="handleStoryboardAssetSelect"
              />
              <AssetPicker
                title="爆款对标结果（口播文案）"
                asset-type="JSON"
                :asset-types="['JSON', 'TEXT']"
                :selected-url="selectedBenchmarkUrl"
                :selected-name="selectedBenchmarkName"
                :current-car-model-asset-id="selectedCarBundle?.asset.assetId || null"
                :current-car-model-name="selectedCarBundleName"
                :source-types="['DOUYIN_BENCHMARK', 'DOUYIN_PARSE_TRANSCRIPT', 'DOUYIN_REWRITE', 'DOUYIN_TRANSCRIPT', 'USER_UPLOAD']"
                :asset-roles="['benchmark_json', 'voice_script']"
                :role-options="CAR_BENCHMARK_ROLE_OPTIONS"
                workflow-stage="benchmark"
                source-hint="爆款对标产出的口播文案，可直接作为方案口播和分镜台词参考"
                placeholder="搜索爆款对标文案..."
                @select="handleBenchmarkAssetSelect"
              />
              <div class="workflow-prompt-box">
                <div>
                  <strong>文案补充与生成目标</strong>
                  <button type="button" class="link-action" @click="applyAiCopyPrompt">AI生成新文案</button>
                </div>
                <el-input
                  v-model="draftPrompt"
                  type="textarea"
                  maxlength="500"
                  :rows="4"
                  show-word-limit
                  placeholder="补充本次生成目标，例如车型、卖点、门店活动、目标客户"
                />
              </div>

              <details class="reuse-optional-group">
                <summary>
                  <span>音频与人物 <em>可选</em></span>
                  <small>口播、背景音乐、人物出镜集中在这里；默认不使用数字人，音频智能匹配。</small>
                </summary>
                <div class="reuse-optional-body">
                  <div class="workflow-toggle-row">
                    <span>人物出镜</span>
                    <div>
                      <button type="button" :class="{ active: !hostAppearanceEnabled }" @click="disableHostAppearance">
                        不出镜
                      </button>
                      <button type="button" :class="{ active: hostAppearanceEnabled }" @click="hostAppearanceEnabled = true">
                        虚拟人物出镜
                      </button>
                    </div>
                  </div>
                  <AssetPicker
                    v-if="hostAppearanceEnabled"
                    title="数字人形象"
                    asset-type="IMAGE"
                    :asset-types="['IMAGE', 'COVER']"
                    :selected-url="selectedHostUrl"
                    :selected-name="selectedHostName"
                    :source-types="['AVATAR_GENERATE', 'USER_UPLOAD', 'MANUAL_CREATED', 'AI_GENERATED']"
                    :asset-roles="['host_image']"
                    :role-options="CAR_HOST_IMAGE_ROLE_OPTIONS"
                    source-hint="选择数字人形象图片，生成时会作为销售顾问或主播参考图"
                    placeholder="搜索数字人形象或上传图片..."
                    @select="handleHostImageAssetSelect"
                  />

                  <details class="reuse-optional-group reuse-nested-group">
                    <summary>
                      <span>讲述与声音 <em>可选</em></span>
                      <small>{{ selectedVoiceName || '默认按口播文案驱动模型；已有音频时再展开配置。' }}</small>
                    </summary>
                    <div class="reuse-optional-body">
                      <AssetPicker
                        title="口播/配音音频"
                        asset-type="AUDIO"
                        :selected-url="selectedVoiceUrl"
                        :selected-name="selectedVoiceName"
                        :source-types="['TTS_GENERATE', 'VOICE_SAMPLE', 'USER_UPLOAD']"
                        :asset-roles="['voiceover', 'reference_audio']"
                        :role-options="CAR_VOICE_AUDIO_ROLE_OPTIONS"
                        source-hint="口播音频会作为字幕、节奏和最终音轨的主导来源"
                        placeholder="搜索口播音频资产..."
                        @select="handleVoiceAssetSelect"
                      />
                      <button v-if="selectedVoice" type="button" class="workflow-mini-button" @click="removeSelected(selectedVoice.asset.assetId)">
                        不使用口播音频
                      </button>
                    </div>
                  </details>

                  <details class="reuse-optional-group reuse-nested-group">
                    <summary>
                      <span>背景音乐 BGM <em>可选</em></span>
                      <small>{{ selectedBgmName || '只作为背景音乐混入，不参与口播、字幕或口型。' }}</small>
                    </summary>
                    <div class="reuse-optional-body">
                      <AssetPicker
                        title="背景音乐 BGM"
                        asset-type="AUDIO"
                        :selected-url="selectedBgmUrl"
                        :selected-name="selectedBgmName"
                        :asset-roles="['bgm']"
                        :role-options="CAR_BGM_AUDIO_ROLE_OPTIONS"
                        source-hint="可选择用户上传或开发者公共 BGM；只作为背景音乐，不参与口播、字幕或口型生成"
                        placeholder="搜索 BGM 音频资产..."
                        @select="handleBgmAssetSelect"
                      />
                      <button v-if="selectedBgm" type="button" class="workflow-mini-button" @click="removeSelected(selectedBgm.asset.assetId)">
                        不使用背景音乐
                      </button>
                    </div>
                  </details>
                </div>
              </details>

              <details class="reuse-optional-group">
                <summary>
                  <span>字幕与大字报 <em>可选</em></span>
                  <small>{{ assetReusePackagingSummary }}</small>
                </summary>
                <div class="reuse-optional-body">
                  <div class="workflow-static-setting">
                    <strong>字幕</strong>
                    <span>{{ assetReuseSubtitleSettingSummary }}</span>
                  </div>
                  <div class="workflow-static-setting">
                    <strong>大字报</strong>
                    <span>{{ assetReuseHeadlineSettingSummary }}</span>
                  </div>
                </div>
              </details>
            </section>
          </div>
        </main>

        <aside class="asset-preview-rail">
          <section class="plan-preview-card">
            <div class="preview-card-head">
              <h2>方案预览</h2>
              <button v-if="selectedAssets.length" type="button" @click="clearSelectedAssets">清空全部</button>
            </div>
            <div class="preview-list">
              <div class="preview-item">
                <span class="preview-icon blue"><el-icon><Document /></el-icon></span>
                <div>
                  <strong>文案</strong>
                  <p>{{ selectedSummary(['voice_script', 'benchmark_json'], '待选择文案') }}</p>
                </div>
              </div>
              <div class="preview-item">
                <span class="preview-icon indigo"><el-icon><Collection /></el-icon></span>
                <div>
                  <strong>分镜</strong>
                  <p>{{ selectedSummary(['storyboard_json'], '待选择分镜') }}</p>
                </div>
              </div>
              <div class="preview-item">
                <span class="preview-icon avatar"><el-icon><User /></el-icon></span>
                <div>
                  <strong>数字人</strong>
                  <p>{{ selectedSummary(['host_image', 'host_video'], '不使用数字人') }}</p>
                </div>
              </div>
              <div class="preview-item">
                <span class="preview-icon voice"><el-icon><Microphone /></el-icon></span>
                <div>
                  <strong>配音</strong>
                  <p>{{ selectedSummary(['voiceover'], '不使用配音') }}</p>
                </div>
              </div>
              <div class="preview-item">
                <span class="preview-icon music"><el-icon><Headset /></el-icon></span>
                <div>
                  <strong>背景音乐</strong>
                  <p>{{ selectedSummary(['bgm'], '不使用音乐') }}</p>
                </div>
              </div>
              <div class="preview-item">
                <span class="preview-icon material"><el-icon><PictureRounded /></el-icon></span>
                <div>
                  <strong>车辆素材</strong>
                  <p>{{ vehicleAssetSummary }}</p>
                </div>
              </div>
            </div>

            <div v-if="selectedAssets.length" class="selection-list">
              <div v-for="item in selectedAssets" :key="item.asset.assetId" class="selection-item">
                <div>
                  <strong>{{ item.asset.fileName }}</strong>
                  <span>{{ assetTypeLabel(item.asset.assetType) }}</span>
                </div>
                <el-select v-model="item.role" size="small">
                  <el-option
                    v-for="role in roleOptions"
                    :key="role.value"
                    :label="role.label"
                    :value="role.value"
                  />
                </el-select>
                <button
                  type="button"
                  class="selection-cover-button"
                  :class="{ active: selectedCoverAssetId === item.asset.assetId }"
                  :disabled="!assetCoverPreviewUrl(item.asset)"
                  @click="setCoverAsset(item.asset)"
                >
                  {{ selectedCoverAssetId === item.asset.assetId ? '当前封面' : '设为封面' }}
                </button>
                <button v-if="isTextPreviewAsset(item.asset)" type="button" @click="openAssetTextPreview(item.asset, '资产预览')">预览</button>
                <button type="button" @click="removeSelected(item.asset.assetId)">移除</button>
              </div>
            </div>
          </section>

          <section class="video-preview-card">
            <h2>视频效果预览</h2>
            <div class="video-preview-frame">
              <img v-if="previewVisualUrl" :src="previewVisualUrl" alt="" />
              <div v-else class="preview-placeholder">
                <span><el-icon><VideoPlay /></el-icon></span>
                <strong>选择车辆图片后预览</strong>
              </div>
            </div>
            <div class="preview-meta">
              <span>封面：{{ selectedCoverAsset ? selectedCoverAsset.asset.fileName : '自动使用首帧' }}</span>
              <span>预计时长：约 {{ assetReuseDurationLabel }}</span>
              <span>规格：{{ assetReuseSettingsSummary }}</span>
              <span>预计消耗积分：20 积分</span>
            </div>
            <el-input
              v-model="draftPrompt"
              class="draft-prompt"
              type="textarea"
              maxlength="500"
              :rows="4"
              show-word-limit
              placeholder="补充本次生成目标，例如车型、卖点、门店活动、目标客户"
            />
            <el-button class="selection-submit" type="primary" :disabled="!canPreparePlan" @click="prepareAssetReusePlanPreview">
              {{ planPreviewLoading ? '方案生成中...' : planSubmitting ? '提交中...' : '进入方案确认' }}
            </el-button>
            <el-button class="save-draft-button" :disabled="selectedAssets.length === 0" @click="saveAssetReuseDraft">保存为草稿</el-button>
            <p>提示：生成的视频将保存在「我的视频」中</p>
          </section>
        </aside>
      </div>
    </div>

    <AiPlanPreviewDrawer
      v-model="planPreviewOpen"
      :loading="planPreviewLoading || planSubmitting"
      :error="planPreviewError"
      :plan="planPreview"
      :aspect-ratio="assetReusePlanDraft?.aspectRatio"
      :active-task-id="activeRenderTaskId"
      :active-task-status="activeRenderTaskStatus"
      :active-task-progress="activeRenderTaskProgress"
      :cancel-loading="cancelingRenderTask"
      :regenerate-loading="planSubmitting"
      @update-script="updatePlanScript"
      @update-storyboard-shot="updatePlanStoryboardShot"
      @back="planPreviewOpen = false"
      @refresh="prepareAssetReusePlanPreview"
      @confirm="confirmAssetReusePlan"
      @regenerate="regenerateAssetReuseVideo"
      @cancel-generation="cancelAssetReuseRenderTask"
    />
    <el-dialog v-model="assetPreviewDialog.open" :title="assetPreviewDialog.title" width="720px">
      <div v-if="assetPreviewDialog.loading" class="asset-text-preview-state">正在加载预览...</div>
      <div v-else-if="assetPreviewDialog.error" class="asset-text-preview-state asset-text-preview-state--error">
        {{ assetPreviewDialog.error }}
      </div>
      <pre v-else class="asset-text-preview-body">{{ assetPreviewDialog.text }}</pre>
      <template #footer>
        <el-button @click="assetPreviewDialog.open = false">关闭</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Collection,
  Document,
  Finished,
  Headset,
  Microphone,
  PictureRounded,
  User,
  VideoPlay,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getAssetDetail, getAssetTextContent } from '../../services/assetApi'
import { rememberSessionTaskId } from '../../services/sessionTaskStore'
import {
  consumePendingRenderTaskImport,
  readRenderTaskSnapshot,
} from '../../services/renderTaskImport'
import {
  getLatestPendingCarSalesPlanTask,
  getPendingCarSalesPlanTask,
  newPendingCarSalesPlanTaskId,
  patchPendingCarSalesPlanTask,
  removePendingCarSalesPlanTask,
  type PendingCarSalesPlanTask,
  type PendingCarSalesRenderTaskKind,
  upsertPendingCarSalesPlanTask,
} from '../../services/carSalesPlanTaskStore'
import { newVideoIdempotencyKey, quickRenderVideo } from '../../services/videoApi'
import { cancelTask } from '../../services/taskApi'
import { loadCarSalesPreferences } from '../../services/systemWorkspaceStore'
import {
  normalizeCarNativeSpeechStyle,
  normalizeCarNativeVoiceStyle,
} from '../../constants/carSalesVoiceStyles'
import { useAuthRequired } from '../../composables/useAuthRequired'
import type { AssetItem, AssetType } from '../../types/assetTypes'
import type { QuickRenderAssetRole } from '../../types/videoTypes'
import {
  assetWorkflowDisplayMeta,
  assetWorkflowDisplayTitle,
  isCarModelBundleAsset,
} from '../../utils/assetWorkflow'
import { normalizePublicMediaUrl } from '../../utils/mediaUrl'
import AiPlanPreviewDrawer from './AiPlanPreviewDrawer.vue'
import AssetPicker from './AssetPicker.vue'
import {
  carModelBundleCoverUrl,
  carModelBundleDeclaredImageCount,
} from './carModelBundle'
import {
  buildQuickRenderRequestFromPlanDraft,
  ensureCarSalesPlanDraftAsset,
  parseStoryboardAssetTextToPlanShots,
  planAssetFromAssetItem,
  prepareCarSalesAiPlanPreview,
  type AiPlanPreview,
  type AiPlanStoryboardShot,
  type CarSalesPlanDraft,
} from './carSalesPlanDraft'

const DEFAULT_CAR_SALES_MODEL = 'auto'
const carSalesPreferences = loadCarSalesPreferences()
const SEEDANCE_2_MODEL = 'ep-20260512233524-85r4g'
const DEFAULT_ASSET_REUSE_MODEL =
  carSalesPreferences.model && carSalesPreferences.model !== 'auto'
    ? carSalesPreferences.model
    : SEEDANCE_2_MODEL

interface SelectedAsset {
  asset: AssetItem
  role: QuickRenderAssetRole
}

interface AssetPickerPayload {
  asset: AssetItem
  url: string
}

interface StoredAssetReuseDraft {
  savedAt: string
  draftPrompt: string
  selectedCoverAssetId: number | null
  selectedAssets: SelectedAsset[]
  renderConfig?: ImportedRenderConfig
}

interface ImportedRenderConfig {
  aspectRatio?: CarSalesPlanDraft['aspectRatio']
  subtitleMode?: CarSalesPlanDraft['subtitleMode']
  subtitleLanguage?: string
  nativeVoiceLanguage?: string
  nativeVoiceStyle?: string
  nativeSpeechStyle?: string
  autoTtsVoiceId?: number | null
  burnInSubtitle?: boolean
  audioPolicy?: CarSalesPlanDraft['audioPolicy']
  model?: string
  segmentCount?: number
  segmentDuration?: number
  hostAppearanceEnabled?: boolean
  headlineOverlay?: CarSalesPlanDraft['headlineOverlay']
  subtitleOverlay?: CarSalesPlanDraft['subtitleOverlay']
  creationMode?: string
  chainType?: string
  videoType?: string
  hasDigitalHuman?: boolean
  digitalHumanId?: string
  avatarUrl?: string
  hostImageUrl?: string
  voiceId?: string
  tone?: string
  language?: string
  duration?: number
  enableSubtitle?: boolean
  subtitleStyle?: string
  enableBigText?: boolean
  bigTextStyle?: string
  enableBgm?: boolean
  bgmStyle?: string
  generateCover?: boolean
  generateTitle?: boolean
  generateDescription?: boolean
  generateTags?: boolean
  benchmarkVideoId?: string
  uploadedVideoId?: string
  reuseAssetIds?: number[]
  vehicleId?: string
  vehicleName?: string
}

const ASSET_REUSE_DRAFT_STORAGE_KEY = 'huashuo.assetReuseDraft.v1'

const roleOptions: Array<{ value: QuickRenderAssetRole; label: string }> = [
  { value: 'car_model_bundle', label: '车型素材包' },
  { value: 'car_exterior_front', label: '车辆主图' },
  { value: 'car_exterior_side', label: '车辆侧面' },
  { value: 'car_interior_dashboard', label: '内饰中控' },
  { value: 'scene_showroom', label: '展厅场景' },
  { value: 'voice_script', label: '口播文案' },
  { value: 'storyboard_json', label: '分镜JSON' },
  { value: 'benchmark_json', label: '爆款对标' },
  { value: 'host_image', label: '数字人形象' },
  { value: 'host_video', label: '数字人口播' },
  { value: 'bgm', label: '背景音乐' },
  { value: 'voiceover', label: '口播音频' },
]

const CAR_MODEL_BUNDLE_ROLE_OPTIONS = [{ value: 'car_model_bundle', label: '车型素材包' }]
const ASSET_INTEGRATION_PACKAGE_ROLE_OPTIONS = [{ value: 'asset_integration_package', label: '资产整合包' }]
const CAR_STORYBOARD_ROLE_OPTIONS = [{ value: 'storyboard_json', label: '分镜' }]
const CAR_BENCHMARK_ROLE_OPTIONS = [
  { value: 'benchmark_json', label: '爆款对标' },
  { value: 'voice_script', label: '口播文案' },
]
const CAR_HOST_IMAGE_ROLE_OPTIONS = [{ value: 'host_image', label: '数字人形象' }]
const CAR_VOICE_AUDIO_ROLE_OPTIONS = [
  { value: 'voiceover', label: '口播音频' },
  { value: 'reference_audio', label: '参考音频' },
]
const CAR_BGM_AUDIO_ROLE_OPTIONS = [{ value: 'bgm', label: 'BGM' }]
const CAR_IMAGE_ROLE_OPTIONS = [
  { value: 'car_exterior_front', label: '外观正面' },
  { value: 'car_exterior_side', label: '外观侧面' },
  { value: 'car_exterior_rear', label: '外观背面' },
  { value: 'car_exterior_45', label: '外观 45 度' },
  { value: 'car_interior_dashboard', label: '内饰中控' },
  { value: 'car_interior_front_seat', label: '内饰前排' },
  { value: 'car_interior_back_seat', label: '内饰后排' },
  { value: 'car_interior_steering', label: '方向盘/中控' },
  { value: 'car_interior_trunk', label: '后备箱' },
  { value: 'car_detail_sunroof', label: '天窗细节' },
  { value: 'car_detail_light', label: '车灯细节' },
  { value: 'car_detail_wheel', label: '轮毂细节' },
  { value: 'car_detail_logo', label: '车标细节' },
  { value: 'car_detail_seat_material', label: '座椅材质' },
]
const CAR_SCENE_REFERENCE_ROLES: QuickRenderAssetRole[] = [
  'scene_showroom',
  'scene_outdoor',
  'scene_road',
  'scene_night',
]
const CAR_SCENE_IMAGE_ROLE_OPTIONS = [
  { value: 'scene_showroom', label: '展厅场景' },
  { value: 'scene_outdoor', label: '户外场景' },
  { value: 'scene_road', label: '道路场景' },
  { value: 'scene_night', label: '夜景/门店' },
]
const CAR_VEHICLE_REFERENCE_ROLES: QuickRenderAssetRole[] = CAR_IMAGE_ROLE_OPTIONS.map((item) => item.value as QuickRenderAssetRole)
const ASSET_REUSE_ASPECT_RATIO_OPTIONS: Array<{ value: CarSalesPlanDraft['aspectRatio']; label: string }> = [
  { value: '9:16', label: '竖屏 9:16' },
  { value: '16:9', label: '横屏 16:9' },
  { value: 'auto', label: '跟随素材' },
]
const ASSET_REUSE_LANGUAGE_OPTIONS = [
  { value: 'zh-CN', label: '中文讲述' },
  { value: 'en-US', label: '英文讲述' },
]
const ASSET_REUSE_SUBTITLE_MODE_OPTIONS: Array<{ value: CarSalesPlanDraft['subtitleMode']; label: string }> = [
  { value: 'auto', label: '自动字幕' },
  { value: 'upload', label: '自定义字幕' },
  { value: 'off', label: '关闭字幕' },
]
const ASSET_REUSE_AUDIO_POLICY_OPTIONS: Array<{ value: CarSalesPlanDraft['audioPolicy']; label: string }> = [
  { value: 'auto', label: '智能匹配' },
  { value: 'voiceover', label: '使用口播音频' },
  { value: 'bgm', label: '仅背景音乐' },
  { value: 'none', label: '无口播/无音频' },
]
const ASSET_REUSE_MODEL_OPTIONS = [
  ...(DEFAULT_ASSET_REUSE_MODEL !== SEEDANCE_2_MODEL && DEFAULT_ASSET_REUSE_MODEL !== DEFAULT_CAR_SALES_MODEL
    ? [{ value: DEFAULT_ASSET_REUSE_MODEL, label: '系统默认模型' }]
    : []),
  { value: SEEDANCE_2_MODEL, label: 'Seedance 2.0（默认）' },
  { value: 'doubao-seedance-2-0-pro-250528', label: 'Seedance 2.0 Pro' },
  { value: DEFAULT_CAR_SALES_MODEL, label: '系统智能选择' },
]
const ASSET_REUSE_SEGMENT_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10, 12]
const ASSET_REUSE_SEGMENT_DURATION_OPTIONS = [4, 5, 6, 8, 10, 12, 15]
const ROLE_LABEL_OPTIONS: Array<{ value: QuickRenderAssetRole; label: string }> = [
  ...roleOptions,
  ...CAR_IMAGE_ROLE_OPTIONS.map((item) => ({ value: item.value as QuickRenderAssetRole, label: item.label })),
  ...CAR_SCENE_IMAGE_ROLE_OPTIONS.map((item) => ({ value: item.value as QuickRenderAssetRole, label: item.label })),
  ...CAR_VOICE_AUDIO_ROLE_OPTIONS.map((item) => ({ value: item.value as QuickRenderAssetRole, label: item.label })),
  { value: 'scene_material_bundle', label: '场景素材包' },
  { value: 'subtitle', label: '字幕文件' },
]
const SUPPORTED_ASSET_ROLES = new Set(ROLE_LABEL_OPTIONS.map((item) => item.value))
const ASSET_ROLE_ALIASES: Record<string, QuickRenderAssetRole> = {
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
  dashboard: 'car_interior_dashboard',
  interior: 'car_interior_dashboard',
  interior_dashboard: 'car_interior_dashboard',
  front_seat: 'car_interior_front_seat',
  back_seat: 'car_interior_back_seat',
  rear_seat: 'car_interior_back_seat',
  steering: 'car_interior_steering',
  steering_wheel: 'car_interior_steering',
  instrument: 'car_interior_dashboard',
  dashboard_wheel: 'car_interior_dashboard',
  trunk: 'car_interior_trunk',
  boot: 'car_interior_trunk',
  sunroof: 'car_detail_sunroof',
  panoramic_roof: 'car_detail_sunroof',
  light: 'car_detail_light',
  headlight: 'car_detail_light',
  wheel: 'car_detail_wheel',
  logo: 'car_detail_logo',
  seat: 'car_detail_seat_material',
  seat_material: 'car_detail_seat_material',
  material: 'car_detail_seat_material',
  showroom: 'scene_showroom',
  dealership: 'scene_showroom',
  scene: 'scene_showroom',
  outdoor: 'scene_outdoor',
  city: 'scene_outdoor',
  scene_outdoor_city: 'scene_outdoor',
  road: 'scene_road',
  mountain: 'scene_road',
  highway: 'scene_road',
  night: 'scene_night',
  store_night: 'scene_night',
  host: 'host_image',
  avatar: 'host_image',
}
const ASSET_REUSE_GENERATION_ROLES = new Set<QuickRenderAssetRole>(ROLE_LABEL_OPTIONS.map((item) => item.value))
const SINGLETON_ROLE_GROUPS: QuickRenderAssetRole[][] = [
  ['car_model_bundle'],
  ['storyboard_json'],
  ['benchmark_json', 'voice_script'],
  ['host_image', 'host_video'],
  ['voiceover', 'reference_audio'],
  ['bgm'],
]

const router = useRouter()
const route = useRoute()
const { requireAuth } = useAuthRequired()
const selectedAssets = ref<SelectedAsset[]>([])
const selectedIntegrationPackage = ref<AssetItem | null>(null)
const selectedCoverAssetId = ref<number | null>(null)
const draftPrompt = ref('')
const hostAppearanceEnabled = ref(false)
const assetReuseAspectRatio = ref<CarSalesPlanDraft['aspectRatio']>('9:16')
const assetReuseVoiceLanguage = ref<'zh-CN' | 'en-US'>('zh-CN')
const assetReuseSubtitleMode = ref<CarSalesPlanDraft['subtitleMode']>('auto')
const assetReuseSubtitleLanguage = ref('zh-CN')
const assetReuseBurnInSubtitle = ref(true)
const assetReuseAudioPolicy = ref<CarSalesPlanDraft['audioPolicy']>('auto')
const assetReuseModel = ref(DEFAULT_ASSET_REUSE_MODEL)
const assetReuseSegmentCount = ref(6)
const assetReuseSegmentDuration = ref(5)
const assetReuseHeadlineEnabled = ref(false)
const assetReuseHeadlineText = ref('')
const carBundleLoadError = ref('')
const planPreviewOpen = ref(false)
const planPreviewLoading = ref(false)
const planSubmitting = ref(false)
const cancelingRenderTask = ref(false)
const activeRenderTaskId = ref<number | null>(null)
const activeRenderTaskStatus = ref('')
const activeRenderTaskProgress = ref<number | null>(null)
const planPreviewError = ref('')
const planPreview = ref<AiPlanPreview | null>(null)
const assetReusePlanDraft = ref<CarSalesPlanDraft | null>(null)
const importedRenderConfig = ref<ImportedRenderConfig>({})
const importedScriptText = ref('')
const importedStoryboard = ref<AiPlanStoryboardShot[]>([])
const currentPendingPlanTaskId = ref('')
const assetRawTextById = ref<Record<number, string>>({})
const assetPreviewTextById = ref<Record<number, string>>({})
const assetPreviewLoadingById = ref<Record<number, boolean>>({})
const carBundleImageCountById = ref<Record<number, number>>({})
const assetPreviewDialog = reactive({
  open: false,
  loading: false,
  title: '',
  text: '',
  error: '',
})

const previewVisualUrl = computed(() => {
  if (selectedCoverAsset.value) {
    return assetCoverPreviewUrl(selectedCoverAsset.value.asset)
  }
  const visual = selectedAssets.value.find((item) => assetCoverPreviewUrl(item.asset))
  return visual ? assetCoverPreviewUrl(visual.asset) : ''
})
const selectedCoverAsset = computed(() => {
  if (!selectedCoverAssetId.value) return null
  return selectedAssets.value.find((item) => item.asset.assetId === selectedCoverAssetId.value) || null
})
const selectedCarBundle = computed(() => firstSelectedByRoles(['car_model_bundle']))
const selectedStoryboard = computed(() => firstSelectedByRoles(['storyboard_json']))
const selectedBenchmark = computed(() => firstSelectedByRoles(['benchmark_json', 'voice_script']))
const selectedHost = computed(() => firstSelectedByRoles(['host_image', 'host_video']))
const selectedVoice = computed(() => firstSelectedByRoles(['voiceover', 'reference_audio']))
const selectedBgm = computed(() => firstSelectedByRoles(['bgm']))
const selectedSceneSelections = computed(() => selectedAssets.value.filter((item) => item.role.startsWith('scene_')))
const selectedVehicleImageSelections = computed(() =>
  selectedAssets.value.filter((item) => item.role.startsWith('car_') && item.role !== 'car_model_bundle'),
)
const firstSceneSelection = computed(() => selectedSceneSelections.value[0] || null)
const firstVehicleImageSelection = computed(() => selectedVehicleImageSelections.value[0] || null)
const vehicleAssetSummary = computed(() => {
  if (selectedCarBundle.value) {
    return selectedCarBundleName.value
  }
  const selectedVehicleCount = selectedVehicleImageSelections.value.length + selectedSceneSelections.value.length
  return selectedVehicleCount ? `已选择 ${selectedVehicleCount} 个车辆/场景素材` : '待选择车辆素材'
})
const hasReusableVehicle = computed(() =>
  Boolean(selectedCarBundle.value || selectedVehicleImageSelections.value.length || selectedSceneSelections.value.length),
)
const hasCoreContent = computed(() => Boolean(
  selectedStoryboard.value
  || selectedBenchmark.value
  || draftPrompt.value.trim()
  || importedScriptText.value.trim()
  || importedStoryboard.value.length,
))
const hasAudioOrHost = computed(() => Boolean(selectedHost.value || selectedVoice.value || selectedBgm.value))
const canPreparePlan = computed(() =>
  hasReusableVehicle.value && hasCoreContent.value && !planPreviewLoading.value && !planSubmitting.value,
)
const selectedCarBundleUrl = computed(() => selectedAssetUrl(selectedCarBundle.value))
const selectedCarBundleName = computed(() => selectedCarBundle.value?.asset.fileName || '')
const selectedCarBundleImageCountText = computed(() => {
  const asset = selectedCarBundle.value?.asset
  if (!asset) return '等待选择'
  const count = carBundleImageCountById.value[asset.assetId] || carBundleImageCount(asset)
  return count > 0 ? `${count} 张图片已带入` : '图片已打包'
})
const selectedStoryboardUrl = computed(() => selectedAssetUrl(selectedStoryboard.value))
const selectedStoryboardName = computed(() => selectedStoryboard.value?.asset.fileName || '')
const selectedBenchmarkUrl = computed(() => selectedAssetUrl(selectedBenchmark.value))
const selectedBenchmarkName = computed(() => selectedBenchmark.value?.asset.fileName || '')
const selectedHostUrl = computed(() => selectedAssetUrl(selectedHost.value))
const selectedHostName = computed(() => selectedHost.value?.asset.fileName || '')
const selectedVoiceUrl = computed(() => selectedAssetUrl(selectedVoice.value))
const selectedVoiceName = computed(() => selectedVoice.value?.asset.fileName || '')
const selectedBgmUrl = computed(() => selectedAssetUrl(selectedBgm.value))
const selectedBgmName = computed(() => selectedBgm.value?.asset.fileName || '')
const selectedIntegrationPackageUrl = computed(() =>
  selectedIntegrationPackage.value
    ? assetCoverPreviewUrl(selectedIntegrationPackage.value) || normalizePublicMediaUrl(selectedIntegrationPackage.value.fileUrl || '')
    : '',
)
const selectedIntegrationPackageName = computed(() => selectedIntegrationPackage.value?.fileName || '')
const assetReuseTotalDuration = computed(() => assetReuseSegmentCount.value * assetReuseSegmentDuration.value)
const assetReuseDurationLabel = computed(() => formatDurationLabel(assetReuseTotalDuration.value))
const assetReuseSettingsSummary = computed(() => [
  optionLabel(ASSET_REUSE_ASPECT_RATIO_OPTIONS, assetReuseAspectRatio.value),
  `${assetReuseSegmentCount.value} 段`,
  optionLabel(ASSET_REUSE_LANGUAGE_OPTIONS, assetReuseVoiceLanguage.value),
].filter(Boolean).join(' · '))
const assetReuseSubtitleSettingSummary = computed(() => {
  if (assetReuseSubtitleMode.value === 'off') return '关闭字幕'
  return [
    optionLabel(ASSET_REUSE_SUBTITLE_MODE_OPTIONS, assetReuseSubtitleMode.value),
    optionLabel(ASSET_REUSE_LANGUAGE_OPTIONS, assetReuseSubtitleLanguage.value),
    assetReuseBurnInSubtitle.value ? '烧录到视频' : '仅生成字幕数据',
  ].filter(Boolean).join(' / ')
})
const assetReuseHeadlineSettingSummary = computed(() =>
  assetReuseHeadlineEnabled.value
    ? assetReuseHeadlineText.value.trim() || '开启，使用系统自动大字报'
    : '关闭',
)
const assetReusePackagingSummary = computed(() =>
  `${assetReuseSubtitleSettingSummary.value}；大字报：${assetReuseHeadlineSettingSummary.value}`,
)

function addSelectedAsset(asset: AssetItem, role: QuickRenderAssetRole, replaceRoles = singletonRolesFor(role)) {
  if (!ASSET_REUSE_GENERATION_ROLES.has(role)) {
    return
  }
  const next = selectedAssets.value.filter((item) =>
    item.asset.assetId !== asset.assetId && !replaceRoles.includes(item.role),
  )
  selectedAssets.value = [...next, { asset, role }]
  ensureDefaultCoverAsset(asset)
}

function removeSelected(assetId: number) {
  selectedAssets.value = selectedAssets.value.filter((item) => item.asset.assetId !== assetId)
  if (selectedCoverAssetId.value === assetId) {
    selectedCoverAssetId.value = firstCoverCandidateId()
  }
}

function clearSelectedAssets() {
  selectedAssets.value = []
  selectedIntegrationPackage.value = null
  selectedCoverAssetId.value = null
  hostAppearanceEnabled.value = false
  resetAssetReuseGenerationControls()
  importedRenderConfig.value = {}
  importedScriptText.value = ''
  importedStoryboard.value = []
  carBundleLoadError.value = ''
}

function setCoverAsset(asset: AssetItem) {
  if (!assetCoverPreviewUrl(asset)) return
  selectedCoverAssetId.value = asset.assetId
}

function ensureDefaultCoverAsset(asset: AssetItem) {
  if (selectedCoverAssetId.value || !assetCoverPreviewUrl(asset)) return
  selectedCoverAssetId.value = asset.assetId
}

function firstCoverCandidateId() {
  const candidate = selectedAssets.value.find((item) => assetCoverPreviewUrl(item.asset))
  return candidate?.asset.assetId ?? null
}

function firstSelectedByRoles(roles: QuickRenderAssetRole[]) {
  return selectedAssets.value.find((item) => roles.includes(item.role)) || null
}

function selectedAssetUrl(item: SelectedAsset | null) {
  if (!item) return ''
  return assetCoverPreviewUrl(item.asset) || normalizePublicMediaUrl(item.asset.fileUrl || '')
}

function optionLabel<T extends string | number>(options: Array<{ value: T; label: string }>, value: T) {
  return options.find((item) => item.value === value)?.label || String(value)
}

function formatDurationLabel(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds || 0))
  const minutes = Math.floor(safeSeconds / 60)
  const rest = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

function resetAssetReuseGenerationControls() {
  assetReuseAspectRatio.value = '9:16'
  assetReuseVoiceLanguage.value = 'zh-CN'
  assetReuseSubtitleMode.value = 'auto'
  assetReuseSubtitleLanguage.value = 'zh-CN'
  assetReuseBurnInSubtitle.value = true
  assetReuseAudioPolicy.value = 'auto'
  assetReuseModel.value = DEFAULT_ASSET_REUSE_MODEL
  assetReuseSegmentCount.value = 6
  assetReuseSegmentDuration.value = 5
  assetReuseHeadlineEnabled.value = false
  assetReuseHeadlineText.value = ''
}

function applyImportedRenderConfigToControls(config: ImportedRenderConfig) {
  const voiceLanguage = normalizeImportedVoiceLanguage(config.nativeVoiceLanguage || config.language)
  assetReuseAspectRatio.value = config.aspectRatio || assetReuseAspectRatio.value
  assetReuseVoiceLanguage.value = voiceLanguage || assetReuseVoiceLanguage.value
  assetReuseSubtitleMode.value = config.subtitleMode
    || (config.enableSubtitle === false ? 'off' : assetReuseSubtitleMode.value)
  assetReuseSubtitleLanguage.value = config.subtitleLanguage
    || voiceLanguage
    || assetReuseSubtitleLanguage.value
  assetReuseBurnInSubtitle.value = config.burnInSubtitle ?? config.enableSubtitle ?? assetReuseBurnInSubtitle.value
  assetReuseAudioPolicy.value = normalizeImportedAudioPolicy(config.audioPolicy) || assetReuseAudioPolicy.value
  assetReuseModel.value = config.model || assetReuseModel.value
  assetReuseSegmentCount.value = config.segmentCount
    || Math.max(1, Math.round((config.duration || 0) / (config.segmentDuration || assetReuseSegmentDuration.value)))
    || assetReuseSegmentCount.value
  assetReuseSegmentDuration.value = config.segmentDuration || assetReuseSegmentDuration.value
  assetReuseHeadlineEnabled.value = config.enableBigText
    ?? Boolean(config.headlineOverlay?.enabled || config.headlineOverlay?.text)
    ?? assetReuseHeadlineEnabled.value
  assetReuseHeadlineText.value = config.headlineOverlay?.text || assetReuseHeadlineText.value
}

function currentAssetReuseRenderConfig(): ImportedRenderConfig {
  return {
    ...importedRenderConfig.value,
    aspectRatio: assetReuseAspectRatio.value,
    subtitleMode: assetReuseSubtitleMode.value,
    subtitleLanguage: assetReuseSubtitleLanguage.value,
    nativeVoiceLanguage: assetReuseVoiceLanguage.value,
    burnInSubtitle: assetReuseSubtitleMode.value !== 'off' && assetReuseBurnInSubtitle.value,
    audioPolicy: assetReuseAudioPolicy.value,
    model: assetReuseModel.value,
    segmentCount: assetReuseSegmentCount.value,
    segmentDuration: assetReuseSegmentDuration.value,
    duration: assetReuseTotalDuration.value,
    headlineOverlay: buildAssetReuseHeadlineOverlay(),
    subtitleOverlay: buildAssetReuseSubtitleOverlay(),
    enableSubtitle: assetReuseSubtitleMode.value !== 'off',
    enableBigText: assetReuseHeadlineEnabled.value,
  }
}

function buildAssetReuseHeadlineOverlay(): CarSalesPlanDraft['headlineOverlay'] {
  if (!assetReuseHeadlineEnabled.value && !assetReuseHeadlineText.value.trim()) {
    return undefined
  }
  return {
    enabled: assetReuseHeadlineEnabled.value,
    text: assetReuseHeadlineText.value.trim() || undefined,
    fontFamily: 'Noto Sans SC',
    fontSize: 84,
    textColor: '#FFFFFF',
    outlineColor: '#111111',
    position: 'top',
  }
}

function buildAssetReuseSubtitleOverlay(): CarSalesPlanDraft['subtitleOverlay'] {
  if (assetReuseSubtitleMode.value === 'off') {
    return undefined
  }
  return {
    enabled: true,
    fontFamily: 'Noto Sans SC',
    fontSize: 42,
    textColor: '#FFFFFF',
    outlineColor: '#111111',
    position: 'bottom',
  }
}

function singletonRolesFor(role: QuickRenderAssetRole) {
  return SINGLETON_ROLE_GROUPS.find((group) => group.includes(role)) || []
}

function roleLabel(role: QuickRenderAssetRole) {
  return ROLE_LABEL_OPTIONS.find((item) => item.value === role)?.label || role
}

function supportedRole(value: string | null | undefined): QuickRenderAssetRole | '' {
  const normalized = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  const role = ASSET_ROLE_ALIASES[normalized] || normalized
  return SUPPORTED_ASSET_ROLES.has(role as QuickRenderAssetRole)
    ? role as QuickRenderAssetRole
    : ''
}

function roleFromAsset(asset: AssetItem, fallback: QuickRenderAssetRole) {
  const metadata = parseMetadata(asset.metadataJson)
  return supportedRole(metadataText(metadata, 'assetRole')) ||
    supportedRole(metadataText(metadata, 'role')) ||
    supportedRole(asset.kind) ||
    inferFallbackRole(asset, fallback)
}

async function cacheAssetText(asset: AssetItem) {
  if (assetRawTextById.value[asset.assetId]) {
    return assetRawTextById.value[asset.assetId]
  }
  const text = await getAssetTextContent(asset)
  assetRawTextById.value = {
    ...assetRawTextById.value,
    [asset.assetId]: text,
  }
  assetPreviewTextById.value = {
    ...assetPreviewTextById.value,
    [asset.assetId]: normalizeAssetPreviewText(text),
  }
  return text
}

async function handleCarBundleAssetSelect(payload: AssetPickerPayload) {
  carBundleLoadError.value = ''
  addSelectedAsset(payload.asset, 'car_model_bundle', ['car_model_bundle'])
  try {
    const text = await cacheAssetText(payload.asset)
    const count = carModelBundleDeclaredImageCount(payload.asset, text)
    carBundleImageCountById.value = {
      ...carBundleImageCountById.value,
      [payload.asset.assetId]: count,
    }
    ElMessage.success('已载入车型素材包')
  } catch (unknownError) {
    carBundleLoadError.value = unknownError instanceof Error ? unknownError.message : '车型素材包读取失败'
  }
}

async function handleAssetIntegrationPackageSelect(payload: AssetPickerPayload) {
  selectedIntegrationPackage.value = payload.asset
  try {
    const text = await cacheAssetText(payload.asset)
    const payloadRecord = parseJsonRecord(text) || {}
    const metadata = parseMetadata(payload.asset.metadataJson) || {}
    const input = assetIntegrationPackageInput(payloadRecord, metadata)
    if (!input) {
      ElMessage.warning('该资产整合包缺少可导入参数')
      return
    }
    const imported = await applyImportedAssetReuseInput(input, '已导入资产整合包参数')
    if (!imported) {
      ElMessage.warning('整合包未包含可用资产、文案或分镜')
    }
  } catch (unknownError) {
    const message = unknownError instanceof Error ? unknownError.message : '资产整合包导入失败'
    ElMessage.error(message)
  }
}

async function handleStoryboardAssetSelect(payload: AssetPickerPayload) {
  addSelectedAsset(payload.asset, 'storyboard_json', ['storyboard_json'])
  try {
    await cacheAssetText(payload.asset)
    ElMessage.success('已载入分镜')
  } catch {
    ElMessage.warning('分镜预览读取失败，提交时会再次尝试读取')
  }
}

async function handleBenchmarkAssetSelect(payload: AssetPickerPayload) {
  const role = roleFromAsset(payload.asset, 'benchmark_json')
  addSelectedAsset(payload.asset, role === 'voice_script' ? 'voice_script' : 'benchmark_json', ['benchmark_json', 'voice_script'])
  try {
    await cacheAssetText(payload.asset)
    ElMessage.success('已载入口播文案')
  } catch {
    ElMessage.warning('文案预览读取失败，提交时会再次尝试读取')
  }
}

function handleSceneImageAssetSelect(payload: AssetPickerPayload) {
  const role = roleFromAsset(payload.asset, 'scene_showroom')
  addSelectedAsset(
    payload.asset,
    CAR_SCENE_REFERENCE_ROLES.includes(role) ? role : 'scene_showroom',
    [],
  )
}

function handleVehicleImageAssetSelect(payload: AssetPickerPayload) {
  const role = roleFromAsset(payload.asset, 'car_exterior_front')
  if (CAR_SCENE_REFERENCE_ROLES.includes(role)) {
    handleSceneImageAssetSelect(payload)
    return
  }
  addSelectedAsset(
    payload.asset,
    CAR_VEHICLE_REFERENCE_ROLES.includes(role) ? role : 'car_exterior_front',
    [],
  )
}

function handleHostImageAssetSelect(payload: AssetPickerPayload) {
  hostAppearanceEnabled.value = true
  addSelectedAsset(payload.asset, 'host_image', ['host_image', 'host_video'])
}

function handleVoiceAssetSelect(payload: AssetPickerPayload) {
  const role = roleFromAsset(payload.asset, 'voiceover')
  addSelectedAsset(
    payload.asset,
    role === 'reference_audio' ? 'reference_audio' : 'voiceover',
    ['voiceover', 'reference_audio'],
  )
}

function handleBgmAssetSelect(payload: AssetPickerPayload) {
  addSelectedAsset(payload.asset, 'bgm', ['bgm'])
}

function disableHostAppearance() {
  hostAppearanceEnabled.value = false
  selectedHost.value && removeSelected(selectedHost.value.asset.assetId)
}

function isTextPreviewAsset(asset: AssetItem) {
  return asset.assetType === 'TEXT' || asset.assetType === 'JSON'
}

async function ensureAssetPreviewText(asset: AssetItem) {
  if (!isTextPreviewAsset(asset) || assetPreviewTextById.value[asset.assetId] || assetPreviewLoadingById.value[asset.assetId]) {
    return
  }
  assetPreviewLoadingById.value = {
    ...assetPreviewLoadingById.value,
    [asset.assetId]: true,
  }
  try {
    const text = await getAssetTextContent(asset)
    assetPreviewTextById.value = {
      ...assetPreviewTextById.value,
      [asset.assetId]: normalizeAssetPreviewText(text),
    }
  } catch {
    assetPreviewTextById.value = {
      ...assetPreviewTextById.value,
      [asset.assetId]: metadataPreviewText(asset) || '预览内容暂时无法加载',
    }
  } finally {
    const next = { ...assetPreviewLoadingById.value }
    delete next[asset.assetId]
    assetPreviewLoadingById.value = next
  }
}

async function openAssetTextPreview(asset: AssetItem, title: string) {
  assetPreviewDialog.open = true
  assetPreviewDialog.loading = true
  assetPreviewDialog.title = `${title}：${asset.fileName}`
  assetPreviewDialog.text = ''
  assetPreviewDialog.error = ''
  try {
    await ensureAssetPreviewText(asset)
    const text = assetPreviewTextById.value[asset.assetId] || metadataPreviewText(asset)
    assetPreviewDialog.text = text || '暂无可预览文本'
  } catch (unknownError) {
    assetPreviewDialog.error = unknownError instanceof Error ? unknownError.message : '预览加载失败'
  } finally {
    assetPreviewDialog.loading = false
  }
}

function metadataPreviewText(asset: AssetItem) {
  const metadata = parseMetadata(asset.metadataJson)
  return normalizeAssetPreviewText(
    metadataText(metadata, 'voiceText') ||
    metadataText(metadata, 'finalVoiceText') ||
    metadataText(metadata, 'script') ||
    metadataText(metadata, 'content') ||
    metadataText(metadata, 'description') ||
    metadataText(metadata, 'title'),
  )
}

function normalizeAssetPreviewText(value: string | null | undefined) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  try {
    const parsed = JSON.parse(raw) as unknown
    const readable = readableTextFromJson(parsed)
    if (readable) return normalizePlainPreviewText(readable)
  } catch {
    // Plain text assets are expected here.
  }
  return normalizePlainPreviewText(raw)
}

function readableTextFromJson(value: unknown, depth = 0): string {
  if (!value || depth > 5) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    return value
      .map((item) => readableTextFromJson(item, depth + 1))
      .filter(Boolean)
      .slice(0, 4)
      .join('\n')
  }
  if (typeof value !== 'object') return ''
  const record = value as Record<string, unknown>
  const preferredKeys = [
    'finalVoiceText',
    'voiceText',
    'narration',
    'script',
    'content',
    'text',
    'copywriting',
    'title',
    'visual',
    'visualPrompt',
    'prompt',
  ]
  const direct = preferredKeys
    .map((key) => record[key])
    .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
  if (direct.length) {
    return direct.slice(0, 4).join('\n')
  }
  const nestedKeys = ['storyboard', 'shots', 'scenes', 'segments', 'scripts', 'items', 'data']
  return nestedKeys
    .map((key) => readableTextFromJson(record[key], depth + 1))
    .filter(Boolean)
    .slice(0, 4)
    .join('\n')
}

function normalizePlainPreviewText(value: string) {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function applyAiCopyPrompt() {
  if (!draftPrompt.value.trim()) {
    draftPrompt.value = '请基于当前车型、门店活动和目标客户生成一条汽车销售口播文案'
  }
  ElMessage.success('已填入文案生成提示，可继续补充需求')
}

function saveAssetReuseDraft() {
  if (typeof window === 'undefined' || selectedAssets.value.length === 0) {
    return
  }
  const generationAssets = selectedAssets.value.filter(isAssetReuseGenerationSelection)
  const draft: StoredAssetReuseDraft = {
    savedAt: new Date().toISOString(),
    draftPrompt: draftPrompt.value,
    selectedCoverAssetId: selectedCoverAssetId.value,
    selectedAssets: generationAssets,
    renderConfig: currentAssetReuseRenderConfig(),
  }
  window.localStorage.setItem(ASSET_REUSE_DRAFT_STORAGE_KEY, JSON.stringify(draft))
  ElMessage.success('草稿已保存到本地')
}

function restoreAssetReuseDraft() {
  if (typeof window === 'undefined' || selectedAssets.value.length > 0) {
    return
  }
  const raw = window.localStorage.getItem(ASSET_REUSE_DRAFT_STORAGE_KEY)
  if (!raw) {
    return
  }
  try {
    const draft = JSON.parse(raw) as Partial<StoredAssetReuseDraft>
    const restoredAssets = Array.isArray(draft.selectedAssets)
      ? draft.selectedAssets
        .filter((item): item is SelectedAsset => Boolean(item?.asset?.assetId && item.role))
        .filter(isAssetReuseGenerationSelection)
      : []
    if (!restoredAssets.length) {
      return
    }
    selectedAssets.value = restoredAssets
    hostAppearanceEnabled.value = restoredAssets.some((item) => item.role === 'host_image' || item.role === 'host_video')
    selectedCoverAssetId.value = draft.selectedCoverAssetId ?? firstCoverCandidateId()
    if (draft.renderConfig) {
      importedRenderConfig.value = draft.renderConfig
      applyImportedRenderConfigToControls(draft.renderConfig)
    }
    if (typeof draft.draftPrompt === 'string' && !draftPrompt.value.trim()) {
      draftPrompt.value = draft.draftPrompt
    }
  } catch {
    window.localStorage.removeItem(ASSET_REUSE_DRAFT_STORAGE_KEY)
  }
}

async function restoreAssetReuseImportFromTask() {
  const taskId = importTaskIdFromRoute()
  if (!taskId) {
    return false
  }
  const record = consumePendingRenderTaskImport(taskId) || readRenderTaskSnapshot(taskId)
  const input = asRecord(record?.input)
  if (!input) {
    return false
  }

  const imported = await applyImportedAssetReuseInput(input, '已导入任务参数到资产复用创作')
  clearImportTaskQuery()
  return imported
}

async function applyImportedAssetReuseInput(input: Record<string, unknown>, successMessage: string) {
  const assetIds = collectImportedAssetIds(input)
  const textContents = asRecord(input.assetTextContents) || {}
  const importedSelections: SelectedAsset[] = []
  const importedRawText: Record<number, string> = {}
  const failedAssetIds: number[] = []

  for (const assetId of assetIds) {
    try {
      const asset = await getAssetDetail(assetId)
      const role = importedAssetRoleForId(input, assetId)
        || inferFallbackRole(asset, 'material')
      const selection = { asset, role }
      if (isAssetReuseGenerationSelection(selection)) {
        importedSelections.push(selection)
      }
      const textContent = stringValue(textContents[String(assetId)])
      if (textContent) {
        importedRawText[assetId] = textContent
      }
    } catch {
      failedAssetIds.push(assetId)
    }
  }

  importedRenderConfig.value = buildImportedRenderConfig(input)
  applyImportedRenderConfigToControls(importedRenderConfig.value)
  importedScriptText.value = firstRecordText(input, ['finalVoiceText', 'voiceText', 'scriptText', 'script', 'copywriting'])
  importedStoryboard.value = normalizeImportedStoryboard(firstRecordArray(input, ['generatedStoryboard', 'storyboard', 'shots', 'scenes', 'segments']))
  draftPrompt.value = importedPromptFromRequest(input)
  hostAppearanceEnabled.value = importedRenderConfig.value.hostAppearanceEnabled
    ?? importedSelections.some((item) => item.role === 'host_image' || item.role === 'host_video')

  if (importedSelections.length) {
    selectedAssets.value = importedSelections
    assetRawTextById.value = { ...assetRawTextById.value, ...importedRawText }
    assetPreviewTextById.value = { ...assetPreviewTextById.value, ...importedRawText }
    const coverAssetId = normalizeImportedNumber(input.coverAssetId, 1, Number.MAX_SAFE_INTEGER)
    selectedCoverAssetId.value = importedSelections.some((item) => item.asset.assetId === coverAssetId)
      ? coverAssetId
      : firstCoverCandidateId()
    ElMessage.success(successMessage)
  }
  if (failedAssetIds.length) {
    ElMessage.warning(`部分原任务资产无法读取：${failedAssetIds.join('、')}`)
  }
  const importedAny = importedSelections.length > 0 || Boolean(importedScriptText.value || importedStoryboard.value.length)
  if (importedAny && importedSelections.length === 0) {
    ElMessage.success(successMessage)
  }
  return importedAny
}

function importTaskIdFromRoute() {
  const raw = Array.isArray(route.query.importTask) ? route.query.importTask[0] : route.query.importTask
  return normalizeImportedNumber(raw, 1, Number.MAX_SAFE_INTEGER)
}

function clearImportTaskQuery() {
  if (route.query.importTask == null) return
  const query = { ...route.query }
  delete query.importTask
  void router.replace({ name: 'asset-reuse', query })
}

function collectImportedAssetIds(input: Record<string, unknown>) {
  const ids = new Set<number>()
  const idKeys = ['assetIds', 'reuseAssetIds', 'selectedAssetIds', 'componentAssetIds', 'sourceAssetIds']
  idKeys.forEach((key) => {
    const rawAssetIds = Array.isArray(input[key]) ? input[key] as unknown[] : []
    rawAssetIds.forEach((item) => {
      const id = normalizeImportedNumber(item, 1, Number.MAX_SAFE_INTEGER)
      if (id) ids.add(id)
    })
  })
  const bindings = Array.isArray(input.assetRoleBindings) ? input.assetRoleBindings : []
  bindings.forEach((item) => {
    const id = normalizeImportedNumber(asRecord(item)?.assetId, 1, Number.MAX_SAFE_INTEGER)
    if (id) ids.add(id)
  })
  const assetRefs = [
    ...(Array.isArray(input.assets) ? input.assets : []),
    ...(Array.isArray(input.assetReferences) ? input.assetReferences : []),
    ...(Array.isArray(input.selectedAssets) ? input.selectedAssets : []),
  ]
  assetRefs.forEach((item) => {
    const row = asRecord(item)
    const nestedAsset = asRecord(row?.asset)
    const id = normalizeImportedNumber(row?.assetId ?? row?.id ?? nestedAsset?.assetId, 1, Number.MAX_SAFE_INTEGER)
    if (id) ids.add(id)
  })
  return Array.from(ids)
}

function assetIntegrationPackageInput(
  payload: Record<string, unknown>,
  metadata: Record<string, unknown>,
): Record<string, unknown> | null {
  const records = [
    metadata,
    payload,
    asRecord(payload.assetReusePackage),
    asRecord(payload.reusePackage),
    asRecord(payload.packageConfig),
    asRecord(payload.preset),
    asRecord(payload.input),
    asRecord(payload.request),
    asRecord(payload.renderConfig),
    asRecord(payload.generationConfig),
    asRecord(payload.advancedParams),
  ].filter((item): item is Record<string, unknown> => Boolean(item))
  if (!records.length) {
    return null
  }
  const merged: Record<string, unknown> = Object.assign({}, ...records)
  const assetIds = firstRecordArrayFromRecords(records, ['assetIds', 'reuseAssetIds', 'selectedAssetIds', 'sourceAssetIds'])
  if (assetIds.length) {
    merged.assetIds = assetIds
  }
  const roleBindings = firstRecordArrayFromRecords(records, ['assetRoleBindings', 'assetBindings'])
  if (roleBindings.length) {
    merged.assetRoleBindings = roleBindings
  }
  const selectedAssets = firstRecordArrayFromRecords(records, ['selectedAssets', 'assets', 'assetReferences'])
  if (selectedAssets.length) {
    merged.selectedAssets = selectedAssets
  }
  const roleMap = firstRecordObjectFromRecords(records, ['assetRoles', 'roles'])
  if (roleMap) {
    merged.assetRoles = roleMap
  }
  const textContents = firstRecordObjectFromRecords(records, ['assetTextContents', 'textContents'])
  if (textContents) {
    merged.assetTextContents = textContents
  }
  const script = firstRecordTextFromRecords(records, ['finalVoiceText', 'voiceText', 'scriptText', 'script', 'copywriting'])
  if (script) {
    merged.finalVoiceText = script
  }
  const storyboard = firstRecordArrayFromRecords(records, ['generatedStoryboard', 'storyboard', 'shots', 'scenes', 'segments'])
  if (storyboard.length) {
    merged.generatedStoryboard = storyboard
  }
  const prompt = firstRecordTextFromRecords(records, ['goalText', 'draftPrompt', 'prompt', 'description'])
  if (prompt) {
    merged.goalText = prompt
  }
  if (!merged.duration && metadata.durationSeconds) {
    merged.duration = metadata.durationSeconds
  }
  if (!merged.segmentCount && metadata.shotCount) {
    merged.segmentCount = metadata.shotCount
  }
  if (!merged.vehicleId && metadata.carModelId) {
    merged.vehicleId = metadata.carModelId
  }
  if (!merged.vehicleName) {
    merged.vehicleName = firstRecordTextFromRecords(records, ['carModelName', 'sourceCarModelName', 'vehicleName', 'brandModel'])
  }
  const useful = collectImportedAssetIds(merged).length > 0 ||
    Boolean(firstRecordText(merged, ['finalVoiceText', 'goalText'])) ||
    firstRecordArray(merged, ['generatedStoryboard']).length > 0
  return useful ? merged : null
}

function parseJsonRecord(value: string | null | undefined): Record<string, unknown> | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as unknown
    return asRecord(parsed)
  } catch {
    return null
  }
}

function firstRecordText(record: Record<string, unknown>, keys: string[]) {
  return firstRecordTextFromRecords([record], keys)
}

function firstRecordArray(record: Record<string, unknown>, keys: string[]) {
  return firstRecordArrayFromRecords([record], keys)
}

function firstRecordTextFromRecords(records: Record<string, unknown>[], keys: string[]) {
  for (const record of records) {
    for (const key of keys) {
      const value = textValue(record[key])
      if (value) {
        return value
      }
    }
  }
  return ''
}

function firstRecordArrayFromRecords(records: Record<string, unknown>[], keys: string[]) {
  for (const record of records) {
    for (const key of keys) {
      const value = record[key]
      if (Array.isArray(value) && value.length) {
        return value
      }
    }
  }
  return []
}

function firstRecordObjectFromRecords(records: Record<string, unknown>[], keys: string[]) {
  for (const record of records) {
    for (const key of keys) {
      const value = asRecord(record[key])
      if (value) {
        return value
      }
    }
  }
  return null
}

function importedAssetRoleForId(input: Record<string, unknown>, assetId: number): QuickRenderAssetRole | '' {
  const roleMap = asRecord(input.assetRoles) || {}
  const directRole = normalizeImportedAssetRole(roleMap[String(assetId)])
  if (directRole) {
    return directRole
  }
  const bindings = Array.isArray(input.assetRoleBindings) ? input.assetRoleBindings : []
  for (const item of bindings) {
    const row = asRecord(item)
    if (normalizeImportedNumber(row?.assetId, 1, Number.MAX_SAFE_INTEGER) !== assetId) {
      continue
    }
    const role = normalizeImportedAssetRole(row?.role ?? row?.assetRole)
    if (role) {
      return role
    }
  }
  const assetRefs = [
    ...(Array.isArray(input.assets) ? input.assets : []),
    ...(Array.isArray(input.assetReferences) ? input.assetReferences : []),
    ...(Array.isArray(input.selectedAssets) ? input.selectedAssets : []),
  ]
  for (const item of assetRefs) {
    const row = asRecord(item)
    const nestedAsset = asRecord(row?.asset)
    const id = normalizeImportedNumber(row?.assetId ?? row?.id ?? nestedAsset?.assetId, 1, Number.MAX_SAFE_INTEGER)
    if (id !== assetId) {
      continue
    }
    const role = normalizeImportedAssetRole(row?.role ?? row?.assetRole)
    if (role) {
      return role
    }
  }
  return ''
}

function buildImportedRenderConfig(input: Record<string, unknown>): ImportedRenderConfig {
  return {
    aspectRatio: normalizeImportedAspectRatio(input.aspectRatio),
    subtitleMode: normalizeImportedSubtitleMode(input.subtitleMode),
    subtitleLanguage: stringValue(input.subtitleLanguage) || undefined,
    nativeVoiceLanguage: normalizeImportedVoiceLanguage(input.nativeVoiceLanguage) || undefined,
    nativeVoiceStyle: normalizeCarNativeVoiceStyle(stringValue(input.nativeVoiceStyle)),
    nativeSpeechStyle: normalizeCarNativeSpeechStyle(stringValue(input.nativeSpeechStyle)),
    autoTtsVoiceId: normalizeImportedNumber(input.autoTtsVoiceId, 1, 999999999) || undefined,
    burnInSubtitle: typeof input.burnInSubtitle === 'boolean' ? input.burnInSubtitle : undefined,
    audioPolicy: normalizeImportedAudioPolicy(input.audioPolicy),
    model: normalizeImportedModel(input.model),
    segmentCount: normalizeImportedNumber(input.segmentCount, 1, 12) || undefined,
    segmentDuration: normalizeImportedNumber(input.segmentDuration, 1, 30) || undefined,
    hostAppearanceEnabled: typeof input.hostAppearanceEnabled === 'boolean' ? input.hostAppearanceEnabled : undefined,
    headlineOverlay: asRecord(input.headlineOverlay) as ImportedRenderConfig['headlineOverlay'],
    subtitleOverlay: asRecord(input.subtitleOverlay) as ImportedRenderConfig['subtitleOverlay'],
    creationMode: stringValue(input.creationMode) || undefined,
    chainType: stringValue(input.chainType) || undefined,
    videoType: stringValue(input.videoType) || undefined,
    hasDigitalHuman: typeof input.hasDigitalHuman === 'boolean' ? input.hasDigitalHuman : undefined,
    digitalHumanId: stringValue(input.digitalHumanId) || undefined,
    avatarUrl: stringValue(input.avatarUrl) || undefined,
    hostImageUrl: stringValue(input.hostImageUrl) || undefined,
    voiceId: stringValue(input.voiceId) || undefined,
    tone: stringValue(input.tone) || undefined,
    language: stringValue(input.language) || undefined,
    duration: normalizeImportedNumber(input.duration, 1, 300) || undefined,
    enableSubtitle: typeof input.enableSubtitle === 'boolean' ? input.enableSubtitle : undefined,
    subtitleStyle: stringValue(input.subtitleStyle) || undefined,
    enableBigText: typeof input.enableBigText === 'boolean' ? input.enableBigText : undefined,
    bigTextStyle: stringValue(input.bigTextStyle) || undefined,
    enableBgm: typeof input.enableBgm === 'boolean' ? input.enableBgm : undefined,
    bgmStyle: stringValue(input.bgmStyle) || undefined,
    generateCover: typeof input.generateCover === 'boolean' ? input.generateCover : undefined,
    generateTitle: typeof input.generateTitle === 'boolean' ? input.generateTitle : undefined,
    generateDescription: typeof input.generateDescription === 'boolean' ? input.generateDescription : undefined,
    generateTags: typeof input.generateTags === 'boolean' ? input.generateTags : undefined,
    benchmarkVideoId: stringValue(input.benchmarkVideoId) || undefined,
    uploadedVideoId: stringValue(input.uploadedVideoId) || undefined,
    reuseAssetIds: Array.isArray(input.reuseAssetIds)
      ? input.reuseAssetIds
        .map((item) => normalizeImportedNumber(item, 1, Number.MAX_SAFE_INTEGER))
        .filter((item) => item > 0)
      : undefined,
    vehicleId: stringValue(input.vehicleId) || undefined,
    vehicleName: stringValue(input.vehicleName) || undefined,
  }
}

function importedPromptFromRequest(input: Record<string, unknown>) {
  const goal = stringValue(input.goalText)
  if (goal && !goal.toLowerCase().includes('confirmed storyboard')) {
    return goal.slice(0, 500)
  }
  const script = stringValue(input.finalVoiceText)
  if (script) {
    return `继续复用原任务口播、分镜和生成参数重新创作：${script.slice(0, 220)}`
  }
  return '继续复用原任务资产和生成参数重新创作汽车销售视频'
}

function normalizeImportedStoryboard(value: unknown): AiPlanStoryboardShot[] {
  const rows = Array.isArray(value) ? value : []
  return rows
    .map((item, index) => {
      const row = asRecord(item)
      if (!row) return null
      const visual = stringValue(row.visual)
      const narration = stringValue(row.narration)
      if (!visual && !narration) return null
      return {
        index: normalizeImportedNumber(row.index, 1, 100) || index + 1,
        visual,
        narration,
        duration: normalizeImportedNumber(row.duration, 1, 60) || 5,
      }
    })
    .filter((item): item is AiPlanStoryboardShot => Boolean(item))
}

function normalizeImportedAssetRole(value: unknown): QuickRenderAssetRole | '' {
  return supportedRole(textValue(value))
}

function normalizeImportedAspectRatio(value: unknown): CarSalesPlanDraft['aspectRatio'] | undefined {
  const text = stringValue(value)
  return text === '9:16' || text === '16:9' || text === 'auto' ? text : undefined
}

function normalizeImportedSubtitleMode(value: unknown): CarSalesPlanDraft['subtitleMode'] | undefined {
  const text = stringValue(value)
  return text === 'off' || text === 'auto' || text === 'upload' ? text : undefined
}

function normalizeImportedAudioPolicy(value: unknown): CarSalesPlanDraft['audioPolicy'] | undefined {
  const text = stringValue(value)
  return text === 'auto'
    || text === 'none'
    || text === 'voiceover'
    || text === 'bgm'
    || text === 'EXTERNAL_AUDIO'
    || text === 'VIDEO_NATIVE_AUDIO'
    || text === 'external_audio'
    || text === 'video_native_audio'
    ? text
    : undefined
}

function normalizeImportedModel(value: unknown) {
  const text = stringValue(value)
  return !text || text === 'auto' ? DEFAULT_CAR_SALES_MODEL : text
}

function normalizeImportedVoiceLanguage(value: unknown): 'zh-CN' | 'en-US' | '' {
  const text = stringValue(value).toLowerCase()
  if (text.startsWith('en')) return 'en-US'
  if (text.startsWith('zh') || text.includes('cn')) return 'zh-CN'
  return ''
}

function normalizeImportedNumber(value: unknown, min: number, max: number) {
  const parsed = typeof value === 'number' ? value : Number(String(value || '').trim())
  if (!Number.isFinite(parsed)) return 0
  const normalized = Math.trunc(parsed)
  return normalized >= min && normalized <= max ? normalized : 0
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function textValue(value: unknown) {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function selectedSummary(roles: QuickRenderAssetRole[], fallback: string) {
  const selected = selectedAssets.value.find((item) => roles.includes(item.role))
  return selected?.asset.fileName || fallback
}

function isAssetReuseGenerationSelection(item: SelectedAsset) {
  return ASSET_REUSE_GENERATION_ROLES.has(item.role)
}

async function prepareAssetReusePlanPreview() {
  if (!requireAuth('登录后可生成资产复用视频')) return
  if (!canPreparePlan.value) {
    planPreviewError.value = !hasReusableVehicle.value
      ? '请先选择车型素材包或车辆素材。'
      : !hasCoreContent.value
        ? '请先选择可复用文案/分镜，或填写本次生成目标。'
        : ''
    if (planPreviewError.value) {
      ElMessage.warning(planPreviewError.value)
    }
    return
  }
  planPreviewOpen.value = true
  planPreviewLoading.value = true
  planPreviewError.value = ''
  try {
    const draft = await buildAssetReusePlanDraft()
    assetReusePlanDraft.value = draft
    planPreview.value = await prepareCarSalesAiPlanPreview(draft)
    persistAssetReusePendingPlanTask()
  } catch (unknownError) {
    planPreviewError.value = unknownError instanceof Error ? unknownError.message : '方案生成失败'
  } finally {
    planPreviewLoading.value = false
  }
}

function persistAssetReusePendingPlanTask() {
  if (!assetReusePlanDraft.value || !planPreview.value) return
  const id = currentPendingPlanTaskId.value || newPendingCarSalesPlanTaskId('asset-reuse')
  currentPendingPlanTaskId.value = id
  const existing = getPendingCarSalesPlanTask(id)
  upsertPendingCarSalesPlanTask({
    id,
    source: 'asset-reuse',
    title: assetReusePlanDraft.value.title || '资产复用方案',
    routeName: 'asset-reuse',
    routeQuery: {},
    aspectRatio: assetReusePlanDraft.value.aspectRatio,
    plan: planPreview.value,
    draft: assetReusePlanDraft.value,
    request: buildQuickRenderRequestFromPlanDraft(assetReusePlanDraft.value, planPreview.value),
    activeTaskId: existing?.activeTaskId ?? null,
    activeTaskKind: existing?.activeTaskKind ?? null,
    activeTaskStatus: existing?.activeTaskStatus,
    activeTaskProgress: existing?.activeTaskProgress ?? null,
    activeTaskSubmittedAt: existing?.activeTaskSubmittedAt,
    activeTaskResultUrl: existing?.activeTaskResultUrl,
    activeTaskErrorMessage: existing?.activeTaskErrorMessage,
  })
}

function restoreAssetReusePendingPlanFromRoute() {
  const planDraftId = typeof route.query.planDraftId === 'string' ? route.query.planDraftId : ''
  if (!planDraftId) return
  const task = getPendingCarSalesPlanTask(planDraftId)
  if (!task || task.source !== 'asset-reuse' || !task.draft) return
  applyAssetReusePendingPlanTask(task, true)
}

function restoreLatestAssetReusePendingPlanTask() {
  if (typeof route.query.planDraftId === 'string' || planPreview.value || planPreviewLoading.value) return false
  const task = getLatestPendingCarSalesPlanTask('asset-reuse')
  if (!task || !task.draft) return false
  applyAssetReusePendingPlanTask(task, true)
  return true
}

function applyAssetReusePendingPlanTask(task: PendingCarSalesPlanTask, openPreview: boolean) {
  if (!task.draft) return
  currentPendingPlanTaskId.value = task.id
  assetReusePlanDraft.value = task.draft
  planPreview.value = task.plan
  planPreviewError.value = ''
  planPreviewLoading.value = false
  planPreviewOpen.value = openPreview
  activeRenderTaskId.value = task.activeTaskId ?? null
  activeRenderTaskStatus.value = task.activeTaskStatus || ''
  activeRenderTaskProgress.value = task.activeTaskProgress ?? null
}

function patchAssetReusePendingRenderTask(patch: Partial<PendingCarSalesPlanTask>) {
  if (!currentPendingPlanTaskId.value) return
  patchPendingCarSalesPlanTask(currentPendingPlanTaskId.value, patch)
}

function markAssetReusePendingRenderTask(
  taskId: number,
  kind: PendingCarSalesRenderTaskKind,
  status = 'QUEUED',
  progress: number | null = 0,
) {
  activeRenderTaskId.value = taskId
  activeRenderTaskStatus.value = status
  activeRenderTaskProgress.value = progress
  patchAssetReusePendingRenderTask({
    activeTaskId: taskId,
    activeTaskKind: kind,
    activeTaskStatus: status,
    activeTaskProgress: progress,
    activeTaskSubmittedAt: new Date().toISOString(),
    activeTaskErrorMessage: '',
  })
}

function isCancelableRenderStatus(status: string | null | undefined) {
  return ['QUEUED', 'RUNNING'].includes(String(status || '').trim().toUpperCase())
}

async function cancelAssetReuseRenderTask() {
  const taskId = activeRenderTaskId.value
  if (!taskId || cancelingRenderTask.value || !isCancelableRenderStatus(activeRenderTaskStatus.value || 'QUEUED')) return
  cancelingRenderTask.value = true
  planPreviewError.value = ''
  try {
    await cancelTask(taskId)
    activeRenderTaskStatus.value = 'CANCELED'
    activeRenderTaskProgress.value = 100
    patchAssetReusePendingRenderTask({
      activeTaskStatus: 'CANCELED',
      activeTaskProgress: 100,
      activeTaskErrorMessage: '',
    })
    ElMessage.success('已取消生成任务')
  } catch (error) {
    planPreviewError.value = error instanceof Error ? error.message : '取消生成失败'
  } finally {
    cancelingRenderTask.value = false
  }
}

function regenerateAssetReuseVideo() {
  startNewAssetReuseVideo()
}

function startNewAssetReuseVideo() {
  if (currentPendingPlanTaskId.value) {
    removePendingCarSalesPlanTask(currentPendingPlanTaskId.value)
  }
  selectedAssets.value = []
  selectedCoverAssetId.value = null
  draftPrompt.value = ''
  hostAppearanceEnabled.value = false
  resetAssetReuseGenerationControls()
  carBundleLoadError.value = ''
  planPreviewOpen.value = false
  planPreviewLoading.value = false
  planSubmitting.value = false
  cancelingRenderTask.value = false
  activeRenderTaskId.value = null
  activeRenderTaskStatus.value = ''
  activeRenderTaskProgress.value = null
  planPreviewError.value = ''
  planPreview.value = null
  assetReusePlanDraft.value = null
  importedRenderConfig.value = {}
  importedScriptText.value = ''
  importedStoryboard.value = []
  currentPendingPlanTaskId.value = ''
  clearImportTaskQuery()
}

async function buildAssetReusePlanDraft(): Promise<CarSalesPlanDraft> {
  const generationSelections = selectedAssets.value.filter(isAssetReuseGenerationSelection)
  const assets = await Promise.all(generationSelections.map(async (item) => {
    let textContent = ''
    if (item.asset.assetType === 'TEXT' || item.asset.assetType === 'JSON') {
      try {
        textContent = await getAssetTextContent(item.asset)
      } catch {
        textContent = ''
      }
    }
    return planAssetFromAssetItem(item.asset, item.role, textContent)
  }))
  const hasVehicle = assets.some((asset) => asset.role === 'car_model_bundle' || asset.role.startsWith('car_') || asset.role.startsWith('scene_'))
  const scriptAsset = assets.find((asset) => (asset.role === 'voice_script' || asset.role === 'benchmark_json') && asset.textContent)
  const storyboardAsset = assets.find((asset) => asset.role === 'storyboard_json' && asset.textContent)
  const importedScript = importedScriptText.value.trim()
  const importedStoryboardShots = importedStoryboard.value.filter((shot) => shot.visual || shot.narration)
  const selectedStoryboardShots = storyboardAsset
    ? parseStoryboardAssetTextToPlanShots(
      storyboardAsset.textContent,
      assetReuseSegmentDuration.value,
      24,
    )
    : []
  if (storyboardAsset && !selectedStoryboardShots.length) {
    throw new Error('已选择的分镜资产无法解析为结构化镜头，请重新选择分镜资产或重新生成分镜后再使用资产复用。')
  }
  const storyboardShots = selectedStoryboardShots.length ? selectedStoryboardShots : importedStoryboardShots
  const prompt = draftPrompt.value.trim() || [
    '复用已选资产生成一条汽车销售视频',
    scriptAsset ? `参考文案：${scriptAsset.textContent?.slice(0, 400)}` : '',
    storyboardShots.length ? `已锁定结构化分镜：${storyboardShots.length} 个镜头` : '',
    importedScript ? `参考口播：${importedScript.slice(0, 400)}` : '',
  ].filter(Boolean).join('\n')
  const voiceLanguage = assetReuseVoiceLanguage.value || inferAssetReuseVoiceLanguage(prompt || importedScript)
  const inferredAudioPolicy = generationSelections.some((item) => item.role === 'voiceover' || item.role === 'reference_audio')
    ? 'voiceover'
    : generationSelections.some((item) => item.role === 'bgm')
      ? 'bgm'
      : 'auto'
  const hostEnabled = hostAppearanceEnabled.value && generationSelections.some((item) => item.role === 'host_image' || item.role === 'host_video')
  const selectedAudioPolicy = normalizeImportedAudioPolicy(assetReuseAudioPolicy.value) || 'auto'
  const effectiveAudioPolicy = selectedAudioPolicy === 'auto' ? inferredAudioPolicy : selectedAudioPolicy
  const fallbackVideoType = effectiveAudioPolicy === 'bgm' ? 'silent_bgm' : 'standard'
  const importedVideoType = importedRenderConfig.value.videoType
  const videoType = hostEnabled
    ? 'digital_human'
    : importedVideoType && importedVideoType !== 'digital_human'
      ? importedVideoType
      : fallbackVideoType
  const renderConfig = currentAssetReuseRenderConfig()

  return {
    source: 'asset-reuse',
    title: '资产复用汽车销售方案',
    prompt,
    script: scriptAsset?.textContent?.trim() || importedScript,
    storyboard: storyboardShots.length ? storyboardShots : undefined,
    coverAssetId: selectedCoverAsset.value?.asset.assetId ?? null,
    coverUrl: selectedCoverAsset.value ? assetCoverPreviewUrl(selectedCoverAsset.value.asset) : previewVisualUrl.value,
    assets,
    aspectRatio: assetReuseAspectRatio.value,
    subtitleMode: assetReuseSubtitleMode.value,
    subtitleLanguage: assetReuseSubtitleLanguage.value || voiceLanguage,
    nativeVoiceLanguage: voiceLanguage,
    nativeVoiceStyle: normalizeCarNativeVoiceStyle(
      importedRenderConfig.value.nativeVoiceStyle || carSalesPreferences.nativeVoiceStyle,
    ),
    nativeSpeechStyle: normalizeCarNativeSpeechStyle(
      importedRenderConfig.value.nativeSpeechStyle || carSalesPreferences.nativeSpeechStyle,
    ),
    autoTtsVoiceId: importedRenderConfig.value.autoTtsVoiceId || carSalesPreferences.preferredVoiceId,
    burnInSubtitle: assetReuseSubtitleMode.value !== 'off' && assetReuseBurnInSubtitle.value,
    audioPolicy: effectiveAudioPolicy,
    model: assetReuseModel.value,
    segmentCount: assetReuseSegmentCount.value,
    segmentDuration: assetReuseSegmentDuration.value,
    hostAppearanceEnabled: hostEnabled,
    headlineOverlay: renderConfig.headlineOverlay,
    subtitleOverlay: renderConfig.subtitleOverlay,
    creationMode: importedRenderConfig.value.creationMode || '资产复用创作',
    chainType: importedRenderConfig.value.chainType || 'asset-reuse',
    videoType,
    hasDigitalHuman: hostEnabled,
    digitalHumanId: importedRenderConfig.value.digitalHumanId || selectedHost.value?.asset.assetId.toString(),
    avatarUrl: importedRenderConfig.value.avatarUrl || importedRenderConfig.value.hostImageUrl || selectedHostUrl.value || undefined,
    hostImageUrl: importedRenderConfig.value.hostImageUrl || importedRenderConfig.value.avatarUrl || selectedHostUrl.value || undefined,
    voiceId: importedRenderConfig.value.voiceId || selectedVoice.value?.asset.assetId.toString(),
    tone: importedRenderConfig.value.tone || 'professional',
    language: importedRenderConfig.value.language || voiceLanguage,
    duration: assetReuseTotalDuration.value,
    enableSubtitle: assetReuseSubtitleMode.value !== 'off',
    subtitleStyle: importedRenderConfig.value.subtitleStyle,
    enableBigText: assetReuseHeadlineEnabled.value,
    bigTextStyle: importedRenderConfig.value.bigTextStyle,
    enableBgm: importedRenderConfig.value.enableBgm ?? ((importedRenderConfig.value.bgmStyle || 'auto') !== 'none' && (effectiveAudioPolicy === 'bgm' || generationSelections.some((item) => item.role === 'bgm'))),
    bgmStyle: effectiveAudioPolicy === 'none' ? 'none' : importedRenderConfig.value.bgmStyle || 'auto',
    generateCover: importedRenderConfig.value.generateCover ?? true,
    generateTitle: importedRenderConfig.value.generateTitle ?? true,
    generateDescription: importedRenderConfig.value.generateDescription ?? true,
    generateTags: importedRenderConfig.value.generateTags ?? true,
    benchmarkVideoId: importedRenderConfig.value.benchmarkVideoId,
    uploadedVideoId: importedRenderConfig.value.uploadedVideoId,
    reuseAssetIds: importedRenderConfig.value.reuseAssetIds || assets.map((asset) => asset.assetId),
    vehicleId: importedRenderConfig.value.vehicleId || assets.find((asset) => asset.role === 'car_model_bundle' || asset.role.startsWith('car_'))?.assetId.toString(),
    vehicleName: importedRenderConfig.value.vehicleName || assets.find((asset) => asset.role === 'car_model_bundle' || asset.role.startsWith('car_'))?.fileName,
    configItems: [
      '资产中心复用',
      `${assets.length} 个素材`,
      `${assetReuseTotalDuration.value} 秒`,
      optionLabel(ASSET_REUSE_ASPECT_RATIO_OPTIONS, assetReuseAspectRatio.value),
      optionLabel(ASSET_REUSE_LANGUAGE_OPTIONS, assetReuseVoiceLanguage.value),
      scriptAsset ? '已选文案资产' : '',
      storyboardAsset ? '已选分镜资产' : '',
      importedScript && !scriptAsset ? '已导入任务口播' : '',
      importedStoryboardShots.length > 0 && !storyboardAsset ? '已导入任务分镜' : '',
      hostEnabled ? '数字人出镜' : '',
      assetReuseHeadlineEnabled.value ? '大字报' : '',
    ].filter(Boolean),
    warnings: hasVehicle ? [] : ['汽车销售生成至少需要 1 张车辆图片，请补充车辆素材后再确认生成。'],
  }
}

function inferAssetReuseVoiceLanguage(text: string): 'zh-CN' | 'en-US' {
  const normalized = text.toLowerCase()
  return normalized.includes('english') || text.includes('英文') || text.includes('英语')
    ? 'en-US'
    : 'zh-CN'
}

function updatePlanScript(value: string) {
  if (!planPreview.value) return
  planPreview.value = {
    ...planPreview.value,
    script: value,
  }
  persistAssetReusePendingPlanTask()
}

function updatePlanStoryboardShot(index: number, field: 'visual' | 'narration', value: string) {
  if (!planPreview.value) return
  planPreview.value = {
    ...planPreview.value,
    storyboard: planPreview.value.storyboard.map((shot) =>
      shot.index === index
        ? { ...shot, [field]: value.trim() }
        : shot,
    ),
  }
  persistAssetReusePendingPlanTask()
}

async function confirmAssetReusePlan() {
  if (!requireAuth('登录后可生成资产复用视频')) return
  if (!assetReusePlanDraft.value || !planPreview.value || planSubmitting.value) return
  if (!assetReusePlanDraft.value.assets.some((asset) => asset.role === 'car_model_bundle' || asset.role.startsWith('car_') || asset.role.startsWith('scene_'))) {
    planPreviewError.value = '汽车销售生成至少需要 1 张车辆图片。请返回选择车辆图片或车型素材包后再提交。'
    return
  }
  planSubmitting.value = true
  planPreviewError.value = ''
  try {
    const draftWithAsset = await ensureCarSalesPlanDraftAsset(assetReusePlanDraft.value, planPreview.value)
    assetReusePlanDraft.value = draftWithAsset
    const payload = buildQuickRenderRequestFromPlanDraft(draftWithAsset, planPreview.value)
    persistAssetReusePendingPlanTask()
    const submitted = await quickRenderVideo(payload, newVideoIdempotencyKey())
    const taskId = submitted.task?.taskId || submitted.digitalHumanTask?.taskId || null
    if (taskId) {
      if (submitted.task?.taskId) {
        markAssetReusePendingRenderTask(submitted.task.taskId, 'quick_render', String(submitted.task.status || 'QUEUED'), submitted.task.progress ?? 0)
      } else {
        markAssetReusePendingRenderTask(taskId, 'digital_human', submitted.digitalHumanTask?.status || 'QUEUED', 0)
      }
      rememberSessionTaskId(taskId)
      ElMessage.success('已提交资产复用生成任务')
      planPreviewOpen.value = false
      void router.push({ name: 'my-videos', query: { taskId: String(taskId) } })
      return
    }
    planPreviewError.value = submitted.summary || '任务提交成功，但没有返回可跟踪任务'
  } catch (unknownError) {
    planPreviewError.value = unknownError instanceof Error ? unknownError.message : '提交生成失败'
  } finally {
    planSubmitting.value = false
  }
}

function inferFallbackRole(asset: AssetItem, fallback: QuickRenderAssetRole): QuickRenderAssetRole {
  const text = assetSearchText(asset)
  if ((fallback === 'benchmark_json' || fallback === 'voice_script') && hasAny(text, ['benchmark', '爆款', 'douyin'])) return 'benchmark_json'
  if ((fallback === 'voiceover' || fallback === 'reference_audio') && hasAny(text, ['voice', '口播', 'tts'])) return 'voiceover'
  if ((fallback === 'host_image' || fallback === 'host_video') && asset.assetType === 'VIDEO') return 'host_video'
  return fallback
}

function isVisualAsset(asset: AssetItem) {
  return ['IMAGE', 'COVER'].includes(asset.assetType)
}

function assetCoverPreviewUrl(asset: AssetItem) {
  if (isCarModelBundleAsset(asset)) {
    const bundleCover = carModelBundleCoverUrl(asset, assetRawTextById.value[asset.assetId], normalizePublicMediaUrl)
    if (bundleCover) return bundleCover
  }
  const metadata = parseMetadata(asset.metadataJson)
  const url = asset.thumbnailUrl
    || metadataText(metadata, 'thumbnailUrl')
    || metadataText(metadata, 'coverUrl')
    || metadataText(metadata, 'firstFrameUrl')
    || (isVisualAsset(asset) ? asset.fileUrl : '')
  return url ? normalizePublicMediaUrl(url) : ''
}

function carBundleImageCount(asset: AssetItem) {
  const declaredCount = carModelBundleDeclaredImageCount(asset, assetRawTextById.value[asset.assetId])
  if (declaredCount) return declaredCount
  const metadata = parseMetadata(asset.metadataJson)
  const ids = metadata?.componentAssetIds
  if (Array.isArray(ids)) {
    return ids.length
  }
  return numberMetadata(metadata, 'imageCount') || numberMetadata(metadata, 'componentCount') || 0
}

function assetTypeLabel(type: AssetType) {
  const map: Record<AssetType, string> = {
    TEXT: '文本',
    IMAGE: '图片',
    AUDIO: '音频',
    VIDEO: '视频',
    COVER: '封面',
    JSON: 'JSON',
  }
  return map[type] || type
}

function assetSearchText(asset: AssetItem) {
  return [
    assetWorkflowDisplayTitle(asset),
    assetWorkflowDisplayMeta(asset),
    asset.fileName,
    asset.assetType,
    asset.kind,
    asset.sourceType,
    asset.assetGroup,
    asset.metadataJson,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function hasAny(text: string, tokens: string[]) {
  return tokens.some((token) => text.includes(token.toLowerCase()))
}

function parseMetadata(value: string | null | undefined): Record<string, unknown> | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null
  } catch {
    return null
  }
}

function metadataText(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key]
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  return ''
}

function numberMetadata(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key]
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim())
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

watch(
  () => route.query.planDraftId,
  () => restoreAssetReusePendingPlanFromRoute(),
  { immediate: true },
)

onMounted(async () => {
  const imported = await restoreAssetReuseImportFromTask()
  if (!imported && !restoreLatestAssetReusePendingPlanTask()) {
    restoreAssetReuseDraft()
  }
})
</script>

<style scoped>
.asset-reuse-page {
  display: block;
  width: min(1450px, calc(100% - 48px));
  margin: 22px auto 42px;
  color: #101828;
  letter-spacing: 0;
}

.asset-reuse-redesign {
  display: grid;
  gap: 16px;
}

.asset-reuse-head {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  min-height: 86px;
  text-align: center;
}

.asset-title-line {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  width: 100%;
}

.asset-back {
  display: grid;
  width: 24px;
  height: 32px;
  place-items: center;
  color: #a8b3c7;
  font-size: 30px;
  line-height: 1;
}

.asset-reuse-head h1 {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 0;
  color: #0f172a;
  font-size: 30px;
  font-weight: 900;
  line-height: 1.2;
}

.asset-head-tag {
  display: inline-flex;
  min-height: 24px;
  align-items: center;
  border-radius: 999px;
  background: #eef4ff;
  color: #1261ff;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 850;
}

.asset-title-line p {
  margin: 10px 0 0;
  color: #667085;
  font-size: 16px;
  font-weight: 650;
}

.asset-reuse-actions {
  position: absolute;
  top: 12px;
  right: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.asset-reuse-actions :deep(.el-button) {
  min-height: 34px;
  border-radius: 7px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 850;
}

.asset-steps {
  display: grid;
  width: min(740px, 100%);
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  align-items: center;
  margin: 8px auto 0;
  border: 1px solid #dfe7f3;
  border-radius: 10px;
  background: #ffffff;
  padding: 12px 18px;
}

.asset-step {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #8a95a8;
  font-weight: 850;
}

.asset-step:not(:last-child)::after {
  position: absolute;
  right: -50%;
  left: calc(50% + 48px);
  height: 1px;
  background: #c8d3e5;
  content: '';
}

.asset-step span {
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  border: 1px solid #bdc8dc;
  border-radius: 999px;
  background: #fff;
  color: #8a95a8;
  font-size: 13px;
  line-height: 1;
}

.asset-step.active {
  color: #1261ff;
}

.asset-step.active span {
  border-color: #1261ff;
  background: #1261ff;
  color: #fff;
}

.asset-page-note {
  margin: 0 0 4px;
  color: #667085;
  font-size: 14px;
  font-weight: 650;
  text-align: left;
}

.asset-reuse-alert {
  margin: 0;
}

.asset-reuse-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 20px;
  align-items: start;
}

.asset-stage-list {
  display: grid;
  gap: 16px;
}

.asset-stage-card,
.plan-preview-card,
.video-preview-card {
  min-width: 0;
  border: 1px solid #dfe7f3;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 16px 42px rgba(16, 24, 40, 0.04);
}

.asset-stage-card {
  padding: 18px;
}

.asset-package-card {
  display: grid;
  gap: 14px;
  border-color: #c7d7fe;
  background: linear-gradient(180deg, #f8fbff 0%, #fff 68%);
}

.stage-title {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 14px;
}

.stage-title > span,
.stage-title > div > span {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: 7px;
  background: #e8f1ff;
  color: #1261ff;
  font-size: 14px;
  font-weight: 900;
}

.stage-title h2 {
  margin: 0;
  color: #101828;
  font-size: 18px;
  font-weight: 900;
  line-height: 1.2;
}

.stage-title .link-action {
  margin-left: auto;
}

.workflow-overview-card {
  display: grid;
  gap: 14px;
}

.workflow-heading {
  align-items: flex-start;
  margin-bottom: 0;
}

.workflow-heading p {
  margin: 6px 0 0;
  color: #667085;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.6;
}

.reuse-workflow-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  background: #fbfcff;
  padding: 10px;
}

.reuse-workflow-strip span {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  border-radius: 7px;
  background: #f1f5fb;
  color: #475569;
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 900;
}

.reuse-workflow-strip span.active {
  background: #eef4ff;
  color: #1261ff;
}

.reuse-workflow-strip strong {
  display: grid;
  width: 24px;
  height: 24px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 999px;
  background: #6b73ff;
  color: #fff;
  font-size: 13px;
  line-height: 1;
}

.reuse-workflow-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.reuse-workflow-module {
  display: grid;
  min-width: 0;
  gap: 14px;
}

.reuse-generation-settings-card {
  display: grid;
  gap: 14px;
}

.reuse-setting-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.reuse-setting-grid--packaging {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.reuse-setting-field,
.reuse-setting-switch {
  display: grid;
  gap: 8px;
  min-width: 0;
  border: 1px solid #e3eaf5;
  border-radius: 8px;
  background: #fbfcff;
  padding: 10px 12px;
}

.reuse-setting-field--wide {
  grid-column: span 2;
}

.reuse-setting-field span,
.reuse-setting-switch span {
  color: #344054;
  font-size: 12px;
  font-weight: 850;
}

.reuse-setting-field :deep(.el-select),
.reuse-setting-field :deep(.el-input) {
  width: 100%;
}

.reuse-setting-switch {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}

.reuse-generation-more {
  background: #fff;
}

.workflow-module-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.workflow-module-head h2 {
  margin: 0;
  color: #101828;
  font-size: 18px;
  font-weight: 900;
  line-height: 1.25;
}

.workflow-module-head p {
  margin: 6px 0 0;
  color: #667085;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.55;
}

.workflow-badge {
  display: inline-flex;
  min-height: 24px;
  flex: 0 0 auto;
  align-items: center;
  border-radius: 999px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 900;
}

.workflow-badge.required {
  background: #dcfce7;
  color: #15803d;
}

.workflow-badge.core {
  background: #e0f2fe;
  color: #0369a1;
}

.workflow-status {
  display: grid;
  gap: 4px;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  background: #f0fdf4;
  color: #166534;
  padding: 10px 12px;
}

.workflow-status.error {
  border-color: #fecaca;
  background: #fff1f2;
  color: #b42318;
}

.workflow-status.package-status {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  border-color: #bfdbfe;
  background: #eff6ff;
  color: #1d4ed8;
}

.workflow-status.package-status span {
  grid-column: 1;
}

.workflow-status.package-status .workflow-mini-button {
  grid-row: 1 / span 2;
  grid-column: 2;
  align-self: center;
}

.workflow-status strong {
  font-size: 13px;
  font-weight: 900;
}

.workflow-status span {
  font-size: 12.5px;
  font-weight: 650;
  line-height: 1.5;
}

.reuse-optional-group {
  border: 1px solid #e3eaf5;
  border-radius: 8px;
  background: #fbfcff;
}

.reuse-optional-group + .reuse-optional-group {
  margin-top: 0;
}

.reuse-optional-group summary {
  display: grid;
  grid-template-columns: minmax(150px, auto) minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  min-height: 48px;
  padding: 0 14px;
  cursor: pointer;
  list-style: none;
}

.reuse-optional-group summary::-webkit-details-marker {
  display: none;
}

.reuse-optional-group summary::after {
  display: inline-flex;
  min-height: 24px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #eef4ff;
  color: #1261ff;
  padding: 0 10px;
  content: '展开';
  font-size: 12px;
  font-weight: 900;
}

.reuse-optional-group[open] > summary::after {
  content: '收起';
}

.reuse-optional-group summary span {
  color: #101828;
  font-size: 14px;
  font-weight: 900;
}

.reuse-optional-group summary em {
  display: inline-flex;
  margin-left: 6px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #64748b;
  padding: 2px 6px;
  font-size: 11px;
  font-style: normal;
  font-weight: 900;
}

.reuse-optional-group summary small {
  overflow: hidden;
  color: #667085;
  font-size: 12.5px;
  font-weight: 650;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reuse-optional-body {
  display: grid;
  gap: 12px;
  border-top: 1px solid #e7edf7;
  padding: 14px;
}

.reuse-nested-group {
  background: #fff;
}

.module-selected-list {
  display: grid;
  gap: 8px;
}

.module-selected-list article {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  border: 1px solid #e7edf7;
  border-radius: 8px;
  background: #fff;
  padding: 9px 10px;
}

.module-selected-list span {
  display: inline-flex;
  min-height: 24px;
  align-items: center;
  border-radius: 999px;
  background: #eef4ff;
  color: #1261ff;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 900;
}

.module-selected-list strong {
  overflow: hidden;
  color: #101828;
  font-size: 13px;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.module-selected-list button,
.workflow-mini-button {
  min-height: 30px;
  border: 1px solid #dbe5f5;
  border-radius: 6px;
  background: #fff;
  color: #1261ff;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 850;
  cursor: pointer;
}

.workflow-prompt-box {
  display: grid;
  gap: 10px;
  border: 1px solid #e3eaf5;
  border-radius: 8px;
  background: #fbfcff;
  padding: 12px;
}

.workflow-prompt-box > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.workflow-prompt-box strong {
  color: #101828;
  font-size: 14px;
  font-weight: 900;
}

.workflow-prompt-box :deep(.el-textarea__inner) {
  border-radius: 8px;
  font-weight: 650;
}

.workflow-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.workflow-toggle-row > span {
  color: #344054;
  font-size: 13px;
  font-weight: 900;
}

.workflow-toggle-row > div {
  display: flex;
  gap: 8px;
}

.workflow-toggle-row button {
  min-height: 34px;
  border: 1px solid #dbe5f5;
  border-radius: 7px;
  background: #fff;
  color: #334155;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 850;
  cursor: pointer;
}

.workflow-toggle-row button.active {
  border-color: #1261ff;
  background: #eef4ff;
  color: #1261ff;
}

.workflow-static-setting {
  display: grid;
  gap: 4px;
  border: 1px solid #e7edf7;
  border-radius: 8px;
  background: #fff;
  padding: 10px 12px;
}

.workflow-static-setting strong {
  color: #101828;
  font-size: 13px;
  font-weight: 900;
}

.workflow-static-setting span {
  color: #667085;
  font-size: 12.5px;
  font-weight: 650;
}

.link-action,
.preview-card-head button,
.preview-item button,
.selection-item button {
  border: 0;
  background: transparent;
  color: #1261ff;
  padding: 0;
  font-size: 13px;
  font-weight: 850;
  cursor: pointer;
}

.asset-source-tabs,
.asset-type-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}

.asset-source-tabs button,
.asset-type-tabs button {
  height: 34px;
  min-height: 34px;
  border: 1px solid #dbe5f5;
  border-radius: 6px;
  background: #fff;
  color: #334155;
  padding: 0 22px;
  font-weight: 850;
  cursor: pointer;
}

.asset-source-tabs button.active,
.asset-type-tabs button.active {
  border-color: #1261ff;
  color: #1261ff;
  box-shadow: inset 0 0 0 1px rgba(18, 97, 255, 0.12);
}

.asset-card-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
  min-height: 86px;
}

.reuse-choice-card,
.reuse-shot-card,
.material-card,
.upload-tile,
.reuse-empty-card {
  position: relative;
  display: grid;
  min-width: 0;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  background: #fff;
  color: #101828;
  text-align: left;
}

.reuse-choice-card,
.reuse-empty-card {
  min-height: 86px;
  align-content: center;
  gap: 8px;
  padding: 14px;
}

.reuse-choice-card {
  cursor: pointer;
}

.reuse-choice-card strong,
.reuse-shot-card strong,
.material-card strong {
  overflow: hidden;
  color: #101828;
  font-size: 14px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reuse-choice-card span,
.reuse-choice-card small,
.reuse-shot-card small,
.material-card small,
.reuse-empty-card {
  color: #667085;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.5;
}

.reuse-card-excerpt {
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  color: #475569;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  white-space: normal;
}

.reuse-shot-card .reuse-card-excerpt,
.reuse-shot-card .reuse-card-actions {
  grid-column: 2;
}

.reuse-card-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.reuse-card-actions button {
  min-height: 28px;
  border: 1px solid #dbe5f5;
  border-radius: 6px;
  background: #f8fbff;
  color: #1261ff;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 850;
  cursor: pointer;
}

.reuse-card-actions button:hover {
  border-color: #1261ff;
  background: #eef4ff;
}

.reuse-choice-card--skeleton {
  pointer-events: none;
}

.reuse-choice-card--skeleton strong,
.reuse-choice-card--skeleton span:not(.shot-thumb):not(.material-preview),
.reuse-choice-card--skeleton small {
  display: block;
  overflow: hidden;
  border-radius: 999px;
  background: linear-gradient(90deg, #edf3fb 0%, #f7faff 48%, #edf3fb 100%);
  color: transparent;
}

.reuse-choice-card--skeleton strong {
  width: 72%;
  height: 14px;
}

.reuse-choice-card--skeleton span:not(.shot-thumb):not(.material-preview) {
  width: 90%;
  height: 12px;
}

.reuse-choice-card--skeleton small {
  width: 56%;
  height: 10px;
}

.reuse-choice-card--skeleton .shot-thumb,
.reuse-choice-card--skeleton .material-preview {
  background: linear-gradient(135deg, #dbeafe 0%, #eef4ff 48%, #cbd5e1 100%);
}

.reuse-choice-card.selected,
.reuse-shot-card.selected,
.material-card.selected {
  border-color: #1261ff;
  box-shadow: inset 0 0 0 1px rgba(18, 97, 255, 0.22), 0 10px 24px rgba(18, 97, 255, 0.08);
}

.reuse-choice-card.selected::after,
.reuse-shot-card.selected::after,
.material-card.selected::after {
  position: absolute;
  top: 10px;
  right: 10px;
  color: #1261ff;
  content: '●';
  font-size: 13px;
}

.asset-card-row--story {
  grid-template-columns: 1fr;
}

.asset-stage-card--copy .asset-card-row,
.asset-card-row--story {
  grid-template-columns: 1fr;
  gap: 8px;
  min-height: 0;
}

.asset-stage-card--copy .reuse-choice-card,
.asset-card-row--story .reuse-shot-card {
  min-height: 58px;
  align-items: center;
  border-color: #e6ecf7;
  background: #fbfcff;
}

.asset-stage-card--copy .reuse-choice-card {
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 4px 12px;
  padding: 10px 12px;
}

.asset-stage-card--copy .reuse-card-excerpt,
.asset-card-row--story .reuse-card-excerpt {
  display: none;
}

.asset-stage-card--copy .reuse-card-actions {
  grid-row: 1 / span 2;
  grid-column: 2;
}

.asset-stage-card--copy .reuse-choice-card small {
  grid-column: 1 / -1;
}

.reuse-shot-card {
  grid-template-columns: 56px minmax(0, 1fr) auto;
  gap: 10px;
  min-height: 76px;
  align-items: center;
  padding: 10px;
  cursor: pointer;
}

.reuse-shot-card small {
  grid-column: 2;
}

.asset-card-row--story .reuse-card-actions {
  grid-row: 1 / span 2;
  grid-column: 3;
}

.shot-thumb {
  display: grid;
  width: 56px;
  height: 42px;
  grid-row: span 2;
  place-items: center;
  overflow: hidden;
  border-radius: 6px;
  background: #eef4ff;
  color: #1261ff;
}

.shot-thumb img,
.material-preview img,
.media-card img,
.video-preview-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.asset-option-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.asset-stage-card--compact {
  min-height: 118px;
}

.compact-choice-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.asset-stage-card--compact .reuse-choice-card {
  min-height: 54px;
  padding: 10px 12px;
}

.media-card-icon {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 999px;
  background: #eef4ff;
  color: #1261ff;
}

.reuse-choice-card.muted {
  color: #6b7280;
  cursor: default;
}

.media-card {
  grid-template-columns: 36px minmax(0, 1fr);
  align-items: center;
}

.media-card img {
  width: 36px;
  height: 36px;
  border-radius: 999px;
}

.audio-card {
  grid-template-columns: 34px minmax(0, 1fr);
  align-items: center;
}

.audio-icon,
.music-icon {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 8px;
  color: #fff;
  font-weight: 900;
}

.audio-icon :deep(svg),
.music-icon :deep(svg),
.preview-icon :deep(svg),
.upload-tile :deep(svg),
.preview-placeholder :deep(svg),
.media-card-icon :deep(svg) {
  width: 18px;
  height: 18px;
}

.audio-icon {
  background: #7c3aed;
}

.music-icon {
  background: #11b981;
}

.stage-title--tools {
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.stage-title--tools > div:first-child {
  display: flex;
  align-items: center;
  gap: 9px;
}

.asset-filter-tools {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.asset-filter-tools :deep(.el-input) {
  width: 230px;
}

.asset-filter-tools :deep(.el-select) {
  width: 116px;
}

.asset-material-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 14px;
  min-height: 120px;
}

.asset-material-grid--packages {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.upload-tile,
.material-card {
  min-height: 112px;
  align-content: center;
  justify-items: center;
  gap: 8px;
  padding: 10px;
  text-align: center;
  cursor: pointer;
}

.vehicle-bundle-card {
  position: relative;
  display: grid;
  grid-template-columns: 116px minmax(0, 1fr);
  min-width: 0;
  min-height: 128px;
  align-items: center;
  gap: 14px;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  background: #fff;
  color: #101828;
  padding: 12px;
  text-align: left;
  cursor: pointer;
}

.vehicle-bundle-card.selected {
  border-color: #1261ff;
  box-shadow: inset 0 0 0 1px rgba(18, 97, 255, 0.22), 0 10px 24px rgba(18, 97, 255, 0.08);
}

.vehicle-bundle-card.selected::after {
  position: absolute;
  top: 10px;
  right: 10px;
  color: #1261ff;
  content: '●';
  font-size: 13px;
}

.vehicle-bundle-preview {
  display: grid;
  width: 116px;
  aspect-ratio: 1.45;
  place-items: center;
  overflow: hidden;
  border-radius: 7px;
  background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 48%, #cbd5e1 100%);
  color: #1261ff;
}

.vehicle-bundle-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.vehicle-bundle-body {
  display: grid;
  min-width: 0;
  gap: 8px;
}

.vehicle-bundle-body strong {
  overflow: hidden;
  color: #101828;
  font-size: 15px;
  font-weight: 900;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vehicle-bundle-body small {
  overflow: hidden;
  color: #667085;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vehicle-bundle-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.vehicle-bundle-tags em {
  display: inline-flex;
  min-height: 24px;
  align-items: center;
  border-radius: 999px;
  background: #eef4ff;
  color: #1261ff;
  padding: 0 8px;
  font-size: 12px;
  font-style: normal;
  font-weight: 850;
}

.upload-tile {
  border-style: dashed;
}

.upload-tile span {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 999px;
  background: #eef4ff;
  color: #1261ff;
  line-height: 1;
}

.upload-tile strong {
  color: #667085;
  font-size: 14px;
  font-weight: 850;
}

.material-preview {
  display: grid;
  width: 100%;
  aspect-ratio: 1.45;
  place-items: center;
  overflow: hidden;
  border-radius: 6px;
  background: #eef4ff;
  color: #1261ff;
}

.material-card strong {
  display: block;
  width: 100%;
  min-width: 0;
}

.material-empty {
  grid-column: span 3;
}

.asset-preview-rail {
  position: sticky;
  top: 18px;
  display: grid;
  gap: 16px;
}

.plan-preview-card,
.video-preview-card {
  padding: 18px;
}

.preview-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 18px;
}

.preview-card-head h2,
.video-preview-card h2 {
  margin: 0;
  color: #101828;
  font-size: 18px;
  font-weight: 900;
}

.preview-card-head button {
  color: #667085;
}

.preview-list {
  display: grid;
  gap: 16px;
}

.preview-item {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}

.preview-icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 10px;
  background: #eef4ff;
  color: #1261ff;
  font-weight: 900;
}

.preview-icon.indigo {
  background: #edf0ff;
  color: #4f46e5;
}

.preview-icon.avatar {
  background: #fff2e6;
  color: #f97316;
}

.preview-icon.voice {
  background: #f3e8ff;
  color: #9333ea;
}

.preview-icon.music {
  background: #e8f9f0;
  color: #10b981;
}

.preview-icon.material {
  background: #e9faf7;
  color: #0f9f96;
}

.preview-item strong,
.selection-item strong {
  display: block;
  overflow: hidden;
  color: #101828;
  font-size: 14px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-item p {
  overflow: hidden;
  margin: 4px 0 0;
  color: #667085;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selection-list {
  display: grid;
  max-height: 260px;
  gap: 10px;
  overflow: auto;
  margin-top: 18px;
  border-top: 1px solid #edf1f7;
  padding-top: 14px;
}

.selection-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
  border: 1px solid #e7edf7;
  border-radius: 8px;
  background: #fbfdff;
  padding: 10px;
}

.selection-item span {
  color: #667085;
  font-size: 12px;
}

.selection-item button {
  justify-self: end;
  color: #ef4444;
}

.selection-cover-button {
  justify-self: start !important;
  min-height: 28px;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  background: #f8fbff;
  color: #1261ff !important;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 850;
}

.selection-cover-button.active {
  border-color: #1261ff;
  background: #e8f1ff;
}

.selection-cover-button:disabled {
  border-color: #e5e7eb;
  background: #f8fafc;
  color: #a8b3c7 !important;
  cursor: not-allowed;
}

.video-preview-frame {
  display: grid;
  aspect-ratio: 16 / 9;
  place-items: center;
  overflow: hidden;
  border-radius: 8px;
  background: linear-gradient(135deg, #dbeafe, #f8fafc 56%, #e2e8f0);
}

.preview-placeholder {
  display: grid;
  justify-items: center;
  gap: 10px;
  color: #475569;
}

.preview-placeholder span {
  display: grid;
  width: 58px;
  height: 58px;
  place-items: center;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.68);
  color: #fff;
  font-size: 22px;
}

.preview-placeholder strong {
  font-size: 14px;
}

.preview-meta {
  display: grid;
  gap: 8px;
  margin: 12px 0 14px;
  color: #667085;
  font-size: 13px;
  font-weight: 700;
}

.draft-prompt {
  margin-bottom: 14px;
}

.selection-submit,
.save-draft-button {
  width: 100%;
  min-height: 40px;
  font-weight: 900;
}

.save-draft-button {
  margin-top: 10px;
}

.video-preview-card > p {
  margin: 12px 0 0;
  color: #8a95a8;
  font-size: 12px;
  line-height: 1.6;
}

.asset-text-preview-state {
  display: grid;
  min-height: 120px;
  place-items: center;
  border: 1px dashed #d8e2f0;
  border-radius: 8px;
  background: #f8fbff;
  color: #667085;
  font-size: 14px;
  font-weight: 750;
}

.asset-text-preview-state--error {
  border-color: #fecdd3;
  background: #fff5f5;
  color: #be123c;
}

.asset-text-preview-body {
  max-height: min(60vh, 560px);
  overflow: auto;
  margin: 0;
  border: 1px solid #e6eefb;
  border-radius: 8px;
  background: #fbfdff;
  color: #1f2937;
  padding: 14px;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 1280px) {
  .asset-reuse-shell {
    grid-template-columns: 1fr;
  }

  .asset-preview-rail {
    position: static;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 980px) {
  .asset-reuse-page {
    width: calc(100% - 28px);
  }

  .asset-reuse-head,
  .stage-title--tools {
    align-items: stretch;
    flex-direction: column;
  }

  .asset-reuse-actions {
    position: static;
    justify-content: center;
    flex-wrap: wrap;
  }

  .asset-steps {
    margin-left: 0;
  }

  .reuse-workflow-grid,
  .reuse-setting-grid,
  .asset-card-row,
  .asset-card-row--story,
  .asset-option-grid,
  .asset-material-grid,
  .asset-material-grid--packages,
  .compact-choice-row,
  .asset-preview-rail {
    grid-template-columns: 1fr;
  }

  .reuse-workflow-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .reuse-setting-field--wide {
    grid-column: span 1;
  }

  .workflow-module-head,
  .workflow-prompt-box > div,
  .workflow-toggle-row {
    align-items: stretch;
    flex-direction: column;
  }

  .workflow-toggle-row > div {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .reuse-optional-group summary {
    grid-template-columns: minmax(0, 1fr) auto;
    min-height: 58px;
    padding: 9px 12px;
  }

  .reuse-optional-group summary small {
    grid-column: 1 / -1;
    overflow: visible;
    text-overflow: clip;
    white-space: normal;
  }

  .asset-filter-tools {
    justify-content: stretch;
  }

  .asset-filter-tools :deep(.el-input),
  .asset-filter-tools :deep(.el-select) {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .asset-reuse-page {
    width: calc(100% - 20px);
    margin-top: 14px;
  }

  .asset-stage-card,
  .plan-preview-card,
  .video-preview-card {
    padding: 14px;
  }

  .asset-reuse-head h1 {
    font-size: 28px;
  }

  .reuse-workflow-strip {
    gap: 8px;
    padding: 8px;
  }

  .reuse-workflow-strip span {
    align-items: flex-start;
    padding: 8px;
    font-size: 12px;
    line-height: 1.35;
  }

  .workflow-module-head h2 {
    font-size: 17px;
  }

  .module-selected-list article,
  .reuse-shot-card,
  .asset-stage-card--copy .reuse-choice-card,
  .vehicle-bundle-card {
    grid-template-columns: 1fr;
  }

  .module-selected-list button,
  .workflow-mini-button,
  .reuse-card-actions button {
    width: 100%;
  }

  .reuse-shot-card .reuse-card-excerpt,
  .reuse-shot-card .reuse-card-actions,
  .reuse-shot-card small,
  .asset-card-row--story .reuse-card-actions,
  .asset-stage-card--copy .reuse-card-actions,
  .asset-stage-card--copy .reuse-choice-card small {
    grid-row: auto;
    grid-column: auto;
  }

  .shot-thumb,
  .vehicle-bundle-preview {
    width: 100%;
  }

  .vehicle-bundle-body strong,
  .vehicle-bundle-body small {
    white-space: normal;
  }
}
</style>
