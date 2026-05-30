<template>
  <section class="asset-center-panel" :class="{ 'asset-center-panel--embed': embedPanel }">
    <div class="asset-center-head">
      <div>
        <h2>{{ headTitle }}</h2>
        <p>{{ headSubtitle }}</p>
      </div>

      <div class="asset-header-actions">
        <div v-if="showCategoryTabs" class="asset-category-segment" role="tablist" aria-label="资产分类">
          <button
            type="button"
            class="asset-scope-btn"
            :class="{ 'asset-scope-btn-active': activeCategory === 'materials' }"
            role="tab"
            :aria-selected="activeCategory === 'materials'"
            :disabled="loading"
            @click="activeCategory = 'materials'"
          >
            素材资产
          </button>
          <button
            type="button"
            class="asset-scope-btn"
            :class="{ 'asset-scope-btn-active': activeCategory === 'voices' }"
            role="tab"
            :aria-selected="activeCategory === 'voices'"
            :disabled="loading"
            @click="activeCategory = 'voices'"
          >
            音色库
          </button>
        </div>

        <div
          v-if="activeCategory === 'voices'"
          class="asset-scope-segment"
          role="tablist"
          aria-label="音色库范围"
        >
          <button
            type="button"
            class="asset-scope-btn"
            :class="{ 'asset-scope-btn-active': voiceListScope === 'private' }"
            role="tab"
            :aria-selected="voiceListScope === 'private'"
            :disabled="loading"
            @click="voiceListScope = 'private'"
          >
            私人音色库
          </button>
          <button
            type="button"
            class="asset-scope-btn"
            :class="{ 'asset-scope-btn-active': voiceListScope === 'public' }"
            role="tab"
            :aria-selected="voiceListScope === 'public'"
            :disabled="loading"
            @click="voiceListScope = 'public'"
          >
            公共音色库
          </button>
        </div>

        <div v-if="activeCategory === 'materials'" class="asset-scope-segment" role="tablist" aria-label="资产范围">
          <button
            type="button"
            class="asset-scope-btn"
            :class="{ 'asset-scope-btn-active': listScope === 'global' }"
            role="tab"
            :aria-selected="listScope === 'global'"
            :disabled="loading"
            @click="listScope = 'global'"
          >
            公共素材
          </button>
          <button
            type="button"
            class="asset-scope-btn"
            :class="{ 'asset-scope-btn-active': listScope === 'private' }"
            role="tab"
            :aria-selected="listScope === 'private'"
            :disabled="loading"
            @click="listScope = 'private'"
          >
            私有素材
          </button>
        </div>

        <div v-if="activeCategory === 'materials'" class="asset-stage-segment" role="tablist" aria-label="功能来源">
          <button
            v-for="stage in workflowStageOptions"
            :key="stage.key"
            type="button"
            class="asset-stage-btn"
            :class="{ 'asset-stage-btn-active': selectedWorkflowStage === stage.key }"
            :disabled="loading"
            @click="selectWorkflowStage(stage.key)"
          >
            {{ stage.label }}
          </button>
        </div>

        <select
          v-if="activeCategory === 'materials' && selectedWorkflowStage !== 'carBundle'"
          v-model="selectedType"
          class="asset-type-select"
          :disabled="loading"
        >
          <option value="">全部类型</option>
          <option value="TEXT">TEXT 文本</option>
          <option value="IMAGE">IMAGE 图片</option>
          <option value="AUDIO">AUDIO 音频</option>
          <option value="VIDEO">VIDEO 视频</option>
          <option value="COVER">COVER 封面</option>
          <option value="JSON">JSON 数据</option>
        </select>
        <select
          v-if="activeCategory === 'materials' && selectedWorkflowStage !== 'carBundle'"
          v-model="selectedSourceType"
          class="asset-type-select"
          :disabled="loading"
          @change="selectSpecificSourceType"
        >
          <option value="">全部来源</option>
          <option v-for="item in sourceTypeOptions" :key="item" :value="item">{{ sourceTypeLabel(item) }}</option>
        </select>
        <select
          v-if="activeCategory === 'materials' && selectedWorkflowStage !== 'carBundle'"
          v-model="selectedAssetGroup"
          class="asset-type-select"
          :disabled="loading"
        >
          <option value="">全部分组</option>
          <option :value="UNGROUPED_GROUP_KEY">未分组</option>
          <option v-for="group in assetGroupOptions" :key="group" :value="group">{{ group }}</option>
        </select>
        <select v-if="activeCategory === 'materials'" v-model="sortKey" class="asset-type-select" :disabled="loading">
          <option value="createdAtDesc">按时间（新到旧）</option>
          <option value="createdAtAsc">按时间（旧到新）</option>
          <option value="fileNameAsc">按文件名（A到Z）</option>
          <option value="fileSizeDesc">按大小（大到小）</option>
        </select>
        <input
          v-model="keyword"
          class="asset-search"
          type="search"
          :disabled="loading"
          :placeholder="activeCategory === 'materials' ? '搜索文件名...' : '搜索音色名称或 voice_type...'"
        />
        <input
          ref="materialUploadInputRef"
          class="asset-hidden-file-input"
          type="file"
          multiple
          @change="handleMaterialUploadChange"
        />
        <button class="app-secondary-button" type="button" :disabled="loading" @click="refreshCurrent">
          {{ loading ? '加载中...' : '刷新' }}
        </button>
      </div>
    </div>

    <div class="app-selected-project">
      <template v-if="activeCategory === 'voices' && voiceListScope === 'private'">
        私人音色库 · <strong>当前账号</strong>
        <span class="asset-count">共 {{ filteredVoices.length }} 条</span>
      </template>
      <template v-else-if="activeCategory === 'voices'">
        公共音色库 · <strong>浏览并加入私人库</strong>
        <span class="asset-count">共 {{ filteredVoices.length }} 条</span>
      </template>
      <template v-else-if="selectedWorkflowStage === 'carBundle'">
        车型素材包 · <strong>查看、编辑并复用车辆图片组合</strong>
      </template>
      <template v-else-if="listScope === 'global'">
        公共素材 · <strong>全员可见</strong>
      </template>
      <template v-else-if="activeCategory === 'materials'">
        私有素材 · <strong>当前账号下上传/生成</strong>
      </template>
      <span v-if="activeCategory === 'materials'" class="asset-count">共 {{ assets.length }} 条</span>
    </div>

    <p v-if="jumpHint" class="asset-jump-hint app-muted">{{ jumpHint }}</p>
    <p v-if="errorMessage" class="app-error">{{ errorMessage }}</p>

    <section v-if="showMaterialContextActions" class="asset-context-actions" aria-label="当前功能操作">
      <template v-if="selectedWorkflowStage === 'material'">
        <div>
          <strong>上传素材</strong>
          <span>图片、视频、文案和音频会进入当前账号资产，可选择是否直接发布为公共素材。</span>
        </div>
        <label v-if="hasToken" class="asset-upload-toggle">
          <input v-model="uploadPublishToPublic" type="checkbox" :disabled="loading" />
          <span>上传后发布公共</span>
        </label>
        <button class="app-primary-button" type="button" :disabled="loading" @click="openMaterialUpload">
          {{ loading ? '处理中...' : '上传素材' }}
        </button>
      </template>
      <template v-else-if="selectedWorkflowStage === 'carBundle'">
        <div>
          <strong>车型素材包</strong>
          <span>把车辆图片按外观、内饰、细节和场景整理成一组，视频制作时可直接复用。</span>
        </div>
        <label v-if="hasToken" class="asset-upload-toggle">
          <input v-model="uploadPublishToPublic" type="checkbox" :disabled="loading" />
          <span>创建后发布公共</span>
        </label>
        <button v-if="hasToken" class="app-primary-button" type="button" :disabled="loading" @click="openCarBundleCreator">
          创建车型素材包
        </button>
      </template>
    </section>

    <div
      v-if="activeCategory === 'voices' && voiceListScope === 'private' && !hasToken"
      class="app-empty asset-empty"
    >
      <div class="asset-empty-title">请先登录</div>
      <div class="asset-empty-subtitle">登录后可查看与管理私人音色库（与语音生成页同步）。</div>
      <button class="app-primary-button asset-empty-action" type="button" @click="jumpHint = '请先登录后再查看私人音色库。'">
        去登录
      </button>
    </div>

    <div
      v-else-if="activeCategory === 'voices' && filteredVoices.length === 0"
      class="app-empty asset-empty"
    >
      <div class="asset-empty-title">暂无匹配音色</div>
      <div class="asset-empty-subtitle">可换一个关键词搜索。</div>
    </div>

    <div v-else-if="activeCategory === 'voices'" class="voice-library-list">
      <div v-for="voice in filteredVoices" :key="voice.voiceId" class="voice-library-item">
        <div class="voice-library-main">
          <strong>{{ voice.voiceName }}</strong>
          <p>{{ voice.gender || '未知' }} · {{ voice.scene || '通用口播' }}</p>
          <code>{{ voice.providerVoiceId }}</code>
        </div>
        <div class="asset-row-actions">
          <button class="app-secondary-button" type="button" :disabled="loading" @click="playVoiceSample(voice)">试听</button>
          <template v-if="voiceListScope === 'private'">
            <button class="app-secondary-button" type="button" :disabled="loading" @click="goVoiceTtsWithPreset(voice)">
              去声音生成
            </button>
            <button
              class="app-secondary-button asset-danger"
              type="button"
              :disabled="loading"
              @click="handleRemoveVoiceFromLibrary(voice)"
            >
              删除
            </button>
          </template>
          <template v-else>
            <button
              v-if="hasToken"
              class="app-secondary-button"
              type="button"
              :disabled="loading"
              @click="handleAddVoiceToLibrary(voice)"
            >
              加入私人音色库
            </button>
            <button class="app-secondary-button" type="button" :disabled="loading" @click="goVoiceTtsWithPreset(voice)">
              去声音生成
            </button>
          </template>
        </div>
      </div>
    </div>

    <div v-else-if="assets.length === 0" class="app-empty asset-empty">
      <div class="asset-empty-title">暂无资产</div>
      <div class="asset-empty-subtitle">{{ emptySubtitle }}</div>
      <button
        v-if="listScope === 'private' && !hasToken"
        class="app-primary-button asset-empty-action"
        type="button"
        @click="jumpHint = '请先登录后再查看私有资产。'"
      >
        去登录
      </button>
    </div>

    <div v-else class="app-file-list asset-file-list">
      <div
        v-for="asset in assets"
        :id="assetRowDomId(asset.assetId)"
        :key="asset.assetId"
        class="app-file-item"
        :class="{ 'asset-row-highlight': highlightedId === asset.assetId }"
      >
        <div class="asset-row-main">
          <strong class="asset-row-title">{{ displayAssetTitle(asset) }}</strong>
          <p class="asset-row-meta">
            {{ displayAssetMeta(asset) }}
            <template v-if="asset.createdAt"> · {{ formatTime(asset.createdAt) }}</template>
          </p>
          <div v-if="asset.assetGroup" class="asset-row-tags">
            <span class="asset-group-pill">{{ asset.assetGroup }}</span>
          </div>
          <div class="asset-row-preview">
            <template v-if="isImage(asset)">
              <img :src="resolveFileUrl(asset.thumbnailUrl || asset.fileUrl)" alt="asset preview" />
            </template>
            <template v-else-if="isAudio(asset)">
              <audio :src="resolveFileUrl(asset.fileUrl)" controls preload="none" />
            </template>
            <template v-else-if="isVideo(asset)">
              <video :src="resolveFileUrl(asset.fileUrl)" controls preload="none" />
            </template>
            <template v-else-if="canOpenStructuredPreview(asset)">
              <div class="asset-result-card">
                <div class="asset-result-card-head">
                  <strong>{{ assetInlinePreview(asset).label || resultAssetLabel(asset) }}</strong>
                  <small v-if="assetInlinePreview(asset).meta">{{ assetInlinePreview(asset).meta }}</small>
                </div>
                <p>{{ assetInlinePreview(asset).text || structuredPreviewHint(asset) }}</p>
              </div>
            </template>
            <template v-else>
              <span class="app-muted">此类型建议点击“预览”查看。</span>
            </template>
          </div>
        </div>

        <div class="asset-row-actions">
          <button
            v-if="canOpenStructuredPreview(asset)"
            class="app-secondary-button asset-open"
            type="button"
            :disabled="previewLoading"
            @click="openAssetPreview(asset)"
          >
            {{ previewLoading && previewAsset?.assetId === asset.assetId ? '加载中...' : isCarModelBundleAsset(asset) ? '查看' : '预览' }}
          </button>
          <a v-else class="app-secondary-button asset-open" :href="resolveFileUrl(asset.fileUrl)" target="_blank" rel="noreferrer">预览</a>
          <button class="app-secondary-button" type="button" @click="copyLink(asset)">复制链接</button>
          <button
            v-if="canAddImageToCarBundle(asset)"
            class="app-secondary-button"
            type="button"
            :disabled="loading"
            @click="openCarBundleCreatorWithAsset(asset)"
          >
            加入车型素材包
          </button>
          <button
            v-if="listScope === 'global' && hasToken"
            class="app-secondary-button"
            type="button"
            :disabled="loading"
            @click="handleSave(asset)"
          >
            保存到私有
          </button>
          <button
            v-if="listScope === 'private' && hasToken && !isAlreadyPublishedAsset(asset)"
            class="app-secondary-button"
            type="button"
            :disabled="loading"
            @click="handlePublish(asset)"
          >
            发布到公共
          </button>
          <button
            v-else-if="listScope === 'private' && hasToken && isAlreadyPublishedAsset(asset)"
            class="app-secondary-button asset-status-button"
            type="button"
            disabled
          >
            已发布
          </button>
          <button
            v-if="canEditCarBundle(asset)"
            class="app-secondary-button"
            type="button"
            :disabled="loading"
            @click="openCarBundleEditor(asset)"
          >
            编辑
          </button>
          <button
            v-if="canEditScriptAsset(asset)"
            class="app-secondary-button"
            type="button"
            :disabled="contentEditorSaving"
            @click="openContentEditor(asset)"
          >
            编辑
          </button>
          <button
            v-if="listScope === 'global' && hasToken && canUnpublish(asset)"
            class="app-secondary-button asset-danger"
            type="button"
            :disabled="loading"
            @click="handleUnpublish(asset)"
          >
            下架
          </button>
          <button
            v-if="canManageAssetGroup(asset)"
            class="app-secondary-button"
            type="button"
            :disabled="loading"
            @click="openGroupEditor(asset)"
          >
            分组
          </button>
          <button
            v-if="asset.metadataJson"
            class="app-secondary-button"
            type="button"
            @click="openMetadata(asset)"
          >
            metadata
          </button>
          <button
            v-if="listScope === 'private' && asset.ownerUserId != null"
            class="app-secondary-button asset-danger"
            type="button"
            title="删除该私有资产（不可恢复）"
            :disabled="loading"
            @click="handleDelete(asset)"
          >
            删除
          </button>
        </div>
      </div>
    </div>

    <div v-if="groupModalOpen" class="asset-modal-backdrop" @click.self="closeGroupEditor">
      <div class="asset-modal asset-group-editor">
        <div class="asset-modal-header">
          <strong>手动分类</strong>
          <button class="app-secondary-button" type="button" @click="closeGroupEditor">关闭</button>
        </div>
        <p v-if="groupEditingAsset" class="app-muted asset-modal-subtitle">{{ groupEditingAsset.fileName }}</p>
        <p class="app-muted asset-modal-subtitle">公共资产仅管理员可分类；私有资产仅资产所属用户可分类。</p>
        <label class="asset-group-field">
          <span>分组名称</span>
          <input v-model.trim="groupInput" list="asset-group-presets" maxlength="60" placeholder="例如：汽车素材包" />
          <datalist id="asset-group-presets">
            <option v-for="group in assetGroupOptions" :key="group" :value="group" />
          </datalist>
        </label>
        <div class="asset-group-presets">
          <button
            v-for="group in assetGroupOptions"
            :key="group"
            class="asset-group-preset"
            type="button"
            @click="groupInput = group"
          >
            {{ group }}
          </button>
        </div>
        <div class="asset-modal-actions">
          <button class="app-secondary-button asset-danger" type="button" :disabled="loading || !groupEditingAsset?.assetGroup" @click="handleClearAssetGroup">
            删除分组
          </button>
          <button class="app-primary-button" type="button" :disabled="loading" @click="handleSaveAssetGroup">
            保存分组
          </button>
        </div>
      </div>
    </div>

    <div v-if="metadataModalOpen" class="asset-modal-backdrop" @click.self="closeMetadata">
      <div class="asset-modal">
        <div class="asset-modal-header">
          <strong>metadataJson</strong>
          <button class="app-secondary-button" type="button" @click="closeMetadata">关闭</button>
        </div>
        <p class="app-muted asset-modal-subtitle">{{ metadataTitle }}</p>
        <pre class="asset-modal-code">{{ metadataPretty }}</pre>
        <div class="asset-modal-actions">
          <button class="app-secondary-button" type="button" @click="copyMetadata">复制</button>
          <a class="app-secondary-button asset-open" :href="metadataLink" target="_blank" rel="noreferrer">打开预览</a>
        </div>
      </div>
    </div>

    <div v-if="contentEditorOpen" class="asset-modal-backdrop" @click.self="closeContentEditor">
      <div class="asset-modal asset-content-editor">
        <div class="asset-modal-header">
          <strong>{{ contentEditorTitle }}</strong>
          <button class="app-secondary-button" type="button" :disabled="contentEditorSaving" @click="closeContentEditor">
            关闭
          </button>
        </div>
        <p v-if="contentEditingAsset" class="app-muted asset-modal-subtitle">
          {{ contentEditingAsset.assetGroup || sourceTypeLabel(contentEditingAsset.sourceType) }} · {{ contentEditingAsset.fileName }}
        </p>
        <p v-if="contentEditorError" class="app-error">{{ contentEditorError }}</p>
        <label class="asset-editor-field">
          <span>文件名</span>
          <input v-model.trim="contentEditorFileName" :disabled="contentEditorSaving || contentEditorLoading" maxlength="160" />
        </label>
        <label class="asset-editor-field">
          <span>{{ contentEditorBodyLabel }}</span>
          <textarea
            v-model="contentEditorText"
            :disabled="contentEditorSaving || contentEditorLoading"
            spellcheck="false"
            rows="16"
          />
        </label>
        <label class="asset-editor-field">
          <span>metadataJson</span>
          <textarea
            v-model="contentEditorMetadata"
            :disabled="contentEditorSaving || contentEditorLoading"
            spellcheck="false"
            rows="6"
          />
        </label>
        <div class="asset-modal-actions">
          <button class="app-secondary-button" type="button" :disabled="contentEditorSaving" @click="closeContentEditor">
            取消
          </button>
          <button class="app-primary-button" type="button" :disabled="contentEditorSaving || contentEditorLoading" @click="handleSaveContentEditor">
            {{ contentEditorSaving ? '保存中...' : contentEditorLoading ? '加载中...' : '保存内容' }}
          </button>
        </div>
      </div>
    </div>

    <CarModelBundleBuilder
      v-if="carBundleBuilderOpen"
      :publish="carBundleEditorPublish"
      :editing-asset="carBundleEditingAsset"
      :initial-bundle="carBundleInitialPayload"
      :initial-assets="carBundleInitialAssets"
      @close="closeCarBundleBuilder"
      @created="handleCarBundleCreated"
      @updated="handleCarBundleUpdated"
    />

    <div v-if="previewModalOpen" class="asset-modal-backdrop" @click.self="closeAssetPreview">
      <section class="asset-preview-modal" role="dialog" aria-modal="true" aria-label="资产预览">
        <header class="asset-modal-header asset-preview-head">
          <div>
            <strong>{{ previewAsset ? resultAssetLabel(previewAsset) : '结果预览' }}</strong>
            <p v-if="previewAsset" class="app-muted asset-modal-subtitle">
              {{ displayAssetPreviewSubtitle(previewAsset) }}
            </p>
          </div>
          <button class="app-secondary-button" type="button" @click="closeAssetPreview">关闭</button>
        </header>

        <p v-if="previewError" class="app-error">{{ previewError }}</p>
        <div v-else-if="previewLoading" class="asset-preview-empty">正在加载预览...</div>

        <template v-else>
          <article v-if="previewSourceInfo.visible" class="asset-preview-source-info">
            <div>
              <strong>{{ previewSourceInfo.title || '来源视频' }}</strong>
              <p v-if="previewSourceInfo.url">
                解析视频：
                <a :href="resolveFileUrl(previewSourceInfo.url)" target="_blank" rel="noreferrer">
                  {{ previewSourceInfo.url }}
                </a>
              </p>
              <small>
                <template v-if="previewSourceInfo.sourceTime">视频上传/发布时间：{{ previewSourceInfo.sourceTime }}</template>
                <template v-if="previewSourceInfo.assetTime">
                  {{ previewSourceInfo.sourceTime ? ' · ' : '' }}资产产出时间：{{ previewSourceInfo.assetTime }}
                </template>
              </small>
            </div>
          </article>

          <div v-if="isCarBundlePreview" class="asset-preview-car-bundle">
            <div class="asset-preview-car-head">
              <strong>{{ carBundleTitle }}</strong>
              <span>{{ carBundleImages.length }} 张车型素材</span>
            </div>
            <div class="asset-preview-car-grid">
              <article v-for="item in carBundleImages" :key="`${item.role}-${item.url}`">
                <img :src="resolveFileUrl(item.url)" alt="" />
                <strong>{{ item.label }}</strong>
                <small>{{ item.fileName || item.role }}</small>
              </article>
            </div>
          </div>

          <div v-else-if="previewScriptShots.length" class="asset-preview-storyboard">
            <div class="asset-preview-toolbar">
              <label for="asset-preview-shot-select">查看场景</label>
              <select id="asset-preview-shot-select" v-model.number="previewShotIndex">
                <option :value="-1">全部场景（共 {{ previewScriptShots.length }} 个）</option>
                <option v-for="(shot, index) in previewScriptShots" :key="`${shot.order}-${shot.time}`" :value="index">
                  场景{{ orderLabel(shot.order) }}{{ shot.time ? ` · ${shot.time}` : '' }}
                </option>
              </select>
            </div>
            <div class="asset-preview-table-wrap">
              <table class="asset-preview-table">
                <thead>
                  <tr>
                    <th>场景</th>
                    <th>时间</th>
                    <th>画面</th>
                    <th>台词</th>
                    <th>拍摄技巧</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="shot in displayedPreviewScriptShots" :key="`${shot.order}-${shot.time}`">
                    <td>场景{{ orderLabel(shot.order) }}</td>
                    <td>{{ shot.time || '-' }}</td>
                    <td>
                      <div class="asset-preview-cell-text">{{ shot.page || '-' }}</div>
                      <p v-if="shot.backgroundMusic && shot.backgroundMusic !== '无'" class="asset-preview-bgm">
                        {{ shot.backgroundMusic }}
                      </p>
                    </td>
                    <td>{{ shot.content || '-' }}</td>
                    <td>{{ shot.highlight || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-else-if="previewStoryboardShots.length" class="asset-preview-shot-grid">
            <article v-for="shot in previewStoryboardShots" :key="shot.index" class="asset-preview-shot-card">
              <span>镜头 {{ shot.index }}</span>
              <strong>{{ shot.visual || '画面描述' }}</strong>
              <p>{{ shot.narration || '暂无旁白' }}</p>
              <small>预计 {{ shot.estDurationSec || 0 }} 秒</small>
            </article>
          </div>

          <div v-else-if="isBenchmarkPreview" class="asset-preview-benchmark">
            <article class="asset-preview-video-info">
              <img v-if="benchmarkParse.coverUrl" :src="benchmarkParse.coverUrl" alt="对标视频封面" />
              <div v-else class="asset-preview-cover-placeholder">AI</div>
              <div>
                <strong>{{ benchmarkParse.title || '对标视频信息' }}</strong>
                <p>{{ benchmarkParse.authorName || '对标账号' }}</p>
                <small>
                  <template v-if="benchmarkParse.sourceLabel">解析视频 {{ benchmarkParse.sourceLabel }}</template>
                  <template v-if="benchmarkParse.durationText">{{ benchmarkParse.sourceLabel ? ' · ' : '' }}时长 {{ benchmarkParse.durationText }}</template>
                  <template v-if="benchmarkParse.videoId">{{ benchmarkParse.sourceLabel || benchmarkParse.durationText ? ' · ' : '' }}视频 ID {{ benchmarkParse.videoId }}</template>
                </small>
              </div>
            </article>
            <section class="asset-preview-text-panel">
              <h4>{{ benchmarkTranscriptTitle }}</h4>
              <p>{{ benchmarkTranscriptText || '暂无转写原文。' }}</p>
            </section>
          </div>

          <div v-else-if="rewritePreviewText" class="asset-preview-text-panel">
            <h4>{{ rewritePreviewTitle }}</h4>
            <p>{{ rewritePreviewText }}</p>
          </div>

          <div v-else class="asset-preview-empty">该结果暂无可视化预览。</div>
        </template>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  deleteAsset,
  getAssets,
  getAssetTextContent,
  publishAsset,
  saveAsset,
  unpublishAsset,
  updateAssetGroup,
  updateAssetContent,
  uploadMaterialAsset,
} from '../../services/assetApi'
import type { AssetListScope, AssetListSort } from '../../services/assetApi'
import { API_ORIGIN, getAuthToken } from '../../services/request'
import { getAuthUser, type AuthUser } from '../../services/authSession'
import type { AssetItem, AssetType } from '../../types/assetTypes'
import {
  addVoiceToMyLibrary,
  createVoiceSampleTask,
  getVoiceCatalog,
  getVoicePresets,
  removeVoiceFromMyLibrary,
} from '../../services/voiceApi'
import { getTaskDetail, getTaskResult, newIdempotencyKey } from '../../services/taskApi'
import { rememberSessionTaskId } from '../../services/sessionTaskStore'
import { VOICE_PRESET_SELECTION_KEY, type VoicePresetItem } from '../../types/voiceTypes'
import { taskTypeLabel } from '../../utils/taskDisplay'
import CarModelBundleBuilder from './CarModelBundleBuilder.vue'

const props = defineProps<{
  /** 从任务中心等入口跳转时，高亮并滚动到该资产 */
  highlightAssetId?: number | null
  /**
   * full：保留「素材资产 / 音色库」一级切换。
   * materials | voices：仅展示对应面板（用于资产中心页一级 Tab 内嵌）。
   */
  panelMode?: 'full' | 'materials' | 'voices'
}>()

const emit = defineEmits<{
  highlightConsumed: []
  voiceSelected: []
}>()

interface PreviewScriptShot {
  order: number
  time: string
  content: string
  backgroundMusic: string
  page: string
  highlight: string
}

interface PreviewStoryboardShot {
  index: number
  visual: string
  narration: string
  estDurationSec: number
}

interface AssetInlinePreview {
  label: string
  text: string
  meta?: string
}

interface CarBundleImageItem {
  role?: string
  label?: string
  assetId?: number | null
  url?: string
  fileName?: string
  source?: string
}

interface CarModelBundlePayload {
  bundleType?: string
  assetRole?: string
  brandModel?: string
  color?: string
  notes?: string
  images?: CarBundleImageItem[]
  createdAt?: string
  updatedAt?: string
}

const router = useRouter()

const embedPanel = computed(() => props.panelMode === 'materials' || props.panelMode === 'voices')
const showCategoryTabs = computed(() => !props.panelMode || props.panelMode === 'full')

const headTitle = computed(() => {
  if (props.panelMode === 'materials') return '素材资产'
  if (props.panelMode === 'voices') return voicesHeadTitle.value
  return activeCategory.value === 'materials' ? '素材资产' : voicesHeadTitle.value
})

const headSubtitle = computed(() => {
  if (props.panelMode === 'materials') {
    return '筛选公共或私有素材，预览、复制链接，并管理当前账号下的资产。'
  }
  if (props.panelMode === 'voices') {
    return voicesHeadSubtitle.value
  }
  return activeCategory.value === 'materials'
    ? '筛选公共或私有素材，预览、复制链接，并管理当前账号下的资产。'
    : voicesHeadSubtitle.value
})

const KNOWN_SOURCE_TYPES = [
  'AI_GENERATED',
  'DEMO',
  'MANUAL_CREATED',
  'SYSTEM_MOCK',
  'USER_UPLOAD',
  'SCRIPT_REWRITE',
  'STORYBOARD_GENERATE',
  'VIDEO_PARSE',
  'VIDEO_SCRIPT_ANALYZE',
  'VIDEO_SCRIPT_URL_ANALYZE',
  'DOUYIN_BENCHMARK',
  'DOUYIN_PARSE_TRANSCRIPT',
  'DOUYIN_REWRITE',
  'DOUYIN_TRANSCRIPT',
  'TTS_GENERATE',
  'VOICE_SAMPLE',
  'AVATAR_GENERATE',
  'DIGITAL_HUMAN_GENERATE',
  'SEEDANCE_TEXT_VIDEO',
  'SEEDANCE_FIRST_FRAME_VIDEO',
  'SEEDANCE_FIRST_LAST_FRAME_VIDEO',
  'SEEDANCE_REFERENCE_VIDEO',
  'SEEDANCE_CAR_SALES_VIDEO',
  'TEXT_TO_VIDEO_SEEDANCE_1_5',
  'TEXT_TO_VIDEO_SEEDANCE_2_0',
  'IMAGE_TO_VIDEO_SEEDANCE_1_5',
  'IMAGE_TO_VIDEO_SEEDANCE_2_0',
  'IMAGE_TO_VIDEO_SEEDANCE_2_0_FAST',
] as const

const UNGROUPED_GROUP_KEY = '__ungrouped'
const GROUP_BENCHMARK = '爆款对标'
const GROUP_STORYBOARD = '分镜脚本'
const CAR_MODEL_BUNDLE_GROUP = '汽车素材包'

const WORKFLOW_STAGE_OPTIONS = [
  { key: '', label: '全部功能', sourceTypes: [] },
  {
    key: 'benchmark',
    label: '爆款对标',
    sourceTypes: ['DOUYIN_BENCHMARK', 'DOUYIN_PARSE_TRANSCRIPT', 'DOUYIN_REWRITE', 'DOUYIN_TRANSCRIPT'],
    assetRoles: ['benchmark_json', 'voice_script'],
    assetGroups: [GROUP_BENCHMARK],
    defaultAssetGroup: GROUP_BENCHMARK,
    defaultAssetRole: 'benchmark_json',
  },
  {
    key: 'storyboard',
    label: '分镜生成',
    sourceTypes: ['STORYBOARD_GENERATE', 'VIDEO_SCRIPT_ANALYZE', 'VIDEO_SCRIPT_URL_ANALYZE'],
    assetRoles: ['storyboard_json'],
    assetGroups: [GROUP_STORYBOARD],
    defaultAssetGroup: GROUP_STORYBOARD,
    defaultAssetRole: 'storyboard_json',
  },
  {
    key: 'voice',
    label: '声音生成',
    sourceTypes: ['TTS_GENERATE', 'VOICE_SAMPLE'],
  },
  {
    key: 'digitalHuman',
    label: '数字人',
    sourceTypes: ['AVATAR_GENERATE', 'DIGITAL_HUMAN_GENERATE'],
  },
  {
    key: 'video',
    label: '视频制作',
    sourceTypes: [
      'SEEDANCE_TEXT_VIDEO',
      'SEEDANCE_FIRST_FRAME_VIDEO',
      'SEEDANCE_FIRST_LAST_FRAME_VIDEO',
      'SEEDANCE_REFERENCE_VIDEO',
      'SEEDANCE_CAR_SALES_VIDEO',
      'TEXT_TO_VIDEO_SEEDANCE_1_5',
      'TEXT_TO_VIDEO_SEEDANCE_2_0',
      'IMAGE_TO_VIDEO_SEEDANCE_1_5',
      'IMAGE_TO_VIDEO_SEEDANCE_2_0',
      'IMAGE_TO_VIDEO_SEEDANCE_2_0_FAST',
    ],
  },
  {
    key: 'carBundle',
    label: '车型素材包',
    sourceTypes: [],
  },
  {
    key: 'material',
    label: '上传素材',
    sourceTypes: ['USER_UPLOAD', 'MANUAL_CREATED', 'DEMO', 'AI_GENERATED'],
  },
] as const

type WorkflowStageKey = (typeof WORKFLOW_STAGE_OPTIONS)[number]['key']

const ASSET_GROUP_PRESETS = [
  CAR_MODEL_BUNDLE_GROUP,
  GROUP_BENCHMARK,
  GROUP_STORYBOARD,
  '口播文案',
  '数字人素材',
  '成片视频',
] as const

const assets = ref<AssetItem[]>([])
const voices = ref<VoicePresetItem[]>([])
const loading = ref(false)
const errorMessage = ref('')
const highlightedId = ref<number | null>(null)
const jumpHint = ref('')
const selectedType = ref<'' | AssetType>('')
const selectedSourceType = ref<string>('')
const selectedAssetGroup = ref<string>('')
const selectedWorkflowStage = ref<WorkflowStageKey>('')
const sortKey = ref<AssetListSort>('createdAtDesc')
const keyword = ref('')
const listScope = ref<AssetListScope>('global')
const activeCategory = ref<'materials' | 'voices'>('materials')
const voiceListScope = ref<'private' | 'public'>('private')
const hasToken = ref(false)
const currentUser = ref<AuthUser | null>(null)
const materialUploadInputRef = ref<HTMLInputElement | null>(null)
const uploadPublishToPublic = ref(false)
const carBundleBuilderOpen = ref(false)
const carBundleEditingAsset = ref<AssetItem | null>(null)
const carBundleInitialPayload = ref<CarModelBundlePayload | null>(null)
const carBundleInitialAssets = ref<AssetItem[]>([])
let keywordReloadTimer: number | null = null
let highlightClearTimer: number | null = null

watch(
  () => props.panelMode,
  (m) => {
    if (m === 'materials') {
      activeCategory.value = 'materials'
    } else if (m === 'voices') {
      activeCategory.value = 'voices'
    }
  },
  { immediate: true },
)

const metadataModalOpen = ref(false)
const metadataPretty = ref('')
const metadataTitle = ref('')
const metadataLink = ref('#')
const groupModalOpen = ref(false)
const groupEditingAsset = ref<AssetItem | null>(null)
const groupInput = ref('')
const contentEditorOpen = ref(false)
const contentEditorLoading = ref(false)
const contentEditorSaving = ref(false)
const contentEditorError = ref('')
const contentEditingAsset = ref<AssetItem | null>(null)
const contentEditorFileName = ref('')
const contentEditorText = ref('')
const contentEditorMetadata = ref('')
const previewModalOpen = ref(false)
const previewLoading = ref(false)
const previewError = ref('')
const previewAsset = ref<AssetItem | null>(null)
const previewPayload = ref<unknown>(null)
const previewShotIndex = ref(-1)
const inlinePreviewByAssetId = ref<Record<number, AssetInlinePreview>>({})
let inlinePreviewLoadSeq = 0

const voicesHeadTitle = computed(() =>
  activeCategory.value === 'voices'
    ? voiceListScope.value === 'private'
      ? '私人音色库'
      : '公共音色库'
    : '',
)

const voicesHeadSubtitle = computed(() =>
  voiceListScope.value === 'private'
    ? '与语音生成页列表一致；默认三条可在移除后从公共库再添加。'
    : '浏览全部已启用音色，可加入私人库后在语音合成中使用。',
)

const emptySubtitle = computed(() => {
  if (selectedWorkflowStage.value === 'carBundle') {
    return '当前没有符合条件的车型素材包，可新建后在这里查看和管理。'
  }
  if (listScope.value === 'private' && !hasToken.value) {
    return '请先登录，再查看与当前账号绑定的私有资产。'
  }
  if (listScope.value === 'private') {
    return '当前账号下尚无私有资产，可在各模块上传或生成后查看。'
  }
  return '当前没有符合条件的公共素材。'
})

const sourceTypeOptions = computed(() => {
  const set = new Set<string>(KNOWN_SOURCE_TYPES)
  for (const asset of assets.value) {
    if (asset.sourceType) {
      set.add(asset.sourceType)
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b))
})

const assetGroupOptions = computed(() => {
  const set = new Set<string>(ASSET_GROUP_PRESETS)
  for (const asset of assets.value) {
    const group = (asset.assetGroup || '').trim()
    if (group) {
      set.add(group)
    }
  }
  if (selectedAssetGroup.value && selectedAssetGroup.value !== UNGROUPED_GROUP_KEY) {
    set.add(selectedAssetGroup.value)
  }
  return Array.from(set)
})

const workflowStageOptions = computed(() => WORKFLOW_STAGE_OPTIONS)
const showMaterialContextActions = computed(() =>
  activeCategory.value === 'materials' &&
  (selectedWorkflowStage.value === 'material' || selectedWorkflowStage.value === 'carBundle'),
)
const contentEditorTitle = computed(() => {
  const asset = contentEditingAsset.value
  if (!asset) return '编辑资产内容'
  return isStoryboardAsset(asset) ? '编辑分镜脚本' : '编辑爆款对标文案'
})
const contentEditorBodyLabel = computed(() => {
  const asset = contentEditingAsset.value
  if (!asset) return '内容'
  return isJson(asset) ? 'JSON 内容' : '文案内容'
})

const carBundleEditorPublish = computed(() => {
  const editingAsset = carBundleEditingAsset.value
  if (!editingAsset) {
    return uploadPublishToPublic.value
  }
  return String(editingAsset.visibility || '').toUpperCase() === 'PUBLIC' || uploadPublishToPublic.value
})

const filteredVoices = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  if (!q) {
    return voices.value
  }
  return voices.value.filter((voice) => {
    return (
      voice.voiceName.toLowerCase().includes(q) ||
      voice.providerVoiceId.toLowerCase().includes(q) ||
      (voice.gender || '').toLowerCase().includes(q) ||
      (voice.scene || '').toLowerCase().includes(q)
    )
  })
})

