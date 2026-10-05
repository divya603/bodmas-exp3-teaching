// Comprehension quiz shown after the instructions (design.js). All questions
// must be answered correctly; otherwise the participant returns to the
// instructions. Rewritten 2026-10-05 for the Experiment 3 design v2 task
// (check the work, mark right/wrong, choose the advice you would give). The
// advice question states no goal (user decision 2026-10-05, replacing "help
// them do better on the next problems", which favoured policy advice). The
// earlier YES/NO questions are in git history.
export const QUIZ_QUESTIONS = [
  {
    id: 'pg1',
    questions: [
      {
        id: 'q1',
        question: 'What do you do before choosing advice?',
        multiSelect: false,
        answers: [
          "Check each problem and mark it right or wrong",
          'Solve a new problem yourself',
          "Guess the student's final answer",
          'Nothing, you choose straight away',
        ],
        correctAnswer: ["Check each problem and mark it right or wrong"],
      },
      {
        id: 'q2',
        question: 'Which advice should you choose?',
        multiSelect: false,
        answers: [
          'The advice you would give the student',
          'The shorter advice',
          'The advice that appears on the left',
          'The advice with the most numbers in it',
        ],
        correctAnswer: ['The advice you would give the student'],
      },
      {
        id: 'q3',
        question: 'In 2 + 3 × 4, which should be done first?',
        multiSelect: false,
        answers: ['3 × 4', '2 + 3', 'Either one'],
        correctAnswer: ['3 × 4'],
      },
    ],
  },
]
