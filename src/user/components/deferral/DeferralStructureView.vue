<script setup>
// "How the task is organized" (deferral branch), adapted from the function
// task's FuncExtrStructureView.vue. Shown after practice, before the quiz;
// failing the quiz returns here (design.js).
import useViewAPI from '@/core/composables/useViewAPI'
import { Button } from '@/uikit/components/ui/button'
import { ConstrainedTaskWindow } from '@/uikit/layouts'
import { N_BLOCK } from '@/user/utils/sampleDeferral'

const api = useViewAPI()
const N_TOTAL = N_BLOCK[1] + N_BLOCK[2] + N_BLOCK[3]

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
    <div class="flex flex-col gap-5 max-w-2xl mx-auto px-6 py-6 text-left">
      <h1 class="text-xl font-bold">How the task is organized</h1>

      <p class="text-base">
        There are three phases, {{ N_TOTAL }} students in all. For each student you check their work on three
        problems, mark each one right or wrong, and choose the advice you would give them.
      </p>

      <ol class="list-decimal pl-6 space-y-2 text-base">
        <li><strong>Phase 1 ({{ N_BLOCK[1] }} students).</strong> You check and advise each student.</li>
        <li>
          <strong>Phase 2 ({{ N_BLOCK[2] }} students).</strong> You check and advise, then see the AI's marks and
          advice for the same student.
        </li>
        <li>
          <strong>Phase 3 ({{ N_BLOCK[3] }} students).</strong> You decide whether to do these students yourself, or
          <strong>defer</strong> them to the AI (the same AI as in Phase 2). If you defer, you do not answer at all:
          you just watch the AI go through the students. <strong>This choice cannot be changed.</strong>
        </li>
      </ol>

      <h2 class="text-lg font-semibold">Bonus</h2>
      <ul class="list-disc pl-6 space-y-2 text-base">
        <li>You can earn up to <strong>$2</strong> in bonus pay, based on your performance in all three phases.</li>
        <li><strong>If you defer in Phase 3, how well the AI does counts towards your bonus.</strong></li>
      </ul>

      <p class="text-sm text-muted-foreground">There is a short quiz on this next, then the task.</p>

      <div class="flex justify-end">
        <Button variant="default" id="structure-continue" @click="finish()">
          Continue
          <i-fa6-solid-arrow-right class="ml-2" />
        </Button>
      </div>
    </div>
  </ConstrainedTaskWindow>
</template>