const previewRecord = computed(() => (isRecord(previewPayload.value) ? previewPayload.value : null))

const previewSourceInfo = computed(() => {
  const metadata = previewAsset.value ? parseJsonObject(previewAsset.value.metadataJson) : null
  const parseResult = isRecord(previewRecord.value?.parseResult) ? previewRecord.value.parseResult : null
  const url = firstNonEmptyText(
    stringField(metadata, 'sourceUrl'),
    stringField(metadata, 'originalUrl'),
    stringField(metadata, 'shareUrl'),
    stringField(metadata, 'url'),
    stringField(parseResult, 'sourceUrl'),
    stringField(parseResult, 'shareUrl'),
    stringField(parseResult, 'playUrl'),
    stringField(metadata, 'playUrl'),
  )
  const title = firstNonEmptyText(
    stringField(parseResult, 'title'),
    stringField(metadata, 'sourceTitle'),
    stringField(metadata, 'title'),
    generatedAssetSourceLabel(previewAsset.value),
    url,
  )
  const sourceTime = formatSourceDate(firstNonEmptyText(
    textFromRecord(parseResult, SOURCE_TIME_KEYS),
    textFromRecord(metadata, SOURCE_TIME_KEYS),
    findTextDeep(isRecord(parseResult?.rawData) ? parseResult.rawData : null, SOURCE_TIME_KEYS),
    findTextDeep(previewRecord.value, SOURCE_TIME_KEYS),
  ))
  const assetTime = previewAsset.value?.createdAt ? formatTime(previewAsset.value.createdAt) : ''
  return {
    visible: Boolean(title || url || sourceTime),
    title,
    url,
    sourceTime,
    assetTime,
  }
})

