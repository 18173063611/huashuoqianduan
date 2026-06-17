<template>
  <div class="benchmark-page">
    <div class="benchmark-redesign">
      <header class="benchmark-redesign-head">
        <div class="benchmark-title-line">
          <div>
            <h1>
              爆款对标创作
              <span class="benchmark-head-tag">爆款驱动</span>
            </h1>
            <p>从优秀案例中提炼卖点、文案和成片结构。</p>
          </div>
        </div>
        <div class="benchmark-head-actions">
          <button type="button" class="ghost-button">
            <el-icon><Reading /></el-icon>
            <span>使用教程</span>
          </button>
          <button type="button" class="ghost-button">
            <el-icon><Clock /></el-icon>
            <span>创作记录</span>
          </button>
        </div>
      </header>

      <section class="benchmark-stage-card benchmark-input-stage">
        <div class="benchmark-stage-title">
          <span>1</span>
          <h2>选择参考视频</h2>
        </div>
        <div class="benchmark-source-grid">
          <div class="benchmark-link-panel">
            <div class="source-tabs redesign-tabs" role="tablist" aria-label="解析来源">
              <button
                type="button"
                :class="{ active: inputMode === 'link' }"
                :disabled="parsing || parseCanceling || uploadingLocalVideo"
                @click="switchInputMode('link')"
              >
                链接解析
              </button>
              <button
                type="button"
                :class="{ active: inputMode === 'upload' }"
                :disabled="parsing || parseCanceling || uploadingLocalVideo"
                @click="switchInputMode('upload')"
              >
                本地上传
              </button>
            </div>

            <template v-if="inputMode === 'link'">
              <div class="benchmark-url-row" :class="{ 'has-cancel': parsing || parseCanceling }">
                <input v-model.trim="videoUrl" :placeholder="videoPlaceholder" />
                <button
                  class="primary-button"
                  type="button"
                  :disabled="parsing || !videoUrl || !!selectedPlatformLimitReason || !!parseEstimate.insufficientHint.value"
                  :title="selectedPlatformLimitReason || parseEstimate.insufficientHint.value || ''"
                  @click="handleParseVideo"
                >
                  <el-icon><Link /></el-icon>
                  <span>{{ parsing ? '解析中…' : '粘贴并解析' }}</span>
                </button>
                <button
                  class="secondary-button"
                  type="button"
                  :disabled="parsing || parseCanceling"
                  @click="switchInputMode('upload')"
                >
                  <el-icon><Upload /></el-icon>
                  <span>上传本地视频</span>
                </button>
                <button
                  v-if="parsing || parseCanceling"
                  class="secondary-button"
                  type="button"
                  :disabled="parseCanceling"
                  @click="handleCancelParse"
                >
                  {{ parseCanceling ? '取消中…' : '取消' }}
                </button>
              </div>
              <div class="platform-tabs redesign-platforms" role="tablist" aria-label="视频平台">
                <button
                  v-for="option in platformOptions"
                  :key="option.value"
                  type="button"
                  :class="{ active: selectedPlatform === option.value }"
                  :disabled="parsing || parseCanceling"
                  @click="selectPlatform(option.value)"
                >
                  <img v-if="option.icon" :src="option.icon" alt="" />
                  <span v-else class="platform-auto-icon" aria-hidden="true">⌁</span>
                  <span>{{ option.label }}</span>
                </button>
              </div>
              <p class="platform-note">{{ selectedPlatformNote }}</p>
              <p v-if="selectedPlatformLimitReason" class="platform-limit-note">{{ selectedPlatformLimitReason }}</p>
              <p v-if="platformAutoHint" class="platform-auto-hint">{{ platformAutoHint }}</p>
            </template>

            <div v-else class="upload-parse-panel redesign-upload" :class="{ 'has-cancel': uploadingLocalVideo || parsing || parseCanceling }">
              <label class="video-upload-picker" :class="{ disabled: uploadingLocalVideo || parsing }">
                <input
                  type="file"
                  accept="video/*"
                  :disabled="uploadingLocalVideo || parsing"
                  @change="handleLocalVideoChange"
                />
                <span>{{ uploadingLocalVideo ? '上传中…' : '选择视频' }}</span>
                <small :title="localVideoFileName">{{ localVideoFileName || '支持 MP4、MOV、WEBM，最大 100MB' }}</small>
              </label>
              <button
                class="primary-button"
                type="button"
                :disabled="uploadingLocalVideo || parsing || !localVideoPreviewUrl || !!parseEstimate.insufficientHint.value"
                :title="parseEstimate.insufficientHint.value ?? ''"
                @click="handleParseUploadedVideo"
              >
                <el-icon><MagicStick /></el-icon>
                <span>{{ parsing ? '解析中…' : '解析上传视频' }}</span>
              </button>
              <button
                v-if="uploadingLocalVideo"
                class="secondary-button"
                type="button"
                :disabled="parsing"
                @click="handleCancelLocalUpload"
              >
                取消
              </button>
              <button
                v-if="parsing || parseCanceling"
                class="secondary-button"
                type="button"
                :disabled="parseCanceling"
                @click="handleCancelParse"
              >
                {{ parseCanceling ? '取消中…' : '取消解析' }}
              </button>
            </div>

            <div class="benchmark-sample-row" aria-label="示例链接">
              <article>
                <span class="sample-cover sample-cover--one"></span>
                <div>
                  <strong>比亚迪宋PLUS真实体验，后排空间太舒服了！</strong>
                  <p>抖音｜123.4w 播放｜2024-05-12</p>
                </div>
              </article>
              <article>
                <span class="sample-cover sample-cover--two"></span>
                <div>
                  <strong>10万级SUV空间天花板，家用首选！</strong>
                  <p>快手｜90.7w 播放｜2024-05-10</p>
                </div>
              </article>
              <article>
                <span class="sample-cover sample-cover--three"></span>
                <div>
                  <strong>全家出行无压力，宋PLUS空间实测</strong>
                  <p>视频号｜56.2w 播放｜2024-05-08</p>
                </div>
              </article>
            </div>

            <div v-if="downloading || downloadProgressText" class="download-progress-panel" role="status">
              <div class="download-progress-head">
                <span>{{ downloadStatusText }}</span>
                <strong v-if="downloadProgressPercent !== null">{{ downloadProgressPercent }}%</strong>
              </div>
              <div
                v-if="downloadProgressPercent !== null"
                class="download-progress-track"
                role="progressbar"
                :aria-valuemin="0"
                :aria-valuemax="100"
                :aria-valuenow="downloadProgressPercent ?? 0"
              >
                <div class="download-progress-fill" :style="{ width: `${downloadProgressPercent}%` }" />
              </div>
              <p v-if="downloadProgressText">{{ downloadProgressText }}</p>
            </div>
            <div
              v-if="inputMode === 'upload' && (uploadingLocalVideo || localUploadProgressText)"
              class="local-upload-progress"
            >
              <div
                class="local-upload-progress-track"
                role="progressbar"
                :aria-valuemin="0"
                :aria-valuemax="100"
                :aria-valuenow="localUploadProgressPercent ?? 0"
              >
                <div
                  class="local-upload-progress-fill"
                  :style="{ width: `${localUploadProgressPercent ?? 8}%` }"
                />
              </div>
              <span>{{ localUploadProgressText || '正在上传视频' }}</span>
            </div>
            <p v-if="inputMode === 'link' && downloadMessage" class="success-text">{{ downloadMessage }}</p>
            <p v-if="inputMode === 'link' && downloadError" class="error-text">{{ downloadError }}</p>
            <p v-if="inputMode === 'upload' && localUploadMessage" class="success-text">{{ localUploadMessage }}</p>
            <p v-if="inputMode === 'upload' && localUploadError" class="error-text">{{ localUploadError }}</p>
            <p v-if="parseNotice" class="info-text">{{ parseNotice }}</p>
              <p v-if="parseError && parseStage !== 'error' && parseStage !== 'completed'" class="error-text">{{ parseError }}</p>
          </div>

          <aside class="benchmark-ready-card">
            <h3><el-icon><MagicStick /></el-icon>生成准备</h3>
            <div class="ready-stat-list">
              <span><em><el-icon><Coin /></el-icon>预计消耗</em><strong>20 积分</strong></span>
              <span><em><el-icon><Timer /></el-icon>预计耗时</em><strong>1-2 分钟</strong></span>
              <span><em><el-icon><PictureRounded /></el-icon>已关联车辆图片</em><strong>{{ benchmarkDraftAssets.length || 4 }} 张</strong></span>
            </div>
            <button class="primary-button" type="button" :disabled="planPreviewLoading || planSubmitting" @click="prepareBenchmarkPlanPreview">
              <el-icon><MagicStick /></el-icon>
              <span>{{ planPreviewLoading ? '方案生成中...' : planSubmitting ? '提交中...' : '确认生成' }}</span>
            </button>
            <button type="button" class="secondary-button" @click="benchmarkAssetDrawerOpen = true">
              <el-icon><PictureRounded /></el-icon>
              <span>从资产中心选择车辆图片</span>
            </button>
          </aside>
        </div>
        <div class="billing-inline">
          <BillingEstimateBanner
            :estimated-credit-cost="parseEstimate.estimatedCreditCost.value"
            :balance="parseEstimate.balance.value"
            :loading="parseEstimate.loading.value"
            :steps="parseEstimate.steps.value"
          />
        </div>
      </section>

      <section class="benchmark-stage-card">
        <div class="benchmark-stage-title result-title">
          <span>2</span>
          <h2>爆款拆解结果</h2>
          <small>{{ parseStage === 'completed' ? '解析完成' : parseStage ? '解析进行中' : '等待解析' }}</small>
          <button class="secondary-button" type="button" :disabled="parsing" @click="handleReparseCurrent">
            <el-icon><Refresh /></el-icon>
            <span>重新解析</span>
          </button>
        </div>
        <div class="analysis-tabs">
          <button type="button" class="active">文案解析</button>
          <button type="button">分镜解析</button>
          <button type="button">爆款分析</button>
        </div>
        <div class="analysis-result-grid">
          <article class="benchmark-video-summary-card">
            <div class="benchmark-video-cover">
              <img v-if="videoCoverUrl" :src="videoCoverUrl" alt="" />
              <span v-else aria-hidden="true"></span>
              <b><el-icon><VideoPlay /></el-icon></b>
              <small>{{ douyinParse ? durationText : '00:28' }}</small>
            </div>
            <div>
              <h3>{{ douyinParse?.title || '家用 SUV 空间实测' }}</h3>
              <p>🔥 123.4w　⌚ {{ douyinParse ? durationText : '00:28' }}　{{ selectedPlatform === 'auto' ? '抖音' : selectedPlatform }}</p>
              <p>作者：{{ douyinParse?.author?.nickname || '汽车测评小王' }}</p>
            </div>
          </article>
          <article class="script-extract-card">
            <h3><el-icon><Document /></el-icon>提取的口播文案</h3>
            <textarea
              v-model="sourceText"
              :readonly="transcriptAreaReadonly"
              :placeholder="sourcePlaceholder"
            />
            <footer>
              <span>共计 {{ sourceText.replace(/\s/g, '').length }} 字</span>
              <button type="button" class="secondary-button" @click="copyRewrittenText">复制文案</button>
            </footer>
          </article>

          <article class="keyword-card">
            <h3><el-icon><MagicStick /></el-icon>爆款关键词提炼</h3>
            <div class="keyword-tags">
              <span>家用空间大</span>
              <span>后排舒适</span>
              <span>后备箱容量大</span>
              <span>全家出行</span>
              <span>10-15万SUV</span>
              <span>真实体验</span>
            </div>
            <div class="basic-info-grid">
              <span>平台</span><strong>{{ selectedPlatform === 'auto' ? '自动识别' : selectedPlatform }}</strong>
              <span>点赞量</span><strong>{{ douyinParse ? '8.7w' : '--' }}</strong>
              <span>发布时间</span><strong>2024-05-12</strong>
              <span>视频时长</span><strong>{{ douyinParse ? durationText : '--:--' }}</strong>
            </div>
          </article>

          <article class="shot-structure-card">
            <h3><el-icon><Collection /></el-icon>分镜结构（共 6 段）</h3>
            <div class="shot-track">
              <div v-for="shot in 6" :key="shot" class="shot-mini-card">
                <span>{{ String(shot).padStart(2, '0') }}</span>
                <strong>{{ ['痛点引入', '后排空间展示', '头部空间展示', '后备箱展示', '带娃出行场景', '总结推荐'][shot - 1] }}</strong>
                <small>{{ ['3.5s', '4.0s', '4.5s', '5.0s', '6.0s', '6.0s'][shot - 1] }}</small>
              </div>
            </div>
            <div class="style-tags">
              <span>真实测评</span>
              <span>口语化表达</span>
              <span>对比突出</span>
              <span>场景化展示</span>
              <span>数据/体验结合</span>
            </div>
          </article>
        </div>
      </section>

      <div class="benchmark-confirm-grid">
        <section class="benchmark-stage-card">
          <div class="benchmark-stage-title">
            <span>3</span>
            <h2>方案编辑</h2>
          </div>
          <div class="scheme-grid">
            <article class="scheme-card scheme-card--copy">
              <h3><el-icon><EditPen /></el-icon>文案（可编辑）</h3>
              <textarea v-model="sourceText" :readonly="transcriptAreaReadonly" :placeholder="sourcePlaceholder" />
              <div class="rewrite-control-row">
                <select v-model="rewriteStyle" class="rewrite-style-select" :disabled="transcriptAreaReadonly">
                  <option value="">不指定</option>
                  <option value="口语化风格">口语化风格</option>
                  <option value="专业讲解风格">专业讲解风格</option>
                  <option value="强促销转化">强促销转化</option>
                  <option value="汽车销售顾问">汽车销售顾问</option>
                </select>
                <select v-model="rewriteTargetLanguage" class="rewrite-style-select" :disabled="transcriptAreaReadonly">
                  <option value="中文">中文</option>
                  <option value="英文">英文</option>
                </select>
                <button
                  class="secondary-button"
                  type="button"
                  :disabled="rewriteLoading || transcriptAreaReadonly || !sourceText.trim()"
                  @click="handleDouyinRewrite"
                >
                  {{ rewriteLoading ? '优化中…' : 'AI 优化文案' }}
                </button>
              </div>
              <textarea v-model="rewrittenText" class="rewritten-mini-textarea" :placeholder="rewritePlaceholder" />
              <small>改写后字数：{{ rewrittenLength }}</small>
              <p v-if="rewriteError" class="rewrite-error" role="alert">{{ rewriteError }}</p>
              <div v-if="showRewriteProgressBar" class="rewrite-progress-row">
                <div class="rewrite-progress-track">
                  <div class="rewrite-progress-fill" :style="{ width: `${rewriteProgressPercent}%` }" />
                </div>
                <span class="rewrite-progress-pct">{{ rewriteProgressPercent }}%</span>
              </div>
            </article>

            <article class="scheme-card">
              <h3><el-icon><Collection /></el-icon>分镜（可调整）</h3>
              <div class="scheme-shot-list">
                <span v-for="shot in 6" :key="shot">
                  <strong>{{ String(shot).padStart(2, '0') }}</strong>
                  {{ ['痛点引入', '后排空间展示', '头部空间展示', '后备箱展示', '带娃出行场景', '总结推荐'][shot - 1] }}
                </span>
              </div>
              <button type="button" class="secondary-button">调整分镜</button>
            </article>

            <article class="scheme-card vehicle-scheme">
              <h3><el-icon><PictureRounded /></el-icon>车辆素材</h3>
              <div class="vehicle-thumb-row">
                <span class="vehicle-thumb vehicle-thumb--one"></span>
                <span class="vehicle-thumb vehicle-thumb--two"></span>
                <span class="vehicle-thumb vehicle-thumb--three"></span>
                <span class="vehicle-thumb vehicle-thumb--four"></span>
              </div>
              <button type="button" class="secondary-button" @click="benchmarkAssetDrawerOpen = true">
                从资产中心选择
              </button>
            </article>

            <article class="scheme-card">
              <h3>字幕与大字报</h3>
              <div class="option-pills">
                <span>不用</span>
                <span class="active">使用字幕</span>
                <span>双语字幕</span>
                <span class="active">智能匹配</span>
              </div>
              <button type="button" class="secondary-button">编辑样式</button>
            </article>

            <article class="scheme-card">
              <h3>背景音乐</h3>
              <div class="music-preview">
                <span>▶</span>
                <strong>智能匹配（推荐）</strong>
                <small>01:12</small>
              </div>
              <button type="button" class="secondary-button">更换音乐</button>
            </article>
          </div>
        </section>

        <aside class="generate-confirm-card">
          <div class="benchmark-stage-title">
            <span>4</span>
            <h2>方案确认与生成</h2>
          </div>
          <div class="estimate-grid">
            <article>
              <span>预计消耗积分</span>
              <strong>20 积分</strong>
              <small>查看明细 ›</small>
            </article>
            <article>
              <span>预计生成时长</span>
              <strong>1 - 2 分钟</strong>
              <small>视频时长：{{ douyinParse ? durationText : '00:28' }}</small>
            </article>
          </div>
          <div class="benchmark-asset-bridge">
            <div>
              <strong>车辆素材</strong>
              <span>{{ benchmarkDraftAssets.length ? `已选 ${benchmarkDraftAssets.length} 个` : '生成汽车销售视频至少需要 1 张车图' }}</span>
            </div>
            <button type="button" class="secondary-button" @click="benchmarkAssetDrawerOpen = true">选择车图/素材</button>
          </div>
          <div v-if="benchmarkDraftAssets.length" class="benchmark-selected-assets">
            <span v-for="asset in benchmarkDraftAssets" :key="asset.assetId">
              {{ asset.fileName }}
              <button type="button" @click="removeBenchmarkDraftAsset(asset.assetId)">×</button>
            </span>
          </div>
          <button class="secondary-button" type="button">上一步</button>
          <button class="primary-button" type="button" :disabled="planPreviewLoading || planSubmitting" @click="prepareBenchmarkPlanPreview">
            {{ planPreviewLoading ? '方案生成中...' : planSubmitting ? '提交中...' : '进入方案确认' }}
          </button>
          <p>{{ applyMessage || 'AI 生成内容仅供参考，请注意甄别使用。' }}</p>
        </aside>
      </div>
    </div>

    <template v-if="false">
    <div class="benchmark-layout">
      <aside class="analysis-card">
        <section class="panel-block">
          <h2>{{ sourcePanelTitle }}</h2>
          <BillingEstimateBanner
            :estimated-credit-cost="parseEstimate.estimatedCreditCost.value"
            :balance="parseEstimate.balance.value"
            :loading="parseEstimate.loading.value"
            :steps="parseEstimate.steps.value"
          />
          <div class="source-tabs" role="tablist" aria-label="解析来源">
            <button
              type="button"
              :class="{ active: inputMode === 'link' }"
              :disabled="parsing || parseCanceling || uploadingLocalVideo"
              @click="switchInputMode('link')"
            >
              链接解析
            </button>
            <button
              type="button"
              :class="{ active: inputMode === 'upload' }"
              :disabled="parsing || parseCanceling || uploadingLocalVideo"
              @click="switchInputMode('upload')"
            >
              本地上传
            </button>
          </div>

          <template v-if="inputMode === 'link'">
            <div class="platform-tabs" role="tablist" aria-label="视频平台">
              <button
                v-for="option in platformOptions"
                :key="option.value"
                type="button"
                :class="{ active: selectedPlatform === option.value }"
                :disabled="parsing || parseCanceling"
                @click="selectPlatform(option.value)"
              >
                <img v-if="option.icon" :src="option.icon" alt="" />
                <span v-else class="platform-auto-icon" aria-hidden="true">⌁</span>
                <span>{{ option.label }}</span>
              </button>
            </div>
            <p class="platform-note">{{ selectedPlatformNote }}</p>
            <p v-if="selectedPlatformLimitReason" class="platform-limit-note">{{ selectedPlatformLimitReason }}</p>
            <p v-if="platformAutoHint" class="platform-auto-hint">{{ platformAutoHint }}</p>
            <div class="parse-row" :class="{ 'has-cancel': parsing || parseCanceling }">
              <input v-model.trim="videoUrl" :placeholder="videoPlaceholder" />
              <button
                class="primary-button"
                type="button"
                :disabled="parsing || !videoUrl || !!selectedPlatformLimitReason || !!parseEstimate.insufficientHint.value"
                :title="selectedPlatformLimitReason || parseEstimate.insufficientHint.value || ''"
                @click="handleParseVideo"
              >
                {{ parsing ? '解析中' : '解析' }}
              </button>
              <button
                class="secondary-button download-button"
                type="button"
                :disabled="downloading || !videoUrl || !!selectedPlatformLimitReason"
                :title="selectedPlatformLimitReason || ''"
                @click="handleDownloadVideo"
              >
                {{ downloading ? '下载中' : '下载视频' }}
              </button>
              <button
                v-if="parsing || parseCanceling"
                class="secondary-button parse-cancel-button"
                type="button"
                :disabled="parseCanceling"
                @click="handleCancelParse"
              >
                {{ parseCanceling ? '取消中' : '取消' }}
              </button>
            </div>
            <div v-if="downloading || downloadProgressText" class="download-progress-panel" role="status">
              <div class="download-progress-head">
                <span>{{ downloadStatusText }}</span>
                <strong v-if="downloadProgressPercent !== null">{{ downloadProgressPercent }}%</strong>
              </div>
              <div
                v-if="downloadProgressPercent !== null"
                class="download-progress-track"
                role="progressbar"
                :aria-valuemin="0"
                :aria-valuemax="100"
                :aria-valuenow="downloadProgressPercent ?? 0"
              >
                <div class="download-progress-fill" :style="{ width: `${downloadProgressPercent}%` }" />
              </div>
              <p v-if="downloadProgressText">{{ downloadProgressText }}</p>
            </div>
          </template>

          <div v-else class="upload-parse-panel" :class="{ 'has-cancel': uploadingLocalVideo || parsing || parseCanceling }">
            <label class="video-upload-picker" :class="{ disabled: uploadingLocalVideo || parsing }">
              <input
                type="file"
                accept="video/*"
                :disabled="uploadingLocalVideo || parsing"
                @change="handleLocalVideoChange"
              />
              <span>{{ uploadingLocalVideo ? '上传中…' : '选择视频' }}</span>
              <small :title="localVideoFileName">{{ localVideoFileName || '支持 MP4、MOV、WEBM 等视频文件，最大 100MB' }}</small>
            </label>
            <button
              class="primary-button upload-parse-button"
              type="button"
              :disabled="uploadingLocalVideo || parsing || !localVideoPreviewUrl || !!parseEstimate.insufficientHint.value"
              :title="parseEstimate.insufficientHint.value ?? ''"
              @click="handleParseUploadedVideo"
            >
              {{ parsing ? '解析中' : '解析上传视频' }}
            </button>
            <button
              v-if="uploadingLocalVideo"
              class="secondary-button upload-cancel-button"
              type="button"
              :disabled="parsing"
              @click="handleCancelLocalUpload"
            >
              取消
            </button>
            <button
              v-if="parsing || parseCanceling"
              class="secondary-button upload-cancel-button"
              type="button"
              :disabled="parseCanceling"
              @click="handleCancelParse"
            >
              {{ parseCanceling ? '取消中' : '取消解析' }}
            </button>
          </div>
          <p v-if="inputMode === 'link' && downloadMessage" class="success-text">{{ downloadMessage }}</p>
          <p v-if="inputMode === 'link' && downloadError" class="error-text">{{ downloadError }}</p>
          <div
            v-if="inputMode === 'upload' && (uploadingLocalVideo || localUploadProgressText)"
            class="local-upload-progress"
          >
            <div
              class="local-upload-progress-track"
              role="progressbar"
              :aria-valuemin="0"
              :aria-valuemax="100"
              :aria-valuenow="localUploadProgressPercent ?? 0"
            >
              <div
                class="local-upload-progress-fill"
                :style="{ width: `${localUploadProgressPercent ?? 8}%` }"
              />
            </div>
            <span>{{ localUploadProgressText || '正在上传视频' }}</span>
          </div>
          <p v-if="inputMode === 'upload' && localUploadMessage" class="success-text">{{ localUploadMessage }}</p>
          <p v-if="inputMode === 'upload' && localUploadError" class="error-text">{{ localUploadError }}</p>
          <p v-if="parseNotice" class="info-text">{{ parseNotice }}</p>
          <p v-if="parseError && parseStage !== 'error' && parseStage !== 'completed'" class="error-text">{{ parseError }}</p>
        </section>

        <section class="panel-block">
          <h3>对标视频信息</h3>
          <article v-if="!douyinParse" class="video-placeholder">
            <p>解析后将展示封面、标题与作者信息。</p>
          </article>
          <article v-else class="video-detail">
            <div class="video-media">
              <img
                v-if="videoCoverUrl"
                :src="videoCoverUrl"
                :alt="douyinParse?.title || '封面'"
                class="cover-img"
                @error="coverImageFailed = true"
              />
              <video
                v-else-if="videoPreviewMediaUrl"
                :src="videoPreviewMediaUrl"
                class="cover-video"
                controls
                preload="metadata"
              />
              <div v-else class="cover-placeholder">{{ coverImageFailed ? '封面加载失败' : '封面' }}</div>
            </div>
            <div class="video-meta-block">
              <div class="author-line">
                <img
                  v-if="douyinParse?.author?.avatarUrl"
                  :src="douyinParse?.author?.avatarUrl"
                  alt=""
                  class="author-avatar"
                />
                <strong class="video-title">{{ douyinParse?.title }}</strong>
              </div>
              <div class="meta-line">
                <span>时长：{{ durationText }}</span>
                <span v-if="douyinParse?.author?.nickname">作者：{{ douyinParse?.author?.nickname }}</span>
              </div>
            </div>
          </article>
        </section>

        <section class="panel-block">
          <h3>爆款分析结果</h3>
          <div class="insight-list">
            <div v-for="item in insightItems" :key="item.label" class="insight-item">
              <span class="insight-icon" aria-hidden="true">{{ item.icon }}</span>
              <strong>{{ item.label }}</strong>
              <p>{{ item.value }}</p>
            </div>
          </div>
        </section>

        <button class="secondary-button refresh-button" type="button" :disabled="parsing" @click="handleReparseCurrent">
          <span aria-hidden="true">↻</span>
          重新解析
        </button>
      </aside>

      <main class="rewrite-card">
        <h2>2. 文案改写</h2>
        <section class="rewrite-box">
          <p v-if="transcriptLoading" class="transcript-status">正在转写视频文案，请稍候…</p>
          <p v-else-if="parseStage === 'error' && parseError" class="error-text transcript-banner">{{ parseError }}</p>
          <p v-else-if="parseNotice" class="info-text transcript-banner">{{ parseNotice }}</p>

          <p class="rewrite-flow-hint">
            转写完成后可<strong>二次编辑原文</strong>，按需选择改写风格并填写补充说明；点击 <strong>开始改写</strong>
            返回新文案。
          </p>

          <div class="rewrite-fields">
            <label class="text-area-label">
              原文案 <span>（ASR 转写，可修改）</span>
              <textarea
                v-model="sourceText"
                class="source-text"
                :readonly="transcriptAreaReadonly"
                :placeholder="sourcePlaceholder"
              />
            </label>

            <section class="rewrite-confirm-panel" aria-label="AI 二次改写选项">
              <div class="rewrite-toolbar">
                <div class="tabs">
                  <button
                    type="button"
                    :class="{ active: rewriteTab === 'ai' }"
                    @click="rewriteTab = 'ai'"
                  >
                    AI分类改写
                  </button>
                  <button
                    type="button"
                    :class="{ active: rewriteTab === 'custom' }"
                    @click="rewriteTab = 'custom'"
                  >
                    自定义改写
                  </button>
                </div>
              </div>

              <div v-show="rewriteTab === 'custom'" class="tab-panel custom-rewrite-shell">
                <p class="shell-placeholder">
                  自定义规则、字段与后端契约待定，此处仅预留入口；确认方案后可在此配置话术模板、禁用词等。
                </p>
              </div>

              <div v-show="rewriteTab === 'ai'" class="tab-panel ai-rewrite-shell">
                <div class="style-tools style-tools-row">
                  <label>
                    改写分类 <span class="tag-muted">（可选）</span>
                    <select
                      v-model="rewriteStyle"
                      class="rewrite-style-select"
                      :disabled="transcriptAreaReadonly"
                    >
                      <option value="">不指定</option>
                      <option value="口语化风格">口语化风格</option>
                      <option value="专业讲解风格">专业讲解风格</option>
                      <option value="强促销转化">强促销转化</option>
                      <option value="情绪递进">情绪递进</option>
                      <option value="爆款短视频口播">爆款短视频口播</option>
                      <option value="卖点提炼">卖点提炼</option>
                      <option value="外贸客户沟通">外贸客户沟通</option>
                      <option value="汽车销售顾问">汽车销售顾问</option>
                      <option value="高端质感">高端质感</option>
                      <option value="简洁自然">简洁自然</option>
                    </select>
                  </label>
                  <label>
                    输出语言
                    <select
                      v-model="rewriteTargetLanguage"
                      class="rewrite-style-select"
                      :disabled="transcriptAreaReadonly"
                    >
                      <option value="中文">中文</option>
                      <option value="英文">英文</option>
                    </select>
                  </label>
                </div>

                <div class="extra-notes-block">
                  <button
                    type="button"
                    class="extra-notes-toggle"
                    :aria-expanded="extraNotesExpanded"
                    aria-controls="extra-notes-field"
                    id="extra-notes-toggle"
                    @click="extraNotesExpanded = !extraNotesExpanded"
                  >
                    <span
                      class="extra-notes-chevron"
                      :class="{ 'is-open': extraNotesExpanded }"
                      aria-hidden="true"
                    >›</span>
                    <span class="extra-notes-toggle-title">补充说明</span>
                    <span class="tag-muted">（点击展开）</span>
                  </button>
                  <div
                    v-show="extraNotesExpanded"
                    id="extra-notes-field"
                    class="extra-notes-collapse"
                    role="region"
                    aria-labelledby="extra-notes-toggle"
                  >
                    <textarea
                      v-model="rewriteIntroduce"
                      class="extra-notes-input"
                      rows="2"
                      :disabled="transcriptAreaReadonly"
                      placeholder="请描述你期望的改写效果，例如：偏种草、结尾引导关注等"
                    />
                  </div>
                </div>

                <p v-if="rewriteError" class="rewrite-error" role="alert">{{ rewriteError }}</p>

                <div v-if="showRewriteProgressBar" class="rewrite-progress-row">
                  <div
                    class="rewrite-progress-track"
                    role="progressbar"
                    :aria-valuemin="0"
                    :aria-valuemax="100"
                    :aria-valuenow="rewriteProgressPercent"
                  >
                    <div class="rewrite-progress-fill" :style="{ width: `${rewriteProgressPercent}%` }" />
                  </div>
                  <span class="rewrite-progress-pct">{{ rewriteProgressPercent }}%</span>
                </div>

                <div class="confirm-actions">
                  <button
                    class="primary-button confirm-rewrite-btn"
                    type="button"
                    :disabled="rewriteLoading || transcriptAreaReadonly || !sourceText.trim()"
                    @click="handleDouyinRewrite"
                  >
                    {{ rewriteLoading ? '改写中…' : '开始改写' }}
                  </button>
                </div>
              </div>
            </section>

            <label class="text-area-label">
              改写后文案
              <textarea
                v-model="rewrittenText"
                class="result-text"
                :readonly="transcriptAreaReadonly"
                :placeholder="rewritePlaceholder"
              />
              <small>字数：{{ rewrittenLength }}</small>
            </label>
          </div>

          <div class="rewrite-actions">
            <button class="secondary-button" type="button" @click="copyRewrittenText">
              <span aria-hidden="true">▣</span>
              复制文案
            </button>
            <button class="primary-button continue-button" type="button" @click="applyScript">
              应用文案并继续
              <span aria-hidden="true">›</span>
            </button>
          </div>
        </section>
      </main>
    </div>

    <footer class="bottom-action">
      <button class="primary-button continue-button" type="button" @click="applyScript">
        应用文案并继续
        <span aria-hidden="true">›</span>
      </button>
      <p>{{ applyMessage || '完成当前步骤后将自动进入下一步：音频生成' }}</p>
    </footer>
    </template>

    <AiPlanPreviewDrawer
      v-model="planPreviewOpen"
      :loading="planPreviewLoading || planSubmitting"
      :error="planPreviewError"
      :plan="planPreview"
      @update-script="updatePlanScript"
      @back="planPreviewOpen = false"
      @refresh="prepareBenchmarkPlanPreview"
      @confirm="confirmBenchmarkPlan"
    />
    <CarSalesAssetSelectDrawer
      v-model="benchmarkAssetDrawerOpen"
      initial-category="vehicle"
      @select="handleBenchmarkAssetSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { downloadShareVideo, rewriteDouyinCopywriting, startDouyinParseWithTranscript } from '../../services/writerDouyinApi'
