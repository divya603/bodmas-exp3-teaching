<script setup>
// "You are about to start the main task" (deferral branch), adapted from the
// function task's FuncExtrPreTaskView.vue (no key mapping: this task is mouse-only).
import useViewAPI from '@/core/composables/useViewAPI'
import { Button } from '@/uikit/components/ui/button'
import { ConstrainedTaskWindow } from '@/uikit/layouts'

const api = useViewAPI()

function finish() {
  api.goNextView()
}
</script>

<template>
  <ConstrainedTaskWindow
    variant="ghost"
    :responsiveUI="api.config.responsiveUI"
    :width="api.config.windowsizerRequest.width"
    :height="api.config.windowsizerRequest.height"
  >
    <div class="flex flex-col items-start justify-center w-full h-full gap-6 px-8 max-w-2xl mx-auto text-left">
      <h1 class="text-2xl font-bold">You are about to start the main task</h1>

      <p class="text-base max-w-xl">
        For each student, check the work on each problem, mark it right or wrong, and choose the advice you would
        give.
      </p>

      <ul class="list-disc pl-6 space-y-1 text-base max-w-xl">
        <li>
          Phase 1: you check and advise. Phase 2: you check and advise, then see the AI's answer. Phase 3: you choose
          to do it yourself or defer to the AI.
        </li>
        <li>Bonus: up to <strong>$2</strong>, based on your performance.</li>
        <li>If you defer in Phase 3, how well the AI does counts towards your bonus.</li>
      </ul>

      <Button size="lg" id="start-task" @click="finish">Start task</Button>
    </div>
  </ConstrainedTaskWindow>
</template>
