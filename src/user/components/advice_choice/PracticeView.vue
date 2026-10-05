<script setup>
// Experiment 3 practice (user decision 2026-10-05). An intro screen, then the
// items in data/practice_exp3.json (built by base-task/practice_exp3.py): one
// problem each, shown like a trial card but with the work already visible (no
// Show work step: that is for the real trials only, user 2026-10-05). The
// participant marks it right or wrong; the mark then locks, the error step (if
// any) is highlighted, and feedback says whether the mark was correct and
// explains why, either way. Items with correct_mark 'right' are correctly solved. No advice choice in practice. Not scored. A final
// "ready" screen introduces the real task; its Start button begins the trials.
import { ref, computed, watch } from 'vue'
import useViewAPI from '@/core/composables/useViewAPI'
import { Button } from '@/uikit/components/ui/button'
import { ConstrainedTaskWindow } from '@/uikit/layouts'
import practiceItems from '@/user/data/practice_exp3.json'
import StudentWork from '@/user/components/advice_choice/StudentWork.vue'

const api = useViewAPI()

const steps = api.steps.append([{ id: 'intro' }])
steps.append(practiceItems.map((it) => ({ ...it })))
steps.append([{ id: 'ready' }])

const isIntro = computed(() => api.path[0] === 'intro')
const isReady = computed(() => api.path[0] === 'ready')

const marks = ref({})
const answered = ref(false)

function resetItem() {
  marks.value = {}
  answered.value = false
  api.startTimer()
}
watch(() => api.stepIndex, resetItem)
resetItem()

function onMark({ problem, mark }) {
  if (answered.value) return
  marks.value = { [problem]: mark }
  answered.value = true
  Object.assign(api.stepData, {
    mark,
    mark_correct: mark === api.stepData.correct_mark,
    mark_rt_ms: Math.round(api.elapsedTime()),
  })
}

const correct = computed(() => api.stepData.mark_correct)
const verdict = computed(() =>
  api.stepData.correct_mark === 'wrong' ? 'This work has a mistake.' : 'This work is right.'
)

function next() {
  if (!isIntro.value && !isReady.value) api.recordStep()
  if (api.isLastStep()) {
    api.saveData(true)
    api.goNextView()
  } else {
    api.goNextStep()
  }
}

function autofill() {
  while (api.stepIndex < api.nSteps) {
    if (!isIntro.value && !isReady.value) {
      Object.assign(api.stepData, { mark: 'wrong', mark_correct: true, mark_rt_ms: 6000 })
    }
    api.recordStep()
    if (api.isLastStep()) break
    api.goNextStep()
  }
}
api.setAutofill(autofill)
</script>

<template>
  <ConstrainedTaskWindow
    variant="ghost"
    :responsiveUI="api.config.responsiveUI"
    :width="api.config.windowsizerRequest.width"
    :height="api.config.windowsizerRequest.height"
  >
    <div v-if="isIntro" class="w-[80%] text-left">
      <h1 class="text-2xl font-bold mb-4">Practice</h1>
      <p class="text-lg mb-4">Now you will practice with a few examples.</p>
      <p class="text-lg mb-4">
        Each example shows a student's work on <strong>one problem</strong>. Check the work and mark it
        <strong>right</strong> or <strong>wrong</strong>. We will tell you if you are correct and explain why.
      </p>
      <div class="flex justify-end mt-6">
        <Button id="start-practice" @click="next()">
          Start practice
          <i-fa6-solid-arrow-right />
        </Button>
      </div>
    </div>

    <div v-else-if="isReady" class="w-[80%] text-left">
      <h1 class="text-2xl font-bold mb-4">Now the real task</h1>
      <p class="text-lg mb-4">
        You have finished the practice. Now you will see the work of <strong>12 students</strong>, one at a time,
        each on <strong>three problems</strong>.
      </p>
      <p class="text-lg mb-2">For each student:</p>
      <ol class="text-lg mb-4 list-decimal pl-6 space-y-1">
        <li>Open each problem, check the work, and mark it <strong>right</strong> or <strong>wrong</strong>.</li>
        <li>Then choose the advice you would give the student.</li>
      </ol>
      <div class="flex justify-end mt-6">
        <Button id="start-task" @click="next()">
          Start
          <i-fa6-solid-arrow-right />
        </Button>
      </div>
    </div>

    <div v-else class="text-left w-full h-full overflow-y-auto px-2">
      <div class="flex justify-between items-baseline gap-4 mb-3">
        <p class="text-muted-foreground">
          Here is {{ api.stepData.student_name }}'s work on one problem. Check the work and mark it right or wrong.
        </p>
        <span class="text-xs text-muted-foreground whitespace-nowrap shrink-0">
          Practice {{ api.stepIndex }} of {{ practiceItems.length }}
        </span>
      </div>

      <StudentWork
        :problems="[api.stepData.problem]"
        :revealed="[api.stepData.problem.problem_index]"
        :canReveal="false"
        :marks="marks"
        :marksLocked="answered"
        :highlightErrors="answered"
        class="mb-5"
        @mark="onMark"
      />

      <div
        v-if="answered"
        id="feedback"
        class="max-w-lg mx-auto rounded-lg border-2 px-4 py-3 mb-5"
        :class="correct ? 'border-green-600 bg-green-50' : 'border-red-600 bg-red-50'"
      >
        <p class="font-semibold mb-1" :class="correct ? 'text-green-800' : 'text-red-800'">
          {{ correct ? 'Correct!' : 'Not quite.' }} {{ verdict }}
        </p>
        <p class="text-sm">{{ api.stepData.explanation }}</p>
      </div>

      <div class="flex justify-end max-w-lg mx-auto">
        <Button id="next" :disabled="!answered" @click="next()">Next</Button>
      </div>
    </div>
  </ConstrainedTaskWindow>
</template>
