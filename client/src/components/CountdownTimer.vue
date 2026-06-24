<template>
  <span class="countdown-wrapper" :class="{ urgent: urgent, expired: expired }">
    <el-icon v-if="expired"><Clock /></el-icon>
    <template v-else>
      <el-icon v-if="urgent"><Warning /></el-icon>
      <el-icon v-else><Timer /></el-icon>
    </template>
    <span class="countdown-text">{{ displayText }}</span>
  </span>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import dayjs from 'dayjs'
import { Clock, Warning, Timer } from '@element-plus/icons-vue'

const props = defineProps({
  deadline: { type: [String, Date], required: true }
})

const now = ref(Date.now())
let timer = null

const deadlineMs = computed(() => dayjs(props.deadline).valueOf())
const remaining = computed(() => Math.max(deadlineMs.value - now.value, 0))
const expired = computed(() => remaining.value <= 0)
const urgent = computed(() => !expired.value && remaining.value < 60 * 60 * 1000)

const displayText = computed(() => {
  if (expired.value) return '已截团'
  const total = remaining.value
  const d = Math.floor(total / 86400000)
  const h = Math.floor((total % 86400000) / 3600000)
  const m = Math.floor((total % 3600000) / 60000)
  const s = Math.floor((total % 60000) / 1000)

  if (d > 0) return `${d}天${h}时${m}分`
  if (h > 0) return `${h}时${m}分${s}秒`
  if (m > 0) return `${m}分${s}秒`
  return `${s}秒`
})

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
    if (expired.value && timer) {
      clearInterval(timer)
      timer = null
    }
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style lang="scss" scoped>
.countdown-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  background: #f0f9eb;
  color: #67c23a;

  .countdown-text { font-variant-numeric: tabular-nums; }

  &.urgent {
    background: #fdf6ec;
    color: #e6a23c;
    animation: pulse 1s ease-in-out infinite;
  }

  &.expired {
    background: #fef0f0;
    color: #f56c6c;
    animation: none;
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>
