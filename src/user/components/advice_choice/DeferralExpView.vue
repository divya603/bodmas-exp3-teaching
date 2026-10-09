<script setup>
// The DEFERRAL task (deferral branch; HANDOFF "Deferral experiment"), modelled
// on the function task's deferral study (Func-Smile-deferral,
// FuncExtrExpView.vue). Steps: intro1 -> 6 trials -> intro2 -> 6 trials ->
// choice -> 6 trials -> summary. One AI per participant (conditions.aiCondition,
// set in design.js); trials and the AI's work come from utils/sampleDeferral.js.
//
// Trial modes (mode_effective):
//   self          the advice task as on main: open each problem, mark it right
//                 or wrong (marking the open one unlocks the next), then choose
//                 advice and press Next.
//   self_then_ai  the same, but Submit locks the answer; the AI box shows "AI
//                 deciding..." for AI_DECIDE_MS, then a button reveals the AI's
//                 marks (a badge under each problem) and its advice pick (tagged
//                 on the option). Next unlocks AI_POST_REVEAL_MS later.
//   defer         phase 3 after choosing to defer: the work is shown open, the
//                 participant does not answer, and the AI's work is revealed the
//                 same way. Phase 3 after choosing "myself" is a self trial.
// No feedback on anyone's correctness. Waits are judged against the clock on
// every click (timers fire late in background tabs).
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import useViewAPI from '@/core/composables/useViewAPI'
import { Button } from '@/uikit/components/ui/button'
import { ConstrainedTaskWindow } from '@/uikit/layouts'
import pool from '@/user/data/stimuli_exp3.json'
import advice from '@/user/data/advice_exp3.json'
import { sampleDeferral, N_BLOCK } from '@/user/utils/sampleDeferral'
import { randomSeed } from '@/user/utils/sampleTrialsExp3'
import { useMouseTracking } from '@/user/utils/useMouseTracking'
import StudentWork from '@/user/components/advice_choice/StudentWork.vue'
import { mathText } from '@/user/utils/mathText'

const api = useViewAPI()
const mouse = useMouseTracking()

const AI_DECIDE_MS = 2500 // "AI deciding..." before the reveal button (function task: 2500)
const AI_POST_REVEAL_MS = 2000 // after the reveal, before Next (function task: 2000)

const aiCondition = api.getConditionByName('aiCondition') ?? 'right' // fallback for dev-mode jumps
if (!api.persist.isDefined('trialSeed')) api.persist.trialSeed = randomSeed()
const trialList = sampleDeferral(pool, advice, api.persist.trialSeed, aiCondition)
const byBlock = (b) => trialList.filter((t) => t.block === b).map((t) => ({ id: `trial${t.trial_index}`, ...t }))

const steps = api.steps.append([{ id: 'intro1', intro: 1 }])
steps.append(byBlock(1))
steps.append([{ id: 'intro2', intro: 2 }])
steps.append(byBlock(2))
steps.append([{ id: 'choice' }])
steps.append(byBlock(3))
steps.append([{ id: 'summary' }])

const stepId = computed(() => api.path[0])
const isIntro = computed(() => stepId.value === 'intro1' || stepId.value === 'intro2')
const isChoice = computed(() => stepId.value === 'choice')
const isSummary = computed(() => stepId.value === 'summary')
const isTrial = computed(() => !isIntro.value && !isChoice.value && !isSummary.value)

if (!api.persist.isDefined('block3Choice')) api.persist.block3Choice = null
const modeEffective = computed(() => {
  const t = api.stepData
  if (t.mode === 'choose') return api.persist.block3Choice === 'defer' ? 'defer' : 'self'
  return t.mode
})
const showsAI = computed(() => modeEffective.value !== 'self')

// ── per-trial state ─────────────────────────────────────────────────
const chosenSide = ref(null)
const revealed = ref([])
const canReveal = ref(true)
const optionsUnlocked = ref(false)
const marks = ref({})
const submitted = ref(false) // participant's answer locked (self_then_ai)
const aiState = ref('idle') // idle | deciding | ready | shown
const canNext = ref(false)
let firstChoiceMs = null
let choiceMs = null
let nChoiceChanges = 0
let revealMs = []
let markEvents = []
let optionsUnlockedMs = null
let submitMs = null
let aiReadyMs = null
let aiRevealMs = null

