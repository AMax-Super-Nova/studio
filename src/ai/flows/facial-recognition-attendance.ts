// The use server directive must come at the top of the file.
'use server';

/**
 * @fileOverview A facial recognition attendance AI agent.
 *
 * - facialRecognitionAttendance - A function that handles the facial recognition attendance process.
 * - FacialRecognitionAttendanceInput - The input type for the facialRecognitionAttendance function.
 * - FacialRecognitionAttendanceOutput - The return type for the facialRecognitionAttendance function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const FacialRecognitionAttendanceInputSchema = z.object({
  photoUrl: z.string().describe('The URL of the user photo taken by the camera.'),
  userId: z.string().describe('The user ID.'),
});
export type FacialRecognitionAttendanceInput = z.infer<typeof FacialRecognitionAttendanceInputSchema>;

const FacialRecognitionAttendanceOutputSchema = z.object({
  isAuthenticated: z.boolean().describe('Whether the user is authenticated or not.'),
  confidence: z.number().describe('The confidence score of the facial recognition.'),
});
export type FacialRecognitionAttendanceOutput = z.infer<typeof FacialRecognitionAttendanceOutputSchema>;

export async function facialRecognitionAttendance(input: FacialRecognitionAttendanceInput): Promise<FacialRecognitionAttendanceOutput> {
  return facialRecognitionAttendanceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'facialRecognitionAttendancePrompt',
  input: {
    schema: z.object({
      photoUrl: z.string().describe('The URL of the user photo taken by the camera.'),
      userId: z.string().describe('The user ID.'),
    }),
  },
  output: {
    schema: z.object({
      isAuthenticated: z.boolean().describe('Whether the user is authenticated or not.'),
      confidence: z.number().describe('The confidence score of the facial recognition.'),
    }),
  },
  prompt: `You are an AI attendance system that uses facial recognition to automatically mark user attendance.\n\nYou will receive a photo of the user and their user ID. You will use this information to determine if the user is who they claim to be, and set isAuthenticated to true, otherwise set isAuthenticated to false. \n\nReturn a confidence score between 0 and 1 representing the confidence of the facial recognition, setting the confidence output field appropriately.\n\nPhoto: {{media url=photoUrl}}\nUser ID: {{{userId}}}`,
});

const facialRecognitionAttendanceFlow = ai.defineFlow<
  typeof FacialRecognitionAttendanceInputSchema,
  typeof FacialRecognitionAttendanceOutputSchema
>(
  {
    name: 'facialRecognitionAttendanceFlow',
    inputSchema: FacialRecognitionAttendanceInputSchema,
    outputSchema: FacialRecognitionAttendanceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
