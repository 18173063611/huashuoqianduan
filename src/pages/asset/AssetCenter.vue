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
            :class="{ 'asset-scope-btn-active': listScope === 'all' }"
            role="tab"
            :aria-selected="listScope === 'all'"
            :disabled="loading"
            @click="listScope = 'all'"
          >
            全部素材
          </button>
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

        <div v-if="activeCategory === 'materials'" class="asset-stage-segment" role="tablist" aria-label="资产类型">
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
          v-if="showAssetTypeSelect"
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
          v-if="showAssetSourceSelect"
          v-model="selectedSourceType"
          class="asset-type-select"
          :disabled="loading"
          @change="selectSpecificSourceType"
        >
          <option value="">全部来源</option>
          <option v-for="item in sourceTypeOptions" :key="item" :value="item">{{ sourceTypeLabel(item) }}</option>
        </select>
        <select
          v-if="showAssetGroupSelect"
          v-model="selectedAssetGroup"
          class="asset-type-select"
          :disabled="loading"
        >
          <option value="">全部分组</option>
          <option :value="UNGROUPED_GROUP_KEY">未分组</option>
          <option v-for="group in assetGroupOptions" :key="group" :value="group">{{ group }}</option>
        </select>
        <select
          v-if="activeCategory === 'materials' && listScope !== 'private'"
          v-model="selectedPublicAssetProvider"
          class="asset-type-select"
          :disabled="loading"
        >
          <option value="all">全部公共来源</option>
          <option value="developer">官方资产</option>
          <option value="user">用户公共</option>
        </select>
        <select v-if="activeCategory === 'materials'" v-model="sortKey" class="asset-type-select" :disabled="loading">
          <option value="createdAtDesc">按时间（新到旧）</option>
          <option value="createdAtAsc">按时间（旧到新）</option>
          <option value="fileNameAsc">按文件名（A到Z）</option>
          <option value="fileSizeDesc">按大小（大到小）</option>
        </select>
        <div v-if="activeCategory === 'materials'" class="asset-view-segment" role="tablist" aria-label="资产视图">
          <button
            type="button"
            :class="{ active: assetViewMode === 'grid' }"
            :disabled="loading"
            @click="assetViewMode = 'grid'"
          >
            网格
          </button>
          <button
            type="button"
            :class="{ active: assetViewMode === 'list' }"
            :disabled="loading"
            @click="assetViewMode = 'list'"
          >
            列表
          </button>
        </div>
        <input
          v-model="keyword"
          class="asset-search"
          type="search"
          :disabled="loading"
          :placeholder="activeCategory === 'materials' ? '搜索资产名、车型、风格、数字人或整合包...' : '搜索音色名称或 voice_type...'"
        />
        <input
          ref="materialUploadInputRef"
          class="asset-hidden-file-input"
          type="file"
          multiple
          :accept="materialUploadAccept"
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
      <template v-else-if="selectedWorkflowStage === 'sceneBundle'">
        场景图片 · <strong>查看并复用汽车销售背景图</strong>
      </template>
      <template v-else-if="activeCategory === 'materials'">
        {{ selectedAssetKindLabel }} · <strong>{{ assetKindStatusText }}</strong>
      </template>
      <template v-else-if="listScope === 'global'">
        公共素材 · <strong>全员可见</strong>
      </template>
      <span v-if="activeCategory === 'materials'" class="asset-count">
        {{ materialAssetCountLabel }}
      </span>
    </div>

    <p v-if="jumpHint" class="asset-jump-hint app-muted">{{ jumpHint }}</p>
    <p v-if="errorMessage && (activeCategory !== 'materials' || assets.length > 0)" class="app-error">
      {{ errorMessage }}
    </p>

    <section v-if="showMaterialContextActions" class="asset-context-actions" aria-label="当前功能操作">
      <template v-if="showMaterialUploadAction">
        <div>
          <strong>上传{{ materialUploadTargetLabel }}</strong>
          <span>{{ materialUploadHint }}</span>
        </div>
        <button class="app-primary-button" type="button" :disabled="loading" @click="openMaterialUpload">
          {{ loading ? '处理中...' : `上传${materialUploadTargetLabel}` }}
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

    <div v-else-if="activeCategory === 'materials' && loading && assets.length === 0" class="app-empty asset-empty">
      <div class="asset-empty-title">正在加载资产</div>
      <div class="asset-empty-subtitle">正在获取当前筛选下的最近素材，请稍候。</div>
    </div>

    <div v-else-if="activeCategory === 'materials' && errorMessage && assets.length === 0" class="app-empty asset-empty">
      <div class="asset-empty-title">资产加载失败</div>
      <div class="asset-empty-subtitle">{{ errorMessage }}</div>
      <button class="app-primary-button asset-empty-action" type="button" :disabled="loading" @click="refreshCurrent">
        重试
      </button>
    </div>

    <div v-else-if="isAvatarAssetMode && filteredAssetAvatars.length === 0" class="app-empty asset-empty">
      <div class="asset-empty-title">暂无数字人资产</div>
      <div class="asset-empty-subtitle">当前筛选下没有数字人形象，可切换到全部素材或公共素材查看公共推荐。</div>
    </div>

    <div v-else-if="!isAvatarAssetMode && assets.length === 0" class="app-empty asset-empty">
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

    <div v-else-if="isAvatarAssetMode" class="avatar-asset-list">
      <article
        v-for="avatar in filteredAssetAvatars"
        :id="avatarRowDomId(avatar.avatarId)"
        :key="avatar.avatarId"
        class="avatar-asset-card"
        :class="{ 'asset-row-highlight': highlightedAvatarId === avatar.avatarId }"
      >
        <div class="avatar-asset-cover">
          <img v-if="avatar.previewUrl" :src="resolveFileUrl(avatar.previewUrl)" :alt="avatar.avatarName" />
          <span v-else>数字人</span>
        </div>
        <div class="avatar-asset-body">
          <strong>{{ avatar.avatarName }}</strong>
          <p>{{ avatarSourceLabel(avatar) }} · {{ avatarVisibilityLabel(avatar) }}</p>
          <div class="asset-row-tags">
            <span class="asset-group-pill asset-business-pill">数字人资产</span>
            <span class="asset-group-pill" :class="avatarVisibilityPillClass(avatar)">
              {{ avatarVisibilityLabel(avatar) }}
            </span>
            <span v-if="avatar.defaultAvatar" class="asset-group-pill">默认形象</span>
          </div>
        </div>
        <div class="avatar-asset-actions">
          <button
            class="app-secondary-button"
            type="button"
            :disabled="loading || !avatar.previewUrl"
            @click="copyAvatarLink(avatar)"
          >
            复制链接
          </button>
          <button
            v-if="canDeleteAvatar(avatar)"
            class="app-secondary-button asset-danger"
            type="button"
            :disabled="loading"
            @click="handleDeleteAvatar(avatar)"
          >
            删除
          </button>
        </div>
      </article>
    </div>

    <div v-else class="app-file-list asset-file-list" :class="`asset-file-list--${assetViewMode}`">
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
          <div class="asset-row-tags">
            <span class="asset-group-pill asset-business-pill">{{ assetBusinessLabel(asset) }}</span>
            <span class="asset-group-pill" :class="publicAssetProviderPillClass(asset)">
              {{ publicAssetProviderLabel(asset) }}
            </span>
            <span v-if="asset.assetGroup" class="asset-group-pill">{{ asset.assetGroup }}</span>
            <span
              v-for="badge in developerAssetFeatureBadges(asset)"
              :key="badge"
              class="asset-group-pill asset-developer-feature-pill"
            >
              {{ badge }}
            </span>
          </div>
          <div class="asset-row-preview">
            <template v-if="isImage(asset)">
              <img :src="resolveFileUrl(asset.thumbnailUrl || asset.fileUrl)" alt="asset preview" />
            </template>
            <template v-else-if="isAudio(asset)">
              <audio :src="resolveFileUrl(asset.fileUrl)" controls preload="none" />
            </template>
            <template v-else-if="isVideo(asset)">
              <div class="asset-video-thumb">
                <img :src="videoPosterUrl(asset)" alt="视频封面" />
                <span class="asset-video-play" aria-hidden="true">▶</span>
                <span class="asset-video-cover-badge">{{ videoPosterSourceLabel(asset) }}</span>
                <span v-if="videoDurationText(asset)" class="asset-video-duration">{{ videoDurationText(asset) }}</span>
              </div>
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
            v-if="canOpenAssetPreview(asset)"
            class="app-secondary-button asset-open"
            type="button"
            :disabled="previewLoading"
            @click="openAssetPreview(asset)"
          >
            {{ previewLoading && previewAsset?.assetId === asset.assetId ? '加载中...' : assetPreviewActionLabel(asset) }}
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
            v-if="canSavePublicAsset(asset)"
            class="app-secondary-button"
            type="button"
            :disabled="loading"
            @click="handleSave(asset)"
          >
            保存到私有
          </button>
          <button
            v-if="canPublishPrivateAsset(asset)"
            class="app-secondary-button"
            type="button"
            :disabled="loading"
            @click="handlePublish(asset)"
          >
            发布到公共
          </button>
          <button
            v-else-if="canShowAlreadyPublished(asset)"
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
            v-if="canUnpublish(asset)"
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
            v-if="canDeletePrivateAsset(asset)"
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

    <div v-if="activeCategory === 'materials' && !isAvatarAssetMode && assets.length > 0" class="asset-pagination-row">
      <button
        v-if="assetHasMore"
        class="app-secondary-button"
        type="button"
        :disabled="loading || assetLoadingMore"
        @click="loadMoreAssets"
      >
        {{ assetLoadingMore ? '加载中...' : '加载更多' }}
      </button>
      <span v-else class="asset-pagination-done">已显示当前筛选下的最近 {{ assets.length }} 条资产</span>
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

          <div v-if="previewAsset && isVideo(previewAsset)" class="asset-preview-video-player">
            <video
              :src="resolveFileUrl(previewAsset.fileUrl)"
              :poster="videoPosterUrl(previewAsset) || undefined"
              controls
              preload="metadata"
              playsinline
              @loadedmetadata="handleVideoMetadataLoaded(previewAsset, $event)"
            />
            <div class="asset-preview-video-meta">
              <strong>{{ previewAsset.fileName }}</strong>
              <small>{{ displayAssetMeta(previewAsset) }}</small>
              <small v-if="videoDurationText(previewAsset)">时长 {{ videoDurationText(previewAsset) }}</small>
              <div class="asset-video-cover-tools">
                <span>{{ videoPosterSourceLabel(previewAsset) }}</span>
                <label>
                  <input
                    type="file"
                    accept="image/*"
                    :disabled="videoCoverUploadingAssetId === previewAsset.assetId"
                    @change="handleVideoCoverSelected(previewAsset, $event)"
                  />
                  {{ videoCoverUploadingAssetId === previewAsset.assetId ? '保存中...' : '选择封面' }}
                </label>
                <button
                  v-if="localVideoCoverUrl(previewAsset)"
                  type="button"
                  @click="clearVideoCoverOverride(previewAsset)"
                >
                  恢复系统封面
                </button>
              </div>
            </div>
          </div>

          <div v-else-if="isCarBundlePreview" class="asset-preview-car-bundle">
            <div class="asset-preview-car-head">
              <strong>{{ carBundleTitle }}</strong>
              <span>{{ carBundleImages.length }} 张素材</span>
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
import { useRoute, useRouter } from 'vue-router'
import {
  deleteAsset,
  getAssets,
  getAssetDetail,
  getAssetTextContent,
  publishAsset,
  saveAsset,
  unpublishAsset,
  updateAssetCover,
  updateAssetGroup,
  updateAssetContent,
  uploadMaterialAsset,
} from '../../services/assetApi'
import type { AssetListScope, AssetListSort } from '../../services/assetApi'
import { deleteAvatar, getAvatars, uploadAvatar } from '../../services/avatarApi'
import { API_ORIGIN, getAuthToken } from '../../services/request'
import carPlaceholderImage from '../../assets/car.png'
import { getAuthUser, type AuthUser } from '../../services/authSession'
import type { AssetItem, AssetType } from '../../types/assetTypes'
import type { AvatarItem } from '../../types/avatarTypes'
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
import {
  assetWorkflowDisplayMeta as assetWorkflowDisplayMetaShared,
  assetWorkflowDisplayTitle as assetWorkflowDisplayTitleShared,
  isBenchmarkAsset as isBenchmarkAssetShared,
  isAssetIntegrationPackageAsset as isAssetIntegrationPackageAssetShared,
  isCarModelBundleAsset as isCarModelBundleAssetShared,
  isSceneMaterialBundleAsset as isSceneMaterialBundleAssetShared,
  isStoryboardAsset as isStoryboardAssetShared,
  matchesAssetWorkflowStage,
  normalizedAssetRole as normalizedAssetRoleShared,
  developerAssetFeatureBadges,
  publicAssetProviderKind,
  publicAssetProviderLabel,
  sourceTypeLabel as sourceTypeLabelShared,
  SCENE_MATERIAL_BUNDLE_GROUP,
  type AssetWorkflowStageKey,
} from '../../utils/assetWorkflow'
import CarModelBundleBuilder from './CarModelBundleBuilder.vue'

