<script setup>
// The Experiment 3 trial screen (design v2, HANDOFF §0). Each trial: one
// student's work on 3 problems, two pieces of advice (one policy, one instance;
// sides randomized by the sampler), a click to choose, then Next. The choice
// can be changed until Next. No confidence slider (dropped by the user
// 2026-10-05). No manipulation check
// (dropped by the user 2026-10-02), no correctness, no performance bonus.
//
// Progressive reveal (user decision 2026-10-05, replacing the hover
// highlight): the 3 problems start closed (expression only). The participant
// opens any one; REVEAL_DELAY_MS later the next can be opened, in any order.
// OPTIONS_DELAY_MS after the third is opened, the advice options (visible but
// dimmed from the start) become clickable. Locked controls just stay greyed
// out, with no countdown shown (user, 2026-10-05). No error highlighting.
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import useViewAPI from '@/core/composables/useViewAPI'
import { Button } from '@/uikit/components/ui/button'
import { ConstrainedTaskWindow } from '@/uikit/layouts'
import pool from '@/user/data/stimuli_exp3.json'
import advice from '@/user/data/advice_exp3.json'
import { sampleTrialsExp3, randomSeed } from '@/user/utils/sampleTrialsExp3'
import { useMouseTracking } from '@/user/utils/useMouseTracking'
import StudentWork from '@/user/components/advice_choice/StudentWork.vue'
import { mathText } from '@/user/utils/mathText'

const api = useViewAPI()
const mouse = useMouseTracking()

const REVEAL_DELAY_MS = 3000 // after opening a problem, before the next can be opened
const OPTIONS_DELAY_MS = 3000 // after the last problem is opened, before the options unlock

// sample once, persist the seed so a reload mid-experiment keeps the same list
if (!api.persist.isDefined('trialSeed')) api.persist.trialSeed = randomSeed()
const trialList = sampleTrialsExp3(pool, advice, api.persist.trialSeed)

const trials = api.steps.append(trialList.map((t) => ({ id: `trial${t.trial_index}`, ...t })))
trials.append([{ id: 'summary' }])

const isSummary = computed(() => api.path[0] === 'summary')

// per-trial response state, reset on every new trial
const chosenSide = ref(null) // 'left' | 'right'
let firstChoiceMs = null
let choiceMs = null
let nChoiceChanges = 0

// ── progressive reveal ──────────────────────────────────────────────
const revealed = ref([]) // problem indices, in the order opened
const canReveal = ref(true)
const optionsUnlocked = ref(false)
let revealMs = [] // elapsed ms of each opening, same order as `revealed`
let optionsUnlockedMs = null

// A wait is judged against the clock, not a timer firing on time: browsers
// delay timers in background tabs, so `settle()` also runs on every click.
let waitUntil = null // performance.now() deadline of the current wait
let onWaitDone = null
let tickTimer = null

function clearWait() {
  clearInterval(tickTimer)
  tickTimer = waitUntil = onWaitDone = null
}

// finish the current wait if its time is up
function settle() {
  if (waitUntil === null) return
  if (performance.now() < waitUntil) return
  const done = onWaitDone
  clearWait()
  done()
}

// wait `ms`, then run `done`
function wait(ms, done) {
  clearWait()
  waitUntil = performance.now() + ms
  onWaitDone = done
  settle()
  tickTimer = setInterval(settle, 200)
}

function onReveal(problem) {
  settle()
  if (!canReveal.value || revealed.value.includes(problem)) return
  revealed.value = [...revealed.value, problem]
  revealMs.push(api.elapsedTime())
  canReveal.value = false
  if (revealed.value.length < api.stepData.problems.length) {
    wait(REVEAL_DELAY_MS, () => (canReveal.value = true))
  } else {
    wait(OPTIONS_DELAY_MS, () => {
      optionsUnlocked.value = true
      optionsUnlockedMs = api.elapsedTime()
    })
  }
}

onBeforeUnmount(clearWait)

function resetTrial() {
  chosenSide.value = null
  firstChoiceMs = null
  choiceMs = null
  nChoiceChanges = 0
  clearWait()
  revealed.value = []
  canReveal.value = true
  optionsUnlocked.value = false
  revealMs = []
  optionsUnlockedMs = null
  api.startTimer()
  mouse.reset()
}

watch(() => api.stepIndex, () => !isSummary.value && resetTrial())
if (!isSummary.value) resetTrial()
mouse.start()

