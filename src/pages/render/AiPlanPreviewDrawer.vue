<template>
  <Teleport to="body">
    <div v-if="modelValue" class="ai-plan-backdrop" @click.self="$emit('update:modelValue', false)">
      <aside class="ai-plan-drawer" aria-label="AI 方案预览与确认">
        <header class="ai-plan-head">
          <span class="ai-plan-step">1</span>
          <div>
            <p class="ai-plan-kicker">生成前确认</p>
            <h2>AI 已为你生成方案</h2>
            <p>请确认文案、分镜、配置、积分和预计耗时，确认后开始生成视频。</p>
          </div>
          <button type="button" class="ai-plan-close" aria-label="关闭方案预览" @click="$emit('update:modelValue', false)">×</button>
        </header>

        <div class="ai-plan-body">
          <div v-if="loading" class="ai-plan-loading">
            <span class="ai-plan-loading-mark"></span>
            <div>
              <strong>正在生成方案</strong>
              <span>文案、分镜和积分估算会依次准备。</span>
            </div>
          </div>

          <p v-if="error" class="ai-plan-error">{{ error }}</p>

          <template v-if="plan">
            <div class="ai-plan-workspace">
              <section class="ai-plan-card ai-plan-script-card">
                <div class="ai-plan-card-head">
                  <span>文案预览</span>
                  <button type="button">可编辑</button>
                </div>
                <textarea
                  :value="plan.script"
                  rows="12"
                  maxlength="3000"
                  @input="$emit('update-script', ($event.target as HTMLTextAreaElement).value)"
                />
                <small v-if="plan.scriptFallback">文案接口不可用时使用本地兜底方案，可继续编辑。</small>
              </section>

              <section class="ai-plan-card ai-plan-storyboard-card">
                <div class="ai-plan-card-head">
                  <span>分镜预览</span>
                  <button type="button">{{ plan.storyboard.length }} 个镜头</button>
                </div>
                <div class="ai-plan-storyboard">
                  <article v-for="shot in plan.storyboard" :key="shot.index">
                    <div class="ai-plan-shot-thumb">{{ shot.index }}</div>
                    <div>
                      <div class="ai-plan-shot-title">
                        <strong>镜头 {{ shot.index }}</strong>
                        <span>{{ shot.duration }}s</span>
                      </div>
                      <p>{{ shot.visual }}</p>
                      <small>{{ shot.narration }}</small>
                    </div>
                  </article>
                </div>
                <small v-if="plan.storyboardFallback">分镜接口不可用时使用本地兜底分镜。</small>
              </section>

              <aside class="ai-plan-card ai-plan-config-card" aria-label="配置与预览">
                <div class="ai-plan-card-head">
                  <span>配置信息</span>
                  <button type="button">预览占位</button>
                </div>
                <div class="ai-plan-phone-preview">
                  <div class="ai-plan-phone-top">9:16</div>
                  <strong>{{ plan.script.split('\n')[0] || '汽车销售短视频' }}</strong>
                  <span>{{ plan.totalDuration }} 秒 · {{ plan.segmentCount }} 段</span>
                  <div class="ai-plan-phone-play">播放预览</div>
                </div>
                <div class="ai-plan-config-list">
                  <span v-for="item in plan.configItems" :key="item">{{ item }}</span>
                </div>
              </aside>
            </div>

            <section class="ai-plan-metrics">
              <div>
                <span>预计消耗积分</span>
                <strong>{{ plan.estimatedCredits }}</strong>
                <small v-if="plan.balance != null">余额 {{ plan.balance }}</small>
                <small v-else>未获取余额</small>
              </div>
              <div>
                <span>预计生成时长</span>
                <strong>{{ plan.estimatedDuration }}</strong>
                <small>{{ plan.segmentCount }} 段 · {{ plan.totalDuration }} 秒</small>
              </div>
              <div>
                <span>素材复用</span>
                <strong>{{ plan.materialCount }} 个</strong>
                <small>{{ plan.vehicleMaterialCount }} 份车辆素材</small>
              </div>
            </section>

            <p v-if="plan.enoughBalance === false" class="ai-plan-warning">
              当前积分余额不足，建议充值或降低生成配置后再提交。
            </p>

            <section v-if="plan.warnings.length" class="ai-plan-warning-list">
              <strong>提示</strong>
              <ul class="ai-plan-warnings">
                <li v-for="item in plan.warnings" :key="item">{{ item }}</li>
              </ul>
            </section>
          </template>
        </div>

        <footer class="ai-plan-footer">
          <button type="button" class="app-secondary-button" :disabled="loading" @click="$emit('back')">返回编辑</button>
          <button
            type="button"
            class="app-secondary-button"
            :disabled="loading"
            @click="$emit('refresh')"
          >
            重新生成方案
          </button>
          <button
            type="button"
            class="app-primary-button"
            :disabled="loading || !plan || plan.enoughBalance === false"
            @click="$emit('confirm')"
          >
            确认生成（{{ plan?.estimatedCredits ?? 0 }} 积分）
          </button>
        </footer>
      </aside>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { AiPlanPreview } from './carSalesPlanDraft'

