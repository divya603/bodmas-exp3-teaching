// Comprehension quiz for the deferral branch, adapted from the function task's
// quizQuestions.js: one question on the task itself (checked against the
// instructions), then two on the structure page (DeferralStructureView.vue).
// design.js sends a failed quiz back to the structure page, not the
// instructions, so practice is not repeated. Answer options are shuffled here
// once per page load; question order stays fixed (randomizeQandA: false).
import { N_BLOCK } from '@/user/utils/sampleDeferral'

function shuffled(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const item = (id, question, answers, correct) => ({
  id,
  question,
  multiSelect: false,
  answers: shuffled(answers),
  correctAnswer: [correct],
})

export const QUIZ_QUESTIONS = [
  {
    id: 'pg1',
    questions: [
      item(
        'q1',
        'What do you do for each student, before choosing advice?',
        ['Check each problem and mark it right or wrong', 'Solve a new problem yourself', "Guess the student's final answer"],
        'Check each problem and mark it right or wrong'
      ),
      item(
        'q2',
        'If you defer in Phase 3, what does your bonus for those students depend on?',
        ['How well the AI does', 'How well you did in Phases 1 and 2 only', 'Nothing, deferred students do not count'],
        'How well the AI does'
      ),
      item(
        'q3',
        'What do you choose before Phase 3?',
        [
          `Whether to defer the last ${N_BLOCK[3]} students to the AI or do them yourself`,
          'Which students the AI should check',
          'Whether to see which of your answers were correct',
        ],
        `Whether to defer the last ${N_BLOCK[3]} students to the AI or do them yourself`
      ),
    ],
  },
]
