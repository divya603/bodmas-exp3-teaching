<script setup>
// The Experiment 3 trial screen (design v2, HANDOFF §0). Each trial: one
// student's work on 3 problems, two pieces of advice (one policy, one instance;
// sides randomized by the sampler), a click to choose, then a 0-100 confidence
// slider and Next. The choice can be changed until Next. No manipulation check
// (dropped by the user 2026-10-02), no correctness, no performance bonus.
// Hovering a problem card highlights its error step (ERROR_HIGHLIGHT below);
// hover time per card is logged.
import { ref, computed, watch } from 'vue'
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

// error-step highlighting: 'none' | 'hover' | 'always' (see StudentWork.vue).
// 'hover' is the nudge: participants judge advice, not hunt for the error.
const ERROR_HIGHLIGHT = 'hover'

// sample once, persist the seed so a reload mid-experiment keeps the same list
if (!api.persist.isDefined('trialSeed')) api.persist.trialSeed = randomSeed()
const trialList = sampleTrialsExp3(pool, advice, api.persist.trialSeed)

const trials = api.steps.append(trialList.map((t) => ({ id: `trial${t.trial_index}`, ...t })))
trials.append([{ id: 'summary' }])

const isSummary = computed(() => api.path[0] === 'summary')

// per-trial response state, reset on every new trial
const chosenSide = ref(null) // 'left' | 'right'
const confidence = ref(50)
const confidenceTouched = ref(false)
let firstChoiceMs = null
let choiceMs = null
let nChoiceChanges = 0
let hoverMs = [0, 0, 0] // total hover time per problem card
let hoverStart = {} // problem -> elapsed ms when the pointer entered

function onHover({ problem, entering }) {
  const t = api.elapsedTime()
  if (entering) hoverStart[problem] = t
  else if (hoverStart[problem] !== undefined) {
    hoverMs[problem - 1] += t - hoverStart[problem]
    delete hoverStart[problem]
  }
}

// close any open hover at submit, then summarize
function hoverSummary() {
  for (const p of Object.keys(hoverStart)) onHover({ problem: Number(p), entering: false })
  const errorProblems = api.stepData.problems.filter((p) => p.is_error).map((p) => p.problem_index)
  return {
    hover_ms_by_problem: hoverMs.map(Math.round),
    hovered_any: hoverMs.some((ms) => ms > 0),
    hovered_error_problem: errorProblems.some((p) => hoverMs[p - 1] > 0),
  }
}

function resetTrial() {
  chosenSide.value = null
  confidence.value = 50
  confidenceTouched.value = false
  firstChoiceMs = null
  choiceMs = null
  nChoiceChanges = 0
  hoverMs = [0, 0, 0]
  hoverStart = {}
  api.startTimer()
  mouse.reset()
}

watch(() => api.stepIndex, () => !isSummary.value && resetTrial())
if (!isSummary.value) resetTrial()
mouse.start()

function choose(side) {
  const t = api.elapsedTime()
  if (firstChoiceMs === null) firstChoiceMs = t
  else if (side !== chosenSide.value) nChoiceChanges++
  chosenSide.value = side
  choiceMs = t
}

function onSlider() {
  confidenceTouched.value = true
}

const canSubmit = computed(() => chosenSide.value !== null && confidenceTouched.value)

function record(side, conf, rt) {
  const opt = api.stepData.options[side === 'left' ? 0 : 1]
  Object.assign(api.stepData, {
    choice: opt.code,
    choice_side: side,
    choice_scope: opt.scope,
    choice_form: opt.form,
    choose_policy: opt.scope === 'policy',
    confidence: conf,
    ...rt,
    highlight_errors: ERROR_HIGHLIGHT,
    counterbalance_id: api.persist.trialSeed,
  })
}

function submit() {
  if (!canSubmit.value) return
  record(chosenSide.value, Number(confidence.value), {
    rt_ms: choiceMs, // time to the final choice click
    first_choice_rt_ms: firstChoiceMs,
    submit_rt_ms: api.elapsedTime(),
    n_choice_changes: nChoiceChanges,
    ...hoverSummary(),
  })
  api.stepData.mouse = mouse.getPoints()
  api.recordStep()
  api.goNextStep()
}

function autofill() {
  while (api.stepIndex < api.nSteps) {
    if (api.path[0] !== 'summary') {
      const rt = api.faker.rnorm(9000, 2000)
      record(api.faker.rchoice(['left', 'right']), Math.round(api.faker.rnorm(70, 15)), {
        rt_ms: rt,
        first_choice_rt_ms: rt,
        submit_rt_ms: rt + 2500,
        n_choice_changes: 0,
        hover_ms_by_problem: [0, 0, 0],
        hovered_any: false,
        hovered_error_problem: false,
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
        :highlight="ERROR_HIGHLIGHT"
        class="mb-5"
        @hover="onHover"
      />

      <p class="font-semibold mb-3">
        Which advice would best help {{ api.stepData.student_name }} get future problems right?
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <button
          v-for="(opt, i) in api.stepData.options"
          :key="opt.code"
          type="button"
          :id="i === 0 ? 'option-left' : 'option-right'"
          class="text-left rounded-lg border-2 px-4 py-3 transition-colors cursor-pointer"
          :class="
            chosenSide === (i === 0 ? 'left' : 'right')
              ? 'border-primary bg-primary/10'
              : 'border-border hover:border-primary/50 hover:bg-muted/40'
          "
          @click="choose(i === 0 ? 'left' : 'right')"
        >
          {{ mathText(opt.text) }}
        </button>
      </div>

      <div v-if="chosenSide !== null" class="mb-4">
        <p class="font-semibold mb-2">How confident are you in your choice?</p>
        <div class="flex items-center gap-3">
          <span class="text-xs text-muted-foreground w-20 text-right">Not at all confident</span>
          <input
            id="confidence"
            v-model="confidence"
            type="range"
            min="0"
            max="100"
            step="1"
            class="confidence-slider flex-1"
            :class="{ untouched: !confidenceTouched }"
            @input="onSlider"
            @pointerdown="onSlider"
          />
          <span class="text-xs text-muted-foreground w-20">Completely confident</span>
        </div>
        <p class="text-center text-sm text-muted-foreground mt-1">
          {{ confidenceTouched ? confidence : 'Click or drag the slider' }}
        </p>
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

<style scoped>
/* plain track with no fill, and the thumb hidden until the participant
   interacts, so no default value is implied */
.confidence-slider {
  appearance: none;
  -webkit-appearance: none;
  height: 6px;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--muted-foreground) 35%, transparent);
  cursor: pointer;
}
.confidence-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 9999px;
  background: var(--primary);
}
.confidence-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 9999px;
  background: var(--primary);
}
.confidence-slider.untouched::-webkit-slider-thumb {
  opacity: 0;
}
.confidence-slider.untouched::-moz-range-thumb {
  opacity: 0;
}
</style>