defineProps<{
  modelValue: boolean
  loading: boolean
  error: string
  plan: AiPlanPreview | null
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
  'update-script': [value: string]
  refresh: []
  confirm: []
  back: []
}>()
</script>

<style scoped>
.ai-plan-drawer,
.ai-plan-drawer * {
  box-sizing: border-box;
}

.ai-plan-backdrop {
  position: fixed;
  z-index: 2000;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.34);
  padding: 24px;
}

.ai-plan-drawer {
  display: flex;
  width: min(1120px, calc(100vw - 48px));
  max-height: min(760px, calc(100vh - 48px));
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.22);
}

.ai-plan-head,
.ai-plan-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border-bottom: 1px solid #e6ecf7;
  padding: 18px 22px;
}

.ai-plan-head {
  position: relative;
}

.ai-plan-footer {
  border-top: 1px solid #e6ecf7;
  border-bottom: 0;
  background: #fbfcff;
}

.ai-plan-step {
  display: grid;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  background: #155eef;
  color: #fff;
  font-size: 15px;
  font-weight: 900;
}

.ai-plan-kicker,
.ai-plan-head h2,
.ai-plan-head p {
  margin: 0;
}

.ai-plan-kicker {
  color: #155eef;
  font-size: 12px;
  font-weight: 850;
}

.ai-plan-head h2 {
  margin-top: 3px;
  color: #101828;
  font-size: 22px;
  font-weight: 900;
  line-height: 1.2;
}

.ai-plan-head p:not(.ai-plan-kicker) {
  margin-top: 5px;
  color: #667085;
  font-size: 13px;
  line-height: 1.5;
}

.ai-plan-close {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #fff;
  color: #667085;
  cursor: pointer;
  font-size: 22px;
  line-height: 1;
}

.ai-plan-body {
  display: grid;
  flex: 1;
  align-content: start;
  gap: 14px;
  overflow-y: auto;
  padding: 18px 22px;
}

.ai-plan-loading {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #d9ddff;
  border-radius: 8px;
  background: #f5f7ff;
  padding: 14px;
}

.ai-plan-loading-mark {
  width: 11px;
  height: 11px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #155eef;
  box-shadow: 0 0 0 6px rgba(21, 94, 239, 0.12);
}

.ai-plan-loading strong,
.ai-plan-loading span {
  display: block;
}

.ai-plan-loading strong {
  color: #101828;
  font-size: 14px;
  font-weight: 900;
}

.ai-plan-loading span {
  margin-top: 2px;
  color: #667085;
  font-size: 12px;
}

.ai-plan-workspace {
  display: grid;
  grid-template-columns: minmax(260px, 0.92fr) minmax(300px, 1.08fr) minmax(240px, 0.72fr);
  gap: 14px;
}

.ai-plan-card {
  display: grid;
  min-width: 0;
  align-content: start;
  gap: 12px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #fff;
  padding: 14px;
}

.ai-plan-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.ai-plan-card-head span {
  color: #101828;
  font-size: 14px;
  font-weight: 900;
}

.ai-plan-card-head button {
  min-height: 28px;
  border: 1px solid #d9ddff;
  border-radius: 8px;
  background: #fff;
  color: #155eef;
  font-size: 12px;
  font-weight: 850;
  padding: 0 10px;
}

.ai-plan-script-card textarea {
  width: 100%;
  min-height: 260px;
  border: 1px solid #e6ecf7;
  border-radius: 8px;
  background: #fbfcff;
  color: #344054;
  font-size: 13px;
  line-height: 1.75;
  padding: 12px;
  resize: vertical;
}

.ai-plan-script-card small,
.ai-plan-storyboard-card > small {
  color: #667085;
  font-size: 12px;
  line-height: 1.5;
}

.ai-plan-storyboard {
  display: grid;
  gap: 10px;
}

.ai-plan-storyboard article {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  border: 1px solid #e6ecf7;
  border-radius: 8px;
  background: #fbfcff;
  padding: 10px;
}