import { API_BASE_URL, API_ORIGIN } from '../../services/request'
import type {
  DouyinParseStage,
  DouyinParseTaskResult,
  DouyinVideoParseResponse,
  DouyinRewriteWriterVO,
} from '../../types/writerDouyinTypes'
import {
  cancelVideoParseLocalUpload,
  clearVideoParseLocalUploadNotice,
  localUploadError,
  localUploadMessage,
  localUploadProgressPercent,
  localUploadProgressText,
  localVideoFileName,
  localVideoFilePath,
  localVideoPreviewUrl,
  resetVideoParseLocalUpload,
  startVideoParseLocalUpload,
  uploadingLocalVideo,
} from '../../stores/videoParseLocalUploadState'
import { rememberSessionTaskId } from '../../services/sessionTaskStore'
import { cancelTask } from '../../services/taskApi'
import { trackTaskResult } from '../../services/taskRealtime'
import { newVideoIdempotencyKey, quickRenderVideo } from '../../services/videoApi'
import BillingEstimateBanner from '../../components/business/BillingEstimateBanner.vue'
import { useAuthRequired } from '../../composables/useAuthRequired'
import { useBillingEstimate } from '../../composables/useBillingEstimate'
import { useSmoothTaskProgress } from '../../composables/useSmoothTaskProgress'
import { normalizePublicMediaUrl } from '../../utils/mediaUrl'
import {
  Clock,
  Coin,
  Collection,
  Document,
  EditPen,
  Link,
  MagicStick,
  PictureRounded,
  Reading,
  Refresh,
  Timer,
  Upload,
  VideoPlay,
} from '@element-plus/icons-vue'
import AiPlanPreviewDrawer from '../render/AiPlanPreviewDrawer.vue'
import CarSalesAssetSelectDrawer, {
  type CarSalesAssetSelectPayload,
} from '../render/CarSalesAssetSelectDrawer.vue'
import {
  buildQuickRenderRequestFromPlanDraft,
  ensureCarSalesPlanDraftAsset,
  planAssetFromAssetItem,
  prepareCarSalesAiPlanPreview,
  type AiPlanPreview,
  type CarSalesPlanDraft,
  type CarSalesPlanDraftAsset,
} from '../render/carSalesPlanDraft'
import bilibiliIcon from '../../assets/platforms/bilibili.svg'
import douyinIcon from '../../assets/platforms/douyin.svg'
import facebookIcon from '../../assets/platforms/facebook.svg'
import kuaishouIcon from '../../assets/platforms/kuaishou.svg'
import tiktokIcon from '../../assets/platforms/tiktok.svg'
import wechatIcon from '../../assets/platforms/wechat.svg'
import xiaohongshuIcon from '../../assets/platforms/xiaohongshu.svg'
import youtubeIcon from '../../assets/platforms/youtube.svg'