const previewTaskType = computed(() => {
  const asset = previewAsset.value
  const metadata = asset ? parseJsonObject(asset.metadataJson) : null
  const fromMeta = stringField(metadata, 'taskType')
  const fromPayload = stringField(previewRecord.value, 'taskType')
  const sourceType = asset?.sourceType || ''
  if (fromMeta) return fromMeta
  if (fromPayload) return fromPayload
  if (sourceType === 'DOUYIN_BENCHMARK') return 'DOUYIN_PARSE_TRANSCRIPT'
  return sourceType
})

const previewScriptShots = computed<PreviewScriptShot[]>(() => {
  const scripts = previewRecord.value?.scripts
  return Array.isArray(scripts)
    ? scripts.filter(isPreviewScriptShot).sort((a, b) => a.order - b.order)
    : []
})

const displayedPreviewScriptShots = computed(() => {
  const list = previewScriptShots.value
  const index = previewShotIndex.value
  if (index < 0 || index >= list.length) {
    return list
  }
  return [list[index]]
})

const previewStoryboardShots = computed<PreviewStoryboardShot[]>(() => {
  const storyboard = previewRecord.value?.storyboard
  return Array.isArray(storyboard)
    ? storyboard.filter(isPreviewStoryboardShot).sort((a, b) => a.index - b.index)
    : []
})

