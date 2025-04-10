'use server';

/**
 * @fileOverview An AI-powered FAQ agent.
 *
 * - answerQuestion - A function that answers questions about the app.
 * - AnswerQuestionInput - The input type for the answerQuestion function.
 * - AnswerQuestionOutput - The return type for the answerQuestion function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const AnswerQuestionInputSchema = z.object({
  question: z.string().describe('The question to be answered.'),
});
export type AnswerQuestionInput = z.infer<typeof AnswerQuestionInputSchema>;

const AnswerQuestionOutputSchema = z.object({
  answer: z.string().describe('The answer to the question.'),
});
export type AnswerQuestionOutput = z.infer<typeof AnswerQuestionOutputSchema>;

export async function answerQuestion(input: AnswerQuestionInput): Promise<AnswerQuestionOutput> {
  return answerQuestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'answerQuestionPrompt',
  input: {
    schema: z.object({
      question: z.string().describe('The question to be answered.'),
    }),
  },
  output: {
    schema: z.object({
      answer: z.string().describe('The answer to the question.'),
    }),
  },
  prompt: `You are a helpful AI assistant that answers questions about the AttendAI application. Use the following information to answer the question. If the question is not related to the AttendAI application, respond that you can only answer question related to the app.

Question: {{{question}}}
`,
});

const answerQuestionFlow = ai.defineFlow<
  typeof AnswerQuestionInputSchema,
  typeof AnswerQuestionOutputSchema
>({
  name: 'answerQuestionFlow',
  inputSchema: AnswerQuestionInputSchema,
  outputSchema: AnswerQuestionOutputSchema,
}, async input => {
  const {output} = await prompt(input);
  return output!;
});