// 抖音解析 / 爆款对标：核心计费动作是 VIDEO_PARSE（视频理解）。
const parseEstimate = useBillingEstimate({ taskType: 'VIDEO_PARSE' })
const router = useRouter()
const { requireAuth } = useAuthRequired()

const emit = defineEmits<{
  continue: []
}>()

type VideoPlatformOption = {
  value: string
  label: string
  placeholder: string
  officialNote: string
  icon?: string
}

const platformOptions: VideoPlatformOption[] = [
  {
    value: 'auto',
    label: '自动',
    placeholder: '粘贴抖音 / 小红书 / 视频号 / TikTok / 快手 / B站 / YouTube 等视频链接',
    officialNote: '自动识别平台；官方文档不提供公开视频下载接口的平台，会按平台限制给出提示。',
  },
  {
    value: 'douyin',
    label: '抖音',
    icon: douyinIcon,
    placeholder: '粘贴抖音分享链接或完整分享文案',
    officialNote: '抖音开放平台视频数据能力需要开通授权；任意公开视频直链解析不属于通用官方开放能力。',
  },
  {
    value: 'xiaohongshu',
    label: '小红书',
    icon: xiaohongshuIcon,
    placeholder: '粘贴小红书完整分享文案或 http(s) 链接',
    officialNote: '小红书公开开放文档未提供任意笔记视频下载解析接口，解析稳定性受平台限制影响。',
  },
  {
    value: 'wechat_channels',
    label: '视频号',
    icon: wechatIcon,
    placeholder: '粘贴微信视频号分享链接，例如 https://weixin.qq.com/sph/...',
    officialNote: '微信视频号官方开放能力不提供任意公开视频下载解析接口；该平台内容通常需要微信登录、客户端上下文或平台授权，当前无法稳定解析。',
  },
  {
    value: 'tiktok',
    label: 'TikTok',
    icon: tiktokIcon,
    placeholder: '粘贴 TikTok 视频链接',
    officialNote: 'TikTok Display API 需用户授权，官方返回元数据与 embed_link，不提供任意公开视频下载直链。',
  },
  {
    value: 'kuaishou',
    label: '快手',
    icon: kuaishouIcon,
    placeholder: '粘贴快手分享链接或完整分享文案',
    officialNote: '快手开放平台官方能力以登录、发布、挂载为主，未提供任意公开视频下载解析接口。',
  },
  {
    value: 'bilibili',
    label: 'B站',
    icon: bilibiliIcon,
    placeholder: '粘贴 B 站视频链接',
    officialNote: 'B 站官方外链播放器支持 bvid/aid/cid；当前按 bvid/cid 链路处理公开视频信息。',
  },
  {
    value: 'youtube',
    label: 'YouTube',
    icon: youtubeIcon,
    placeholder: '粘贴 YouTube 视频链接',
    officialNote: 'YouTube 官方 Data/IFrame API 支持元数据与嵌入播放，不提供任意视频下载直链。',
  },
  {
    value: 'facebook',
    label: 'Facebook',
    icon: facebookIcon,
    placeholder: '粘贴 Facebook 公开视频链接',
    officialNote: 'Facebook 官方支持公开视频嵌入和 Graph API 授权访问，但不提供任意公开视频下载接口；很多视频需要登录、地区或权限校验，当前无法稳定解析。',
  },
]

const PLATFORM_LIMIT_REASONS: Record<string, string> = {
  wechat_channels:
    '微信视频号暂不支持链接解析：视频号内容通常依赖微信登录、客户端上下文或平台授权，官方没有开放任意公开视频下载解析接口。请改用本地上传视频文件。',
  facebook:
    'Facebook 暂不支持链接解析：公开视频常受登录、地区、隐私权限和防下载策略限制，官方也不提供任意视频下载接口。请改用本地上传视频文件或可直接访问的视频直链。',
}

const videoUrl = ref('')
const selectedPlatform = ref('auto')
const inputMode = ref<'link' | 'upload'>('link')
const douyinParse = ref<DouyinVideoParseResponse | null>(null)
const coverImageFailed = ref(false)
const parseStage = ref<DouyinParseStage | ''>('')
const parsing = ref(false)
const parseError = ref('')
const parseNotice = ref('')
const downloading = ref(false)
const downloadError = ref('')
const downloadMessage = ref('')
const downloadStatusText = ref('')
const downloadReceivedBytes = ref(0)
const downloadTotalBytes = ref<number | null>(null)
const downloadProgressPercent = ref<number | null>(null)
const platformAutoHint = ref('')
const rewriteStyle = ref('')
const rewriteTargetLanguage = ref('中文')
const rewriteTab = ref<'ai' | 'custom'>('ai')
const rewriteIntroduce = ref('')
const extraNotesExpanded = ref(false)
const rewriteLoading = ref(false)
const rewriteError = ref('')
const rewriteTaskStatus = ref('')
const rewriteTaskProgress = ref<number | null>(null)
const sourceText = ref('')
const rewrittenText = ref('')
const applyMessage = ref('')
const planPreviewOpen = ref(false)
const planPreviewLoading = ref(false)
const planSubmitting = ref(false)
const planPreviewError = ref('')
const planPreview = ref<AiPlanPreview | null>(null)
const benchmarkPlanDraft = ref<CarSalesPlanDraft | null>(null)
const benchmarkAssetDrawerOpen = ref(false)
const benchmarkDraftAssets = ref<CarSalesPlanDraftAsset[]>([])
const parseAbort = ref<AbortController | null>(null)
const parseCanceling = ref(false)
let stopParseTracking: (() => void) | null = null
let parseRunSeq = 0
let activeParseTaskId: number | null = null
let trackedParseTaskId: number | null = null
let stopRewriteTracking: (() => void) | null = null

const LOCAL_VIDEO_MAX_BYTES = 100 * 1024 * 1024

const {
  showTaskProgressBar: showRewriteProgressBar,
  barProgressPercent: rewriteProgressPercent,
  reset: resetRewriteProgress,
} = useSmoothTaskProgress(rewriteTaskStatus, rewriteTaskProgress)

const videoPlaceholder = computed(
  () => platformOptions.find((option) => option.value === selectedPlatform.value)?.placeholder || platformOptions[0].placeholder,
)

const selectedPlatformNote = computed(
  () => platformOptions.find((option) => option.value === selectedPlatform.value)?.officialNote || platformOptions[0].officialNote,
)

const selectedPlatformLimitReason = computed(() => {
  if (inputMode.value !== 'link') return ''
  return PLATFORM_LIMIT_REASONS[selectedPlatform.value] || ''
})

const downloadProgressText = computed(() => {
  if (downloadReceivedBytes.value <= 0) {
    return ''
  }
  const received = formatFileSize(downloadReceivedBytes.value)
  const total = downloadTotalBytes.value && downloadTotalBytes.value > 0
    ? ` / ${formatFileSize(downloadTotalBytes.value)}`
    : ''
  return `已接收 ${received}${total}`
})