.ai-plan-shot-thumb {
  display: grid;
  aspect-ratio: 16 / 10;
  place-items: center;
  border-radius: 8px;
  background: linear-gradient(135deg, #dbeafe, #eef2ff);
  color: #155eef;
  font-size: 18px;
  font-weight: 900;
}

.ai-plan-shot-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ai-plan-shot-title strong {
  color: #101828;
  font-size: 13px;
  font-weight: 900;
}

.ai-plan-shot-title span,
.ai-plan-storyboard small,
.ai-plan-storyboard p {
  margin: 0;
  color: #667085;
  font-size: 12px;
  line-height: 1.55;
}

.ai-plan-storyboard p {
  margin-top: 4px;
  color: #344054;
  font-size: 13px;
}

.ai-plan-config-card {
  background: #fbfcff;
}

.ai-plan-phone-preview {
  position: relative;
  display: grid;
  aspect-ratio: 9 / 16;
  min-height: 280px;
  align-content: end;
  gap: 8px;
  overflow: hidden;
  border-radius: 8px;
  background:
    linear-gradient(180deg, rgba(16, 24, 40, 0.08), rgba(16, 24, 40, 0.86)),
    linear-gradient(135deg, #b7d7f7, #394867 62%, #172033);
  color: #fff;
  padding: 16px;
}

.ai-plan-phone-top {
  position: absolute;
  top: 14px;
  left: 16px;
  transform: none;
  color: rgba(255, 255, 255, 0.72);
  font-size: 11px;
  font-weight: 850;
}

.ai-plan-phone-preview strong {
  font-size: 20px;
  font-weight: 900;
  line-height: 1.25;
}

.ai-plan-phone-preview span {
  color: rgba(255, 255, 255, 0.78);
  font-size: 12px;
  font-weight: 750;
}

.ai-plan-phone-play {
  display: inline-flex;
  width: max-content;
  min-height: 30px;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.36);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  font-size: 12px;
  font-weight: 850;
  padding: 0 12px;
}

.ai-plan-config-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ai-plan-config-list span {
  border: 1px solid #bfdbfe;
  border-radius: 999px;
  background: #eff6ff;
  color: #155eef;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 800;
}

.ai-plan-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  border: 1px solid #e6ecf7;
  border-radius: 8px;
  background: #fbfcff;
  padding: 14px;
}

.ai-plan-metrics div {
  display: grid;
  gap: 4px;
}

.ai-plan-metrics span {
  color: #667085;
  font-size: 12px;
  font-weight: 850;
}

.ai-plan-metrics strong {
  color: #101828;
  font-size: 22px;
  font-weight: 900;
}

.ai-plan-metrics small {
  color: #667085;
  font-size: 12px;
  line-height: 1.5;
}

.ai-plan-error,
.ai-plan-warning,
.ai-plan-warning-list {
  margin: 0;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.6;
}

.ai-plan-error {
  background: #fff1f0;
  color: #d92d20;
}

.ai-plan-warning,
.ai-plan-warning-list {
  border: 1px solid #fedf89;
  background: #fffbeb;
  color: #92400e;
}

.ai-plan-warning-list {
  display: grid;
  gap: 6px;
}

.ai-plan-warning-list strong {
  font-size: 13px;
  font-weight: 900;
}

.ai-plan-warnings {
  display: grid;
  gap: 6px;
  margin: 0;
  padding-left: 18px;
  color: #92400e;
  font-size: 13px;
}

@media (max-width: 980px) {
  .ai-plan-drawer {
    width: min(760px, calc(100vw - 32px));
  }

  .ai-plan-workspace {
    grid-template-columns: 1fr;
  }

  .ai-plan-phone-preview {
    aspect-ratio: 16 / 9;
    min-height: 220px;
  }

  .ai-plan-phone-top {
    position: static;
    transform: none;
  }
}

@media (max-width: 640px) {
  .ai-plan-backdrop {
    align-items: stretch;
    padding: 0;
  }

  .ai-plan-drawer {
    width: 100vw;
    max-height: 100vh;
    border: 0;
    border-radius: 0;
  }

  .ai-plan-head,
  .ai-plan-body,
  .ai-plan-footer {
    padding-right: 14px;
    padding-left: 14px;
  }

  .ai-plan-head {
    align-items: flex-start;
  }

  .ai-plan-head h2 {
    font-size: 20px;
  }

  .ai-plan-footer {
    align-items: stretch;
    flex-direction: column;
  }

  .ai-plan-metrics,
  .ai-plan-storyboard article {
    grid-template-columns: 1fr;
  }

  .ai-plan-phone-preview {
    width: 100%;
    min-height: 180px;
  }
}
</style>