const benchmarkParse = computed(() => {
  const parseResult = isRecord(previewRecord.value?.parseResult) ? previewRecord.value.parseResult : null
  const metadata = previewAsset.value ? parseJsonObject(previewAsset.value.metadataJson) : null
  const author = isRecord(parseResult?.author) ? parseResult.author : null
  const durationSeconds = numberField(parseResult, 'durationSeconds') || numberField(metadata, 'durationSeconds')
  return {
    coverUrl: stringField(parseResult, 'coverUrl') || stringField(metadata, 'coverUrl'),
    title: stringField(parseResult, 'title') || stringField(metadata, 'title') || stringField(metadata, 'sourceTitle'),
    videoId: stringField(parseResult, 'videoId') || stringField(metadata, 'videoId'),
    authorName: stringField(author, 'nickname') || stringField(metadata, 'authorName'),
    sourceLabel: generatedAssetSourceLabel(previewAsset.value),
    durationText: durationSeconds > 0 ? formatDuration(durationSeconds) : '',
  }
})

const benchmarkTranscriptText = computed(() => {
  const transcript = isRecord(previewRecord.value?.transcriptResult) ? previewRecord.value.transcriptResult : null
  const record = previewRecord.value
  return firstNonEmptyText(
    stringField(transcript, 'originalText'),
    stringField(record, 'originalText'),
    stringField(record, 'rewrittenText'),
    stringField(record, 'translatedText'),
    stringField(record, 'voiceText'),
    stringField(record, 'copywriting'),
    stringField(record, 'script'),
    stringField(record, 'content'),
  )
})

const benchmarkTranscriptTitle = computed(() =>
  String(previewAsset.value?.sourceType || '').trim().toUpperCase().includes('DOUYIN') ? 'ASR 原文案' : '口播文案',
)

const isBenchmarkPreview = computed(() => {
  const type = previewTaskType.value
  return type === 'DOUYIN_PARSE_TRANSCRIPT' || isBenchmarkAsset(previewAsset.value)
})

const isCarBundlePreview = computed(() =>
  stringField(previewRecord.value, 'bundleType') === 'car_model' ||
  stringField(previewRecord.value, 'assetRole') === 'car_model_bundle',
)

const carBundleTitle = computed(() => {
  const brandModel = stringField(previewRecord.value, 'brandModel')
  const color = stringField(previewRecord.value, 'color')
  return [brandModel || '车型素材包', color].filter(Boolean).join(' · ')
})

const carBundleImages = computed(() => {
  const images = previewRecord.value?.images
  if (!Array.isArray(images)) {
    return []
  }
  return images
    .filter(isRecord)
    .map((item) => ({
      role: stringField(item, 'role'),
      label: stringField(item, 'label') || stringField(item, 'role') || '车型图片',
      url: stringField(item, 'url'),
      fileName: stringField(item, 'fileName'),
    }))
    .filter((item) => item.url)
})

const rewritePreviewText = computed(() => {
  const record = previewRecord.value
  return (
    stringField(record, 'rewrittenText') ||
    stringField(record, 'translatedText') ||
    stringField(record, 'originalText')
  )
})

const rewritePreviewTitle = computed(() => {
  const type = previewTaskType.value
  if (type === 'DOUYIN_TRANSCRIPT') return '转写原文'
  if (type === 'DOUYIN_REWRITE') return '改写后文案'
  return '生成文案'
})

onMounted(() => {
  void refreshCurrent()
})

watch([activeCategory, listScope, voiceListScope, selectedType, selectedSourceType, selectedAssetGroup, selectedWorkflowStage, sortKey], () => {
  scheduleReload()
})

watch(keyword, () => {
  scheduleKeywordReload()
})

watch(
  () => props.highlightAssetId,
  async (id) => {
    if (id == null || id <= 0) {
      return
    }
    await nextTick()
    applyHighlightWhenReady(id)
  },
)

onBeforeUnmount(() => {
  clearHighlightTimer()
  clearKeywordReloadTimer()
})

function scheduleReload() {
  if (loading.value) {
    return
  }
  void refreshCurrent()
}

function scheduleKeywordReload() {
  clearKeywordReloadTimer()
  keywordReloadTimer = window.setTimeout(() => {
    keywordReloadTimer = null
    void loadAssets()
  }, 320)
}

async function loadAssets() {
  loading.value = true
  errorMessage.value = ''
  hasToken.value = !!getAuthToken()
  currentUser.value = getAuthUser()
  try {
    if (activeCategory.value === 'voices') {
      if (voiceListScope.value === 'private') {
        if (!getAuthToken()) {
          voices.value = []
          return
        }
        const res = await getVoicePresets()
        voices.value = res.records || []
        return
      }
      const res = await getVoiceCatalog()
      voices.value = res.records || []
      return
    }
    const rows = await getAssets({
      scope: listScope.value,
      assetType: selectedWorkflowStage.value === 'carBundle' ? 'JSON' : selectedType.value || undefined,
      sourceType: selectedWorkflowStage.value ? undefined : selectedSourceType.value || undefined,
      assetGroup: selectedAssetGroup.value || undefined,
      keyword: keyword.value || undefined,
      sort: sortKey.value,
    })
    assets.value = rows.filter(matchesWorkflowStage)
    void loadInlineAssetPreviews()
    await nextTick()
    if (props.highlightAssetId != null && props.highlightAssetId > 0) {
      applyHighlightWhenReady(props.highlightAssetId)
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载资产失败'
  } finally {
    loading.value = false
    await nextTick()
    if (props.highlightAssetId != null && props.highlightAssetId > 0) {
      applyHighlightWhenReady(props.highlightAssetId)
    }
  }
}

async function loadInlineAssetPreviews() {
  const seq = ++inlinePreviewLoadSeq
  const base: Record<number, AssetInlinePreview> = {}
  for (const asset of assets.value) {
    base[asset.assetId] = buildFallbackInlinePreview(asset)
  }
  inlinePreviewByAssetId.value = base

  const previewable = assets.value
    .filter((asset) => canOpenStructuredPreview(asset))
    .slice(0, 36)
  await Promise.all(
    previewable.map(async (asset) => {
      try {
        const text = await getAssetTextContent(asset)
        if (seq !== inlinePreviewLoadSeq) {
          return
        }
        inlinePreviewByAssetId.value = {
          ...inlinePreviewByAssetId.value,
          [asset.assetId]: buildInlinePreviewFromContent(asset, text),
        }
      } catch {
        // Keep metadata fallback if the preview endpoint is unavailable.
      }
    }),
  )
}

function assetInlinePreview(asset: AssetItem) {
  return inlinePreviewByAssetId.value[asset.assetId] || buildFallbackInlinePreview(asset)
}

function buildFallbackInlinePreview(asset: AssetItem): AssetInlinePreview {
  const metadata = parseJsonObject(asset.metadataJson)
  const label = isBenchmarkAsset(asset)
    ? '口播文案'
    : isStoryboardAsset(asset)
      ? '分镜摘要'
      : isCarModelBundleAsset(asset)
        ? '车型素材包'
        : resultAssetBaseLabel(asset)
  const text = compactPreviewText(firstNonEmptyText(
    stringField(metadata, 'previewText'),
    stringField(metadata, 'contentPreview'),
    stringField(metadata, 'summary'),
    stringField(metadata, 'description'),
    stringField(metadata, 'originalText'),
    stringField(metadata, 'content'),
  ))
  return {
    label,
    text,
    meta: inlinePreviewMeta(asset, metadata),
  }
}

function buildInlinePreviewFromContent(asset: AssetItem, rawText: string): AssetInlinePreview {
  const parsed = parseJsonObject(rawText)
  if (!parsed) {
    return {
      ...buildFallbackInlinePreview(asset),
      label: isBenchmarkAsset(asset) ? '口播文案' : '文本内容',
      text: compactPreviewText(rawText),
    }
  }
  if (isCarBundlePayloadRecord(parsed)) {
    const images = Array.isArray(parsed.images) ? parsed.images.filter(isRecord) : []
    const labels = images
      .map((item) => firstNonEmptyText(stringField(item, 'label'), stringField(item, 'role'), stringField(item, 'fileName')))
      .filter(Boolean)
      .slice(0, 8)
    return {
      label: '车型素材包',
      meta: `${images.length} 张图片`,
      text: compactPreviewText([
        firstNonEmptyText(stringField(parsed, 'brandModel'), stringField(parsed, 'title')),
        stringField(parsed, 'color'),
        labels.length ? `包含：${labels.join('、')}` : '',
      ].filter(Boolean).join(' · ')),
    }
  }
  if (isBenchmarkAsset(asset)) {
    const transcript = isRecord(parsed.transcriptResult) ? parsed.transcriptResult : null
    const parseResult = isRecord(parsed.parseResult) ? parsed.parseResult : null
    return {
      label: '口播文案',
      meta: firstNonEmptyText(stringField(parseResult, 'title'), generatedAssetSourceLabel(asset)),
      text: compactPreviewText(firstNonEmptyText(
        stringField(transcript, 'originalText'),
        stringField(parsed, 'originalText'),
        stringField(parsed, 'rewrittenText'),
        stringField(parsed, 'translatedText'),
        stringField(parsed, 'voiceText'),
        stringField(parsed, 'copywriting'),
        stringField(parsed, 'script'),
        stringField(parsed, 'content'),
        findTextDeep(parsed, ['originalText', 'voiceText', 'copywriting', 'scriptText', 'content']),
      )),
    }
  }
  if (isStoryboardAsset(asset)) {
    const shots = firstRecordArray(parsed, ['scripts', 'storyboard', 'shots', 'scenes', 'segments'])
    return {
      label: '分镜摘要',
      meta: shots.length ? `${shots.length} 个场景` : '',
      text: compactPreviewText(storyboardInlineText(shots) || firstNonEmptyText(
        stringField(parsed, 'summary'),
        stringField(parsed, 'description'),
        findTextDeep(parsed, ['visual', 'content', 'narration', 'voiceText']),
      )),
    }
  }
  return {
    ...buildFallbackInlinePreview(asset),
    text: compactPreviewText(firstNonEmptyText(
      stringField(parsed, 'summary'),
      stringField(parsed, 'description'),
      stringField(parsed, 'rewrittenText'),
      stringField(parsed, 'originalText'),
      stringField(parsed, 'content'),
      findTextDeep(parsed, ['summary', 'description', 'content', 'text']),
    )),
  }
}

function inlinePreviewMeta(asset: AssetItem, metadata: Record<string, unknown> | null) {
  if (isCarModelBundleAsset(asset)) {
    return firstNonEmptyText(stringField(metadata, 'brandModel'), stringField(metadata, 'title'))
  }
  if (isBenchmarkAsset(asset) || isStoryboardAsset(asset)) {
    return generatedAssetSourceLabel(asset)
  }
  return ''
}

function firstRecordArray(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (Array.isArray(value)) {
      return value.filter(isRecord)
    }
  }
  return []
}