const props = defineProps<{
  /** 从任务中心等入口跳转时，高亮并滚动到该资产 */
  highlightAssetId?: number | null
  /**
   * full：保留「素材资产 / 音色库」一级切换。
   * materials | voices：仅展示对应面板（用于资产中心页一级 Tab 内嵌）。
   */
  panelMode?: 'full' | 'materials' | 'voices'
  /** pet：仅查询和上传宠物创作资产；缺省保持原资产中心行为。 */
  businessDomain?: 'pet'
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

const route = useRoute()
const router = useRouter()

const embedPanel = computed(() => props.panelMode === 'materials' || props.panelMode === 'voices')
const showCategoryTabs = computed(() => !props.panelMode || props.panelMode === 'full')
const isPetAssetMode = computed(() => props.businessDomain === 'pet')

const headTitle = computed(() => {
  if (isPetAssetMode.value) return '宠物素材资产'
  if (props.panelMode === 'materials') return '素材资产'
  if (props.panelMode === 'voices') return voicesHeadTitle.value
  return activeCategory.value === 'materials' ? '素材资产' : voicesHeadTitle.value
})

const headSubtitle = computed(() => {
  if (isPetAssetMode.value) {
    return '只展示宠物创作相关图片、视频、音频和参考素材；上传内容会自动进入宠物资产域。'
  }
  if (props.panelMode === 'materials') {
    return '筛选全部、公共或私有素材，预览、复制链接，并管理当前账号下的资产。'
  }
  if (props.panelMode === 'voices') {
    return voicesHeadSubtitle.value
  }
  return activeCategory.value === 'materials'
    ? '筛选全部、公共或私有素材，预览、复制链接，并管理当前账号下的资产。'
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
  'PET_REFERENCE_IMAGE',
  'PET_REFERENCE_VIDEO',
  'PET_BACKGROUND_GENERATE',
  'PET_IMAGE_GENERATE',
  'PET_VIDEO_RESULT',
  'PET_SCRIPT_GENERATE',
  'PET_STORYBOARD_GENERATE',
  'TEXT_TO_VIDEO_SEEDANCE_1_5',
  'TEXT_TO_VIDEO_SEEDANCE_2_0',
  'IMAGE_TO_VIDEO_SEEDANCE_1_5',
  'IMAGE_TO_VIDEO_SEEDANCE_2_0',
  'IMAGE_TO_VIDEO_SEEDANCE_2_0_FAST',
  'ASSET_REUSE_PACKAGE',
] as const

const UNGROUPED_GROUP_KEY = '__ungrouped'
const GROUP_BENCHMARK = '爆款对标'
const GROUP_STORYBOARD = '分镜脚本'
const CAR_MODEL_BUNDLE_GROUP = '汽车素材包'
const PET_MAIN_GROUP = '主宠物候选'
const PET_SECOND_GROUP = '第二宠物候选'
const PET_PROP_GROUP = '宠物产品/道具'
const PET_SCENE_GROUP = '场景参考'
const PET_BACKGROUND_GROUP = '宠物背景图'
const PET_IMAGE_GROUP = 'AI宠物素材'
const PET_AUDIO_GROUP = '宠物音频'
const PET_COPY_GROUP = '宠物文案'
const PET_STORYBOARD_GROUP = '宠物分镜'
const PET_RESULT_GROUP = '宠物生成结果'
const ASSET_PAGE_SIZE = 24
const INLINE_PREVIEW_BATCH_SIZE = 6

const WORKFLOW_STAGE_OPTIONS = [
  { key: '', label: '全部资产', sourceTypes: [] },
  {
    key: 'benchmark',
    label: '文案',
    sourceTypes: ['DOUYIN_BENCHMARK', 'DOUYIN_PARSE_TRANSCRIPT', 'DOUYIN_REWRITE', 'DOUYIN_TRANSCRIPT'],
    assetRoles: ['benchmark_json', 'voice_script'],
    assetGroups: [GROUP_BENCHMARK],
    defaultAssetGroup: GROUP_BENCHMARK,
    defaultAssetRole: 'benchmark_json',
  },
  {
    key: 'storyboard',
    label: '分镜',
    sourceTypes: ['STORYBOARD_GENERATE', 'VIDEO_SCRIPT_ANALYZE', 'VIDEO_SCRIPT_URL_ANALYZE'],
    assetRoles: ['storyboard_json'],
    assetGroups: [GROUP_STORYBOARD],
    defaultAssetGroup: GROUP_STORYBOARD,
    defaultAssetRole: 'storyboard_json',
  },
  {
    key: 'voice',
    label: '音频/BGM',
    sourceTypes: ['TTS_GENERATE', 'VOICE_SAMPLE'],
  },
  {
    key: 'petBackground',
    label: '背景',
    sourceTypes: ['PET_BACKGROUND_GENERATE', 'USER_UPLOAD', 'AI_GENERATED', 'PET_REFERENCE_IMAGE'],
    assetRoles: ['scene'],
    assetGroups: [PET_BACKGROUND_GROUP, PET_SCENE_GROUP, '宠物背景/场景'],
    defaultAssetGroup: PET_BACKGROUND_GROUP,
    defaultAssetRole: 'scene',
  },
  {
    key: 'petPet',
    label: '宠物',
    sourceTypes: ['PET_IMAGE_GENERATE', 'PET_REFERENCE_IMAGE', 'USER_UPLOAD', 'AI_GENERATED'],
    assetRoles: ['main_pet', 'second_pet', 'prop'],
    assetGroups: [PET_IMAGE_GROUP, PET_MAIN_GROUP, PET_SECOND_GROUP, PET_PROP_GROUP, '宠物主图'],
    defaultAssetGroup: PET_MAIN_GROUP,
    defaultAssetRole: 'main_pet',
  },
  {
    key: 'petVideo',
    label: '视频',
    sourceTypes: ['PET_VIDEO_RESULT', 'PET_REFERENCE_VIDEO', 'SEEDANCE_REFERENCE_VIDEO', 'SEEDANCE_FIRST_FRAME_VIDEO', 'SEEDANCE_TEXT_VIDEO'],
    assetRoles: ['pet_video_result', 'reference_video', 'material_video'],
    assetGroups: [PET_RESULT_GROUP],
    defaultAssetGroup: PET_RESULT_GROUP,
    defaultAssetRole: 'pet_video_result',
  },
  {
    key: 'petAudio',
    label: '音频',
    sourceTypes: ['TTS_GENERATE', 'VOICE_SAMPLE', 'USER_UPLOAD'],
    assetRoles: ['bgm', 'voiceover', 'reference_audio'],
    assetGroups: [PET_AUDIO_GROUP],
    defaultAssetGroup: PET_AUDIO_GROUP,
    defaultAssetRole: 'reference_audio',
  },
  {
    key: 'petCopy',
    label: '文案',
    sourceTypes: ['PET_SCRIPT_GENERATE', 'DOUYIN_BENCHMARK', 'DOUYIN_PARSE_TRANSCRIPT', 'DOUYIN_REWRITE', 'DOUYIN_TRANSCRIPT'],
    assetRoles: ['voice_script', 'subtitle'],
    assetGroups: [PET_COPY_GROUP, GROUP_BENCHMARK, '口播文案'],
    defaultAssetGroup: PET_COPY_GROUP,
    defaultAssetRole: 'voice_script',
  },
  {
    key: 'petStoryboard',
    label: '分镜',
    sourceTypes: ['PET_STORYBOARD_GENERATE', 'STORYBOARD_GENERATE', 'VIDEO_SCRIPT_ANALYZE', 'VIDEO_SCRIPT_URL_ANALYZE'],
    assetRoles: ['storyboard_json'],
    assetGroups: [PET_STORYBOARD_GROUP, GROUP_STORYBOARD],
    defaultAssetGroup: PET_STORYBOARD_GROUP,
    defaultAssetRole: 'storyboard_json',
  },
  {
    key: 'digitalHuman',
    label: '数字人形象',
    sourceTypes: ['AVATAR_GENERATE', 'DIGITAL_HUMAN_GENERATE'],
  },
  {
    key: 'video',
    label: '视频素材',
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
    key: 'template',
    label: '资产整合包',
    sourceTypes: ['ASSET_REUSE_PACKAGE'],
  },
  {
    key: 'carBundle',
    label: '车型素材包',
    sourceTypes: [],
  },
  {
    key: 'sceneBundle',
    label: '场景图片',
    sourceTypes: [],
    assetRoles: ['scene_material_bundle', 'scene_showroom', 'scene_outdoor', 'scene_road', 'scene_night'],
    assetGroups: [SCENE_MATERIAL_BUNDLE_GROUP],
    defaultAssetGroup: SCENE_MATERIAL_BUNDLE_GROUP,
    defaultAssetRole: 'scene_material_bundle',
  },
  {
    key: 'material',
    label: '上传素材',
    sourceTypes: ['USER_UPLOAD', 'MANUAL_CREATED', 'DEMO', 'AI_GENERATED'],
  },
] as const

type WorkflowStageKey = (typeof WORKFLOW_STAGE_OPTIONS)[number]['key']

const BUSINESS_VIEW_OPTIONS = [
  {
    key: 'image',
    label: '图片素材',
    hint: '车辆、场景、封面',
    subtitle: '车辆图片、场景图和封面素材',
    defaultAssetType: 'IMAGE',
  },
  {
    key: 'video',
    label: '视频素材',
    hint: '成片、参考、混剪',
    subtitle: '成片结果、参考视频和可复用片段',
    defaultAssetType: 'VIDEO',
  },
  {
    key: 'copy',
    label: '文案资产',
    hint: '口播、对标、字幕',
    subtitle: '口播文案、爆款对标和字幕文本',
  },
  {
    key: 'storyboard',
    label: '分镜资产',
    hint: '镜头脚本、结构',
    subtitle: '分镜脚本、镜头结构和视频分析结果',
  },
  {
    key: 'audio',
    label: '音频资产',
    hint: '口播、BGM、音效',
    subtitle: '口播音频、背景音乐和参考音频',
    defaultAssetType: 'AUDIO',
  },
  {
    key: 'avatar',
    label: '数字人资产',
    hint: '形象、口播视频',
    subtitle: '数字人形象、主播图和数字人口播视频',
  },
  {
    key: 'template',
    label: '模板/整合包',
    hint: '一键套用、参数包',
    subtitle: '文案模板、分镜模板、数字人模板和资产整合包',
  },
] as const

type BusinessViewKey = (typeof BUSINESS_VIEW_OPTIONS)[number]['key']

const WORKFLOW_STAGE_BY_BUSINESS_VIEW: Partial<Record<BusinessViewKey, WorkflowStageKey>> = {
  copy: 'benchmark',
  storyboard: 'storyboard',
  audio: 'voice',
  avatar: 'digitalHuman',
  video: 'video',
  template: 'template',
}

const ASSET_GROUP_PRESETS = [
  CAR_MODEL_BUNDLE_GROUP,
  SCENE_MATERIAL_BUNDLE_GROUP,
  PET_MAIN_GROUP,
  PET_SECOND_GROUP,
  PET_PROP_GROUP,
  PET_SCENE_GROUP,
  PET_BACKGROUND_GROUP,
  PET_IMAGE_GROUP,
  PET_AUDIO_GROUP,
  PET_COPY_GROUP,
  PET_STORYBOARD_GROUP,
  PET_RESULT_GROUP,
  GROUP_BENCHMARK,
  GROUP_STORYBOARD,
  '口播文案',
  '数字人素材',
  '成片视频',
  '资产整合包',
] as const

const assets = ref<AssetItem[]>([])
const avatarAssets = ref<AvatarItem[]>([])
const voices = ref<VoicePresetItem[]>([])
const loading = ref(false)
const assetLoadingMore = ref(false)
const assetHasMore = ref(false)
const assetPageNo = ref(1)
const errorMessage = ref('')
const highlightedId = ref<number | null>(null)
const highlightedAvatarId = ref<number | null>(null)
const jumpHint = ref('')
const selectedType = ref<'' | AssetType>('')
const selectedSourceType = ref<string>('')
const selectedAssetGroup = ref<string>('')
const selectedPublicAssetProvider = ref<'all' | 'developer' | 'user'>('all')
const selectedWorkflowStage = ref<WorkflowStageKey>('')
const selectedBusinessView = ref<BusinessViewKey>('image')
const sortKey = ref<AssetListSort>('createdAtDesc')
const assetViewMode = ref<'grid' | 'list'>('grid')
const keyword = ref('')
const listScope = ref<AssetListScope>('all')
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
let highlightFilterSyncing = false
let resolvingHighlightAssetId: number | null = null
let assetLoadSeq = 0
let reloadQueued = false
let lastAssetQueryKey = ''
let routeFilterSyncing = false

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
const videoDurationByAssetId = ref<Record<number, string>>({})
const VIDEO_COVER_OVERRIDE_KEY = 'huashuo_video_cover_overrides'
const videoCoverOverrides = ref<Record<string, string>>(loadVideoCoverOverrides())
const videoCoverUploadingAssetId = ref<number | null>(null)
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
  if (selectedWorkflowStage.value === 'sceneBundle') {
    return '当前没有符合条件的场景图片，可先在私有资产中发布公共，或由开发者导入官方场景图。'
  }
  if (listScope.value === 'private' && !hasToken.value) {
    return '请先登录，再查看与当前账号绑定的私有资产。'
  }
  if (listScope.value === 'private') {
    return '当前账号下尚无私有资产，可在各模块上传或生成后查看。'
  }
  return `当前没有符合条件的${selectedBusinessViewOption.value.label}。`
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

const showAssetTypeSelect = computed(() =>
  activeCategory.value === 'materials' &&
  !isPetAssetMode.value &&
  selectedWorkflowStage.value !== 'carBundle' &&
  selectedWorkflowStage.value !== 'sceneBundle',
)
const showAssetSourceSelect = computed(() =>
  activeCategory.value === 'materials' &&
  selectedWorkflowStage.value !== 'carBundle' &&
  selectedWorkflowStage.value !== 'sceneBundle',
)
const showAssetGroupSelect = computed(() =>
  activeCategory.value === 'materials' &&
  selectedWorkflowStage.value !== 'carBundle' &&
  selectedWorkflowStage.value !== 'sceneBundle',
)
const workflowStageOptions = computed(() => {
  const hidden = isPetAssetMode.value
    ? new Set<WorkflowStageKey>(['benchmark', 'storyboard', 'voice', 'digitalHuman', 'video', 'template', 'carBundle', 'sceneBundle', 'material'])
    : new Set<WorkflowStageKey>(['material', 'petBackground', 'petPet', 'petVideo', 'petAudio', 'petCopy', 'petStoryboard'])
  return WORKFLOW_STAGE_OPTIONS.filter((item) => !hidden.has(item.key))
})
const selectedBusinessViewOption = computed(
  () => BUSINESS_VIEW_OPTIONS.find((item) => item.key === selectedBusinessView.value) || BUSINESS_VIEW_OPTIONS[0],
)
const selectedAssetKindLabel = computed(() => currentWorkflowStageOption()?.label || '全部资产')
const businessViewStatusText = computed(() => {
  const scope = listScopeLabel(listScope.value)
  return `${scope} · ${selectedBusinessViewOption.value.subtitle}`
})
const assetKindStatusText = computed(() => {
  const scope = listScopeLabel(listScope.value)
  if (isPetAssetMode.value) {
    return `${scope} · 背景、宠物、视频、音频、文案和分镜按创作环节管理`
  }
  if (!selectedWorkflowStage.value) {
    return `${scope} · 文案、分镜、车型素材包、数字人形象等可复用资产`
  }
  return businessViewStatusText.value
})
const showMaterialUploadAction = computed(() =>
  activeCategory.value === 'materials' &&
  listScope.value === 'private' &&
  selectedWorkflowStage.value !== 'carBundle',
)
const showMaterialContextActions = computed(() =>
  activeCategory.value === 'materials' &&
  (showMaterialUploadAction.value || selectedWorkflowStage.value === 'carBundle'),
)
const materialUploadTargetLabel = computed(() => {
  if (isPetAssetMode.value && !selectedWorkflowStage.value) {
    return '宠物素材'
  }
  if (selectedWorkflowStage.value) {
    return selectedAssetKindLabel.value
  }
  return selectedBusinessViewOption.value.label
})
const materialUploadHint = computed(() => {
  if (isPetAssetMode.value) {
    if (selectedWorkflowStage.value === 'petBackground') return '上传客厅、草地、宠物店等背景图，保存为宠物视频场景参考。'
    if (selectedWorkflowStage.value === 'petPet') return '上传主宠物、第二只宠物或宠物用品参考图，作为宠物创作主体素材。'
    if (selectedWorkflowStage.value === 'petVideo') return '上传宠物参考视频或生成结果视频，供作品复用和下载检查。'
    if (selectedWorkflowStage.value === 'petAudio') return '上传宠物口播、BGM 或音效素材，供配音和后期复用。'
    if (selectedWorkflowStage.value === 'petCopy') return '上传 TXT、MD、SRT 或 JSON 文案脚本，保存为宠物文案资产。'
    if (selectedWorkflowStage.value === 'petStoryboard') return '上传 TXT、MD 或 JSON 分镜脚本，保存为宠物分镜资产。'
    return '上传宠物创作素材，保存到当前账号的宠物资产中心。'
  }
  if (selectedWorkflowStage.value === 'benchmark' || selectedBusinessView.value === 'copy') {
    return '上传本地 TXT、MD 或 JSON 文案文件，保存到私有素材的文案资产。'
  }
  if (selectedWorkflowStage.value === 'storyboard' || selectedBusinessView.value === 'storyboard') {
    return '上传本地 TXT、MD 或 JSON 分镜文件，保存到私有素材的分镜资产。'
  }
  if (selectedWorkflowStage.value === 'voice' || selectedBusinessView.value === 'audio') {
    return '上传本地口播音频、BGM 或音效文件，保存到私有素材的音频资产。'
  }
  if (selectedWorkflowStage.value === 'video' || selectedBusinessView.value === 'video') {
    return '上传本地视频素材，保存到当前账号的私有视频素材。'
  }
  if (selectedWorkflowStage.value === 'digitalHuman' || selectedBusinessView.value === 'avatar') {
    return '上传本地 JPG、PNG 或 WebP 数字人形象图片，保存到私有数字人资产。'
  }
  if (selectedWorkflowStage.value === 'sceneBundle') {
    return '上传本地场景图片，保存到私有素材的场景图片。'
  }
  return '上传本地文件，保存到当前账号的私有素材。'
})
const materialUploadAccept = computed(() => {
  if (isPetAssetMode.value) {
    if (selectedWorkflowStage.value === 'petAudio') return 'audio/*'
    if (selectedWorkflowStage.value === 'petVideo') return 'video/*'
    if (selectedWorkflowStage.value === 'petCopy' || selectedWorkflowStage.value === 'petStoryboard') {
      return '.txt,.md,.json,.csv,.srt,.vtt,text/*,application/json'
    }
    return 'image/*'
  }
  if (selectedWorkflowStage.value === 'benchmark' || selectedBusinessView.value === 'copy') {
    return '.txt,.md,.json,.csv,.srt,.vtt,text/*,application/json'
  }
  if (selectedWorkflowStage.value === 'storyboard' || selectedBusinessView.value === 'storyboard') {
    return '.txt,.md,.json,.csv,.srt,.vtt,text/*,application/json'
  }
  if (selectedWorkflowStage.value === 'voice' || selectedBusinessView.value === 'audio') {
    return 'audio/*'
  }
  if (selectedWorkflowStage.value === 'video' || selectedBusinessView.value === 'video') {
    return 'video/*'
  }
  if (selectedWorkflowStage.value === 'digitalHuman' || selectedBusinessView.value === 'avatar') {
    return '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'
  }
  if (selectedWorkflowStage.value === 'sceneBundle' || selectedBusinessView.value === 'image') {
    return 'image/*'
  }
  return ''
})
const selectedUploadBusinessView = computed<BusinessViewKey>(() => {
  if (selectedWorkflowStage.value === 'benchmark') return 'copy'
  if (selectedWorkflowStage.value === 'storyboard') return 'storyboard'
  if (selectedWorkflowStage.value === 'voice') return 'audio'
  if (selectedWorkflowStage.value === 'petVideo') return 'video'
  if (selectedWorkflowStage.value === 'petAudio') return 'audio'
  if (selectedWorkflowStage.value === 'petCopy') return 'copy'
  if (selectedWorkflowStage.value === 'petStoryboard') return 'storyboard'
  if (selectedWorkflowStage.value === 'petBackground' || selectedWorkflowStage.value === 'petPet') return 'image'
  if (selectedWorkflowStage.value === 'digitalHuman') return 'avatar'
  if (selectedWorkflowStage.value === 'video') return 'video'
  if (selectedWorkflowStage.value === 'template') return 'template'
  return selectedBusinessView.value
})
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

const isAvatarAssetMode = computed(() =>
  activeCategory.value === 'materials' && selectedWorkflowStage.value === 'digitalHuman',
)

const filteredAssetAvatars = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  return [...avatarAssets.value]
    .filter((avatar) => {
      if (listScope.value === 'private') return avatarVisibility(avatar) === 'PRIVATE'
      if (listScope.value === 'global') return avatarVisibility(avatar) === 'PUBLIC'
      return true
    })
    .filter((avatar) => {
      if (!q) return true
      return [
        avatar.avatarName,
        avatar.sourceType,
        avatar.prompt,
        avatar.metadataJson,
        avatarVisibilityLabel(avatar),
      ].some((text) => String(text || '').toLowerCase().includes(q))
    })
    .sort((left, right) => {
      if (left.defaultAvatar !== right.defaultAvatar) {
        return left.defaultAvatar ? -1 : 1
      }
      if (sortKey.value === 'createdAtAsc') {
        return Date.parse(left.createdAt || left.updatedAt || '') - Date.parse(right.createdAt || right.updatedAt || '')
      }
      if (sortKey.value === 'fileNameAsc') {
        return left.avatarName.localeCompare(right.avatarName)
      }
      return Date.parse(right.updatedAt || right.createdAt || '') - Date.parse(left.updatedAt || left.createdAt || '')
    })
})

