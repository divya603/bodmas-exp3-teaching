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
// card may be opened right now (`canReveal`, with `countdown` seconds left
// otherwise), and gets 'reveal' with the problem index on a click. Hidden
// steps keep their space, so the card does not change height when opened.
// Locked buttons are aria-disabled, not disabled, so a click still reaches the
// parent, which checks the wait against the clock (timers can fire late).
import { mathText } from '@/user/utils/mathText'

defineProps({
  problems: { type: Array, required: true },
  revealed: { type: Array, required: true },
  canReveal: { type: Boolean, default: true },
  countdown: { type: Number, default: 0 },
})
const emit = defineEmits(['reveal'])

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
          class="flex items-center leading-6"
          :class="{ invisible: i > 0 && !revealed.includes(p.problem_index) }"
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
          {{ canReveal ? 'Show work' : `Available in ${countdown}s` }}
        </button>
      </div>
    </div>
  </div>
</template>
