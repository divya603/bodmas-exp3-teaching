<script setup>
// One student's work on 3 problems, side by side (stacked on narrow screens).
// Each problem shows its expression, then numbered steps. No error
// highlighting (design v2, HANDOFF §0): `problems` come from
// sampleTrialsExp3, where `lines[0]` is the expression and `lines[1..]` the steps.
import { mathText } from '@/user/utils/mathText'

defineProps({
  problems: { type: Array, required: true },
})
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
    <div
      v-for="p in problems"
      :key="p.problem_index"
      class="border border-border rounded-lg px-3 py-2 bg-muted/30"
      :data-problem="p.problem_index"
    >
      <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
        Problem {{ p.problem_index }}
      </p>
      <p class="font-mono text-base font-bold mb-2 whitespace-nowrap">{{ mathText(p.lines[0]) }}</p>
      <div class="font-mono text-sm space-y-0.5">
        <p v-for="(line, i) in p.lines.slice(1)" :key="i" class="whitespace-nowrap">
          <span class="text-muted-foreground text-xs mr-1">Step {{ i + 1 }}:</span>
          = {{ mathText(line) }}
        </p>
      </div>
    </div>
  </div>
</template>