function storyboardInlineText(shots: Record<string, unknown>[]) {
  return shots
    .slice(0, 4)
    .map((shot, index) => {
      const order = firstNonEmptyText(primitiveText(shot.order), primitiveText(shot.index), String(index + 1))
      const text = firstNonEmptyText(
        stringField(shot, 'page'),
        stringField(shot, 'visual'),
        stringField(shot, 'content'),
        stringField(shot, 'narration'),
        stringField(shot, 'voiceText'),
        stringField(shot, 'title'),
      )
      return text ? `场景${order}: ${text}` : ''
    })
    .filter(Boolean)
    .join('；')
}

function compactPreviewText(value: string, maxLength = 220) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (text.length <= maxLength) {
    return text
  }
  return `${text.slice(0, maxLength)}...`
}

function refreshCurrent() {
  void loadAssets()
}

function openMaterialUpload() {
  if (!hasToken.value) {
    errorMessage.value = '请先登录后再上传素材到私有资产。'
    return
  }
  materialUploadInputRef.value?.click()
}

async function handleMaterialUploadChange(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''
  if (files.length === 0) {
    return
  }
  if (!hasToken.value) {
    errorMessage.value = '请先登录后再上传素材到私有资产。'
    return
  }

  loading.value = true
  errorMessage.value = ''
  jumpHint.value = ''
  const publishAfterUpload = uploadPublishToPublic.value
  const uploadMetadata = currentWritableAssetMetadata()
  let latestAssetId: number | null = null
  try {
    for (const file of files) {
      const uploaded = await uploadMaterialAsset(file, {
        publish: publishAfterUpload,
        metadataJson: uploadMetadata ? JSON.stringify(uploadMetadata) : undefined,
      })
      latestAssetId = uploaded.assetId
    }
    selectedType.value = ''
    selectedSourceType.value = ''
    selectedWorkflowStage.value = 'material'
    keyword.value = ''
    sortKey.value = 'createdAtDesc'
    listScope.value = publishAfterUpload ? 'global' : 'private'
    jumpHint.value =
      files.length > 1
        ? publishAfterUpload
          ? `已上传并发布 ${files.length} 个素材到公共素材。`
          : `已上传 ${files.length} 个素材到私有资产。`
        : publishAfterUpload
          ? '已上传并发布到公共素材。'
          : '已上传到私有资产。'
    await loadAssets()
    if (latestAssetId != null) {
      highlightedId.value = latestAssetId
      clearHighlightTimer()
      await nextTick()
      document.getElementById(assetRowDomId(latestAssetId))?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      highlightClearTimer = window.setTimeout(() => {
        highlightedId.value = null
        jumpHint.value = ''
        highlightClearTimer = null
      }, 6000)
    }
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '上传素材失败'
  } finally {
    loading.value = false
  }
}

function openCarBundleCreator() {
  carBundleEditingAsset.value = null
  carBundleInitialPayload.value = null
  carBundleInitialAssets.value = []
  carBundleBuilderOpen.value = true
}

function openCarBundleCreatorWithAsset(asset: AssetItem) {
  if (!canAddImageToCarBundle(asset)) {
    errorMessage.value = '请先登录后再加入车型素材包'
    return
  }
  carBundleEditingAsset.value = null
  carBundleInitialPayload.value = null
  carBundleInitialAssets.value = [asset]
  carBundleBuilderOpen.value = true
  jumpHint.value = '已带入当前图片，可继续补充其他部位后保存车型素材包。'
}

function closeCarBundleBuilder() {
  carBundleBuilderOpen.value = false
  carBundleEditingAsset.value = null
  carBundleInitialPayload.value = null
  carBundleInitialAssets.value = []
}

async function openCarBundleEditor(asset: AssetItem) {
  if (!canEditCarBundle(asset)) {
    errorMessage.value = '当前账号没有权限编辑该车型素材包'
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    const text = await getAssetTextContent(asset)
    const parsed = parseJsonObject(text)
    if (!parsed || !isCarBundlePayloadRecord(parsed)) {
      throw new Error('该车型素材包内容格式不正确')
    }
    carBundleEditingAsset.value = asset
    carBundleInitialPayload.value = parsed as CarModelBundlePayload
    carBundleInitialAssets.value = []
    carBundleBuilderOpen.value = true
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '加载车型素材包失败'
  } finally {
    loading.value = false
  }
}

async function handleCarBundleCreated(asset: AssetItem) {
  closeCarBundleBuilder()
  selectedType.value = 'JSON'
  selectedSourceType.value = ''
  selectedAssetGroup.value = CAR_MODEL_BUNDLE_GROUP
  selectedWorkflowStage.value = 'material'
  keyword.value = ''
  sortKey.value = 'createdAtDesc'
  listScope.value = uploadPublishToPublic.value ? 'global' : 'private'
  jumpHint.value = '车型素材包已保存，可在视频生成页直接选择。'
  await reloadAndHighlightAsset(asset.assetId)
}

async function handleCarBundleUpdated(asset: AssetItem) {
  closeCarBundleBuilder()
  selectedType.value = 'JSON'
  selectedSourceType.value = ''
  selectedAssetGroup.value = CAR_MODEL_BUNDLE_GROUP
  selectedWorkflowStage.value = 'material'
  keyword.value = ''
  sortKey.value = 'createdAtDesc'
  listScope.value = String(asset.visibility || '').toUpperCase() === 'PUBLIC' ? 'global' : 'private'
  jumpHint.value = '车型素材包已更新。'
  await reloadAndHighlightAsset(asset.assetId)
}

async function reloadAndHighlightAsset(assetId: number) {
  await loadAssets()
  highlightedId.value = assetId
  clearHighlightTimer()
  await nextTick()
  document.getElementById(assetRowDomId(assetId))?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  highlightClearTimer = window.setTimeout(() => {
    highlightedId.value = null
    jumpHint.value = ''
    highlightClearTimer = null
  }, 6000)
}

function selectWorkflowStage(stage: WorkflowStageKey) {
  selectedWorkflowStage.value = stage
  if (stage) {
    selectedSourceType.value = ''
  }
  if (stage === 'carBundle') {
    selectedType.value = 'JSON'
    selectedAssetGroup.value = ''
  } else if (stage === 'material') {
    selectedType.value = ''
    selectedAssetGroup.value = ''
  }
}

function selectSpecificSourceType() {
  if (selectedSourceType.value) {
    selectedWorkflowStage.value = ''
  }
}

function currentWritableAssetGroup() {
  const group = selectedAssetGroup.value.trim()
  if (group && group !== UNGROUPED_GROUP_KEY) {
    return group
  }
  const stage = currentWorkflowStageOption()
  return stage && 'defaultAssetGroup' in stage ? stage.defaultAssetGroup : ''
}

function currentWritableAssetMetadata() {
  const meta: Record<string, string> = {}
  const group = currentWritableAssetGroup()
  const stage = currentWorkflowStageOption()
  const role = stage && 'defaultAssetRole' in stage ? stage.defaultAssetRole : ''
  if (group) {
    meta.assetGroup = group
  }
  if (role) {
    meta.assetRole = role
  }
  return Object.keys(meta).length ? meta : null
}

function currentWorkflowStageOption() {
  return WORKFLOW_STAGE_OPTIONS.find((item) => item.key === selectedWorkflowStage.value)
}

function matchesWorkflowStage(asset: AssetItem) {
  if (!selectedWorkflowStage.value) {
    return true
  }
  if (selectedWorkflowStage.value === 'carBundle') {
    return isCarModelBundleAsset(asset)
  }
  if (
    selectedWorkflowStage.value === 'voice' &&
    asset.assetType === 'AUDIO' &&
    String(asset.sourceType || '').trim().toUpperCase() === 'AI_GENERATED'
  ) {
    return true
  }
  const stage = currentWorkflowStageOption()
  if (!stage || stage.sourceTypes.length === 0) {
    return true
  }
  const role = normalizedAssetRole(asset)
  const assetGroup = String(asset.assetGroup || '').trim()
  const allowedRoles = 'assetRoles' in stage ? Array.from(stage.assetRoles as readonly string[]) : []
  const allowedGroups = 'assetGroups' in stage ? Array.from(stage.assetGroups as readonly string[]) : []
  if (allowedRoles.includes(role) || allowedGroups.includes(assetGroup)) {
    return true
  }
  if (selectedWorkflowStage.value === 'benchmark' && isBenchmarkAsset(asset)) {
    return true
  }
  if (selectedWorkflowStage.value === 'storyboard' && isStoryboardAsset(asset)) {
    return true
  }
  const allowed = Array.from(stage.sourceTypes as readonly string[])
  return allowed.includes(String(asset.sourceType || '').trim().toUpperCase())
}

function sourceTypeLabel(sourceType: string | null | undefined) {
  const key = String(sourceType || '').trim().toUpperCase()
  const labels: Record<string, string> = {
    AI_GENERATED: 'AI 生成',
    DEMO: '演示素材',
    MANUAL_CREATED: '手动创建',
    SYSTEM_MOCK: '系统示例',
    USER_UPLOAD: '上传素材',
    SCRIPT_REWRITE: '文案改写',
    STORYBOARD_GENERATE: '分镜生成',
    VIDEO_PARSE: '视频理解',
    VIDEO_SCRIPT_ANALYZE: '分镜生成',
    VIDEO_SCRIPT_URL_ANALYZE: '链接分镜',
    DOUYIN_BENCHMARK: '爆款对标',
    DOUYIN_PARSE_TRANSCRIPT: '爆款对标转写',
    DOUYIN_REWRITE: '爆款文案改写',
    DOUYIN_TRANSCRIPT: '爆款口播转写',
    TTS_GENERATE: '声音生成',
    VOICE_SAMPLE: '声音试音',
    AVATAR_GENERATE: '数字人形象',
    DIGITAL_HUMAN_GENERATE: '数字人视频',
    SEEDANCE_TEXT_VIDEO: '文生视频',
    SEEDANCE_FIRST_FRAME_VIDEO: '图生视频',
    SEEDANCE_FIRST_LAST_FRAME_VIDEO: '图生视频',
    SEEDANCE_REFERENCE_VIDEO: '图生视频',
    SEEDANCE_CAR_SALES_VIDEO: '汽车销售成片',
    TEXT_TO_VIDEO_SEEDANCE_1_5: '文生视频',
    TEXT_TO_VIDEO_SEEDANCE_2_0: '文生视频',
    IMAGE_TO_VIDEO_SEEDANCE_1_5: '图生视频',
    IMAGE_TO_VIDEO_SEEDANCE_2_0: '图生视频',
    IMAGE_TO_VIDEO_SEEDANCE_2_0_FAST: '图生视频',
  }
  return labels[key] || key || '未知来源'
}

function clearKeywordReloadTimer() {
  if (keywordReloadTimer != null) {
    window.clearTimeout(keywordReloadTimer)
    keywordReloadTimer = null
  }
}

function clearHighlightTimer() {
  if (highlightClearTimer != null) {
    window.clearTimeout(highlightClearTimer)
    highlightClearTimer = null
  }
}

