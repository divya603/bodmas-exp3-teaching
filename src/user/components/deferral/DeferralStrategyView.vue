<script setup>
// Post-task questions (deferral branch), adapted from the function task's
// StrategyFeedbackView.vue, plus this study's advice-strategy question. All
// required, in this order (the reason comes first so the ratings cannot prime it):
//   1. reason_text           branched on the Phase 3 choice
//   2. advice_strategy       "How did you decide which advice to choose?"
//   3. analyze_effort_0to10  effort spent understanding the AI's answers in Phase 2
//   4. own_rating_0to10      how well they think they did
//   5. ai_rating_0to10       how well they think the AI did
// The Phase 3 choice is read from pageData_exp (the 'choice' step recorded by
// DeferralExpView.vue): persist is per view, so it cannot be read from the
// task's own state. Recorded together as pageData_strategy.
import { reactive, computed } from 'vue'
import useViewAPI from '@/core/composables/useViewAPI'
import { Button } from '@/uikit/components/ui/button'
import { ConstrainedPage } from '@/uikit/layouts'

const api = useViewAPI()

const block3Choice = computed(() => {
  const pd = api.store.data?.pageData_exp
  if (!pd) return null
  const entries = Object.keys(pd)
    .filter((k) => k.startsWith('visit_'))
    .flatMap((k) => pd[k]?.data ?? [])
  const step = entries.filter((e) => e?.id === 'choice').pop()
  return step?.choice ?? null
})
const reasonPrompt = computed(() => {
  if (block3Choice.value === 'defer') return 'You chose to defer to the AI in Phase 3. What was the main reason?'
  if (block3Choice.value === 'self') return 'You chose to do Phase 3 yourself. What was the main reason?'
  return 'In Phase 3 you chose to defer to the AI or to do the students yourself. What was the main reason for your choice?'
})

const KEYS = ['reason_text', 'advice_strategy', 'analyze_effort_0to10', 'own_rating_0to10', 'ai_rating_0to10']
const TEXT_KEYS = ['reason_text', 'advice_strategy']
if (!api.persist.isDefined('strategyForm')) {
  api.persist.strategyForm = reactive(Object.fromEntries(KEYS.map((k) => [k, TEXT_KEYS.includes(k) ? '' : null])))
}
for (const k of KEYS) {
  if (!(k in api.persist.strategyForm)) api.persist.strategyForm[k] = TEXT_KEYS.includes(k) ? '' : null
}

const SCALE = Array.from({ length: 11 }, (_, i) => i) // 0..10
const RATINGS = [
  {
    key: 'analyze_effort_0to10',
    text: "How much effort did you put into trying to analyze and understand the AI's answers in Phase 2?",
    lo: 'no effort',
    hi: 'a lot of effort',
  },
  { key: 'own_rating_0to10', text: 'How well do you think you did on this task?', lo: 'very poorly', hi: 'very well' },
  { key: 'ai_rating_0to10', text: 'How well do you think the AI did on this task?', lo: 'very poorly', hi: 'very well' },
]

const complete = computed(() =>
  KEYS.every((k) => (TEXT_KEYS.includes(k) ? api.persist.strategyForm[k].trim() !== '' : api.persist.strategyForm[k] !== null))
)

function autofill() {
  Object.assign(api.persist.strategyForm, {
    reason_text: 'I trusted my own checking more.',
    advice_strategy: 'General advice when the same mistake repeated, specific advice for one-off mistakes.',
    analyze_effort_0to10: 6,
    own_rating_0to10: 7,
    ai_rating_0to10: 6,
  })
}
api.setAutofill(autofill)

function finish() {
  if (!complete.value) return
  api.recordPageData({ block3_choice: block3Choice.value, ...api.persist.strategyForm })
  api.saveData(true)
  api.goNextView()
}
</script>

<template>
  <ConstrainedPage
    :responsiveUI="api.config.responsiveUI"
    :width="api.config.windowsizerRequest.width"
    :height="api.config.windowsizerRequest.height"
  >
    <div class="flex flex-col items-start w-full gap-6 px-8 py-6 max-w-2xl mx-auto text-left">
      <h2 class="text-2xl font-bold">A few last questions</h2>

      <div v-for="item in [
          { key: 'reason_text', text: reasonPrompt },
          { key: 'advice_strategy', text: 'How did you decide which advice to choose?' },
        ]" :key="item.key" class="w-full flex flex-col gap-2">
        <p class="text-base">{{ item.text }}</p>
        <textarea
          v-model="api.persist.strategyForm[item.key]"
          :id="item.key"
          rows="3"
          placeholder="A sentence or two is enough."
          class="w-full px-4 py-3 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      <div v-for="item in RATINGS" :key="item.key" class="flex flex-col gap-2">
        <p class="text-base">{{ item.text }}</p>
        <div class="inline-grid grid-cols-11 gap-x-1.5 gap-y-1">
          <button
            v-for="k in SCALE"
            :key="item.key + k"
            type="button"
            :class="[
              'w-10 h-10 rounded-md border-2 text-sm font-semibold transition-colors',
              api.persist.strategyForm[item.key] === k
                ? 'bg-slate-800 border-slate-800 text-white'
                : 'bg-white border-slate-400 hover:bg-slate-200',
            ]"
            @click="api.persist.strategyForm[item.key] = k"
          >
            {{ k }}
          </button>
          <span class="col-start-1 justify-self-start text-xs text-muted-foreground whitespace-nowrap">{{ item.lo }}</span>
          <span class="col-start-11 justify-self-end text-xs text-muted-foreground whitespace-nowrap">{{ item.hi }}</span>
        </div>
      </div>

      <div class="flex justify-end w-full">
        <Button size="lg" id="strategy-continue" :disabled="!complete" @click="finish">Continue</Button>
      </div>
    </div>
  </ConstrainedPage>
</template>