// clock-checked waits
let waitUntil = null
let onWaitDone = null
let tickTimer = null
function clearWait() {
  clearInterval(tickTimer)
  tickTimer = waitUntil = onWaitDone = null
}
function settle() {
  if (waitUntil === null || performance.now() < waitUntil) return
  const done = onWaitDone
  clearWait()
  done()
}
function wait(ms, done) {
  clearWait()
  waitUntil = performance.now() + ms
  onWaitDone = done
  tickTimer = setInterval(settle, 200)
}
onBeforeUnmount(clearWait)

function startAI() {
  aiState.value = 'deciding'
  wait(AI_DECIDE_MS, () => {
    aiState.value = 'ready'
    aiReadyMs = api.elapsedTime()
  })
}

function resetTrial() {
  clearWait()
  chosenSide.value = null
  marks.value = {}
  submitted.value = false
  aiState.value = 'idle'
  canNext.value = false
  firstChoiceMs = choiceMs = optionsUnlockedMs = submitMs = aiReadyMs = aiRevealMs = null
  nChoiceChanges = 0
  revealMs = []
  markEvents = []
  api.startTimer()
  mouse.reset()
  if (isTrial.value && modeEffective.value === 'defer') {
    revealed.value = api.stepData.problems.map((p) => p.problem_index) // the AI's work is shown open
    canReveal.value = false
    optionsUnlocked.value = false
    startAI()
  } else {
    revealed.value = []
    canReveal.value = true
    optionsUnlocked.value = false
  }
}
watch(() => api.stepIndex, resetTrial)
resetTrial()
mouse.start()

// open -> mark -> next problem; all marked -> options
function onReveal(problem) {
  if (submitted.value || !canReveal.value || revealed.value.includes(problem)) return
  revealed.value = [...revealed.value, problem]
  revealMs.push(Math.round(api.elapsedTime()))
  canReveal.value = false
}
function onMark({ problem, mark }) {
  if (submitted.value || !revealed.value.includes(problem)) return
  marks.value = { ...marks.value, [problem]: mark }
  markEvents.push({ problem, mark, ms: Math.round(api.elapsedTime()) })
  if (!revealed.value.every((p) => marks.value[p])) return
  if (revealed.value.length < api.stepData.problems.length) canReveal.value = true
  else if (!optionsUnlocked.value) {
    optionsUnlocked.value = true
    optionsUnlockedMs = api.elapsedTime()
  }
}
function choose(side) {
  if (!optionsUnlocked.value || submitted.value) return
  const t = api.elapsedTime()
  if (firstChoiceMs === null) firstChoiceMs = t
  else if (side !== chosenSide.value) nChoiceChanges++
  chosenSide.value = side
  choiceMs = t
}

// self: Next records. self_then_ai: Submit locks, then the AI phase.
const canSubmit = computed(() => chosenSide.value !== null && !submitted.value)
function submit() {
  if (!canSubmit.value) return
  submitted.value = true
  submitMs = api.elapsedTime()
  if (modeEffective.value === 'self') finishTrial()
  else startAI()
}
function revealAI() {
  settle()
  if (aiState.value !== 'ready') return
  aiState.value = 'shown'
  aiRevealMs = api.elapsedTime()
  wait(AI_POST_REVEAL_MS, () => (canNext.value = true))
}
function next() {
  settle()
  if (!canNext.value) return
  finishTrial()
}

function markSummary() {
  const probs = api.stepData.problems
  const final = probs.map((p) => marks.value[p.problem_index] ?? null)
  const correct = probs.map((p, i) => (final[i] === null ? null : final[i] === (p.is_error ? 'wrong' : 'right')))
  return {
    marks: final,
    marks_correct: correct,
    n_marked_wrong: final.filter((m) => m === 'wrong').length,
    all_marks_correct: correct.every((c) => c === true),
    target_marked_wrong: final[api.stepData.target.problem - 1] === 'wrong',
    mark_events: markEvents.slice(),
  }
}

