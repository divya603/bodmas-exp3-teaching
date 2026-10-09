<script setup>
// One student's work on 3 problems, side by side (stacked on narrow screens).
// `problems` come from sampleTrialsExp3: `lines[0]` is the expression,
// `lines[1..]` the steps, and `offsets[i]` how far line i is shifted (in
// character widths) so each step's new number sits under the operator that
// produced it (base-task/stimuli_exp3.py line_offsets). Every character gets
// its own 1ch cell, so the alignment holds even if the font draws ×, ÷ or −
// at a different width.
//
// Layout: "PROBLEM n" header; then small "Step k" labels in a fixed left
// column, and the expression and steps together as one block of math, all the
// same size, expression not bold.
//
// Progressive reveal (user decision 2026-10-05, replacing the hover
// highlight): each card starts showing only its expression and a "Show work"
// button. The parent decides which cards are open (`revealed`) and whether a
// card may be opened right now (`canReveal`; locked buttons just look greyed
// out, no countdown), and gets 'reveal' with the problem index on a click. Hidden
// steps keep their space, so the card does not change height when opened.
// Locked buttons are aria-disabled, not disabled, so a click still reaches the
// parent, which checks the wait against the clock (timers can fire late).
//
// Marking (user decision 2026-10-05): once open, a card shows Right / Wrong
// buttons under the work. `marks` (problem -> 'right' | 'wrong') comes from the
// parent; a click emits 'mark' with { problem, mark }. No feedback is shown.
//
// Practice (PracticeView.vue) also uses this with a single problem, plus
// `marksLocked` (the mark is final) and `highlightErrors` (feedback: the error
// step turns pale yellow). Trials never set these.
//
// Deferral (DeferralExpView.vue, deferral branch) adds `aiMarks` (array of
// 'right' | 'wrong' by problem, shown as an "AI: ..." badge under each card
// once set) and `showMarkButtons` (false when the AI does the trial).
import { mathText } from '@/user/utils/mathText'

defineProps({
  problems: { type: Array, required: true },
  revealed: { type: Array, required: true },
  canReveal: { type: Boolean, default: true },
  marks: { type: Object, default: () => ({}) },
  marksLocked: { type: Boolean, default: false },
  highlightErrors: { type: Boolean, default: false },
  aiMarks: { type: Array, default: null },
  showMarkButtons: { type: Boolean, default: true },
})
const emit = defineEmits(['reveal', 'mark'])

const MARKS = [
  { value: 'right', label: 'Right', on: 'border-green-600 bg-green-50 text-green-800' },
  { value: 'wrong', label: 'Wrong', on: 'border-red-600 bg-red-50 text-red-800' },
]

// one display character per cell; spaces become non-breaking so cells keep width
function cells(line) {
  return [...mathText(line)].map((c) => (c === ' ' ? ' ' : c))
}
</script>

<template>
  <div
    class="grid gap-3"
    :class="problems.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : 'grid-cols-1 sm:grid-cols-3'"
  >
    <div
      v-for="p in problems"
      :key="p.problem_index"
      class="relative border border-border rounded-lg px-3 py-2 bg-muted/30"
      :data-problem="p.problem_index"
    >
      <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        Problem {{ p.problem_index }}
      </p>
      <div class="font-mono text-sm">
        <div
          v-for="(line, i) in p.lines"
          :key="i"
          class="flex items-center leading-6 rounded px-1 -mx-1"
          :class="{
            invisible: i > 0 && !revealed.includes(p.problem_index),
            'error-step': highlightErrors && p.is_error && i === p.error_step,
          }"
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

      <div
        v-if="showMarkButtons"
        class="flex justify-center gap-2 mt-2"
        :class="{ invisible: !revealed.includes(p.problem_index) }"
      >
        <button
          v-for="m in MARKS"
          :key="m.value"
          type="button"
          :id="`mark-${p.problem_index}-${m.value}`"
          class="rounded-md border px-3 py-0.5 text-sm transition-colors"
          :class="[
            marks[p.problem_index] === m.value ? m.on : 'border-border',
            marksLocked ? 'cursor-default' : 'cursor-pointer',
            !marksLocked && marks[p.problem_index] !== m.value ? 'hover:bg-muted/60' : '',
          ]"
          :aria-disabled="marksLocked"
          @click="!marksLocked && emit('mark', { problem: p.problem_index, mark: m.value })"
        >
          {{ m.label }}
        </button>
      </div>

      <div v-if="aiMarks" class="flex justify-center mt-2" :data-ai-mark="p.problem_index">
        <span
          class="rounded-md border-2 border-slate-500 bg-slate-100 px-2 py-0.5 text-sm text-slate-800"
          :id="`ai-mark-${p.problem_index}`"
        >
          AI: {{ aiMarks[p.problem_index - 1] === 'wrong' ? 'Wrong' : 'Right' }}
        </span>
      </div>

      <!-- covers the step rows (not the header or expression) until opened -->
      <div
        v-if="!revealed.includes(p.problem_index)"
        class="absolute inset-x-3 bottom-2 top-[4.25rem] flex items-center justify-center"
      >
        <button
          type="button"
          :id="`reveal-${p.problem_index}`"
          class="rounded-md border px-3 py-1.5 text-sm transition-colors"
          :class="
            canReveal
              ? 'border-primary text-primary hover:bg-primary/10 cursor-pointer'
              : 'border-border text-muted-foreground cursor-not-allowed'
          "
          :aria-disabled="!canReveal"
          @click="emit('reveal', p.problem_index)"
        >
          Show work
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.error-step {
  background-color: #fef3c7; /* pale yellow; the app runs in light mode only */
}
</style>
