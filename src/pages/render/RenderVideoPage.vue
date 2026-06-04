<template>
  <div class="render-video-page app-page-stack">
    <header class="render-head">
      <div>
        <h1>视频制作</h1>
        <p>
          手动制作按基础信息和可选模块展开；素材、分镜、讲述、字幕包装和高级参数都可以按需配置。
        </p>
      </div>
      <div class="render-mode-switch" aria-label="视频制作模式">
        <button
          v-if="ENABLE_QUICK_RENDER_MODE"
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

    <QuickRenderPage v-if="ENABLE_QUICK_RENDER_MODE && productionMode === 'quick'" embedded />

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

          <div class="render-digital-workspace render-manual-workflow">
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
          <details class="render-optional-group render-aspect-panel">
            <summary>
              <span>生成设置 <em>默认</em></span>
              <small>默认按当前规格出片，需要切换横屏、竖屏或跟随素材时再展开。</small>
            </summary>
            <div class="render-optional-body">
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
          </details>

          <div class="render-car-workflow-strip" aria-label="视频制作主流程">
            <span><strong>1</strong>车辆素材</span>
            <span><strong>2</strong>文案/分镜</span>
            <span><strong>3</strong>音频/人物</span>
            <span><strong>4</strong>字幕/大字报</span>
            <small>按成熟视频工具的工作区分组：先放素材和脚本，音频、人物、字幕和高级设置按需展开；生成检查会在关键内容传入后出现。</small>
          </div>

          <div class="render-digital-workspace">
              <section class="render-digital-section">
              <div class="render-module-title render-module-title-compact">
                <div>
                  <h3>必选：车辆素材包</h3>
                  <small>优先选择已整理好的车型素材包；车辆补图、多车型对比和素材完整度按需展开。</small>
                </div>
                <span class="render-required-badge">必选</span>
              </div>
              <AssetPicker
                title="车型素材包"
                asset-type="JSON"
                :selected-url="carBundleAssetUrl"
                :selected-name="carBundleLoadedName"
                :source-types="['USER_UPLOAD']"
                :asset-roles="['car_model_bundle']"
                :role-options="CAR_MODEL_BUNDLE_ROLE_OPTIONS"
                workflow-stage="carBundle"
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
              <details ref="carSceneDetailsRef" class="render-optional-group render-scene-compact">
                <summary>
                  <span>场景图片 <em>可选</em></span>
                  <small>{{ carSceneMaterialUrls.length ? `已选择 ${carSceneMaterialUrls.length} 张场景图` : '展厅、道路、门店、户外环境图，按需展开补充。' }}</small>
                </summary>
                <div class="render-optional-body render-scene-compact-body">
                  <AssetPicker
                    title="从资产中心选择场景图片"
                    asset-type="IMAGE"
                    :asset-types="['IMAGE', 'COVER']"
                    :selected-url="carPickedSceneImageUrl"
                    :asset-roles="CAR_SCENE_REFERENCE_ROLES"
                    :role-options="CAR_SCENE_IMAGE_ROLE_OPTIONS"
                    workflow-stage="sceneBundle"
                    placeholder="搜索场景图片素材..."
                    source-hint="只加载图片类资产；未打场景标签的普通图片也可在“全部”中选择"
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
                </div>
              </details>
              <details ref="carVehicleExtraDetailsRef" class="render-optional-group render-fast-extra">
                <summary>
                  <span>补充车辆素材 <em>可选</em></span>
                  <small>多车型对比、车辆补图、保存素材包和完整度检查都属于车辆补充项。</small>
                </summary>
                <div class="render-optional-body">
              <section class="render-multi-car-panel" aria-label="多车型对比">
                <div class="render-multi-car-head">
                  <div>
                    <strong>多车型对比 <em>可选</em></strong>
                    <small>选择 2 个车型素材包后，按车型章节分别介绍，再做固定维度对比和总结。</small>
                  </div>
                  <button
                    type="button"
                    class="app-secondary-button render-mini-btn"
                    :disabled="busy"
                    @click="multiCarCompareEnabled = !multiCarCompareEnabled"
                  >
                    {{ multiCarCompareEnabled ? '关闭对比' : '开启对比' }}
                  </button>
                </div>
                <div v-if="multiCarCompareEnabled" class="render-multi-car-body">
                  <AssetPicker
                    title="添加对比车型素材包"
                    asset-type="JSON"
                    :selected-url="compareBundlePickedUrl"
                    :source-types="['USER_UPLOAD']"
                    :asset-roles="['car_model_bundle']"
                    :role-options="CAR_MODEL_BUNDLE_ROLE_OPTIONS"
                    workflow-stage="carBundle"
                    source-hint="每次选择一款车型素材包，会加入下方对比列表并保留车型身份"
                    placeholder="搜索并添加车型素材包..."
                    @select="handleCompareCarBundleAssetSelect"
                  />
                  <div v-if="compareBundleLoadError" class="render-car-bundle-status error">
                    <strong>对比素材包读取失败</strong>
                    <span>{{ compareBundleLoadError }}</span>
                  </div>
                  <div v-if="compareCarPackages.length" class="render-multi-car-list">
                    <article
                      v-for="(pkg, idx) in compareCarPackages"
                      :key="pkg.localId"
                      class="render-multi-car-item"
                    >
                      <div class="render-multi-car-item-head">
                        <strong>车型 {{ idx + 1 }} · {{ pkg.brandModel || pkg.packageName || '未命名车型' }}</strong>
                        <div class="render-multi-car-actions">
                          <button type="button" :disabled="busy || idx === 0" @click="moveCompareCarPackage(idx, -1)">上移</button>
                          <button type="button" :disabled="busy || idx === compareCarPackages.length - 1" @click="moveCompareCarPackage(idx, 1)">下移</button>
                          <button type="button" :disabled="busy" @click="removeCompareCarPackage(idx)">移除</button>
                        </div>
                      </div>
                      <div class="render-multi-car-fields">
                        <label>
                          <span>角色</span>
                          <select v-model="pkg.role" :disabled="busy" @change="reindexCompareCarPackages">
                            <option v-for="option in COMPARE_CAR_ROLE_OPTIONS" :key="option.value" :value="option.value">
                              {{ option.label }}
                            </option>
                          </select>
                        </label>
                        <label>
                          <span>车型名</span>
                          <input v-model.trim="pkg.brandModel" :disabled="busy" placeholder="例如 Model Y" />
                        </label>
                        <label>
                          <span>颜色</span>
                          <input v-model.trim="pkg.color" :disabled="busy" placeholder="例如 珍珠白" />
                        </label>
                        <label>
                          <span>卖点</span>
                          <input v-model.trim="pkg.sellingPoints" :disabled="busy" placeholder="空间、续航、智能配置等" />
                        </label>
                      </div>
                      <p>
                        {{ compareCarRoleLabel(pkg.role) }} · 车辆图 {{ pkg.images.length }} 张
                        <template v-if="pkg.sceneImages.length"> · 场景图 {{ pkg.sceneImages.length }} 张</template>
                        <template v-if="pkg.materialCompleteness"> · {{ pkg.materialCompleteness }}</template>
                      </p>
                    </article>
                  </div>
                  <div v-else class="render-multi-car-empty">
                    还没有添加对比车型。先添加 2 个车型素材包即可生成双车对比结构。
                  </div>
                  <label class="render-multi-car-dimensions">
                    <span>固定对比维度</span>
                    <input
                      v-model.trim="compareDimensionText"
                      :disabled="busy"
                      placeholder="外观质感、座舱空间、配置亮点、推荐建议"
                    />
                  </label>
                </div>
              </section>
              <div class="render-car-bundle-guidance">
                <strong>分镜优先素材</strong>
                <span>{{ carStoryboardBundleNeedText }}</span>
              </div>
              <section v-if="carStoryboardFunctionReferenceRows.length" class="render-function-reference-panel">
                <div class="render-function-reference-head">
                  <div>
                    <strong>车辆功能镜头补图提示</strong>
                    <small>分镜里出现功能展示时，请补对应部位的参考图，生成会更稳定。</small>
                  </div>
                  <span :class="{ missing: carStoryboardFunctionMissingLabels.length > 0 }">
                    {{ carStoryboardFunctionMissingLabels.length ? '需补图' : '已覆盖' }}
                  </span>
                </div>
                <div class="render-function-reference-list">
                  <article
                    v-for="row in carStoryboardFunctionReferenceRows"
                    :key="row.key"
                    class="render-function-reference-item"
                  >
                    <div>
                      <strong>{{ row.label }}</strong>
                      <small>建议上传并标记：{{ row.roleLabels.join('、') }}</small>
                    </div>
                    <span :class="{ ok: row.missingLabels.length === 0 }">
                      {{ row.missingLabels.length ? `缺少 ${row.missingLabels.join('、')}` : '已提供参考图' }}
                    </span>
                  </article>
                </div>
              </section>
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
                </div>
              </details>
            </section>

            <section class="render-digital-section">
              <div class="render-module-title render-module-title-compact">
                <div>
                  <h3>核心：文案与分镜</h3>
                  <small>分镜控制画面节奏，爆款对标提供口播文案；手动上传和自动编排放在展开项里。</small>
                </div>
                <span class="render-required-badge">核心</span>
              </div>
              <AssetPicker
                title="分镜生成结果（控制段落节奏）"
                asset-type="JSON"
                :selected-url="carStoryboardAssetUrl"
                :selected-name="carStoryboardUploadName"
                :source-types="['STORYBOARD_GENERATE', 'VIDEO_SCRIPT_ANALYZE', 'VIDEO_SCRIPT_URL_ANALYZE', 'USER_UPLOAD']"
                :asset-roles="['storyboard_json']"
                :role-options="CAR_STORYBOARD_ROLE_OPTIONS"
                workflow-stage="storyboard"
                source-hint="旧分镜无需重新生成；系统会在视频制作时智能合并相邻短镜头，只保留段落节奏、景别、运镜和构图"
                placeholder="搜索分镜生成结果..."
                @select="handleCarStoryboardAssetSelect"
              />
              <AssetPicker
                title="爆款对标结果（口播文案）"
                asset-type="JSON"
                :asset-types="['JSON', 'TEXT']"
                :selected-url="carBenchmarkAssetUrl"
                :selected-name="carBenchmarkUploadName"
                :source-types="['DOUYIN_BENCHMARK', 'DOUYIN_PARSE_TRANSCRIPT', 'DOUYIN_REWRITE', 'DOUYIN_TRANSCRIPT', 'USER_UPLOAD']"
                :asset-roles="['benchmark_json', 'voice_script']"
                :role-options="CAR_BENCHMARK_ROLE_OPTIONS"
                workflow-stage="benchmark"
                source-hint="爆款对标产出的口播文案，可直接用于模型原生口播、配音或分镜台词替换"
                placeholder="搜索爆款对标文案..."
                @select="handleCarBenchmarkAssetSelect"
              />
              <details ref="carScriptPlanDetailsRef" class="render-optional-group render-fast-extra">
                <summary>
                  <span>文案补充与自动编排 <em>可选</em></span>
                  <small>上传文案、段数和时长已有自动推荐，需要手动控制节奏时再展开。</small>
                </summary>
                <div class="render-optional-body">
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
              <section class="render-auto-plan-panel" aria-label="自动分段与时长">
                <div class="render-auto-plan-head">
                  <div>
                    <strong>基础信息与自动编排</strong>
                    <small>根据已选车型包、爆款文案、分镜、口播音频和模型上限自动推荐；不填写也会使用默认策略。</small>
                  </div>
                  <span>执行前确认</span>
                </div>
                <div class="render-form-field render-form-field-inline render-segment-count-field">
                  <label>分段数量</label>
                  <select :value="carSegmentCount" :disabled="busy" @change="handleCarSegmentCountChange">
                    <option v-for="n in carSegmentCountOptions" :key="n" :value="n">{{ n }} 段</option>
                  </select>
                  <span class="app-muted render-duration-hint">{{ carSegmentCountHint }}</span>
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
                <div class="render-auto-current-plan">
                  <span>当前执行方案</span>
                  <strong>{{ carExecutionSegmentCount }} 组，{{ carExecutionDurationSummary }}</strong>
                  <small>{{ carDurationHint }}</small>
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
              </section>
                </div>
              </details>
              <details ref="carAudioPeopleDetailsRef" class="render-optional-group render-audio-group">
                <summary>
                  <span>音频与人物 <em>可选</em></span>
                  <small>口播、背景音乐、人物出镜集中在这里；默认使用后期旁白配音且人物不出镜。</small>
                </summary>
                <div class="render-optional-body">
              <div class="render-host-toggle render-host-toggle-core">
                <span>人物出镜</span>
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
                  :selected-name="carHostImageUploadName"
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
              <details ref="carVoiceDetailsRef" class="render-optional-group">
                <summary>
                  <span>讲述与声音 <em>可选</em></span>
                  <small>默认按口播文案驱动模型；已有音频时再展开配置。</small>
                </summary>
                <div class="render-optional-body">
                  <AssetPicker
                    title="口播/配音音频"
                    asset-type="AUDIO"
                    :selected-url="carAudioUrl"
                    :selected-name="carAudioUploadName"
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
                      音视频同步生成
                    </button>
                    <button
                      type="button"
                      :class="{ active: carAudioMode === 'auto_tts' }"
                      :disabled="busy"
                      title="先生成画面，再生成统一旁白，按最终旁白控制成片时长和字幕"
                      @click="setCarAudioMode('auto_tts')"
                    >
                      后期旁白配音
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
              <section v-if="usesGeneratedVoiceover()" class="render-tts-style-panel" aria-label="文案驱动音视频设置">
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
                  <small class="render-tts-language-note">{{ carVoiceTextLanguageNormalizationHint }}</small>
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
                      <div v-if="scene.compareDimension || scene.shotPurpose" class="render-scene-voice-tags">
                        <span v-if="scene.carIndex != null">车型 {{ scene.carIndex + 1 }}</span>
                        <span v-if="scene.compareDimension">{{ scene.compareDimension }}</span>
                        <span v-if="scene.shotPurpose">{{ scene.shotPurpose }}</span>
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
                <div v-if="!hasSelectedVoiceAudio()" class="render-voice-policy-actions" aria-label="口播生成方式">
                  <button
                    type="button"
                    :class="{ active: carAudioMode === 'auto_tts' }"
                    :disabled="busy"
                    @click="setCarAudioMode('auto_tts')"
                  >
                    后期旁白配音
                  </button>
                  <button
                    type="button"
                    :class="{ active: carAudioMode === 'model_native' }"
                    :disabled="busy"
                    @click="setCarAudioMode('model_native')"
                  >
                    音视频同步生成
                  </button>
                </div>
                <small v-else>已选择口播音频，本次会优先使用该音频；如要改用自动旁白或音视频同步生成，请先移除已选音频。</small>
              </div>
              <details ref="carBgmDetailsRef" class="render-optional-group">
                <summary>
                  <span>背景音乐 BGM <em>可选</em></span>
                  <small>只作为背景音乐混入，不参与口播、字幕或口型。</small>
                </summary>
                <div class="render-optional-body">
                  <AssetPicker
                    title="背景音乐 BGM"
                    asset-type="AUDIO"
                    :selected-url="carBgmUrl"
                    :selected-name="carBgmUploadName"
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
                </div>
              </details>
                </div>
              </details>
              <details ref="carPackagingDetailsRef" class="render-optional-group render-packaging-group">
                <summary>
                  <span>字幕与大字报 <em>可选</em></span>
                  <small>字幕和画面文字集中在这里；默认后期处理，可调整样式、位置、字号和颜色。</small>
                </summary>
                <div class="render-optional-body">
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
                    <small>默认按最终音轨识别字幕时间戳；不填写则使用智能策略。</small>
                  </div>
                  <div class="render-form-field">
                    <label>音画同步</label>
                    <div class="render-audio-mode render-sync-mode">
                      <button
                        v-for="option in carSyncStrategyOptions"
                        :key="option.key"
                        type="button"
                        :class="{ active: carSyncStrategy === option.key }"
                        :disabled="busy"
                        @click="carSyncStrategy = option.key"
                      >
                        {{ option.label }}
                      </button>
                    </div>
                    <small>{{ carSyncStrategyHint }}</small>
                  </div>
                  <div v-if="carSubtitleMode !== 'off'" class="render-form-field">
                    <label>字幕时间轴</label>
                    <div class="render-audio-mode render-sync-mode">
                      <button
                        v-for="option in carSubtitleTimingOptions"
                        :key="option.key"
                        type="button"
                        :class="{ active: carSubtitleTimingMode === option.key }"
                        :disabled="busy || (carSubtitleMode === 'custom' && option.key === 'audio_recognition')"
                        @click="carSubtitleTimingMode = option.key"
                      >
                        {{ option.label }}
                      </button>
                    </div>
                    <small>{{ carSubtitleTimingHint }}</small>
                  </div>
                  <section v-if="carSubtitleMode !== 'off'" class="render-text-poster-panel" aria-label="视频字幕样式设置">
                    <div class="render-text-poster-head">
                      <div class="render-text-poster-title">
                        <label>字幕样式</label>
                        <small>叠加在成片字幕上，可调整字体、位置、字号和颜色。</small>
                      </div>
                    </div>
                    <div class="render-text-poster-controls">
                      <div class="render-form-field">
                        <label>字体</label>
                        <select v-model="carSubtitleFontFamily" :disabled="busy">
                          <option v-for="item in carHeadlineFontOptions" :key="item.value" :value="item.value">
                            {{ item.label }}
                          </option>
                        </select>
                      </div>
                      <div class="render-form-field">
                        <label>摆放区域</label>
                        <select v-model="carSubtitlePosition" :disabled="busy">
                          <option v-for="item in carHeadlinePositionOptions" :key="item.value" :value="item.value">
                            {{ item.label }}
                          </option>
                        </select>
                      </div>
                      <div class="render-form-field">
                        <label>字号</label>
                        <input v-model.number="carSubtitleFontSize" type="number" min="12" max="96" step="2" :disabled="busy" />
                      </div>
                    </div>
                    <div class="render-color-grid" aria-label="字幕颜色设置">
                      <div class="render-form-field render-color-field">
                        <label>文字颜色</label>
                        <div class="render-color-row">
                          <span class="render-color-current" :style="{ backgroundColor: carSubtitleTextColor }" aria-hidden="true" />
                          <input v-model="carSubtitleTextColor" type="color" :disabled="busy" aria-label="微调字幕文字颜色" />
                          <input
                            v-model.trim="carSubtitleTextColor"
                            type="text"
                            :disabled="busy"
                            placeholder="#FFFFFF"
                            aria-label="字幕文字颜色 HEX"
                            @blur="normalizeCarSubtitleTextColor"
                          />
                        </div>
                        <div class="render-color-swatches" aria-label="常用字幕文字颜色">
                          <button
                            v-for="item in carHeadlineColorPresets"
                            :key="`subtitle-text-${item.value}`"
                            type="button"
                            class="render-color-swatch"
                            :class="{ active: isCarSubtitleTextColorPreset(item.value) }"
                            :style="{ backgroundColor: item.value }"
                            :disabled="busy"
                            :title="item.label"
                            :aria-label="`选择字幕文字颜色：${item.label}`"
                            @click="setCarSubtitleTextColor(item.value)"
                          >
                            <span class="render-sr-only">{{ item.label }}</span>
                          </button>
                        </div>
                      </div>
                      <div class="render-form-field render-color-field">
                        <label>描边颜色</label>
                        <div class="render-color-row">
                          <span class="render-color-current" :style="{ backgroundColor: carSubtitleOutlineColor }" aria-hidden="true" />
                          <input v-model="carSubtitleOutlineColor" type="color" :disabled="busy" aria-label="微调字幕描边颜色" />
                          <input
                            v-model.trim="carSubtitleOutlineColor"
                            type="text"
                            :disabled="busy"
                            placeholder="#111111"
                            aria-label="字幕描边颜色 HEX"
                            @blur="normalizeCarSubtitleOutlineColor"
                          />
                        </div>
                        <div class="render-color-swatches" aria-label="常用字幕描边颜色">
                          <button
                            v-for="item in carHeadlineColorPresets"
                            :key="`subtitle-outline-${item.value}`"
                            type="button"
                            class="render-color-swatch"
                            :class="{ active: isCarSubtitleOutlineColorPreset(item.value) }"
                            :style="{ backgroundColor: item.value }"
                            :disabled="busy"
                            :title="item.label"
                            :aria-label="`选择字幕描边颜色：${item.label}`"
                            @click="setCarSubtitleOutlineColor(item.value)"
                          >
                            <span class="render-sr-only">{{ item.label }}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    <div class="render-text-poster-preview-wrap">
                      <label>样式预览</label>
                      <div class="render-text-poster-preview" :class="`pos-${carSubtitlePosition}`">
                        <span :style="carSubtitlePreviewStyle">{{ carSubtitlePreviewText }}</span>
                      </div>
                    </div>
                  </section>
                  <section class="render-text-poster-panel" aria-label="视频大字报设置">
                    <div class="render-text-poster-head">
                      <div class="render-text-poster-title">
                        <label>大字报</label>
                        <small>叠加在成片画面上，可选择是否显示、文案、字体和颜色。</small>
                      </div>
                      <div class="render-text-poster-switch">
                        <button
                          type="button"
                          :class="{ active: !carHeadlineEnabled }"
                          :disabled="busy"
                          @click="carHeadlineEnabled = false"
                        >
                          不显示
                        </button>
                        <button
                          type="button"
                          :class="{ active: carHeadlineEnabled }"
                          :disabled="busy"
                          @click="carHeadlineEnabled = true"
                        >
                          显示
                        </button>
                      </div>
                    </div>
                    <template v-if="carHeadlineEnabled">
                      <div class="render-form-field">
                        <label>大字报文案</label>
                        <textarea
                          v-model="carHeadlineText"
                          :disabled="busy"
                          rows="2"
                          maxlength="120"
                          placeholder="输入要显示在画面上的大字报文案"
                        />
                      </div>
                      <div class="render-text-poster-controls">
                        <div class="render-form-field">
                          <label>字体</label>
                          <select v-model="carHeadlineFontFamily" :disabled="busy">
                            <option v-for="item in carHeadlineFontOptions" :key="item.value" :value="item.value">
                              {{ item.label }}
                            </option>
                          </select>
                        </div>
                        <div class="render-form-field">
                          <label>摆放区域</label>
                          <select v-model="carHeadlinePosition" :disabled="busy">
                            <option v-for="item in carHeadlinePositionOptions" :key="item.value" :value="item.value">
                              {{ item.label }}
                            </option>
                          </select>
                        </div>
                        <div class="render-form-field">
                          <label>字号</label>
                          <input v-model.number="carHeadlineFontSize" type="number" min="48" max="156" step="4" :disabled="busy" />
                        </div>
                      </div>
                      <div class="render-color-grid" aria-label="大字报颜色设置">
                        <div class="render-form-field render-color-field">
                          <label>文字颜色</label>
                          <div class="render-color-row">
                            <span class="render-color-current" :style="{ backgroundColor: carHeadlineTextColor }" aria-hidden="true" />
                            <input v-model="carHeadlineTextColor" type="color" :disabled="busy" aria-label="微调文字颜色" />
                            <input
                              v-model.trim="carHeadlineTextColor"
                              type="text"
                              :disabled="busy"
                              placeholder="#FFFFFF"
                              aria-label="文字颜色 HEX"
                              @blur="normalizeCarHeadlineTextColor"
                            />
                          </div>
                          <div class="render-color-swatches" aria-label="常用文字颜色">
                            <button
                              v-for="item in carHeadlineColorPresets"
                              :key="`text-${item.value}`"
                              type="button"
                              class="render-color-swatch"
                              :class="{ active: isCarHeadlineTextColorPreset(item.value) }"
                              :style="{ backgroundColor: item.value }"
                              :disabled="busy"
                              :title="item.label"
                              :aria-label="`选择文字颜色：${item.label}`"
                              @click="setCarHeadlineTextColor(item.value)"
                            >
                              <span class="render-sr-only">{{ item.label }}</span>
                            </button>
                          </div>
                        </div>
                        <div class="render-form-field render-color-field">
                          <label>描边颜色</label>
                          <div class="render-color-row">
                            <span class="render-color-current" :style="{ backgroundColor: carHeadlineOutlineColor }" aria-hidden="true" />
                            <input v-model="carHeadlineOutlineColor" type="color" :disabled="busy" aria-label="微调描边颜色" />
                            <input
                              v-model.trim="carHeadlineOutlineColor"
                              type="text"
                              :disabled="busy"
                              placeholder="#111111"
                              aria-label="描边颜色 HEX"
                              @blur="normalizeCarHeadlineOutlineColor"
                            />
                          </div>
                          <div class="render-color-swatches" aria-label="常用描边颜色">
                            <button
                              v-for="item in carHeadlineColorPresets"
                              :key="`outline-${item.value}`"
                              type="button"
                              class="render-color-swatch"
                              :class="{ active: isCarHeadlineOutlineColorPreset(item.value) }"
                              :style="{ backgroundColor: item.value }"
                              :disabled="busy"
                              :title="item.label"
                              :aria-label="`选择描边颜色：${item.label}`"
                              @click="setCarHeadlineOutlineColor(item.value)"
                            >
                              <span class="render-sr-only">{{ item.label }}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                      <div class="render-text-poster-preview-wrap">
                        <label>样式预览</label>
                        <div class="render-text-poster-preview" :class="`pos-${carHeadlinePosition}`">
                          <span :style="carHeadlinePreviewStyle">{{ carHeadlinePreviewText }}</span>
                        </div>
                      </div>
                    </template>
                  </section>
                  <div class="render-packaging-toggles" aria-label="其他画面包装">
                    <span>水印 <em>可选，默认关闭</em></span>
                    <span>封面 <em>可选，默认关闭</em></span>
                    <span>标题条 <em>可选，默认关闭</em></span>
                  </div>
                </div>
              </details>
              <details ref="carMaterialVideoDetailsRef" class="render-optional-group">
                <summary>
                  <span>已有视频素材 <em>可选</em></span>
                  <small>上传或选择已有视频素材，作为补充素材使用。</small>
                </summary>
                <div class="render-optional-body">
                  <AssetPicker
                    title="已有视频素材"
                    asset-type="VIDEO"
                    :selected-url="carMaterialVideoUrl"
                    :selected-name="carMaterialVideoUploadName"
                    show-video-preview
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

          <details ref="carSalesInfoDetailsRef" class="render-details">
            <summary>
              <span>文案与销售信息 <em>可选</em></span>
              <small>车型、客户、卖点和转化引导属于文案补充，脚本不完整时再展开</small>
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

          <details ref="carAdvancedPromptDetailsRef" class="render-details">
            <summary>
              <span>补充提示与模型 <em>可选</em></span>
              <small>模型、分镜节奏和补充镜头要求集中在这里；一般不用改</small>
            </summary>
            <div class="render-details-body">
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
          v-if="showModelSelector && mainTab !== 'carSales'"
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

        <details
          v-if="showCarGenerationReview"
          class="render-basis-panel"
          :open="carGenerationBlockingMessages.length > 0"
          aria-label="生成前检查"
        >
          <summary class="render-basis-summary">
            <span>
              生成前检查
              <em :class="carGenerationBlockingMessages.length ? 'danger' : 'ok'">
                {{ carGenerationBlockingMessages.length ? '需修正' : '可生成' }}
              </em>
            </span>
            <small>{{ carGenerationReviewSummary }}</small>
          </summary>
          <div class="render-basis-body">
            <p>{{ carGenerationBasisSummary }}</p>
            <dl class="render-basis-grid">
              <div v-for="row in carGenerationBasisRows" :key="row.label">
                <dt>{{ row.label }}</dt>
                <dd>{{ row.value }}</dd>
              </div>
            </dl>
            <section v-if="carGenerationGroupPreviewRows.length" class="render-generation-plan">
              <div class="render-generation-plan-head">
                <strong>分镜生成分组</strong>
                <span>{{ carGenerationGroupSummary }}</span>
              </div>
              <div class="render-generation-plan-list">
                <article
                  v-for="row in carGenerationGroupPreviewRows"
                  :key="`generation-group-${row.groupIndex}`"
                  class="render-generation-plan-item"
                >
                  <div>
                    <strong>生成组 {{ row.groupIndex }} · {{ formatSeconds(row.duration) }}</strong>
                    <span>原片段 {{ row.sourceIndexes.join('、') }} · 参考图 {{ row.referenceCount }} 张</span>
                  </div>
                  <p>{{ row.titles.join(' / ') }}</p>
                  <small v-if="row.carLabel || row.compareDimension || row.shotPurpose">
                    {{ [row.carLabel, row.compareDimension, row.shotPurpose].filter(Boolean).join(' · ') }}
                  </small>
                </article>
              </div>
            </section>
            <div v-if="carGenerationBlockingMessages.length" class="render-basis-alert danger">
              <strong>提交前需要处理：</strong>
              <span v-for="item in carGenerationBlockingMessages" :key="item">{{ item }}</span>
            </div>
            <div v-if="carGenerationWarnings.length" class="render-basis-alert warn">
              <strong>生成提示：</strong>
              <span v-for="item in carGenerationWarnings" :key="item">{{ item }}</span>
            </div>
          </div>
        </details>
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
            系统会先把相邻短分镜合并为连续段落，超过模型单段上限时再分段生成并按顺序合成；完成的片段会先展示。
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
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
import { getTaskDetail, getTaskResult } from '../../services/taskApi'
import { uploadFile } from '../../services/uploadApi'
import { getAssetDetail, getAssetTextContent, uploadMaterialAsset } from '../../services/assetApi'
import {
  consumePendingRenderTaskImport,
  readRenderTaskSnapshot,
  saveRenderTaskSnapshot,
} from '../../services/renderTaskImport'
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
  CarSalesCarPackageRequest,
  CarSalesVideoRequest,
  DigitalHumanTaskDetailResponse,
  FirstFrameVideoRequest,
  FirstLastFrameVideoRequest,
  ReferenceVideoRequest,
  TextToVideoRequest,
  VideoScriptShotItem,
  VideoTaskVO,
} from '../../types/videoTypes'
import type { AssetItem } from '../../types/assetTypes'