function finishTrial() {
  const t = api.stepData
  const deferred = modeEffective.value === 'defer'
  const opt = chosenSide.value ? t.options[chosenSide.value === 'left' ? 0 : 1] : null
  Object.assign(t, {
    mode_effective: modeEffective.value,
    ai_condition: aiCondition,
    block3_choice: t.block === 3 ? api.persist.block3Choice : null,
    // participant's answer (null when deferred)
    choice: opt?.code ?? null,
    choice_side: chosenSide.value,
    choice_scope: opt?.scope ?? null,
    choice_form: opt?.form ?? null,
    choose_policy: opt ? opt.scope === 'policy' : null,
    rt_ms: choiceMs,
    choice_rt_from_unlock_ms: choiceMs !== null && optionsUnlockedMs !== null ? choiceMs - optionsUnlockedMs : null,
    first_choice_rt_ms: firstChoiceMs,
    submit_rt_ms: submitMs,
    n_choice_changes: deferred ? null : nChoiceChanges,
    reveal_order: deferred ? null : revealed.value.slice(),
    reveal_ms: deferred ? null : revealMs.slice(),
    options_unlocked_ms: optionsUnlockedMs === null ? null : Math.round(optionsUnlockedMs),
    ...(deferred
      ? { marks: null, marks_correct: null, n_marked_wrong: null, all_marks_correct: null, target_marked_wrong: null, mark_events: [] }
      : markSummary()),
    // AI phase (null on self trials); the AI's own work is in the ai_* fields from the sampler
    ai_shown: showsAI.value,
    ai_ready_ms: aiReadyMs === null ? null : Math.round(aiReadyMs),
    ai_reveal_ms: aiRevealMs === null ? null : Math.round(aiRevealMs),
    ai_reveal_rt_ms: aiRevealMs !== null && aiReadyMs !== null ? Math.round(aiRevealMs - aiReadyMs) : null,
    next_ms: showsAI.value ? Math.round(api.elapsedTime()) : null,
    agree_scope: opt && showsAI.value ? opt.scope === t.ai_choice_scope : null,
    agree_choice: opt && showsAI.value ? opt.code === t.ai_choice : null,
    highlight_errors: false,
    counterbalance_id: api.persist.trialSeed,
    mouse: mouse.getPoints(),
  })
  api.recordStep()
  api.goNextStep()
}

// ── intros, choice, summary ─────────────────────────────────────────
function startBlock() {
  api.goNextStep()
}
let choiceShownAt = null
watch(isChoice, (v) => v && (choiceShownAt = performance.now()), { immediate: true })
function chooseBlock3(choice) {
  api.persist.block3Choice = choice
  Object.assign(api.stepData, {
    choice,
    choice_rt: Math.round(performance.now() - (choiceShownAt ?? performance.now())),
    ai_condition: aiCondition,
  })
  api.recordStep()
  api.saveData(true)
  api.goNextStep()
}
function finish() {
  api.saveData(true)
  api.goNextView()
}

const prompt = computed(() => {
  const name = api.stepData.student_name
  if (modeEffective.value === 'defer') return `The AI checks ${name}'s work and chooses the advice for you.`
  return `Here is ${name}'s work on three problems. Open each one, check the work, and mark it right or wrong.`
})
const aiTagSide = computed(() => (aiState.value === 'shown' ? api.stepData.ai_choice_side : null))