function applyHighlightWhenReady(assetId: number) {
  if (loading.value) {
    return
  }
  const found = assets.value.some((asset) => asset.assetId === assetId)
  if (!found) {
    jumpHint.value = '该资产不在当前列表中，可切换范围或刷新后再试。'
    emit('highlightConsumed')
    return
  }
  jumpHint.value = '已定位到任务产出的素材。'
  highlightedId.value = assetId
  clearHighlightTimer()
  void nextTick().then(() => {
    document.getElementById(assetRowDomId(assetId))?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
  highlightClearTimer = window.setTimeout(() => {
    highlightedId.value = null
    jumpHint.value = ''
    highlightClearTimer = null
    emit('highlightConsumed')
  }, 6000)
}

function assetRowDomId(assetId: number) {
  return `asset-row-${assetId}`
}

function resolveFileUrl(url: string) {
  if (!url) {
    return '#'
  }
  return url.startsWith('http') ? url : `${API_ORIGIN}${url}`
}

function isImage(asset: AssetItem) {
  return asset.assetType === 'IMAGE' || asset.assetType === 'COVER' || (asset.mimeType || '').startsWith('image/')
}

function isAudio(asset: AssetItem) {
  return asset.assetType === 'AUDIO' || (asset.mimeType || '').startsWith('audio/')
}

function isVideo(asset: AssetItem) {
  return asset.assetType === 'VIDEO' || (asset.mimeType || '').startsWith('video/')
}

function isJson(asset: AssetItem) {
  return (
    asset.assetType === 'JSON' ||
    (asset.mimeType || '').toLowerCase().includes('json') ||
    asset.fileName.toLowerCase().endsWith('.json')
  )
}

function isText(asset: AssetItem) {
  return (
    asset.assetType === 'TEXT' ||
    (asset.mimeType || '').toLowerCase().startsWith('text/') ||
    /\.(txt|md)$/i.test(asset.fileName)
  )
}

function canOpenStructuredPreview(asset: AssetItem) {
  return isJson(asset) || isText(asset)
}

function structuredPreviewHint(asset: AssetItem) {
  if (isBenchmarkAsset(asset)) {
    return '点击预览查看爆款对标文案。'
  }
  if (isStoryboardAsset(asset)) {
    return '点击预览查看分镜结构。'
  }
  return '点击预览查看结构化结果。'
}

function isCarModelBundleAsset(asset: AssetItem) {
  if (!isJson(asset)) {
    return false
  }
  const metadata = parseJsonObject(asset.metadataJson)
  return (
    stringField(metadata, 'bundleType') === 'car_model' ||
    stringField(metadata, 'assetRole') === 'car_model_bundle' ||
    stringField(metadata, 'from') === 'car_model_bundle' ||
    asset.assetGroup === CAR_MODEL_BUNDLE_GROUP
  )
}

function isCarBundlePayloadRecord(record: Record<string, unknown>) {
  return stringField(record, 'bundleType') === 'car_model' || stringField(record, 'assetRole') === 'car_model_bundle'
}

function canAddImageToCarBundle(asset: AssetItem) {
  return hasToken.value && isImage(asset) && !isCarModelBundleAsset(asset)
}

function canEditCarBundle(asset: AssetItem) {
  if (!hasToken.value || !currentUser.value || !isCarModelBundleAsset(asset)) {
    return false
  }
  const userId = currentUser.value.userId
  const visibility = String(asset.visibility || '').toUpperCase()
  if (visibility === 'PUBLIC' || listScope.value === 'global') {
    return (
      String(currentUser.value.role || '').toUpperCase() === 'ADMIN' ||
      asset.createdByUserId === userId ||
      asset.ownerUserId === userId
    )
  }
  return asset.ownerUserId === userId
}

function canEditScriptAsset(asset: AssetItem) {
  if (!hasToken.value || !currentUser.value) {
    return false
  }
  if (!(isBenchmarkAsset(asset) || isStoryboardAsset(asset)) || !(isText(asset) || isJson(asset))) {
    return false
  }
  const visibility = String(asset.visibility || '').toUpperCase()
  if (String(currentUser.value.role || '').toUpperCase() === 'ADMIN') {
    return visibility === 'PUBLIC' || visibility === 'PRIVATE'
  }
  return visibility === 'PRIVATE' && asset.ownerUserId != null && asset.ownerUserId === currentUser.value.userId
}

function carBundleAssetTitle(asset: AssetItem) {
  const metadata = parseJsonObject(asset.metadataJson)
  const title = [stringField(metadata, 'brandModel'), stringField(metadata, 'color')].filter(Boolean).join(' · ')
  return title ? `车型素材包：${title}` : asset.fileName
}

function resultAssetLabel(asset: AssetItem) {
  if (isCarModelBundleAsset(asset)) {
    return '车型素材包'
  }
  if (isBenchmarkAsset(asset)) {
    return '爆款对标结果'
  }
  if (isStoryboardAsset(asset)) {
    return '分镜生成结果'
  }
  const type = assetTaskType(asset)
  const label = taskTypeLabel(type)
  if (label && label !== '其他任务' && label !== '暂无') {
    return `${label}结果`
  }
  return asset.sourceType ? `${sourceTypeLabel(asset.sourceType)}结果` : '生成结果'
}

function resultAssetBaseLabel(asset: AssetItem) {
  const label = resultAssetLabel(asset)
  return label.endsWith('结果') ? label.slice(0, -2) : label
}

function generatedAssetSourceLabel(asset: AssetItem | null | undefined) {
  if (!asset) {
    return ''
  }
  const metadata = parseJsonObject(asset.metadataJson)
  return compactSourceLabel(firstNonEmptyText(
    stringField(metadata, 'sourceTitle'),
    stringField(metadata, 'title'),
    stringField(metadata, 'originalFileName'),
    stringField(metadata, 'sourceUrl'),
    stringField(metadata, 'originalUrl'),
    stringField(metadata, 'shareUrl'),
    stringField(metadata, 'url'),
    stringField(metadata, 'videoId'),
    stringField(metadata, 'playUrl'),
  ))
}

function firstNonEmptyText(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const text = String(value || '').trim()
    if (text) {
      return text
    }
  }
  return ''
}

function compactSourceLabel(value: string) {
  const text = value.trim()
  if (text.length <= 56) {
    return text
  }
  return `${text.slice(0, 34)}...${text.slice(-16)}`
}

function displayAssetTitle(asset: AssetItem) {
  if (isCarModelBundleAsset(asset)) {
    return carBundleAssetTitle(asset)
  }
  if (isBenchmarkAsset(asset)) {
    return `爆款对标：${generatedAssetSourceLabel(asset) || asset.fileName}`
  }
  if (isStoryboardAsset(asset)) {
    return `分镜：${generatedAssetSourceLabel(asset) || asset.fileName}`
  }
  if (isJson(asset) && asset.kind === 'GENERATED') {
    const sourceLabel = generatedAssetSourceLabel(asset)
    if (sourceLabel) {
      return `${resultAssetBaseLabel(asset)}：${sourceLabel}`
    }
    return resultAssetLabel(asset)
  }
  return asset.fileName
}

function displayAssetMeta(asset: AssetItem) {
  if (isCarModelBundleAsset(asset)) {
    const visibilityLabel = String(asset.visibility || '').toUpperCase() === 'PUBLIC' ? '公共素材包' : '私有素材包'
    return `${visibilityLabel} · JSON · ${sourceTypeLabel(asset.sourceType)}`
  }
  if (isBenchmarkAsset(asset) || isStoryboardAsset(asset)) {
    const sourceLabel = generatedAssetSourceLabel(asset)
    return [
      '生成结果',
      isBenchmarkAsset(asset) ? '爆款对标' : '分镜生成',
      sourceLabel ? `解析视频：${sourceLabel}` : '',
      asset.assetType,
      formatFileSize(asset.fileSize),
    ].filter(Boolean).join(' · ')
  }
  if (isJson(asset) && asset.kind === 'GENERATED') {
    const type = assetTaskType(asset)
    const label = taskTypeLabel(type)
    const readable = label && label !== '其他任务' && label !== '暂无' ? label : sourceTypeLabel(asset.sourceType)
    const sourceLabel = generatedAssetSourceLabel(asset)
    return [
      '生成结果',
      readable,
      sourceLabel ? `解析视频：${sourceLabel}` : '',
    ].filter(Boolean).join(' · ')
  }
  return `${asset.assetType} · ${formatFileSize(asset.fileSize)} · ${sourceTypeLabel(asset.sourceType)}`
}

function displayAssetPreviewSubtitle(asset: AssetItem) {
  if (isJson(asset) && asset.kind === 'GENERATED') {
    return displayAssetMeta(asset)
  }
  return `${asset.fileName} · ${sourceTypeLabel(asset.sourceType)}`
}

function assetTaskType(asset: AssetItem | null) {
  if (!asset) {
    return ''
  }
  if (isBenchmarkAsset(asset)) {
    return 'DOUYIN_PARSE_TRANSCRIPT'
  }
  if (isStoryboardAsset(asset)) {
    return 'STORYBOARD_GENERATE'
  }
  const metadata = parseJsonObject(asset.metadataJson)
  const fromMeta = stringField(metadata, 'taskType')
  if (fromMeta) {
    return fromMeta
  }
  if (asset.sourceType === 'DOUYIN_BENCHMARK') {
    return 'DOUYIN_PARSE_TRANSCRIPT'
  }
  return asset.sourceType || ''
}

function isAlreadyPublishedAsset(asset: AssetItem) {
  const visibility = String(asset.visibility || '').toUpperCase()
  if (visibility === 'PUBLIC' || asset.publishedAt) {
    return true
  }
  const metadata = parseJsonObject(asset.metadataJson)
  return Boolean(
    metadata?.forkFromAssetId ||
    metadata?.publicAssetId ||
    metadata?.sourcePublicAssetId ||
    metadata?.publicTemplate,
  )
}

function normalizedAssetRole(asset: AssetItem | null | undefined) {
  if (!asset) {
    return ''
  }
  const metadata = parseJsonObject(asset.metadataJson)
  const role = firstNonEmptyText(
    stringField(metadata, 'assetRole'),
    stringField(metadata, 'role'),
  ).trim().toLowerCase()
  if (role === 'benchmark' || role === 'douyin_benchmark') {
    return 'benchmark_json'
  }
  if (role === 'storyboard' || role === 'script_storyboard') {
    return 'storyboard_json'
  }
  return role
}

function isBenchmarkAsset(asset: AssetItem | null | undefined) {
  if (!asset) {
    return false
  }
  const sourceType = String(asset.sourceType || '').trim().toUpperCase()
  const group = String(asset.assetGroup || '').trim()
  const role = normalizedAssetRole(asset)
  const fileName = asset.fileName.toLowerCase()
  return (
    sourceType.includes('DOUYIN') ||
    role === 'benchmark_json' ||
    role === 'voice_script' ||
    group === GROUP_BENCHMARK ||
    (isText(asset) && (fileName.includes('口播文案') || fileName.includes('爆款对标')))
  )
}

function isStoryboardAsset(asset: AssetItem | null | undefined) {
  if (!asset) {
    return false
  }
  const sourceType = String(asset.sourceType || '').trim().toUpperCase()
  const group = String(asset.assetGroup || '').trim()
  const role = normalizedAssetRole(asset)
  const fileName = asset.fileName.toLowerCase()
  return (
    sourceType === 'STORYBOARD_GENERATE' ||
    sourceType === 'VIDEO_SCRIPT_ANALYZE' ||
    sourceType === 'VIDEO_SCRIPT_URL_ANALYZE' ||
    role === 'storyboard_json' ||
    group === GROUP_STORYBOARD ||
    fileName.includes('分镜')
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

function formatTime(value: string) {
  return value.replace('T', ' ').slice(0, 19)
}

async function copyLink(asset: AssetItem) {
  const url = resolveFileUrl(asset.fileUrl)
  try {
    await navigator.clipboard.writeText(url)
    jumpHint.value = '已复制预览链接。'
    window.setTimeout(() => {
      if (jumpHint.value === '已复制预览链接。') {
        jumpHint.value = ''
      }
    }, 2500)
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '复制失败'
  }
}

async function openAssetPreview(asset: AssetItem) {
  previewAsset.value = asset
  previewModalOpen.value = true
  previewLoading.value = true
  previewError.value = ''
  previewPayload.value = null
  previewShotIndex.value = -1
  try {
    const text = await getAssetTextContent(asset)
    const parsed = parseJsonObject(text)
    previewPayload.value = parsed ?? { rewrittenText: text }
  } catch (e) {
    previewError.value = e instanceof Error ? e.message : '加载预览失败'
  } finally {
    previewLoading.value = false
  }
}

function closeAssetPreview() {
  previewModalOpen.value = false
  previewLoading.value = false
  previewError.value = ''
  previewAsset.value = null
  previewPayload.value = null
  previewShotIndex.value = -1
}

async function handleDelete(asset: AssetItem) {
  if (loading.value) {
    return
  }
  const ok = window.confirm(`确认删除该资产？\n${asset.fileName}`)
  if (!ok) {
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    await deleteAsset(asset.assetId)
    assets.value = assets.value.filter((item) => item.assetId !== asset.assetId)
    if (highlightedId.value === asset.assetId) {
      highlightedId.value = null
    }
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '删除失败'
  } finally {
    loading.value = false
  }
}

async function handleSave(asset: AssetItem) {
  if (loading.value) {
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    await saveAsset(asset.assetId)
    jumpHint.value = '已保存到私有资产。'
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '保存失败'
  } finally {
    loading.value = false
  }
}

async function handlePublish(asset: AssetItem) {
  if (loading.value) {
    return
  }
  if (isAlreadyPublishedAsset(asset)) {
    jumpHint.value = '该资产已发布到公共素材，无需重复发布。'
    return
  }
  const ok = window.confirm(`确认发布到公共素材？\n${asset.fileName}`)
  if (!ok) {
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    const updated = await publishAsset(asset.assetId)
    assets.value = assets.value.map((item) => (item.assetId === updated.assetId ? updated : item))
    jumpHint.value = '已发布到公共素材。'
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '发布失败'
  } finally {
    loading.value = false
  }
}

function canUnpublish(asset: AssetItem) {
  return asset.createdByUserId != null
}

async function handleUnpublish(asset: AssetItem) {
  if (loading.value) {
    return
  }
  const ok = window.confirm(`确认下架该公共素材？\n${asset.fileName}`)
  if (!ok) {
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    await unpublishAsset(asset.assetId)
    assets.value = assets.value.filter((item) => item.assetId !== asset.assetId)
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '下架失败'
  } finally {
    loading.value = false
  }
}

function canManageAssetGroup(asset: AssetItem) {
  if (!hasToken.value) {
    return false
  }
  const visibility = String(asset.visibility || '').toUpperCase()
  if (visibility === 'PUBLIC' || listScope.value === 'global') {
    return String(currentUser.value?.role || '').toUpperCase() === 'ADMIN'
  }
  return asset.ownerUserId != null && currentUser.value?.userId != null && asset.ownerUserId === currentUser.value.userId
}

function openGroupEditor(asset: AssetItem) {
  if (!canManageAssetGroup(asset)) {
    errorMessage.value = '当前账号没有权限管理该资产分组'
    return
  }
  groupEditingAsset.value = asset
  groupInput.value = asset.assetGroup || ''
  groupModalOpen.value = true
}

function closeGroupEditor() {
  groupModalOpen.value = false
  groupEditingAsset.value = null
  groupInput.value = ''
}

async function handleSaveAssetGroup() {
  await persistAssetGroup(groupInput.value)
}

async function handleClearAssetGroup() {
  await persistAssetGroup(null)
}

async function persistAssetGroup(assetGroup: string | null) {
  const asset = groupEditingAsset.value
  if (!asset || loading.value) {
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    const updated = await updateAssetGroup(asset.assetId, assetGroup && assetGroup.trim() ? assetGroup.trim() : null)
    assets.value = assets.value.map((item) => (item.assetId === updated.assetId ? updated : item))
    jumpHint.value = updated.assetGroup ? `已归入「${updated.assetGroup}」` : '已清除资产分组'
    closeGroupEditor()
    await loadAssets()
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '资产分组更新失败'
  } finally {
    loading.value = false
  }
}

function openMetadata(asset: AssetItem) {
  metadataModalOpen.value = true
  metadataTitle.value = `${asset.fileName}（${asset.assetType} · ${asset.sourceType}）`
  metadataLink.value = resolveFileUrl(asset.fileUrl)
  metadataPretty.value = prettyJson(asset.metadataJson || '')
}

function closeMetadata() {
  metadataModalOpen.value = false
  metadataPretty.value = ''
  metadataTitle.value = ''
  metadataLink.value = '#'
}

async function openContentEditor(asset: AssetItem) {
  if (!canEditScriptAsset(asset)) {
    errorMessage.value = '当前账号没有权限编辑该资产内容'
    return
  }
  contentEditingAsset.value = asset
  contentEditorFileName.value = asset.fileName
  contentEditorMetadata.value = prettyJson(asset.metadataJson || '{}')
  contentEditorText.value = ''
  contentEditorError.value = ''
  contentEditorOpen.value = true
  contentEditorLoading.value = true
  try {
    const text = await getAssetTextContent(asset)
    contentEditorText.value = isJson(asset) ? prettyJson(text) : text
  } catch (e) {
    contentEditorError.value = e instanceof Error ? e.message : '加载资产内容失败'
  } finally {
    contentEditorLoading.value = false
  }
}

function closeContentEditor() {
  if (contentEditorSaving.value) {
    return
  }
  contentEditorOpen.value = false
  contentEditorLoading.value = false
  contentEditorError.value = ''
  contentEditingAsset.value = null
  contentEditorFileName.value = ''
  contentEditorText.value = ''
  contentEditorMetadata.value = ''
}

async function handleSaveContentEditor() {
  const asset = contentEditingAsset.value
  if (!asset) {
    return
  }
  const content = contentEditorText.value.trim()
  if (!content) {
    contentEditorError.value = '内容不能为空'
    return
  }
  let metadataJson = contentEditorMetadata.value.trim()
  if (metadataJson) {
    try {
      metadataJson = JSON.stringify(JSON.parse(metadataJson))
    } catch {
      contentEditorError.value = 'metadataJson 不是合法 JSON'
      return
    }
  }
  if (isJson(asset)) {
    try {
      JSON.parse(content)
    } catch {
      contentEditorError.value = 'JSON 内容格式不正确'
      return
    }
  }
  contentEditorSaving.value = true
  contentEditorError.value = ''
  try {
    const updated = await updateAssetContent(asset.assetId, {
      fileName: contentEditorFileName.value.trim() || asset.fileName,
      content,
      metadataJson: metadataJson || asset.metadataJson,
    })
    assets.value = assets.value.map((item) => (item.assetId === updated.assetId ? updated : item))
    inlinePreviewByAssetId.value = {
      ...inlinePreviewByAssetId.value,
      [updated.assetId]: buildFallbackInlinePreview(updated),
    }
    contentEditorSaving.value = false
    closeContentEditor()
    void loadInlineAssetPreviews()
  } catch (e) {
    contentEditorError.value = e instanceof Error ? e.message : '保存资产内容失败'
  } finally {
    contentEditorSaving.value = false
  }
}

function prettyJson(input: string) {
  if (!input || !input.trim()) {
    return ''
  }
  try {
    const parsed = JSON.parse(input)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return input
  }
}

function parseJsonObject(value: string | null | undefined): Record<string, unknown> | null {
  if (!value || !value.trim()) {
    return null
  }
  try {
    const parsed = JSON.parse(value) as unknown
    return isRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringField(value: Record<string, unknown> | null | undefined, field: string) {
  const raw = value?.[field]
  return typeof raw === 'string' ? raw : ''
}

function numberField(value: Record<string, unknown> | null | undefined, field: string) {
  const raw = value?.[field]
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0
}

const SOURCE_TIME_KEYS = [
  'publishTime',
  'publishedAt',
  'publishAt',
  'pubdate',
  'pubDate',
  'createTime',
  'createdAt',
  'create_time',
  'uploadTime',
  'uploadedAt',
  'datePublished',
  'timestamp',
]

function textFromRecord(record: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!record) {
    return ''
  }
  for (const key of keys) {
    const value = primitiveText(record[key])
    if (value) {
      return value
    }
  }
  return ''
}

function findTextDeep(value: unknown, keys: string[], depth = 0): string {
  if (depth > 4 || value == null) {
    return ''
  }
  const keySet = new Set(keys.map((key) => key.toLowerCase()))
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 12)) {
      const found = findTextDeep(item, keys, depth + 1)
      if (found) {
        return found
      }
    }
    return ''
  }
  if (!isRecord(value)) {
    return ''
  }
  for (const [key, raw] of Object.entries(value)) {
    if (keySet.has(key.toLowerCase())) {
      const found = primitiveText(raw)
      if (found) {
        return found
      }
    }
  }
  for (const raw of Object.values(value)) {
    const found = findTextDeep(raw, keys, depth + 1)
    if (found) {
      return found
    }
  }
  return ''
}

function primitiveText(value: unknown) {
  if (typeof value === 'string') {
    return value.trim()
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return ''
}

function formatSourceDate(value: string) {
  const text = value.trim()
  if (!text) {
    return ''
  }
  if (/^\d{10,13}$/.test(text)) {
    const numeric = Number(text)
    const millis = text.length === 10 ? numeric * 1000 : numeric
    return formatTime(new Date(millis).toISOString())
  }
  const normalized = text.includes(' ') && !text.includes('T') ? text.replace(' ', 'T') : text
  const date = new Date(normalized)
  if (!Number.isNaN(date.getTime())) {
    return formatTime(date.toISOString())
  }
  return text
}

function isPreviewScriptShot(value: unknown): value is PreviewScriptShot {
  return isRecord(value) && typeof value.order === 'number'
}

function isPreviewStoryboardShot(value: unknown): value is PreviewStoryboardShot {
  return isRecord(value) && typeof value.index === 'number'
}

function orderLabel(order: number) {
  const labels = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
  if (order >= 1 && order <= labels.length) {
    return labels[order - 1]
  }
  return String(order)
}

function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.round(seconds))
  const minute = Math.floor(safe / 60)
  const remain = String(safe % 60).padStart(2, '0')
  return `${minute}:${remain}`
}