type MainTab = 'text' | 'image' | 'carSales' | 'digitalHuman'
type ImageSubTab = 'first' | 'firstLast' | 'reference'
type DigitalHumanAudioMode = 'asset' | 'upload' | 'url' | 'text'
type CarAudioMode = 'none' | 'post_mix' | 'reference' | 'model_native' | 'auto_tts'
type CarVoicePolicy = 'user_audio' | 'model_native' | 'auto_tts' | 'none'
type CarVoiceTextSource = 'auto' | 'benchmark' | 'manual'
type CarSubtitleMode = 'off' | 'auto' | 'custom'
type CarSubtitleTimingMode = 'auto' | 'audio_recognition' | 'script_timeline'
type CarSyncStrategy = 'auto' | 'audio_master' | 'visual_master'
type CarHeadlinePosition = 'top' | 'middle' | 'bottom'
type NativeVoiceLanguage = 'zh-CN' | 'en-US'
type SeedanceModelValue = 'doubao-seedance-1-5-pro-251215' | 'ep-20260512233524-85r4g'
type CarMaterialGroup = 'exterior' | 'interior' | 'detail' | 'scene' | 'host'
type RenderProductionMode = 'quick' | 'manual'
type RenderAspectRatio = '9:16' | '16:9' | 'auto'
type CompareCarRole = 'main' | 'compare' | 'alternative'

interface StoryboardShotGroup {
  shots: VideoScriptShotItem[]
  startIndex: number
  duration: number
}

interface ModelRequirement {
  model: SeedanceModelValue
  reason: string
}

interface CarBundleImageEntry {
  url: string
  role: string
  assetId?: number
  label?: string
  fileName?: string
}

interface CompareCarPackage {
  localId: string
  packageAssetId?: number
  packageAssetUrl: string
  packageName: string
  carIndex: number
  role: CompareCarRole
  brandModel: string
  color: string
  sellingPoints: string
  materialCompleteness: string
  images: CarBundleImageEntry[]
  sceneImages: CarBundleImageEntry[]
}

interface CarSalesSceneDraft {
  segmentIndex?: number
  title?: string
  visualPrompt?: string
  prompt?: string
  imageUrls: string[]
  referenceImage?: string
  voiceText?: string
  duration?: number
  carPackageId?: string
  carIndex?: number
  carRole?: string
  compareDimension?: string
  shotPurpose?: string
}

interface CarGenerationGroupPreview {
  groupIndex: number
  sourceIndexes: number[]
  titles: string[]
  duration: number
  referenceCount: number
  carLabel: string
  compareDimension: string
  shotPurpose: string
}