function autofill() {
  while (api.stepIndex < api.nSteps) {
    const id = api.path[0]
    if (id === 'choice') {
      api.persist.block3Choice = api.faker.rchoice(['self', 'defer'])
      Object.assign(api.stepData, { choice: api.persist.block3Choice, choice_rt: 4000, ai_condition: aiCondition })
    } else if (id.startsWith('trial')) {
      const side = api.faker.rchoice(['left', 'right'])
      const opt = api.stepData.options[side === 'left' ? 0 : 1]
      Object.assign(api.stepData, {
        mode_effective: modeEffective.value,
        ai_condition: aiCondition,
        choice: opt.code,
        choice_side: side,
        choice_scope: opt.scope,
        choose_policy: opt.scope === 'policy',
        marks: api.stepData.problems.map((p) => (p.is_error ? 'wrong' : 'right')),
      })
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
    <!-- ══ PHASE INTRO ═══════════════════════════════════════ -->
    <div v-if="isIntro" class="flex flex-col items-start justify-center w-full h-full gap-5 px-8 max-w-2xl mx-auto">
      <template v-if="api.stepData.intro === 1">
        <h2 class="text-2xl font-bold">Phase 1 of 3: you check and advise</h2>
        <p class="text-base max-w-xl">
          {{ N_BLOCK[1] }} students. For each one, open each problem, check the work, and mark it right or wrong.
          Then choose the advice you would give the student.
        </p>
      </template>
      <template v-else>
        <h2 class="text-2xl font-bold">Phase 2 of 3: you, then the AI</h2>
        <p class="text-base max-w-xl">
          {{ N_BLOCK[2] }} students. You check the work and choose advice first. Then you see the
          <strong>AI</strong>'s marks and advice for the same student.
        </p>
        <p class="text-base max-w-xl">Your answers still count towards your bonus.</p>
      </template>
      <Button size="lg" class="mt-2" id="start-block" @click="startBlock">Start Phase {{ api.stepData.intro }}</Button>
    </div>

    <!-- ══ PHASE 3 DECISION ══════════════════════════════════ -->
    <div v-else-if="isChoice" class="flex flex-col items-start justify-center w-full h-full gap-5 px-8 max-w-2xl mx-auto">
      <h2 class="text-2xl font-bold">Phase 3 of 3: your choice</h2>
      <p class="text-base max-w-xl">
        {{ N_BLOCK[3] }} students left. You can <strong>do them yourself</strong>, or <strong>defer them to the AI</strong>,
        the same AI as in Phase 2.
      </p>
      <p class="text-base max-w-xl">
        If you defer, you do not answer at all. You just watch the AI mark the work and choose the advice for each
        student. How well the AI does counts towards your bonus.
      </p>
      <p class="text-sm text-muted-foreground max-w-xl">
        Time note: the AI takes about as long on each student as you would, so deferring does not save time.
      </p>
      <p class="text-lg font-semibold max-w-xl mt-2">
        Would you like to defer the next {{ N_BLOCK[3] }} students to the AI, or do them yourself?
      </p>
      <div class="flex gap-5">
        <Button size="xl" id="choose-self" class="px-8 bg-slate-800 text-white shadow-md hover:bg-slate-950 border-0"
          @click="chooseBlock3('self')">I'll do them myself</Button>
        <Button size="xl" id="choose-defer" class="px-8 bg-slate-800 text-white shadow-md hover:bg-slate-950 border-0"
          @click="chooseBlock3('defer')">Defer them to the AI</Button>
      </div>
      <p class="text-sm text-muted-foreground">Click one of the buttons to start Phase 3.</p>
    </div>

    <!-- ══ SUMMARY ═══════════════════════════════════════════ -->
    <div v-else-if="isSummary" class="text-center">
      <p class="text-lg text-muted-foreground mb-4" id="prompt">Task complete! Next are a few short questions.</p>
      <Button variant="default" size="lg" id="finish" @click="finish()">Continue</Button>
    </div>

    <!-- ══ TRIAL ═════════════════════════════════════════════ -->
    <div v-else class="text-left w-full h-full overflow-y-auto px-2">
      <div class="flex justify-between items-baseline gap-4 mb-2">
        <p class="text-muted-foreground">{{ prompt }}</p>
        <span class="text-xs text-muted-foreground whitespace-nowrap shrink-0">
          Phase {{ api.stepData.block }}, {{ api.stepData.block_index + 1 }} of {{ N_BLOCK[api.stepData.block] }}
        </span>
      </div>

      <StudentWork
        :problems="api.stepData.problems"
        :revealed="revealed"
        :canReveal="canReveal && !submitted"
        :marks="marks"
        :marksLocked="submitted"
        :showMarkButtons="modeEffective !== 'defer'"
        :aiMarks="aiState === 'shown' ? api.stepData.ai_marks : null"
        class="mb-5"
        @reveal="onReveal"
        @mark="onMark"
      />

      <p class="font-semibold mb-1">
        {{ modeEffective === 'defer' ? 'Which advice will the AI give' : 'Which advice would you give' }}
        {{ api.stepData.student_name }}?
      </p>
      <p class="text-sm text-muted-foreground mb-3 h-5">
        <template v-if="modeEffective !== 'defer' && !optionsUnlocked">Mark all three problems to choose.</template>
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <button
          v-for="(opt, i) in api.stepData.options"
          :key="opt.code"
          type="button"
          :id="i === 0 ? 'option-left' : 'option-right'"
          class="relative text-left rounded-lg border-2 px-4 py-3 transition-colors"
          :class="[
            !optionsUnlocked || submitted
              ? chosenSide === (i === 0 ? 'left' : 'right')
                ? 'border-primary bg-primary/10 cursor-default'
                : 'border-border cursor-default'
              : chosenSide === (i === 0 ? 'left' : 'right')
                ? 'border-primary bg-primary/10 cursor-pointer'
                : 'border-border hover:border-primary/50 hover:bg-muted/40 cursor-pointer',
            (!optionsUnlocked && modeEffective !== 'defer') ? 'opacity-50' : '',
            aiTagSide === (i === 0 ? 'left' : 'right') ? 'ring-2 ring-slate-500 ring-offset-2' : '',
          ]"
          :aria-disabled="!optionsUnlocked || submitted"
          @click="choose(i === 0 ? 'left' : 'right')"
        >
          <span
            v-if="aiTagSide === (i === 0 ? 'left' : 'right')"
            class="absolute -top-3 right-3 rounded-md bg-slate-600 px-2 py-0.5 text-xs font-semibold text-white"
            :id="`ai-choice-${i === 0 ? 'left' : 'right'}`"
          >AI's choice</span>
          <span v-if="submitted && chosenSide === (i === 0 ? 'left' : 'right')"
            class="absolute -top-3 left-3 rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
            Your choice</span>
          {{ mathText(opt.text) }}
        </button>
      </div>

      <!-- AI box (self_then_ai after submitting, and deferred trials) -->
      <div v-if="showsAI && aiState !== 'idle'" class="flex items-center gap-4 mb-3">
        <div class="rounded-lg border-2 border-slate-500 bg-slate-50 px-4 py-2 text-sm min-w-56" id="ai-box">
          <span class="font-semibold mr-2">AI</span>
          <template v-if="aiState === 'deciding'">deciding...</template>
          <template v-else-if="aiState === 'ready'">
            <Button size="sm" id="reveal-ai" @click="revealAI">Show the AI's answer</Button>
          </template>
          <template v-else>marks and advice shown above</template>
        </div>
        <p class="text-sm text-muted-foreground">
          <template v-if="aiState === 'deciding'">
            {{ modeEffective === 'defer' ? 'Look at the work while the AI decides.' : 'Your answer is saved. The AI is deciding.' }}
          </template>
          <template v-else-if="aiState === 'shown'">
            {{ modeEffective === 'defer' ? "Take a moment to look at the AI's answer." : 'Take a moment to look at both answers.' }}
          </template>
        </p>
      </div>

      <div class="flex justify-end">
        <Button v-if="modeEffective === 'self'" id="next" :disabled="!canSubmit" @click="submit()">Next</Button>
        <Button v-else-if="modeEffective === 'self_then_ai' && !submitted" id="submit" :disabled="!canSubmit" @click="submit()">
          Submit
        </Button>
        <Button v-else id="next" :disabled="!canNext" @click="next()">Next</Button>
      </div>
    </div>
  </ConstrainedTaskWindow>
</template>