async function copyMetadata() {
  if (!metadataPretty.value) {
    return
  }
  try {
    await navigator.clipboard.writeText(metadataPretty.value)
    jumpHint.value = '已复制 metadataJson。'
    window.setTimeout(() => {
      if (jumpHint.value === '已复制 metadataJson。') {
        jumpHint.value = ''
      }
    }, 2500)
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '复制失败'
  }
}

async function goVoiceTtsWithPreset(voice: VoicePresetItem) {
  if (getAuthToken()) {
    loading.value = true
    errorMessage.value = ''
    try {
      await addVoiceToMyLibrary(voice.voiceId)
    } catch (e) {
      errorMessage.value = e instanceof Error ? e.message : '加入私人音色库失败'
      return
    } finally {
      loading.value = false
    }
  }
  window.localStorage.setItem(VOICE_PRESET_SELECTION_KEY, voice.providerVoiceId)
  emit('voiceSelected')
  void router.push({ name: 'voice' })
}

async function handleAddVoiceToLibrary(voice: VoicePresetItem) {
  if (!getAuthToken()) {
    jumpHint.value = '请先登录后再加入私人音色库。'
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    await addVoiceToMyLibrary(voice.voiceId)
    jumpHint.value = `已将「${voice.voiceName}」加入私人音色库。`
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '加入失败'
  } finally {
    loading.value = false
  }
}

async function handleRemoveVoiceFromLibrary(voice: VoicePresetItem) {
  const ok = window.confirm(`从私人音色库移除「${voice.voiceName}」？`)
  if (!ok) {
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    await removeVoiceFromMyLibrary(voice.voiceId)
    voices.value = voices.value.filter((v) => v.voiceId !== voice.voiceId)
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '删除失败'
  } finally {
    loading.value = false
  }
}

async function playVoiceSample(voice: VoicePresetItem) {
  if (loading.value) {
    return
  }
  try {
    let sampleUrl = voice.sampleUrl
    if (!sampleUrl) {
      loading.value = true
      errorMessage.value = ''
      const sampleIdem = newIdempotencyKey()
      const created = await createVoiceSampleTask(voice.voiceId, { idempotencyKey: sampleIdem })
      rememberSessionTaskId(created.taskId)
      const maxAttempts = 40
      for (let i = 0; i < maxAttempts; i++) {
        const detail = await getTaskDetail(created.taskId)
        if (detail.status === 'SUCCESS') {
          const result = await getTaskResult<{ sampleUrl?: string; previewUrl?: string }>(created.taskId)
          sampleUrl = result.result?.sampleUrl || result.result?.previewUrl || ''
          break
        }
        if (['FAILED', 'RETRYABLE', 'CANCELED'].includes(String(detail.status))) {
          throw new Error(detail.errorMessage || '试听任务失败')
        }
        await new Promise((r) => window.setTimeout(r, 900))
      }
      loading.value = false
      if (sampleUrl) {
        const idx = voices.value.findIndex((v) => v.voiceId === voice.voiceId)
        if (idx >= 0) {
          voices.value[idx] = { ...voices.value[idx], sampleUrl }
        }
      }
    }
    if (!sampleUrl) {
      return
    }
    const url = sampleUrl.startsWith('http') ? sampleUrl : `${API_ORIGIN}${sampleUrl}`
    const a = new Audio(url)
    void a.play().catch(() => {})
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '试听失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.asset-center-panel {
  display: grid;
  gap: 14px;
}

.asset-center-head {
  display: grid;
  grid-template-columns: minmax(220px, 0.6fr) minmax(0, 1.4fr);
  gap: 18px;
  align-items: start;
}

.asset-center-head h2 {
  margin: 0 0 6px;
  color: #151a2d;
  font-size: 18px;
  font-weight: 850;
}

.asset-center-head p {
  margin: 0;
  max-width: 360px;
  color: #667085;
  font-size: 13px;
  line-height: 1.6;
}

.asset-header-actions {
  display: grid;
  grid-template-columns: repeat(4, minmax(118px, 1fr)) minmax(180px, 1.2fr) auto;
  align-items: center;
  gap: 10px;
}

.asset-category-segment,
.asset-scope-segment {
  display: inline-flex;
  grid-column: 1 / -1;
  width: fit-content;
  padding: 3px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #eef0f6;
  gap: 2px;
}

.asset-stage-segment {
  display: flex;
  grid-column: 1 / -1;
  flex-wrap: wrap;
  gap: 6px;
}

.asset-stage-btn {
  height: 32px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: #4b5563;
  padding: 0 12px;
  font-size: 12.5px;
  font-weight: 750;
  cursor: pointer;
}

.asset-stage-btn:hover:not(:disabled),
.asset-stage-btn-active {
  border-color: #a79bff;
  background: #f5f3ff;
  color: #5e50df;
}

.asset-category-segment {
  background: #f5f3ff;
  border-color: #e2ddff;
}

.asset-scope-btn {
  border: none;
  border-radius: 8px;
  padding: 6px 14px;
  background: transparent;
  color: #6b7280;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
}

.asset-scope-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.65);
  color: #111827;
}

.asset-scope-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.asset-scope-btn-active {
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  color: #111827;
}

.asset-type-select,
.asset-search {
  width: 100%;
  min-width: 0;
  height: 36px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background-color: #f5f6f8;
  color: #111827;
  outline: none;
}

