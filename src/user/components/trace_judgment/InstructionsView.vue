<script setup>
import useViewAPI from '@/core/composables/useViewAPI'
import { Button } from '@/uikit/components/ui/button'
import { ConstrainedTaskWindow } from '@/uikit/layouts'

const api = useViewAPI()

function finish() {
  api.goFirstStep()
  api.goNextView()
}
</script>

<!--
  Experiment 3 design v2 instructions (HANDOFF §0), drafted 2026-10-05 from the
  user's wording (the word "teacher" removed at the user's request): the
  participant checks a student's work on
  three problems, marks each right or wrong, then picks the advice that helps
  the student learn and do better on the next problems. No bonus, no practice.
  The numbers mirror the task code: 12 students = the trial count in
  utils/sampleTrialsExp3.js. Change them together. (Earlier YES/NO wording for
  the 2026-09-16 design is in git history.)
-->
<template>
  <ConstrainedTaskWindow
    variant="ghost"
    :responsiveUI="api.config.responsiveUI"
    :width="api.config.windowsizerRequest.width"
    :height="api.config.windowsizerRequest.height"
  >
    <div class="w-[80%] h-[80%] overflow-y-auto">
      <h1 class="text-2xl font-bold mb-4">
        <i-material-symbols-integration-instructions class="inline-block mr-2 text-3xl" /> Instructions
      </h1>

      <p class="text-left text-lg mb-4">
        In this study, you will see what a student did on <strong>three math problems</strong>, with their work
        written out step by step.
      </p>

      <p class="text-left text-lg mb-2"><strong>Your job, for each student:</strong></p>
      <ol class="text-left text-lg mb-4 list-decimal pl-6 space-y-1">
        <li>Open each problem and <strong>check their work</strong>. Mark it <strong>right</strong> or <strong>wrong</strong>.</li>
        <li>
          Then <strong>choose the advice</strong> you think will best help the student learn, so they do better on
          the next problems they solve.
        </li>
      </ol>

      <p class="text-left text-lg mb-2"><strong>Order of operations</strong> (to check the work):</p>
      <ol class="text-left text-lg mb-4 list-decimal pl-6 space-y-1">
        <li>Work out what is inside brackets first.</li>
        <li>Then × and ÷, working left to right.</li>
        <li>Then + and −, working left to right.</li>
      </ol>
      <p class="text-left text-lg mb-4">
        × and ÷ have the same priority. − and + have the same priority.
      </p>

      <p class="text-left text-lg mb-4">You will help <strong>12 students</strong>, one at a time.</p>

      <hr class="border-gray-300 my-4" />

      <div class="flex justify-end">
        <Button variant="default" @click="finish()">
          Next
          <i-fa6-solid-arrow-right />
        </Button>
      </div>
    </div>
  </ConstrainedTaskWindow>
</template>