const sourcePanelTitle = computed(() => (inputMode.value === 'upload' ? '1. 上传对标视频' : '1. 输入对标视频链接'))
watch(videoUrl, (value) => {
  if (inputMode.value !== 'link') {
    return
  }
  const detected = detectPlatformFromText(value)
  if (!detected) {
    platformAutoHint.value = ''
    return
  }
  if (selectedPlatform.value !== detected) {
    selectedPlatform.value = detected
    const label = platformOptions.find((option) => option.value === detected)?.label || '对应平台'
    platformAutoHint.value = `已根据链接识别为${label}，将按该平台解析。`
  }
})

onBeforeUnmount(() => {
  parseAbort.value?.abort()
  stopParseTask()
  stopRewriteTask()
})

const transcriptLoading = computed(
  () =>
    parsing.value &&
    (parseStage.value === 'accepted' || parseStage.value === 'parsed' || parseStage.value === 'transcribing'),
)

const transcriptAreaReadonly = computed(() => transcriptLoading.value)

const sourcePlaceholder = computed(() => {
  if (parseStage.value === 'error') {
    return inputMode.value === 'upload' ? '转写失败，请重新上传或重试' : '转写失败，请重试或更换链接'
  }
  if (transcriptLoading.value) {
    return '转写中…'
  }
  if (parseNotice.value) {
    return '未识别到口播文案，可在这里手动输入原文'
  }
  return '解析完成后展示 ASR 原文'
})

const rewritePlaceholder = computed(() => {
  if (parseStage.value === 'error') {
    return inputMode.value === 'upload' ? '上传视频转写失败' : '转写失败'
  }
  if (transcriptLoading.value) {
    return '转写中…'
  }
  if (parseNotice.value) {
    return '手动输入原文后点击「开始改写」，展示返回的改写结果'
  }
  return '编辑原文后点击「开始改写」，展示返回的改写结果'
})

const durationText = computed(() => {
  const seconds = douyinParse.value?.durationSeconds ?? 0
  const minute = Math.floor(seconds / 60)
  const remain = String(seconds % 60).padStart(2, '0')
  return `${minute}:${remain}`
})

const videoCoverUrl = computed(() => {
  if (coverImageFailed.value) return ''
  const parse = douyinParse.value
  if (!parse) return ''
  return normalizeDisplayImageUrl(parse.coverUrl || inferCoverUrl(parse.rawData) || '')
})

const videoPreviewMediaUrl = computed(() => {
  if (videoCoverUrl.value) return ''
  const playUrl = douyinParse.value?.playUrl || ''
  return playUrl ? normalizePublicMediaUrl(playUrl) : ''
})

const rewrittenLength = computed(() => rewrittenText.value.replace(/\s/g, '').length)

const insightItems = computed(() => {
  const p = douyinParse.value
  let status = inputMode.value === 'upload' ? '选择本地视频后开始解析' : '提交社媒视频链接后开始解析'
  if (parseStage.value === 'completed') {
    status = parseNotice.value || '已完成转写，右侧已填入原文；改写稿请点击「开始改写」拉取'
  } else if (parseStage.value === 'accepted') {
    status = '已提交解析任务，正在等待平台返回视频信息…'
  } else if (parseStage.value === 'parsed' || parseStage.value === 'transcribing') {
    status = '正在转写口播文案…'
  } else if (parseStage.value === 'error') {
    status = parseError.value || '转写失败'
  }

  const rows: { icon: string; label: string; value: string }[] = []
  if (p) {
    rows.push({ icon: '◉', label: '标题', value: p.title || '—' })
    rows.push({ icon: '◎', label: '作者', value: p.author?.nickname || '—' })
    rows.push({ icon: '◌', label: '时长', value: durationText.value })
    rows.push({ icon: '□', label: '视频 ID', value: p.videoId || '—' })
  }
  rows.push({ icon: '▣', label: '转写进度', value: status })
  rows.push({
    icon: '⌂',
    label: '说明',
    value: '解析成功后展示封面与元信息；文案随 SSE completed 事件刷新。',
  })
  return rows
})

function inferCoverUrl(rawData: unknown) {
  const urls: string[] = []
  collectCoverUrls(rawData, '', urls)
  return urls.find(isCoverLikeUrl) || urls[0] || ''
}

function collectCoverUrls(value: unknown, path: string, urls: string[]) {
  if (!value) return
  if (typeof value === 'string') {
    if (isHttpUrl(value) && isCoverLikePath(path)) {
      urls.push(value.trim())
    }
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectCoverUrls(item, `${path}/${index}`, urls))
    return
  }
  if (typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
      const nextPath = `${path}/${key}`
      if (typeof child === 'string' && isHttpUrl(child) && isCoverLikePath(nextPath)) {
        urls.push(child.trim())
      } else {
        collectCoverUrls(child, nextPath, urls)
      }
    })
  }
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value.trim())
}

function detectPlatformFromText(value: string) {
  const text = value.toLowerCase()
  if (!text.trim()) return ''
  if (/douyin\.com|iesdouyin\.com|amemv\.com|douyinvod\.com/.test(text)) return 'douyin'
  if (/xiaohongshu\.com|xhslink\.com|xhscdn\.com|xhs\.cn/.test(text)) return 'xiaohongshu'
  if (/weixin\.qq\.com\/sph|channels\.weixin\.qq\.com|finder\.video\.qq\.com|finder\.video\.wechat\.com/.test(text)) return 'wechat_channels'
  if (/tiktok\.com|tiktokv\.com|vm\.tiktok\.com|vt\.tiktok\.com|musical\.ly/.test(text)) return 'tiktok'
  if (/kuaishou\.com|kwai\.com|gifshow\.com|kwaicdn\.com|ksapisrv\.com|oskwai\.com|yximgs\.com/.test(text)) return 'kuaishou'
  if (/bilibili\.com|b23\.tv|bilivideo\.com|hdslb\.com|biliimg\.com/.test(text)) return 'bilibili'
  if (/youtube\.com|youtu\.be|googlevideo\.com/.test(text)) return 'youtube'
  if (/facebook\.com|fb\.watch|fbcdn\.net|fb\.com/.test(text)) return 'facebook'
  return ''
}

function normalizeDisplayImageUrl(value: string) {
  const url = value.trim()
  if (!url) return ''
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url
  }
  if (url.startsWith('/')) {
    return `${API_ORIGIN}${url}`
  }
  if (isHttpUrl(url)) {
    return `${API_BASE_URL}/writer/media/cover?url=${encodeURIComponent(url)}`
  }
  return url
}

function isCoverLikePath(path: string) {
  return /cover|thumbnail|thumb|image|display|poster|pic/i.test(path)
}

function isCoverLikeUrl(url: string) {
  const normalized = url.toLowerCase()
  if (normalized.includes('.mp4') || normalized.includes('.m3u8') || normalized.includes('mime=video')) {
    return false
  }
  return (
    normalized.includes('.jpg') ||
    normalized.includes('.jpeg') ||
    normalized.includes('.png') ||
    normalized.includes('.webp') ||
    normalized.includes('i.ytimg.com') ||
    normalized.includes('ytimg.com') ||
    normalized.includes('hdslb.com') ||
    normalized.includes('biliimg.com') ||
    normalized.includes('kwaicdn.com') ||
    normalized.includes('ksapisrv.com') ||
    normalized.includes('gifshow.com') ||
    normalized.includes('p16-sign') ||
    normalized.includes('p19-sign') ||
    normalized.includes('tos-maliva-p') ||
    (normalized.includes('tiktokcdn') && /image|jpeg|webp/.test(normalized))
  )
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function resetDownloadProgress() {
  downloadStatusText.value = ''
  downloadReceivedBytes.value = 0
  downloadTotalBytes.value = null
  downloadProgressPercent.value = null
}

function isSupportedLocalVideoFile(file: File) {
  if (file.type.startsWith('video/')) {
    return true
  }
  return /\.(mp4|mov|m4v|webm)$/i.test(file.name)
}

function selectPlatform(value: string) {
  selectedPlatform.value = value
  platformAutoHint.value = ''
}

function effectivePlatformForUrl(url: string) {
  const detected = detectPlatformFromText(url)
  if (detected) {
    selectedPlatform.value = detected
    return detected
  }
  return selectedPlatform.value
}

function switchInputMode(mode: 'link' | 'upload') {
  if (inputMode.value === mode) {
    return
  }
  inputMode.value = mode
  parseAbort.value?.abort()
  stopParseTask()
  resetParseWorkflowState()
  downloadError.value = ''
  downloadMessage.value = ''
  platformAutoHint.value = ''
  resetDownloadProgress()
  clearVideoParseLocalUploadNotice()
}

function resetParseWorkflowState() {
  douyinParse.value = null
  sourceText.value = ''
  rewrittenText.value = ''
  rewriteIntroduce.value = ''
  extraNotesExpanded.value = false
  rewriteError.value = ''
  rewriteLoading.value = false
  rewriteTaskStatus.value = ''
  rewriteTaskProgress.value = null
  resetRewriteProgress()
  parseError.value = ''
  parseNotice.value = ''
  coverImageFailed.value = false
  parseStage.value = ''
  parsing.value = false
  parseCanceling.value = false
  applyMessage.value = ''
  activeParseTaskId = null
}

function handleLocalVideoChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null

  parseAbort.value?.abort()
  stopParseTask()
  resetParseWorkflowState()
  resetVideoParseLocalUpload({ abort: true })
  downloadError.value = ''
  downloadMessage.value = ''
  resetDownloadProgress()

  if (!file) {
    return
  }
  if (!isSupportedLocalVideoFile(file)) {
    localUploadError.value = '请上传 MP4、MOV、M4V 或 WEBM 格式的视频文件'
    input.value = ''
    return
  }
  if (file.size > LOCAL_VIDEO_MAX_BYTES) {
    localUploadError.value = `视频文件不能超过 ${formatFileSize(LOCAL_VIDEO_MAX_BYTES)}`
    input.value = ''
    return
  }

  startVideoParseLocalUpload(file, `${file.name}（${formatFileSize(file.size)}）`)
  input.value = ''
}

function handleCancelLocalUpload() {
  cancelVideoParseLocalUpload()
}

async function handleParseUploadedVideo() {
  const url = localVideoPreviewUrl.value.trim()
  if (!url || uploadingLocalVideo.value || parsing.value) {
    return
  }
  const title = localVideoFileName.value.replace(/（.*$/, '').trim() || '本地上传视频'
  await runParseVideo(url, 'upload', title, {
    sourceType: 'upload',
    filePath: localVideoFilePath.value,
  })
}

async function handleDownloadVideo() {
  const url = videoUrl.value.trim()
  if (!url || downloading.value) {
    return
  }
  const platform = effectivePlatformForUrl(url)
  const platformLimitReason = PLATFORM_LIMIT_REASONS[platform]
  if (platformLimitReason) {
    downloadError.value = platformLimitReason
    return
  }

  downloading.value = true
  downloadError.value = ''
  downloadMessage.value = ''
  downloadStatusText.value = '正在连接下载服务…'
  downloadReceivedBytes.value = 0
  downloadTotalBytes.value = null
  downloadProgressPercent.value = null
  try {
    // 直链通常存在跨域与防盗链限制，因此下载走后端代理，页面只负责触发浏览器保存。
    await downloadShareVideo(
      { url, platform },
      {
        onStarted(progress) {
          downloadStatusText.value = '已连接，正在接收视频…'
          downloadTotalBytes.value = progress.totalBytes
        },
        onProgress(progress) {
          downloadReceivedBytes.value = progress.receivedBytes
          downloadTotalBytes.value = progress.totalBytes
          downloadProgressPercent.value = progress.percent
        },
        onRetry(retry) {
          downloadStatusText.value = `下载中断，正在自动重试（${retry.nextAttempt}/${retry.maxAttempts}）…`
          downloadProgressPercent.value = null
          downloadTotalBytes.value = null
          downloadReceivedBytes.value = 0
          downloadError.value = ''
        },
      },
    )
    downloadStatusText.value = '接收完成'
    downloadMessage.value = '视频已接收完成，浏览器正在保存文件'
  } catch (error) {
    downloadStatusText.value = downloadReceivedBytes.value > 0 ? '下载中断' : ''
    downloadError.value = friendlyDownloadErrorMessage(error instanceof Error ? error.message : '下载失败')
  } finally {
    downloading.value = false
  }
}

async function handleParseVideo() {
  const url = videoUrl.value.trim()
  if (!url || parsing.value) {
    return
  }
  const platform = effectivePlatformForUrl(url)
  const platformLimitReason = PLATFORM_LIMIT_REASONS[platform]
  if (platformLimitReason) {
    parseStage.value = 'error'
    parseNotice.value = ''
    parseError.value = platformLimitReason
    return
  }
  await runParseVideo(url, platform)
}

async function handleReparseCurrent() {
  if (inputMode.value === 'upload') {
    await handleParseUploadedVideo()
    return
  }
  await handleParseVideo()
}