interface CarScenePlanningItem {
  scene: CarSalesSceneDraft
  sourceIndex: number
  duration: number
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
  { role: 'car_interior_steering', label: '方向盘', group: 'interior' },
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
const COMPARE_CAR_ROLE_OPTIONS: Array<{ value: CompareCarRole; label: string }> = [
  { value: 'main', label: '主推' },
  { value: 'compare', label: '对比' },
  { value: 'alternative', label: '备选' },
]
const DEFAULT_COMPARE_DIMENSIONS = ['外观质感', '座舱空间', '配置亮点', '用车场景', '推荐建议']
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
const DEFAULT_CAR_NATIVE_VOICE_STYLE = 'female_natural_explain'
const CAR_NATIVE_VOICE_STYLE_OPTIONS = [
  { value: 'female_natural_explain', label: '女声自然讲解', hint: '女性销售顾问声线，普通话清晰亲和' },
  { value: 'male_natural_explain', label: '男声自然讲解', hint: '男性销售顾问声线，普通话清晰稳健' },
  { value: 'female_clear', label: '清亮女销售', hint: '青年女性声线，干净亲和不尖锐' },
  { value: 'male_clear', label: '清朗男销售', hint: '青年男性声线，清爽亲和不油腻' },
  { value: 'female_steady', label: '沉稳女顾问', hint: '成年女性中低音，稳重可信' },
  { value: 'male_steady', label: '沉稳男顾问', hint: '成年男性低中音，稳重可信' },
  { value: 'female_live', label: '女声直播带看', hint: '女性门店主播，轻快有互动感' },
  { value: 'male_live', label: '男声直播带看', hint: '男性门店主播，直接有互动感' },
  { value: 'female_energetic_promo', label: '女声促销强节奏', hint: '女性促销口吻，突出权益和转化' },
  { value: 'male_energetic_promo', label: '男声促销强节奏', hint: '男性促销口吻，突出权益和转化' },
  { value: 'female_review', label: '专业女评测', hint: '女性媒体评测感，理性清晰' },
  { value: 'male_review', label: '专业男评测', hint: '男性媒体评测感，卖点表达清楚' },
  { value: 'female_luxury_calm', label: '女声高级质感', hint: '成熟女性声线，沉稳有高端车广告质感' },
  { value: 'male_luxury_calm', label: '男声高级质感', hint: '成熟男性声线，沉稳有高端车广告质感' },
  { value: 'female_young_tech', label: '女声年轻科技感', hint: '年轻女性声线，清爽利落讲智能配置' },
  { value: 'male_young_tech', label: '男声年轻科技感', hint: '年轻男性声线，清爽利落讲智能配置' },
  { value: 'female_family_warm', label: '女声家庭温和', hint: '女性生活化口吻，适合家用场景' },
  { value: 'male_family_warm', label: '男声家庭温和', hint: '男性生活化口吻，适合家用场景' },
  { value: 'female_soft_story', label: '女声温柔叙事', hint: '女性柔和叙事，适合生活方式广告' },
  { value: 'male_soft_story', label: '男声温柔叙事', hint: '男性柔和叙事，适合生活方式广告' },
  { value: 'female_local_friendly', label: '女声本地亲和', hint: '女性本地亲和口吻，真实接地气' },
  { value: 'male_local_friendly', label: '男声本地亲和', hint: '男性本地亲和口吻，真实接地气' },
]
const LEGACY_CAR_NATIVE_VOICE_STYLE_ALIASES: Record<string, string> = {
  natural_explain: DEFAULT_CAR_NATIVE_VOICE_STYLE,
  live_seller: 'male_live',
  energetic_promo: 'female_energetic_promo',
  luxury_calm: 'male_luxury_calm',
  young_tech: 'male_young_tech',
  family_warm: 'female_family_warm',
  soft_story: 'female_soft_story',
  local_friendly: 'female_local_friendly',
}
function normalizeCarNativeVoiceStyle(value?: string | null) {
  const raw = (value || '').trim()
  if (!raw) return DEFAULT_CAR_NATIVE_VOICE_STYLE
  if (CAR_NATIVE_VOICE_STYLE_OPTIONS.some((item) => item.value === raw)) return raw
  return LEGACY_CAR_NATIVE_VOICE_STYLE_ALIASES[raw] || DEFAULT_CAR_NATIVE_VOICE_STYLE
}
const CAR_NATIVE_SPEECH_STYLE_OPTIONS = [
  { value: 'natural', label: '自然语速', hint: '按正常口播节奏生成' },
  { value: 'concise', label: '短促利落', hint: '少废话、信息密度更高' },
  { value: 'emotional', label: '情绪递进', hint: '先吸引，再卖点，最后引导咨询' },
  { value: 'slow_detail', label: '细节讲解', hint: '更慢一些，适合配置说明' },
  { value: 'fast_hook', label: '开场抓人', hint: '前 2 秒更有吸引力，后面回到清晰表达' },
  { value: 'review_steady', label: '评测节奏', hint: '稳扎稳打，适合对比和配置说明' },
  { value: 'soft_story', label: '故事节奏', hint: '停顿更自然，适合生活化叙事' },
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
  instrument: 'car_interior_dashboard',
  dashboard_wheel: 'car_interior_dashboard',
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
const CAR_WORKFLOW_ASSET_ROLES = [
  'car_model_bundle',
  'voiceover',
  'reference_audio',
  'bgm',
  'storyboard_json',
  'benchmark_json',
  'voice_script',
  'material_video',
  'host_video',
  'reference_video',
]

const CAR_SCENE_KEYWORD_ROLES: Array<{ keywords: string[]; roles: string[] }> = [
  { keywords: ['方向盘'], roles: ['car_interior_steering'] },
  { keywords: ['内饰', '座椅', '中控', '空间', '前排', '后排', '仪表', '后备箱'], roles: ['car_interior_dashboard', 'car_interior_front_seat', 'car_interior_back_seat', 'car_interior_trunk'] },
  { keywords: ['车灯', '灯光', '轮毂', 'logo', '标识', '细节', '材质'], roles: ['car_detail_light', 'car_detail_wheel', 'car_detail_logo', 'car_detail_seat_material'] },
  { keywords: ['展厅', '门店', '到店', '试驾', '邀约', '销售顾问'], roles: ['scene_showroom', 'car_exterior_front', 'host_image'] },
  { keywords: ['户外', '城市', '公路', '道路', '山路', '夜景', '通勤', '出行'], roles: ['scene_outdoor', 'scene_road', 'scene_night', 'car_exterior_side'] },
  { keywords: ['外观', '车头', '车身', '正面', '侧面', '背面'], roles: ['car_exterior_front', 'car_exterior_side', 'car_exterior_45', 'car_exterior_rear'] },
]

const CAR_FUNCTION_REFERENCE_HINTS: Array<{
  key: string
  label: string
  keywords: string[]
  roles: string[]
}> = [
  {
    key: 'lights',
    label: '灯光/大灯功能',
    keywords: ['车灯', '大灯', '尾灯', '灯光', '矩阵灯', '贯穿灯', '迎宾灯', '日行灯', '转向灯'],
    roles: ['car_detail_light'],
  },
  {
    key: 'wheel',
    label: '轮毂/轮胎/底盘展示',
    keywords: ['轮毂', '轮胎', '刹车', '卡钳', '底盘', '悬架', '悬挂'],
    roles: ['car_detail_wheel'],
  },
  {
    key: 'cockpit',
    label: '智能座舱/车机屏幕',
    keywords: ['中控', '车机', '大屏', '屏幕', '智能座舱', '仪表', 'hud', '导航', '语音交互'],
    roles: ['car_interior_dashboard'],
  },
  {
    key: 'steering',
    label: '方向盘功能',
    keywords: ['方向盘', '多功能方向盘'],
    roles: ['car_interior_steering'],
  },
  {
    key: 'seat',
    label: '座椅舒适功能',
    keywords: ['座椅', '通风', '加热', '按摩', '头枕', '腿托', '真皮', '座椅材质'],
    roles: ['car_detail_seat_material', 'car_interior_front_seat'],
  },
  {
    key: 'space',
    label: '乘坐空间/后排体验',
    keywords: ['空间', '后排', '腿部空间', '头部空间', '儿童座椅', '乘坐', '家用'],
    roles: ['car_interior_back_seat'],
  },
  {
    key: 'trunk',
    label: '后备箱/装载能力',
    keywords: ['后备箱', '尾箱', '储物', '装载', '露营装备', '行李箱'],
    roles: ['car_interior_trunk'],
  },
  {
    key: 'logo',
    label: '品牌/车标/细节识别',
    keywords: ['logo', '车标', '标识', '品牌标', '尾标', '铭牌'],
    roles: ['car_detail_logo'],
  },
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
const carSyncStrategyOptions: Array<{ key: CarSyncStrategy; label: string; hint: string }> = [
  { key: 'auto', label: '智能同步', hint: '默认按分镜画面总时长成片；自动旁白会根据目标时长调整语速，不再默认拉长画面。' },
  { key: 'audio_master', label: '口播优先', hint: '仅在明确需要完整保留外部口播时使用，画面会变速或补帧贴合音轨。' },
  { key: 'visual_master', label: '画面优先', hint: '保持画面原节奏；外部口播按画面时长兜底处理，自动旁白会优先匹配语速。' },
]
const carSubtitleTimingOptions: Array<{ key: CarSubtitleTimingMode; label: string; hint: string }> = [
  { key: 'auto', label: '智能字幕', hint: '有最终音轨时优先识别音频；模型原生口播会以实际说出的内容生成字幕。' },
  { key: 'audio_recognition', label: '跟随音频', hint: '从最终音轨识别字幕文本和时间戳，适合口播已经确定的成片。' },
  { key: 'script_timeline', label: '跟随文案', hint: '按分镜和文案权重分配字幕时长，适合无口播或需要文案精修。' },
]
const carHeadlineFontOptions = [
  { value: 'Microsoft YaHei', label: '微软雅黑' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Impact', label: 'Impact' },
  { value: 'Source Han Sans SC', label: '思源黑体' },
  { value: 'Noto Sans CJK SC', label: 'Noto Sans' },
]
const carHeadlinePositionOptions: Array<{ value: CarHeadlinePosition; label: string }> = [
  { value: 'top', label: '顶部' },
  { value: 'middle', label: '中部' },
  { value: 'bottom', label: '底部' },
]
const carHeadlineColorPresets = [
  { label: '白色', value: '#ffffff' },
  { label: '黑色', value: '#111111' },
  { label: '红色', value: '#ef4444' },
  { label: '黄色', value: '#facc15' },
  { label: '蓝色', value: '#2563eb' },
  { label: '绿色', value: '#22c55e' },
  { label: '橙色', value: '#f97316' },
]
const renderAspectRatioOptions: Array<{ value: RenderAspectRatio; label: string; hint: string }> = [
  { value: '9:16', label: '竖屏 9:16', hint: '适合抖音、视频号、竖版信息流' },
  { value: '16:9', label: '横屏 16:9', hint: '适合横版展示、门店大屏和通用素材' },
  { value: 'auto', label: '跟随素材', hint: '交给模型按素材主体自动决定' },
]

const route = useRoute()
const router = useRouter()

/** 临时开关：设为 true 可恢复「一键成片」入口与 quick 模式直达。 */
const ENABLE_QUICK_RENDER_MODE = false

const productionMode = ref<RenderProductionMode>(
  ENABLE_QUICK_RENDER_MODE && route.query.mode === 'quick' ? 'quick' : 'manual',
)

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
    productionMode.value = ENABLE_QUICK_RENDER_MODE && mode === 'quick' ? 'quick' : 'manual'
  },
)

function setProductionMode(mode: RenderProductionMode) {
  const nextMode = ENABLE_QUICK_RENDER_MODE ? mode : 'manual'
  productionMode.value = nextMode
  const query = { ...route.query }
  if (nextMode === 'quick') {
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
const multiCarCompareEnabled = ref(false)
const compareBundlePickedUrl = ref('')
const compareBundleLoadError = ref('')
const compareCarPackages = ref<CompareCarPackage[]>([])
const compareDimensionText = ref(DEFAULT_COMPARE_DIMENSIONS.slice(0, 4).join('、'))
const carPickedImageUrl = ref('')
const carPickedSceneImageUrl = ref('')
const carBrandModel = ref('')
const carAudience = ref('')
const carCallToAction = ref('预约试驾，私信领取到店权益')
const carSellingPoints = ref('')
const carStoryboardContext = ref('')
const carStoryboardAssetUrl = ref('')
const carStoryboardAssetId = ref<number | null>(null)
const carStoryboardUploadName = ref('')
const carVoiceContext = ref('')
const carBenchmarkAssetUrl = ref('')
const carBenchmarkAssetId = ref<number | null>(null)
const carBenchmarkVoiceText = ref('')
const carBenchmarkUploading = ref(false)
const carBenchmarkUploadName = ref('')
const carAudioUrl = ref('')
const carAudioAssetId = ref<number | null>(null)
const carAudioSourceType = ref('')
const carAudioMode = ref<CarAudioMode>('auto_tts')
const carAudioUploading = ref(false)
const carAudioUploadName = ref('')
const carVoiceTextSource = ref<CarVoiceTextSource>('auto')
const carNativeVoiceLanguage = ref<NativeVoiceLanguage>('zh-CN')
const carNativeVoiceStyle = ref(DEFAULT_CAR_NATIVE_VOICE_STYLE)
const carNativeSpeechStyle = ref('natural')
const DEFAULT_CAR_SUBTITLE_FONT_SIZE = 16
const carSubtitleMode = ref<CarSubtitleMode>('off')
const carSubtitleText = ref('')
const carSubtitleLanguage = ref('zh-CN')
const carSubtitleTimingMode = ref<CarSubtitleTimingMode>('auto')
const carSyncStrategy = ref<CarSyncStrategy>('auto')
const carSubtitleFontFamily = ref('Microsoft YaHei')
const carSubtitlePosition = ref<CarHeadlinePosition>('bottom')
const carSubtitleFontSize = ref(DEFAULT_CAR_SUBTITLE_FONT_SIZE)
const carSubtitleTextColor = ref('#ffffff')
const carSubtitleOutlineColor = ref('#111111')
const carHeadlineEnabled = ref(false)
const carHeadlineText = ref('')
const carHeadlineFontFamily = ref('Microsoft YaHei')
const carHeadlinePosition = ref<CarHeadlinePosition>('top')
const carHeadlineFontSize = ref(92)
const carHeadlineTextColor = ref('#ffffff')
const carHeadlineOutlineColor = ref('#111111')
const carBgmUrl = ref('')
const carBgmAssetId = ref<number | null>(null)
const carBgmSourceType = ref('')
const carBgmUploading = ref(false)
const carBgmUploadName = ref('')
const carAudioDurationSeconds = ref<number | null>(null)
const carHostImageUrl = ref('')
const carHostImageAssetId = ref<number | null>(null)
const carHostImageUploadName = ref('')
const carHostAppearanceEnabled = ref(false)
const carMaterialVideoUrl = ref('')
const carMaterialVideoAssetId = ref<number | null>(null)
const carMaterialVideoUploadName = ref('')
const carSegmentCount = ref(4)
const carSegmentCountOptions = Array.from({ length: 12 }, (_, idx) => idx + 1)
const carSegmentDuration = ref(8)
const carSegmentDurations = ref<number[]>([])
const carSegmentTimingTouched = ref(false)
const carRolePickerOpenIndex = ref<number | null>(null)
const carSceneRolePickerOpenIndex = ref<number | null>(null)
const carSceneDetailsRef = ref<HTMLDetailsElement | null>(null)
const carVehicleExtraDetailsRef = ref<HTMLDetailsElement | null>(null)
const carScriptPlanDetailsRef = ref<HTMLDetailsElement | null>(null)
const carAudioPeopleDetailsRef = ref<HTMLDetailsElement | null>(null)
const carVoiceDetailsRef = ref<HTMLDetailsElement | null>(null)
const carBgmDetailsRef = ref<HTMLDetailsElement | null>(null)
const carPackagingDetailsRef = ref<HTMLDetailsElement | null>(null)
const carMaterialVideoDetailsRef = ref<HTMLDetailsElement | null>(null)
const carSalesInfoDetailsRef = ref<HTMLDetailsElement | null>(null)
const carAdvancedPromptDetailsRef = ref<HTMLDetailsElement | null>(null)

const loggedIn = ref(false)

/**
 * 当前 Tab 对应的预扣 task_type：
 *   文生视频 / 图生视频使用后端实际落库的 SEEDANCE_* 任务类型，保证页面预估与 createTask 预扣一致。
 *   汽车销售成片按 segmentCount * 220 动态预估。
 *   数字人口播                 → DIGITAL_HUMAN_GENERATE
 */
const currentRenderTaskType = computed(() => {
  if (mainTab.value === 'digitalHuman') return 'DIGITAL_HUMAN_GENERATE'
  if (mainTab.value === 'carSales') return 'SEEDANCE_CAR_SALES_VIDEO'
  if (mainTab.value === 'text') return 'SEEDANCE_TEXT_VIDEO'
  if (imageSubTab.value === 'reference') return 'SEEDANCE_REFERENCE_VIDEO'
  if (imageSubTab.value === 'firstLast') return 'SEEDANCE_FIRST_LAST_FRAME_VIDEO'
  return 'SEEDANCE_FIRST_FRAME_VIDEO'
})

function estimateCarSalesSegmentCountForBilling() {
  if (multiCarCompareEnabled.value && compareCarPackages.value.length >= 2) {
    return buildMultiCarCompareScenes().length || carSegmentCount.value
  }
  const shots = extractStoryboardShots(carStoryboardContext.value)
  if (shots.length > 0) {
    return groupStoryboardShots(shots, selectedSeedanceModel.value.maxDuration).length || 1
  }
  return carSegmentCount.value
}

// 一份预估 + Tab 切换自动重取；与后端 createTask 实际预扣金额保持一致，不允许任何前端写死。
const renderEstimate = useBillingEstimate({
  taskType: () => currentRenderTaskType.value,
  watchKeys: () => [
    mainTab.value,
    imageSubTab.value,
    carSegmentCount.value,
    selectedModel.value,
    carStoryboardContext.value,
    multiCarCompareEnabled.value,
    compareCarPackages.value.map((pkg) => `${pkg.localId}:${pkg.brandModel}:${pkg.role}:${pkg.images.length}`).join('|'),
  ],
  buildRequest: () => (
    mainTab.value === 'carSales'
      ? { segmentCount: estimateCarSalesSegmentCountForBilling() }
      : {}
  ),
})

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
  if (usesAutoTtsVoiceover()) {
    return '先生成画面，再生成统一旁白；字幕按最终口播音频识别和对齐，背景音乐只会在后期单独混入。'
  }
  if (usesModelNativeVoiceover()) {
    return '文案会直接交给视频模型生成匹配的画面和原生音频；适合大量口播镜头和嘴型同步，BGM 仍只允许后期单独选择混入。'
  }
  if (!carAudioUrl.value.trim()) {
    return '选择音频后可决定是否参与视频生成。'
  }
  if (!isSeedance2Selected.value) {
    return '参考音频生成仅支持 seedance2.0；seedance1.5 只能后期口播配音。'
  }
  if (plannedCarSceneCount.value !== 1) {
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
  if (multiCarCompareEnabled.value) {
    return {
      model: SEEDANCE_2_MODEL,
      reason: '多车型对比需要多参考图隔离每款车型素材',
    }
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
  if (mode === 'auto_tts') {
    carSyncStrategy.value = 'audio_master'
  } else if ((mode === 'model_native' || mode === 'none') && !carAudioUrl.value.trim()) {
    carSyncStrategy.value = 'auto'
  }
  if (mode === 'reference') {
    carSegmentCount.value = 1
    carSegmentDurations.value = normalizeCarSegmentDurations(carRecommendedSegmentDurations.value, 1)
    syncCarSegmentDurationFallback(carSegmentDurations.value)
    carSegmentTimingTouched.value = false
  }
  enforceRequiredModelSelection()
}

const carNativeVoiceStyleLabel = computed(
  () => CAR_NATIVE_VOICE_STYLE_OPTIONS.find((item) => item.value === carNativeVoiceStyle.value)?.label || '女声自然讲解',
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
const carVoiceTextLanguageNormalizationHint = computed(() => {
  const text = modelNativeVoiceTextPreview.value
  if (!text) {
    return '提交前后端会按讲述语言规范口播文案，再传给视频模型。'
  }
  const stats = voiceLanguageStats(text)
  if (carNativeVoiceLanguage.value === 'zh-CN') {
    if (stats.cjk === 0 || (stats.latin >= 12 && stats.latin > stats.cjk * 2)) {
      return '检测到当前文案偏英文，提交后会先翻译/规范为中文，再传给视频模型。'
    }
    return '提交后仍会按中文讲述校验，最终只把中文口播传给视频模型。'
  }
  if (stats.cjk > 0) {
    return '检测到当前文案含中文，提交后会先翻译/规范为英文，再传给视频模型。'
  }
  return '提交后仍会按英文讲述校验，最终只把英文口播传给视频模型。'
})

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
const isMultiCarCompareMode = computed(() =>
  multiCarCompareEnabled.value && compareCarPackages.value.length >= 2,
)
const orderedCompareCarPackages = computed(() =>
  compareCarPackages.value
    .map((pkg, idx) => ({ ...pkg, carIndex: idx }))
    .filter((pkg) => pkg.images.some((image) => image.url.trim())),
)
const compareDimensionList = computed(() => {
  const custom = compareDimensionText.value
    .split(/[、,，/|]/)
    .map((item) => item.trim())
    .filter(Boolean)
  return (custom.length ? custom : DEFAULT_COMPARE_DIMENSIONS).slice(0, 5)
})
const comparePackageImageUrls = computed<string[]>(() =>
  orderedCompareCarPackages.value.flatMap((pkg) => [
    ...pkg.images.map((image) => image.url.trim()),
    ...pkg.sceneImages.map((image) => image.url.trim()),
  ]).filter(Boolean),
)
const carImageSceneReferenceUrls = computed(() =>
  carImageUrls.value.filter((url, idx) => CAR_SCENE_REFERENCE_ROLES.includes(carImageRoleForUrl(url, idx))),
)
const hasCarSceneReference = computed(() => carSceneMaterialUrls.value.length > 0 || carImageSceneReferenceUrls.value.length > 0)
const carTotalDuration = computed(() => normalizedCarSegmentDurations.value.reduce((sum, value) => sum + value, 0))
function collectProvidedCarMaterialRoles() {
  const providedRoles = new Set<string>()

  if (isMultiCarCompareMode.value) {
    orderedCompareCarPackages.value.forEach((pkg) => {
      pkg.images.forEach((image) => {
        const role = normalizeCarAssetRole(image.role)
        if (role) providedRoles.add(role)
      })
      pkg.sceneImages.forEach((image) => {
        const role = normalizeCarAssetRole(image.role)
        if (role) providedRoles.add(role)
      })
    })
    return providedRoles
  }

  for (const url of carImageUrls.value) {
    const role = normalizeCarAssetRole(carImageAssetRoleByUrl.value[url])
    if (role) {
      providedRoles.add(role)
    }
  }

  for (const url of carSceneMaterialUrls.value) {
    const role = normalizeCarAssetRole(carSceneImageAssetRoleByUrl.value[url])
    if (role) {
      providedRoles.add(role)
    }
  }

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
  const groups = groupStoryboardShots(
    storyboardShotsForRecommendation.value,
    selectedSeedanceModel.value.maxDuration,
  )
  if (groups.length > 0) {
    groups.forEach((group, idx) => {
      const title = `段落 ${idx + 1}`
      const visualPrompt = storyboardGroupVisualText(group, idx, groups.length)
      carSceneRolePriority(title, visualPrompt, idx).forEach(pushRole)
    })
  } else {
    for (let idx = 0; idx < carSegmentCount.value; idx += 1) {
      ;(CAR_SCENE_ROLE_PRIORITY[idx] || CAR_SCENE_ROLE_PRIORITY[0]).forEach(pushRole)
    }
  }
  carStoryboardFunctionReferenceRows.value.forEach((row) => {
    row.roles.forEach(pushRole)
  })
  if (!roles.some((role) => CAR_IDENTITY_ANCHOR_ROLES.includes(role))) {
    CAR_IDENTITY_ANCHOR_ROLES.slice(0, 2).forEach(pushRole)
  }
  return roles
})
const carStoryboardFunctionReferenceRows = computed(() => {
  const rawText = [
    carStoryboardContext.value,
    ...storyboardShotsForRecommendation.value.flatMap((shot) => [
      shot.page,
      shot.visualPrompt,
      shot.prompt,
      shot.camera,
      shot.cameraMotion,
      shot.movement,
      shot.shotType,
      shot.framing,
      shot.composition,
      shot.highlight,
    ]),
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase()
  if (!rawText.trim()) {
    return []
  }
  const providedRoles = collectProvidedCarMaterialRoles()
  return CAR_FUNCTION_REFERENCE_HINTS
    .filter((item) => item.keywords.some((keyword) => rawText.includes(keyword.toLowerCase())))
    .map((item) => {
      const roleLabels = item.roles.map(carRoleLabel)
      const missingLabels = item.roles.filter((role) => !providedRoles.has(role)).map(carRoleLabel)
      return {
        ...item,
        roleLabels,
        missingLabels,
      }
    })
})
const carStoryboardFunctionMissingLabels = computed(() => {
  const set = new Set<string>()
  carStoryboardFunctionReferenceRows.value.forEach((row) => {
    row.missingLabels.forEach((label) => set.add(label))
  })
  return [...set]
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
  if (isMultiCarCompareMode.value) {
    return `已进入多车型对比：${orderedCompareCarPackages.value.length} 个车型包会按章节强隔离参考图，对比镜头只使用明确绑定的车型锚点图。`
  }
  const labels = carStoryboardNeededVehicleRoleLabels.value
  const prefix = labels.length
    ? `当前分镜建议优先准备：${labels.join('、')}`
    : '建议按分镜会出现的车身、内饰和细节部位准备素材'
  return `${prefix}。生成时会先合并相邻短分镜，再按每个连续段落从素材包中取对应部位，Seedance2 单段最多使用 ${SEEDANCE2_MAX_REFERENCE_IMAGES} 张参考图。`
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
  if (usesAutoTtsVoiceover()) return 'ok'
  if (usesModelNativeVoiceover()) return 'ok'
  return 'neutral'
})
const carVoicePolicyTitle = computed(() => {
  if (hasSelectedVoiceAudio()) return '口播主控：已选择口播音频'
  if (usesAutoTtsVoiceover()) return '口播主控：后期旁白配音'
  if (usesModelNativeVoiceover()) return '口播主控：音视频同步生成'
  return '口播主控：未设置口播音频'
})
const carVoicePolicyDescription = computed(() => {
  if (hasSelectedVoiceAudio()) {
    if (carAudioMode.value === 'reference') {
      return '本次将用口播音频控制内容、节奏和字幕；BGM 只作为背景音乐。'
    }
    return '本次将先生成画面，再用口播音频替换或混入最终音轨；BGM 不参与口播、字幕或口型。'
  }
  if (usesAutoTtsVoiceover()) {
    return `本次将先生成无口播画面，再生成统一旁白，并以旁白音频为主控；背景音乐只在用户选择后混入。风格：${carNativeVoiceStyleSummary.value}。`
  }
  if (usesModelNativeVoiceover()) {
    if (carAudioMode.value === 'model_native') return `模型原生口播镜头：视频模型同时生成画面和口播，适合正脸口播、销售顾问出镜和需要嘴型的镜头；自动字幕会跟随实际音轨识别，BGM 只在用户选择后后期混入。风格：${carNativeVoiceStyleSummary.value}。`
    if (isMultiCarCompareMode.value) {
      return `将按多车型对比结构生成画面；多段成片会由后端使用单条统一口播音轨，并按分镜总时长自动调整语速。风格：${carNativeVoiceStyleSummary.value}。`
    }
    if (carVoiceTextSource.value === 'benchmark' && carBenchmarkVoiceText.value.trim()) {
      return `将按爆款对标文案生成画面；多段成片会由后端使用单条统一口播音轨，并按分镜总时长自动调整语速。风格：${carNativeVoiceStyleSummary.value}。`
    }
    if (carVoiceTextSource.value === 'manual' && carVoiceContext.value.trim()) {
      return `已检测到手写口播文案；多段成片会由后端使用单条统一口播音轨，并按分镜总时长自动调整语速。风格：${carNativeVoiceStyleSummary.value}。`
    }
    return `未上传口播音频；系统会整理口播文案，多段成片会由后端使用单条统一口播音轨，并按分镜总时长自动调整语速。风格：${carNativeVoiceStyleSummary.value}。`
  }
  if (carBgmUrl.value.trim()) {
    return '当前只选择了 BGM；BGM 不会作为口播、字幕或口型来源。'
  }
  return '当前选择不使用口播音频；生成会以画面和车辆信息为主，BGM 仍只作为背景音乐。'
})

const storyboardShotsForRecommendation = computed(() => extractStoryboardShots(carStoryboardContext.value))
const storyboardDurationSeconds = computed(() => storyboardTotalDuration(storyboardShotsForRecommendation.value))
const storyboardShotGroupsForRecommendation = computed(() =>
  groupStoryboardShots(storyboardShotsForRecommendation.value, selectedSeedanceModel.value.maxDuration),
)
const storyboardTimingSignature = computed(() =>
  storyboardShotsForRecommendation.value
    .map((shot, idx) => `${idx + 1}:${shot.order}:${shot.time || ''}:${shot.content || ''}`)
    .join('|'),
)
const maxStoryboardSegmentDurationRaw = computed(() => {
  const durations = storyboardShotsForRecommendation.value
    .map((shot) => parseStoryboardDurationRaw(shot.time))
    .filter((value): value is number => typeof value === 'number' && value > 0)
  return durations.length ? Math.max(...durations) : null
})
const carRecommendedSegmentCount = computed(() => {
  if (isMultiCarCompareMode.value) {
    const packageCount = orderedCompareCarPackages.value.length
    return Math.max(4, Math.min(12, packageCount <= 4 ? packageCount * 2 + 3 : packageCount + 3))
  }
  if (carAudioMode.value === 'reference' && carAudioUrl.value.trim()) {
    return 1
  }
  const groupedShotCount = storyboardShotGroupsForRecommendation.value.length
  const audioCount = carAudioDurationSeconds.value && carAudioDurationSeconds.value > 0
    ? Math.max(1, Math.min(12, Math.ceil(carAudioDurationSeconds.value / selectedSeedanceModel.value.maxDuration)))
    : 0
  if (groupedShotCount > 0) {
    return Math.max(1, Math.min(12, Math.max(groupedShotCount, audioCount || 1)))
  }
  if (carAudioDurationSeconds.value && carAudioDurationSeconds.value > 0) {
    return audioCount
  }
  return Math.max(1, Math.min(12, carSegmentCount.value || 4))
})
const carRecommendedSegmentDurations = computed(() => {
  const count = carRecommendedSegmentCount.value
  if (isMultiCarCompareMode.value) {
    return Array.from({ length: count }, (_, idx) => clampCarSegmentDuration(idx === 0 ? 5 : idx >= count - 2 ? 6 : 7))
  }
  if (carAudioMode.value === 'reference' && carAudioDurationSeconds.value) {
    return [clampCarSegmentDuration(Math.ceil(carAudioDurationSeconds.value))]
  }
  const groups = storyboardShotGroupsForRecommendation.value
  if (groups.length > 0) {
    const durations = groups.map((group) => clampCarSegmentDuration(group.duration))
    if (durations.length === count) {
      return durations
    }
    const total = carAudioDurationSeconds.value && carAudioDurationSeconds.value > sumDurations(durations)
      ? Math.ceil(carAudioDurationSeconds.value)
      : sumDurations(durations)
    return distributeDurationAcrossSegments(total, count)
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
  if (isMultiCarCompareMode.value) {
    reasons.push(`多车型对比已选择 ${orderedCompareCarPackages.value.length} 个车型包`)
    reasons.push(`固定维度：${compareDimensionList.value.join('、')}`)
  }
  const shotCount = storyboardShotsForRecommendation.value.length
  if (shotCount > 0) {
    const groupCount = storyboardShotGroupsForRecommendation.value.length || shotCount
    reasons.push(`已选分镜包含 ${shotCount} 个镜头，已合并为 ${groupCount} 个连续段落`)
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
const carRecommendationSignature = computed(() => [
  multiCarCompareEnabled.value ? orderedCompareCarPackages.value.map((pkg) => `${pkg.localId}:${pkg.brandModel}:${pkg.role}`).join(',') : '',
  compareDimensionList.value.join(','),
  storyboardTimingSignature.value,
  selectedModel.value,
  carAudioDurationSeconds.value || '',
  carAudioMode.value,
].join('|'))
const carSegmentDurationSummary = computed(() =>
  `总约 ${carTotalDuration.value} 秒（${formatDurationList(normalizedCarSegmentDurations.value)}）`,
)
const carSegmentCountHint = computed(() =>
  storyboardShotsForRecommendation.value.length
    ? '有分镜时按镜头时长和模型上限决定实际生成组，短镜头不会被分段数量强拆'
    : '会按素材、口播内容和模型上限推荐，可在这里最终确认',
)
const carSegmentDurationPanelHint = computed(() =>
  carSegmentTimingTouched.value
    ? '已按手动设置提交，分镜变化后会重新推荐'
    : storyboardShotsForRecommendation.value.length
    ? '已按分镜时长智能合并为连续段落，可逐段微调'
    : '没有分镜时间时使用默认均匀时长，可逐段调整',
)
const carSegmentTimingNotice = computed(() => {
  const rawMax = maxStoryboardSegmentDurationRaw.value
  if (rawMax && rawMax > selectedSeedanceModel.value.maxDuration) {
    return `部分分镜超过 ${selectedSeedanceModel.value.maxDuration} 秒，已按当前模型单段上限截断；更长镜头建议拆成多个分镜。`
  }
  if (storyboardShotsForRecommendation.value.length) {
    if (storyboardShotGroupsForRecommendation.value.length < storyboardShotsForRecommendation.value.length) {
      return '相邻短镜头会在模型时长上限内合并成一段生成，减少拼接割裂；你手动调整后，提交时会按这里的段落时长生成。'
    }
    return '分镜时间变化后会重新给出推荐段落；你手动调整后，提交时会按这里的每段时长生成。'
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
  () => carRecommendationSignature.value,
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
        carAudioMode.value = 'auto_tts'
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

watch(
  () => carNativeVoiceLanguage.value,
  (language) => {
    if (usesGeneratedVoiceover()) {
      carSubtitleLanguage.value = language
    }
  },
)

watch(
  () => carSubtitleMode.value,
  (mode) => {
    if (mode === 'custom' && carSubtitleTimingMode.value === 'audio_recognition') {
      carSubtitleTimingMode.value = 'script_timeline'
    }
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
    const hasMaterial = isMultiCarCompareMode.value ? orderedCompareCarPackages.value.length >= 2 : carImageUrls.value.length > 0
    return hasMaterial && carGenerationBlockingMessages.value.length === 0
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
  return CAR_MATERIAL_TARGETS.some((item) => item.role === aliased) || CAR_WORKFLOW_ASSET_ROLES.includes(aliased)
    ? aliased
    : ''
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
  const assetType = String(asset.assetType || '').trim().toUpperCase()
  const source = metadata ? firstRecordText(metadata, ['source']) : ''
  const name = [
    asset.fileName,
    metadata ? firstRecordText(metadata, ['originalFileName', 'title', 'sourceTitle']) : '',
  ].filter(Boolean).join(' ').toLowerCase()

  if (assetType === 'JSON') {
    if (name.includes('车型素材包') || name.includes('car_model_bundle') || name.includes('car model bundle')) return 'car_model_bundle'
    if (name.includes('分镜') || name.includes('storyboard')) return 'storyboard_json'
    if (name.includes('爆款') || name.includes('对标') || name.includes('benchmark')) return 'benchmark_json'
  }
  if (assetType === 'TEXT') {
    if (name.includes('爆款') || name.includes('对标') || name.includes('benchmark') || sourceType.includes('DOUYIN')) return 'benchmark_json'
    if (name.includes('口播') || name.includes('文案') || name.includes('script')) return 'voice_script'
  }
  if (assetType === 'AUDIO') {
    if (name.includes('bgm') || name.includes('背景音乐') || name.includes('music')) return 'bgm'
    return 'voiceover'
  }
  if (assetType === 'VIDEO') {
    if (sourceType === 'DIGITAL_HUMAN_GENERATE' || name.includes('数字人') || name.includes('host') || name.includes('avatar')) return 'host_video'
    return 'material_video'
  }
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
  if (name.includes('dashboard') || name.includes('interior') || name.includes('内饰') || name.includes('中控') || name.includes('仪表')) return 'car_interior_dashboard'
  if (name.includes('front_seat') || name.includes('前排')) return 'car_interior_front_seat'
  if (name.includes('back_seat') || name.includes('rear_seat') || name.includes('后排')) return 'car_interior_back_seat'
  if (name.includes('steering') || name.includes('方向盘')) return 'car_interior_steering'
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

function compareCarRoleLabel(role: string) {
  return COMPARE_CAR_ROLE_OPTIONS.find((item) => item.value === role)?.label || '对比'
}

function parseCarBundleText(text: string) {
  const parsed = JSON.parse(text) as unknown
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('车型素材包格式不正确')
  }
  const bundle = parsed as Record<string, unknown>
  const images = Array.isArray(bundle.images) ? bundle.images : []
  const vehicleImages: CarBundleImageEntry[] = []
  const sceneImages: CarBundleImageEntry[] = []
  for (const raw of images) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue
    const item = raw as Record<string, unknown>
    const url = firstRecordText(item, ['url', 'fileUrl', 'previewUrl', 'imageUrl'])
    if (!url) continue
    const role = normalizeCarAssetRole(firstRecordText(item, ['role', 'assetRole', 'type']))
    const assetId = toPositiveNumber(item.assetId)
    const entry: CarBundleImageEntry = {
      url,
      role,
      assetId: assetId || undefined,
      label: firstRecordText(item, ['label', 'name', 'roleName']) || (role ? carRoleLabel(role) : ''),
      fileName: firstRecordText(item, ['fileName', 'name']) || url.split('/').pop() || '',
    }
    if (CAR_SCENE_REFERENCE_ROLES.includes(role)) {
      sceneImages.push(entry)
    } else {
      vehicleImages.push(entry)
    }
  }
  if (!vehicleImages.length) {
    throw new Error('车型素材包内没有可用图片')
  }
  const brandModel = typeof bundle.brandModel === 'string' ? bundle.brandModel.trim() : ''
  const color = typeof bundle.color === 'string' ? bundle.color.trim() : ''
  const sellingPoints = firstRecordText(bundle, ['sellingPoints', 'sellingPoint', 'highlights', 'notes'])
  return {
    bundle,
    brandModel,
    color,
    sellingPoints,
    vehicleImages,
    sceneImages,
  }
}

async function handleCarBundleAssetSelect(payload: { asset: AssetItem; url: string }) {
  carBundleAssetUrl.value = payload.url
  carBundleAssetId.value = payload.asset.assetId
  carBundleLoadedName.value = payload.asset.fileName || ''
  carBundleImageCount.value = 0
  carBundleLoadError.value = ''
  try {
    const text = await getAssetTextContent(payload.asset)
    const nextImages: string[] = []
    const nextIds: Record<string, number> = {}
    const nextRoles: Record<string, string> = {}
    const nextSceneImages: string[] = []
    const nextSceneIds: Record<string, number> = {}
    const nextSceneRoles: Record<string, string> = {}
    const parsed = parseCarBundleText(text)
    for (const image of parsed.vehicleImages) {
      if (nextImages.length >= MAX_REFERENCE) continue
      nextImages.push(image.url)
      if (image.assetId) {
        nextIds[image.url] = image.assetId
      }
      if (image.role) {
        nextRoles[image.url] = image.role
      }
    }
    for (const image of parsed.sceneImages) {
      if (nextSceneImages.length >= MAX_REFERENCE) continue
      nextSceneImages.push(image.url)
      if (image.assetId) {
        nextSceneIds[image.url] = image.assetId
      }
      if (image.role) {
        nextSceneRoles[image.url] = image.role
      }
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
    if (parsed.brandModel) {
      carBrandModel.value = parsed.brandModel
      carBundleLoadedName.value = parsed.brandModel
    }
    carBundleImageCount.value = nextImages.length + nextSceneImages.length
    carPickedImageUrl.value = nextImages[0] || ''
    ElMessage.success('已载入车型素材包')
  } catch (error) {
    carBundleLoadError.value = error instanceof Error ? error.message : '车型素材包读取失败'
    errorMessage.value = error instanceof Error ? error.message : '车型素材包读取失败'
  }
}

function materialCompletenessText(images: CarBundleImageEntry[], sceneImages: CarBundleImageEntry[]) {
  const roles = new Set([...images, ...sceneImages].map((item) => item.role).filter(Boolean))
  const coreRoles = [
    'car_exterior_front',
    'car_exterior_side',
    'car_interior_dashboard',
    'car_interior_front_seat',
  ]
  const covered = coreRoles.filter((role) => roles.has(role)).length
  if (covered >= coreRoles.length) return '核心素材完整'
  if (images.length >= 4) return '基础素材可用'
  return '素材偏少，建议补图'
}

function reindexCompareCarPackages() {
  compareCarPackages.value = compareCarPackages.value.map((pkg, idx) => ({
    ...pkg,
    carIndex: idx,
    role: idx === 0 && pkg.role === 'compare' ? 'main' : pkg.role,
  }))
}

async function handleCompareCarBundleAssetSelect(payload: { asset: AssetItem; url: string }) {
  compareBundlePickedUrl.value = payload.url
  compareBundleLoadError.value = ''
  multiCarCompareEnabled.value = true
  try {
    const text = await getAssetTextContent(payload.asset)
    const parsed = parseCarBundleText(text)
    const exists = compareCarPackages.value.some((pkg) =>
      (pkg.packageAssetId && pkg.packageAssetId === payload.asset.assetId) || pkg.packageAssetUrl === payload.url,
    )
    if (exists) {
      ElMessage.warning('该车型素材包已在对比列表中')
      return
    }
    const nextIndex = compareCarPackages.value.length
    const packageName = parsed.brandModel || payload.asset.fileName || `车型 ${nextIndex + 1}`
    compareCarPackages.value = [
      ...compareCarPackages.value,
      {
        localId: `car-pkg-${payload.asset.assetId || Date.now()}-${nextIndex}`,
        packageAssetId: payload.asset.assetId,
        packageAssetUrl: payload.url,
        packageName,
        carIndex: nextIndex,
        role: nextIndex === 0 ? 'main' : 'compare',
        brandModel: parsed.brandModel || packageName,
        color: parsed.color,
        sellingPoints: parsed.sellingPoints,
        materialCompleteness: materialCompletenessText(parsed.vehicleImages, parsed.sceneImages),
        images: parsed.vehicleImages,
        sceneImages: parsed.sceneImages,
      },
    ]
    reindexCompareCarPackages()
    if (!carBrandModel.value.trim()) {
      carBrandModel.value = compareCarPackages.value.map((pkg) => pkg.brandModel || pkg.packageName).join(' vs ')
    }
    ElMessage.success('已加入对比车型')
  } catch (error) {
    compareBundleLoadError.value = error instanceof Error ? error.message : '车型素材包读取失败'
    errorMessage.value = compareBundleLoadError.value
  }
}

function moveCompareCarPackage(index: number, direction: -1 | 1) {
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= compareCarPackages.value.length) return
  const next = compareCarPackages.value.slice()
  const [item] = next.splice(index, 1)
  next.splice(nextIndex, 0, item)
  compareCarPackages.value = next
  reindexCompareCarPackages()
}

function removeCompareCarPackage(index: number) {
  compareCarPackages.value = compareCarPackages.value.filter((_, idx) => idx !== index)
  reindexCompareCarPackages()
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
  carStoryboardUploadName.value = payload.asset.fileName || ''
  try {
    const text = await getAssetTextContent(payload.asset)
    carStoryboardContext.value = text.length > 4000 ? text.slice(0, 4000) : text
    const shots = extractStoryboardShots(carStoryboardContext.value)
    if (shots.length > 0) {
      applyCarRecommendation(false)
      const groups = groupStoryboardShots(shots, selectedSeedanceModel.value.maxDuration)
      ElMessage.success(
        groups.length < shots.length
          ? `已载入分镜，${shots.length} 个镜头将智能合并为 ${groups.length} 个连续段落`
          : '已载入分镜，视频制作会按当前模型时长自动规划段落',
      )
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
  carSyncStrategy.value = 'audio_master'
  if (carAudioMode.value === 'none' || carAudioMode.value === 'model_native' || carAudioMode.value === 'auto_tts') {
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
    carSyncStrategy.value = 'audio_master'
    if (carAudioMode.value === 'none' || carAudioMode.value === 'model_native' || carAudioMode.value === 'auto_tts') {
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
  carHostImageUploadName.value = payload.asset.fileName || ''
}

function handleCarMaterialVideoAssetSelect(payload: { asset: AssetItem; url: string }) {
  carMaterialVideoUrl.value = payload.url
  carMaterialVideoAssetId.value = payload.asset.assetId
  carMaterialVideoUploadName.value = payload.asset.fileName || ''
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

function parseStoryboardDurationRaw(time: string) {
  const plain = time.match(/^\s*(\d+(?:\.\d+)?)\s*(?:s|sec|secs|second|seconds|秒)?\s*$/i)
  if (plain) {
    const seconds = Math.round(Number(plain[1]))
    return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined
  }
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

function storyboardShotEstimatedDuration(shot: VideoScriptShotItem) {
  const explicit = parseStoryboardDurationRaw(shot.time)
  if (explicit) return explicit
  const narration = [shot.content, shot.highlight].filter(Boolean).join('')
  if (narration.trim()) {
    const cjk = /[\u4e00-\u9fff]/.test(narration)
    const seconds = Math.ceil(narration.length / (cjk ? 7 : 14))
    return Math.max(4, Math.min(selectedSeedanceModel.value.maxDuration, seconds))
  }
  return Math.min(5, selectedSeedanceModel.value.maxDuration)
}

function makeStoryboardGroup(shots: VideoScriptShotItem[], startIndex: number): StoryboardShotGroup {
  const total = shots.reduce((sum, shot) => sum + storyboardShotEstimatedDuration(shot), 0)
  return {
    shots,
    startIndex,
    duration: clampCarSegmentDuration(total),
  }
}

function reindexStoryboardGroups(groups: StoryboardShotGroup[]) {
  let cursor = 0
  return groups.map((group) => {
    const next = makeStoryboardGroup(group.shots, cursor)
    cursor += group.shots.length
    return next
  })
}

function splitStoryboardGroupsToCount(groups: StoryboardShotGroup[], desiredCount: number) {
  const result = groups.map((group) => ({ ...group, shots: group.shots.slice() }))
  while (result.length < desiredCount) {
    const splitIndex = result
      .map((group, idx) => ({ idx, count: group.shots.length }))
      .filter((item) => item.count > 1)
      .sort((a, b) => b.count - a.count)[0]?.idx
    if (splitIndex == null) break
    const group = result[splitIndex]
    const mid = Math.ceil(group.shots.length / 2)
    result.splice(
      splitIndex,
      1,
      makeStoryboardGroup(group.shots.slice(0, mid), group.startIndex),
      makeStoryboardGroup(group.shots.slice(mid), group.startIndex + mid),
    )
  }
  return reindexStoryboardGroups(result)
}

function mergeStoryboardGroupsToCount(groups: StoryboardShotGroup[], desiredCount: number, maxDuration: number) {
  const result = groups.map((group) => ({ ...group, shots: group.shots.slice() }))
  while (result.length > desiredCount) {
    let merged = false
    for (let idx = 0; idx < result.length - 1; idx += 1) {
      const combinedShots = result[idx].shots.concat(result[idx + 1].shots)
      const combinedDuration = combinedShots.reduce((sum, shot) => sum + storyboardShotEstimatedDuration(shot), 0)
      if (combinedDuration <= maxDuration) {
        result.splice(idx, 2, makeStoryboardGroup(combinedShots, result[idx].startIndex))
        merged = true
        break
      }
    }
    if (!merged) break
  }
  return reindexStoryboardGroups(result)
}

function groupStoryboardShots(shots: VideoScriptShotItem[], maxDuration: number, desiredCount?: number) {
  const max = Math.max(4, Math.round(maxDuration || selectedSeedanceModel.value.maxDuration || 15))
  if (!shots.length) return []
  const groups: StoryboardShotGroup[] = []
  let current: VideoScriptShotItem[] = []
  let currentStart = 0
  let currentDuration = 0
  shots.forEach((shot, idx) => {
    const duration = Math.max(1, storyboardShotEstimatedDuration(shot))
    if (current.length && currentDuration + duration > max) {
      groups.push(makeStoryboardGroup(current, currentStart))
      current = []
      currentDuration = 0
      currentStart = idx
    }
    current.push(shot)
    currentDuration += duration
  })
  if (current.length) {
    groups.push(makeStoryboardGroup(current, currentStart))
  }
  const count = desiredCount == null ? groups.length : normalizeCarSegmentCount(desiredCount)
  if (count > groups.length) {
    return splitStoryboardGroupsToCount(groups, count)
  }
  if (count < groups.length) {
    return mergeStoryboardGroupsToCount(groups, count, max)
  }
  return reindexStoryboardGroups(groups)
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

function buildCarGenerationGroupPreview(scenes: CarSalesSceneDraft[]): CarGenerationGroupPreview[] {
  const maxDuration = selectedSeedanceModel.value.maxDuration
  const usable = scenes
    .map((scene, idx) => ({
      scene,
      sourceIndex: scene.segmentIndex || idx + 1,
      duration: carSceneDraftPlanningDuration(scene),
    }))
    .filter((item) => hasCarSceneDraftContent(item.scene))
  const groups: CarScenePlanningItem[][] = []
  let current: CarScenePlanningItem[] = []
  let currentDuration = 0
  for (const item of usable) {
    if (
      current.length > 0 &&
      (currentDuration + item.duration > maxDuration || !canMergeCarSceneDraftGroup(current, item))
    ) {
      groups.push(current)
      current = []
      currentDuration = 0
    }
    current.push(item)
    currentDuration += item.duration
  }
  if (current.length > 0) {
    groups.push(current)
  }
  return groups.slice(0, 12).map((group, idx) => {
    const first = group[0]?.scene
    const sourceIndexes = group.map((item) => item.sourceIndex)
    const duration = clampCarSegmentDuration(group.reduce((sum, item) => sum + item.duration, 0))
    const titles = group.map((item, localIdx) => item.scene.title || `片段 ${item.sourceIndex || localIdx + 1}`)
    const referenceCount = new Set(group.flatMap((item) => [
      ...(item.scene.imageUrls || []),
      item.scene.referenceImage || '',
    ].filter(Boolean))).size
    return {
      groupIndex: idx + 1,
      sourceIndexes,
      titles,
      duration,
      referenceCount,
      carLabel: carSceneDraftCarLabel(first),
      compareDimension: first?.compareDimension || '',
      shotPurpose: first?.shotPurpose || '',
    }
  })
}

function hasCarSceneDraftContent(scene: CarSalesSceneDraft) {
  return Boolean(
    scene &&
      (
        scene.visualPrompt?.trim() ||
        scene.prompt?.trim() ||
        scene.title?.trim() ||
        scene.voiceText?.trim()
      ),
  )
}

function carSceneDraftPlanningDuration(scene: CarSalesSceneDraft) {
  const raw = Number(scene.duration)
  if (Number.isFinite(raw) && raw > 0) {
    return Math.max(1, Math.min(selectedSeedanceModel.value.maxDuration, Math.round(raw)))
  }
  return Math.min(5, selectedSeedanceModel.value.maxDuration)
}

function canMergeCarSceneDraftGroup(current: CarScenePlanningItem[], next: CarScenePlanningItem) {
  if (!current.length) {
    return true
  }
  return carSceneDraftIsolationKey(current[0].scene) === carSceneDraftIsolationKey(next.scene)
}

function carSceneDraftIsolationKey(scene: CarSalesSceneDraft) {
  const carPackageId = normalizePreviewKey(scene.carPackageId)
  const carIndex = scene.carIndex == null ? '' : String(scene.carIndex)
  const shotPurpose = normalizePreviewKey(scene.shotPurpose)
  const compareDimension = normalizePreviewKey(scene.compareDimension)
  if (!carPackageId && !carIndex && !shotPurpose) {
    return 'default'
  }
  if (shotPurpose) {
    return `${carPackageId}|${carIndex}|${shotPurpose}`
  }
  return `${carPackageId}|${carIndex}|${compareDimension}`
}

function normalizePreviewKey(value?: string) {
  return value?.trim().toLowerCase() || ''
}

function carSceneDraftCarLabel(scene?: CarSalesSceneDraft) {
  if (!scene || scene.carIndex == null) {
    return ''
  }
  const role = scene.carRole ? ` / ${compareCarRoleLabel(scene.carRole as CompareCarRole)}` : ''
  return `车型 ${scene.carIndex + 1}${role}`
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

function storyboardShotSourceText(shot: VideoScriptShotItem, includeVoice = false) {
  return [
    shot.page,
    shot.visualPrompt,
    shot.prompt,
    shot.highlight,
    includeVoice ? shot.content : '',
    shot.camera,
    shot.cameraMotion,
    shot.movement,
    shot.shotType,
    shot.framing,
    shot.composition,
    shot.transition,
  ].filter(Boolean).join(' ')
}

function storyboardShotVoiceText(shot: VideoScriptShotItem) {
  const text = sanitizeSpeechText(shot.content)
  if (!text || /^(无|none|null|n\/a|na|-|—)$/i.test(text)) {
    return ''
  }
  return text
}

function storyboardGroupVoiceText(group: StoryboardShotGroup) {
  const lines = group.shots
    .map(storyboardShotVoiceText)
    .filter(Boolean)
  return joinSpeechLines(lines)
}

function joinSpeechLines(lines: string[]) {
  return lines.reduce((current, line) => joinVoiceChunk(current, line), '')
}

function storyboardHasHumanDescription(text: string) {
  return countHumanDescriptionHits(text) > 0
}

function storyboardHumanPolicyText(sourceText: string) {
  if (!storyboardHasHumanDescription(sourceText)) {
    return carHostAppearanceEnabled.value
      ? '人物处理=原分镜未检测到明确人物出镜，若开启虚拟人物，只在需要讲解/邀约的镜头边侧弱出镜，避免硬塞人物。'
      : '人物处理=无明确人物出镜，保持车辆和场景为主。'
  }
  return carHostAppearanceEnabled.value
    ? '人物处理=保留原分镜的人物站位、动作和出镜节奏；人物身份、人脸和服装以当前数字人形象/设置为准。'
    : '人物处理=忽略原分镜人物、主播、客户、路人和手部，只保留镜头运动、景别、构图和车辆/场景展示节奏。'
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
    storyboardHumanPolicyText(text),
    `节奏=${pacing}`,
    `转场=${transition}`,
  ].join('；')
}

function shouldExposeStoryboardVoiceText() {
  return usesGeneratedVoiceover() && carVoiceTextSource.value === 'auto' && !strictVoiceTextForRequest()
}

function storyboardVisualText(shot: VideoScriptShotItem, idx: number, includeVoiceReference = shouldExposeStoryboardVoiceText()) {
  const sourceText = storyboardShotSourceText(shot)
  const pieces = [`镜头${shot.order || idx + 1}`]
  if (shot.time) pieces.push(`时间 ${shot.time}`)
  pieces.push(`镜头意图 ${storyboardIntentText(sourceText)}`)
  pieces.push(`导演执行 ${storyboardShotPlanText(sourceText, idx, carSegmentCount.value)}`)
  const voice = storyboardShotVoiceText(shot)
  if (includeVoiceReference && voice) {
    pieces.push(`原分镜台词参考 ${voice}`)
  }
  return pieces.join('；')
}

function storyboardGroupVisualText(group: StoryboardShotGroup, groupIndex: number, totalGroups: number) {
  const orders = group.shots.map((shot, idx) => shot.order || group.startIndex + idx + 1)
  const rangeText = orders.length === 1 ? `${orders[0]}` : orders.join('、')
  const lines = [
    `段落${groupIndex + 1}/${Math.max(1, totalGroups)}，合并原分镜 ${rangeText}，总时长约 ${group.duration} 秒`,
    carHostAppearanceEnabled.value
      ? '请在同一条视频内连续完成这些子镜头，主体车辆、数字人站位、场景、光线和运动方向保持一致；数字人只在分镜需要人物或讲解时自然出现，不要硬塞。'
      : '请在同一条视频内连续完成这些子镜头，主体车辆、场景、光线和运动方向保持一致；忽略原分镜人物，只保留镜头节奏，不要像多条视频硬拼接。',
  ]
  group.shots.forEach((shot, idx) => {
    lines.push(`子镜头${idx + 1}：${storyboardVisualText(shot, group.startIndex + idx)}`)
  })
  if (strictVoiceTextForRequest() && group.shots.some((shot) => storyboardShotVoiceText(shot))) {
    lines.push('口播编排：仅参考原分镜台词的段落位置和长短来分配当前文案，不传入原分镜台词原文。')
  }
  return lines.join('\n')
}

function summarizeStoryboardForPrompt(raw: string) {
  const shots = extractStoryboardShots(raw)
  if (!shots.length) {
    const sourceText = strictVoiceTextForRequest() ? stripStoryboardVoiceReferenceText(raw) : raw
    return `镜头意图 ${storyboardIntentText(sourceText)}；导演执行 ${storyboardShotPlanText(sourceText, 0, 1)}`
  }
  return shots.map((shot, idx) => storyboardVisualText(shot, idx)).join('\n')
}

function stripStoryboardVoiceReferenceText(value: string) {
  return value
    .replace(/[；;]?\s*(原分镜台词参考|原分镜台词|旧台词|台词参考|本段口播台词|口播台词)\s*[:：]?\s*[^\n\r]*/g, '')
    .replace(/["']?(content|voiceText|narration|voiceover|script|subtitle)["']?\s*[:：]\s*("([^"\\]|\\.)*"|'([^'\\]|\\.)*'|[^,，。\n\r}]+)/gi, '')
}

function hasSelectedVoiceAudio() {
  return carAudioMode.value !== 'none' && !!carAudioUrl.value.trim()
}

function usesModelNativeVoiceover() {
  return carAudioMode.value === 'model_native' && !carAudioUrl.value.trim()
}

function usesAutoTtsVoiceover() {
  return carAudioMode.value === 'auto_tts' && !carAudioUrl.value.trim()
}

function usesGeneratedVoiceover() {
  return usesModelNativeVoiceover() || usesAutoTtsVoiceover()
}

function buildAutoCarVoiceText() {
  if (isMultiCarCompareMode.value) {
    return buildAutoMultiCarCompareVoiceText()
  }
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

function buildAutoMultiCarCompareVoiceText() {
  const packages = orderedCompareCarPackages.value
  const names = packages.map((pkg) => pkg.brandModel || pkg.packageName || `车型${pkg.carIndex + 1}`)
  const lines: string[] = []
  lines.push(`今天我们把${names.join('和')}放在同一条视频里对比，先逐一看重点，再给出购买建议。`)
  packages.forEach((pkg, idx) => {
    const name = pkg.brandModel || pkg.packageName || `第${idx + 1}款车`
    const color = pkg.color ? `，这台是${pkg.color}` : ''
    const points = pkg.sellingPoints || (idx === 0 ? carSellingPoints.value.trim() : '')
    lines.push(`${name}${color}，定位是${compareCarRoleLabel(pkg.role)}车型，${points ? `重点看${points}` : '重点看外观、空间和配置表现'}。`)
  })
  lines.push(`对比维度主要看${compareDimensionList.value.join('、')}，每一段都会明确对应车型，避免把两台车的卖点混在一起。`)
  if (carAudience.value.trim()) {
    lines.push(`如果你是${carAudience.value.trim()}，可以重点关注空间、配置和用车成本的取舍。`)
  }
  lines.push(carCallToAction.value.trim() || '想了解哪款更适合你，私信预约试驾和到店权益。')
  return lines.join('')
}

function sanitizeSpeechText(value: string | null | undefined) {
  if (!value) {
    return ''
  }
  const normalized = value
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\r\n?/g, '\n')
  const chars = Array.from(normalized).filter((char) => {
    const code = char.codePointAt(0) || 0
    if (code === 0xfffd) return false
    if (code >= 0xd800 && code <= 0xdfff) return false
    if (code < 32 && char !== '\n' && char !== '\t') return false
    if (code >= 0x7f && code <= 0x9f) return false
    return true
  })
  return chars
    .join('')
    .replace(/[ \t]+/g, ' ')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function modelNativeVoiceTextForRequest() {
  const benchmark = sanitizeSpeechText(carBenchmarkVoiceText.value)
  const manual = sanitizeSpeechText(carVoiceContext.value)
  if (carVoiceTextSource.value === 'benchmark' && benchmark) {
    return benchmark
  }
  if (carVoiceTextSource.value === 'manual' && manual) {
    return manual
  }
  return buildAutoCarVoiceText()
}

function effectiveVoiceTextForRequest() {
  if (hasSelectedVoiceAudio()) {
    return ''
  }
  if (usesGeneratedVoiceover()) {
    return modelNativeVoiceTextForRequest()
  }
  const manual = sanitizeSpeechText(carVoiceContext.value)
  if (manual) {
    return manual
  }
  const benchmark = sanitizeSpeechText(carBenchmarkVoiceText.value)
  if (benchmark) {
    return benchmark
  }
  return ''
}

function strictVoiceTextForRequest() {
  if (hasSelectedVoiceAudio()) {
    return ''
  }
  const benchmark = sanitizeSpeechText(carBenchmarkVoiceText.value)
  const manual = sanitizeSpeechText(carVoiceContext.value)
  if (usesGeneratedVoiceover()) {
    if (carVoiceTextSource.value === 'benchmark' && benchmark) {
      return benchmark
    }
    if (carVoiceTextSource.value === 'manual' && manual) {
      return manual
    }
  }
  return ''
}

function splitVoiceTextForSegments(text: string, total: number) {
  const clean = sanitizeSpeechText(text)
  if (!clean) {
    return []
  }
  const count = Math.max(1, total)
  if (count <= 1) {
    return [clean]
  }
  const clauses = splitSpeechClauses(clean)
  if (clauses.length <= 1) {
    return shouldKeepSpeechUnitWhole(clean) ? [clean] : fitVoiceChunksToCount(splitTextByLength(clean, count), count)
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
  return fitVoiceChunksToCount(chunks, count)
}

function voiceChunksForStoryboardGroups(groups: StoryboardShotGroup[]) {
  const strictText = strictVoiceTextForRequest()
  const chunks = strictText
    ? splitVoiceTextByStoryboardRhythm(strictText, groups)
    : splitVoiceTextForSegments(effectiveVoiceTextPreview.value, groups.length)
  const shouldUseStoryboardVoiceFallback =
    usesGeneratedVoiceover() && carVoiceTextSource.value === 'auto' && !strictText
  return groups.map((group, idx) => {
    const current = chunks[idx]
    if (current) {
      return current
    }
    if (!shouldUseStoryboardVoiceFallback) {
      return undefined
    }
    return storyboardGroupVoiceText(group) || undefined
  })
}

function splitVoiceTextByStoryboardRhythm(text: string, groups: StoryboardShotGroup[]) {
  const clean = sanitizeSpeechText(text)
  const count = Math.max(1, groups.length)
  if (!clean) {
    return []
  }
  if (!groups.some((group) => storyboardGroupVoiceText(group))) {
    return splitVoiceTextForSegments(clean, count)
  }
  const clauses = splitSpeechClauses(clean)
  if (clauses.length <= 1) {
    return splitVoiceTextForSegments(clean, count)
  }
  const weights = groups.map(storyboardGroupVoiceRhythmWeight)
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  if (totalWeight <= 0) {
    return splitVoiceTextForSegments(clean, count)
  }
  const totalTextWeight = clauses.reduce((sum, clause) => sum + speechRhythmWeight(clause), 0)
  const chunks: string[] = []
  let cursor = 0
  let consumedTextWeight = 0
  let consumedGroupWeight = 0
  for (let i = 0; i < count; i += 1) {
    if (cursor >= clauses.length) {
      chunks.push('')
      continue
    }
    if (i === count - 1) {
      chunks.push(joinSpeechLines(clauses.slice(cursor)))
      break
    }
    consumedGroupWeight += weights[i] || 1
    const targetTextWeight = Math.max(1, Math.round((totalTextWeight * consumedGroupWeight) / totalWeight))
    let current = ''
    do {
      const clause = clauses[cursor]
      current = joinVoiceChunk(current, clause)
      consumedTextWeight += speechRhythmWeight(clause)
      cursor += 1
    } while (
      cursor < clauses.length &&
      consumedTextWeight < targetTextWeight &&
      clauses.length - cursor > count - i - 1
    )
    chunks.push(current)
  }
  return fitVoiceChunksToCount(chunks, count)
}

function storyboardGroupVoiceRhythmWeight(group: StoryboardShotGroup) {
  const voiceWeight = group.shots.reduce((sum, shot) => sum + speechRhythmWeight(storyboardShotVoiceText(shot)), 0)
  if (voiceWeight > 0) {
    return voiceWeight
  }
  return Math.max(1, Number(group.duration) || group.shots.length || 1)
}

function speechRhythmWeight(text: string) {
  const clean = sanitizeSpeechText(text)
  if (!clean) {
    return 0
  }
  const latinWords = clean.match(/[A-Za-z0-9'_+-]+/g)?.length || 0
  const compactLength = Array.from(clean.replace(/\s+/g, '')).length
  return Math.max(1, compactLength + latinWords * 2)
}

function fitVoiceChunksToCount(chunks: string[], total: number) {
  const count = Math.max(1, total)
  const clean = chunks.map((item) => sanitizeSpeechText(item)).filter(Boolean)
  if (clean.length <= count) {
    return clean
  }
  const head = clean.slice(0, count - 1)
  const tail = clean.slice(count - 1).reduce((joined, item) => joinVoiceChunk(joined, item), '')
  return tail ? [...head, tail] : head
}

function splitSpeechClauses(text: string) {
  return sanitizeSpeechText(text)
    .split(/(?<=[。！？!?；;，,、.])|\n+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function shouldKeepSpeechUnitWhole(text: string) {
  const clean = sanitizeSpeechText(text)
  if (!clean) {
    return false
  }
  const words = clean.match(/[A-Za-z0-9'_+-]+/g)?.length || 0
  if (words >= 4) {
    return words <= 24 && clean.length <= 180
  }
  return clean.length <= 72
}

function splitTextByLength(text: string, total: number) {
  const clean = sanitizeSpeechText(text)
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
    const end = Math.max(cursor + 1, smartVoiceSplitBoundary(clean, cursor, preferredEnd))
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
    if (isPreferredVoiceBreak(text[i - 1]) && isSafeSpeechBoundary(text, i)) {
      return skipVoiceWhitespace(text, i)
    }
  }
  for (let i = clamped; i <= rightLimit; i += 1) {
    if (isPreferredVoiceBreak(text[i - 1]) && isSafeSpeechBoundary(text, i)) {
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
  return shouldInsertSpeechSpace(left, right) ? `${left} ${right}` : `${left}${right}`
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

function isSafeSpeechBoundary(text: string, index: number) {
  if (index <= 0 || index >= text.length) {
    return true
  }
  const prev = text[index - 1]
  const next = text[index]
  const beforePrev = index >= 2 ? text[index - 2] : ''
  if (isAsciiWordChar(prev) && isAsciiWordChar(next)) {
    return false
  }
  if ((prev === '.' || prev === ',') && isAsciiDigit(beforePrev) && isAsciiDigit(next)) {
    return false
  }
  return true
}

function shouldInsertSpeechSpace(left: string, right: string) {
  const last = left[left.length - 1]
  const first = right[0]
  const beforeLast = left.length >= 2 ? left[left.length - 2] : ''
  if (isAsciiWordChar(last) && isAsciiWordChar(first)) {
    return true
  }
  if ((last === '.' || last === ',') && isAsciiDigit(beforeLast) && isAsciiDigit(first)) {
    return false
  }
  return /[。！？!?；;，,、.:：]/.test(last) && isAsciiWordChar(first)
}

function isAsciiWordChar(char: string | undefined) {
  return !!char && /[A-Za-z0-9'_+-]/.test(char)
}

function isAsciiDigit(char: string | undefined) {
  return !!char && /[0-9]/.test(char)
}

function voiceLanguageStats(text: string) {
  let cjk = 0
  let latin = 0
  for (const char of Array.from(sanitizeSpeechText(text))) {
    if (/\p{Script=Han}/u.test(char)) {
      cjk += 1
    } else if (/[A-Za-z]/.test(char)) {
      latin += 1
    }
  }
  return { cjk, latin }
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
    carIndex: scene.carIndex,
    compareDimension: scene.compareDimension,
    shotPurpose: scene.shotPurpose,
  })),
)
const hasExplicitNativeVoiceText = computed(() => {
  if (carVoiceTextSource.value === 'benchmark') return Boolean(carBenchmarkVoiceText.value.trim())
  if (carVoiceTextSource.value === 'manual') return Boolean(carVoiceContext.value.trim())
  return false
})
const shouldShowNativeVoiceStylePanel = computed(() =>
  usesGeneratedVoiceover() && (hasExplicitNativeVoiceText.value || isMultiCarCompareMode.value),
)
const shouldShowNativeVoiceLanguagePanel = computed(() => usesGeneratedVoiceover())
const shouldShowSceneVoiceStructure = computed(() =>
  shouldShowNativeVoiceStylePanel.value &&
  (Boolean(carStoryboardContext.value.trim()) || isMultiCarCompareMode.value) &&
  carSceneVoiceStructurePreview.value.length > 0,
)

const storyboardIgnoredFields = computed(() => collectStoryboardIgnoredFields(carStoryboardContext.value))
const storyboardHasOldLines = computed(() => storyboardIgnoredFields.value.length > 0)
const storyboardOldLineStatus = computed(() => {
  if (!carStoryboardContext.value.trim()) return '未使用分镜'
  if (storyboardHasOldLines.value && strictVoiceTextForRequest()) return '只作编排节奏'
  if (storyboardHasOldLines.value && usesGeneratedVoiceover() && carVoiceTextSource.value === 'auto') return '用于语义补齐'
  if (storyboardHasOldLines.value) return '仅作画面参考'
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

const carHostHumanEvidence = computed(() => {
  const checks = [
    { label: '分镜描述', text: carStoryboardContext.value },
    { label: '爆款文案', text: carBenchmarkVoiceText.value },
    { label: '补充提示词', text: prompt.value },
    { label: '手写口播文案', text: carVoiceContext.value },
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
  '数字人',
  '虚拟人物',
  '虚拟数字人',
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

const HUMAN_DESCRIPTION_PATTERNS = [
  /\bpresenter\b/i,
  /\bhost\b/i,
  /\bhost\s+image\b/i,
  /\bdigital\s+human\b/i,
  /\bavatar\b/i,
  /\bspokesperson\b/i,
  /\bsales\s+(?:consultant|advisor|presenter|host)\b/i,
  /\bon[-\s]?camera\b/i,
  /\bappear(?:s|ing)?\b/i,
  /\bperson\b/i,
  /\bpeople\b/i,
  /\bhuman\b/i,
  /\bface\b/i,
  /\bhalf[-\s]?body\b/i,
  /\bfull[-\s]?body\b/i,
  /\bstanding\s+beside\b/i,
  /\bstand(?:s|ing)?\s+(?:beside|next\s+to|near)\b/i,
  /\bspeak(?:s|ing)?\s+(?:to|towards|on)\s+(?:the\s+)?camera\b/i,
]

function countHumanDescriptionHits(text: string) {
  const source = text.trim()
  if (!source) {
    return 0
  }
  const keywordHits = HUMAN_DESCRIPTION_KEYWORDS.reduce((total, keyword) => {
    const matches = source.match(new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))
    return total + (matches?.length || 0)
  }, 0)
  const patternHits = HUMAN_DESCRIPTION_PATTERNS.reduce((total, pattern) => total + (pattern.test(source) ? 1 : 0), 0)
  const explicitHostFlag = /"?(?:hostAppearanceEnabled|hasHostAppearance)"?\s*[:=]\s*true/i.test(source) ? 2 : 0
  return keywordHits + patternHits + explicitHostFlag
}

function sourceTypeLabelForAudio(sourceType: string) {
  const normalized = sourceType.trim().toUpperCase()
  if (normalized === 'USER_UPLOAD' || !normalized) return '用户上传音频'
  if (['TTS_GENERATE', 'VOICE_SAMPLE', 'AI_GENERATED'].includes(normalized)) return '声音生成音频'
  return '已选择音频'
}

const carAudioSourceLabel = computed(() => {
  if (!hasSelectedVoiceAudio()) {
    if (usesAutoTtsVoiceover()) return `后期旁白配音（${carNativeVoiceStyleSummary.value}）`
    if (usesModelNativeVoiceover()) return `音视频同步生成（${carNativeVoiceStyleSummary.value}）`
    if (carBgmUrl.value.trim()) return '无（BGM 不作为口播）'
    return '无'
  }
  const audioKind = sourceTypeLabelForAudio(carAudioSourceType.value)
  if (carAudioMode.value === 'reference') return `参考音频生成（${audioKind}）`
  return `后期口播配音（${audioKind}）`
})

const carBgmSourceLabel = computed(() => (carBgmUrl.value.trim() ? '已选择 BGM' : '无'))
const carSubtitleSourceLabel = computed(() => {
  const suffix = storyboardOldLineStatus.value === '用于语义补齐' ? '（分镜台词补齐参考）' : ''
  const language = carSubtitleLanguageOptions.find((item) => item.value === carSubtitleLanguage.value)?.label || '默认语言'
  const timing = carSubtitleTimingOptions.find((item) => item.key === carSubtitleTimingMode.value)?.label || '智能字幕'
  const position = carHeadlinePositionOptions.find((item) => item.value === carSubtitlePosition.value)?.label || '底部'
  const style = `${position} / ${carSubtitleFontSize.value}px`
  if (carSubtitleMode.value === 'off') return '关闭'
  if (carSubtitleMode.value === 'auto') return `后期自动字幕 / ${language} / ${timing} / ${style}${suffix}`
  return sanitizeSpeechText(carSubtitleText.value) ? `后期自定义字幕 / ${language} / ${timing} / ${style}${suffix}` : '后期自定义字幕（未填写）'
})
const carSyncStrategyHint = computed(
  () => carSyncStrategyOptions.find((item) => item.key === carSyncStrategy.value)?.hint || '',
)
const carSubtitleTimingHint = computed(
  () => carSubtitleTimingOptions.find((item) => item.key === carSubtitleTimingMode.value)?.hint || '',
)
const carHeadlineSourceLabel = computed(() => {
  if (!carHeadlineEnabled.value) return '关闭'
  const text = sanitizeSpeechText(carHeadlineText.value)
  const position = carHeadlinePositionOptions.find((item) => item.value === carHeadlinePosition.value)?.label || '顶部'
  return text ? `${position} / ${carHeadlineFontSize.value}px` : '已开启（未填写）'
})

const carVisualSourceLabel = computed(() => {
  const sources: string[] = []
  if (isMultiCarCompareMode.value) {
    sources.push(`${orderedCompareCarPackages.value.length} 个车型素材包`)
  }
  if (prompt.value.trim()) sources.push('用户输入提示词')
  if (carStoryboardContext.value.trim()) sources.push('分镜节奏参考')
  if (!isMultiCarCompareMode.value && carImageUrls.value.length > 0) {
    sources.push(isSeedance2Selected.value ? '参考图 / 车型图' : '车型图')
  }
  sources.push(carHostAppearanceEnabled.value ? '虚拟人物出镜' : '无人物出镜')
  if (carHostAppearanceEnabled.value && carHostImageUrl.value.trim()) sources.push('数字人形象参考')
  return sources.length ? sources.join('、') : '未选择'
})

const carGenerationGroupPreviewRows = computed(() => buildCarGenerationGroupPreview(buildCarSalesScenes()))
const carGenerationSourceSceneCount = computed(() => {
  if (storyboardShotsForRecommendation.value.length > 0) {
    return storyboardShotsForRecommendation.value.length
  }
  return buildCarSalesScenes().length
})
const carGenerationGroupSummary = computed(() => {
  const sourceCount = carGenerationSourceSceneCount.value
  const groupCount = carGenerationGroupPreviewRows.value.length
  const total = sumDurations(carGenerationGroupPreviewRows.value.map((row) => row.duration))
  const sourceLabel = storyboardShotsForRecommendation.value.length > 0 ? '分镜镜头' : '脚本片段'
  return `${sourceLabel} ${sourceCount} 个，实际生成 ${groupCount} 组，总约 ${formatSeconds(total || carSegmentDuration.value)}`
})
const carExecutionSegmentCount = computed(() => plannedCarSceneCount.value || carSegmentCount.value)
const carExecutionDurationSummary = computed(() => {
  const durations = carGenerationGroupPreviewRows.value.map((row) => row.duration)
  if (durations.length > 0) {
    return `总约 ${sumDurations(durations)} 秒（${formatDurationList(durations)}）`
  }
  return carSegmentDurationSummary.value
})

const plannedCarSceneCount = computed(() => {
  return carGenerationGroupPreviewRows.value.length || carSegmentCount.value
})

const carSegmentModeLabel = computed(() => {
  const count = plannedCarSceneCount.value
  if (count === 1) return '单段'
  return `智能分段（${count} 段）`
})

const carGenerationBlockingMessages = computed(() => {
  if (mainTab.value !== 'carSales') return []
  const messages: string[] = []
  if (multiCarCompareEnabled.value && orderedCompareCarPackages.value.length < 2) {
    messages.push('多车型对比至少需要 2 个车型素材包')
  }
  if (multiCarCompareEnabled.value && orderedCompareCarPackages.value.some((pkg) => pkg.images.length === 0)) {
    messages.push('每个对比车型素材包至少需要 1 张车辆图片')
  }
  if (multiCarCompareEnabled.value && orderedCompareCarPackages.value.length > 5) {
    messages.push('多车型对比首期建议最多选择 5 个车型素材包')
  }
  if (carAudioMode.value === 'reference' && !isSeedance2Selected.value) {
    messages.push('参考音频生成仅支持 Seedance 2.0')
  }
  if (carAudioMode.value === 'reference' && plannedCarSceneCount.value > 1) {
    messages.push('当前参考音频生成仅支持单段视频，多段请使用后期口播配音或拆段生成')
  }
  if (usesGeneratedVoiceover() && carVoiceTextSource.value === 'benchmark' && !carBenchmarkVoiceText.value.trim()) {
    messages.push('请先选择或上传爆款对标文案')
  }
  if (carSubtitleMode.value === 'custom' && !sanitizeSpeechText(carSubtitleText.value)) {
    messages.push('请填写自定义字幕文案')
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
  if (carSubtitleMode.value !== 'off' && carHeadlineEnabled.value && carHeadlinePosition.value === carSubtitlePosition.value) {
    warnings.push('字幕和大字报选择了同一区域，提交后会自动错开')
  }
  if (carAudioMode.value === 'post_mix' && carAudioUrl.value.trim()) {
    warnings.push('后期口播配音不保证口型同步，如需口型同步请使用参考音频生成或数字人口播链路')
  }
  if (carAudioMode.value === 'post_mix' && carAudioUrl.value.trim() && carSyncStrategy.value === 'visual_master') {
    warnings.push('当前选择画面优先，口播音频可能被补静音或裁切；追求音画同步时建议使用智能同步')
  }
  if (usesGeneratedVoiceover() && carVoiceTextSource.value === 'manual' && !carVoiceContext.value.trim()) {
    warnings.push('已选择手写文案，但口播文案参考为空，系统将回退到车型卖点、文案场景和转化引导整理口播')
  } else if (usesGeneratedVoiceover() && carVoiceTextSource.value === 'auto') {
    warnings.push(isMultiCarCompareMode.value
      ? '未填写口播文案，系统将按“开场-逐车介绍-维度对比-总结推荐”自动整理口播'
      : '未填写口播文案，系统将根据车型卖点、文案场景和转化引导自动整理口播，并替换分镜旧台词')
  } else if (!hasSelectedVoiceAudio() && !usesGeneratedVoiceover()) {
    warnings.push('未选择口播音频，系统不会把 BGM 或分镜旧台词当作口播来源')
  }
  if (isMultiCarCompareMode.value && carStoryboardContext.value.trim()) {
    warnings.push('多车型对比会优先使用固定章节结构，已选分镜仅作为镜头节奏补充，不会覆盖车型绑定')
  }
  if (usesGeneratedVoiceover() && strictVoiceTextForRequest()) {
    const stats = voiceLanguageStats(strictVoiceTextForRequest())
    if (carNativeVoiceLanguage.value === 'zh-CN' && (stats.cjk === 0 || (stats.latin >= 12 && stats.latin > stats.cjk * 2))) {
      warnings.push('当前选择中文讲述，提交后会先把传入文案翻译/规范为中文，再传给视频模型')
    }
    if (carNativeVoiceLanguage.value === 'en-US' && stats.cjk > 0) {
      warnings.push('当前选择英文讲述，提交后会先把传入文案翻译/规范为英文，再传给视频模型')
    }
  }
  if (carHeadlineEnabled.value && !sanitizeSpeechText(carHeadlineText.value)) {
    warnings.push('视频大字报已开启但未填写文案，本次不会叠加大字报')
  }
  if (carNoHostHumanConflict.value.count > 0) {
    const sourceText = carNoHostHumanConflict.value.sources.join('、') || '当前内容'
    warnings.push(`当前选择数字人不出镜，但${sourceText}检测到 ${carNoHostHumanConflict.value.count} 处人物/主播/客户描述；系统会强制忽略人物并只展示车辆。若要保留讲解人物，请切换为“虚拟人物出镜”并上传数字人形象。`)
  }
  if (carHostAppearanceEnabled.value && !carHostImageUrl.value.trim()) {
    warnings.push('已选择虚拟人物出镜，但还没有选择数字人形象；系统会弱化人物，只在必要讲解镜头中保留出镜节奏。')
  }
  if (carHostAppearanceEnabled.value && carHostHumanEvidence.value.count === 0) {
    warnings.push('当前爆款对标/分镜/文案没有明显人物出镜信息，硬加入虚拟人物可能割裂；建议确认原视频是否有人物讲解，或关闭虚拟人物出镜。')
  }
  if (!isMultiCarCompareMode.value && carMaterialCompleteness.value.providedCount < 4) {
    warnings.push(`车辆一致性素材偏少，建议补充：${carMaterialMissingText.value}`)
  } else if (!isMultiCarCompareMode.value && carMaterialCompleteness.value.providedCount < 8) {
    warnings.push(`车辆一致性素材仍可补充：${carMaterialMissingText.value}`)
  }
  if (!isSeedance2Selected.value && (carImageUrls.value.length > 1 || isMultiCarCompareMode.value)) {
    warnings.push('当前模型每段只使用最关键 1 张首帧图，一致性弱于 Seedance 2.0 多参考图模式')
  }
  if (!isSeedance2Selected.value && carSceneMaterialUrls.value.length > 0) {
    warnings.push('已上传场景图，但当前模型只能使用单张首帧；场景替换建议切换到 Seedance 2.0 多参考图模式')
  }
  if (isSeedance2Selected.value && carSceneMaterialUrls.value.length === 0) {
    warnings.push('未上传独立场景图时，场景会以参考图和补充文案为主；如需明确替换展厅/道路/门店，请补充场景图片')
  }
  if (carStoryboardFunctionMissingLabels.value.length > 0) {
    warnings.push(`分镜包含车辆功能展示，建议补充对应部位参考图：${carStoryboardFunctionMissingLabels.value.join('、')}`)
  }
  return warnings
})

const hasCarGenerationReviewInput = computed(() => {
  if (mainTab.value !== 'carSales') return false
  return Boolean(
    carBundleAssetUrl.value.trim()
    || carImageUrls.value.length > 0
    || isMultiCarCompareMode.value
    || carStoryboardContext.value.trim()
    || carBenchmarkVoiceText.value.trim()
    || carVoiceContext.value.trim()
    || carAudioUrl.value.trim()
    || carBgmUrl.value.trim()
    || carHostImageUrl.value.trim()
    || carMaterialVideoUrl.value.trim()
    || carSellingPoints.value.trim()
    || carAudience.value.trim()
    || carCallToAction.value.trim()
    || prompt.value.trim(),
  )
})

const showCarGenerationReview = computed(() =>
  hasCarGenerationReviewInput.value || carGenerationBlockingMessages.value.length > 0,
)

const carGenerationReviewSummary = computed(() => {
  if (carGenerationBlockingMessages.value.length > 0) {
    return carGenerationBlockingMessages.value[0]
  }
  if (carGenerationWarnings.value.length > 0) {
    return carGenerationWarnings.value[0]
  }
  if (carGenerationGroupPreviewRows.value.length > 0) {
    return carGenerationGroupSummary.value
  }
  return '已按当前素材、文案和音频设置整理生成依据'
})

const carGenerationBasisRows = computed(() => [
  { label: '制作模式', value: isMultiCarCompareMode.value ? `多车型对比（${orderedCompareCarPackages.value.length} 款）` : '单车销售成片' },
  { label: '视频模型', value: selectedSeedanceModel.value.label },
  { label: '视频段数', value: carSegmentModeLabel.value },
  { label: '画面来源', value: carVisualSourceLabel.value },
  { label: '场景替换', value: carSceneMaterialUrls.value.length ? `使用 ${carSceneMaterialUrls.value.length} 张独立场景图` : '以参考图和文案场景为主' },
  { label: '车辆一致性', value: carMaterialCompletenessStatus.value },
  { label: '参考图策略', value: carReferenceImageStrategyLabel.value },
  { label: '数字人出镜', value: carHostAppearanceEnabled.value ? '虚拟人物出镜' : '不出镜，只介绍车辆' },
  { label: '口播来源', value: carAudioSourceLabel.value },
  { label: '文案来源', value: usesGeneratedVoiceover() ? carVoiceTextSourceLabel.value : '随口播音频/手写文案' },
  { label: 'BGM 来源', value: carBgmSourceLabel.value },
  { label: '音画同步', value: carSyncStrategyOptions.find((item) => item.key === carSyncStrategy.value)?.label || '智能同步' },
  { label: '字幕来源', value: carSubtitleSourceLabel.value },
  { label: '视频大字报', value: carHeadlineSourceLabel.value },
  { label: '分镜旧台词处理', value: storyboardOldLineStatus.value },
])

const carGenerationBasisSummary = computed(() => {
  if (isMultiCarCompareMode.value) {
    const names = orderedCompareCarPackages.value.map((pkg) => pkg.brandModel || pkg.packageName).join('、')
    return `本次将生成多车型对比视频：${names}。每个单车章节只使用对应车型素材包，对比镜头会明确按“${compareDimensionList.value.join('、')}”做并列或总结，避免口播和画面串车。`
  }
  if (hasSelectedVoiceAudio()) {
    const bgmSentence = carBgmUrl.value.trim() ? 'BGM 只会作为背景音乐混入，不参与口型和字幕。' : ''
    const storyboardSentence = storyboardHasOldLines.value
      ? '分镜中的旧台词不会替代口播音频，只作为画面节奏参考。'
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
    const strictText = strictVoiceTextForRequest()
    const storyboardSentence = storyboardHasOldLines.value
      ? strictText
        ? '分镜中的旧台词只用于判断段落位置和长短，不把原文传给模型。'
        : '分镜中的旧台词会作为段落节奏和语义补齐参考，并由当前车型、卖点和语言设置约束。'
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
  if (isMultiCarCompareMode.value) {
    parts.push(`多车型对比模式：车型顺序为 ${orderedCompareCarPackages.value.map((pkg, idx) => `${idx + 1}. ${pkg.brandModel || pkg.packageName}（${compareCarRoleLabel(pkg.role)}）`).join('；')}。单车章节只能使用对应车型素材包，对比章节必须明确是并列对比或过渡总结，不得隐式混用参考图。固定对比维度：${compareDimensionList.value.join('、')}。`)
  }
  if (carStoryboardContext.value.trim()) {
    const peoplePolicy = carHostAppearanceEnabled.value
      ? '人物策略：保留分镜中的人物站位、动作和出镜节奏；人物身份、人脸和服装以当前数字人形象/设置为准。'
      : '人物策略：忽略分镜中的人物、主播、销售顾问、客户、路人、司机和乘客，只展示车辆与场景。'
    const strictText = strictVoiceTextForRequest()
    const storyboardIntro = strictText
      ? '分镜节奏参考（不传入原分镜台词原文；只用旧台词段落位置和长短辅助当前文案分配；车辆事实以当前车型素材为准）'
      : '分镜节奏参考（保留镜头意图、景别、运镜、构图、转场和可用台词节奏；车辆事实以当前车型素材为准）'
    parts.push(`${storyboardIntro}：${peoplePolicy}\n${summarizeStoryboardForPrompt(carStoryboardContext.value)}`)
  }
  if (!carHostAppearanceEnabled.value && !carStoryboardContext.value.trim()) {
    parts.push('人物策略：数字人不出镜，生成时必须忽略所有人物、主播、销售顾问、客户、路人、司机和乘客描述，只展示车辆与场景。')
  }
  if (hasSelectedVoiceAudio()) {
    parts.push('Post-mix voice asset rule: uploaded or selected voice audio controls final duration, narration content and subtitles after generation. The video model must not generate speech audio, music, lip-sync mouth movement, subtitle text or visual headline text from the benchmark copy.')
    parts.push('内容主导：已选择口播/配音音频，最终时长、口播内容和字幕以该音频为准；视频模型不要生成字幕文字或可见口型；分镜和爆款对标文案只作为画面参考。')
    if (effectiveVoiceTextPreview.value) {
      parts.push('口播原文只按语义边界拆分写入 scenes.voiceText；不会新增、删除或改写文案。')
    }
  } else if (usesAutoTtsVoiceover()) {
    parts.push(`Automatic narration mode: generate silent visuals first; the backend will synthesize one unified voiceover after video generation. Voice style=${carNativeVoiceStyleSummary.value}. Do not generate speech audio, music, lip-sync mouth movement, subtitle text or visual headline text in the model output.`)
    parts.push('Subtitles, final duration and narration timing are controlled by the post-generated voiceover audio. BGM is a separate user-selected background music asset and is only mixed after the final voice track.')
  } else if (usesModelNativeVoiceover()) {
    parts.push(`内容主导：视频模型按口播文案直接生成画面和原生音频，文案来源为${carVoiceTextSourceLabel.value}，风格为${carNativeVoiceStyleSummary.value}；BGM 只作为背景音乐。`)
    parts.push('字幕只在成片拼接后处理，优先按最终口播文案烧录；缺少文案时才识别成片音频，生成模型不要在画面里生成任何字幕文字。')
    if (strictVoiceTextForRequest()) {
      parts.push('口播严格使用已传入文案，仅按语义边界切分；分镜 content/voiceText 不参与口播。')
    } else {
      parts.push('未传入口播文案时，才复用分镜 content/voiceText 原文补齐；不得生成新台词。')
    }
  } else if (carVoiceContext.value.trim()) {
    parts.push(`口播文案参考：${carVoiceContext.value.trim()}`)
  }
  return parts.join('\n\n')
}

function carImageRoleForUrl(url: string, _index: number) {
  return normalizeCarAssetRole(carImageAssetRoleByUrl.value[url])
}

function carSceneImageRoleForUrl(url: string, _index: number) {
  const role = normalizeCarAssetRole(carSceneImageAssetRoleByUrl.value[url])
  if (role && CAR_SCENE_REFERENCE_ROLES.includes(role)) {
    return role
  }
  return ''
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
  return sanitizeSpeechText(carSubtitleText.value)
}

const carSubtitlePreviewText = computed(() => {
  const text = sanitizeSpeechText(carSubtitleText.value)
  if (!text) {
    return '这台车空间宽敞，配置也很到位。'
  }
  return text.split(/[。！？!?；;\n]/).find((part) => part.trim())?.trim().slice(0, 48) || text.slice(0, 48)
})

const carSubtitlePreviewStyle = computed(() => ({
  color: carSubtitleTextColor.value,
  fontFamily: carSubtitleFontFamily.value,
  fontSize: `${Math.max(12, Math.min(36, Math.round(Number(carSubtitleFontSize.value) || DEFAULT_CAR_SUBTITLE_FONT_SIZE)))}px`,
  WebkitTextStroke: `1px ${carSubtitleOutlineColor.value}`,
  textShadow: `0 1px 0 ${carSubtitleOutlineColor.value}, 0 -1px 0 ${carSubtitleOutlineColor.value}, 1px 0 0 ${carSubtitleOutlineColor.value}, -1px 0 0 ${carSubtitleOutlineColor.value}`,
}))

const carHeadlinePreviewText = computed(() =>
  sanitizeSpeechText(carHeadlineText.value) || 'Direct sales from Chinese factory',
)

const carHeadlinePreviewStyle = computed(() => ({
  color: carHeadlineTextColor.value,
  fontFamily: carHeadlineFontFamily.value,
  fontSize: `${Math.max(24, Math.min(58, Math.round((Number(carHeadlineFontSize.value) || 92) * 0.56)))}px`,
  WebkitTextStroke: `2px ${carHeadlineOutlineColor.value}`,
  textShadow: `0 2px 0 ${carHeadlineOutlineColor.value}, 0 -2px 0 ${carHeadlineOutlineColor.value}, 2px 0 0 ${carHeadlineOutlineColor.value}, -2px 0 0 ${carHeadlineOutlineColor.value}`,
}))

function normalizeHexColor(value: string, fallback: string) {
  const source = value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(source)) {
    return source.toLowerCase()
  }
  if (/^[0-9a-fA-F]{6}$/.test(source)) {
    return `#${source.toLowerCase()}`
  }
  if (/^#[0-9a-fA-F]{3}$/.test(source)) {
    const [, r, g, b] = source
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  if (/^[0-9a-fA-F]{3}$/.test(source)) {
    const [r, g, b] = source
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return fallback
}

function colorMatches(current: string, preset: string) {
  return normalizeHexColor(current, '').toLowerCase() === normalizeHexColor(preset, '').toLowerCase()
}

function setCarSubtitleTextColor(value: string) {
  carSubtitleTextColor.value = normalizeHexColor(value, '#ffffff')
}

function setCarSubtitleOutlineColor(value: string) {
  carSubtitleOutlineColor.value = normalizeHexColor(value, '#111111')
}

function setCarHeadlineTextColor(value: string) {
  carHeadlineTextColor.value = normalizeHexColor(value, '#ffffff')
}

function setCarHeadlineOutlineColor(value: string) {
  carHeadlineOutlineColor.value = normalizeHexColor(value, '#111111')
}

function normalizeCarHeadlineTextColor() {
  carHeadlineTextColor.value = normalizeHexColor(carHeadlineTextColor.value, '#ffffff')
}

function normalizeCarSubtitleTextColor() {
  carSubtitleTextColor.value = normalizeHexColor(carSubtitleTextColor.value, '#ffffff')
}

function normalizeCarSubtitleOutlineColor() {
  carSubtitleOutlineColor.value = normalizeHexColor(carSubtitleOutlineColor.value, '#111111')
}

function normalizeCarHeadlineOutlineColor() {
  carHeadlineOutlineColor.value = normalizeHexColor(carHeadlineOutlineColor.value, '#111111')
}

function isCarSubtitleTextColorPreset(value: string) {
  return colorMatches(carSubtitleTextColor.value, value)
}

function isCarSubtitleOutlineColorPreset(value: string) {
  return colorMatches(carSubtitleOutlineColor.value, value)
}

function isCarHeadlineTextColorPreset(value: string) {
  return colorMatches(carHeadlineTextColor.value, value)
}

function isCarHeadlineOutlineColorPreset(value: string) {
  return colorMatches(carHeadlineOutlineColor.value, value)
}

function buildCarSubtitleOverlayForRequest() {
  if (carSubtitleMode.value === 'off') {
    return undefined
  }
  return {
    enabled: true,
    fontFamily: carSubtitleFontFamily.value,
    fontSize: Math.max(12, Math.min(96, Number(carSubtitleFontSize.value) || DEFAULT_CAR_SUBTITLE_FONT_SIZE)),
    textColor: carSubtitleTextColor.value,
    outlineColor: carSubtitleOutlineColor.value,
    position: carSubtitlePosition.value,
  }
}

function buildCarHeadlineOverlayForRequest() {
  if (!carHeadlineEnabled.value) {
    return undefined
  }
  const text = sanitizeSpeechText(carHeadlineText.value)
  if (!text) {
    return undefined
  }
  return {
    enabled: true,
    text,
    fontFamily: carHeadlineFontFamily.value,
    fontSize: Math.max(48, Math.min(156, Number(carHeadlineFontSize.value) || 92)),
    textColor: carHeadlineTextColor.value,
    outlineColor: carHeadlineOutlineColor.value,
    position: carHeadlinePosition.value,
  }
}

function comparePackageVehicleImageUrls(pkg: CompareCarPackage, preferredRoles: string[] = []) {
  const selected: string[] = []
  const addRole = (role: string) => {
    const found = pkg.images.find((image) => image.role === role && !selected.includes(image.url))
    if (found) selected.push(found.url)
  }
  preferredRoles.forEach(addRole)
  CAR_IDENTITY_ANCHOR_ROLES.forEach(addRole)
  pkg.images.forEach((image) => {
    if (!selected.includes(image.url)) selected.push(image.url)
  })
  return selected.slice(0, SEEDANCE2_MAX_REFERENCE_IMAGES)
}

function comparePackageSceneImageUrls(pkg: CompareCarPackage, preferredRoles: string[] = []) {
  const sceneUrls = pkg.sceneImages.map((image) => image.url).filter(Boolean)
  const vehicleUrls = comparePackageVehicleImageUrls(pkg, preferredRoles)
  return [...sceneUrls.slice(0, 1), ...vehicleUrls].slice(0, SEEDANCE2_MAX_REFERENCE_IMAGES)
}

function compareAnchorImageUrls() {
  const selected: string[] = []
  orderedCompareCarPackages.value.forEach((pkg) => {
    const [anchor] = comparePackageVehicleImageUrls(pkg, CAR_IDENTITY_ANCHOR_ROLES)
    if (anchor && !selected.includes(anchor)) selected.push(anchor)
  })
  return selected.slice(0, SEEDANCE2_MAX_REFERENCE_IMAGES)
}

function compareSceneVoiceText(pkg: CompareCarPackage, purpose: string, dimension?: string) {
  const name = pkg.brandModel || pkg.packageName || `车型${pkg.carIndex + 1}`
  if (purpose === 'exterior') {
    return `${name}先看外观，重点展示车身比例、颜色质感和第一眼辨识度。`
  }
  if (purpose === 'selling') {
    const points = pkg.sellingPoints || carSellingPoints.value.trim()
    return points
      ? `${name}的核心卖点是${points}，这一段只围绕这款车讲清楚。`
      : `${name}继续看座舱、空间和配置，把这款车适合的人群讲清楚。`
  }
  return `${name}在${dimension || '这个维度'}上有自己的侧重点，画面和口播都只对应这款车。`
}

function buildMultiCarCompareScenes(): CarSalesSceneDraft[] {
  const packages = orderedCompareCarPackages.value
  if (packages.length < 2) {
    return []
  }
  const scenes: CarSalesSceneDraft[] = []
  const pushScene = (scene: Omit<(typeof scenes)[number], 'segmentIndex' | 'referenceImage'> & { referenceImage?: string }) => {
    const imageUrls = scene.imageUrls.filter(Boolean).slice(0, SEEDANCE2_MAX_REFERENCE_IMAGES)
    scenes.push({
      ...scene,
      segmentIndex: scenes.length + 1,
      imageUrls,
      referenceImage: scene.referenceImage || imageUrls[0],
    })
  }

  const names = packages.map((pkg) => pkg.brandModel || pkg.packageName || `车型${pkg.carIndex + 1}`)
  pushScene({
    title: '对比开场',
    visualPrompt: `开场建立 ${names.join(' vs ')} 的双车对比主题，画面可以用并列车型锚点图形成清楚对比，不混淆车型身份。`,
    prompt: `开场建立 ${names.join(' vs ')} 的双车对比主题，画面可以用并列车型锚点图形成清楚对比，不混淆车型身份。`,
    imageUrls: compareAnchorImageUrls(),
    voiceText: `今天把${names.join('和')}放在一起看，先逐一介绍，再做维度对比。`,
    duration: carSegmentDurationAt(0),
    compareDimension: 'opening',
    shotPurpose: 'opening',
  })

  const useTwoScenesPerCar = packages.length <= 4
  packages.forEach((pkg) => {
    const name = pkg.brandModel || pkg.packageName || `车型${pkg.carIndex + 1}`
    pushScene({
      title: useTwoScenesPerCar ? `${name}外观介绍` : `${name}单车重点`,
      visualPrompt: useTwoScenesPerCar
        ? `${name}单车介绍章节，只展示该车型素材包内的外观、车身线条、颜色和第一眼质感；不要出现其他车型。`
        : `${name}单车介绍章节，只展示该车型素材包内的外观、空间、配置或核心卖点；不要出现其他车型。`,
      prompt: useTwoScenesPerCar
        ? `${name}单车介绍章节，只展示该车型素材包内的外观、车身线条、颜色和第一眼质感；不要出现其他车型。`
        : `${name}单车介绍章节，只展示该车型素材包内的外观、空间、配置或核心卖点；不要出现其他车型。`,
      imageUrls: useTwoScenesPerCar
        ? comparePackageVehicleImageUrls(pkg, ['car_exterior_front', 'car_exterior_side', 'car_exterior_45'])
        : comparePackageSceneImageUrls(pkg, ['car_exterior_front', 'car_interior_dashboard', 'car_interior_front_seat']),
      voiceText: compareSceneVoiceText(pkg, useTwoScenesPerCar ? 'exterior' : 'selling'),
      duration: carSegmentDurationAt(scenes.length),
      carPackageId: pkg.localId,
      carIndex: pkg.carIndex,
      carRole: pkg.role,
      compareDimension: useTwoScenesPerCar ? '外观质感' : '车型重点',
      shotPurpose: 'single_car_intro',
    })
    if (!useTwoScenesPerCar) {
      return
    }
    pushScene({
      title: `${name}空间配置`,
      visualPrompt: `${name}继续单车介绍，只使用该车型素材包展示内饰、空间、配置或核心卖点，口播事实只对应这款车。`,
      prompt: `${name}继续单车介绍，只使用该车型素材包展示内饰、空间、配置或核心卖点，口播事实只对应这款车。`,
      imageUrls: comparePackageSceneImageUrls(pkg, ['car_interior_dashboard', 'car_interior_front_seat', 'car_interior_back_seat']),
      voiceText: compareSceneVoiceText(pkg, 'selling'),
      duration: carSegmentDurationAt(scenes.length),
      carPackageId: pkg.localId,
      carIndex: pkg.carIndex,
      carRole: pkg.role,
      compareDimension: '座舱空间',
      shotPurpose: 'single_car_intro',
    })
  })

  const dimensions = compareDimensionList.value.slice(0, 3)
  pushScene({
    title: '维度对比',
    visualPrompt: `并列对比 ${names.join(' vs ')}，只围绕${dimensions.join('、')}做清楚取舍；允许同屏或连续切换展示两款车，但每个画面必须明确车型身份，不把 A 车细节说成 B 车。`,
    prompt: `并列对比 ${names.join(' vs ')}，只围绕${dimensions.join('、')}做清楚取舍；允许同屏或连续切换展示两款车，但每个画面必须明确车型身份，不把 A 车细节说成 B 车。`,
    imageUrls: compareAnchorImageUrls(),
    voiceText: `${dimensions.join('、')}这几个维度放在一起看，重点是找到更适合自己使用场景的那台车。`,
    duration: carSegmentDurationAt(scenes.length),
    compareDimension: dimensions.join(' / '),
    shotPurpose: 'dimension_compare',
  })
  pushScene({
    title: '总结推荐',
    visualPrompt: `总结推荐段落，画面以双车锚点或主推车型高光收束，强调不同人群的选择建议和到店咨询，不新增未提供的车型事实。`,
    prompt: `总结推荐段落，画面以双车锚点或主推车型高光收束，强调不同人群的选择建议和到店咨询，不新增未提供的车型事实。`,
    imageUrls: compareAnchorImageUrls(),
    voiceText: carAudience.value.trim()
      ? `如果你是${carAudience.value.trim()}，可以按预算、空间和配置重点做选择。${carCallToAction.value.trim() || '想看实车可以私信预约试驾。'}`
      : `${carCallToAction.value.trim() || '想看实车可以私信预约试驾，我们帮你按需求做推荐。'}`,
    duration: carSegmentDurationAt(scenes.length),
    compareDimension: 'summary',
    shotPurpose: 'summary_recommendation',
  })

  const strictText = strictVoiceTextForRequest()
  if (strictText) {
    const chunks = splitVoiceTextForSegments(strictText, scenes.length)
    scenes.forEach((scene, idx) => {
      scene.voiceText = chunks[idx] || scene.voiceText
    })
  }
  return scenes.slice(0, 12)
}

function buildCarSalesScenes(): CarSalesSceneDraft[] {
  if (isMultiCarCompareMode.value) {
    return buildMultiCarCompareScenes()
  }
  const storyboardShots = extractStoryboardShots(carStoryboardContext.value)
  if (storyboardShots.length > 0) {
    const groups = groupStoryboardShots(
      storyboardShots,
      selectedSeedanceModel.value.maxDuration,
    )
    const voiceChunks = voiceChunksForStoryboardGroups(groups)
    const segmentDurations = normalizeCarSegmentDurations(carSegmentDurations.value, groups.length)
    return groups.map((group, idx) => {
      const orders = group.shots.map((shot, localIdx) => shot.order || group.startIndex + localIdx + 1)
      const title = orders.length === 1 ? `镜头 ${orders[0]}` : `连续镜头 ${orders.join('、')}`
      const visualPrompt = storyboardGroupVisualText(group, idx, groups.length)
      const imageUrls = carSceneImageUrls(title, visualPrompt, idx)
      return {
        segmentIndex: idx + 1,
        title,
        visualPrompt,
        prompt: visualPrompt,
        imageUrls,
        referenceImage: imageUrls[0],
        voiceText: voiceChunks[idx] || undefined,
        duration: segmentDurations[idx] || group.duration || carSegmentDuration.value,
      }
    })
  }
  const voiceChunks = splitVoiceTextForSegments(effectiveVoiceTextPreview.value, carSegmentCount.value)
  const segmentDurations = normalizedCarSegmentDurations.value
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
  if (usesAutoTtsVoiceover()) return 'auto_tts'
  return 'none'
}

function carAudioModeForRequest(): CarAudioMode {
  if (hasSelectedVoiceAudio()) {
    return carAudioMode.value === 'reference' ? 'reference' : 'post_mix'
  }
  if (usesModelNativeVoiceover()) return 'model_native'
  if (usesAutoTtsVoiceover()) return 'auto_tts'
  return 'none'
}

function carSyncStrategyForRequest(): CarSyncStrategy {
  if (hasSelectedVoiceAudio() || usesAutoTtsVoiceover()) {
    return 'audio_master'
  }
  return carSyncStrategy.value
}

function carFinalVoiceTextForRequest() {
  if (hasSelectedVoiceAudio()) {
    return undefined
  }
  const strictText = strictVoiceTextForRequest()
  if (strictText) {
    return strictText
  }
  const chunks = buildCarSalesScenes()
    .map((scene) => sanitizeSpeechText(scene.voiceText))
    .filter(Boolean)
  return chunks.length ? chunks.join('\n') : undefined
}

function buildCarAssetRoleBindings(): CarSalesAssetRoleBinding[] {
  if (isMultiCarCompareMode.value) {
    const bindings: CarSalesAssetRoleBinding[] = []
    orderedCompareCarPackages.value.forEach((pkg) => {
      bindings.push({
        assetId: pkg.packageAssetId,
        url: pkg.packageAssetUrl,
        assetType: 'JSON',
        assetRole: 'car_model_bundle',
        label: pkg.brandModel || pkg.packageName,
        carPackageId: pkg.localId,
        carIndex: pkg.carIndex,
      })
      ;[...pkg.images, ...pkg.sceneImages].forEach((image) => {
        bindings.push({
          assetId: image.assetId,
          url: image.url,
          assetType: 'IMAGE',
          assetRole: image.role || undefined,
          label: image.label || (image.role ? carRoleLabel(image.role) : undefined),
          carPackageId: pkg.localId,
          carIndex: pkg.carIndex,
        })
      })
    })
    if (carStoryboardAssetUrl.value.trim()) {
      bindings.push({
        assetId: carStoryboardAssetId.value || undefined,
        url: carStoryboardAssetUrl.value.trim(),
        assetType: 'JSON',
        assetRole: 'storyboard_json',
        label: '分镜',
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
    if (carHostAppearanceEnabled.value && carHostImageUrl.value.trim()) {
      bindings.push({
        assetId: carHostImageAssetId.value || undefined,
        url: carHostImageUrl.value.trim(),
        assetType: 'IMAGE',
        assetRole: 'host_image',
        label: carRoleLabel('host_image'),
      })
    }
    if (carMaterialVideoUrl.value.trim()) {
      bindings.push({
        assetId: carMaterialVideoAssetId.value || undefined,
        url: carMaterialVideoUrl.value.trim(),
        assetType: 'VIDEO',
        assetRole: 'material_video',
        label: '已有视频素材',
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
  const bindings: CarSalesAssetRoleBinding[] = []
  if (carBundleAssetUrl.value.trim()) {
    bindings.push({
      assetId: carBundleAssetId.value || undefined,
      url: carBundleAssetUrl.value.trim(),
      assetType: 'JSON',
      assetRole: 'car_model_bundle',
      label: carBundleLoadedName.value || carBrandModel.value.trim() || '车型素材包',
    })
  }
  if (carStoryboardAssetUrl.value.trim()) {
    bindings.push({
      assetId: carStoryboardAssetId.value || undefined,
      url: carStoryboardAssetUrl.value.trim(),
      assetType: 'JSON',
      assetRole: 'storyboard_json',
      label: '分镜',
    })
  }
  carImageUrls.value.forEach((url, idx) => {
    const role = carImageRoleForUrl(url, idx)
    bindings.push({
      assetId: carImageAssetIdsByUrl.value[url],
      url,
      assetType: 'IMAGE',
      assetRole: role || undefined,
      label: role ? carRoleLabel(role) : undefined,
    })
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
  if (carMaterialVideoUrl.value.trim()) {
    bindings.push({
      assetId: carMaterialVideoAssetId.value || undefined,
      url: carMaterialVideoUrl.value.trim(),
      assetType: 'VIDEO',
      assetRole: 'material_video',
      label: '已有视频素材',
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

function buildCompareCarPackagesForRequest(): CarSalesCarPackageRequest[] | undefined {
  if (!isMultiCarCompareMode.value) {
    return undefined
  }
  return orderedCompareCarPackages.value.map((pkg) => ({
    packageId: pkg.localId,
    packageAssetId: pkg.packageAssetId,
    packageName: pkg.packageName,
    carIndex: pkg.carIndex,
    role: pkg.role,
    brandModel: pkg.brandModel || pkg.packageName,
    color: pkg.color || undefined,
    sellingPoints: pkg.sellingPoints || undefined,
    materialCompleteness: pkg.materialCompleteness || undefined,
    imageUrls: pkg.images.map((image) => image.url).filter(Boolean),
    sceneImageUrls: pkg.sceneImages.map((image) => image.url).filter(Boolean),
    assetRoleBindings: [...pkg.images, ...pkg.sceneImages].map((image) => ({
      assetId: image.assetId,
      url: image.url,
      assetType: 'IMAGE',
      assetRole: image.role || undefined,
      label: image.label || (image.role ? carRoleLabel(image.role) : undefined),
      carPackageId: pkg.localId,
      carIndex: pkg.carIndex,
    })),
  }))
}

function carSourceAssetIds() {
  if (isMultiCarCompareMode.value) {
    const ids = orderedCompareCarPackages.value.flatMap((pkg) => [
      pkg.packageAssetId,
      ...pkg.images.map((image) => image.assetId),
      ...pkg.sceneImages.map((image) => image.assetId),
      carStoryboardAssetId.value,
      carBenchmarkAssetId.value,
      carAudioAssetId.value,
      carBgmAssetId.value,
      carHostAppearanceEnabled.value ? carHostImageAssetId.value : null,
      carMaterialVideoAssetId.value,
    ]).filter((id): id is number => typeof id === 'number' && id > 0)
    return Array.from(new Set(ids))
  }
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

function recordArrayField(record: Record<string, unknown>, key: string) {
  const raw = record[key]
  return Array.isArray(raw) ? raw.filter((item): item is Record<string, unknown> => Boolean(asRecord(item))) : []
}

function stringArrayField(record: Record<string, unknown>, key: string) {
  const raw = record[key]
  return Array.isArray(raw)
    ? raw.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
    : []
}

function firstImportText(record: Record<string, unknown>, keys: string[]) {
  return firstRecordText(record, keys)
}

function importNumber(record: Record<string, unknown>, key: string) {
  const value = record[key]
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function importBoolean(record: Record<string, unknown>, key: string) {
  const value = record[key]
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }
  return null
}

function isSeedanceModelValue(value: string): value is SeedanceModelValue {
  return seedanceModelOptions.some((item) => item.value === value)
}

function isRenderAspectRatioValue(value: string): value is RenderAspectRatio {
  return renderAspectRatioOptions.some((item) => item.value === value)
}

function isCarAudioMode(value: string): value is CarAudioMode {
  return ['none', 'post_mix', 'reference', 'model_native', 'auto_tts'].includes(value)
}

function isCarVoiceTextSource(value: string): value is CarVoiceTextSource {
  return ['auto', 'benchmark', 'manual'].includes(value)
}

function isNativeVoiceLanguage(value: string): value is NativeVoiceLanguage {
  return ['zh-CN', 'en-US'].includes(value)
}

function isCarSubtitleMode(value: string): value is CarSubtitleMode {
  return ['off', 'auto', 'custom'].includes(value)
}

function isCarSubtitleTimingMode(value: string): value is CarSubtitleTimingMode {
  return ['auto', 'audio_recognition', 'script_timeline'].includes(value)
}

function isCarSyncStrategy(value: string): value is CarSyncStrategy {
  return ['auto', 'audio_master', 'visual_master'].includes(value)
}

function isCarHeadlinePosition(value: string): value is CarHeadlinePosition {
  return ['top', 'middle', 'bottom'].includes(value)
}

function isCompareCarRole(value: string): value is CompareCarRole {
  return ['main', 'compare', 'alternative'].includes(value)
}

function applyCommonSeedanceImport(input: Record<string, unknown>) {
  const model = firstImportText(input, ['model', 'modelCode'])
  if (model && isSeedanceModelValue(model)) {
    selectedModel.value = model
  }
  const ratio = firstImportText(input, ['aspectRatio', 'ratio'])
  if (ratio && isRenderAspectRatioValue(ratio)) {
    renderAspectRatio.value = ratio
  }
  const nextDuration = importNumber(input, 'duration')
  if (nextDuration != null) {
    duration.value = Math.max(1, Math.round(nextDuration))
  }
  const nextPrompt = firstImportText(input, ['prompt'])
  if (nextPrompt) {
    prompt.value = nextPrompt
  }
}

function taskImportIdFromRoute() {
  const raw = route.query.importTask
  return Array.isArray(raw) ? raw[0] : raw
}

function parseImportTaskId(value: unknown) {
  const parsed = Number(Array.isArray(value) ? value[0] : value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null
}

function parseJsonRecord(raw: string | null | undefined) {
  if (!raw || !raw.trim()) {
    return null
  }
  return asRecord(parseJsonSafely(raw))
}

function nestedImportInputRecord(value: unknown): Record<string, unknown> | null {
  const record = asRecord(value)
  if (!record) {
    return null
  }
  for (const key of ['input', 'request', 'parameters', 'payload']) {
    const direct = asRecord(record[key])
    if (direct) {
      return direct
    }
  }
  for (const key of ['metadata', 'meta', 'result', 'data']) {
    const nested = nestedImportInputRecord(record[key])
    if (nested) {
      return nested
    }
  }
  return null
}

async function loadRenderTaskImportFromTask(taskId: number) {
  const localSnapshot = readRenderTaskSnapshot(taskId)
  const localInput = asRecord(localSnapshot?.input)
  if (localSnapshot && localInput) {
    return {
      taskId: localSnapshot.taskId,
      taskType: localSnapshot.taskType,
      input: localInput,
      savedAt: localSnapshot.savedAt,
      source: localSnapshot.source,
    }
  }

  const detail = await getTaskDetail(taskId)
  const detailInput = parseJsonRecord(detail.inputJson) || nestedImportInputRecord(parseJsonRecord(detail.outputJson))
  if (detailInput) {
    return {
      taskId: detail.taskId,
      taskType: detail.taskType,
      input: detailInput,
      savedAt: Date.now(),
      source: 'task-center' as const,
    }
  }

  const taskResult = await getTaskResult<unknown>(taskId).catch(() => null)
  const resultInput = nestedImportInputRecord(taskResult?.result)
  if (resultInput) {
    return {
      taskId,
      taskType: taskResult?.taskType || detail.taskType,
      input: resultInput,
      savedAt: Date.now(),
      source: 'task-center' as const,
    }
  }
  return null
}

async function resolveRenderTaskImport() {
  const importTaskId = taskImportIdFromRoute()
  const pending = consumePendingRenderTaskImport(importTaskId)
  const pendingInput = asRecord(pending?.input)
  if (pending && pendingInput) {
    return { ...pending, input: pendingInput }
  }
  const parsedTaskId = parseImportTaskId(importTaskId)
  return parsedTaskId ? loadRenderTaskImportFromTask(parsedTaskId) : null
}

function normalizedImportUrl(value: string) {
  return value.trim()
}

function importedBindingRoleByUrl(bindings: Record<string, unknown>[]) {
  const roleByUrl = new Map<string, string>()
  bindings.forEach((binding) => {
    const url = normalizedImportUrl(firstImportText(binding, ['url']))
    const role = normalizeCarAssetRole(firstImportText(binding, ['assetRole', 'role']))
    if (url && role) {
      roleByUrl.set(url, role)
    }
  })
  return roleByUrl
}

function importedSceneUrls(
  scenes: Record<string, unknown>[],
  vehicleUrls: string[],
  bindings: Record<string, unknown>[],
  blockedUrls: string[] = [],
) {
  const vehicleSet = new Set(vehicleUrls.map(normalizedImportUrl).filter(Boolean))
  const blockedSet = new Set(blockedUrls.map(normalizedImportUrl).filter(Boolean))
  const roleByUrl = importedBindingRoleByUrl(bindings)
  roleByUrl.forEach((role, url) => {
    if (!CAR_SCENE_REFERENCE_ROLES.includes(role)) {
      blockedSet.add(url)
    }
  })
  const sceneUrls: string[] = []
  const push = (url: string) => {
    const clean = normalizedImportUrl(url)
    const role = roleByUrl.get(clean)
    if (
      clean &&
      !vehicleSet.has(clean) &&
      !blockedSet.has(clean) &&
      (!role || CAR_SCENE_REFERENCE_ROLES.includes(role)) &&
      !sceneUrls.includes(clean)
    ) {
      sceneUrls.push(clean)
    }
  }
  bindings.forEach((binding) => {
    const url = normalizedImportUrl(firstImportText(binding, ['url']))
    const role = normalizeCarAssetRole(firstImportText(binding, ['assetRole', 'role']))
    if (url && CAR_SCENE_REFERENCE_ROLES.includes(role)) {
      push(url)
    }
  })
  scenes.forEach((scene) => {
    stringArrayField(scene, 'imageUrls').forEach((url) => {
      if (!vehicleSet.has(url)) push(url)
    })
    const referenceImage = firstImportText(scene, ['referenceImage'])
    if (referenceImage && !vehicleSet.has(referenceImage)) push(referenceImage)
  })
  return sceneUrls
}

function applyImportedAssetBindings(
  bindings: Record<string, unknown>[],
  vehicleUrls: string[],
  sceneUrls: string[],
) {
  const vehicleUrlSet = new Set(vehicleUrls)
  const sceneUrlSet = new Set(sceneUrls)
  const nextCarIds: Record<string, number> = {}
  const nextCarRoles: Record<string, string> = {}
  const nextSceneIds: Record<string, number> = {}
  const nextSceneRoles: Record<string, string> = {}

  bindings.forEach((binding) => {
    const url = firstImportText(binding, ['url'])
    const assetId = toPositiveNumber(binding.assetId)
    const role = normalizeCarAssetRole(firstImportText(binding, ['assetRole', 'role']))
    const assetType = firstImportText(binding, ['assetType']).toUpperCase()
    const label = firstImportText(binding, ['fileName', 'label', 'name'])
    if (!url) return
    if (role === 'host_image') {
      carHostImageUrl.value = url
      carHostImageAssetId.value = assetId
      carHostImageUploadName.value = label || carHostImageUploadName.value
      return
    }
    if (role === 'voiceover' || role === 'reference_audio') {
      carAudioUrl.value = carAudioUrl.value || url
      carAudioAssetId.value = carAudioAssetId.value || assetId
      carAudioUploadName.value = carAudioUploadName.value || label
      return
    }
    if (role === 'bgm') {
      carBgmUrl.value = carBgmUrl.value || url
      carBgmAssetId.value = carBgmAssetId.value || assetId
      carBgmUploadName.value = carBgmUploadName.value || label
      return
    }
    if (role === 'car_model_bundle') {
      carBundleAssetUrl.value = url
      carBundleAssetId.value = assetId
      carBundleLoadedName.value = label || carBundleLoadedName.value
      return
    }
    if (role === 'storyboard_json') {
      carStoryboardAssetUrl.value = url
      carStoryboardAssetId.value = assetId
      carStoryboardUploadName.value = label || carStoryboardUploadName.value
      return
    }
    if (role === 'benchmark_json' || role === 'voice_script') {
      carBenchmarkAssetUrl.value = url
      carBenchmarkAssetId.value = assetId
      carBenchmarkUploadName.value = label || carBenchmarkUploadName.value
      return
    }
    if (role === 'material_video' || role === 'host_video' || assetType === 'VIDEO') {
      carMaterialVideoUrl.value = url
      carMaterialVideoAssetId.value = assetId
      carMaterialVideoUploadName.value = label || carMaterialVideoUploadName.value
      return
    }
    if (CAR_SCENE_REFERENCE_ROLES.includes(role) || (sceneUrlSet.has(url) && !role)) {
      if (!sceneUrlSet.has(url)) {
        sceneUrls.push(url)
        sceneUrlSet.add(url)
      }
      if (assetId) nextSceneIds[url] = assetId
      nextSceneRoles[url] = CAR_SCENE_REFERENCE_ROLES.includes(role) ? role : 'scene_showroom'
      return
    }
    if (vehicleUrlSet.has(url) || role) {
      if (!vehicleUrlSet.has(url)) {
        vehicleUrls.push(url)
        vehicleUrlSet.add(url)
      }
      if (assetId) nextCarIds[url] = assetId
      if (role) nextCarRoles[url] = role
    }
  })

  carImageAssetIdsByUrl.value = nextCarIds
  carImageAssetRoleByUrl.value = nextCarRoles
  carSceneImageAssetIdsByUrl.value = nextSceneIds
  carSceneImageAssetRoleByUrl.value = nextSceneRoles
}

function applyImportedSourceAsset(asset: AssetItem) {
  const url = normalizePublicUrl(asset.fileUrl || '')
  if (!url) {
    return
  }
  const role = carAssetRoleFromAsset(asset)
  if (role === 'car_model_bundle') {
    if (!carBundleAssetUrl.value.trim()) {
      carBundleAssetUrl.value = url
      carBundleAssetId.value = asset.assetId
    }
    carBundleLoadedName.value = asset.fileName || carBundleLoadedName.value
    return
  }
  if (role === 'storyboard_json') {
    if (!carStoryboardAssetUrl.value.trim()) {
      carStoryboardAssetUrl.value = url
      carStoryboardAssetId.value = asset.assetId
    }
    carStoryboardUploadName.value = asset.fileName || carStoryboardUploadName.value
    return
  }
  if (role === 'benchmark_json' || role === 'voice_script') {
    if (!carBenchmarkAssetUrl.value.trim()) {
      carBenchmarkAssetUrl.value = url
      carBenchmarkAssetId.value = asset.assetId
    }
    carBenchmarkUploadName.value = asset.fileName || carBenchmarkUploadName.value
    return
  }
  if (role === 'voiceover' || role === 'reference_audio') {
    if (!carAudioUrl.value.trim()) {
      carAudioUrl.value = url
      carAudioAssetId.value = asset.assetId
      carAudioSourceType.value = asset.sourceType || carAudioSourceType.value
    }
    carAudioUploadName.value = asset.fileName || carAudioUploadName.value
    return
  }
  if (role === 'bgm') {
    if (!carBgmUrl.value.trim()) {
      carBgmUrl.value = url
      carBgmAssetId.value = asset.assetId
      carBgmSourceType.value = asset.sourceType || carBgmSourceType.value
    }
    carBgmUploadName.value = asset.fileName || carBgmUploadName.value
    return
  }
  if (role === 'host_image') {
    if (!carHostImageUrl.value.trim()) {
      carHostImageUrl.value = url
      carHostImageAssetId.value = asset.assetId
    }
    carHostImageUploadName.value = asset.fileName || carHostImageUploadName.value
    return
  }
  if (role === 'material_video' || role === 'host_video' || role === 'reference_video') {
    if (!carMaterialVideoUrl.value.trim()) {
      carMaterialVideoUrl.value = url
      carMaterialVideoAssetId.value = asset.assetId
    }
    carMaterialVideoUploadName.value = asset.fileName || carMaterialVideoUploadName.value
    return
  }
  if (CAR_SCENE_REFERENCE_ROLES.includes(role) && !carSceneImages.value.some((item) => item.trim() === url)) {
    const emptyIndex = carSceneImages.value.findIndex((item) => !item.trim())
    if (emptyIndex >= 0) {
      carSceneImages.value[emptyIndex] = url
    } else if (carSceneImages.value.length < MAX_REFERENCE) {
      carSceneImages.value.push(url)
    }
    carSceneImageAssetIdsByUrl.value = { ...carSceneImageAssetIdsByUrl.value, [url]: asset.assetId }
    carSceneImageAssetRoleByUrl.value = { ...carSceneImageAssetRoleByUrl.value, [url]: role }
    carPickedSceneImageUrl.value = carPickedSceneImageUrl.value || url
    return
  }
  if (CAR_VEHICLE_REFERENCE_ROLES.includes(role) && !carImages.value.some((item) => item.trim() === url)) {
    const emptyIndex = carImages.value.findIndex((item) => !item.trim())
    if (emptyIndex >= 0) {
      carImages.value[emptyIndex] = url
    } else if (carImages.value.length < MAX_REFERENCE) {
      carImages.value.push(url)
    }
    carImageAssetIdsByUrl.value = { ...carImageAssetIdsByUrl.value, [url]: asset.assetId }
    carImageAssetRoleByUrl.value = { ...carImageAssetRoleByUrl.value, [url]: role }
    carPickedImageUrl.value = carPickedImageUrl.value || url
  }
}

async function applyImportedSourceAssetIds(input: Record<string, unknown>) {
  const raw = input.sourceAssetIds
  const ids = Array.isArray(raw)
    ? raw.map(toPositiveNumber).filter((id): id is number => !!id)
    : []
  if (!ids.length) {
    return
  }
  const uniqueIds = Array.from(new Set(ids)).slice(0, 40)
  const assets = await Promise.all(uniqueIds.map((id) => getAssetDetail(id).catch(() => null)))
  assets.filter((asset): asset is AssetItem => !!asset).forEach(applyImportedSourceAsset)
}

function expandImportedCarSalesDetails() {
  void nextTick(() => {
    [
      carSceneDetailsRef,
      carVehicleExtraDetailsRef,
      carScriptPlanDetailsRef,
      carAudioPeopleDetailsRef,
      carVoiceDetailsRef,
      carBgmDetailsRef,
      carPackagingDetailsRef,
      carMaterialVideoDetailsRef,
      carSalesInfoDetailsRef,
      carAdvancedPromptDetailsRef,
    ].forEach((target) => {
      if (target.value) {
        target.value.open = false
      }
    })
  })
}

function importedScenesToStoryboardText(scenes: Record<string, unknown>[]) {
  if (!scenes.length) return ''
  const storyboard = scenes.map((scene, idx) => {
    const duration = importNumber(scene, 'duration')
    return {
      order: importNumber(scene, 'segmentIndex') || idx + 1,
      time: duration ? `${Math.round(duration)}秒` : '',
      page: firstImportText(scene, ['visualPrompt', 'prompt', 'title']),
      visualPrompt: firstImportText(scene, ['visualPrompt', 'prompt']),
      prompt: firstImportText(scene, ['prompt']),
      content: firstImportText(scene, ['voiceText']),
      highlight: firstImportText(scene, ['shotPurpose', 'compareDimension']),
    }
  })
  return JSON.stringify(storyboard, null, 2)
}

function importedBundleEntries(
  urls: string[],
  packageId: string,
  bindings: Record<string, unknown>[],
  scene: boolean,
) {
  return urls.map((url): CarBundleImageEntry => {
    const binding = bindings.find((item) =>
      firstImportText(item, ['url']) === url &&
      (!packageId || firstImportText(item, ['carPackageId']) === packageId),
    )
    const role = normalizeCarAssetRole(binding ? firstImportText(binding, ['assetRole', 'role']) : '')
    const safeRole = scene
      ? CAR_SCENE_REFERENCE_ROLES.includes(role) ? role : ''
      : role
    return {
      url,
      role: safeRole,
      assetId: binding ? toPositiveNumber(binding.assetId) || undefined : undefined,
      label: safeRole ? carRoleLabel(safeRole) : undefined,
      fileName: url.split('/').pop() || '',
    }
  })
}

function applyImportedCarPackages(input: Record<string, unknown>, bindings: Record<string, unknown>[]) {
  const packages = recordArrayField(input, 'carPackages')
  if (!packages.length) {
    compareCarPackages.value = []
    return
  }
  compareCarPackages.value = packages.map((pkg, idx) => {
    const packageId = firstImportText(pkg, ['packageId']) || `import-car-pkg-${idx + 1}`
    const imageUrls = stringArrayField(pkg, 'imageUrls')
    const sceneImageUrls = stringArrayField(pkg, 'sceneImageUrls')
    const role = firstImportText(pkg, ['role'])
    return {
      localId: packageId,
      packageAssetId: toPositiveNumber(pkg.packageAssetId) || undefined,
      packageAssetUrl: '',
      packageName: firstImportText(pkg, ['packageName']) || `车型 ${idx + 1}`,
      carIndex: importNumber(pkg, 'carIndex') ?? idx,
      role: role && isCompareCarRole(role) ? role : idx === 0 ? 'main' : 'compare',
      brandModel: firstImportText(pkg, ['brandModel', 'packageName']),
      color: firstImportText(pkg, ['color']),
      sellingPoints: firstImportText(pkg, ['sellingPoints']),
      materialCompleteness: firstImportText(pkg, ['materialCompleteness']),
      images: importedBundleEntries(imageUrls, packageId, bindings, false),
      sceneImages: importedBundleEntries(sceneImageUrls, packageId, bindings, true),
    }
  })
}

async function applyCarSalesTaskImport(input: Record<string, unknown>) {
  productionMode.value = 'manual'
  mainTab.value = 'carSales'
  applyCommonSeedanceImport(input)

  const bindings = recordArrayField(input, 'assetRoleBindings')
  const scenes = recordArrayField(input, 'scenes')
  const vehicleUrls = stringArrayField(input, 'carImageUrls')
  const sceneUrls = importedSceneUrls(scenes, vehicleUrls, bindings, [
    firstImportText(input, ['hostImageUrl']),
  ])
  applyImportedAssetBindings(bindings, vehicleUrls, sceneUrls)

  if (vehicleUrls.length) {
    carImages.value = vehicleUrls
    carPickedImageUrl.value = vehicleUrls[0] || ''
  }
  if (sceneUrls.length) {
    carSceneImages.value = sceneUrls
    carPickedSceneImageUrl.value = sceneUrls[0] || ''
  }
  await applyImportedSourceAssetIds(input)
  if (carBundleAssetUrl.value.trim()) {
    carBundleLoadedName.value = carBundleLoadedName.value || firstImportText(input, ['brandModel']) || '车型素材包'
    carBundleImageCount.value = carImageUrls.value.length + carSceneMaterialUrls.value.length
  }

  const taskMode = firstImportText(input, ['taskMode'])
  multiCarCompareEnabled.value = taskMode === 'multi_car_compare'
  applyImportedCarPackages(input, bindings)
  if (multiCarCompareEnabled.value && compareCarPackages.value.length < 2) {
    multiCarCompareEnabled.value = false
  }

  carBrandModel.value = firstImportText(input, ['brandModel'])
  carSellingPoints.value = firstImportText(input, ['sellingPoints'])
  carAudience.value = firstImportText(input, ['audience'])
  carCallToAction.value = firstImportText(input, ['callToAction']) || carCallToAction.value
  carStoryboardContext.value =
    importedScenesToStoryboardText(scenes) ||
    firstImportText(input, ['scriptContext']) ||
    carStoryboardContext.value

  const voiceTextSource = firstImportText(input, ['voiceTextSource'])
  if (voiceTextSource && isCarVoiceTextSource(voiceTextSource)) {
    carVoiceTextSource.value = voiceTextSource
  }
  const finalVoiceText = firstImportText(input, ['finalVoiceText', 'voiceText'])
  if (finalVoiceText) {
    if (carVoiceTextSource.value === 'benchmark') {
      carBenchmarkVoiceText.value = finalVoiceText
    } else if (voiceTextSource && isCarVoiceTextSource(voiceTextSource)) {
      carVoiceContext.value = finalVoiceText
    } else if (carBenchmarkAssetUrl.value.trim()) {
      carBenchmarkVoiceText.value = finalVoiceText
      carVoiceTextSource.value = 'benchmark'
    } else {
      carVoiceContext.value = finalVoiceText
      carVoiceTextSource.value = 'manual'
    }
  }

  carAudioUrl.value = firstImportText(input, ['audioUrl', 'generatedVoiceUrl']) || carAudioUrl.value
  const audioMode = firstImportText(input, ['audioMode'])
  if (audioMode && isCarAudioMode(audioMode)) {
    carAudioMode.value = audioMode
  }
  const voicePolicy = firstImportText(input, ['voicePolicy'])
  if (!audioMode && voicePolicy === 'model_native') {
    carAudioMode.value = 'model_native'
  } else if (!audioMode && voicePolicy === 'auto_tts') {
    carAudioMode.value = 'auto_tts'
  } else if (!audioMode && voicePolicy === 'none') {
    carAudioMode.value = 'none'
  }
  carBgmUrl.value = firstImportText(input, ['bgmUrl']) || carBgmUrl.value

  const nativeVoiceLanguage = firstImportText(input, ['nativeVoiceLanguage'])
  if (nativeVoiceLanguage && isNativeVoiceLanguage(nativeVoiceLanguage)) {
    carNativeVoiceLanguage.value = nativeVoiceLanguage
  }
  carNativeVoiceStyle.value = normalizeCarNativeVoiceStyle(firstImportText(input, ['nativeVoiceStyle']) || carNativeVoiceStyle.value)
  carNativeSpeechStyle.value = firstImportText(input, ['nativeSpeechStyle']) || carNativeSpeechStyle.value

  const subtitleMode = firstImportText(input, ['subtitleMode'])
  if (subtitleMode && isCarSubtitleMode(subtitleMode)) {
    carSubtitleMode.value = subtitleMode
  }
  carSubtitleText.value = firstImportText(input, ['subtitle'])
  const subtitleLanguage = firstImportText(input, ['subtitleLanguage'])
  if (subtitleLanguage) {
    carSubtitleLanguage.value = subtitleLanguage
  }
  const subtitleTimingMode = firstImportText(input, ['subtitleTimingMode'])
  if (subtitleTimingMode && isCarSubtitleTimingMode(subtitleTimingMode)) {
    carSubtitleTimingMode.value = subtitleTimingMode
  }
  const syncStrategy = firstImportText(input, ['syncStrategy'])
  if (syncStrategy && isCarSyncStrategy(syncStrategy)) {
    carSyncStrategy.value = syncStrategy
  }

  const subtitleOverlay = asRecord(input.subtitleOverlay)
  if (subtitleOverlay) {
    carSubtitleFontFamily.value = firstImportText(subtitleOverlay, ['fontFamily']) || carSubtitleFontFamily.value
    carSubtitleFontSize.value = importNumber(subtitleOverlay, 'fontSize') || carSubtitleFontSize.value
    carSubtitleTextColor.value = firstImportText(subtitleOverlay, ['textColor']) || carSubtitleTextColor.value
    carSubtitleOutlineColor.value = firstImportText(subtitleOverlay, ['outlineColor']) || carSubtitleOutlineColor.value
    const position = firstImportText(subtitleOverlay, ['position'])
    if (position && isCarHeadlinePosition(position)) {
      carSubtitlePosition.value = position
    }
  }

  const hostEnabled = importBoolean(input, 'hostAppearanceEnabled')
  if (hostEnabled != null) {
    carHostAppearanceEnabled.value = hostEnabled
  }
  carHostImageUrl.value = firstImportText(input, ['hostImageUrl']) || carHostImageUrl.value
  carMaterialVideoUrl.value = firstImportText(input, ['hostVideoUrl']) || carMaterialVideoUrl.value

  const overlay = asRecord(input.headlineOverlay)
  carHeadlineEnabled.value = overlay ? Boolean(importBoolean(overlay, 'enabled') ?? firstImportText(overlay, ['text'])) : false
  if (overlay) {
    carHeadlineText.value = firstImportText(overlay, ['text'])
    carHeadlineFontFamily.value = firstImportText(overlay, ['fontFamily']) || carHeadlineFontFamily.value
    carHeadlineFontSize.value = importNumber(overlay, 'fontSize') || carHeadlineFontSize.value
    carHeadlineTextColor.value = firstImportText(overlay, ['textColor']) || carHeadlineTextColor.value
    carHeadlineOutlineColor.value = firstImportText(overlay, ['outlineColor']) || carHeadlineOutlineColor.value
    const position = firstImportText(overlay, ['position'])
    if (position && isCarHeadlinePosition(position)) {
      carHeadlinePosition.value = position
    }
  }

  const sceneDurations = scenes
    .map((scene) => importNumber(scene, 'duration'))
    .filter((value): value is number => value != null && value > 0)
  const count = importNumber(input, 'segmentCount') || sceneDurations.length || carSegmentCount.value
  carSegmentCount.value = normalizeCarSegmentCount(count)
  carSegmentDurations.value = normalizeCarSegmentDurations(
    sceneDurations.length ? sceneDurations : [importNumber(input, 'segmentDuration') || carSegmentDuration.value],
    carSegmentCount.value,
  )
  syncCarSegmentDurationFallback(carSegmentDurations.value)
  carSegmentTimingTouched.value = true
  enforceRequiredModelSelection()
  expandImportedCarSalesDetails()
}

function applyTextVideoTaskImport(input: Record<string, unknown>) {
  productionMode.value = 'manual'
  mainTab.value = 'text'
  applyCommonSeedanceImport(input)
}

function applyImageVideoTaskImport(taskType: string, input: Record<string, unknown>) {
  productionMode.value = 'manual'
  mainTab.value = 'image'
  applyCommonSeedanceImport(input)
  if (taskType === 'SEEDANCE_FIRST_LAST_FRAME_VIDEO') {
    imageSubTab.value = 'firstLast'
    firstFrame.value = firstImportText(input, ['firstFrameUrl'])
    lastFrame.value = firstImportText(input, ['lastFrameUrl'])
    return
  }
  if (taskType === 'SEEDANCE_REFERENCE_VIDEO' || stringArrayField(input, 'imageUrls').length > 0) {
    imageSubTab.value = 'reference'
    const urls = stringArrayField(input, 'imageUrls')
    referenceImages.value = urls.length ? urls : ['']
    return
  }
  imageSubTab.value = 'first'
  firstFrame.value = firstImportText(input, ['imageUrl'])
}

async function applyPendingRenderTaskImport() {
  const pending = await resolveRenderTaskImport()
  const input = asRecord(pending?.input)
  if (!pending || !input) {
    if (taskImportIdFromRoute()) {
      ElMessage.warning('未找到可还原的任务参数')
    }
    return
  }
  if (pending.taskType === 'SEEDANCE_CAR_SALES_VIDEO') {
    await applyCarSalesTaskImport(input)
  } else if (pending.taskType === 'SEEDANCE_TEXT_VIDEO' || pending.taskType.startsWith('TEXT_TO_VIDEO')) {
    applyTextVideoTaskImport(input)
  } else {
    applyImageVideoTaskImport(pending.taskType, input)
  }
  const query = { ...route.query }
  delete query.importTask
  void router.replace({ name: 'render', query })
  ElMessage.success('已恢复任务参数，可检查后再次生成')
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
      const carScenes = buildCarSalesScenes()
      const requestCarImageUrls = isMultiCarCompareMode.value
        ? Array.from(new Set(comparePackageImageUrls.value)).slice(0, 45)
        : carImageUrls.value
      const carSalesRequest = {
        carImageUrls: requestCarImageUrls,
        taskMode: isMultiCarCompareMode.value ? 'multi_car_compare' : 'car_sales',
        brandModel: isMultiCarCompareMode.value
          ? orderedCompareCarPackages.value.map((pkg) => pkg.brandModel || pkg.packageName).join(' vs ')
          : carBrandModel.value.trim() || undefined,
        sellingPoints: isMultiCarCompareMode.value
          ? compareDimensionList.value.join('、')
          : carSellingPoints.value.trim() || undefined,
        audience: carAudience.value.trim() || undefined,
        callToAction: carCallToAction.value.trim() || undefined,
        scriptContext: buildCarScriptContext() || undefined,
        prompt: prompt.value.trim() || undefined,
        subtitle: buildCarSubtitleValue(),
        subtitleMode: carSubtitleMode.value,
        subtitleLanguage: carSubtitleLanguage.value,
        subtitleTimingMode: carSubtitleTimingMode.value,
        syncStrategy: carSyncStrategyForRequest(),
        subtitleOverlay: buildCarSubtitleOverlayForRequest(),
        headlineOverlay: buildCarHeadlineOverlayForRequest(),
        audioUrl: hasSelectedVoiceAudio() ? carAudioUrl.value.trim() : undefined,
        audioMode: carAudioModeForRequest(),
        bgmUrl: carBgmUrl.value.trim() || undefined,
        voicePolicy: carVoicePolicyForRequest(),
        voiceTextSource: carVoiceTextSource.value,
        finalVoiceText: carFinalVoiceTextForRequest(),
        strictVoiceText: Boolean(strictVoiceTextForRequest()),
        nativeVoiceLanguage: usesGeneratedVoiceover() ? carNativeVoiceLanguage.value : undefined,
        nativeVoiceStyle: usesGeneratedVoiceover() ? normalizeCarNativeVoiceStyle(carNativeVoiceStyle.value) : undefined,
        nativeSpeechStyle: usesGeneratedVoiceover() ? carNativeSpeechStyle.value : undefined,
        ignoredStoryboardFields: storyboardIgnoredFields.value,
        hostImageUrl: carHostAppearanceEnabled.value ? carHostImageUrl.value.trim() || undefined : undefined,
        hostAppearanceEnabled: carHostAppearanceEnabled.value,
        hostVideoUrl: carMaterialVideoUrl.value.trim() || undefined,
        sourceAssetIds: carSourceAssetIds(),
        renderMode: 'manual',
        aspectRatio: aspectRatioForRequest(),
        assetRoleBindings: buildCarAssetRoleBindings(),
        carPackages: buildCompareCarPackagesForRequest(),
        segmentCount: carGenerationGroupPreviewRows.value.length || carScenes.length || carSegmentCount.value,
        segmentDuration: averageSegmentDuration(carScenes.map((scene) => Number(scene.duration) || carSegmentDuration.value)),
        scenes: carScenes,
        model: selectedModel.value,
      } satisfies CarSalesVideoRequest
      const submitted = await generateCarSalesVideo(carSalesRequest)
      saveRenderTaskSnapshot(submitted.taskId, 'SEEDANCE_CAR_SALES_VIDEO', carSalesRequest)
      submittedTaskId = submitted.taskId
      submittedStatus = String(submitted.status)
    } else if (mainTab.value === 'text') {
      const textVideoRequest = {
        prompt: prompt.value.trim(),
        duration: duration.value,
        ratio: aspectRatioForRequest(),
        model: selectedModel.value,
      } satisfies TextToVideoRequest
      const submitted = await generateTextToVideo(textVideoRequest)
      saveRenderTaskSnapshot(submitted.taskId, 'SEEDANCE_TEXT_VIDEO', textVideoRequest)
      submittedTaskId = submitted.taskId
      submittedStatus = String(submitted.status)
    } else if (imageSubTab.value === 'first') {
      const firstFrameRequest = {
        imageUrl: firstFrame.value.trim(),
        prompt: prompt.value.trim() || undefined,
        duration: duration.value,
        ratio: aspectRatioForRequest(),
        model: selectedModel.value,
      } satisfies FirstFrameVideoRequest
      const submitted = await generateFirstFrameVideo(firstFrameRequest)
      saveRenderTaskSnapshot(submitted.taskId, 'SEEDANCE_FIRST_FRAME_VIDEO', firstFrameRequest)
      submittedTaskId = submitted.taskId
      submittedStatus = String(submitted.status)
    } else if (imageSubTab.value === 'firstLast') {
      const firstLastFrameRequest = {
        firstFrameUrl: firstFrame.value.trim(),
        lastFrameUrl: lastFrame.value.trim(),
        prompt: prompt.value.trim() || undefined,
        duration: duration.value,
        ratio: aspectRatioForRequest(),
        model: selectedModel.value,
      } satisfies FirstLastFrameVideoRequest
      const submitted = await generateFirstLastFrameVideo(firstLastFrameRequest)
      saveRenderTaskSnapshot(submitted.taskId, 'SEEDANCE_FIRST_LAST_FRAME_VIDEO', firstLastFrameRequest)
      submittedTaskId = submitted.taskId
      submittedStatus = String(submitted.status)
    } else {
      const urls = referenceImages.value.map((u) => u.trim()).filter((u) => u.length > 0)
      const referenceVideoRequest = {
        imageUrls: urls,
        prompt: prompt.value.trim() || undefined,
        duration: duration.value,
        ratio: aspectRatioForRequest(),
        model: selectedModel.value,
      } satisfies ReferenceVideoRequest
      const submitted = await generateReferenceVideo(referenceVideoRequest)
      saveRenderTaskSnapshot(submitted.taskId, 'SEEDANCE_REFERENCE_VIDEO', referenceVideoRequest)
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

function friendlyRenderTaskError(message: string | null | undefined, fallback: string) {
  const trimmed = (message || '').trim()
  const normalized = trimmed.toLowerCase()
  if (
    normalized.includes('voiceover_quota_exceeded') ||
    normalized.includes('quota exceeded') ||
    normalized.includes('text_words_lifetime') ||
    normalized.includes('quota_exceeded')
  ) {
    return '后期旁白配音额度已用完，系统会自动改用“音视频同步生成”；也可以上传或选择一条口播音频后再提交。'
  }
  return trimmed || fallback
}

function startSeedanceTaskTracking(taskId: number) {
  stopSeedanceTracking()
  stopSeedanceTaskTracking = trackTaskResult<VideoTaskVO>(taskId, {
    onStatus(message) {
      taskStatus.value = String(message.status)
      taskProgress.value = message.progress
      digitalHumanTaskError.value = friendlyRenderTaskError(message.errorMessage, '')
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
      digitalHumanTaskError.value = friendlyRenderTaskError(taskResult.errorMessage, '')
    },
    onFailure(message) {
      errorMessage.value = friendlyRenderTaskError(message.errorMessage, '视频生成任务失败')
      digitalHumanTaskError.value = errorMessage.value
      busy.value = false
      activeSeedanceTaskId.value = null
    },
    onError(error) {
      errorMessage.value = friendlyRenderTaskError(error.message, '视频生成任务失败')
      digitalHumanTaskError.value = errorMessage.value
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
        errorMessage: friendlyRenderTaskError(partial.errorMessage, '') || null,
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
    digitalHumanTaskError.value = friendlyRenderTaskError(detail.errorMessage, '')
    if (['SUCCESS', 'FAILED', 'RETRYABLE', 'CANCELED'].includes(detail.status)) {
      stopDigitalHumanPoll()
      busy.value = false
      if (detail.status === 'SUCCESS' && detail.videoUrl) {
        result.value = digitalHumanDetailToVideoResult(detail)
      } else if (detail.errorMessage) {
        errorMessage.value = friendlyRenderTaskError(detail.errorMessage, '')
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
  await applyPendingRenderTaskImport()
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

.render-manual-workflow {
  grid-template-columns: minmax(0, 1fr);
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

.render-aspect-panel {
  display: grid;
  gap: 12px;
  border: 1px solid #d9e2ff;
  border-radius: 8px;
  background: #fff;
  padding: 12px;
}

.render-aspect-panel .render-form-field {
  width: 100%;
}

.render-car-workflow-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
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
  grid-column: 1 / -1;
  color: #667085;
  font-size: 12.5px;
  line-height: 1.5;
}

.render-manual-module {
  display: grid;
  gap: 14px;
  border: 1px solid #e3e7ef;
  border-radius: 8px;
  background: #fff;
  padding: 14px;
}

.render-manual-module-core {
  background: #fbfcff;
}

.render-module-title {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.render-module-title-compact {
  padding-bottom: 2px;
}

.render-module-title h3 {
  margin: 0 0 4px;
  color: #1d2939;
  font-size: 15px;
  font-weight: 900;
}

.render-module-title small {
  color: #667085;
  font-size: 12px;
  line-height: 1.6;
}

.render-module-title > span {
  flex: 0 0 auto;
  border-radius: 999px;
  background: #eef0f6;
  color: #667085;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 900;
}

.render-module-title > span.render-required-badge {
  background: #ecfdf3;
  color: #067647;
}

.render-fast-extra {
  background: #fff;
}

.render-fast-extra > .render-optional-body {
  background: #fbfcff;
}

.render-scene-compact {
  border-color: #b7e4cd;
  background: #f7fef9;
}

.render-scene-compact > .render-optional-body {
  background: #fff;
}

.render-scene-compact .asset-picker-compact,
.render-scene-compact .render-ref-item-car {
  background: #fff;
}

.render-function-reference-panel {
  display: grid;
  gap: 10px;
  border: 1px solid #fde68a;
  border-radius: 8px;
  background: #fffbeb;
  padding: 12px;
}

.render-function-reference-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.render-function-reference-head div {
  display: grid;
  gap: 3px;
}

.render-function-reference-head strong {
  color: #92400e;
  font-size: 13px;
  font-weight: 900;
}

.render-function-reference-head small {
  color: #a16207;
  font-size: 12px;
  line-height: 1.5;
}

.render-function-reference-head > span,
.render-function-reference-item > span {
  flex: 0 0 auto;
  border-radius: 999px;
  background: #ecfdf3;
  color: #067647;
  padding: 3px 9px;
  font-size: 11px;
  font-weight: 900;
}

.render-function-reference-head > span.missing,
.render-function-reference-item > span:not(.ok) {
  background: #fff7ed;
  color: #c2410c;
}

.render-function-reference-list {
  display: grid;
  gap: 8px;
}

.render-function-reference-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid rgba(245, 158, 11, 0.22);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.78);
  padding: 9px 10px;
}

.render-function-reference-item div {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.render-function-reference-item strong {
  color: #344054;
  font-size: 12.5px;
  font-weight: 900;
}

.render-function-reference-item small {
  color: #667085;
  font-size: 12px;
  line-height: 1.45;
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
  flex: 0 0 auto;
  border-radius: 999px;
  background: #eef0f6;
  color: #667085;
  padding: 3px 9px;
  font-size: 11px;
  font-weight: 900;
}

.render-optional-group summary span {
  color: #344054;
  font-size: 13px;
  font-weight: 900;
}

.render-optional-group summary em,
.render-details summary em {
  display: inline-flex;
  margin-left: 6px;
  border-radius: 999px;
  background: #eef0f6;
  color: #667085;
  padding: 2px 7px;
  font-size: 11px;
  font-style: normal;
  font-weight: 900;
  vertical-align: middle;
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

.render-auto-plan-panel {
  display: grid;
  gap: 12px;
  border: 1px solid #d8e2ff;
  border-radius: 8px;
  background: #f8fbff;
  padding: 14px;
}

.render-auto-plan-head {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.render-auto-plan-head div {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.render-auto-plan-head strong {
  color: #1d2939;
  font-size: 14px;
  font-weight: 900;
}

.render-auto-plan-head small {
  color: #667085;
  font-size: 12px;
  line-height: 1.6;
}

.render-auto-plan-head > span {
  flex: 0 0 auto;
  border-radius: 999px;
  background: #e8efff;
  color: #3159d6;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 900;
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

.render-auto-plan-panel .render-recommend-panel {
  background: #fff;
}

.render-segment-count-field {
  border: 1px solid #edf0f6;
  border-radius: 8px;
  background: #fff;
  padding: 12px;
}

.render-auto-current-plan {
  display: grid;
  gap: 4px;
  border: 1px solid #edf0f6;
  border-radius: 8px;
  background: #fff;
  padding: 12px;
}

.render-auto-current-plan span,
.render-auto-current-plan small {
  color: #667085;
  font-size: 12px;
  line-height: 1.5;
}

.render-auto-current-plan span {
  font-weight: 900;
}

.render-auto-current-plan strong {
  color: #1d2939;
  font-size: 15px;
  font-weight: 900;
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
  flex: 0 0 auto;
  border-radius: 999px;
  background: #eef0f6;
  color: #667085;
  padding: 3px 9px;
  font-size: 12px;
  font-weight: 900;
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
  .render-color-grid,
  .render-basis-grid {
    grid-template-columns: 1fr;
  }

  .render-audio-mode {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .render-tts-source-options {
    grid-template-columns: 1fr;
  }

  .render-packaging-toggles {
    grid-template-columns: 1fr;
  }

  .render-recommend-panel,
  .render-auto-plan-head,
  .render-module-title,
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

.render-subtitle-mode,
.render-sync-mode {
  grid-template-columns: repeat(3, minmax(0, 1fr));
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

@media (max-width: 720px) {
  .render-subtitle-mode,
  .render-sync-mode,
  .render-voice-policy-actions {
    grid-template-columns: 1fr;
  }
}

.render-text-poster-panel {
  display: grid;
  gap: 12px;
  border: 1px solid #dce3f2;
  border-radius: 8px;
  background: #fff;
  padding: 12px;
}

.render-text-poster-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.render-text-poster-title {
  display: grid;
  gap: 4px;
}

.render-text-poster-title label {
  color: #2d3446;
  font-size: 13px;
  font-weight: 900;
}

.render-text-poster-title small {
  color: #667085;
  font-size: 12px;
  line-height: 1.45;
}

.render-text-poster-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(76px, 1fr));
  flex: 0 0 auto;
  gap: 6px;
}

.render-text-poster-switch button {
  min-height: 32px;
  border: 1px solid #e1e6f0;
  border-radius: 8px;
  background: #fff;
  color: #4f586c;
  font-size: 12.5px;
  font-weight: 850;
  cursor: pointer;
}

.render-text-poster-switch button.active {
  border-color: #7d69ff;
  background: #f5f3ff;
  color: #5b4be7;
}

.render-text-poster-switch button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.render-text-poster-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  gap: 10px;
}

.render-text-poster-controls input[type='color'] {
  width: 100%;
  min-height: 38px;
  padding: 4px;
}

.render-color-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.render-color-field {
  border: 1px solid #edf0f6;
  border-radius: 8px;
  background: #fbfcff;
  padding: 10px;
}

.render-color-row {
  display: grid;
  grid-template-columns: 32px 42px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
}

.render-color-current {
  width: 32px;
  height: 32px;
  border: 1px solid #d8dde8;
  border-radius: 999px;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.72);
}

.render-color-row input[type='color'] {
  width: 42px;
  height: 34px;
  border: 1px solid #d8dde8;
  border-radius: 8px;
  background: #fff;
  padding: 3px;
}

.render-color-row input[type='text'] {
  min-width: 0;
  height: 34px;
  padding: 0 10px;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 800;
  text-transform: uppercase;
}

.render-color-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.render-color-swatch {
  width: 30px;
  height: 30px;
  border: 2px solid #d8dde8;
  border-radius: 999px;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.74);
  cursor: pointer;
}

.render-color-swatch.active {
  border-color: #635bff;
  box-shadow:
    0 0 0 3px rgba(99, 91, 255, 0.16),
    inset 0 0 0 2px rgba(255, 255, 255, 0.74);
}

.render-color-swatch:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.render-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

.render-text-poster-preview-wrap {
  display: grid;
  gap: 8px;
}

.render-text-poster-preview-wrap > label {
  color: #344054;
  font-size: 12.5px;
  font-weight: 900;
}

.render-text-poster-preview {
  display: flex;
  min-height: 156px;
  overflow: hidden;
  align-items: flex-start;
  justify-content: center;
  border: 1px solid #e6eaf2;
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(17, 24, 39, 0.86), rgba(71, 85, 105, 0.66)),
    linear-gradient(90deg, #111827, #64748b);
  padding: 14px;
}

.render-text-poster-preview.pos-middle {
  align-items: center;
}

.render-text-poster-preview.pos-bottom {
  align-items: flex-end;
}

.render-text-poster-preview span {
  max-width: 96%;
  font-size: clamp(24px, 5vw, 52px);
  font-weight: 1000;
  line-height: 1.06;
  overflow-wrap: normal;
  text-align: center;
  white-space: pre-wrap;
  word-break: normal;
}

.render-packaging-toggles {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.render-packaging-toggles span {
  display: grid;
  gap: 2px;
  border: 1px dashed #dfe3ed;
  border-radius: 8px;
  background: #fafbff;
  color: #344054;
  padding: 10px;
  font-size: 12.5px;
  font-weight: 900;
}

.render-packaging-toggles em {
  color: #98a2b3;
  font-size: 11px;
  font-style: normal;
  font-weight: 800;
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

.render-tts-language-note {
  color: #6c768c;
  font-size: 12px;
  line-height: 1.5;
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

.render-scene-voice-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.render-scene-voice-tags span {
  border: 1px solid #dce3f2;
  border-radius: 999px;
  background: #fff;
  color: #4f586c;
  padding: 3px 8px;
  font-size: 11.5px;
  font-weight: 850;
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

.render-multi-car-panel {
  display: grid;
  gap: 12px;
  border: 1px solid #dce3f2;
  border-radius: 8px;
  background: #fff;
  padding: 12px;
}

.render-multi-car-head,
.render-multi-car-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.render-multi-car-head > div {
  display: grid;
  gap: 4px;
}

.render-multi-car-head strong {
  color: #2d3446;
  font-size: 13px;
  font-weight: 900;
}

.render-multi-car-head em {
  color: #98a2b3;
  font-style: normal;
}

.render-multi-car-head small,
.render-multi-car-item p,
.render-multi-car-empty {
  color: #667085;
  font-size: 12.5px;
  line-height: 1.55;
}

.render-multi-car-body,
.render-multi-car-list {
  display: grid;
  gap: 10px;
}

.render-multi-car-item {
  display: grid;
  gap: 10px;
  border: 1px solid #edf0f6;
  border-radius: 8px;
  background: #fbfcff;
  padding: 10px;
}

.render-multi-car-item-head strong {
  color: #111827;
  font-size: 13px;
  font-weight: 900;
}

.render-multi-car-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.render-multi-car-actions button {
  min-height: 28px;
  border: 1px solid #dce3f2;
  border-radius: 8px;
  background: #fff;
  color: #4f586c;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.render-multi-car-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.render-multi-car-fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  gap: 8px;
}

.render-multi-car-fields label,
.render-multi-car-dimensions {
  display: grid;
  gap: 6px;
}

.render-multi-car-fields span,
.render-multi-car-dimensions span {
  color: #344054;
  font-size: 12px;
  font-weight: 900;
}

.render-multi-car-fields input,
.render-multi-car-fields select,
.render-multi-car-dimensions input {
  min-width: 0;
  height: 36px;
  border: 1px solid #e1e6f0;
  border-radius: 8px;
  background: #fff;
  color: #111827;
  padding: 0 10px;
  outline: none;
}

.render-multi-car-empty {
  border: 1px dashed #dce3f2;
  border-radius: 8px;
  background: #fbfcff;
  padding: 10px;
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

.render-host-toggle-core {
  border-color: #d8e2ff;
  background: #f8fbff;
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

.render-voice-policy-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 6px;
}

.render-voice-policy-actions button {
  min-height: 36px;
  border: 1px solid #b7e4cd;
  border-radius: 8px;
  background: #fff;
  color: #067647;
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
}

.render-voice-policy-actions button.active {
  border-color: #10b981;
  background: #dcfce7;
  color: #065f46;
  box-shadow: inset 0 0 0 1px rgba(16, 185, 129, 0.18);
}

.render-voice-policy-actions button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.render-voice-policy small {
  color: currentColor;
  font-size: 12px;
  line-height: 1.5;
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
  border: 1px solid #dce3f2;
  border-radius: 8px;
  background: #fbfcff;
  padding: 14px;
}

.render-basis-summary {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
  list-style: none;
}

.render-basis-summary::-webkit-details-marker {
  display: none;
}

.render-basis-summary::after {
  flex: 0 0 auto;
  border-radius: 999px;
  background: #eef0f6;
  color: #667085;
  padding: 3px 9px;
  font-size: 11px;
  font-weight: 900;
}

details.render-optional-group:not([open]) > summary::after,
details.render-details:not([open]) > summary::after,
details.render-basis-panel:not([open]) > .render-basis-summary::after {
  content: '展开';
}

details.render-optional-group[open] > summary::after,
details.render-details[open] > summary::after,
details.render-basis-panel[open] > .render-basis-summary::after {
  content: '收起';
}

.render-basis-summary > span {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  color: #151a2d;
  font-size: 14px;
  font-weight: 900;
}

.render-basis-summary em {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 3px 9px;
  font-size: 11px;
  font-style: normal;
  font-weight: 900;
}

.render-basis-summary em.ok {
  background: #eafaf1;
  color: #099250;
}

.render-basis-summary em.danger {
  background: #fff1f0;
  color: #d92d20;
}

.render-basis-summary small {
  min-width: 0;
  overflow: hidden;
  color: #667085;
  font-size: 12px;
  font-weight: 750;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.render-basis-body {
  display: grid;
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e7eaf2;
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

.render-generation-plan {
  display: grid;
  gap: 10px;
  border: 1px solid #e1e6f0;
  border-radius: 8px;
  background: #fff;
  padding: 12px;
}

.render-generation-plan-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.render-generation-plan-head strong {
  color: #232838;
  font-size: 13px;
  font-weight: 900;
}

.render-generation-plan-head span {
  color: #667085;
  font-size: 12.5px;
  font-weight: 800;
}

.render-generation-plan-list {
  display: grid;
  gap: 8px;
}

.render-generation-plan-item {
  display: grid;
  gap: 5px;
  border: 1px solid #edf0f6;
  border-radius: 8px;
  background: #fbfcff;
  padding: 10px 12px;
}

.render-generation-plan-item > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.render-generation-plan-item strong {
  color: #232838;
  font-size: 12.5px;
  font-weight: 900;
}

.render-generation-plan-item span,
.render-generation-plan-item small {
  color: #667085;
  font-size: 12px;
  font-weight: 800;
}

.render-generation-plan-item p {
  margin: 0;
  color: #4f586c;
  font-size: 12.5px;
  line-height: 1.55;
  overflow-wrap: anywhere;
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
  .render-basis-summary {
    align-items: flex-start;
    flex-direction: column;
  }

  .render-basis-summary small {
    white-space: normal;
  }

  .render-basis-grid {
    grid-template-columns: 1fr;
  }

  .render-generation-plan-head,
  .render-generation-plan-item > div {
    align-items: flex-start;
    flex-direction: column;
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
