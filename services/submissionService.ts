import type { ApplicationData } from '../types';

/**
 * Simulates submitting application data to a backend service (e.g., an n8n webhook).
 * In a real application, this would use `fetch` to send a POST request.
 * @param data The application data from the form.
 * @returns A promise that resolves on successful submission.
 */
export const submitApplication = (data: ApplicationData): Promise<void> => {
  return new Promise((resolve, reject) => {
    console.log('Submitting application data:', {
      fullName: data.fullName,
      email: data.email,
      linkedinUrl: data.linkedinUrl,
      coverLetter: data.coverLetter,
      resume: {
        name: data.resume?.name,
        size: data.resume?.size,
        type: data.resume?.type,
      },
    });

    // Simulate network delay
    setTimeout(() => {
      // Simulate a potential random failure
      if (Math.random() > 0.95) {
        // 5% chance of failure
        console.error('Simulated submission error.');
        reject(new Error('Failed to submit application.'));
      } else {
        console.log('Application submitted successfully.');
        resolve();
      }
    }, 2000);
  });
};