async function runParseVideo(
  url: string,
  platform: string,
  title?: string,
  extra?: { sourceType?: string; filePath?: string },
) {
  if (!url || parsing.value) {
    return
  }

  const runId = ++parseRunSeq
  parseAbort.value?.abort()
  stopParseTask()
  parseAbort.value = new AbortController()
  activeParseTaskId = null

  douyinParse.value = null
  sourceText.value = ''
  rewrittenText.value = ''
  rewriteIntroduce.value = ''
  extraNotesExpanded.value = false
  rewriteError.value = ''
  rewriteLoading.value = false
  rewriteTaskStatus.value = ''
  rewriteTaskProgress.value = null
  resetRewriteProgress()
  parseError.value = ''
  parseNotice.value = ''
  coverImageFailed.value = false
  downloadError.value = ''
  downloadMessage.value = ''
  resetDownloadProgress()
  parseStage.value = ''
  applyMessage.value = ''
  parsing.value = true
  parseCanceling.value = false

  try {
    await startDouyinParseWithTranscript({
      url,
      platform,
      title,
      sourceType: extra?.sourceType,
      filePath: extra?.filePath,
      signal: parseAbort.value.signal,
      onOpened(taskId) {
        if (!isActiveParseRun(runId, taskId)) {
          return
        }
        if (!parseStage.value) {
          parseStage.value = 'accepted'
        }
        rememberParseTask(taskId, runId)
      },
      onAccepted(payload) {
        if (!isActiveParseRun(runId, payload.data?.taskId)) {
          return
        }
        parseStage.value = 'accepted'
        rememberParseTask(payload.data?.taskId, runId)
      },
      onParsed(payload) {
        if (!isActiveParseRun(runId, payload.data?.taskId)) {
          return
        }
        parseStage.value = 'parsed'
        rememberParseTask(payload.data?.taskId, runId)
        applyParseTaskOutput(
          {
            parseResult: payload.data?.parseResult,
            transcriptResult: null,
          },
          { completed: false },
        )
      },
      onTranscribing(payload) {
        if (!isActiveParseRun(runId, payload.data?.taskId)) {
          return
        }
        parseStage.value = 'transcribing'
      },
      onCompleted(payload) {
        if (!isActiveParseRun(runId, payload.data?.taskId)) {
          return
        }
        parseStage.value = 'completed'
        rememberParseTask(payload.data?.taskId, runId)
        applyParseTaskOutput(
          {
            parseResult: payload.data?.parseResult,
            transcriptResult: payload.data?.transcriptResult,
          },
          { completed: true, message: payload.message },
        )
        stopParseTask()
      },
      onErrorEvent(payload) {
        if (!isActiveParseRun(runId, payload.data?.taskId)) {
          return
        }
        const friendlyMessage = friendlyParseErrorMessage(payload.message)
        if (payload.code === 50215) {
          parseStage.value = 'completed'
          parseError.value = ''
          parseNotice.value = friendlyMessage
          rememberParseTask(payload.data?.taskId, runId)
          applyParseTaskOutput(
            {
              parseResult: payload.data?.parseResult,
              transcriptResult: payload.data?.transcriptResult,
            },
            { completed: true, message: payload.message },
          )
          return
        }
        parseStage.value = 'error'
        parseNotice.value = ''
        rememberParseTask(payload.data?.taskId, runId)
        parseError.value = `${friendlyMessage}${payload.traceId ? `（traceId：${payload.traceId}）` : ''}`
        if (payload.data?.parseResult) {
          douyinParse.value = payload.data.parseResult
        }
      },
    })
  } catch (error) {
    if (!isActiveParseRun(runId)) {
      return
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      return
    }
    const message = error instanceof Error ? error.message : '请求失败'
    if (isTransientParseConnectionError(message) && (String(parseStage.value) === 'completed' || sourceText.value.trim())) {
      parseStage.value = 'completed'
      parseError.value = ''
      if (sourceText.value.trim()) {
        parseNotice.value = ''
      }
      return
    }
    if (activeParseTaskId && isTransientParseConnectionError(message)) {
      if (!parseStage.value || parseStage.value === 'error') {
        parseStage.value = douyinParse.value ? 'transcribing' : 'accepted'
      }
      parseError.value = ''
      parseNotice.value = '连接中断，正在从任务中心同步解析结果…'
      startParseTaskFallback(activeParseTaskId, runId)
      return
    }
    if (!parseStage.value) {
      parseStage.value = 'error'
    }
    parseNotice.value = ''
    parseError.value = friendlyParseErrorMessage(message)
  } finally {
    if (isActiveParseRun(runId)) {
      const stage = String(parseStage.value)
      parsing.value = !!activeParseTaskId && stage !== 'completed' && stage !== 'error'
    }
  }
}

async function handleCancelParse() {
  const taskId = activeParseTaskId || trackedParseTaskId
  parseRunSeq += 1
  parseAbort.value?.abort()
  parseAbort.value = null
  stopParseTask()
  activeParseTaskId = null
  parsing.value = false
  parseStage.value = ''
  parseNotice.value = ''

  if (!taskId) {
    parseCanceling.value = false
    return
  }

  parseCanceling.value = true
  try {
    await cancelTask(taskId)
    void parseEstimate.refresh()
  } catch (error) {
    parseError.value = error instanceof Error ? error.message : '取消解析失败'
  } finally {
    parseCanceling.value = false
  }
}

function isActiveParseRun(runId: number, taskId?: number | null) {
  if (runId !== parseRunSeq) {
    return false
  }
  return taskId == null || activeParseTaskId == null || activeParseTaskId === taskId
}

function rememberParseTask(taskId?: number | null, runId = parseRunSeq) {
  if (!taskId) {
    return
  }
  if (!isActiveParseRun(runId, taskId)) {
    return
  }
  activeParseTaskId = taskId
  rememberSessionTaskId(taskId)
  startParseTaskFallback(taskId, runId)
}

function startParseTaskFallback(taskId: number, runId = parseRunSeq) {
  if (!isActiveParseRun(runId, taskId)) {
    return
  }
  if (stopParseTracking && trackedParseTaskId === taskId) {
    return
  }
  stopParseTask()
  trackedParseTaskId = taskId
  stopParseTracking = trackTaskResult<DouyinParseTaskResult>(taskId, {
    pollIntervalMs: 1500,
    onStatus(message) {
      if (!isActiveParseRun(runId, message.taskId)) {
        return
      }
      const status = String(message.status || '')
      if (status === 'RUNNING' && (!parseStage.value || parseStage.value === 'accepted')) {
        parseStage.value = douyinParse.value ? 'transcribing' : 'accepted'
      }
    },
    onResult(taskResult) {
      if (!isActiveParseRun(runId, taskResult.taskId)) {
        return
      }
      applyParseTaskOutput(taskResult.result, { completed: true })
      parseStage.value = 'completed'
      parsing.value = false
      parseAbort.value?.abort()
      stopParseTracking = null
      trackedParseTaskId = null
    },
    onFailure(message) {
      if (!isActiveParseRun(runId, message.taskId)) {
        return
      }
      if (parseStage.value === 'completed') {
        return
      }
      parseStage.value = 'error'
      parseNotice.value = ''
      parseError.value = friendlyParseErrorMessage(message.errorMessage || '解析或转写失败')
      parsing.value = false
      parseAbort.value?.abort()
      stopParseTracking = null
      trackedParseTaskId = null
    },
    onError(error) {
      if (!isActiveParseRun(runId, taskId)) {
        return
      }
      if (!douyinParse.value && parseStage.value !== 'completed') {
        parseError.value = friendlyParseErrorMessage(error.message)
      }
    },
  })
}

function applyParseTaskOutput(
  output: DouyinParseTaskResult | null | undefined,
  options: { completed: boolean; message?: string },
) {
  if (!output) {
    return
  }
  if (output.parseResult) {
    douyinParse.value = output.parseResult
    coverImageFailed.value = false
  }
  if (output.transcriptResult) {
    sourceText.value = output.transcriptResult.originalText || ''
    rewrittenText.value = ''
  }
  if (options.completed) {
    parseError.value = ''
    parseNotice.value = sourceText.value.trim() ? '' : friendlyEmptyTranscriptMessage(options.message)
  }
}

function friendlyEmptyTranscriptMessage(message?: string) {
  return friendlyParseErrorMessage(message || '视频里没有识别到可转写的口播文案，可以手动输入原文后继续改写')
}

function friendlyDownloadErrorMessage(message?: string) {
  if (isTransientDownloadErrorMessage(message || '')) {
    return '视频下载连接中断，已自动重试但仍未完成。请稍后再试，或重新解析后再次下载。'
  }
  const text = message || '下载失败'
  if (
    text.includes('没有拿到可下载') ||
    text.includes('未返回可下载') ||
    text.includes('without downloadable url') ||
    text.includes('no downloadable')
  ) {
    return '已识别到视频信息，但平台未返回可下载的视频地址。请确认视频为公开且允许下载，或更换分享链接后重试。'
  }
  if (text.includes('bvc2') || text.includes('HEVC') || text.includes('AV1')) {
    return '平台返回的视频编码暂不适合通用 MP4 下载，请更换公开分享链接后重试。'
  }
  if (text.includes('HTTP 400') || text.includes('TikHub parse failed') || text.includes('平台暂未返回可解析')) {
    return '平台暂未返回可解析的视频数据，请确认链接公开可访问，并尽量粘贴完整分享文案后重试。'
  }
  return text
}

function isTransientDownloadErrorMessage(message: string) {
  const text = message.toLowerCase()
  return (
    text.includes('network error') ||
    text.includes('failed to fetch') ||
    text.includes('load failed') ||
    text.includes('body stream') ||
    text.includes('connection') ||
    text.includes('timeout') ||
    text.includes('terminated') ||
    text.includes('interrupted') ||
    text.includes('unexpected end') ||
    text.includes('premature eof') ||
    text.includes('closed before expected')
  )
}

function isTransientParseConnectionError(message: string) {
  return isTransientDownloadErrorMessage(message)
}

function friendlyParseErrorMessage(message?: string) {
  const text = message || '解析或转写失败'
  if (
    text.includes('Volcengine ASR query succeeded but returned empty text') ||
    text.includes('没有识别到可转写的口播文案') ||
    (text.toLowerCase().includes('asr') && text.toLowerCase().includes('empty text'))
  ) {
    return '视频里没有识别到可转写的口播文案，可以手动输入原文后继续改写。'
  }
  if (text.includes('bvc2') || text.includes('HEVC') || text.includes('AV1')) {
    return '平台返回的视频编码当前播放器不兼容，已尽量选择通用 MP4；如果仍失败，请换公开视频链接后重试。'
  }
  if (
    text.includes('Source video download failed') ||
    text.includes('ASR audio preprocess failed') ||
    text.includes('Upload public base url') ||
    text.includes('TOS')
  ) {
    return '本地视频已上传，但转写服务暂时无法读取该视频文件。请检查 TOS 公网访问地址与桶读权限，或稍后重试。'
  }
  if (
    text.includes('TikHub parse failed') ||
    text.includes('hybrid error') ||
    text.includes('TikHub request failed with HTTP 400') ||
    text.includes('平台解析接口拒绝了当前链接')
  ) {
    if (inputMode.value === 'upload') {
      return '本地视频解析未正确进入上传流程，请重新选择视频后再解析。'
    }
    return '平台暂未返回可解析的视频数据，请确认视频是公开可访问的视频，并尽量复制分享内容中的完整 http(s) 链接或完整分享文案后重试。'
  }
  if (text.includes('未识别到可解析的视频链接')) {
    return '没有识别到可解析的视频链接，请粘贴包含 http(s) 链接的社媒分享内容后重试。'
  }
  return text
}

async function handleDouyinRewrite() {
  const originalText = sourceText.value.trim()
  if (!originalText) {
    rewriteError.value = '原文不能为空'
    return
  }
  if (transcriptAreaReadonly.value) {
    return
  }

  rewriteLoading.value = true
  rewriteError.value = ''
  rewrittenText.value = ''
  rewriteTaskStatus.value = 'QUEUED'
  rewriteTaskProgress.value = 0
  resetRewriteProgress()

  try {
    const task = await rewriteDouyinCopywriting({
      originalText,
      style: rewriteStyle.value.trim() || undefined,
      targetLanguage: rewriteTargetLanguage.value,
      introduce: rewriteIntroduce.value.trim() || undefined,
    })
    rememberSessionTaskId(task.taskId)
    rewriteTaskStatus.value = String(task.status || 'QUEUED')
    rewriteTaskProgress.value = task.progress ?? 0
    await new Promise<void>((resolve) => {
      stopRewriteTask()
      stopRewriteTracking = trackTaskResult<DouyinRewriteWriterVO>(task.taskId, {
        onStatus(message) {
          rewriteTaskStatus.value = String(message.status)
          rewriteTaskProgress.value = message.progress
        },
        onResult(taskResult) {
          rewriteTaskStatus.value = String(taskResult.status || 'SUCCESS')
          rewriteTaskProgress.value = taskResult.progress ?? 100
          rewrittenText.value = taskResult.result?.translatedText ?? ''
          rewriteLoading.value = false
          resolve()
        },
        onFailure(message) {
          rewriteTaskStatus.value = String(message.status)
          rewriteTaskProgress.value = message.progress
          rewriteError.value = message.errorMessage || '改写任务失败'
          rewriteLoading.value = false
          resolve()
        },
        onError(error) {
          rewriteError.value = error.message
          rewriteLoading.value = false
          resolve()
        },
      })
    })
  } catch (e) {
    rewriteError.value = e instanceof Error ? e.message : '请求失败'
    rewriteLoading.value = false
    rewriteTaskStatus.value = 'FAILED'
  } finally {
    stopRewriteTask()
  }
}

function stopRewriteTask() {
  if (stopRewriteTracking) {
    stopRewriteTracking()
    stopRewriteTracking = null
  }
}

function stopParseTask() {
  if (stopParseTracking) {
    stopParseTracking()
    stopParseTracking = null
  }
  trackedParseTaskId = null
}

async function copyRewrittenText() {
  if (!rewrittenText.value) {
    return
  }
  await navigator.clipboard?.writeText(rewrittenText.value)
  applyMessage.value = '文案已复制'
}

async function prepareBenchmarkPlanPreview() {
  if (!requireAuth('登录后可生成爆款对标视频')) return
  if (planPreviewLoading.value || planSubmitting.value) return

  const draft = buildBenchmarkPlanDraft()
  benchmarkPlanDraft.value = draft
  planPreviewOpen.value = true
  planPreviewLoading.value = true
  planPreviewError.value = ''
  try {
    planPreview.value = await prepareCarSalesAiPlanPreview(draft)
  } catch (error) {
    planPreviewError.value = error instanceof Error ? error.message : '方案生成失败'
  } finally {
    planPreviewLoading.value = false
  }
}