function choose(side) {
  settle()
  if (!optionsUnlocked.value) return
  const t = api.elapsedTime()
  if (firstChoiceMs === null) firstChoiceMs = t
  else if (side !== chosenSide.value) nChoiceChanges++
  chosenSide.value = side
  choiceMs = t
}

const canSubmit = computed(() => chosenSide.value !== null)

function record(side, rt) {
  const opt = api.stepData.options[side === 'left' ? 0 : 1]
  Object.assign(api.stepData, {
    choice: opt.code,
    choice_side: side,
    choice_scope: opt.scope,
    choice_form: opt.form,
    choose_policy: opt.scope === 'policy',
    ...rt,
    highlight_errors: false,
    counterbalance_id: api.persist.trialSeed,
  })
}

function submit() {
  if (!canSubmit.value) return
  record(chosenSide.value, {
    rt_ms: choiceMs, // trial start -> final choice click (includes the forced waits)
    choice_rt_from_unlock_ms: choiceMs - optionsUnlockedMs, // options unlocked -> final choice
    first_choice_rt_ms: firstChoiceMs,
    submit_rt_ms: api.elapsedTime(),
    n_choice_changes: nChoiceChanges,
    reveal_order: revealed.value.slice(), // e.g. [2, 1, 3]
    reveal_ms: revealMs.map(Math.round), // when each of those was opened
    options_unlocked_ms: Math.round(optionsUnlockedMs),
  })
  api.stepData.mouse = mouse.getPoints()
  api.recordStep()
  api.goNextStep()
}

function autofill() {
  while (api.stepIndex < api.nSteps) {
    if (api.path[0] !== 'summary') {
      const rt = api.faker.rnorm(9000, 2000)
      record(api.faker.rchoice(['left', 'right']), {
        rt_ms: rt,
        choice_rt_from_unlock_ms: rt - 12000,
        first_choice_rt_ms: rt,
        submit_rt_ms: rt + 2500,
        n_choice_changes: 0,
        reveal_order: [1, 2, 3],
        reveal_ms: [2000, 6000, 10000],
        options_unlocked_ms: 13000,
      })
    }
    api.recordStep()
    api.goNextStep()
  }
}
api.setAutofill(autofill)

function finish() {
  api.saveData(true)
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
    <div v-if="!isSummary" class="text-left w-full h-full overflow-y-auto px-2">
      <div class="flex justify-between items-baseline mb-2">
        <p class="text-muted-foreground">Here is {{ api.stepData.student_name }}'s work on three problems:</p>
        <span class="text-xs text-muted-foreground">{{ api.stepIndex + 1 }} of {{ trialList.length }}</span>
      </div>

      <StudentWork
        :problems="api.stepData.problems"
        :revealed="revealed"
        :canReveal="canReveal"
        class="mb-5"
        @reveal="onReveal"
      />

      <p class="font-semibold mb-1">
        Which advice would best help {{ api.stepData.student_name }} get future problems right?
      </p>
      <p class="text-sm text-muted-foreground mb-3 h-5">
        <template v-if="revealed.length < api.stepData.problems.length">Open all three problems to choose.</template>
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <button
          v-for="(opt, i) in api.stepData.options"
          :key="opt.code"
          type="button"
          :id="i === 0 ? 'option-left' : 'option-right'"
          class="text-left rounded-lg border-2 px-4 py-3 transition-colors"
          :class="
            !optionsUnlocked
              ? 'border-border opacity-50 cursor-not-allowed'
              : chosenSide === (i === 0 ? 'left' : 'right')
                ? 'border-primary bg-primary/10 cursor-pointer'
                : 'border-border hover:border-primary/50 hover:bg-muted/40 cursor-pointer'
          "
          :aria-disabled="!optionsUnlocked"
          @click="choose(i === 0 ? 'left' : 'right')"
        >
          {{ mathText(opt.text) }}
        </button>
      </div>

      <div class="flex justify-end">
        <Button id="next" :disabled="!canSubmit" @click="submit()">Next</Button>
      </div>
    </div>

    <div class="text-center" v-else>
      <p class="text-lg text-muted-foreground mb-4" id="prompt">
        Thanks! You are finished with this task and can move on.
      </p>
      <Button variant="default" size="lg" id="finish" @click="finish()">Continue</Button>
    </div>
  </ConstrainedTaskWindow>
</template>
