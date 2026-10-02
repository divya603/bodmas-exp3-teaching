<script setup>
// One student's work on 3 problems, side by side (stacked on narrow screens).
// `problems` come from sampleTrialsExp3: `lines[0]` is the expression,
// `lines[1..]` the steps, and `offsets[i]` how far line i is shifted (in
// character widths) so each step's new number sits under the operator that
// produced it (base-task/stimuli_exp3.py line_offsets, user request
// 2026-10-02). Every character gets its own 1ch cell, so the alignment holds
// even if the font draws ×, ÷ or − at a different width.
//
// Layout: "PROBLEM n" header; then small "Step k" labels in a fixed left
// column, and the expression and steps together as one block of math, all the
// same size, expression not bold.
//
// Error highlighting (user decision 2026-10-02), `highlight`:
//   'none'    never
//   'hover'   while the pointer is over a problem card, that card's error step
//             (the line labelled "Step k", the one holding the wrong result,
//             same numbering as the flag/correction advice) turns pale yellow;
//             a correctly solved card shows nothing
//   'always'  every error step is highlighted
// Emits 'hover' with { problem, entering } so the view can log nudge use.
import { ref } from 'vue'
import { mathText } from '@/user/utils/mathText'

const props = defineProps({
  problems: { type: Array, required: true },
  highlight: { type: String, default: 'hover' },
})
const emit = defineEmits(['hover'])

const hovered = ref(null)

function enter(p) {
  hovered.value = p
  emit('hover', { problem: p, entering: true })
}
function leave(p) {
  if (hovered.value === p) hovered.value = null
  emit('hover', { problem: p, entering: false })
}

function isLit(p, step) {
  if (props.highlight === 'none' || !p.is_error || step !== p.error_step) return false
  return props.highlight === 'always' || hovered.value === p.problem_index
}

// one display character per cell; spaces become non-breaking so cells keep width
function cells(line) {
  return [...mathText(line)].map((c) => (c === ' ' ? ' ' : c))
}
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
    <div
      v-for="p in problems"
      :key="p.problem_index"
      class="border border-border rounded-lg px-3 py-2 bg-muted/30"
      :data-problem="p.problem_index"
      @mouseenter="enter(p.problem_index)"
      @mouseleave="leave(p.problem_index)"
    >
      <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        Problem {{ p.problem_index }}
      </p>
      <div class="font-mono text-sm">
        <div
          v-for="(line, i) in p.lines"
          :key="i"
          class="flex items-center rounded px-1 -mx-1 leading-6 transition-colors"
          :class="{ 'error-step': i > 0 && isLit(p, i) }"
        >
          <span class="w-11 shrink-0 font-sans text-[10px] text-muted-foreground">
            {{ i > 0 ? `Step ${i}` : '' }}
          </span>
          <span class="w-[1.5ch] shrink-0">{{ i > 0 ? '=' : '' }}</span>
          <span class="whitespace-nowrap" :style="{ paddingLeft: `${p.offsets?.[i] ?? 0}ch` }">
            <span v-for="(c, j) in cells(line)" :key="j" class="inline-block w-[1ch] text-center">{{ c }}</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.error-step {
  background-color: #fef3c7; /* pale yellow; the app runs in light mode only */
}
</style>