function buildBenchmarkPlanDraft(): CarSalesPlanDraft {
  const parse = douyinParse.value
  const durationSeconds = Math.max(12, Math.round(parse?.durationSeconds || 20))
  const segmentCount = Math.max(1, Math.min(4, Math.ceil(durationSeconds / 8)))
  const segmentDuration = Math.max(4, Math.round(durationSeconds / segmentCount))
  const script = rewrittenText.value.trim() || sourceText.value.trim()
  const prompt = [
    '基于爆款结构生成一条汽车销售视频',
    parse?.title ? `参考标题：${parse.title}` : '',
    videoUrl.value.trim() ? `参考链接：${videoUrl.value.trim()}` : '',
    script ? `参考文案：${script.slice(0, 500)}` : '',
  ].filter(Boolean).join('\n')

  return {
    source: 'benchmark',
    title: parse?.title || '爆款对标汽车销售方案',
    prompt,
    referenceUrl: videoUrl.value.trim(),
    coverUrl: videoCoverUrl.value,
    script,
    assets: [...benchmarkDraftAssets.value],
    aspectRatio: '9:16',
    subtitleMode: 'auto',
    subtitleLanguage: 'zh-CN',
    nativeVoiceLanguage: rewriteTargetLanguage.value === '英文' ? 'en-US' : 'zh-CN',
    nativeVoiceStyle: 'natural_sales',
    nativeSpeechStyle: 'balanced',
    burnInSubtitle: true,
    audioPolicy: 'auto',
    model: 'auto',
    segmentCount,
    segmentDuration,
    configItems: [
      selectedPlatform.value === 'auto' ? '平台自动识别' : `平台 ${selectedPlatform.value}`,
      '爆款文案复用',
      '爆款节奏拆解',
    ],
    warnings: [
      ...(script ? [] : ['当前没有解析/改写文案，方案会使用本地爆款结构兜底。']),
      ...(benchmarkDraftAssets.value.length ? [] : ['汽车销售生成至少需要 1 张车辆图片，请在确认生成前补充车辆素材。']),
    ],
  }
}

function handleBenchmarkAssetSelect(payload: CarSalesAssetSelectPayload) {
  const next = planAssetFromAssetItem(payload.asset, payload.role)
  benchmarkDraftAssets.value = [
    ...benchmarkDraftAssets.value.filter((item) => item.assetId !== next.assetId),
    next,
  ]
  benchmarkAssetDrawerOpen.value = false
  applyMessage.value = `已加入素材：${payload.asset.fileName}`
}

function removeBenchmarkDraftAsset(assetId: number) {
  benchmarkDraftAssets.value = benchmarkDraftAssets.value.filter((item) => item.assetId !== assetId)
}

function updatePlanScript(value: string) {
  if (!planPreview.value) return
  planPreview.value = {
    ...planPreview.value,
    script: value,
  }
}

async function confirmBenchmarkPlan() {
  if (!requireAuth('登录后可生成爆款对标视频')) return
  if (!benchmarkPlanDraft.value || !planPreview.value || planSubmitting.value) return
  if (!benchmarkPlanDraft.value.assets.some((asset) => asset.role === 'car_model_bundle' || asset.role.startsWith('car_') || asset.role.startsWith('scene_'))) {
    planPreviewError.value = '汽车销售生成至少需要 1 张车辆图片。请返回页面选择车图/车辆素材后再提交。'
    return
  }
  planSubmitting.value = true
  planPreviewError.value = ''
  try {
    const draftWithAsset = await ensureCarSalesPlanDraftAsset(benchmarkPlanDraft.value, planPreview.value)
    benchmarkPlanDraft.value = draftWithAsset
    const payload = buildQuickRenderRequestFromPlanDraft(draftWithAsset, planPreview.value)
    const submitted = await quickRenderVideo(payload, newVideoIdempotencyKey())
    const taskId = submitted.task?.taskId || submitted.digitalHumanTask?.taskId || null
    if (taskId) {
      rememberSessionTaskId(taskId)
      applyMessage.value = '已提交爆款对标生成任务'
      planPreviewOpen.value = false
      void router.push({ name: 'my-videos', query: { taskId: String(taskId) } })
      return
    }
    planPreviewError.value = submitted.summary || '任务提交成功，但没有返回可跟踪任务'
  } catch (error) {
    planPreviewError.value = error instanceof Error ? error.message : '提交生成失败'
  } finally {
    planSubmitting.value = false
  }
}

function applyScript() {
  applyMessage.value = '文案已应用，下一步可进入音频生成'
  emit('continue')
}
</script>

<style scoped>
.benchmark-page {
  width: min(var(--app-content-width), calc(100% - 76px));
  margin: 24px auto 30px;
}

.benchmark-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 30px;
}

.benchmark-head h1 {
  margin: 0 0 10px;
  color: #151a2d;
  font-size: 24px;
  font-weight: 850;
  letter-spacing: 0;
}

.benchmark-head p {
  margin: 0;
  color: #667085;
  font-size: 14px;
  line-height: 1.6;
}

.secondary-button,
.primary-button {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 8px;
  padding: 0 17px;
  font-weight: 800;
}

.secondary-button {
  border: 1px solid #e5e7f0;
  background: #fff;
  color: #394053;
  box-shadow: none;
}

.secondary-button:hover:not(:disabled) {
  border-color: var(--hs-primary-border, #bfdbfe);
  color: var(--hs-primary, #2563eb);
}

.primary-button {
  border: 0;
  background: var(--hs-primary, #2563eb);
  box-shadow: none;
  color: #fff;
}

.primary-button:hover:not(:disabled) {
  background: var(--hs-primary-hover, #1d4ed8);
  transform: none;
}

.primary-button:disabled,
.secondary-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.tips-bar {
  display: flex;
  min-height: 52px;
  align-items: center;
  gap: 8px;
  border: 1px solid #e3dcff;
  border-radius: 8px;
  background: rgba(247, 245, 255, 0.78);
  color: #657084;
  margin-bottom: 24px;
  padding: 0 16px;
  font-weight: 700;
}

.tips-bar span {
  color: #8b7cf6;
  font-size: 18px;
}

.tips-bar strong {
  color: #5c6477;
}

.benchmark-layout {
  display: grid;
  grid-template-columns: 380px minmax(0, 1fr);
  gap: 34px;
  align-items: stretch;
}

.analysis-card,
.rewrite-card {
  border: 1px solid #e8ebf3;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: none;
  min-height: 0;
}

.analysis-card {
  display: flex;
  flex-direction: column;
  padding: 20px 18px 28px;
}

.rewrite-card {
  display: flex;
  flex-direction: column;
  padding: 20px 20px 28px;
}

.panel-block + .panel-block {
  border-top: 1px solid #edf0f6;
  margin-top: 16px;
  padding-top: 18px;
}

.panel-block h2,
.rewrite-card h2 {
  flex-shrink: 0;
  margin: 0 0 20px;
  color: #1f2437;
  font-size: 18px;
  font-weight: 850;
}

.panel-block h3 {
  margin: 0 0 12px;
  color: #2a3042;
  font-size: 14px;
  font-weight: 850;
}

.parse-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 62px 92px;
  gap: 10px;
}

.parse-row.has-cancel {
  grid-template-columns: minmax(0, 1fr) 62px 92px 72px;
}

.parse-cancel-button {
  min-height: 42px;
  padding: 0 12px;
}

.source-tabs,
.platform-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 14px 0 10px;
}

.source-tabs button,
.platform-tabs button {
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid #dfe5f2;
  border-radius: 8px;
  background: #fff;
  color: #516078;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.source-tabs button.active,
.platform-tabs button.active {
  border-color: #7d67ff;
  background: #f2efff;
  color: #513ee8;
}

.source-tabs button:disabled,
.platform-tabs button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.source-tabs {
  margin-bottom: 12px;
}

.platform-note {
  margin: 0 0 12px;
  color: #667085;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.6;
}

.platform-auto-hint {
  margin: -4px 0 12px;
  color: #256a52;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.5;
}

.platform-limit-note {
  margin: -4px 0 12px;
  border: 1px solid #ffd9a8;
  border-radius: 8px;
  background: #fff8ec;
  color: #9a5a12;
  padding: 9px 10px;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.6;
}

.upload-parse-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 128px;
  gap: 10px;
  align-items: stretch;
}

.upload-parse-panel.has-cancel {
  grid-template-columns: minmax(0, 1fr) 128px 72px;
}

.video-upload-picker {
  display: flex;
  min-width: 0;
  min-height: 52px;
  align-items: center;
  gap: 10px;
  border: 1px dashed #cfd6e6;
  border-radius: 8px;
  background: #fff;
  padding: 0 14px;
  cursor: pointer;
}

.video-upload-picker input {
  display: none;
}

.video-upload-picker span {
  flex-shrink: 0;
  color: #4630d1;
  font-size: 13px;
  font-weight: 850;
}

.video-upload-picker small {
  min-width: 0;
  overflow: hidden;
  color: #667085;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-upload-picker.disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.upload-parse-button {
  min-height: 52px;
}

.upload-cancel-button {
  min-height: 52px;
  padding: 0 12px;
}

.local-upload-progress {
  display: grid;
  gap: 7px;
  margin-top: 10px;
  color: #4d5f7c;
  font-size: 12px;
  font-weight: 800;
}

.local-upload-progress-track {
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: #edf1f8;
}

.local-upload-progress-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--hs-primary, #2563eb);
  transition: width 180ms ease;
}

.parse-row input,
.rewrite-toolbar select,
.rewrite-style-select,
.text-area-label textarea {
  width: 100%;
  border: 1px solid #e3e7ef;
  border-radius: 8px;
  background: #fff;
  color: #232838;
  outline: none;
}

.parse-row input,
.rewrite-toolbar select,
.rewrite-style-select {
  height: 42px;
  padding: 0 12px;
}

.parse-row input::placeholder {
  color: #99a3b5;
}

.parse-row input:focus,
.rewrite-toolbar select:focus,
.rewrite-style-select:focus,
.text-area-label textarea:focus {
  border-color: var(--hs-primary, #2563eb);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.error-text {
  margin: 10px 0 0;
  color: #d64c4c;
  font-size: 13px;
}

.success-text {
  margin: 10px 0 0;
  color: #178a4c;
  font-size: 13px;
  font-weight: 750;
}

.info-text {
  margin: 10px 0 0;
  color: #4d5f7c;
  font-size: 13px;
  line-height: 1.65;
}

.download-progress-panel {
  display: grid;
  gap: 8px;
  margin-top: 10px;
  border: 1px solid #d8e8df;
  border-radius: 8px;
  background: #f8fcfa;
  padding: 10px 12px;
}

.download-progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #365647;
  font-size: 13px;
  font-weight: 800;
}

.download-progress-head strong {
  color: #197351;
  font-size: 12px;
}

.download-progress-track {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #dfece6;
}

.download-progress-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--hs-success, #16a34a);
  transition: width 0.25s ease;
}

.download-progress-panel p {
  margin: 0;
  color: #5d6f65;
  font-size: 12px;
  font-weight: 750;
}

.transcript-status {
  flex-shrink: 0;
  margin: 0 0 14px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #e3dcff;
  background: rgba(247, 245, 255, 0.78);
  color: #5c6477;
  font-size: 13px;
  font-weight: 750;
}

.transcript-banner {
  flex-shrink: 0;
  margin: 0 0 14px;
}

.video-placeholder {
  margin: 0;
  border: 1px dashed #e1e6ef;
  border-radius: 8px;
  padding: 18px 14px;
  color: #98a2b3;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.6;
}

.video-placeholder p {
  margin: 0;
}

.video-detail {
  display: grid;
  gap: 14px;
  border: 1px solid #edf0f6;
  border-radius: 8px;
  padding: 12px;
}

.video-media {
  display: grid;
  gap: 10px;
}

.cover-img {
  width: 100%;
  max-height: 200px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid #edf0f6;
}

.cover-video {
  width: 100%;
  max-height: 220px;
  border: 1px solid #edf0f6;
  border-radius: 8px;
  background: #111827;
}

.cover-placeholder {
  display: grid;
  min-height: 132px;
  place-items: center;
  border: 1px dashed #d9deea;
  border-radius: 8px;
  background: #f8fafc;
  color: #8a94a6;
  font-size: 13px;
  font-weight: 800;
}

.video-meta-block {
  min-width: 0;
}

.author-line {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.author-avatar {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid #edf0f6;
}

.video-title {
  margin: 0;
  color: #2d3446;
  font-size: 15px;
  line-height: 1.45;
  font-weight: 800;
}

.meta-line {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  color: #7b8495;
  font-size: 13px;
  line-height: 1.7;
}

.video-meta-block > .meta-line {
  margin-top: 10px;
}

.insight-list {
  display: grid;
  gap: 12px;
  border: 1px solid #edf0f6;
  border-radius: 8px;
  padding: 14px 12px;
}

.insight-item {
  display: grid;
  grid-template-columns: 24px 82px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-height: 28px;
}

.insight-icon {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border-radius: 999px;
  background: #7567f6;
  color: #fff;
  font-size: 11px;
  font-weight: 900;
}

.insight-item strong {
  color: #566074;
  font-size: 13px;
}

.insight-item p {
  margin: 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.6;
}

.refresh-button {
  min-width: 122px;
  margin-top: auto;
  margin-right: auto;
  margin-bottom: 0;
  margin-left: auto;
  padding-top: 18px;
}

.rewrite-box {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  border: 1px solid #e8ebf3;
  border-radius: 8px;
  padding: 10px 12px 18px;
}

.rewrite-flow-hint {
  flex-shrink: 0;
  margin: 0 0 14px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px dashed #d8d2ff;
  background: rgba(250, 249, 255, 0.65);
  color: #5c6477;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.65;
}

.rewrite-flow-hint strong {
  color: #4630c9;
  font-weight: 850;
}

.rewrite-api-tag {
  margin: 0 2px;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(86, 59, 240, 0.08);
  color: #5148e5;
  font-size: 12px;
  font-weight: 800;
}

.rewrite-confirm-panel {
  flex-shrink: 0;
  border: 1px solid #edf0f6;
  border-radius: 8px;
  background: #fcfcff;
  padding: 12px 12px 14px;
}

.rewrite-toolbar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 0;
}

.rewrite-fields {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 18px;
  min-height: 0;
}

