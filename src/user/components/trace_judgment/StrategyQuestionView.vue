<script setup>
import { reactive, computed } from 'vue'
import useViewAPI from '@/core/composables/useViewAPI'
import { Button } from '@/uikit/components/ui/button'
import { Textarea } from '@/uikit/components/ui/textarea'
import { ConstrainedPage } from '@/uikit/layouts'

const api = useViewAPI()

if (!api.persist.isDefined('strategyinfo')) {
  api.persist.strategyinfo = reactive({ strategy: '' })
}

const complete = computed(() => api.persist.strategyinfo.strategy.trim() !== '')

function autofill() {
  api.persist.strategyinfo.strategy =
    'I checked how many problems were wrong and picked general advice when the same mistake repeated.'
}
api.setAutofill(autofill)

function finish() {
  api.recordPageData(api.persist.strategyinfo)
  api.saveData()
  api.goNextView()
}
</script>

<template>
  <ConstrainedPage
    :responsiveUI="api.config.responsiveUI"
    :width="api.config.windowsizerRequest.width"
    :height="api.config.windowsizerRequest.height"
  >
    <div class="w-full max-w-3xl mx-auto text-center">
      <h1 class="text-3xl font-bold mb-4">Strategy question</h1>
      <p class="text-lg text-muted-foreground mb-8">
        How did you decide which advice to choose? If you used different strategies for different students, please
        describe all of them.
      </p>

      <Textarea
        v-model="api.persist.strategyinfo.strategy"
        placeholder="Describe your strategy here..."
        class="w-full bg-background dark:bg-background text-base resize-vertical text-left"
        rows="8"
      />

      <div class="flex justify-end mt-6">
        <Button variant="default" :disabled="!complete" @click="finish()">
          Continue
          <i-fa6-solid-arrow-right />
        </Button>
      </div>
    </div>
  </ConstrainedPage>
</template>