.asset-type-select {
  padding: 0 12px;
}

.asset-search {
  padding: 0 12px 0 36px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M21 21l-4.35-4.35' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round'/%3E%3Cpath d='M11 19a8 8 0 110-16 8 8 0 010 16z' stroke='%239CA3AF' stroke-width='2'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: 12px 50%;
}

.asset-hidden-file-input {
  display: none;
}

.asset-upload-toggle {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  gap: 7px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  color: #344054;
  padding: 0 12px;
  font-size: 12.5px;
  font-weight: 750;
  white-space: nowrap;
}

.asset-upload-toggle input {
  width: 15px;
  height: 15px;
  accent-color: #635bff;
}

.asset-type-select:focus,
.asset-search:focus {
  border-color: #7c6cff;
  box-shadow: 0 0 0 2px rgba(124, 108, 255, 0.1);
  background-color: #ffffff;
}

.asset-header-actions .app-secondary-button {
  min-width: 68px;
  height: 36px;
  white-space: nowrap;
}

.app-selected-project {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 8px;
  border: 1px solid #e2ddff;
  border-radius: 10px;
  background: #f5f3ff;
  color: #635bff;
  padding: 10px 14px;
}

.asset-count {
  margin-left: 6px;
  color: #6b7280;
  font-size: 12px;
}

.asset-jump-hint {
  margin: 0;
  font-size: 13px;
}

.asset-context-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 12px;
  border: 1px solid #e2ddff;
  border-radius: 10px;
  background: #fbfaff;
  padding: 12px 14px;
}

.asset-context-actions div {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.asset-context-actions strong {
  color: #151a2d;
  font-size: 14px;
  font-weight: 900;
}

.asset-context-actions span {
  color: #667085;
  font-size: 12.5px;
  line-height: 1.5;
}

.asset-file-list,
.asset-empty,
.voice-library-list {
  min-height: 300px;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}

.asset-file-list {
  display: grid;
  gap: 12px;
  padding: 16px;
}

.asset-file-list .app-file-item {
  align-items: flex-start;
  border-radius: 10px;
  background: #fcfcff;
  padding: 18px;
}

.voice-library-list {
  display: grid;
  gap: 12px;
  padding: 16px;
}

.voice-library-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid #edf0f6;
  border-radius: 12px;
  background: #fbfcff;
  padding: 14px 16px;
}

.voice-library-main {
  min-width: 0;
}

.voice-library-main strong {
  display: block;
  color: #151a2d;
  font-size: 15px;
  font-weight: 850;
}

.voice-library-main p {
  margin: 6px 0;
  color: #667085;
  font-size: 13px;
}

.voice-library-main code {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  border-radius: 6px;
  background: #f1efff;
  color: #5e50df;
  padding: 4px 8px;
  text-overflow: ellipsis;
  vertical-align: top;
  white-space: nowrap;
}

.asset-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  padding-top: 80px;
}

.asset-empty-title {
  color: #111827;
  font-size: 16px;
  font-weight: 700;
}

.asset-empty-subtitle {
  color: #9ca3af;
  font-size: 12px;
}

.asset-empty-action {
  margin-top: 12px;
}

.asset-row-main {
  flex: 1;
  min-width: 0;
}

.asset-row-title {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-row-meta {
  margin: 6px 0 10px;
  color: #6b7280;
  font-size: 13px;
}

.asset-row-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: -2px 0 10px;
}

.asset-group-pill {
  display: inline-flex;
  min-height: 24px;
  align-items: center;
  border: 1px solid #d8d2ff;
  border-radius: 999px;
  background: #f5f3ff;
  color: #5e50df;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 800;
}

.asset-row-actions {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.asset-row-preview img {
  width: 240px;
  max-width: 100%;
  height: auto;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 10px;
}

.asset-row-preview audio,
.asset-row-preview video {
  width: 320px;
  max-width: 100%;
}

.asset-result-card {
  display: grid;
  gap: 6px;
  width: min(680px, 100%);
  border: 1px solid #e6e8f2;
  border-radius: 10px;
  background: #ffffff;
  padding: 12px 14px;
}

.asset-result-card-head {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.asset-result-card-head strong {
  color: #151a2d;
  font-size: 14px;
}

.asset-result-card-head small {
  flex: 0 0 auto;
  color: #667085;
  font-size: 12px;
}

.asset-result-card p {
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  color: #475467;
  font-size: 13px;
  line-height: 1.65;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
}

.asset-open {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}

.asset-status-button:disabled {
  border-color: #bbf7d0;
  background: #f0fdf4;
  color: #15803d;
  opacity: 1;
}

.asset-danger {
  border-color: rgba(239, 68, 68, 0.45);
  color: #ef4444;
}

.asset-row-highlight {
  outline: 2px solid #7c6cff;
  outline-offset: 2px;
  background: rgba(124, 108, 255, 0.08);
}

.asset-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(2, 6, 23, 0.7);
  padding: 18px;
}

.asset-modal {
  width: min(920px, 100%);
  max-height: min(78vh, 720px);
  overflow: auto;
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.92);
  padding: 14px 14px 12px;
}

.asset-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: rgba(226, 232, 240, 0.95);
}

.asset-modal-subtitle {
  margin: 8px 0 10px;
  font-size: 13px;
}

.asset-modal-code {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 12px;
  background: rgba(2, 6, 23, 0.55);
  color: rgba(226, 232, 240, 0.95);
  padding: 12px;
  font-size: 12px;
  line-height: 1.5;
}

.asset-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}

.asset-group-editor {
  width: min(560px, 100%);
}

.asset-content-editor {
  width: min(920px, calc(100vw - 32px));
  max-height: calc(100vh - 64px);
}

.asset-group-field {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.asset-group-field span {
  color: rgba(226, 232, 240, 0.95);
  font-size: 13px;
  font-weight: 850;
}

.asset-group-field input {
  height: 40px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.94);
  color: #111827;
  padding: 0 12px;
  outline: none;
}

.asset-group-field input:focus {
  border-color: #a79bff;
  box-shadow: 0 0 0 3px rgba(124, 108, 255, 0.18);
}

.asset-editor-field {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.asset-editor-field span {
  color: rgba(226, 232, 240, 0.95);
  font-size: 13px;
  font-weight: 850;
}

.asset-editor-field input,
.asset-editor-field textarea {
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.94);
  color: #111827;
  padding: 10px 12px;
  outline: none;
  font: inherit;
  line-height: 1.55;
}

.asset-editor-field textarea {
  min-height: 140px;
  resize: vertical;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.asset-editor-field input:focus,
.asset-editor-field textarea:focus {
  border-color: #a79bff;
  box-shadow: 0 0 0 3px rgba(124, 108, 255, 0.18);
}

.asset-group-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.asset-group-preset {
  min-height: 30px;
  border: 1px solid rgba(167, 155, 255, 0.5);
  border-radius: 999px;
  background: rgba(245, 243, 255, 0.12);
  color: rgba(237, 233, 254, 0.95);
  padding: 0 12px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.asset-group-preset:hover {
  background: rgba(245, 243, 255, 0.22);
}

.asset-preview-modal {
  width: min(1100px, 100%);
  max-height: min(86vh, 820px);
  overflow: auto;
  border: 1px solid #e6e8f2;
  border-radius: 14px;
  background: #ffffff;
  padding: 18px;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.28);
}

.asset-preview-head {
  align-items: flex-start;
  color: #111827;
}

.asset-preview-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.asset-preview-toolbar label {
  color: #475467;
  font-size: 13px;
  font-weight: 800;
}

.asset-preview-toolbar select {
  min-width: 260px;
  border: 1px solid #dfe3ee;
  border-radius: 10px;
  background: #fff;
  padding: 10px 12px;
  color: #111827;
  font-weight: 700;
}

.asset-preview-table-wrap {
  overflow: auto;
  border: 1px solid #edf0f6;
  border-radius: 12px;
}

.asset-preview-table {
  width: 100%;
  min-width: 840px;
  border-collapse: collapse;
  background: #fff;
}

.asset-preview-table th {
  background: #f8f9fd;
  color: #475467;
  padding: 12px;
  text-align: left;
  font-size: 12px;
}

.asset-preview-table td {
  border-top: 1px solid #edf0f6;
  padding: 12px;
  color: #1f2937;
  vertical-align: top;
  font-size: 13px;
  line-height: 1.55;
}

.asset-preview-cell-text {
  min-width: 180px;
}

.asset-preview-bgm {
  margin: 8px 0 0;
  color: #7c6cff;
  font-size: 12px;
}

.asset-preview-shot-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.asset-preview-shot-card {
  border: 1px solid #edf0f6;
  border-radius: 12px;
  background: #fbfcff;
  padding: 14px;
}

.asset-preview-shot-card span,
.asset-preview-shot-card small {
  color: #667085;
  font-size: 12px;
}

.asset-preview-shot-card strong {
  display: block;
  margin: 8px 0;
  color: #111827;
  font-size: 15px;
}

.asset-preview-shot-card p {
  margin: 0 0 10px;
  color: #344054;
  font-size: 13px;
  line-height: 1.6;
}

.asset-preview-benchmark {
  display: grid;
  gap: 14px;
}

.asset-preview-source-info {
  margin-bottom: 14px;
  border: 1px solid #edf0f6;
  border-radius: 12px;
  background: #fbfcff;
  padding: 12px 14px;
}

.asset-preview-source-info strong {
  display: block;
  overflow: hidden;
  color: #111827;
  font-size: 15px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-preview-source-info p,
.asset-preview-source-info small {
  display: block;
  margin: 6px 0 0;
  overflow: hidden;
  color: #667085;
  font-size: 13px;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-preview-source-info a {
  color: #4f46e5;
  font-weight: 800;
  text-decoration: none;
}

.asset-preview-source-info a:hover {
  text-decoration: underline;
}

.asset-preview-video-info {
  display: grid;
  grid-template-columns: 168px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  border: 1px solid #edf0f6;
  border-radius: 12px;
  background: #fbfcff;
  padding: 12px;
}

.asset-preview-video-info img,
.asset-preview-cover-placeholder {
  width: 168px;
  height: 94px;
  border-radius: 10px;
  object-fit: cover;
  background: #eef0ff;
}

.asset-preview-cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6d5dfc;
  font-weight: 900;
}

.asset-preview-video-info strong {
  display: block;
  color: #111827;
  font-size: 16px;
}

.asset-preview-video-info p,
.asset-preview-video-info small {
  color: #667085;
  line-height: 1.6;
}

.asset-preview-text-panel {
  border: 1px solid #edf0f6;
  border-radius: 12px;
  background: #fbfcff;
  padding: 14px;
}

.asset-preview-text-panel h4 {
  margin: 0 0 10px;
  color: #111827;
  font-size: 15px;
}

.asset-preview-text-panel p {
  margin: 0;
  white-space: pre-wrap;
  color: #1f2937;
  font-size: 14px;
  line-height: 1.75;
}

.asset-preview-empty {
  display: flex;
  min-height: 220px;
  align-items: center;
  justify-content: center;
  border: 1px dashed #dfe3ee;
  border-radius: 12px;
  background: #fbfcff;
  color: #667085;
  font-weight: 700;
}

.asset-preview-car-bundle {
  display: grid;
  gap: 14px;
}

.asset-preview-car-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.asset-preview-car-head strong {
  color: #111827;
  font-size: 16px;
  font-weight: 900;
}

.asset-preview-car-head span {
  color: #667085;
  font-size: 13px;
  font-weight: 800;
}

.asset-preview-car-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.asset-preview-car-grid article {
  display: grid;
  gap: 6px;
  border: 1px solid #edf0f6;
  border-radius: 10px;
  background: #fbfcff;
  padding: 10px;
}

.asset-preview-car-grid img {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 8px;
  object-fit: cover;
  background: #f1f3f8;
}

.asset-preview-car-grid strong {
  color: #344054;
  font-size: 13px;
  font-weight: 900;
}

.asset-preview-car-grid small {
  overflow: hidden;
  color: #667085;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 980px) {
  .asset-center-head {
    grid-template-columns: 1fr;
  }

  .asset-header-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .asset-header-actions .app-secondary-button {
    width: 100%;
  }

  .asset-context-actions {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .asset-header-actions {
    grid-template-columns: minmax(0, 1fr);
  }

  .asset-scope-segment,
  .asset-category-segment,
  .app-selected-project {
    width: 100%;
  }

  .asset-scope-btn {
    flex: 1 1 0;
  }

  .asset-row-actions {
    align-items: stretch;
    width: 100%;
  }

  .voice-library-item {
    align-items: stretch;
    flex-direction: column;
  }

  .asset-preview-toolbar,
  .asset-preview-video-info {
    align-items: stretch;
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .asset-preview-toolbar select,
  .asset-preview-video-info img,
  .asset-preview-cover-placeholder {
    width: 100%;
  }
}

.asset-center-panel--embed .asset-center-head h2 {
  font-size: 17px;
}

.asset-center-panel--embed .asset-center-head p {
  font-size: 12px;
}
</style>