const materialAssetCountLabel = computed(() => {
  if (isAvatarAssetMode.value) {
    return `共 ${filteredAssetAvatars.value.length} 条`
  }
  return assetHasMore.value ? `已显示 ${assets.value.length}+ 条` : `共 ${assets.value.length} 条`
})

function listScopeLabel(scope: AssetListScope) {
  if (scope === 'global') return '公共素材'
  if (scope === 'private') return '私有素材'
  return '全部素材'
}

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
  stringField(previewRecord.value, 'bundleType') === 'scene_material' ||
  stringField(previewRecord.value, 'assetRole') === 'car_model_bundle' ||
  stringField(previewRecord.value, 'assetRole') === 'scene_material_bundle',
)

const carBundleTitle = computed(() => {
  if (stringField(previewRecord.value, 'bundleType') === 'scene_material') {
    return firstNonEmptyText(
      stringField(previewRecord.value, 'sceneSetName'),
      stringField(previewRecord.value, 'title'),
      '场景图片',
    )
  }
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
  syncAssetViewFromRoute()
  void refreshCurrent()
})

watch(
  () => [route.query.assetView, route.query.view, route.query.workflowStage, route.query.assetGroup] as const,
  () => {
    if (syncAssetViewFromRoute()) {
      if (loading.value || assetLoadingMore.value) {
        reloadQueued = true
      } else {
        void refreshCurrent()
      }
    }
  },
)