.rewrite-fields .text-area-label {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.rewrite-fields .text-area-label textarea {
  flex: 1;
}

.tabs {
  display: flex;
  gap: 8px;
}

.tabs button {
  display: inline-flex;
  height: 42px;
  align-items: center;
  gap: 7px;
  border: 1px solid #e7eaf2;
  border-radius: 8px;
  background: #fff;
  color: #4f586c;
  padding: 0 18px;
  font-weight: 800;
}

.tabs button.active {
  border-color: var(--hs-primary-border, #bfdbfe);
  background: var(--hs-primary-soft, #eff6ff);
  box-shadow: none;
  color: var(--hs-primary, #2563eb);
}

.tab-panel {
  margin-top: 12px;
}

.custom-rewrite-shell {
  border-radius: 8px;
  border: 1px dashed #e1e6ef;
  background: #fff;
  padding: 14px 12px;
}

.shell-placeholder {
  margin: 0;
  color: #8b94a8;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.65;
}

.ai-rewrite-shell {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.style-tools {
  display: flex;
  align-items: center;
  gap: 14px;
}

.style-tools-row {
  flex-wrap: wrap;
}

.style-tools-row label {
  flex-wrap: wrap;
  white-space: normal;
}

.style-tools label {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #4c566a;
  font-weight: 750;
  white-space: nowrap;
}

.rewrite-toolbar select,
.rewrite-style-select {
  min-width: 146px;
}

/* 避免继承 label 上的高字重；与 body 使用同一套无衬线，与输入框视觉一致 */
.rewrite-style-select {
  box-sizing: border-box;
  max-width: 100%;
  padding-right: 32px;
  border: 1px solid #e3e7ef;
  font-family: Inter, 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.35;
  letter-spacing: 0;
  cursor: pointer;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%2364748b' d='M1.4 0 6 4.6 10.6 0 12 1.4l-6 6-6-6Z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-color: #fff;
}

.rewrite-style-select:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.tag-muted {
  color: #98a2b3;
  font-weight: 700;
}

.rewrite-error {
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #f5c4c4;
  background: #fff8f8;
  color: #c24141;
  font-size: 13px;
  font-weight: 750;
  line-height: 1.5;
}

.rewrite-progress-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rewrite-progress-track {
  flex: 1;
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #e8ecf4;
}

.rewrite-progress-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--hs-primary, #2563eb);
  transition: width 0.35s ease;
}

.rewrite-progress-pct {
  flex-shrink: 0;
  min-width: 2.75rem;
  color: #667085;
  font-size: 12px;
  font-weight: 800;
  text-align: right;
}

.extra-notes-block {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.extra-notes-toggle {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px dashed #e1e6ef;
  border-radius: 8px;
  background: #fff;
  color: #374055;
  font-size: 13px;
  font-weight: 800;
  text-align: left;
  cursor: pointer;
  outline: none;
}

.extra-notes-toggle:hover {
  border-color: #c9c2ff;
  background: rgba(250, 249, 255, 0.85);
}

.extra-notes-toggle:focus-visible {
  border-color: var(--hs-primary, #2563eb);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.extra-notes-toggle-title {
  flex-shrink: 0;
}

.extra-notes-chevron {
  display: inline-flex;
  flex-shrink: 0;
  font-size: 18px;
  font-weight: 900;
  color: var(--hs-primary, #2563eb);
  line-height: 1;
  transform: rotate(0deg);
  transition: transform 0.18s ease;
}

.extra-notes-chevron.is-open {
  transform: rotate(90deg);
}

.extra-notes-collapse {
  margin-top: 8px;
}

.extra-notes-input {
  width: 100%;
  margin: 0;
  padding: 10px 12px;
  border: 1px solid #e3e7ef;
  border-radius: 8px;
  background: #fff;
  color: #4e596d;
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
}

.extra-notes-input:focus {
  border-color: var(--hs-primary, #2563eb);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  outline: none;
}

.extra-notes-input:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.confirm-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
}

.confirm-rewrite-btn {
  min-width: 96px;
}

.text-area-label {
  position: relative;
  display: block;
  color: #374055;
  font-weight: 850;
}

.text-area-label + .text-area-label {
  margin-top: 18px;
}

.rewrite-fields .text-area-label + .text-area-label {
  margin-top: 0;
}

.text-area-label span {
  color: #7b8496;
  font-weight: 700;
}

.text-area-label textarea {
  display: block;
  margin-top: 10px;
  padding: 13px 14px;
  color: #4e596d;
  line-height: 1.8;
  resize: vertical;
}

.source-text {
  min-height: 164px;
  background: #f8f9fc !important;
}

.result-text {
  min-height: 230px;
}

.text-area-label small {
  position: absolute;
  right: 14px;
  bottom: 10px;
  color: #7d8797;
  font-size: 12px;
  font-weight: 800;
}

.rewrite-actions {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 22px;
}

.continue-button {
  min-width: 160px;
}

.bottom-action {
  display: grid;
  justify-items: center;
  gap: 12px;
  margin-top: 32px;
}

.bottom-action p {
  margin: 0;
  color: #98a2b3;
  font-weight: 700;
}

@media (max-width: 1024px) {
  .benchmark-page {
    width: calc(100% - 48px);
  }

  .benchmark-layout {
    grid-template-columns: 340px minmax(0, 1fr);
    gap: 18px;
  }

  .rewrite-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 900px) {
  .benchmark-page {
    width: calc(100% - 32px);
  }

  .benchmark-head,
  .style-tools,
  .confirm-actions,
  .rewrite-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .benchmark-layout {
    grid-template-columns: 1fr;
  }

  .parse-row {
    grid-template-columns: 1fr;
  }

  .upload-parse-panel,
  .upload-parse-panel.has-cancel {
    grid-template-columns: 1fr;
  }

  .parse-row button {
    width: 100%;
  }

  .tabs,
  .style-tools label {
    width: 100%;
  }

  .tabs button,
  .style-tools select,
  .rewrite-style-select,
  .style-tools .secondary-button,
  .confirm-actions .primary-button,
  .rewrite-actions button {
    width: 100%;
  }
}

/* P2 visual refresh: benchmark parsing workspace */
.benchmark-page {
  width: min(1240px, calc(100% - 40px));
  margin: 0 auto;
}

.benchmark-layout {
  grid-template-columns: minmax(340px, 0.88fr) minmax(0, 1.12fr);
  gap: 16px;
}

.analysis-card,
.rewrite-card {
  border-color: var(--hs-border, #d9e1ec);
  background: #ffffff;
}

.panel-block + .panel-block {
  border-top-color: var(--hs-border, #d9e1ec);
}

.panel-block h2,
.panel-block h3,
.rewrite-card h2 {
  color: var(--hs-text, #172033);
}

.tips-bar,
.transcript-status,
.download-progress-panel,
.local-upload-progress,
.rewrite-confirm-panel,
.rewrite-flow-hint {
  border: 1px solid var(--hs-border, #d9e1ec);
  border-radius: 8px;
  background: var(--hs-surface-soft, #f8fafc);
  color: var(--hs-muted, #667085);
}

.tips-bar span,
.tips-bar strong,
.transcript-status,
.rewrite-flow-hint strong,
.storyboard-hint a {
  color: var(--hs-primary, #2563eb);
}

.source-tabs,
.platform-tabs {
  border: 1px solid var(--hs-border, #d9e1ec);
  border-radius: 8px;
  background: var(--hs-surface-soft, #f8fafc);
  padding: 4px;
}

.source-tabs button,
.platform-tabs button,
.tabs button {
  border-radius: 6px;
  border-color: transparent;
  background: transparent;
  color: var(--hs-muted, #667085);
  box-shadow: none;
}

.source-tabs button.active,
.platform-tabs button.active,
.tabs button.active {
  border-color: var(--hs-primary-border, #bfdbfe);
  background: #ffffff;
  color: var(--hs-primary, #2563eb);
  box-shadow: none;
}

.parse-row input,
.rewrite-toolbar select,
.rewrite-style-select,
.text-area-label textarea,
.extra-notes-input {
  border-color: var(--hs-border, #d9e1ec);
  border-radius: 6px;
  color: var(--hs-text, #172033);
}

.secondary-button,
.primary-button {
  border-radius: 6px;
}

.primary-button {
  background: var(--hs-primary, #2563eb);
}

.secondary-button {
  border-color: var(--hs-border, #d9e1ec);
  color: var(--hs-text, #172033);
}

.video-upload-picker,
.video-placeholder,
.video-detail,
.insight-item,
.custom-rewrite-shell,
.extra-notes-toggle {
  border-color: var(--hs-border, #d9e1ec);
  border-radius: 8px;
  background: #ffffff;
}

.video-placeholder,
.source-text {
  background: var(--hs-surface-soft, #f8fafc) !important;
}

.insight-icon {
  background: var(--hs-primary-soft, #eff6ff);
  color: var(--hs-primary, #2563eb);
}

.error-text,
.rewrite-error {
  color: #b42318;
}

.rewrite-error {
  border-color: #fecaca;
  background: #fef2f2;
}

.success-text {
  color: #15803d;
}

.info-text {
  color: var(--hs-primary, #2563eb);
}

.download-progress-track,
.local-upload-progress-track,
.rewrite-progress-track {
  background: #dbeafe;
}

.download-progress-fill {
  background: var(--hs-success, #16a34a);
}

.local-upload-progress-fill,
.rewrite-progress-fill {
  background: var(--hs-primary, #2563eb);
}

@media (max-width: 1024px) {
  .benchmark-page {
    width: calc(100% - 32px);
  }

  .benchmark-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .benchmark-page {
    width: calc(100% - 24px);
  }

  .analysis-card,
  .rewrite-card {
    padding: 14px;
  }

  .source-tabs,
  .platform-tabs,
  .tabs {
    display: grid;
    grid-template-columns: 1fr;
  }
}

.benchmark-page {
  width: min(1520px, calc(100% - 48px));
  margin: 22px auto 42px;
  color: #101828;
  letter-spacing: 0;
}

.benchmark-redesign {
  display: grid;
  gap: 18px;
}

.benchmark-redesign-head {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  min-height: 86px;
  text-align: center;
}

.benchmark-title-line {
  display: flex;
  align-items: center;
  gap: 14px;
}

.benchmark-car-icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 12px;
  background: #e8f1ff;
  color: #1261ff;
  font-size: 18px;
  line-height: 1;
}

.benchmark-redesign-head h1 {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 0;
  color: #101828;
  font-size: 30px;
  font-weight: 900;
  line-height: 1.2;
}

.benchmark-title-line p {
  margin: 10px 0 0;
  color: #667085;
  font-size: 16px;
  font-weight: 650;
}

.benchmark-head-tag {
  display: inline-flex;
  min-height: 24px;
  align-items: center;
  border-radius: 999px;
  background: #f1f5fb;
  color: #667085;
  padding: 0 11px;
  font-size: 12px;
  font-weight: 800;
  vertical-align: middle;
}

.benchmark-head-actions {
  position: absolute;
  top: 12px;
  right: 0;
  display: flex;
  gap: 12px;
}

.ghost-button {
  display: inline-flex;
  box-sizing: border-box;
  width: 108px;
  height: 38px;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid #cfd9ea;
  border-radius: 6px;
  background: #ffffff;
  color: #101828;
  padding: 0 12px;
  font-size: 14px;
  font-weight: 850;
  line-height: 1;
  cursor: pointer;
}

.benchmark-steps {
  display: grid;
  width: min(880px, 100%);
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  align-items: center;
  margin: 18px auto 0;
}

.benchmark-step {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  color: #8a95a8;
  font-weight: 850;
}

.benchmark-step:not(:last-child)::after {
  position: absolute;
  right: -50%;
  left: calc(50% + 58px);
  height: 1px;
  background: #b8c5d8;
  content: '';
}

.benchmark-step span {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 1px solid #b8c5d8;
  border-radius: 999px;
  background: #fff;
  color: #8a95a8;
  font-size: 13px;
  line-height: 1;
}

.benchmark-step.active {
  color: #1261ff;
}

.benchmark-step.active span {
  border-color: #1261ff;
  background: #1261ff;
  color: #fff;
}

.benchmark-page-note {
  display: none;
  margin: 0 0 -2px 118px;
  color: #667085;
  font-size: 14px;
  font-weight: 650;
}

.benchmark-stage-card,
.generate-confirm-card {
  border: 1px solid #dfe7f3;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 16px 42px rgba(16, 24, 40, 0.04);
}

.benchmark-stage-card {
  padding: 18px;
}

.benchmark-input-stage {
  padding: 18px 20px;
}

.benchmark-stage-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.benchmark-stage-title > span {
  display: none;
  width: 26px;
  height: 26px;
  place-items: center;
  border-radius: 8px;
  background: #e8f1ff;
  color: #1261ff;
  font-size: 15px;
  font-weight: 900;
}

.benchmark-stage-title h2 {
  margin: 0;
  color: #101828;
  font-size: 18px;
  font-weight: 900;
  line-height: 1.2;
}

.benchmark-stage-title small {
  color: #8a95a8;
  font-size: 12px;
  font-weight: 750;
}

.result-title .secondary-button {
  margin-left: auto;
  height: 36px;
  min-height: 36px;
  padding: 0 13px;
  font-size: 13px;
}

.benchmark-source-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 20px;
  align-items: start;
}

.benchmark-input-stage .benchmark-source-grid {
  align-items: stretch;
}

.benchmark-link-panel,
.benchmark-upload-card,
.benchmark-vehicle-card,
.benchmark-ready-card {
  min-width: 0;
  border: 1px solid #dfe7f3;
  border-radius: 9px;
  background: #fff;
  padding: 16px;
}

.benchmark-link-panel {
  display: grid;
  align-content: start;
  gap: 14px;
}

.benchmark-input-stage .benchmark-link-panel {
  align-content: center;
  min-height: 214px;
}

.source-tabs.redesign-tabs,
.platform-note,
.platform-auto-hint {
  display: none;
}

.source-tabs.redesign-tabs,
.platform-tabs.redesign-platforms {
  margin: 0;
}

.source-tabs.redesign-tabs button,
.platform-tabs.redesign-platforms button {
  min-height: 34px;
  border-radius: 6px;
  color: #344054;
}

.source-tabs.redesign-tabs button.active,
.platform-tabs.redesign-platforms button.active {
  border-color: #1261ff;
  background: #eef4ff;
  color: #1261ff;
}

.platform-tabs.redesign-platforms {
  gap: 9px;
  align-items: center;
}

.platform-tabs.redesign-platforms button {
  display: inline-flex;
  height: 36px;
  min-width: 66px;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex: 0 0 auto;
  white-space: nowrap;
}

.platform-tabs button img,
.platform-tabs button .platform-auto-icon {
  display: inline-grid;
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
  place-items: center;
  border-radius: 4px;
}

.platform-tabs button img {
  object-fit: contain;
}

.platform-tabs button .platform-auto-icon {
  background: #e8f1ff;
  color: #1261ff;
  font-size: 13px;
  font-weight: 900;
  line-height: 1;
}

.benchmark-url-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 128px 144px;
  gap: 10px;
  align-items: center;
}

.benchmark-url-row.has-cancel {
  grid-template-columns: minmax(0, 1fr) 128px 144px 76px;
}

.benchmark-url-row input {
  width: 100%;
  height: 40px;
  min-height: 40px;
  border: 1px solid #dbe5f5;
  border-radius: 7px;
  background: #fff;
  color: #101828;
  padding: 0 14px;
  outline: none;
}

.benchmark-url-row input:focus {
  border-color: #1261ff;
  box-shadow: 0 0 0 3px rgba(18, 97, 255, 0.1);
}

.benchmark-url-row .primary-button,
.benchmark-url-row .secondary-button,
.redesign-upload .primary-button,
.redesign-upload .secondary-button {
  box-sizing: border-box;
  align-self: center;
  height: 40px;
  min-height: 40px;
  border-radius: 7px;
  padding: 0 14px;
  font-size: 14px;
  line-height: 1;
}

.benchmark-redesign .primary-button,
.benchmark-redesign .secondary-button {
  box-sizing: border-box;
  border-radius: 7px;
  font-size: 14px;
  line-height: 1;
}

.benchmark-url-row .primary-button,
.benchmark-url-row .secondary-button,
.benchmark-ready-card .primary-button,
.benchmark-ready-card .secondary-button,
.result-title .secondary-button,
.script-extract-card footer .secondary-button,
.scheme-card .secondary-button,
.ghost-button {
  white-space: nowrap;
}

.platform-note {
  margin: 0;
}

.benchmark-sample-row {
  display: none;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.benchmark-sample-row article {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 10px;
  min-width: 0;
  align-items: center;
}

.sample-cover,
.vehicle-thumb {
  display: block;
  overflow: hidden;
  background: linear-gradient(135deg, #d7e7ff 0%, #7d9bc0 48%, #182235 100%);
}

.sample-cover {
  width: 72px;
  height: 48px;
  border-radius: 6px;
}

.sample-cover--two,
.vehicle-thumb--two {
  background: linear-gradient(135deg, #e7eef8 0%, #7088a9 48%, #0f172a 100%);
}

.sample-cover--three,
.vehicle-thumb--three {
  background: linear-gradient(135deg, #eef2ff 0%, #5b84c4 52%, #111827 100%);
}

.vehicle-thumb--four {
  background: linear-gradient(135deg, #dceafd 0%, #8b9cb5 48%, #243045 100%);
}

.benchmark-sample-row strong {
  display: block;
  overflow: hidden;
  color: #101828;
  font-size: 12px;
  font-weight: 850;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.benchmark-sample-row p {
  overflow: hidden;
  margin: 5px 0 0;
  color: #667085;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.benchmark-upload-card,
.benchmark-vehicle-card {
  display: grid;
  align-content: start;
  gap: 12px;
}

.benchmark-upload-card h3,
.benchmark-vehicle-card h3 {
  margin: 0;
  color: #101828;
  font-size: 15px;
  font-weight: 900;
}

.upload-switch {
  display: grid;
  min-height: 130px;
  place-items: center;
  gap: 10px;
  border: 1px dashed #b9c9e4;
  border-radius: 8px;
  background: #fbfdff;
  color: #667085;
  padding: 18px;
  cursor: pointer;
  text-align: center;
}

.upload-switch span {
  display: grid;
  width: 46px;
  height: 46px;
  place-items: center;
  border-radius: 999px;
  background: #eef4ff;
  color: #1261ff;
  font-size: 24px;
}

.upload-switch strong {
  color: #667085;
  font-size: 13px;
  line-height: 1.5;
}

.benchmark-upload-card p,
.benchmark-vehicle-card p {
  margin: 0;
  color: #667085;
  font-size: 12px;
  line-height: 1.6;
}

.vehicle-thumb-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.vehicle-thumb,
.vehicle-thumb-row button {
  aspect-ratio: 1.42;
  border-radius: 7px;
}

.vehicle-thumb-row button {
  border: 1px dashed #b9c9e4;
  background: #fff;
  color: #64748b;
  font-size: 28px;
  cursor: pointer;
}

.billing-inline {
  display: none;
  margin-top: 12px;
}

.benchmark-ready-card {
  display: grid;
  align-content: start;
  gap: 12px;
}

.benchmark-ready-card h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: #101828;
  font-size: 20px;
  font-weight: 900;
}

.ready-stat-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.ready-stat-list span {
  display: grid;
  align-items: center;
  align-content: center;
  gap: 5px;
  min-height: 66px;
  border: 1px solid #e6eefb;
  border-radius: 8px;
  background: #f8fbff;
  color: #475569;
  padding: 8px 9px;
  font-size: 12px;
  font-weight: 700;
}

.ready-stat-list em {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-style: normal;
  white-space: nowrap;
}

.ready-stat-list strong {
  color: #1261ff;
  font-size: 17px;
  font-weight: 900;
  white-space: nowrap;
}

.benchmark-ready-card .primary-button,
.benchmark-ready-card .secondary-button {
  width: 100%;
  height: 40px;
  min-height: 40px;
  padding: 0 14px;
  font-size: 14px;
}

.analysis-tabs {
  display: none;
  gap: 22px;
  margin-bottom: 12px;
}

.analysis-tabs button {
  min-height: 32px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #667085;
  padding: 0 2px;
  font-weight: 850;
  cursor: pointer;
}

.analysis-tabs button.active {
  border-color: #1261ff;
  color: #1261ff;
}

.analysis-result-grid {
  display: grid;
  grid-template-columns: minmax(390px, 1.2fr) repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.benchmark-video-summary-card,
.script-extract-card,
.keyword-card,
.shot-structure-card,
.scheme-card {
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  background: #fff;
  padding: 14px;
}

.benchmark-video-summary-card {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 18px;
  align-items: center;
}

.benchmark-video-cover {
  position: relative;
  display: grid;
  width: 100%;
  aspect-ratio: 16 / 9;
  place-items: center;
  overflow: hidden;
  border-radius: 8px;
  background: linear-gradient(135deg, #d7e7ff 0%, #7d9bc0 52%, #182235 100%);
}

.benchmark-video-cover img,
.benchmark-video-cover > span {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.benchmark-video-cover b {
  position: relative;
  z-index: 1;
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.66);
  color: #fff;
  font-size: 20px;
}

.benchmark-video-cover small {
  position: absolute;
  right: 8px;
  bottom: 8px;
  z-index: 1;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.68);
  color: #fff;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 800;
}

.benchmark-video-summary-card h3 {
  margin: 0 0 12px;
  color: #101828;
  font-size: 22px;
  font-weight: 900;
}

.benchmark-video-summary-card p {
  margin: 8px 0 0;
  color: #667085;
  font-size: 13px;
  font-weight: 700;
}

.script-extract-card h3,
.keyword-card h3,
.shot-structure-card h3,
.scheme-card h3 {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 0 12px;
  color: #101828;
  font-size: 15px;
  font-weight: 900;
}

.benchmark-redesign :deep(.el-icon) {
  flex: 0 0 auto;
  line-height: 1;
}

.benchmark-redesign :deep(svg) {
  width: 1em;
  height: 1em;
}

.script-extract-card textarea,
.scheme-card textarea {
  width: 100%;
  min-height: 120px;
  border: 0;
  border-radius: 6px;
  background: #fbfdff;
  color: #1f2937;
  padding: 10px;
  font-size: 14px;
  line-height: 1.75;
  resize: vertical;
  outline: none;
}

.script-extract-card footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 10px;
}

.script-extract-card footer span,
.scheme-card small {
  color: #8a95a8;
  font-size: 12px;
  font-weight: 750;
}

.script-extract-card footer .secondary-button {
  height: 34px;
  min-height: 34px;
  padding: 0 12px;
  font-size: 13px;
}

.keyword-tags,
.style-tags,
.option-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
}

.keyword-tags span,
.style-tags span,
.option-pills span {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  border-radius: 7px;
  background: #eef4ff;
  color: #1261ff;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 850;
}

.basic-info-grid {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) 72px minmax(0, 1fr);
  gap: 12px 8px;
  margin-top: 18px;
  border-top: 1px solid #edf1f7;
  padding-top: 14px;
}

.basic-info-grid span {
  color: #8a95a8;
  font-size: 12px;
  font-weight: 750;
}

.basic-info-grid strong {
  overflow: hidden;
  color: #334155;
  font-size: 12px;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shot-track {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
}

.shot-mini-card {
  display: grid;
  min-height: 82px;
  align-content: end;
  gap: 5px;
  border-radius: 7px;
  background: linear-gradient(135deg, #d7e7ff 0%, #7d9bc0 52%, #182235 100%);
  color: #fff;
  padding: 8px;
}

.shot-mini-card span {
  align-self: start;
  width: max-content;
  border-radius: 5px;
  background: rgba(15, 23, 42, 0.76);
  padding: 2px 6px;
  font-size: 12px;
  font-weight: 900;
}

.shot-mini-card strong,
.shot-mini-card small {
  overflow: hidden;
  font-size: 11px;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shot-mini-card small {
  justify-self: end;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.62);
  padding: 1px 5px;
}

.style-tags {
  margin-top: 14px;
}

.benchmark-confirm-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
  align-items: start;
}

.scheme-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.scheme-grid .scheme-card:nth-child(4),
.scheme-grid .scheme-card:nth-child(5),
.generate-confirm-card {
  display: none;
}

.scheme-card {
  display: grid;
  align-content: start;
  gap: 12px;
}

.scheme-card--copy {
  min-width: 0;
}

.scheme-card--copy textarea:first-of-type {
  min-height: 132px;
}

.scheme-card--copy .rewritten-mini-textarea {
  min-height: 82px;
}

.rewrite-control-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
}

.rewrite-control-row .rewrite-style-select,
.rewrite-control-row .secondary-button {
  width: 100%;
  height: 36px;
  min-height: 36px;
  font-size: 13px;
}

.scheme-card > .secondary-button {
  height: 36px;
  min-height: 36px;
  padding: 0 13px;
  font-size: 13px;
}

.scheme-shot-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.scheme-shot-list span {
  display: grid;
  min-height: 64px;
  align-content: end;
  gap: 5px;
  border-radius: 7px;
  background: linear-gradient(135deg, #d7e7ff 0%, #7d9bc0 52%, #182235 100%);
  color: #fff;
  padding: 8px;
  font-size: 11px;
  font-weight: 850;
}

.scheme-shot-list strong {
  width: max-content;
  border-radius: 5px;
  background: rgba(15, 23, 42, 0.76);
  padding: 2px 6px;
}

.avatar-preview {
  display: grid;
  justify-items: center;
  gap: 9px;
}

.avatar-preview span {
  display: block;
  width: 88px;
  height: 108px;
  border-radius: 12px;
  background: linear-gradient(180deg, #f4d9c2 0%, #f9fafb 42%, #dbeafe 100%);
}

.avatar-preview strong {
  color: #667085;
  font-size: 12px;
  font-weight: 850;
}

.option-pills span {
  background: #fff;
  color: #667085;
  box-shadow: inset 0 0 0 1px #dfe7f3;
}

.option-pills span.active {
  background: #eef4ff;
  color: #1261ff;
  box-shadow: inset 0 0 0 1px #bfd4ff;
}

.music-preview {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  border-radius: 8px;
  background: #f8fbff;
  padding: 10px;
}

.music-preview span {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 999px;
  background: #eef4ff;
  color: #1261ff;
}

.music-preview strong,
.music-preview small {
  overflow: hidden;
  color: #667085;
  font-size: 12px;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.generate-confirm-card {
  display: grid;
  gap: 16px;
  padding: 18px;
}

.estimate-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.estimate-grid article {
  display: grid;
  gap: 8px;
  min-height: 112px;
  align-content: center;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  padding: 14px;
}

.estimate-grid span,
.estimate-grid small {
  color: #667085;
  font-size: 12px;
  font-weight: 750;
}

.estimate-grid strong {
  color: #101828;
  font-size: 26px;
  font-weight: 900;
}

.estimate-grid small {
  color: #1261ff;
}

.benchmark-asset-bridge {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px dashed #c7d7fe;
  border-radius: 8px;
  background: #f8fbff;
  padding: 12px;
}

.benchmark-asset-bridge div {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.benchmark-asset-bridge strong {
  color: #101828;
  font-size: 14px;
  font-weight: 900;
}

.benchmark-asset-bridge span {
  color: #667085;
  font-size: 12px;
  line-height: 1.5;
}

.benchmark-asset-bridge .secondary-button {
  flex: 0 0 auto;
  min-height: 34px;
}

.benchmark-selected-assets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.benchmark-selected-assets span {
  display: inline-flex;
  max-width: 100%;
  min-height: 30px;
  align-items: center;
  gap: 6px;
  border: 1px solid #dbeafe;
  border-radius: 999px;
  background: #eff6ff;
  color: #155eef;
  font-size: 12px;
  font-weight: 800;
  padding: 0 8px 0 10px;
}

.benchmark-selected-assets button {
  display: grid;
  width: 18px;
  height: 18px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: #dbeafe;
  color: #155eef;
  cursor: pointer;
  font-weight: 900;
}

.generate-confirm-card > .primary-button,
.generate-confirm-card > .secondary-button {
  width: 100%;
  min-height: 44px;
}

.generate-confirm-card p {
  margin: 0;
  color: #8a95a8;
  font-size: 12px;
  line-height: 1.6;
}

@media (max-width: 1280px) {
  .benchmark-source-grid,
  .analysis-result-grid,
  .benchmark-confirm-grid {
    grid-template-columns: 1fr;
  }

  .scheme-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .benchmark-page {
    width: calc(100% - 28px);
  }

  .benchmark-redesign-head {
    align-items: stretch;
    flex-direction: column;
  }

  .benchmark-steps,
  .shot-track,
  .scheme-grid,
  .benchmark-sample-row,
  .vehicle-thumb-row,
  .estimate-grid {
    grid-template-columns: 1fr;
  }

  .benchmark-page-note {
    margin-left: 0;
  }

  .benchmark-url-row,
  .benchmark-url-row.has-cancel,
  .redesign-upload,
  .redesign-upload.has-cancel {
    grid-template-columns: 1fr;
  }
}
</style>