watch([activeCategory, listScope, voiceListScope, selectedBusinessView, selectedType, selectedSourceType, selectedAssetGroup, selectedPublicAssetProvider, selectedWorkflowStage, sortKey], () => {
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
  if (highlightFilterSyncing || routeFilterSyncing) {
    return
  }
  if (loading.value || assetLoadingMore.value) {
    reloadQueued = true
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

function currentAssetQueryKey() {
  return JSON.stringify({
    activeCategory: activeCategory.value,
    listScope: listScope.value,
    voiceListScope: voiceListScope.value,
    selectedBusinessView: selectedBusinessView.value,
    selectedType: selectedType.value,
    selectedSourceType: selectedSourceType.value,
    selectedAssetGroup: selectedAssetGroup.value,
    selectedPublicAssetProvider: selectedPublicAssetProvider.value,
    selectedWorkflowStage: selectedWorkflowStage.value,
    businessDomain: props.businessDomain || '',
    sortKey: sortKey.value,
    keyword: keyword.value.trim(),
  })
}

async function loadAssets(options?: { append?: boolean }) {
  const append = options?.append === true && activeCategory.value === 'materials'
  const queryKey = currentAssetQueryKey()
  const seq = ++assetLoadSeq
  if (append) {
    assetLoadingMore.value = true
  } else {
    loading.value = true
  }
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
        if (seq !== assetLoadSeq) return
        voices.value = res.records || []
        return
      }
      const res = await getVoiceCatalog()
      if (seq !== assetLoadSeq) return
      voices.value = res.records || []
      return
    }
    if (isAvatarAssetMode.value) {
      const rows = await getAvatars()
      if (seq !== assetLoadSeq) return
      avatarAssets.value = rows
      assets.value = []
      inlinePreviewByAssetId.value = {}
      assetHasMore.value = false
      assetPageNo.value = 1
      lastAssetQueryKey = queryKey
      return
    }
    const nextPageNo = append ? assetPageNo.value + 1 : 1
    if (!append && queryKey !== lastAssetQueryKey) {
      assets.value = []
      inlinePreviewByAssetId.value = {}
      assetHasMore.value = false
    }
    const rows = await getAssets({
      scope: listScope.value,
      assetType: assetTypeForCurrentQuery(),
      sourceType: sourceTypeForCurrentQuery(),
      assetGroup: assetGroupForCurrentQuery(),
      keyword: keyword.value || undefined,
      sort: sortKey.value,
      pageNo: nextPageNo,
      pageSize: ASSET_PAGE_SIZE,
      businessDomain: props.businessDomain,
    })
    if (seq !== assetLoadSeq) return
    const filteredRows = rows.filter(matchesPublicAssetProvider).filter(matchesWorkflowStage).filter(matchesBusinessView)
    if (append) {
      const existingIds = new Set(assets.value.map((asset) => asset.assetId))
      assets.value = [...assets.value, ...filteredRows.filter((asset) => !existingIds.has(asset.assetId))]
    } else {
      assets.value = filteredRows
      inlinePreviewByAssetId.value = {}
    }
    assetPageNo.value = nextPageNo
    assetHasMore.value = rows.length >= ASSET_PAGE_SIZE
    lastAssetQueryKey = queryKey
    void loadInlineAssetPreviews()
    await nextTick()
    if (props.highlightAssetId != null && props.highlightAssetId > 0) {
      applyHighlightWhenReady(props.highlightAssetId)
    }
  } catch (error) {
    if (seq === assetLoadSeq) {
      errorMessage.value = error instanceof Error ? error.message : '加载资产失败'
      if (!append) {
        assetHasMore.value = false
      }
    }
  } finally {
    if (seq === assetLoadSeq) {
      loading.value = false
      assetLoadingMore.value = false
    }
    await nextTick()
    if (seq === assetLoadSeq && props.highlightAssetId != null && props.highlightAssetId > 0) {
      applyHighlightWhenReady(props.highlightAssetId)
    }
    if (seq === assetLoadSeq && reloadQueued && !loading.value && !assetLoadingMore.value) {
      reloadQueued = false
      void refreshCurrent()
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
    .slice(0, 24)
  for (let i = 0; i < previewable.length; i += INLINE_PREVIEW_BATCH_SIZE) {
    if (seq !== inlinePreviewLoadSeq) {
      return
    }
    const batch = previewable.slice(i, i + INLINE_PREVIEW_BATCH_SIZE)
    await Promise.all(
      batch.map(async (asset) => {
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
        : isSceneMaterialBundleAsset(asset)
          ? '场景图片'
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
  if (isSceneMaterialBundleAsset(asset)) {
    return firstNonEmptyText(stringField(metadata, 'sceneSetName'), stringField(metadata, 'title'))
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

function loadMoreAssets() {
  if (loading.value || assetLoadingMore.value || !assetHasMore.value) {
    return
  }
  void loadAssets({ append: true })
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
  const avatarUploadMode = isAvatarAssetMode.value
  const publishAfterUpload = false
  let latestAssetId: number | null = null
  let latestAsset: AssetItem | null = null
  let latestAvatarId: number | null = null
  try {
    for (const file of files) {
      if (avatarUploadMode) {
        const uploadedAvatar = await uploadAvatar(avatarNameFromFile(file), file)
        latestAvatarId = uploadedAvatar.avatarId
        continue
      }
      const uploadMetadata = currentWritableAssetMetadata(file)
      const uploaded = await uploadMaterialAsset(file, {
        publish: publishAfterUpload,
        metadataJson: uploadMetadata ? JSON.stringify(uploadMetadata) : undefined,
      })
      latestAssetId = uploaded.assetId
      latestAsset = uploaded
    }
    selectedType.value = ''
    selectedSourceType.value = ''
    if (!selectedWorkflowStage.value) {
      selectedBusinessView.value = latestAsset ? businessViewForAsset(latestAsset) : selectedUploadBusinessView.value
    }
    keyword.value = ''
    sortKey.value = 'createdAtDesc'
    listScope.value = 'private'
    jumpHint.value = avatarUploadMode
      ? files.length > 1 ? `已上传 ${files.length} 个数字人形象到私有资产。` : '已上传到私有数字人资产。'
      : files.length > 1 ? `已上传 ${files.length} 个素材到私有资产。` : '已上传到私有资产。'
    await loadAssets()
    if (avatarUploadMode) {
      if (latestAvatarId != null) {
        highlightedAvatarId.value = latestAvatarId
        clearHighlightTimer()
        await nextTick()
        document.getElementById(avatarRowDomId(latestAvatarId))?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        highlightClearTimer = window.setTimeout(() => {
          highlightedAvatarId.value = null
          jumpHint.value = ''
          highlightClearTimer = null
        }, 6000)
      }
      return
    }
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
  selectedAssetGroup.value = ''
  selectedWorkflowStage.value = 'carBundle'
  selectedBusinessView.value = 'image'
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
  selectedAssetGroup.value = ''
  selectedWorkflowStage.value = 'carBundle'
  selectedBusinessView.value = 'image'
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

function syncAssetViewFromRoute() {
  let changed = false
  routeFilterSyncing = true
  const view = parseBusinessViewQuery(route.query.assetView ?? route.query.view)
  const stage = parseWorkflowStageQuery(route.query.workflowStage)
  const assetGroup = parseAssetGroupQuery(route.query.assetGroup)
  try {
    if (view) {
      const stageForView = WORKFLOW_STAGE_BY_BUSINESS_VIEW[view] || ''
      if (selectedBusinessView.value !== view || selectedWorkflowStage.value !== stageForView) {
        selectedBusinessView.value = view
        selectedType.value = ''
        selectedSourceType.value = ''
        selectedAssetGroup.value = ''
        selectedWorkflowStage.value = stageForView
        keyword.value = ''
        changed = true
      }
    }
    if (stage && selectedWorkflowStage.value !== stage) {
      selectWorkflowStage(stage)
      changed = true
    }
    if (selectedAssetGroup.value !== assetGroup) {
      selectedAssetGroup.value = assetGroup
      changed = true
    }
  } finally {
    void nextTick(() => {
      routeFilterSyncing = false
    })
  }
  return changed
}

function parseBusinessViewQuery(value: unknown): BusinessViewKey | null {
  const raw = String(Array.isArray(value) ? value[0] || '' : value || '')
  return BUSINESS_VIEW_OPTIONS.some((item) => item.key === raw) ? raw as BusinessViewKey : null
}

function parseWorkflowStageQuery(value: unknown): WorkflowStageKey | null {
  const raw = String(Array.isArray(value) ? value[0] || '' : value || '')
  return WORKFLOW_STAGE_OPTIONS.some((item) => item.key === raw) ? raw as WorkflowStageKey : null
}

function parseAssetGroupQuery(value: unknown) {
  return String(Array.isArray(value) ? value[0] || '' : value || '').trim()
}

function selectWorkflowStage(stage: WorkflowStageKey) {
  selectedWorkflowStage.value = stage
  if (stage) {
    selectedSourceType.value = ''
    selectedType.value = ''
  }
  if (stage === 'benchmark') {
    selectedBusinessView.value = 'copy'
  } else if (stage === 'storyboard') {
    selectedBusinessView.value = 'storyboard'
  } else if (stage === 'voice') {
    selectedBusinessView.value = 'audio'
  } else if (stage === 'petVideo') {
    selectedBusinessView.value = 'video'
  } else if (stage === 'petAudio') {
    selectedBusinessView.value = 'audio'
  } else if (stage === 'petCopy') {
    selectedBusinessView.value = 'copy'
  } else if (stage === 'petStoryboard') {
    selectedBusinessView.value = 'storyboard'
  } else if (stage === 'petBackground' || stage === 'petPet') {
    selectedBusinessView.value = 'image'
  } else if (stage === 'digitalHuman') {
    selectedBusinessView.value = 'avatar'
  } else if (stage === 'video') {
    selectedBusinessView.value = 'video'
  } else if (stage === 'template') {
    selectedBusinessView.value = 'template'
  } else if (stage === 'material') {
    selectedBusinessView.value = 'image'
  }
  if (stage === 'carBundle') {
    selectedBusinessView.value = 'image'
    selectedType.value = 'JSON'
    selectedAssetGroup.value = ''
  } else if (stage === 'sceneBundle') {
    selectedBusinessView.value = 'image'
    selectedType.value = ''
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

function assetTypeForCurrentQuery(): AssetType | undefined {
  if (
    selectedWorkflowStage.value === 'template' ||
    selectedWorkflowStage.value === 'carBundle'
  ) {
    return 'JSON'
  }
  if (selectedWorkflowStage.value === 'petBackground' || selectedWorkflowStage.value === 'petPet') {
    return 'IMAGE'
  }
  if (selectedWorkflowStage.value === 'petVideo') {
    return 'VIDEO'
  }
  if (selectedWorkflowStage.value === 'petAudio') {
    return 'AUDIO'
  }
  if (selectedType.value) {
    return selectedType.value
  }
  if (!selectedWorkflowStage.value) {
    return undefined
  }
  const option = selectedBusinessViewOption.value
  return 'defaultAssetType' in option ? option.defaultAssetType as AssetType : undefined
}

function sourceTypeForCurrentQuery() {
  if (selectedWorkflowStage.value === 'template') {
    return 'ASSET_REUSE_PACKAGE'
  }
  return selectedWorkflowStage.value ? undefined : selectedSourceType.value || undefined
}

function assetGroupForCurrentQuery() {
  if (selectedWorkflowStage.value === 'benchmark') {
    return GROUP_BENCHMARK
  }
  if (selectedWorkflowStage.value === 'storyboard') {
    return GROUP_STORYBOARD
  }
  if (selectedWorkflowStage.value === 'carBundle') {
    return CAR_MODEL_BUNDLE_GROUP
  }
  if (selectedWorkflowStage.value === 'sceneBundle') {
    return SCENE_MATERIAL_BUNDLE_GROUP
  }
  if (isPetAssetMode.value && isPetWorkflowStage(selectedWorkflowStage.value)) {
    return selectedAssetGroup.value || undefined
  }
  const stage = currentWorkflowStageOption()
  if (stage && 'defaultAssetGroup' in stage) {
    return stage.defaultAssetGroup
  }
  return selectedAssetGroup.value || undefined
}

function currentWritableAssetGroup() {
  const group = selectedAssetGroup.value.trim()
  if (group && group !== UNGROUPED_GROUP_KEY) {
    return group
  }
  const stage = currentWorkflowStageOption()
  if (stage && 'defaultAssetGroup' in stage) {
    return stage.defaultAssetGroup
  }
  if (selectedUploadBusinessView.value === 'copy') {
    return GROUP_BENCHMARK
  }
  if (selectedUploadBusinessView.value === 'storyboard') {
    return GROUP_STORYBOARD
  }
  return ''
}

function currentWritableAssetMetadata(file?: File) {
  const meta: Record<string, string> = {}
  const group = currentWritableAssetGroup()
  const stage = currentWorkflowStageOption()
  const role = currentWritableAssetRole(file, stage)
  if (isPetAssetMode.value) {
    meta.businessDomain = 'pet'
    meta.domain = 'pet_creation'
    meta.assetGroup = '宠物素材'
  }
  if (group) {
    meta.assetGroup = group
  }
  if (role) {
    meta.assetRole = role
  }
  meta.from = isPetAssetMode.value ? 'pet_asset_center_upload' : 'asset_center_upload'
  meta.source = selectedWorkflowStage.value || selectedUploadBusinessView.value
  if (file?.name) {
    meta.originalFileName = file.name
  }
  return Object.keys(meta).length ? meta : null
}

function currentWritableAssetRole(file: File | undefined, stage: ReturnType<typeof currentWorkflowStageOption>) {
  if (stage && 'defaultAssetRole' in stage) {
    return stage.defaultAssetRole
  }
  const view = selectedUploadBusinessView.value
  if (view === 'copy') return 'voice_script'
  if (view === 'storyboard') return 'storyboard_json'
  if (view === 'audio') return 'reference_audio'
  if (view === 'video') return 'material_video'
  if (view === 'avatar') {
    return file?.type?.startsWith('video/') ? 'host_video' : 'host_image'
  }
  return ''
}

function currentWorkflowStageOption() {
  return WORKFLOW_STAGE_OPTIONS.find((item) => item.key === selectedWorkflowStage.value)
}

function isPetWorkflowStage(stage: WorkflowStageKey | string) {
  return String(stage || '').startsWith('pet')
}

function isSharedWorkflowStage(stage: WorkflowStageKey | string): stage is AssetWorkflowStageKey {
  return ['', 'benchmark', 'storyboard', 'voice', 'digitalHuman', 'video', 'carBundle', 'sceneBundle', 'material']
    .includes(String(stage) as AssetWorkflowStageKey)
}

function matchesWorkflowStage(asset: AssetItem) {
  if (listScope.value === 'global' && isPublicCarBundleComponentImage(asset)) {
    return false
  }
  if (selectedWorkflowStage.value === 'benchmark') {
    return isCopyBusinessAsset(asset)
  }
  if (selectedWorkflowStage.value === 'storyboard') {
    return isStoryboardBusinessAsset(asset)
  }
  if (selectedWorkflowStage.value === 'template') {
    return isTemplateLibraryAsset(asset)
  }
  if (isPetAssetMode.value && isPetWorkflowStage(selectedWorkflowStage.value)) {
    return matchesPetWorkflowStage(asset, selectedWorkflowStage.value)
  }
  if (isSharedWorkflowStage(selectedWorkflowStage.value)) {
    return matchesAssetWorkflowStage(asset, selectedWorkflowStage.value)
  }
  return false
}

function matchesPetWorkflowStage(asset: AssetItem, stage: WorkflowStageKey) {
  const metadata = parseJsonObject(asset.metadataJson)
  const group = String(asset.assetGroup || '').trim()
  const metaGroup = stringField(metadata, 'assetGroup')
  const role = normalizedAssetRole(asset)
  const sourceType = String(asset.sourceType || '').trim().toUpperCase()
  const from = stringField(metadata, 'from')
  const kind = stringField(metadata, 'kind')
  const text = assetBusinessIdentityText(asset)
  const groupMatched = (...groups: string[]) => groups.some((item) => item === group || item === metaGroup)
  const roleMatched = (...roles: string[]) => roles.includes(role)
  if (stage === 'petBackground') {
    return isImage(asset) && (
      sourceType === 'PET_BACKGROUND_GENERATE' ||
      from === 'pet_background_generate' ||
      kind === 'background' ||
      groupMatched(PET_BACKGROUND_GROUP, PET_SCENE_GROUP, '宠物背景/场景') ||
      roleMatched('scene') ||
      includesAnyBusinessToken(text, ['pet_background', 'background', 'scene', '背景', '场景'])
    )
  }
  if (stage === 'petPet') {
    return isImage(asset) && (
      sourceType === 'PET_IMAGE_GENERATE' ||
      from === 'pet_image_generate' ||
      kind === 'pet' ||
      groupMatched(PET_IMAGE_GROUP, PET_MAIN_GROUP, PET_SECOND_GROUP, PET_PROP_GROUP, '宠物主图') ||
      roleMatched('main_pet', 'second_pet', 'prop') ||
      includesAnyBusinessToken(text, ['ai宠物', '宠物素材', '主宠物', '第二宠物', '宠物产品', '道具'])
    )
  }
  if (stage === 'petVideo') {
    return isVideo(asset) && (
      sourceType === 'PET_VIDEO_RESULT' ||
      sourceType === 'PET_REFERENCE_VIDEO' ||
      groupMatched(PET_RESULT_GROUP) ||
      roleMatched('pet_video_result', 'reference_video', 'material_video') ||
      isBusinessVideoAsset(asset)
    )
  }
  if (stage === 'petAudio') {
    return groupMatched(PET_AUDIO_GROUP) || roleMatched('bgm', 'voiceover', 'reference_audio') || isAudioBusinessAsset(asset)
  }
  if (stage === 'petCopy') {
    return groupMatched(PET_COPY_GROUP, GROUP_BENCHMARK, '口播文案') || roleMatched('voice_script', 'subtitle') || isCopyBusinessAsset(asset)
  }
  if (stage === 'petStoryboard') {
    return groupMatched(PET_STORYBOARD_GROUP, GROUP_STORYBOARD) || roleMatched('storyboard_json') || isStoryboardBusinessAsset(asset)
  }
  return true
}

function matchesBusinessView(asset: AssetItem) {
  if (!selectedWorkflowStage.value) {
    return true
  }
  if (selectedWorkflowStage.value === 'carBundle' || selectedWorkflowStage.value === 'sceneBundle') {
    return true
  }
  switch (selectedBusinessView.value) {
    case 'image':
      return isBusinessImageAsset(asset)
    case 'video':
      return isBusinessVideoAsset(asset)
    case 'copy':
      return isCopyBusinessAsset(asset)
    case 'storyboard':
      return isStoryboardBusinessAsset(asset)
    case 'audio':
      return isAudioBusinessAsset(asset)
    case 'avatar':
      return isAvatarBusinessAsset(asset)
    case 'template':
      return isTemplateLibraryAsset(asset)
    default:
      return true
  }
}

function matchesPublicAssetProvider(asset: AssetItem) {
  if (selectedPublicAssetProvider.value === 'all' || listScope.value === 'private') {
    return true
  }
  if (!isPublicAsset(asset)) {
    return false
  }
  return publicAssetProviderKind(asset) === selectedPublicAssetProvider.value
}

function assetBusinessLabel(asset: AssetItem) {
  if (isPetAssetMode.value) {
    return petAssetBusinessLabel(asset)
  }
  if (selectedBusinessView.value === 'image' && isBusinessImageAsset(asset)) return businessViewLabel('image')
  if (selectedBusinessView.value === 'video' && isBusinessVideoAsset(asset)) return businessViewLabel('video')
  if (selectedBusinessView.value === 'copy' && isCopyBusinessAsset(asset)) return businessViewLabel('copy')
  if (selectedBusinessView.value === 'storyboard' && isStoryboardBusinessAsset(asset)) return businessViewLabel('storyboard')
  if (selectedBusinessView.value === 'audio' && isAudioBusinessAsset(asset)) return businessViewLabel('audio')
  if (selectedBusinessView.value === 'avatar' && isAvatarBusinessAsset(asset)) return businessViewLabel('avatar')
  if (selectedBusinessView.value === 'template' && isTemplateLibraryAsset(asset)) return businessViewLabel('template')
  if (isTemplateLibraryAsset(asset)) return '模板库'
  if (isAvatarBusinessAsset(asset)) return '数字人资产'
  if (isStoryboardBusinessAsset(asset)) return '分镜资产'
  if (isCopyBusinessAsset(asset)) return '文案资产'
  if (isAudioBusinessAsset(asset)) return '音频资产'
  if (isBusinessVideoAsset(asset)) return '视频素材'
  if (isBusinessImageAsset(asset)) return '图片素材'
  return '素材资产'
}

function petAssetBusinessLabel(asset: AssetItem) {
  if (matchesPetWorkflowStage(asset, 'petBackground')) return '背景'
  if (matchesPetWorkflowStage(asset, 'petPet')) return '宠物'
  if (matchesPetWorkflowStage(asset, 'petVideo')) return '视频'
  if (matchesPetWorkflowStage(asset, 'petAudio')) return '音频'
  if (matchesPetWorkflowStage(asset, 'petStoryboard')) return '分镜'
  if (matchesPetWorkflowStage(asset, 'petCopy')) return '文案'
  return '宠物资产'
}

function publicAssetProviderPillClass(asset: AssetItem) {
  const kind = publicAssetProviderKind(asset)
  return {
    'asset-developer-pill': kind === 'developer',
    'asset-user-public-pill': kind === 'user',
    'asset-private-pill': kind === 'private',
  }
}

function businessViewLabel(key: BusinessViewKey) {
  return BUSINESS_VIEW_OPTIONS.find((item) => item.key === key)?.label || '素材资产'
}

function businessViewForAsset(asset: AssetItem): BusinessViewKey {
  if (isTemplateLibraryAsset(asset)) return 'template'
  if (isAvatarBusinessAsset(asset)) return 'avatar'
  if (isStoryboardBusinessAsset(asset)) return 'storyboard'
  if (isCopyBusinessAsset(asset)) return 'copy'
  if (isAudioBusinessAsset(asset)) return 'audio'
  if (isBusinessVideoAsset(asset)) return 'video'
  return 'image'
}

function isBusinessImageAsset(asset: AssetItem) {
  return (isImage(asset) && !isAvatarBusinessAsset(asset)) || isCarModelBundleAsset(asset) || isSceneMaterialBundleAsset(asset)
}

function isBusinessVideoAsset(asset: AssetItem) {
  return isVideo(asset) && !isAvatarBusinessAsset(asset)
}

function isCopyBusinessAsset(asset: AssetItem) {
  const role = normalizedAssetRole(asset)
  const text = assetBusinessSearchText(asset)
  return (
    isBenchmarkAsset(asset) ||
    role === 'voice_script' ||
    role === 'subtitle' ||
    ((isText(asset) || isJson(asset)) &&
      includesAnyBusinessToken(text, ['copywriting', 'script', 'voice_script', 'subtitle', '文案', '脚本', '口播', '字幕', '对标', 'douyin']))
  )
}

function isStoryboardBusinessAsset(asset: AssetItem) {
  const role = normalizedAssetRole(asset)
  const text = assetBusinessSearchText(asset)
  return (
    isStoryboardAsset(asset) ||
    role === 'storyboard_json' ||
    ((isJson(asset) || isText(asset)) && includesAnyBusinessToken(text, ['storyboard', 'shot', '分镜', '镜头', '脚本结构']))
  )
}

function isAudioBusinessAsset(asset: AssetItem) {
  const role = normalizedAssetRole(asset)
  const text = assetBusinessIdentityText(asset)
  return (
    isAudio(asset) ||
    role === 'bgm' ||
    role === 'voiceover' ||
    role === 'reference_audio' ||
    includesAnyBusinessToken(text, ['tts_generate', 'voice_sample', 'bgm', 'music', 'audio', '音频', '口播音频', '背景音乐'])
  )
}

function isAvatarBusinessAsset(asset: AssetItem) {
  const role = normalizedAssetRole(asset)
  const sourceType = String(asset.sourceType || '').trim().toUpperCase()
  const text = assetBusinessIdentityText(asset)
  return (
    ['AVATAR_GENERATE', 'DIGITAL_HUMAN_GENERATE'].includes(sourceType) ||
    role === 'host_image' ||
    role === 'host_video' ||
    includesAnyBusinessToken(text, ['avatar_generate', 'digital_human_generate', 'digital_human', 'avatar', 'host_image', 'host_video', '数字人', '主播'])
  )
}

function isTemplateLibraryAsset(asset: AssetItem) {
  const text = assetBusinessIdentityText(asset)
  const metadata = parseJsonObject(asset.metadataJson)
  return Boolean(
    isAssetIntegrationPackageAssetShared(asset) ||
      metadata?.publicTemplate ||
      metadata?.templateRole ||
      metadata?.templateType ||
      includesAnyBusinessToken(text, [
        'asset_integration_package',
        'asset_reuse_package',
        '资产整合包',
        'template',
        '_template',
        'copywriting_template',
        'storyboard_template',
        'headline_template',
        'bgm_template',
        'selling_point_template',
        '模板',
        '文案模板',
        '分镜模板',
        '数字人模板',
        '背景音乐模板',
        '大字报模板',
        '卖点模板',
      ]),
  )
}

function assetBusinessSearchText(asset: AssetItem) {
  return [
    asset.fileName,
    asset.assetGroup,
    asset.sourceType,
    asset.kind,
    asset.mimeType,
    asset.metadataJson,
  ].filter(Boolean).join(' ').toLowerCase()
}

function assetBusinessIdentityText(asset: AssetItem) {
  return [
    asset.fileName,
    asset.assetGroup,
    asset.sourceType,
    asset.kind,
    asset.mimeType,
  ].filter(Boolean).join(' ').toLowerCase()
}

function includesAnyBusinessToken(text: string, tokens: string[]) {
  return tokens.some((token) => text.includes(token.toLowerCase()))
}

function sourceTypeLabel(sourceType: string | null | undefined) {
  return sourceTypeLabelShared(sourceType)
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

async function applyHighlightWhenReady(assetId: number) {
  if (loading.value) {
    return
  }
  const found = assets.value.some((asset) => asset.assetId === assetId)
  if (!found) {
    if (resolvingHighlightAssetId !== assetId) {
      resolvingHighlightAssetId = assetId
      try {
        const moved = await moveHighlightAssetIntoCurrentView(assetId)
        if (moved) {
          return
        }
      } finally {
        resolvingHighlightAssetId = null
      }
    }
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

async function moveHighlightAssetIntoCurrentView(assetId: number) {
  try {
    const asset = await getAssetDetail(assetId)
    highlightFilterSyncing = true
    activeCategory.value = 'materials'
    listScope.value = String(asset.visibility || '').toUpperCase() === 'PRIVATE' ? 'private' : 'global'
    selectedBusinessView.value = businessViewForAsset(asset)
    selectedType.value = asset.assetType
    selectedSourceType.value = ''
    selectedAssetGroup.value = ''
    selectedWorkflowStage.value = ''
    keyword.value = ''
  } catch {
    return false
  } finally {
    highlightFilterSyncing = false
  }
  await loadAssets()
  return true
}

function assetRowDomId(assetId: number) {
  return `asset-row-${assetId}`
}

function avatarRowDomId(avatarId: number) {
  return `avatar-row-${avatarId}`
}

function avatarNameFromFile(file: File) {
  const baseName = file.name.replace(/\.[^.]+$/, '').trim()
  return baseName || '上传形象'
}

function resolveFileUrl(url: string) {
  if (!url) {
    return '#'
  }
  return url.startsWith('http') ? url : `${API_ORIGIN}${url}`
}

function videoPosterUrl(asset: AssetItem) {
  return localVideoCoverUrl(asset) || backendVideoPosterUrl(asset) || carPlaceholderImage
}

function backendVideoPosterUrl(asset: AssetItem) {
  const poster = backendVideoPosterRaw(asset)
  return poster ? resolveFileUrl(poster) : ''
}

function backendVideoPosterRaw(asset: AssetItem) {
  const metadata = parseJsonObject(asset.metadataJson)
  return firstNonEmptyText(
    asset.thumbnailUrl || '',
    stringField(metadata, 'coverUrl'),
    stringField(metadata, 'thumbnailUrl'),
    stringField(metadata, 'posterUrl'),
    stringField(metadata, 'poster'),
    stringField(metadata, 'poster_url'),
    stringField(metadata, 'firstFrameUrl'),
    stringField(metadata, 'lastFrameUrl'),
    firstSegmentPosterUrl(metadata),
  )
}

function firstSegmentPosterUrl(metadata: Record<string, unknown> | null) {
  const raw = metadata?.segmentVideos
  if (!Array.isArray(raw)) {
    return ''
  }
  for (const item of raw) {
    if (!isRecord(item)) {
      continue
    }
    const cover = firstNonEmptyText(
      stringField(item, 'coverUrl'),
      stringField(item, 'coverImageUrl'),
      stringField(item, 'thumbnailUrl'),
      stringField(item, 'posterUrl'),
      stringField(item, 'firstFrameUrl'),
      stringField(item, 'lastFrameUrl'),
    )
    if (cover) {
      return cover
    }
  }
  return ''
}

function localVideoCoverUrl(asset: AssetItem) {
  return videoCoverOverrides.value[String(asset.assetId)] || ''
}

function videoPosterSourceLabel(asset: AssetItem) {
  if (localVideoCoverUrl(asset)) return '自选封面'
  const metadata = parseJsonObject(asset.metadataJson)
  if (stringField(metadata, 'coverSource') === 'user_upload' || metadata?.coverAssetId != null) {
    return '自选封面'
  }
  if (backendVideoPosterRaw(asset)) return '系统封面'
  return '系统自动封面'
}

function loadVideoCoverOverrides() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(VIDEO_COVER_OVERRIDE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return isRecord(parsed) ? Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => typeof value === 'string'),
    ) as Record<string, string> : {}
  } catch {
    return {}
  }
}

function persistVideoCoverOverrides() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(VIDEO_COVER_OVERRIDE_KEY, JSON.stringify(videoCoverOverrides.value))
  } catch {
    jumpHint.value = '封面已应用，但浏览器本地存储空间不足，刷新后可能不会保留。'
  }
}

async function handleVideoCoverSelected(asset: AssetItem, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] || null
  input.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    previewError.value = '请选择 JPG、PNG、WEBP 等图片作为封面。'
    return
  }
  if (!hasToken.value) {
    previewError.value = '请先登录后再设置视频封面。'
    return
  }
  videoCoverUploadingAssetId.value = asset.assetId
  try {
    const coverAsset = await uploadMaterialAsset(file, {
      metadataJson: JSON.stringify({
        from: 'video_cover_upload',
        assetRole: 'video_cover',
        assetGroup: '视频封面',
        targetAssetId: asset.assetId,
        targetFileName: asset.fileName,
        createdBy: 'asset_center_cover_tool',
      }),
    })
    const coverUrl = coverAsset.fileUrl || coverAsset.thumbnailUrl || ''
    if (!coverUrl) {
      throw new Error('封面上传后未返回可用地址')
    }
    const updated = await updateAssetCover(asset.assetId, {
      thumbnailUrl: coverUrl,
      metadataJson: buildVideoCoverMetadata(asset, coverAsset, coverUrl),
    })
    applyUpdatedAsset(updated)
    removeLocalVideoCover(asset)
    previewError.value = ''
    jumpHint.value = '封面已保存到资产中心。'
  } catch (error) {
    applyLocalVideoCover(asset, file, `封面保存失败，已临时应用本地封面：${messageFromError(error)}`)
  } finally {
    videoCoverUploadingAssetId.value = null
  }
}

function buildVideoCoverMetadata(asset: AssetItem, coverAsset: AssetItem, coverUrl: string) {
  const metadata = parseJsonObject(asset.metadataJson) || {}
  return JSON.stringify({
    ...metadata,
    coverUrl,
    thumbnailUrl: coverUrl,
    posterUrl: coverUrl,
    coverAssetId: coverAsset.assetId,
    coverSource: 'user_upload',
    coverUpdatedAt: new Date().toISOString(),
  })
}

function applyUpdatedAsset(updated: AssetItem) {
  assets.value = assets.value.map((item) => (item.assetId === updated.assetId ? updated : item))
  if (previewAsset.value?.assetId === updated.assetId) {
    previewAsset.value = updated
  }
}

function applyLocalVideoCover(asset: AssetItem, file: File, failureMessage?: string) {
  const reader = new FileReader()
  reader.onload = () => {
    const result = typeof reader.result === 'string' ? reader.result : ''
    if (!result) {
      previewError.value = '封面读取失败，请换一张图片重试。'
      return
    }
    videoCoverOverrides.value = {
      ...videoCoverOverrides.value,
      [String(asset.assetId)]: result,
    }
    persistVideoCoverOverrides()
    previewError.value = failureMessage || ''
    jumpHint.value = failureMessage ? '封面临时预览已应用。' : '已设置本地自选封面。'
  }
  reader.onerror = () => {
    previewError.value = '封面读取失败，请换一张图片重试。'
  }
  reader.readAsDataURL(file)
}

function removeLocalVideoCover(asset: AssetItem) {
  const key = String(asset.assetId)
  if (!videoCoverOverrides.value[key]) return
  const next = { ...videoCoverOverrides.value }
  delete next[key]
  videoCoverOverrides.value = next
  persistVideoCoverOverrides()
}

function clearVideoCoverOverride(asset: AssetItem) {
  const next = { ...videoCoverOverrides.value }
  delete next[String(asset.assetId)]
  videoCoverOverrides.value = next
  persistVideoCoverOverrides()
  jumpHint.value = '已恢复系统封面。'
}

function videoDurationText(asset: AssetItem) {
  const loaded = videoDurationByAssetId.value[asset.assetId]
  if (loaded) {
    return loaded
  }
  const seconds = metadataDurationSeconds(asset)
  return seconds > 0 ? formatDuration(seconds) : ''
}

function handleVideoMetadataLoaded(asset: AssetItem, event: Event) {
  const video = event.currentTarget as HTMLVideoElement | null
  const duration = video?.duration
  if (!Number.isFinite(duration) || !duration || duration <= 0) {
    return
  }
  videoDurationByAssetId.value = {
    ...videoDurationByAssetId.value,
    [asset.assetId]: formatDuration(duration),
  }
}

function metadataDurationSeconds(asset: AssetItem) {
  const metadata = parseJsonObject(asset.metadataJson)
  const direct = [
    metadata?.durationSeconds,
    metadata?.durationSec,
    metadata?.videoDurationSeconds,
    metadata?.videoDuration,
    metadata?.duration,
    metadata?.durationText,
    metadata?.outputDuration,
    metadata?.totalDuration,
  ]
  for (const raw of direct) {
    const seconds = durationSecondsFromValue(raw)
    if (seconds > 0) {
      return seconds
    }
  }
  const millis = durationSecondsFromValue(metadata?.durationMs || metadata?.videoDurationMs || metadata?.durationMillis)
  return millis > 0 ? millis / 1000 : 0
}

function durationSecondsFromValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value !== 'string') {
    return 0
  }
  const text = value.trim()
  if (!text) {
    return 0
  }
  if (/^\d+(\.\d+)?$/.test(text)) {
    return Number(text)
  }
  const timeParts = text.match(/^(\d{1,2}:)?\d{1,2}:\d{1,2}(\.\d+)?$/)
  if (timeParts) {
    return text.split(':').reduce((total, part) => total * 60 + Number(part), 0)
  }
  const secondsMatch = text.match(/(\d+(?:\.\d+)?)\s*(秒|s|sec|secs|second|seconds)/i)
  return secondsMatch ? Number(secondsMatch[1]) : 0
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

function canOpenAssetPreview(asset: AssetItem) {
  return isVideo(asset) || canOpenStructuredPreview(asset)
}

function assetPreviewActionLabel(asset: AssetItem) {
  if (isVideo(asset)) {
    return '预览'
  }
  if (isCarModelBundleAsset(asset) || isSceneMaterialBundleAsset(asset)) {
    return '查看'
  }
  return '预览'
}

function structuredPreviewHint(asset: AssetItem) {
  if (isSceneMaterialBundleAsset(asset)) {
    return '点击预览查看场景图片。'
  }
  if (isBenchmarkAsset(asset)) {
    return '点击预览查看爆款对标文案。'
  }
  if (isStoryboardAsset(asset)) {
    return '点击预览查看分镜结构。'
  }
  return '点击预览查看结构化结果。'
}

function isCarModelBundleAsset(asset: AssetItem) {
  return isCarModelBundleAssetShared(asset)
}

function isSceneMaterialBundleAsset(asset: AssetItem) {
  return isSceneMaterialBundleAssetShared(asset)
}

function isPublicCarBundleComponentImage(asset: AssetItem) {
  if (!isImage(asset) || String(asset.visibility || '').toUpperCase() !== 'PUBLIC') {
    return false
  }
  const metadata = parseJsonObject(asset.metadataJson)
  const role = normalizedAssetRole(asset)
  return (
    asset.assetGroup === CAR_MODEL_BUNDLE_GROUP ||
    stringField(metadata, 'from') === 'car_model_bundle_image' ||
    role.startsWith('car_') ||
    Boolean(metadata?.hiddenInPublicAssetCenter)
  )
}

function isCarBundlePayloadRecord(record: Record<string, unknown>) {
  return stringField(record, 'bundleType') === 'car_model' || stringField(record, 'assetRole') === 'car_model_bundle'
}

function canAddImageToCarBundle(asset: AssetItem) {
  return !isPetAssetMode.value && hasToken.value && isImage(asset) && !isCarModelBundleAsset(asset)
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

function resultAssetLabel(asset: AssetItem) {
  if (isCarModelBundleAsset(asset)) {
    return '车型素材包'
  }
  if (isSceneMaterialBundleAsset(asset)) {
    return '场景图片'
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
  const workflowTitle = assetWorkflowDisplayTitleShared(asset)
  if (workflowTitle) {
    return workflowTitle
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
  const workflowMeta = assetWorkflowDisplayMetaShared(asset)
  if (workflowMeta) {
    return workflowMeta
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

function assetVisibility(asset: AssetItem) {
  return String(asset.visibility || '').toUpperCase()
}

function avatarVisibility(avatar: AvatarItem) {
  const raw = String(avatar.visibility || '').trim().toUpperCase()
  if (raw === 'PUBLIC' || raw === 'PRIVATE') {
    return raw
  }
  return avatar.ownerUserId == null ? 'PUBLIC' : 'PRIVATE'
}

function avatarVisibilityLabel(avatar: AvatarItem) {
  return avatarVisibility(avatar) === 'PUBLIC' ? '公共' : '私有'
}

function avatarVisibilityPillClass(avatar: AvatarItem) {
  return avatarVisibility(avatar) === 'PUBLIC' ? 'asset-user-public-pill' : 'asset-private-pill'
}

function avatarSourceLabel(avatar: AvatarItem) {
  const sourceType = String(avatar.sourceType || '').trim().toUpperCase()
  if (sourceType === 'AVATAR_GENERATE') return '数字人形象生成'
  if (sourceType === 'AI_GENERATED') return 'AI 生成'
  if (sourceType === 'USER_UPLOAD') return '用户上传'
  return avatar.sourceType || '形象资产'
}

function isPublicAsset(asset: AssetItem) {
  return assetVisibility(asset) === 'PUBLIC'
}

function isOwnedPrivateAsset(asset: AssetItem) {
  return assetVisibility(asset) === 'PRIVATE' &&
    currentUser.value?.userId != null &&
    asset.ownerUserId === currentUser.value.userId
}

function canSavePublicAsset(asset: AssetItem) {
  return hasToken.value && isPublicAsset(asset)
}

function canPublishPrivateAsset(asset: AssetItem) {
  return hasToken.value && isOwnedPrivateAsset(asset) && !isAlreadyPublishedAsset(asset)
}

function canShowAlreadyPublished(asset: AssetItem) {
  return hasToken.value && isOwnedPrivateAsset(asset) && isAlreadyPublishedAsset(asset)
}

function canDeletePrivateAsset(asset: AssetItem) {
  return hasToken.value && isOwnedPrivateAsset(asset)
}

function canDeleteAvatar(avatar: AvatarItem) {
  return hasToken.value && avatar.manageable === true && avatarVisibility(avatar) === 'PRIVATE'
}

function normalizedAssetRole(asset: AssetItem | null | undefined) {
  return normalizedAssetRoleShared(asset)
}

function isBenchmarkAsset(asset: AssetItem | null | undefined) {
  return isBenchmarkAssetShared(asset)
}

function isStoryboardAsset(asset: AssetItem | null | undefined) {
  return isStoryboardAssetShared(asset)
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

async function copyAvatarLink(avatar: AvatarItem) {
  const url = resolveFileUrl(avatar.previewUrl || '')
  if (!url || url === '#') {
    errorMessage.value = '该数字人暂无可复制的预览链接'
    return
  }
  try {
    await navigator.clipboard.writeText(url)
    jumpHint.value = '已复制数字人图片链接。'
    window.setTimeout(() => {
      if (jumpHint.value === '已复制数字人图片链接。') {
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
  previewError.value = ''
  previewPayload.value = null
  previewShotIndex.value = -1
  if (isVideo(asset)) {
    previewLoading.value = false
    return
  }
  previewLoading.value = true
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

async function handleDeleteAvatar(avatar: AvatarItem) {
  if (loading.value) {
    return
  }
  const ok = window.confirm(`确认删除该数字人形象？\n${avatar.avatarName}`)
  if (!ok) {
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    await deleteAvatar(avatar.avatarId)
    avatarAssets.value = avatarAssets.value.filter((item) => item.avatarId !== avatar.avatarId)
    jumpHint.value = '已删除数字人形象。'
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '删除数字人失败'
  } finally {
    loading.value = false
  }
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
  return hasToken.value &&
    isPublicAsset(asset) &&
    currentUser.value?.userId != null &&
    asset.createdByUserId === currentUser.value.userId
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

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : String(error || '未知错误')
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

.asset-business-segment {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  gap: 8px;
}

.asset-business-btn {
  display: grid;
  min-height: 64px;
  align-content: center;
  gap: 4px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: #344054;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
}

.asset-business-btn:hover:not(:disabled),
.asset-business-btn-active {
  border-color: #bfdbfe;
  background: #eff6ff;
  color: #2563eb;
}

.asset-business-btn:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.asset-business-btn strong {
  overflow: hidden;
  font-size: 13px;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-business-btn span {
  overflow: hidden;
  color: #667085;
  font-size: 12px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.avatar-asset-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
  min-height: 300px;
  border: 1px solid var(--hs-border);
  border-radius: 8px;
  background: #fff;
  padding: 16px;
}

.avatar-asset-card {
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 10px;
  border: 1px solid var(--hs-border);
  border-radius: 8px;
  background: #fcfcff;
  padding: 12px;
}

.avatar-asset-cover {
  display: grid;
  aspect-ratio: 3 / 4;
  place-items: center;
  overflow: hidden;
  border-radius: 8px;
  background: #eef2ff;
  color: var(--hs-primary);
  font-size: 13px;
  font-weight: 850;
}

.avatar-asset-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-asset-body {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.avatar-asset-body strong {
  overflow: hidden;
  color: var(--hs-text);
  font-size: 15px;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.avatar-asset-body p {
  margin: 0;
  color: var(--hs-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.avatar-asset-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.avatar-asset-actions .app-secondary-button {
  min-height: 32px;
  padding: 6px 8px;
  font-size: 12px;
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

.asset-pagination-row {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 4px 0 2px;
}

.asset-pagination-done {
  color: #94a3b8;
  font-size: 12px;
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

.asset-business-pill {
  border-color: #bbf7d0;
  background: #ecfdf3;
  color: #027a48;
}

.asset-developer-pill {
  border-color: #bbf7d0;
  background: #ecfdf3;
  color: #15803d;
}

.asset-user-public-pill {
  border-color: #fde68a;
  background: #fffbeb;
  color: #92400e;
}

.asset-private-pill {
  border-color: #e5e7eb;
  background: #f8fafc;
  color: #64748b;
}

.asset-developer-feature-pill {
  border-color: #d8b4fe;
  background: #faf5ff;
  color: #7e22ce;
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

.asset-row-preview audio {
  width: 320px;
  max-width: 100%;
}

.asset-video-thumb {
  position: relative;
  width: 320px;
  max-width: 100%;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 10px;
  background: #0f172a;
  aspect-ratio: 16 / 9;
}

.asset-video-thumb video,
.asset-video-thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.asset-video-thumb video {
  pointer-events: none;
}

.asset-video-play {
  position: absolute;
  top: 50%;
  left: 50%;
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  font-size: 15px;
  line-height: 1;
  transform: translate(-50%, -50%);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.2);
}

.asset-video-cover-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  color: #1d4ed8;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 850;
  line-height: 1;
}

.asset-video-duration {
  position: absolute;
  right: 8px;
  bottom: 8px;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.78);
  color: #ffffff;
  padding: 4px 7px;
  font-size: 12px;
  font-weight: 850;
  line-height: 1;
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

.asset-preview-video-player {
  display: grid;
  gap: 12px;
}

.asset-preview-video-player video {
  width: 100%;
  max-height: min(62vh, 620px);
  border-radius: 12px;
  background: #020617;
}

.asset-preview-video-meta {
  display: grid;
  gap: 4px;
  border: 1px solid #edf0f6;
  border-radius: 12px;
  background: #fbfcff;
  padding: 12px;
}

.asset-preview-video-meta strong {
  color: #111827;
}

.asset-preview-video-meta small {
  color: #667085;
  line-height: 1.5;
}

.asset-video-cover-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
}

.asset-video-cover-tools > span {
  display: inline-flex;
  min-height: 26px;
  align-items: center;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 850;
}

.asset-video-cover-tools label,
.asset-video-cover-tools button {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  justify-content: center;
  border: 1px solid #d9e1ec;
  border-radius: 8px;
  background: #ffffff;
  color: #172033;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 850;
  cursor: pointer;
}

.asset-video-cover-tools input {
  display: none;
}

.asset-video-cover-tools button {
  color: #1d4ed8;
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

.asset-center-panel {
  gap: 16px;
}

.asset-center-head {
  grid-template-columns: minmax(220px, 0.48fr) minmax(0, 1.52fr);
}

.asset-center-head h2 {
  color: var(--hs-text);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0;
}

.asset-center-head p {
  color: var(--hs-text-muted);
}

.asset-header-actions {
  grid-template-columns:
    repeat(3, minmax(128px, 1fr))
    minmax(142px, 0.8fr)
    minmax(128px, 0.7fr)
    minmax(190px, 1.2fr)
    auto;
}

.asset-category-segment,
.asset-scope-segment {
  border-radius: 8px;
  background: #f3f4f6;
}

.asset-category-segment {
  border-color: var(--hs-border);
  background: var(--hs-surface-muted);
}

.asset-stage-btn,
.asset-scope-btn,
.asset-view-segment button {
  border-radius: 6px;
  font-weight: 650;
}

.asset-stage-btn:hover:not(:disabled),
.asset-stage-btn-active {
  border-color: #bfdbfe;
  background: var(--hs-primary-soft);
  color: var(--hs-primary);
}

.asset-view-segment {
  display: inline-flex;
  min-height: 36px;
  border: 1px solid var(--hs-border);
  border-radius: 8px;
  background: var(--hs-surface-muted);
  padding: 3px;
}

.asset-view-segment button {
  border: 0;
  background: transparent;
  color: var(--hs-text-muted);
  padding: 0 10px;
  font-size: 12.5px;
  cursor: pointer;
}

.asset-view-segment button.active {
  background: #fff;
  color: var(--hs-primary);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}

.asset-type-select,
.asset-search {
  border-radius: 6px;
  background-color: #fff;
}

.asset-type-select:focus,
.asset-search:focus {
  border-color: var(--hs-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.app-selected-project,
.asset-context-actions {
  border-color: #bfdbfe;
  border-radius: 8px;
  background: var(--hs-primary-soft);
  color: var(--hs-primary);
}

.asset-file-list,
.asset-empty,
.voice-library-list {
  border: 1px solid var(--hs-border);
  border-radius: 8px;
  background: #fff;
  box-shadow: none;
}

.asset-file-list--grid {
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  align-items: stretch;
}

.asset-file-list--grid .app-file-item {
  display: grid;
  grid-template-rows: 1fr auto;
  grid-template-columns: 1fr;
  gap: 12px;
  min-height: 100%;
  border-color: var(--hs-border);
  border-radius: 8px;
  background: #fff;
  padding: 12px;
}

.asset-file-list--list .app-file-item {
  display: flex;
  border-color: var(--hs-border);
  border-radius: 8px;
  background: #fff;
}

.asset-file-list .app-file-item:hover {
  border-color: #bfdbfe;
  background: #fff;
}

.asset-file-list--grid .asset-row-main {
  display: grid;
  grid-template-rows: auto minmax(38px, auto) minmax(32px, auto) 1fr;
  gap: 8px;
  min-width: 0;
}

.asset-file-list--grid .asset-row-preview {
  order: -1;
}

.asset-file-list--grid .asset-row-preview img,
.asset-file-list--grid .asset-video-thumb,
.asset-file-list--grid .asset-result-card {
  width: 100%;
}

.asset-file-list--grid .asset-row-preview img,
.asset-file-list--grid .asset-video-thumb {
  aspect-ratio: 16 / 10;
  height: auto;
  border-radius: 6px;
  object-fit: cover;
}

.asset-file-list--grid .asset-row-title {
  display: -webkit-box;
  min-height: 42px;
  overflow: hidden;
  white-space: normal;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-height: 1.45;
}

.asset-file-list--grid .asset-row-meta {
  min-height: 38px;
}

.asset-file-list--grid .asset-row-tags {
  min-height: 32px;
  align-content: start;
}

.asset-row-title {
  color: var(--hs-text);
  font-size: 14px;
  font-weight: 700;
}

.asset-row-meta {
  color: var(--hs-text-muted);
  font-size: 12px;
  line-height: 1.55;
}

.asset-group-pill {
  border-color: #bfdbfe;
  background: var(--hs-primary-soft);
  color: var(--hs-primary);
}

.asset-business-pill {
  border-color: #bbf7d0;
  background: #ecfdf3;
  color: #027a48;
}

.asset-file-list--grid .asset-row-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: stretch;
  width: 100%;
  align-self: end;
  margin-top: auto;
}

.asset-file-list--grid .asset-row-actions .app-secondary-button {
  min-height: 32px;
  padding: 6px 8px;
  font-size: 12px;
}

.asset-result-card {
  border-radius: 6px;
  background: var(--hs-surface-muted);
}

.asset-row-highlight {
  outline: 2px solid #bfdbfe;
  background: var(--hs-primary-soft) !important;
}

.asset-preview-modal,
.asset-modal {
  border-radius: 8px;
}

@media (max-width: 980px) {
  .asset-center-head {
    grid-template-columns: 1fr;
  }

  .asset-header-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .asset-view-segment {
    width: 100%;
  }

  .asset-view-segment button {
    flex: 1;
  }
}

@media (max-width: 640px) {
  .asset-header-actions {
    grid-template-columns: 1fr;
  }

  .asset-stage-segment {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .asset-business-segment {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .asset-stage-btn {
    min-height: 34px;
    padding: 0 8px;
  }

  .asset-business-btn {
    min-height: 58px;
  }
}
</style>
